# AtlasX Crypto Exchange - Full Stack Blockchain Application

A comprehensive multi-currency cryptocurrency wallet and exchange application with full blockchain integration, smart contract support, real-time WebSocket updates, and multi-chain wallet management.

## 🚀 Features

### Multi-Blockchain Support

- **Ethereum** - Full Web3.js/Ethers.js integration
- **Binance Smart Chain (BSC)** - EVM-compatible smart contracts
- **Solana** - High-performance blockchain integration
- **TRON** - TRC20 token support
- **Bitcoin** - Price tracking and market data

### Wallet Management

- **Multi-Chain Wallet Generation** - Create wallets for multiple blockchains from a single mnemonic
- **Import/Export Wallets** - Support for private keys and seed phrases
- **MetaMask Integration** - Connect existing MetaMask wallets
- **Phantom Wallet** - Solana wallet connection
- **HD Wallet Support** - BIP39/BIP44 compliant wallet generation

### Smart Contract Integration

- **ERC20 Token Support** - View balances, transfer tokens
- **TRC20 Token Support** - TRON token interactions
- **SPL Token Support** - Solana Program Library tokens
- **Contract Interaction** - Read and write to smart contracts
- **Gas Estimation** - Automatic gas price calculation

### Real-Time Features

- **WebSocket Server** - Real-time price updates and notifications
- **Live Transaction Monitoring** - Instant transaction confirmations
- **Price Alerts** - Subscribe to price changes
- **Order Updates** - Real-time order execution notifications

### Exchange Features

- **Multi-Currency Exchange** - Trade between supported cryptocurrencies
- **DEX Integration** - Decentralized exchange pool management
- **Limit Orders** - Set target prices for automatic execution
- **Market Orders** - Instant exchange at current rates
- **Liquidity Pools** - Create and manage liquidity pools

### API Integration

- **CoinGecko API** - Live cryptocurrency prices and market data
- **Tatum API** - Blockchain data and RPC endpoints
- **Custom Plugin System** - Create and manage custom API endpoints
- **RESTful API** - Comprehensive backend API

## 📦 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd crypto-exchange-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Access the application**
   Open your browser to `http://localhost:4000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=4000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=*

# Ethereum Configuration
ETH_RPC_URL=https://ethereum.publicnode.com
ETH_RPC_API_KEY=your-ethereum-api-key

# Binance Smart Chain Configuration
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_RPC_API_KEY=your-bsc-api-key
BSC_WALLET_CACHE_MS=15000

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_RPC_API_KEY=your-solana-api-key

# TRON Configuration
TRON_RPC_URL=https://api.trongrid.io
TRON_RPC_API_KEY=your-tron-api-key

# Tatum API (Unified blockchain API)
TATUM_API_KEY=your-tatum-api-key
TATUM_DATA_API_URL=https://api.tatum.io
```

### API Keys

#### Free API Providers

- **Ethereum**: <https://publicnode.com> (no API key required)
- **BSC**: <https://bsc-dataseed.binance.org> (no API key required)
- **Solana**: <https://api.mainnet-beta.solana.com> (no API key required)

#### Premium API Providers

- **Tatum**: <https://tatum.io> (free tier available)
- **Infura**: <https://infura.io> (for Ethereum)
- **Alchemy**: <https://alchemy.com> (for multiple chains)
- **QuickNode**: <https://quicknode.com> (for multiple chains)

## 🏗️ Architecture

### Backend Structure

```text
src/
├── server.js                 # Main Express server
└── blockchain/
    ├── walletService.js      # Wallet generation and management
    ├── ethereumService.js    # Ethereum/BSC blockchain interactions
    ├── solanaService.js      # Solana blockchain interactions
    ├── tronService.js        # TRON blockchain interactions
    ├── cryptoDataService.js  # CoinGecko price data integration
    └── webSocketService.js   # Real-time WebSocket server
```

### Frontend Structure

```text
public/
├── index.html                    # Main HTML page
├── app.js                        # Main application logic
├── blockchain-integration.js     # Wallet and WebSocket integration
└── styles.css                    # Application styling
```

### Database Schema

- **users** - User accounts and authentication
- **balances** - User cryptocurrency balances
- **transactions** - Transaction history
- **user_solana_wallets** - Solana wallet addresses
- **user_bsc_wallets** - BSC wallet addresses
- **dex_tokens** - DEX token definitions
- **dex_pools** - Liquidity pool data
- **exchange_orders** - Pending and executed orders

## 🔌 API Endpoints

### Authentication

- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/me` - Get current user info

### Wallet Generation

- `POST /api/wallet/generate` - Generate new wallet
- `POST /api/wallet/validate-mnemonic` - Validate seed phrase

### Ethereum/BSC

- `GET /api/ethereum/balance/:address` - Get ETH balance
- `GET /api/ethereum/gas-price` - Get current gas price
- `GET /api/ethereum/transaction/:hash` - Get transaction details
- `GET /api/ethereum/token-balance` - Get ERC20 token balance
- `GET /api/ethereum/token-info/:address` - Get token information
- `GET /api/bsc/balance/:address` - Get BNB balance

### Solana

- `GET /api/solana/balance/:address` - Get SOL balance
- `GET /api/solana/slot` - Get current slot
- `GET /api/solana/transaction/:signature` - Get transaction
- `GET /api/solana/token-accounts/:address` - Get SPL token accounts
- `GET /api/solana/recent-transactions/:address` - Get recent transactions
- `POST /api/solana/validate-address` - Validate Solana address

### TRON

- `GET /api/tron/balance/:address` - Get TRX balance
- `GET /api/tron/account/:address` - Get account info
- `GET /api/tron/transaction/:hash` - Get transaction
- `GET /api/tron/trc20-balance` - Get TRC20 token balance
- `GET /api/tron/trc20-info/:address` - Get TRC20 token info
- `POST /api/tron/validate-address` - Validate TRON address

### Crypto Data

- `GET /api/crypto/prices` - Get current prices
- `GET /api/crypto/coin/:id` - Get coin details
- `GET /api/crypto/market-chart/:id` - Get market chart data
- `GET /api/crypto/ohlc/:id` - Get OHLC data
- `GET /api/crypto/trending` - Get trending coins
- `GET /api/crypto/global` - Get global market data
- `GET /api/crypto/search` - Search coins
- `GET /api/crypto/token-price/:platform/:address` - Get token price by contract

### Exchange

- `GET /api/rates` - Get exchange rates
- `POST /api/exchange/quote` - Get exchange quote
- `POST /api/exchange` - Execute exchange
- `GET /api/exchange/orders` - Get user orders
- `POST /api/exchange/orders` - Create new order

### WebSocket

- `GET /api/websocket/status` - Get WebSocket server status

## 🌐 WebSocket Events

### Client to Server

- `authenticate` - Authenticate user session
- `subscribe` - Subscribe to channel
- `unsubscribe` - Unsubscribe from channel
- `ping` - Health check ping

### Server to Client

- `priceUpdate` - Real-time price updates
- `balanceUpdate` - Balance changes
- `transaction` - New transaction notification
- `orderUpdate` - Order status update
- `marketUpdate` - Market data update
- `notification` - General notifications

### Subscription Channels

- `price:BTC` - Bitcoin price updates
- `price:ETH` - Ethereum price updates
- `price:SOL` - Solana price updates
- `user:{userId}` - User-specific updates
- `market` - General market updates

## 🎮 Frontend Usage

### Wallet Connection

```javascript
// Initialize wallet service
const wallet = new BlockchainWallet();

// Connect MetaMask
try {
  const result = await wallet.connectMetaMask();
  console.log('Connected:', result.address);
} catch (error) {
  console.error('Failed to connect:', error);
}

// Connect Phantom (Solana)
try {
  const result = await wallet.connectPhantom();
  console.log('Connected:', result.address);
} catch (error) {
  console.error('Failed to connect:', error);
}
```

### WebSocket Connection

```javascript
// Initialize WebSocket
const ws = new WebSocketManager();
ws.connect();

// Subscribe to price updates
ws.subscribeToPrices('BTC');

// Handle price updates
ws.onPriceUpdate = (data) => {
  console.log('New price:', data);
  updatePriceDisplay(data);
};

// Subscribe to user updates
ws.subscribeToUser(userId);

// Handle balance updates
ws.onBalanceUpdate = (data) => {
  console.log('Balance updated:', data);
  refreshBalances();
};
```

## 🔐 Security Features

- **JWT Authentication** - Secure user sessions
- **Password Hashing** - bcrypt with salt rounds
- **CORS Protection** - Configurable CORS origins
- **Helmet.js** - HTTP security headers
- **Input Validation** - Express-validator for all inputs
- **SQL Injection Prevention** - Prepared statements
- **XSS Protection** - Content Security Policy

## 🧪 Testing

### Manual Testing

1. **Start the server**

   ```bash
   npm run dev
   ```

2. **Run smoke tests**

   ```bash
   npm run smoke
   ```

3. **Test API endpoints**

   - Use the built-in API Explorer in the application
   - Navigate to the "API Explorer" tab after login

### API Testing with curl

```bash
# Health check
curl http://localhost:4000/api/health

# Get cryptocurrency prices
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/crypto/prices?ids=bitcoin,ethereum

# Get Ethereum balance
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/ethereum/balance/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Generate wallet
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"type":"ethereum"}' \
  http://localhost:4000/api/wallet/generate
```

## 📊 Supported Cryptocurrencies

### Native Support

- **BTC** - Bitcoin
- **ETH** - Ethereum
- **BNB** - Binance Coin
- **SOL** - Solana
- **USDT** - Tether

### Token Standards

- **ERC20** - Ethereum tokens
- **BEP20** - BSC tokens
- **TRC20** - TRON tokens
- **SPL** - Solana tokens

## 🛠️ Development

### Available Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run smoke tests
npm run smoke

# Stop running server
npm run stop
```

### Adding New Blockchain

1. Create service file in `src/blockchain/`
2. Initialize in `server.js`
3. Add API endpoints
4. Update frontend integration

## 📝 Common Issues

### Port Already in Use

```bash
# Change PORT in .env file
PORT=4001
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### WebSocket Connection Failed

- Check if server is running
- Verify CORS settings
- Check firewall settings

### Wallet Connection Failed

- Ensure MetaMask/Phantom is installed
- Check browser console for errors
- Verify network selection

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure `CORS_ORIGIN` to your domain
- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS for all connections
- [ ] Configure proper API rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Use environment-specific RPC endpoints

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
JWT_SECRET=your-256-bit-secret-key
CORS_ORIGIN=https://yourdomain.com
```

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the GitHub repository.

## 🎯 Roadmap

- [ ] Mobile app support
- [ ] Hardware wallet integration
- [ ] NFT marketplace
- [ ] Staking features
- [ ] Cross-chain bridges
- [ ] DeFi protocol integration
- [ ] Advanced charting tools
- [ ] Social trading features

## ⚠️ Disclaimer

This software is for educational and demonstration purposes. Always conduct thorough security audits before using in production. Never store large amounts of cryptocurrency in hot wallets. Use at your own risk.
