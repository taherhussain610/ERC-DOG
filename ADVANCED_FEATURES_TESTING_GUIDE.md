# Advanced Features Testing Guide

## 📋 Pre-Testing Checklist

- ✅ Server running on http://localhost:4000 (or https://atlasx.online for production)
- ✅ Database initialized with 40+ tables
- ✅ Email service configured
- ✅ Blockchain services connected
- ✅ All advanced routes registered
- ✅ Rate limiting applied
- ✅ Authentication middleware active

## 🔐 Getting an Authentication Token

All advanced endpoints require JWT authentication. First, register and login:

### 1. Register User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "SecurePassword123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

Save the token for use in subsequent requests.

### 2. Set Environment Variable
```bash
export TOKEN="your_jwt_token_here"
export API_URL="http://localhost:4000"
```

## 🧪 Testing Technical Indicators

### Test 1: Simple Moving Average (SMA)
```bash
curl -X POST $API_URL/api/indicators/sma \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [100, 102, 101, 105, 103, 107, 106, 110, 108, 112, 111, 115, 113, 117, 116],
    "period": 5
  }'
```

Expected Response:
```json
{
  "indicator": "SMA",
  "period": 5,
  "values": [102.2, 103.4, 104.4, 105.8, 106.8, 108, 109, 110.6, 111.4],
  "dataPoints": 9
}
```

### Test 2: Relative Strength Index (RSI)
```bash
curl -X POST $API_URL/api/indicators/rsi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.00, 46.00, 46.00],
    "period": 14
  }'
```

Expected Response:
```json
{
  "indicator": "RSI",
  "period": 14,
  "values": [70.2, 65.8, 72.1, ...],
  "dataPoints": 4,
  "interpretation": "Values > 70 indicate overbought, < 30 indicate oversold"
}
```

### Test 3: MACD
```bash
curl -X POST $API_URL/api/indicators/macd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [100, 102, 101, 105, 103, 107, 106, 110, 108, 112, 111, 115, 113, 117, 116, 120, 118, 122, 121, 125],
    "fastPeriod": 12,
    "slowPeriod": 26,
    "signalPeriod": 9
  }'
```

Expected Response:
```json
{
  "indicator": "MACD",
  "fastPeriod": 12,
  "slowPeriod": 26,
  "signalPeriod": 9,
  "macdLine": [0.5, 0.8, 1.2, ...],
  "signalLine": [0.4, 0.6, 0.9, ...],
  "histogram": [0.1, 0.2, 0.3, ...],
  "dataPoints": 12
}
```

### Test 4: All Indicators at Once
```bash
curl -X POST $API_URL/api/indicators/all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prices": [100, 102, 101, 105, 103, 107, 106, 110, 108, 112, 111, 115, 113, 117, 116, 120],
    "period": 5
  }'
```

Expected Response:
```json
{
  "sma": { "values": [...], "period": 5 },
  "ema": { "values": [...], "period": 5 },
  "rsi": { "values": [...], "period": 5 },
  "macd": { "macdLine": [...], "signalLine": [...], "histogram": [...] },
  "bollinger": { "upper": [...], "middle": [...], "lower": [...] },
  "stochastic": { "k": [...], "d": [...] },
  "atr": { "values": [...] },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

## 📊 Testing Advanced Analytics

### Test 1: Portfolio Analysis
First, deposit some funds to your wallet:

```bash
curl -X POST $API_URL/api/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "BTC",
    "amount": 0.5
  }'

curl -X POST $API_URL/api/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "ETH",
    "amount": 5
  }'

curl -X POST $API_URL/api/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USDT",
    "amount": 10000
  }'
```

Then analyze the portfolio:

```bash
curl -X POST $API_URL/api/analytics/portfolio-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": {
      "BTC": 0.5,
      "ETH": 5,
      "USDT": 10000
    }
  }'
```

Expected Response:
```json
{
  "portfolio": { "BTC": 0.5, "ETH": 5, "USDT": 10000 },
  "totalValue": 25000,
  "allocation": {
    "BTC": { "percentage": 30, "value": 7500 },
    "ETH": { "percentage": 25, "value": 6250 },
    "USDT": { "percentage": 45, "value": 11250 }
  },
  "diversification": {
    "herfindahlIndex": 0.28,
    "concentration": "Moderate diversification"
  },
  "correlations": {
    "BTC_ETH": 0.75,
    "BTC_USDT": -0.05,
    "ETH_USDT": -0.08
  },
  "recommendations": [
    "Reduce BTC concentration to under 30%",
    "Increase ETH holdings for better diversification",
    "USDT provides good stability"
  ],
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### Test 2: Performance Metrics
```bash
curl -X POST $API_URL/api/analytics/performance-metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": { "BTC": 0.5, "ETH": 5, "USDT": 10000 },
    "returns": [0.02, 0.05, -0.01, 0.03, 0.04, 0.01, -0.02, 0.06],
    "riskFreeRate": 0.02
  }'
```

Expected Response:
```json
{
  "sharpeRatio": 1.45,
  "sortinoRatio": 2.10,
  "maxDrawdown": -0.08,
  "calmarRatio": 0.35,
  "volatility": 0.038,
  "valueAtRisk": -0.052,
  "conditionalValueAtRisk": -0.068,
  "timestamp": "2024-01-15T10:35:00Z"
}
```

## 🎯 Testing Portfolio Optimization

### Test: Optimize Portfolio Allocation
```bash
curl -X POST $API_URL/api/portfolio/optimize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": {
      "BTC": 0.5,
      "ETH": 5,
      "USDT": 10000
    },
    "constraints": {
      "minAllocation": 0.05,
      "maxAllocation": 0.6,
      "targetReturn": 0.15
    }
  }'
```

Expected Response:
```json
{
  "originalAllocation": { "BTC": 30%, "ETH": 25%, "USDT": 45% },
  "optimizedAllocation": { "BTC": 25%, "ETH": 35%, "USDT": 40% },
  "expectedReturn": 0.158,
  "expectedVolatility": 0.032,
  "sharpeRatio": 1.85,
  "changes": [
    { "asset": "BTC", "from": 30, "to": 25, "change": -5 },
    { "asset": "ETH", "from": 25, "to": 35, "change": +10 },
    { "asset": "USDT", "from": 45, "to": 40, "change": -5 }
  ]
}
```

## ⚠️ Testing Risk Management

### Test 1: Portfolio Risk Analysis
```bash
curl -X POST $API_URL/api/risk/analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": { "BTC": 0.5, "ETH": 5, "USDT": 10000 },
    "timeHorizon": 30
  }'
```

Expected Response:
```json
{
  "overallRiskScore": 6.5,
  "riskLevel": "Moderate",
  "assets": [
    {
      "symbol": "BTC",
      "concentration": 30,
      "volatility": 0.35,
      "riskScore": 8.5,
      "warning": "High volatility asset"
    }
  ],
  "recommendations": [
    "Reduce BTC allocation by 5%",
    "Consider adding stablecoins",
    "Monitor correlation changes"
  ]
}
```

### Test 2: Stress Testing
```bash
curl -X POST $API_URL/api/risk/stress-test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": { "BTC": 0.5, "ETH": 5, "USDT": 10000 },
    "scenarios": ["bearMarket", "flashCrash", "higherInflation"]
  }'
```

Expected Response:
```json
{
  "scenarios": [
    {
      "name": "bearMarket",
      "description": "Market-wide decline of 30%",
      "portfolioImpact": -0.28,
      "projectedValue": 18000,
      "assetImpacts": { "BTC": -0.30, "ETH": -0.30, "USDT": 0 }
    }
  ]
}
```

## 📈 Testing Monitoring

### Test: System Health Check
```bash
curl -X GET $API_URL/api/monitoring/health \
  -H "Authorization: Bearer $TOKEN"
```

Expected Response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "memory": {
    "heapUsed": 45.2,
    "heapTotal": 128,
    "external": 2.1
  },
  "database": {
    "tables": 40,
    "status": "connected",
    "latency": 1.2
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

## 🔒 Testing Rate Limiting

Each endpoint category has specific rate limits:

- **Auth endpoints**: 5 requests per 15 minutes
- **Trading endpoints**: 30 requests per minute  
- **Blockchain endpoints**: 20 requests per minute
- **Read endpoints**: 100 requests per minute

To test rate limiting:

```bash
# Make rapid requests to trigger limit
for i in {1..6}; do
  curl -X POST $API_URL/api/indicators/sma \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prices": [100, 102, 101, 105, 103], "period": 2}'
done
# After 5 requests, expect 429 Too Many Requests
```

## ✅ Integration Test Suite

Run this comprehensive test:

```bash
#!/bin/bash

echo "🧪 Running Advanced Features Integration Tests"
echo "=============================================="

# 1. Test Auth
echo "\n1️⃣  Testing Authentication..."
TOKEN=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test'$RANDOM'", "email": "test'$RANDOM'@example.com", "password": "TestPass123"}' | jq -r '.token')
echo "✅ Token obtained: ${TOKEN:0:20}..."

# 2. Test Indicators
echo "\n2️⃣  Testing Technical Indicators..."
curl -s -X POST $API_URL/api/indicators/sma \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prices": [100, 102, 101, 105, 103], "period": 2}' | jq '.indicator'

# 3. Test Deposit
echo "\n3️⃣  Testing Portfolio Deposit..."
curl -s -X POST $API_URL/api/wallet/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency": "BTC", "amount": 0.5}' | jq '.message'

# 4. Test Analytics
echo "\n4️⃣  Testing Portfolio Analytics..."
curl -s -X POST $API_URL/api/analytics/portfolio-analysis \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"portfolio": {"BTC": 0.5, "ETH": 2, "USDT": 1000}}' | jq '.totalValue'

# 5. Test Monitoring
echo "\n5️⃣  Testing Monitoring..."
curl -s -X GET $API_URL/api/monitoring/health \
  -H "Authorization: Bearer $TOKEN" | jq '.status'

echo "\n✅ Integration Tests Complete!"
```

## 📊 Success Criteria

All tests should show:
- ✅ 200 status codes for successful requests
- ✅ 401 status code when missing authentication
- ✅ 400 status code for invalid input
- ✅ 429 status code when rate limited
- ✅ Valid JSON responses with all expected fields
- ✅ Performance metrics under 500ms

## 🚀 Production Testing Checklist

- [ ] All endpoints return correct 200 responses
- [ ] Authentication is enforced on protected endpoints
- [ ] Rate limiting is working correctly
- [ ] Database transactions are atomic
- [ ] WebSocket broadcasting works
- [ ] Error messages are informative
- [ ] Response times acceptable
- [ ] No memory leaks under load
- [ ] SSL certificate valid
- [ ] Email notifications sent

---

**Status**: Ready for comprehensive testing ✅
