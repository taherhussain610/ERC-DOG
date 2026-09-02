# MetaTrader API - Quick Reference

## 🔑 API Key

```text
API Key: YOUR_METATRADER_API_KEY
```

## 🚀 Quick Start

### 1. Check Connection

```bash
GET /api/metatrader/status
```

### 2. Get Balance

```bash
GET /api/metatrader/balance
```

### 3. View Available Symbols

```bash
GET /api/metatrader/symbols
```

### 4. Get Current Price

```bash
GET /api/metatrader/price/EURUSD
```

### 5. Place Market Order

```bash
POST /api/metatrader/order/market
{
  "symbol": "EURUSD",
  "type": "buy",
  "volume": 0.1,
  "stopLoss": 1.10000,
  "takeProfit": 1.11000
}
```

### 6. View Open Positions

```bash
GET /api/metatrader/positions
```

### 7. Close Position

```bash
POST /api/metatrader/order/{orderId}/close
```

### 8. Get Trading Stats

```bash
GET /api/metatrader/stats
```

## 📊 All Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/metatrader/status` | Check connection |
| GET | `/api/metatrader/account` | Get account info |
| GET | `/api/metatrader/balance` | Get balance & equity |
| GET | `/api/metatrader/symbols` | List trading symbols |
| GET | `/api/metatrader/symbols/:symbol` | Get symbol info |
| GET | `/api/metatrader/price/:symbol` | Get current price |
| GET | `/api/metatrader/history/:symbol` | Get historical data |
| POST | `/api/metatrader/order/market` | Place market order |
| POST | `/api/metatrader/order/pending` | Place pending order |
| PUT | `/api/metatrader/order/:orderId` | Modify order |
| POST | `/api/metatrader/order/:orderId/close` | Close position |
| DELETE | `/api/metatrader/order/:orderId` | Cancel pending order |
| GET | `/api/metatrader/positions` | Get open positions |
| GET | `/api/metatrader/orders/pending` | Get pending orders |
| GET | `/api/metatrader/positions/:positionId` | Get position details |
| GET | `/api/metatrader/history` | Get trade history |
| GET | `/api/metatrader/stats` | Get trading statistics |

## 🎯 Order Types

### Market Orders

- **buy** - Buy at current market price
- **sell** - Sell at current market price

### Pending Orders

- **buy_limit** - Buy when price drops to specified level
- **sell_limit** - Sell when price rises to specified level
- **buy_stop** - Buy when price rises to specified level
- **sell_stop** - Sell when price drops to specified level

## 📈 Timeframes

- `1m` - 1 minute
- `5m` - 5 minutes
- `15m` - 15 minutes
- `30m` - 30 minutes
- `1h` - 1 hour
- `4h` - 4 hours
- `1d` - 1 day
- `1w` - 1 week

## 💡 Common Symbols

### Forex Pairs

- EURUSD - Euro / US Dollar
- GBPUSD - British Pound / US Dollar
- USDJPY - US Dollar / Japanese Yen
- AUDUSD - Australian Dollar / US Dollar
- USDCHF - US Dollar / Swiss Franc
- USDCAD - US Dollar / Canadian Dollar
- NZDUSD - New Zealand Dollar / US Dollar

### Commodities

- XAUUSD - Gold / US Dollar
- XAGUSD - Silver / US Dollar
- XTIUSD - Crude Oil / US Dollar

### Indices

- US30 - Dow Jones Industrial Average
- US500 - S&P 500
- NAS100 - NASDAQ 100
- GER40 - DAX 40

## 🛡️ Risk Management

### Position Sizing

```javascript
// Calculate lot size based on risk
const accountBalance = 10000;
const riskPercent = 1; // 1% risk per trade
const riskAmount = accountBalance * (riskPercent / 100);
const stopLossPoints = 50; // 50 pips
const lotSize = riskAmount / (stopLossPoints * 10);
```

### Stop Loss & Take Profit

```javascript
// Always set stop loss
const order = {
  symbol: "EURUSD",
  type: "buy",
  volume: 0.1,
  stopLoss: currentPrice - 0.00050, // 50 pips below
  takeProfit: currentPrice + 0.00100 // 100 pips above (1:2 risk/reward)
};
```

## 🔍 Example Workflows

### Workflow 1: Manual Trading

1. Check connection status
2. Get account balance
3. View available symbols
4. Get current price for symbol
5. Place market order with SL/TP
6. Monitor open positions
7. Close position when target reached

### Workflow 2: Price Monitoring

1. Get historical data for analysis
2. Set up price alerts
3. Place pending orders at key levels
4. Monitor pending orders
5. Manage filled orders

### Workflow 3: Statistics Review

1. Get trade history
2. Analyze trading stats
3. Calculate win rate
4. Review profit/loss
5. Adjust strategy

## 📱 JavaScript Examples

### Fetch Current Price

```javascript
async function getCurrentPrice(symbol) {
  const response = await fetch(`/api/metatrader/price/${symbol}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.data;
}
```

### Place Buy Order

```javascript
async function placeBuyOrder(symbol, volume, sl, tp) {
  const response = await fetch('/api/metatrader/order/market', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      symbol,
      type: 'buy',
      volume,
      stopLoss: sl,
      takeProfit: tp
    })
  });
  return await response.json();
}
```

### Monitor Positions

```javascript
async function monitorPositions() {
  const response = await fetch('/api/metatrader/positions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  data.data.forEach(pos => {
    console.log(`${pos.symbol}: ${pos.profit > 0 ? '+' : ''}${pos.profit}`);
  });
}
```

## ⚠️ Important Notes

- ✅ All endpoints require authentication
- ✅ Use HTTPS in production
- ✅ Always test with demo account first
- ✅ Implement proper error handling
- ✅ Monitor margin levels
- ✅ Use stop losses
- ✅ Practice risk management

## 🔐 Environment Variables

```env
METATRADER_API_KEY=YOUR_METATRADER_API_KEY
METATRADER_API_URL=https://api.metatrader.com/v1
```

## 📞 Need Help?

1. Check `/api/metatrader/status` for connection issues
2. Review server logs for detailed errors
3. Verify API key permissions
4. Ensure sufficient account balance
5. Check symbol availability

---

**Integration Status**: ✅ COMPLETE AND READY TO USE
