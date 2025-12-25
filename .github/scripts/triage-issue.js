const { callClaude, MODELS } = require('./shared/claude-client');
const { COMMENT_TEMPLATES } = require('./shared/comment-templates');
const { ISSUE_TRIAGE_SYSTEM_PROMPT, buildIssueTriagePrompt } = require('./shared/prompts');
const { getRepoLabels, addLabels, createComment, removeLabel, getOpenIssues, hasTriageLabels, needsTriage, sleep } = require('./shared/github-utils');

async function triageIssue(github, context, issue, options = {}) {
    const { dryRun = false } = options;

    if (issue.pull_request) {
        console.log(`Issue #${issue.number} is a PR, skipping`);
        return null;
    }

    const hasNeedsTriage = needsTriage(issue.labels);
    const alreadyTriaged = hasTriageLabels(issue.labels);

    if (!hasNeedsTriage && alreadyTriaged) {
        console.log(`Issue #${issue.number} already triaged, skipping`);
        return null;
    }

    console.log(`Triaging issue #${issue.number}: ${issue.title}`);
    if (hasNeedsTriage) {
        console.log(`Issue has "needs triage" label, will remove after processing`);
    }

    const availableLabels = await getRepoLabels(github, context);
    const userPrompt = buildIssueTriagePrompt(issue, availableLabels);

    let triageResult;
    try {
        triageResult = await callClaude(ISSUE_TRIAGE_SYSTEM_PROMPT, userPrompt, { model: MODELS.HAIKU });
    } catch (error) {
        console.error(`Failed to get triage result from Claude: ${error.message}`);
        throw error;
    }

    console.log(`Claude response:`, JSON.stringify(triageResult, null, 2));

    const validLabels = filterValidLabels(triageResult.labels, availableLabels);

    if (!dryRun && validLabels.length > 0) {
        await addLabels(github, context, issue.number, validLabels);
        console.log(`Applied labels: ${validLabels.join(', ')}`);
    } else if (dryRun) {
        console.log(`[DRY RUN] Would apply labels: ${validLabels.join(', ')}`);
    }

    if (triageResult.comment) {
        const commentBody = generateCommentBody(triageResult.comment);
        if (commentBody) {
            if (!dryRun) {
                await createComment(github, context, issue.number, commentBody);
                console.log(`Posted comment: ${triageResult.comment.type}`);
            } else {
                console.log(`[DRY RUN] Would post comment: ${triageResult.comment.type}`);
                console.log(`[DRY RUN] Comment body:\n${commentBody}`);
            }
        }
    }

    if (hasNeedsTriage) {
        const needsTriageLabel = issue.labels.find((l) => l.name.toLowerCase() === 'needs triage' || l.name.toLowerCase() === 'status: needs triage');
        if (needsTriageLabel) {
            if (!dryRun) {
                await removeLabel(github, context, issue.number, needsTriageLabel.name);
                console.log(`Removed "${needsTriageLabel.name}" label`);
            } else {
                console.log(`[DRY RUN] Would remove "${needsTriageLabel.name}" label`);
            }
        }
    }

    console.log(`Triaged issue #${issue.number} with confidence: ${triageResult.confidence}`);
    console.log(`Reasoning: ${triageResult.reasoning}`);

    return {
        ...triageResult,
        labels: validLabels
    };
}

function filterValidLabels(labels, availableLabels) {
    const availableLabelNames = availableLabels.map((l) => l.name.toLowerCase());
    return labels.filter((label) => {
        const isValid = availableLabelNames.includes(label.toLowerCase());
        if (!isValid) {
            console.log(`Warning: Label "${label}" not found in repository, skipping`);
        }
        return isValid;
    });
}

function generateCommentBody(commentData) {
    if (!commentData) return null;

    switch (commentData.type) {
        case 'needs-info':
            return COMMENT_TEMPLATES.needsMoreInfo(commentData.missing || ['PrimeNG version', 'Angular version', 'Browser and version', 'Minimal reproduction (StackBlitz preferred)', 'Steps to reproduce']);

        case 'duplicate':
            return COMMENT_TEMPLATES.possibleDuplicate(commentData.issueNumber, commentData.issueTitle);

        case 'question':
            return COMMENT_TEMPLATES.useForums();

        case 'custom':
            return commentData.message;

        default:
            return null;
    }
}

async function triageBacklog(github, context, options = {}) {
    const { maxIssues = 50, dryRun = false } = options;

    console.log(`Starting backlog triage (max: ${maxIssues}, dryRun: ${dryRun})`);

    const issues = await getOpenIssues(github, context, { maxIssues: maxIssues * 2 });

    const untriagedIssues = issues.filter((issue) => needsTriage(issue.labels) || !hasTriageLabels(issue.labels)).slice(0, maxIssues);

    console.log(`Found ${untriagedIssues.length} untriaged issues to process`);

    let processed = 0;
    let errors = 0;
    const results = [];

    for (const issue of untriagedIssues) {
        try {
            const result = await triageIssue(github, context, issue, { dryRun });
            if (result) {
                processed++;
                results.push({ issue: issue.number, result });
            }
            await sleep(2000);
        } catch (error) {
            console.error(`Error triaging issue #${issue.number}:`, error.message);
            errors++;
        }
    }

    console.log(`Backlog processing complete: ${processed} processed, ${errors} errors`);

    return {
        processed,
        errors,
        total: untriagedIssues.length,
        results
    };
}

module.exports = { triageIssue, triageBacklog };
