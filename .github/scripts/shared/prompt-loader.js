const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = path.join(__dirname, '..', 'prompts');

function loadPrompt(promptName, config = {}) {
    const promptPath = path.join(PROMPTS_DIR, `${promptName}.md`);

    if (!fs.existsSync(promptPath)) {
        throw new Error(`Prompt file not found: ${promptPath}`);
    }

    let content = fs.readFileSync(promptPath, 'utf8');

    for (const [key, value] of Object.entries(config)) {
        const placeholder = `{{${key}}}`;
        content = content.split(placeholder).join(value || '');
    }

    return content;
}

function loadLibraryConfig(configPath) {
    if (!configPath) {
        configPath = path.join(PROMPTS_DIR, 'library-config.js');
    }

    if (!fs.existsSync(configPath)) {
        throw new Error(`Library config not found: ${configPath}`);
    }

    return require(configPath);
}

function buildIssueTriageSystemPrompt(config) {
    return loadPrompt('issue-triage', config);
}

function buildPRReviewSystemPrompt(config) {
    return loadPrompt('pr-review', config);
}

function buildIssueTriagePrompt(issue, availableLabels) {
    return `Analyze this GitHub issue and provide triage labels.

## Issue #${issue.number}
**Title:** ${issue.title}

**Body:**
${issue.body || '(No description provided)'}

**Current Labels:** ${issue.labels.map((l) => l.name).join(', ') || 'None'}

## Available Labels in Repository (USE ONLY THESE EXACT STRINGS):
${availableLabels.map((l) => `- "${l.name}"`).join('\n')}

IMPORTANT: You MUST only use label names from the list above. Copy the exact string including any prefixes like "Component: " or "Type: ". Do not invent or modify label names.

Analyze and respond with JSON only. Remember: "comment" should be null unless truly necessary!`;
}

function buildPRReviewPrompt(pr, diff, linkedIssue, files) {
    let prompt = `Review this Pull Request.

## PR #${pr.number}: ${pr.title}

**Description:**
${pr.body || '(No description provided)'}

**Changed Files (${files.length}):**
${files.map((f) => `- ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}

`;

    if (linkedIssue) {
        prompt += `
## Linked Issue #${linkedIssue.number}: ${linkedIssue.title}

**Issue Description:**
${linkedIssue.body || '(No description)'}

`;
    } else {
        prompt += `
## No Linked Issue Found
Note: This PR does not reference a specific issue.

`;
    }

    prompt += `
## Diff (truncated to key changes):
\`\`\`diff
${truncateDiff(diff, 8000)}
\`\`\`

Analyze the changes and provide your review as JSON.`;

    return prompt;
}

function truncateDiff(diff, maxLength) {
    if (!diff) return '';
    if (diff.length <= maxLength) return diff;
    return diff.substring(0, maxLength) + '\n... (diff truncated)';
}

module.exports = {
    loadPrompt,
    loadLibraryConfig,
    buildIssueTriageSystemPrompt,
    buildPRReviewSystemPrompt,
    buildIssueTriagePrompt,
    buildPRReviewPrompt,
    truncateDiff
};
