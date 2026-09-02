# TRON Tatum Gateway - Quick Reference

## 🌐 All Available Endpoints

### Mainnet (Production)

```text
JSON-RPC:      https://tron-mainnet.gateway.tatum.io/jsonrpc
Wallet:        https://tron-mainnet.gateway.tatum.io/wallet
Walletsolidity: https://tron-mainnet.gateway.tatum.io/walletsolidity
```

### Shasta Testnet

```text
JSON-RPC:      https://tron-shasta.gateway.tatum.io/jsonrpc
Wallet:        https://tron-shasta.gateway.tatum.io/wallet
Walletsolidity: https://tron-shasta.gateway.tatum.io/walletsolidity
```

### Nile Testnet

```text
JSON-RPC:      https://tron-nile.gateway.tatum.io/jsonrpc
Wallet:        https://tron-nile.gateway.tatum.io/wallet
Walletsolidity: https://tron-nile.gateway.tatum.io/walletsolidity
```

## ⚡ Quick Start

### 1. Configure Network

Edit `.env`:

```env
TRON_NETWORK=mainnet  # or shasta, nile
TRON_RPC_API_KEY=your-api-key
```

### 2. Start Server

```bash
npm start
```

### 3. Verify Configuration

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/tron/config
```

## 📋 Common API Calls

### Get Current Block

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/tron/tatum/current-block
```

### Check Balance

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/tron/balance/TRX9Muhe6NdqfLLw9rWBP4nZFTWFt5KmNJ
```

### Generate Wallet

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"multi","includeMultiChain":true}' \
  http://localhost:4000/api/wallet/generate
```

## 🔑 Authentication

All API calls require Bearer token from login/register:

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"ravindercloudtechnologyfz.llc@gmail.com","password":"Pass1234!"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"Pass1234!"}'
```

## 🧪 Test Script

```powershell
.\scripts\test-tron-integration.ps1
```

## 📝 Network Features

| Endpoint | Purpose |
| -------- | ------- |
| `/jsonrpc` | Standard JSON-RPC 2.0 calls for smart contracts |
| `/wallet` | Account operations, balance, transactions |
| `/walletsolidity` | Confirmed/solidified blockchain data |

## ✅ Integration Status

- ✅ All 9 endpoints configured
- ✅ Multi-network support (mainnet/shasta/nile)
- ✅ TronService fully integrated
- ✅ API endpoints exposed
- ✅ Test suite ready
- ✅ Documentation complete

**Status: Fully Functional** 🎉
