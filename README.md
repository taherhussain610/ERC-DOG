# AtlasX Exchange Terminal

AtlasX Exchange Terminal is a multi-chain crypto exchange application for trading, DeFi workflows, portfolio discovery, and blockchain operations from one dashboard.

## Prerequisites

- Node.js 20+
- npm

## Installation

```bash
npm install
```

## Environment Setup

```bash
cp .env.example .env
```

Then edit `.env` with your API keys and network settings.

## Required Environment Variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Express application port. Default runtime target is `4000`. |
| `JWT_SECRET` | Secret used to sign authentication tokens. |
| `TATUM_API_KEY` | Shared API key for supported blockchain and market data integrations. |
| `SOLANA_RPC_URL` | Solana RPC endpoint used for Solana wallet and balance operations. |
| `BSC_RPC_URL` | BNB Smart Chain RPC endpoint for BSC balance and chain calls. |
| `TRON_NETWORK` | TRON target network selection for TRON workflows. |
| `SMTP_HOST` | SMTP host for outbound email and onboarding messages. |
| `METATRADER_API_URL` | MetaTrader bridge endpoint for account and order workflows. |

## Running

Use the default app server on port 4000:

```bash
npm start
```

For hot reload during development:

```bash
npm run dev
```

## Testing

```bash
npm test
```

## Lint

```bash
npm run lint
```

## Features

- Unified authentication with login plus in-dashboard account registration
- Overview dashboard with market pulse, transaction lookup, and live global market stat chips
- Markets panel with searchable crypto discovery and live price table
- Portfolio panel for on-chain address balance lookup and portfolio allocation summaries
- Charts panel with OHLC history, trending coins, and global market statistics
- Margin/demo trading, token swap history, and P2P trading workflows
- Copy trading, prediction markets, MetaTrader operations, and assistant tooling
- DEX token and liquidity pool visibility alongside wallet, API key, and payment terminal tools
- Hardened constant-product DEX contracts with slippage, deadline, and liquidity-withdrawal protections
- Prefunded ERC-20 staking rewards and an escrowed ERC-1155 fixed-price marketplace
- Hardhat, ERC-1155, and blockchain operations panels for smart contract experimentation

## Blockchain Networks

- Ethereum
- BSC
- Solana
- TRON

## Smart Contracts

The smart contract suite under `hardhat/contracts/` includes:

- A capped, pausable ERC-1155 representation with batch minting, transfers, burning, supply tracking, and safe receiver checks
- A constant-product ERC-20 DEX with safe balance accounting, recipient controls, reentrancy protection, slippage bounds, and deadlines
- A prefunded staking-rewards pool with accumulator-based reward accounting
- An escrowed ERC-1155 marketplace with partial fills, expirations, pull payments, and capped protocol fees

These contracts are intended for local experimentation and require an independent audit before production deployment.
