async function getRepoLabels(github, context) {
    const labels = await github.paginate(github.rest.issues.listLabelsForRepo, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        per_page: 100
    });
    return labels.map((l) => ({ name: l.name, description: l.description }));
}

async function addLabels(github, context, issueNumber, labels) {
    if (labels.length === 0) return;

    await github.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        labels: labels
    });
}

async function createComment(github, context, issueNumber, body) {
    await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        body: body
    });
}

async function getIssue(github, context, issueNumber) {
    const { data: issue } = await github.rest.issues.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber
    });
    return issue;
}

async function getPR(github, context, prNumber) {
    const { data: pr } = await github.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber
    });
    return pr;
}

async function getPRDiff(github, context, prNumber) {
    const { data: diff } = await github.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber,
        mediaType: { format: 'diff' }
    });
    return diff;
}

async function getPRFiles(github, context, prNumber) {
    const { data: files } = await github.rest.pulls.listFiles({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: prNumber
    });
    return files;
}

async function getOpenIssues(github, context, options = {}) {
    const { maxIssues = 100 } = options;

    const issues = await github.paginate(github.rest.issues.listForRepo, {
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: 'open',
        per_page: 100
    });

    return issues.filter((issue) => !issue.pull_request).slice(0, maxIssues);
}

async function getIssueReactions(github, context, issueNumber) {
    const { data: reactions } = await github.rest.reactions.listForIssue({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        per_page: 100
    });
    return reactions;
}

async function getIssueComments(github, context, issueNumber) {
    const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: issueNumber,
        per_page: 100
    });
    return comments;
}

function countUpvotes(reactions) {
    return reactions.filter((r) => r.content === '+1' || r.content === 'heart' || r.content === 'rocket').length;
}

function hasLabel(issue, labelName) {
    return issue.labels.some((l) => l.name.toLowerCase() === labelName.toLowerCase());
}

function extractLinkedIssue(body) {
    if (!body) return null;

    const patterns = [/(?:fix(?:es)?|close(?:s)?|resolve(?:s)?)\s*#(\d+)/i, /(?:fix(?:es)?|close(?:s)?|resolve(?:s)?)\s+https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/i, /#(\d+)/];

    for (const pattern of patterns) {
        const match = body.match(pattern);
        if (match) return parseInt(match[1]);
    }

    return null;
}

function hasTriageLabels(labels) {
    const triageIndicators = ['Type:', 'Component:', 'Resolution:', 'Status:'];
    return labels.some((label) => triageIndicators.some((indicator) => label.name.startsWith(indicator)));
}

function needsTriage(labels) {
    return labels.some((label) => label.name.toLowerCase() === 'needs triage' || label.name.toLowerCase() === 'status: needs triage');
}

async function removeLabel(github, context, issueNumber, labelName) {
    try {
        await github.rest.issues.removeLabel({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: issueNumber,
            name: labelName
        });
    } catch (error) {
        if (error.status !== 404) {
            throw error;
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    getRepoLabels,
    addLabels,
    createComment,
    removeLabel,
    getIssue,
    getPR,
    getPRDiff,
    getPRFiles,
    getOpenIssues,
    getIssueReactions,
    getIssueComments,
    countUpvotes,
    hasLabel,
    extractLinkedIssue,
    hasTriageLabels,
    needsTriage,
    sleep
};
