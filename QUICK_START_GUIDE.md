# Quick Start Guide - Advanced Features

## 🚀 Getting Started

1. **Start the Application**

   ```bash
   cd crypto-exchange-app
   npm run dev
   ```

2. **Open Browser**
   - Navigate to `http://localhost:4000`
   - Register a new account or login

3. **Access Advanced Features**
   - Click on the **Blockchain** tab for wallet and transaction features
   - Click on the **Trading** tab for DEX and chart features
   - Click on the **Plugin APIs** tab to explore all available endpoints

---

## 📤 Sending Transactions

### Send Native Tokens

1. Navigate to **Blockchain** → **Send Transactions** section
2. Choose your network (Ethereum, BSC, Solana, or TRON)
3. Enter:
   - Private key (⚠️ handle with care!)
   - Recipient address
   - Amount to send
4. Click **Send Transaction**
5. View transaction hash and confirmation

### Send ERC20/BEP20/TRC20 Tokens

1. Scroll to the token transfer section
2. Select network
3. Enter:
   - Private key
   - Token contract address
   - Recipient address
   - Amount
4. Click **Send Token**

**⚠️ Security Warning:** Never share your private keys. This is for testing purposes only.

---

## 💼 Wallet Management

### Generate New Wallet

1. Navigate to **Blockchain** → **Multi-Chain Wallet Generator**
2. Select blockchain type:
   - Multi-Chain (generates for all chains)
   - Individual chains (Ethereum, BSC, Solana)
3. Click **Generate Wallet**
4. Securely save your mnemonic phrase and private keys

### Import from Mnemonic

1. Scroll to **Wallet Import/Export** section
2. Enter your 12 or 24-word mnemonic phrase
3. (Optional) Enter custom derivation path
4. Click **Import Wallet**
5. View all generated addresses

### Import from Private Key

1. Select blockchain (Ethereum/BSC, Solana, or TRON)
2. Enter your private key
3. Click **Import Wallet**
4. View the derived address

### Export Wallet Data

1. Choose export format:
   - **JSON**: Structured data with balances and transactions
   - **CSV**: Transaction history in spreadsheet format
2. Click the export button
3. File will automatically download

---

## 📈 Portfolio Tracking

### Load Your Portfolio

1. Navigate to **Blockchain** → **Multi-Chain Portfolio**
2. Enter comma-separated addresses from different chains:

   ```text
   0xYourEthAddress, YourSolanaAddress, TTronAddress
   ```

3. Click **Load Portfolio**
4. View:
   - Total portfolio value in USD
   - Breakdown by blockchain
   - Detailed holdings table

**Example Addresses to Track:**

- Ethereum/BSC: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Solana: `7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3`
- TRON: `TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9`

---

## ⚡ Checking Balances

### Ethereum / BSC

1. Navigate to **Blockchain Balance Checker**
2. Select network (Ethereum or BSC)
3. Enter wallet address
4. Click **Check Balance**
5. View balance and gas price

### Solana

1. Enter Solana address
2. Click **Check Balance**
3. View SOL balance and current slot

### TRON

1. Enter TRON address (starts with T)
2. Click **Check Balance**
3. View TRX balance and account details

---

## 🪙 Token Information

### ERC20 / BEP20 Tokens

1. Navigate to **Token Information** section
2. Select network (Ethereum or BSC)
3. Enter token contract address
4. (Optional) Enter wallet address to check balance
5. Click **Get Token Info**
6. View: name, symbol, decimals, total supply

### TRC20 Tokens

1. Enter TRON token contract address
2. (Optional) Enter wallet address for balance
3. Click **Get Token Info**

**Popular Token Contracts:**

- USDT (Ethereum): `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- USDT (BSC): `0x55d398326f99059fF775485246999027B3197955`
- USDT (TRON): `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`

---

## 🔍 Transaction Explorer

### Look Up Transactions

1. Navigate to **Transaction Explorer** section
2. Choose your blockchain
3. Enter transaction hash or signature
4. Click **Get Transaction**
5. View transaction details, status, and confirmations

---

## 💰 Live Prices

### Get Cryptocurrency Prices

1. Navigate to **Live Cryptocurrency Prices**
2. Enter cryptocurrency IDs (comma-separated):

   ```text
   bitcoin,ethereum,solana,binancecoin
   ```

3. Select currency (USD, EUR, GBP, JPY)
4. Click **Get Prices**

### Get Token Price by Contract

1. Select platform (Ethereum, BSC, Polygon)
2. Enter token contract address
3. Click **Get Token Price**

### Trending Coins

1. Click **Get Trending Coins**
2. View top 10 trending cryptocurrencies

---

## 🌐 WebSocket Real-Time Updates

### Connect to WebSocket

1. Navigate to **WebSocket Real-Time Updates**
2. Click **Connect WebSocket**
3. Wait for connection confirmation

### Subscribe to Channels

1. Select a channel:
   - **Prices**: Real-time price updates
   - **Balances**: Balance change notifications
   - **Transactions**: Transaction confirmations
   - **Orders**: Order execution updates
   - **Market**: Market data updates
2. Click **Subscribe**
3. View live updates in the updates log

### Disconnect

1. Click **Disconnect** when done
2. Connection status will update

---

## 📊 Blockchain Statistics

### Ethereum Network

1. Navigate to **Blockchain Statistics**
2. Click **Get ETH Stats**
3. View current gas price, block number, etc.

### Solana Network

1. Click **Get SOL Stats**
2. View current slot and network info

### Global Crypto Market

1. Click **Get Global Stats**
2. View:
   - Total market cap
   - 24h volume
   - BTC/ETH dominance
   - Active cryptocurrencies

---

## 🎨 Live Price Charts

### View Price Charts

1. Navigate to **Trading** tab
2. Find **Live Price Chart** section
3. Select market (BTC, ETH, USDT, SOL, BNB)
4. Choose time interval:
   - Short: 1m, 5m, 15m, 30m
   - Medium: 1h, 1d, 1w
   - Long: 1mo, 1y, all
5. Chart updates automatically

---

## 🔄 DEX & Liquidity Pools

### Create Liquidity Pool

1. Navigate to **Trading** → **Liquidity Pools**
2. Fill in **Create Pool** form:
   - Token A symbol
   - Token B symbol
   - Amount A
   - Amount B
3. Click **Create Pool**

### Add Liquidity

1. Find the pool ID you want to add to
2. Fill in **Add Liquidity** form:
   - Pool ID
   - Amount Token A
   - Amount Token B
3. Click **Add Liquidity**

### Swap Tokens

1. Fill in **Swap In Pool** form:
   - Pool ID
   - From Token
   - Amount In
2. Click **Swap**
3. Receive the other token based on pool reserves

### Conditional Orders

1. Fill in **Create Conditional Order** form:
   - Label (description)
   - From/To currency
   - Amount
   - Target rate
   - Trigger direction (buy/sell)
2. Click **Create Order**
3. Orders execute automatically when conditions are met

---

## 🔌 Plugin API Explorer

### Explore APIs

1. Navigate to **Plugin APIs** tab
2. Browse available API endpoints in the table
3. Use search to filter by route, category, or keyword

### Test an API

1. Click on an API row to select it
2. (Optional) Enter custom query parameters
3. (Optional) Enter custom JSON body for POST requests
4. Click **Run Selected**
5. View JSON response below

### Create Custom API

1. Scroll to **Custom Plugin API** section
2. Fill in:
   - Key (unique identifier)
   - Method (GET/POST)
   - Route (API path)
   - Category
   - Description
3. Click **Save Custom API**
4. Test it like any other API

---

## 🔐 Web3 Wallet Integration

### Connect MetaMask (EVM)

1. Navigate to **Trading** → **Web3 Wallet Integration**
2. Click **Connect EVM Wallet**
3. Approve in MetaMask
4. Click **Import Connected** to save address

### Connect Phantom (Solana)

1. Click **Connect Solana Wallet**
2. Approve in Phantom
3. Click **Import Connected** to save address

---

## 🎯 Best Practices

### Security

1. ⚠️ **Never share your private keys or mnemonic phrases**
2. Use test networks for development (not implemented yet)
3. Always verify transaction details before confirming
4. Keep backups of your mnemonic phrases in secure locations
5. Use hardware wallets for large amounts

### Transaction Sending

1. Double-check recipient addresses
2. Start with small test amounts
3. Verify gas prices before sending (Ethereum/BSC)
4. Wait for confirmations before considering transactions final

### Portfolio Management

1. Regularly export wallet data as backup
2. Track multiple addresses for better overview
3. Monitor price changes with WebSocket
4. Use conditional orders for automated trading

---

## 🛠️ Troubleshooting

### Common Issues

#### Server Not Running

- Check if port 4000 is available
- Run `npm run stop` then `npm run dev`

#### Transaction Failed

- Verify private key format is correct
- Check if you have sufficient balance for gas fees
- Ensure recipient address is valid

#### Balance Not Loading

- Check if RPC URLs are configured in .env
- Verify network connectivity
- Some addresses may have no balance

#### WebSocket Not Connecting

- Refresh the page
- Check if server is running
- Look for errors in browser console

#### Import Wallet Failed

- Verify mnemonic has 12 or 24 words
- Check private key format (hex for ETH/TRON, Base58 for Solana)
- Ensure no extra spaces in input

---

## 📚 Additional Resources

### Documentation Files

- `ADVANCED_FEATURES.md` - Complete technical documentation
- `SETUP_COMPLETE.md` - Setup and configuration guide
- `INTEGRATION_COMPLETE.md` - Integration summary
- `README.md` - Project overview

### API Documentation

- All endpoints available at `http://localhost:4000/api/`
- Use Plugin API Explorer to discover endpoints
- Check server logs for detailed error messages

---

## 🎉 You're Ready

You now have access to a fully functional multi-chain cryptocurrency exchange platform with:

✅ Transaction sending across 4 blockchains
✅ Wallet import/export capabilities
✅ Multi-chain portfolio tracking
✅ Real-time price data and charts
✅ DEX trading and liquidity pools
✅ WebSocket live updates
✅ Comprehensive blockchain tools

Happy Trading! 🚀

---

### Need Help

- Check the documentation files
- Review server logs for errors
- Test with small amounts first
- Always prioritize security

**Version:** 2.0.0  
**Status:** ✅ Fully Operational
