---
name: Focused change request
about: Propose one testable change with clear scope and acceptance criteria
title: ""
labels: ""
assignees: ""
---

> [!IMPORTANT]
> Never include API keys, tokens, passwords, private keys, seed phrases, production wallet data, or other credentials. Use local `.env` files or GitHub Secrets.

## Existing context

- Current branch or pull request:
- Is this a continuation of existing work?
- Relevant files, routes, or contracts:

## Goal

<!-- Describe one testable outcome. Avoid requests such as "add everything," placeholders, or a URL without an intended result. -->

## Current gap and evidence

<!-- What happens now? Include safe reproduction steps, errors, or screenshots with sensitive data removed. -->

## Scope

<!-- List the behavior and areas that should change. -->

## Non-goals

<!-- List related behavior that must remain unchanged. -->

## Acceptance criteria

- [ ]
- [ ]

## Constraints

<!-- Note compatibility, architecture, dependency, or rollout constraints. -->

## UI impact

<!-- State whether public/app.js, public/index.html, or navigation changes are expected. -->

## Security and network impact

<!-- Note authentication, payment, wallet, contract, data, or external-network implications. Use testnets and synthetic data only. -->

## Validation

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run test:ui` for frontend or navigation changes
- [ ] `npm run build` and `npm run hardhat:smoke` for contract changes
- [ ] Secret scan, code review, and CodeQL
