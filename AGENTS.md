# Contributor and Agent Workflow

Use this workflow for every repository change.

## Start with one concrete outcome

- Continue the existing issue, pull request, or session for related follow-up work. Record the current branch or pull request when one exists.
- Define the goal, current gap, scope, non-goals, acceptance criteria, constraints, and expected validation before editing.
- Keep each change and pull request focused on one testable outcome.
- Ask for clarification instead of acting on requests such as “add everything,” an unfilled placeholder, or a URL without an intended outcome.

## Inspect before editing

1. Check the current branch, working tree, linked pull request, and existing diff.
2. Read `README.md`, `package.json`, and the tests relevant to the requested behavior.
3. Search with `rg` or `glob` before opening large files or dependency trees.
4. Confirm whether the requested behavior already exists, then identify the controlling path and root cause.
5. Implement only the missing delta and preserve unrelated work.

## Validation

Run the narrowest applicable checks first, followed by the full checks when practical:

- All JavaScript changes: `npm test`, then `npm run lint`.
- Changes to `public/app.js`, `public/index.html`, or navigation: `npm test`, then `npm run test:ui`. The unit suite includes frontend contract assertions.
- Smart-contract or Hardhat changes: `npm run build`, then `npm run hardhat:smoke`.
- Full local validation: `npm run check`.

Before finalizing an editing task:

1. Scan every changed file for secrets.
2. Request a code review.
3. Run CodeQL.
4. Report each command and result, including a reason for every skipped or unavailable check.

Request dedicated review for changes involving `src/server.js`, authentication, authorization, wallets, payments, financial calculations, network transactions, or smart contracts.

## Security

- Never place credentials, tokens, private keys, seed phrases, production wallet material, or unredacted personal data in prompts, source files, logs, screenshots, fixtures, or commits.
- Keep local credentials in ignored `.env` files. Use GitHub Secrets for repository automation.
- Use local networks, testnets, burner wallets, and synthetic data during validation; never submit a production transaction.
- If a secret is exposed, stop using it, remove it from the change, and rotate or revoke it immediately.
