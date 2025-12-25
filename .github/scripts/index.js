const { triageIssue, triageBacklog } = require('./triage-issue');
const { reviewPR } = require('./review-pr');
const { prioritizeIssues, PRIORITY_CONFIG } = require('./prioritize-issues');
const { callClaude, MODELS } = require('./shared/claude-client');
const { COMMENT_TEMPLATES } = require('./shared/comment-templates');
const { loadPrompt, loadLibraryConfig, buildIssueTriageSystemPrompt, buildPRReviewSystemPrompt, buildIssueTriagePrompt, buildPRReviewPrompt } = require('./shared/prompt-loader');
const githubUtils = require('./shared/github-utils');

module.exports = {
    triageIssue,
    triageBacklog,
    reviewPR,
    prioritizeIssues,
    PRIORITY_CONFIG,
    callClaude,
    MODELS,
    COMMENT_TEMPLATES,
    loadPrompt,
    loadLibraryConfig,
    buildIssueTriageSystemPrompt,
    buildPRReviewSystemPrompt,
    buildIssueTriagePrompt,
    buildPRReviewPrompt,
    githubUtils
};
