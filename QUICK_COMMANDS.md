# 🎯 Quick Access Commands

## Start Application

```powershell
# Standard start
npm start

# Development mode (auto-restart)
npm run dev

# Using startup script
powershell -ExecutionPolicy Bypass -File start-app.ps1
```

## Database Operations

```powershell
# Check database status
node scripts/check-full-status.js

# Check ERC1155 tables
node scripts/check-erc1155-tables.js

# Check all tables
node scripts/check-tables.js
```

## Testing

```powershell
# Run smoke tests
npm run smoke

# Run service and contract tests
npm test

# Run the real-browser desktop/mobile suite
npm run test:ui

# Run lint, tests, API/UI smoke, and production audit
npm run check
```

## Stop Server

```powershell
npm run stop
```

## Package Management

```powershell
# Install dependencies
npm install

# Update packages
npm update

# Audit security
npm audit

# Fix vulnerabilities
npm audit fix
```

## Code Quality

```powershell
# Check formatting for maintained configuration, tests, and integration modules
npm run format:check

# Format the maintained baseline without rewriting legacy modules
npm run format

# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix
```

## VS Code Commands

- **Ctrl+Shift+P** - Open command palette
- **Ctrl+`** - Toggle terminal
- **Ctrl+B** - Toggle sidebar
- **F5** - Start debugging
- **Ctrl+Shift+F** - Search in files

## API Endpoints (when running)

### Authentication

- POST `/auth/register` - Register new user
- POST `/auth/login` - Login user

### Balances

- GET `/balances` - Get user balances
- POST `/balances/deposit` - Deposit funds
- POST `/balances/withdraw` - Withdraw funds
- POST `/balances/transfer` - Transfer between users

### Trading

- POST `/exchange` - Exchange currencies
- GET `/rates` - Get current rates
- GET `/transactions` - Get transaction history

### Blockchain

- POST `/blockchain/generate-wallet` - Generate wallet
- POST `/blockchain/check-balance` - Check blockchain balance
- POST `/blockchain/send-transaction` - Send blockchain tx
- POST `/blockchain/import-wallet` - Import existing wallet

### Advanced Features

- POST `/margin/open-position` - Open margin position
- GET `/p2p/offers` - Get P2P offers
- POST `/trading-bot/create` - Create trading bot
- GET `/api-keys` - Get API keys
- POST `/payment-terminal/create` - Create payment terminal

## Environment Variables

Key variables in `.env`:

- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - JWT signing secret
- `TATUM_API_KEY` - Tatum API key
- `BSC_RPC_API_KEY` - BSC RPC key
- `TRON_RPC_API_KEY` - TRON RPC key

## Useful Links

- Local: <http://localhost:4000>
- Production: <https://ravindracloudtechnology.com>
- Tatum Docs: <https://docs.tatum.io>
- CoinGecko API: <https://www.coingecko.com/en/api>

## Troubleshooting

### Port in use

```powershell
# Windows: Find and kill process
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Or change port in .env
PORT=4001
```

### Module not found

```powershell
rm -r node_modules
rm package-lock.json
npm install
```

### Database locked

```powershell
npm run stop
# Wait 2 seconds, then restart
npm start
```

## Documentation Files

- `COMPLETE_SETUP_GUIDE.md` - Full setup instructions
- `QUICK_START_GUIDE.md` - Quick start guide
- `QUICK_FEATURE_GUIDE.md` - Feature overview
- `README.md` - Project README
- `APPLICATION_STATUS.md` - Status report
- Various integration guides (ERC1155, TRON, etc.)
