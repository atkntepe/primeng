const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const MODELS = {
    HAIKU: 'claude-haiku-4-5',
    SONNET: 'claude-sonnet-4-5'
};

async function callClaude(systemPrompt, userPrompt, options = {}) {
    const { model = MODELS.SONNET, maxTokens = 1024 } = options;

    const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: userPrompt
            }
        ]
    });

    const content = response.content[0].text;

    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('Failed to parse Claude response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
}

async function callClaudeForTriage(issue, availableLabels, systemPrompt, userPrompt) {
    return callClaude(systemPrompt, userPrompt);
}

async function callClaudeForPRReview(pr, diff, linkedIssue, files, systemPrompt, userPrompt) {
    return callClaude(systemPrompt, userPrompt, { maxTokens: 2048 });
}

module.exports = {
    MODELS,
    callClaude,
    callClaudeForTriage,
    callClaudeForPRReview
};
