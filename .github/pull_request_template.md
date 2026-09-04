## Goal and current gap

<!-- Describe the single testable outcome and what was missing before this change. -->

## Controlling path and root cause

<!-- Identify the code path that owns the behavior and why the change was needed. -->

## Changes

- 

## Validation

List the exact result or explain why a check is not applicable.

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run test:ui` for changes to `public/app.js`, `public/index.html`, or navigation
- [ ] `npm run build` and `npm run hardhat:smoke` for contract changes
- [ ] Changed files were scanned for secrets
- [ ] Code review completed
- [ ] CodeQL completed

## Sensitive-change review

- [ ] Not applicable
- [ ] Dedicated review completed for changes to `src/server.js`, authentication, authorization, wallets, payments, financial calculations, network transactions, or smart contracts

## Final checklist

- [ ] This pull request contains one cohesive change
- [ ] Existing behavior and architecture are preserved outside the stated scope
- [ ] No credentials, tokens, private keys, seed phrases, production wallet data, or unredacted personal data are included
- [ ] Validation used only local networks, testnets, burner wallets, and synthetic data
- [ ] The issue, branch, or pull request context is linked above

