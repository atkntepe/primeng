const { getOpenIssues, getIssueReactions, getIssueComments, countUpvotes, hasLabel, addLabels, sleep } = require('./shared/github-utils');

const PRIORITY_LABEL = 'priority: high';

const PRIORITY_CONFIG = {
    minUpvotes: 5,
    minComments: 10
};

async function evaluateIssuePriority(github, context, issue) {
    const reactions = await getIssueReactions(github, context, issue.number);
    const comments = await getIssueComments(github, context, issue.number);

    const upvotes = countUpvotes(reactions);
    const commentCount = comments.length;

    const isHighPriority = upvotes >= PRIORITY_CONFIG.minUpvotes || commentCount >= PRIORITY_CONFIG.minComments;

    return {
        issueNumber: issue.number,
        title: issue.title,
        upvotes,
        commentCount,
        isHighPriority,
        reason: isHighPriority ? buildPriorityReason(upvotes, commentCount) : null
    };
}

function buildPriorityReason(upvotes, commentCount) {
    const reasons = [];
    if (upvotes >= PRIORITY_CONFIG.minUpvotes) {
        reasons.push(`${upvotes} upvotes`);
    }
    if (commentCount >= PRIORITY_CONFIG.minComments) {
        reasons.push(`${commentCount} comments`);
    }
    return reasons.join(', ');
}

async function prioritizeIssues(github, context, options = {}) {
    const { maxIssues = 100, dryRun = false } = options;

    console.log(`Starting issue prioritization (max: ${maxIssues}, dryRun: ${dryRun})`);
    console.log(`Thresholds: ${PRIORITY_CONFIG.minUpvotes}+ upvotes OR ${PRIORITY_CONFIG.minComments}+ comments`);

    const issues = await getOpenIssues(github, context, { maxIssues });
    console.log(`Found ${issues.length} open issues to evaluate`);

    let prioritized = 0;
    let alreadyPrioritized = 0;
    let errors = 0;

    for (const issue of issues) {
        try {
            if (hasLabel(issue, PRIORITY_LABEL)) {
                alreadyPrioritized++;
                continue;
            }

            const evaluation = await evaluateIssuePriority(github, context, issue);

            if (evaluation.isHighPriority) {
                console.log(`Issue #${issue.number}: HIGH PRIORITY - ${evaluation.reason}`);

                if (!dryRun) {
                    await addLabels(github, context, issue.number, [PRIORITY_LABEL]);
                    console.log(`  Added "${PRIORITY_LABEL}" label`);
                } else {
                    console.log(`  [DRY RUN] Would add "${PRIORITY_LABEL}" label`);
                }

                prioritized++;
            }

            await sleep(500);
        } catch (error) {
            console.error(`Error evaluating issue #${issue.number}:`, error.message);
            errors++;
        }
    }

    console.log(`\nPrioritization complete:`);
    console.log(`  - Newly prioritized: ${prioritized}`);
    console.log(`  - Already prioritized: ${alreadyPrioritized}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Total evaluated: ${issues.length}`);

    return {
        prioritized,
        alreadyPrioritized,
        errors,
        total: issues.length
    };
}

module.exports = { prioritizeIssues, PRIORITY_CONFIG };
