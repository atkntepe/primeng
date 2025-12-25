const { callClaude, MODELS } = require('./shared/claude-client');
const { COMMENT_TEMPLATES } = require('./shared/comment-templates');
const { PR_REVIEW_SYSTEM_PROMPT, buildPRReviewPrompt } = require('./shared/prompts');
const { addLabels, createComment, getIssue, getPR, getPRDiff, getPRFiles, extractLinkedIssue } = require('./shared/github-utils');

async function reviewPR(github, context, prNumber, options = {}) {
    const { dryRun = false } = options;

    console.log(`Reviewing PR #${prNumber}`);

    const pr = await getPR(github, context, prNumber);
    const diff = await getPRDiff(github, context, prNumber);
    const files = await getPRFiles(github, context, prNumber);

    const linkedIssueNumber = extractLinkedIssue(pr.body);
    let linkedIssue = null;

    if (linkedIssueNumber) {
        try {
            linkedIssue = await getIssue(github, context, linkedIssueNumber);
            console.log(`Found linked issue #${linkedIssueNumber}: ${linkedIssue.title}`);
        } catch (error) {
            console.log(`Could not fetch linked issue #${linkedIssueNumber}: ${error.message}`);
        }
    } else {
        console.log('No linked issue found in PR body');
    }

    const userPrompt = buildPRReviewPrompt(pr, diff, linkedIssue, files);

    let review;
    try {
        review = await callClaude(PR_REVIEW_SYSTEM_PROMPT, userPrompt, { model: MODELS.SONNET, maxTokens: 2048 });
    } catch (error) {
        console.error(`Failed to get review from Claude: ${error.message}`);
        throw error;
    }

    review.hasLinkedIssue = !!linkedIssue;

    console.log(`Claude review:`, JSON.stringify(review, null, 2));

    const commentBody = COMMENT_TEMPLATES.buildPRComment(review);

    if (!dryRun) {
        await createComment(github, context, prNumber, commentBody);
        console.log(`Posted review comment`);
    } else {
        console.log(`[DRY RUN] Would post review comment:`);
        console.log(commentBody);
    }

    const labelsToAdd = [];
    switch (review.assessment) {
        case 'approve':
            labelsToAdd.push('bot: looks-good');
            break;
        case 'changes-requested':
            labelsToAdd.push('bot: needs-changes');
            break;
        case 'needs-review':
            labelsToAdd.push('bot: needs-human-review');
            break;
    }

    if (labelsToAdd.length > 0) {
        if (!dryRun) {
            await addLabels(github, context, prNumber, labelsToAdd);
            console.log(`Applied labels: ${labelsToAdd.join(', ')}`);
        } else {
            console.log(`[DRY RUN] Would apply labels: ${labelsToAdd.join(', ')}`);
        }
    }

    console.log(`Review complete for PR #${prNumber}`);
    console.log(`Assessment: ${review.assessment}, Confidence: ${review.confidence}`);

    return review;
}

module.exports = { reviewPR };
