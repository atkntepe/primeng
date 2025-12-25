const { loadLibraryConfig, buildIssueTriageSystemPrompt, buildPRReviewSystemPrompt, buildIssueTriagePrompt, buildPRReviewPrompt, truncateDiff } = require('./prompt-loader');

const libraryConfig = loadLibraryConfig();

const ISSUE_TRIAGE_SYSTEM_PROMPT = buildIssueTriageSystemPrompt(libraryConfig);
const PR_REVIEW_SYSTEM_PROMPT = buildPRReviewSystemPrompt(libraryConfig);

const COMMENT_GENERATION_GUIDELINES = `
## Comment Guidelines

Be CONSERVATIVE with comments. Most well-formed issues need NO comment.

### When to Comment on Issues:

**DO comment when:**
- Missing critical info (no reproduction, no version)
- Clearly a usage question, not a bug
- Obvious duplicate of a recent/popular issue
- Issue template completely ignored

**DON'T comment when:**
- Issue is reasonably clear and complete
- Minor missing info that doesn't block investigation
- Just needs labels applied
- Enhancement request with clear description

### Comment Tone:
- Friendly and welcoming (contributors are helping!)
- Concise - don't over-explain
- Actionable - tell them exactly what's needed
- Never condescending or robotic
- Use emoji sparingly but warmly (wave emoji for greeting)

### Comment Response Format:

In your JSON response, the "comment" field should be:
- null - No comment needed (most common!)
- { "type": "needs-info", "missing": ["reproduction", "version", "steps"] }
- { "type": "duplicate", "issueNumber": 1234 }
- { "type": "question" }
- { "type": "custom", "message": "Your specific message" } - Use rarely

### PR Review Comment Guidelines:

Always comment on PRs with a structured review. Include:
- Assessment (approve/changes-requested/needs-review)
- Summary of what the PR does
- Issue alignment (if linked issue exists)
- Concerns (if any)
- Suggestions (if any)

Flag for human review when:
- Large refactors (>300 lines changed)
- Core functionality changes
- Public API modifications
- Performance-critical code
- Security-related changes
`;

module.exports = {
    ISSUE_TRIAGE_SYSTEM_PROMPT,
    PR_REVIEW_SYSTEM_PROMPT,
    COMMENT_GENERATION_GUIDELINES,
    buildIssueTriagePrompt,
    buildPRReviewPrompt,
    truncateDiff,
    libraryConfig
};
