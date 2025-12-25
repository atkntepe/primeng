require('dotenv').config();
const { Octokit } = require('@octokit/rest');

async function testLocally() {
    const mode = process.argv[2] || 'issue';
    const arg2 = process.argv[3];
    const number = arg2 ? parseInt(arg2) : null;

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('Error: ANTHROPIC_API_KEY environment variable is required');
        process.exit(1);
    }

    if (!process.env.GITHUB_TOKEN) {
        console.error('Error: GITHUB_TOKEN environment variable is required');
        process.exit(1);
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const github = {
        rest: octokit.rest,
        paginate: octokit.paginate.bind(octokit)
    };

    const context = {
        repo: {
            owner: 'primefaces',
            repo: 'primeng'
        }
    };

    if (mode === 'issue') {
        const { triageIssue, triageBacklog } = require('./triage-issue.js');

        if (arg2 === 'backlog' || !arg2) {
            const maxIssues = parseInt(process.argv[4]) || 3;
            console.log(`\nTesting backlog triage (DRY RUN, max ${maxIssues} issues)\n`);
            await triageBacklog(github, context, { maxIssues, dryRun: true });
        } else if (number) {
            console.log(`\nTesting issue triage for issue #${number} (DRY RUN)\n`);
            const { data: issue } = await octokit.rest.issues.get({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: number
            });
            await triageIssue(github, context, issue, { dryRun: true });
        }
    } else if (mode === 'pr') {
        const { reviewPR } = require('./review-pr.js');

        if (!number) {
            console.error('Error: PR number required. Usage: node test-local.js pr <number>');
            process.exit(1);
        }

        console.log(`\nTesting PR review for PR #${number} (DRY RUN)\n`);
        await reviewPR(github, context, number, { dryRun: true });
    } else {
        console.log('Usage:');
        console.log('  node test-local.js issue <number>       - Test single issue triage');
        console.log('  node test-local.js issue backlog [max]  - Test backlog triage (default: 3)');
        console.log('  node test-local.js pr <number>          - Test PR review');
        console.log('');
        console.log('Examples:');
        console.log('  node test-local.js issue 19231          - Triage issue #19231');
        console.log('  node test-local.js issue backlog 10     - Triage 10 backlog issues');
        console.log('  node test-local.js pr 17000             - Review PR #17000');
    }
}

testLocally().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
