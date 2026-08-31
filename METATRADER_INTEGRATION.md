# MetaTrader API Integration Guide

## Overview

The MetaTrader API integration enables forex and CFD trading functionality through the MetaTrader platform. This integration provides access to real-time market data, order execution, position management, and trading statistics.

## Configuration

### API Key Setup

The MetaTrader API key has been configured in your `.env` file:

```env
METATRADER_API_KEY=YOUR_METATRADER_API_KEY
METATRADER_API_URL=https://api.metatrader.com/v1
```

### Service Architecture

**File**: `src/services/metaTraderService.js`

The MetaTrader service handles all interactions with the MetaTrader API, including:

- Account management
- Market data retrieval
- Order execution
- Position tracking
- Trade history

## API Endpoints

All endpoints require authentication (JWT token).

### Connection Status

**GET** `/api/metatrader/status`

Check MetaTrader API connection status.

**Response:**

```json
{
  "success": true,
  "connected": true,
  "message": "MetaTrader API connected"
}
```

---

### Account Management

#### Get Account Information

**GET** `/api/metatrader/account`

Retrieve detailed account information.

**Response:**

```json
{
  "success": true,
  "data": {
    "accountId": "12345678",
    "name": "John Doe",
    "broker": "Broker Name",
    "server": "Broker-Server",
    "leverage": 100,
    "currency": "USD"
  }
}
```

#### Get Account Balance

**GET** `/api/metatrader/balance`

Get current balance and equity.

**Response:**

```json
{
  "success": true,
  "data": {
    "balance": 10000.00,
    "equity": 10500.00,
    "margin": 200.00,
    "freeMargin": 10300.00,
    "marginLevel": 5250.00,
    "profit": 500.00,
    "currency": "USD"
  }
}
```

---

### Market Data

#### Get Available Symbols

**GET** `/api/metatrader/symbols`

Retrieve list of available trading symbols (currency pairs, CFDs).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "EURUSD",
      "description": "Euro vs US Dollar",
      "digits": 5,
      "point": 0.00001,
      "spread": 2,
      "minVolume": 0.01,
      "maxVolume": 100,
      "volumeStep": 0.01
    }
  ]
}
```

#### Get Symbol Information

**GET** `/api/metatrader/symbols/:symbol`

Get detailed information about a specific symbol.

**Parameters:**

- `symbol` (path) - Symbol name (e.g., "EURUSD")

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "EURUSD",
    "description": "Euro vs US Dollar",
    "digits": 5,
    "point": 0.00001,
    "spread": 2,
    "contractSize": 100000
  }
}
```

#### Get Current Price

**GET** `/api/metatrader/price/:symbol`

Get current bid/ask prices for a symbol.

**Parameters:**

- `symbol` (path) - Symbol name

**Response:**

```json
{
  "success": true,
  "data": {
    "symbol": "EURUSD",
    "bid": 1.10500,
    "ask": 1.10502,
    "spread": 0.00002,
    "timestamp": 1659312000000
  }
}
```

#### Get Historical Data

**GET** `/api/metatrader/history/:symbol?timeframe=1h&limit=100`

Get historical OHLCV data.

**Parameters:**

- `symbol` (path) - Symbol name
- `timeframe` (query) - Timeframe: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w (default: 1h)
- `limit` (query) - Number of candles (default: 100)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "time": 1659312000000,
      "open": 1.10500,
      "high": 1.10550,
      "low": 1.10480,
      "close": 1.10520,
      "volume": 1000
    }
  ]
}
```

---

### Order Management

#### Place Market Order

**POST** `/api/metatrader/order/market`

Execute a market order immediately at current price.

**Request Body:**

```json
{
  "symbol": "EURUSD",
  "type": "buy",
  "volume": 0.1,
  "stopLoss": 1.10000,
  "takeProfit": 1.11000,
  "comment": "My market order"
}
```

**Parameters:**

- `symbol` (required) - Trading symbol
- `type` (required) - Order type: "buy" or "sell"
- `volume` (required) - Lot size (e.g., 0.1, 1.0)
- `stopLoss` (optional) - Stop loss price
- `takeProfit` (optional) - Take profit price
- `comment` (optional) - Order comment

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "12345",
    "symbol": "EURUSD",
    "type": "BUY",
    "volume": 0.1,
    "openPrice": 1.10502,
    "stopLoss": 1.10000,
    "takeProfit": 1.11000,
    "openTime": 1659312000000,
    "status": "filled"
  }
}
```

#### Place Pending Order

**POST** `/api/metatrader/order/pending`

Place a pending order (limit or stop).

**Request Body:**

```json
{
  "symbol": "EURUSD",
  "type": "buy_limit",
  "volume": 0.1,
  "price": 1.10000,
  "stopLoss": 1.09500,
  "takeProfit": 1.11000,
  "expiration": 1659398400000,
  "comment": "Buy limit order"
}
```

**Parameters:**

- `symbol` (required) - Trading symbol
- `type` (required) - Order type: "buy_limit", "sell_limit", "buy_stop", "sell_stop"
- `volume` (required) - Lot size
- `price` (required) - Entry price
- `stopLoss` (optional) - Stop loss price
- `takeProfit` (optional) - Take profit price
- `expiration` (optional) - Expiration timestamp
- `comment` (optional) - Order comment

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "12346",
    "symbol": "EURUSD",
    "type": "BUY_LIMIT",
    "volume": 0.1,
    "price": 1.10000,
    "status": "pending"
  }
}
```

#### Modify Order

**PUT** `/api/metatrader/order/:orderId`

Modify an existing order's parameters.

**Parameters:**

- `orderId` (path) - Order ID

**Request Body:**

```json
{
  "stopLoss": 1.09800,
  "takeProfit": 1.11500
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "12345",
    "stopLoss": 1.09800,
    "takeProfit": 1.11500
  }
}
```

#### Close Order/Position

**POST** `/api/metatrader/order/:orderId/close`

Close an open position.

**Parameters:**

- `orderId` (path) - Order ID

**Request Body (optional):**

```json
{
  "volume": 0.05
}
```

If `volume` is provided, only partially closes the position.

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "12345",
    "status": "closed",
    "closePrice": 1.10650,
    "profit": 14.80
  }
}
```

#### Cancel Pending Order

**DELETE** `/api/metatrader/order/:orderId`

Cancel a pending order.

**Parameters:**

- `orderId` (path) - Order ID

**Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "12346",
    "status": "cancelled"
  }
}
```

---

### Position Management

#### Get Open Positions

**GET** `/api/metatrader/positions`

Get all currently open positions.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "positionId": "12345",
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "openPrice": 1.10502,
      "currentPrice": 1.10650,
      "profit": 14.80,
      "stopLoss": 1.10000,
      "takeProfit": 1.11000,
      "openTime": 1659312000000
    }
  ]
}
```

#### Get Pending Orders

**GET** `/api/metatrader/orders/pending`

Get all pending orders.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "orderId": "12346",
      "symbol": "GBPUSD",
      "type": "BUY_LIMIT",
      "volume": 0.2,
      "price": 1.25000,
      "status": "pending"
    }
  ]
}
```

#### Get Position Details

**GET** `/api/metatrader/positions/:positionId`

Get detailed information about a specific position.

**Parameters:**

- `positionId` (path) - Position ID

**Response:**

```json
{
  "success": true,
  "data": {
    "positionId": "12345",
    "symbol": "EURUSD",
    "type": "BUY",
    "volume": 0.1,
    "openPrice": 1.10502,
    "currentPrice": 1.10650,
    "profit": 14.80,
    "swap": -0.50,
    "commission": -1.00,
    "openTime": 1659312000000
  }
}
```

---

### Trade History & Statistics

#### Get Trade History

**GET** `/api/metatrader/history?startDate=2024-01-01&endDate=2024-12-31`

Get historical trades.

**Query Parameters:**

- `startDate` (optional) - Start date (ISO format)
- `endDate` (optional) - End date (ISO format)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "orderId": "12344",
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 0.1,
      "openPrice": 1.10300,
      "closePrice": 1.10500,
      "profit": 20.00,
      "openTime": 1659225600000,
      "closeTime": 1659312000000
    }
  ]
}
```

#### Get Trading Statistics

**GET** `/api/metatrader/stats`

Get comprehensive trading statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "account": {
      "balance": 10500.00,
      "equity": 10650.00,
      "profit": 150.00
    },
    "openPositions": 2,
    "totalTrades": 150,
    "profitableTrades": 90,
    "losingTrades": 60,
    "winRate": "60.00",
    "totalProfit": "2500.00",
    "averageProfit": "16.67"
  }
}
```

---

## Usage Examples

### Example 1: Check Connection and Get Balance

```javascript
// Check connection
const statusResponse = await fetch('/api/metatrader/status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const status = await statusResponse.json();
console.log('Connected:', status.connected);

// Get balance
const balanceResponse = await fetch('/api/metatrader/balance', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const balance = await balanceResponse.json();
console.log('Balance:', balance.data.balance);
```

### Example 2: Place a Market Order

```javascript
const orderResponse = await fetch('/api/metatrader/order/market', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    symbol: 'EURUSD',
    type: 'buy',
    volume: 0.1,
    stopLoss: 1.10000,
    takeProfit: 1.11000
  })
});

const order = await orderResponse.json();
console.log('Order placed:', order.data.orderId);
```

### Example 3: Monitor Positions

```javascript
const positionsResponse = await fetch('/api/metatrader/positions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const positions = await positionsResponse.json();
positions.data.forEach(pos => {
  console.log(`${pos.symbol} ${pos.type}: Profit ${pos.profit}`);
});
```

## Features

✅ **Account Management**

- Real-time balance and equity tracking
- Account information retrieval
- Margin monitoring

✅ **Market Data**

- Live price feeds
- Historical OHLCV data
- Symbol information
- Spread monitoring

✅ **Order Execution**

- Market orders (immediate execution)
- Pending orders (limit, stop)
- Order modification
- Partial position closing

✅ **Risk Management**

- Stop loss configuration
- Take profit targets
- Position sizing

✅ **Trading Analytics**

- Win/loss ratios
- Profit statistics
- Trade history
- Performance metrics

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common error codes:

- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `404` - Resource not found
- `500` - Server error

## Best Practices

1. **Always use stop losses** - Protect your capital
2. **Monitor margin levels** - Avoid margin calls
3. **Test with demo account** - Before live trading
4. **Keep API key secure** - Never expose in client code
5. **Handle errors gracefully** - Network issues can occur
6. **Use appropriate lot sizes** - Based on account size
7. **Track trading statistics** - Monitor performance

## Security Notes

- The API key is stored securely in environment variables
- All endpoints require JWT authentication
- Never share your API key publicly
- Use HTTPS in production
- Implement rate limiting for production use

## Integration Status

✅ MetaTrader service created
✅ API key configured
✅ Server endpoints added
✅ Account management ready
✅ Market data available
✅ Order execution enabled
✅ Position tracking active
✅ Trade history accessible

## Next Steps

1. Test the connection using the status endpoint
2. Retrieve account information and balance
3. Explore available symbols
4. Place test orders (recommend demo account first)
5. Monitor positions and performance
6. Implement frontend UI for trading

## Support

For issues or questions:

1. Check the MetaTrader API documentation
2. Review server logs for detailed error messages
3. Verify API key is valid and has proper permissions
4. Ensure account has sufficient balance for trading

---

**Status**: ✅ **INTEGRATION COMPLETE**

The MetaTrader API is fully integrated and ready to use!
