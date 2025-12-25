const { loadLibraryConfig } = require('./prompt-loader');

const config = loadLibraryConfig();

const COMMENT_TEMPLATES = {
    needsMoreInfo: (missingItems) =>
        `
Thanks for opening this issue!

To help us investigate, could you please provide:
${missingItems.map((item) => `- [ ] ${item}`).join('\n')}

Without these details, we may not be able to investigate this issue.

*This is an automated message. A maintainer will review your issue soon.*
  `.trim(),

    possibleDuplicate: (issueNumber, issueTitle) =>
        `
Thanks for reporting this!

This issue appears similar to #${issueNumber}${issueTitle ? ` (${issueTitle})` : ''}. Please check if that issue describes your problem.

- If **yes**, please add a thumbs up to that issue instead
- If **no**, please clarify how your issue differs

*This is an automated message.*
  `.trim(),

    useForums: () =>
        `
Hi there!

This looks like a usage question rather than a bug report. For questions, you'll get faster help on:
${config.DISCORD_URL ? `- [Discord](${config.DISCORD_URL})` : ''}
${config.DISCUSSIONS_URL ? `- [GitHub Discussions](${config.DISCUSSIONS_URL})` : ''}

If this is actually a bug, please update with reproduction steps.

*This is an automated message.*
  `.trim(),

    thankYou: (componentName) =>
        `
Thanks for the detailed report${componentName ? ` about **${componentName}**` : ''}!

A maintainer will review this soon.

*This is an automated message.*
  `.trim(),

    prReviewApprove: (review) =>
        `
## AI Code Review

**Looks Good**

### Summary
${review.summary}

${review.issueAlignment ? `### Issue Alignment\n${review.issueAlignment}\n` : ''}
${review.notes && review.notes.length > 0 ? `### Notes\n${review.notes.map((n) => `- ${n}`).join('\n')}\n` : ''}
---
*This is an automated review. A maintainer will provide final approval.*
  `.trim(),

    prReviewChangesRequested: (review) =>
        `
## AI Code Review

**Changes Suggested**

### Summary
${review.summary}

${review.issueAlignment ? `### Issue Alignment\n${review.issueAlignment}\n\n` : ''}
${review.concerns && review.concerns.length > 0 ? `### Concerns\n${review.concerns.map((c) => `- ${c}`).join('\n')}\n\n` : ''}
${review.suggestions && review.suggestions.length > 0 ? `### Suggestions\n${review.suggestions.map((s) => `- ${s}`).join('\n')}\n\n` : ''}
---
*This is an automated review. A maintainer will provide final approval.*
  `.trim(),

    prReviewNeedsHuman: (review) =>
        `
## AI Code Review

**Needs Human Review**

### Summary
${review.summary}

${review.issueAlignment ? `### Issue Alignment\n${review.issueAlignment}\n\n` : ''}
### Why Human Review Needed
${review.humanReviewReasons ? review.humanReviewReasons.map((r) => `- ${r}`).join('\n') : '- Complex changes requiring careful evaluation'}

${review.observations && review.observations.length > 0 ? `### Initial Observations\n${review.observations.map((o) => `- ${o}`).join('\n')}\n\n` : ''}
---
*This PR requires careful review due to its scope. A maintainer will evaluate.*
  `.trim(),

    prNoLinkedIssue: () =>
        `
### No Linked Issue

This PR doesn't reference a GitHub issue. Please consider:
- Linking to an existing issue with \`Fixes #xxx\` or \`Closes #xxx\`
- Creating an issue first to document the problem/feature

This helps us track changes and maintain a clear history.
  `.trim(),

    buildPRComment: (review) => {
        let comment = '';

        switch (review.assessment) {
            case 'approve':
                comment = COMMENT_TEMPLATES.prReviewApprove(review);
                break;
            case 'changes-requested':
                comment = COMMENT_TEMPLATES.prReviewChangesRequested(review);
                break;
            case 'needs-review':
                comment = COMMENT_TEMPLATES.prReviewNeedsHuman(review);
                break;
            default:
                comment = COMMENT_TEMPLATES.prReviewApprove(review);
        }

        if (!review.hasLinkedIssue) {
            comment += '\n\n' + COMMENT_TEMPLATES.prNoLinkedIssue();
        }

        return comment;
    }
};

module.exports = { COMMENT_TEMPLATES };
