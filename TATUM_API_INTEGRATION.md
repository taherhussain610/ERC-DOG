# Tatum API Integration for TRON

## Overview

The crypto exchange application now includes enhanced TRON blockchain integration using the **Tatum API**. This provides alternative methods to interact with the TRON network using Tatum's gateway infrastructure.

## What's New

### Enhanced TronService

The `TronService` class now includes Tatum API methods alongside the existing TronWeb methods, giving you flexibility in how you interact with the TRON blockchain.

#### New Methods Added

1. **`getCurrentBlockViaTatum()`** - Get current block using Tatum API
2. **`getBalanceViaTatum(address)`** - Get account balance via Tatum API
3. **`getTransactionViaTatum(txId)`** - Get transaction details via Tatum API
4. **`getBlockByNumberViaTatum(blockNumber)`** - Get specific block by number
5. **`validateAddressViaTatum(address)`** - Validate TRON address via Tatum API

## New API Endpoints

### 1. Get Current Block (Tatum)

**Endpoint:** `GET /api/tron/tatum/current-block`

**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**

```json
{
  "success": true,
  "block": {
    "block_header": {
      "raw_data": {
        "number": 67890123,
        "timestamp": 1722259200000,
        "txTrieRoot": "...",
        "parentHash": "...",
        "witness_address": "..."
      }
    },
    "blockID": "...",
    "transactions": []
  }
}
```

### 2. Get Account Balance (Tatum)

**Endpoint:** `GET /api/tron/tatum/balance/:address`

**Parameters:**

- `address` - TRON wallet address (e.g., `TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9`)

**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**

```json
{
  "success": true,
  "account": {
    "address": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",
    "balance": 1000000000,
    "create_time": 1622505600000,
    "latest_opration_time": 1722259200000,
    "account_resource": {
      "energy_usage": 0,
      "frozen_balance_for_energy": {}
    }
  }
}
```

### 3. Get Transaction Details (Tatum)

**Endpoint:** `GET /api/tron/tatum/transaction/:txId`

**Parameters:**

- `txId` - Transaction ID/hash

**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Response:**

```json
{
  "success": true,
  "transaction": {
    "ret": [{ "contractRet": "SUCCESS" }],
    "signature": ["..."],
    "txID": "...",
    "raw_data": {
      "contract": [{
        "type": "TransferContract",
        "parameter": {
          "value": {
            "amount": 1000000,
            "owner_address": "...",
            "to_address": "..."
          }
        }
      }],
      "timestamp": 1722259200000
    }
  }
}
```

### 4. Get Block by Number (Tatum)

**Endpoint:** `POST /api/tron/tatum/block-by-number`

**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "blockNumber": 67890123
}
```

**Response:**

```json
{
  "success": true,
  "block": {
    "block_header": {
      "raw_data": {
        "number": 67890123,
        "timestamp": 1722259200000
      }
    },
    "transactions": []
  }
}
```

### 5. Validate Address (Tatum)

**Endpoint:** `POST /api/tron/tatum/validate-address`

**Headers:**

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "address": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"
}
```

**Response:**

```json
{
  "success": true,
  "validation": {
    "result": true,
    "message": "Base58check format"
  }
}
```

## Usage Examples

### JavaScript (Axios)

```javascript
import axios from 'axios';

// Get JWT token first (after login with ravindercloudtechnologyfz.llc@gmail.com)
const token = 'YOUR_JWT_TOKEN';

// Get current block
const currentBlock = await axios.get(
  'http://localhost:4000/api/tron/tatum/current-block',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log('Current block:', currentBlock.data.block.block_header.raw_data.number);

// Get account balance
const balance = await axios.get(
  'http://localhost:4000/api/tron/tatum/balance/TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

console.log('Balance:', balance.data.account.balance / 1000000, 'TRX');

// Get block by number
const block = await axios.post(
  'http://localhost:4000/api/tron/tatum/block-by-number',
  { blockNumber: 67890123 },
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

console.log('Block:', block.data.block);
```

### PowerShell

```powershell
# Login and get token
$loginBody = @{
    email = "user@example.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod `
    -Uri "http://localhost:4000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.token

# Get current block
$headers = @{
    Authorization = "Bearer $token"
}

$currentBlock = Invoke-RestMethod `
    -Uri "http://localhost:4000/api/tron/tatum/current-block" `
    -Method GET `
    -Headers $headers

Write-Host "Current block number:" $currentBlock.block.block_header.raw_data.number

# Validate address
$validateBody = @{
    address = "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"
} | ConvertTo-Json

$validation = Invoke-RestMethod `
    -Uri "http://localhost:4000/api/tron/tatum/validate-address" `
    -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -Body $validateBody

Write-Host "Address valid:" $validation.validation.result
```

### cURL

```bash
# Get JWT token first
TOKEN="YOUR_JWT_TOKEN"

# Get current block
curl -X GET "http://localhost:4000/api/tron/tatum/current-block" \
  -H "Authorization: Bearer $TOKEN"

# Get account balance
curl -X GET "http://localhost:4000/api/tron/tatum/balance/TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9" \
  -H "Authorization: Bearer $TOKEN"

# Get transaction
curl -X GET "http://localhost:4000/api/tron/tatum/transaction/TX_HASH_HERE" \
  -H "Authorization: Bearer $TOKEN"

# Get block by number
curl -X POST "http://localhost:4000/api/tron/tatum/block-by-number" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"blockNumber": 67890123}'

# Validate address
curl -X POST "http://localhost:4000/api/tron/tatum/validate-address" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address": "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"}'
```

## Configuration

### Environment Variables

The Tatum API integration uses the following environment variables from `.env`:

```env
# TRON RPC Configuration
TRON_RPC_URL=https://api.trongrid.io
TRON_RPC_API_KEY=YOUR_TATUM_API_KEY

# Tatum API Configuration
TATUM_API_KEY=YOUR_TATUM_API_KEY
```

**Note:** The `TRON_RPC_API_KEY` is now configured with your Tatum API key, enabling enhanced TRON blockchain access.

## Benefits of Tatum Integration

### 1. **Reliability**

- Enterprise-grade infrastructure
- High availability and uptime
- Automatic failover and load balancing

### 2. **Performance**

- Optimized API endpoints
- Faster response times
- Reduced latency

### 3. **Features**

- Advanced querying capabilities
- Enhanced data formatting
- Comprehensive validation

### 4. **Flexibility**

- Choose between TronWeb or Tatum for each operation
- Fallback options if one service is unavailable
- Unified interface for both methods

## Method Comparison

| Operation | TronWeb Method | Tatum Method |
| --------- | -------------- | ------------ |
| Get Current Block | `getBlockNumber()` | `getCurrentBlockViaTatum()` |
| Get Balance | `getBalance(address)` | `getBalanceViaTatum(address)` |
| Get Transaction | `getTransaction(hash)` | `getTransactionViaTatum(txId)` |
| Validate Address | `isValidAddress(address)` | `validateAddressViaTatum(address)` |

## Error Handling

All Tatum API methods include proper error handling:

```javascript
try {
  const block = await tronService.getCurrentBlockViaTatum();
  console.log('Current block:', block);
} catch (error) {
  console.error('Error fetching block:', error.message);
  // Fallback to TronWeb method
  const blockNumber = await tronService.getBlockNumber();
  console.log('Current block number (TronWeb):', blockNumber);
}
```

## Testing the Integration

### 1. Using the Plugin API Explorer

1. Navigate to `http://localhost:4000`
2. Login to your account
3. Go to the **Plugin APIs** tab
4. Filter by category: "tron"
5. Test the new Tatum endpoints:
   - `/api/tron/tatum/current-block`
   - `/api/tron/tatum/balance/:address`
   - `/api/tron/tatum/transaction/:txId`
   - `/api/tron/tatum/block-by-number`
   - `/api/tron/tatum/validate-address`

### 2. Direct API Testing

Use tools like:

- **Postman** - Import endpoints and test
- **Insomnia** - REST client testing
- **Thunder Client** - VS Code extension
- **curl** - Command line testing

## Implementation Details

### File Changes

1. **`src/blockchain/tronService.js`**
   - Added axios import
   - Added `tatumBaseUrl` property
   - Added 5 new Tatum API methods
   - Maintained backward compatibility with existing TronWeb methods

2. **`src/server.js`**
   - Added 5 new API endpoints under `/api/tron/tatum/`
   - Added endpoints to plugin API explorer
   - Configured proper authentication middleware

3. **`.env`**
   - Set `TRON_RPC_API_KEY` to Tatum API key
   - Enables Tatum integration for all TRON operations

### Code Architecture

```text
┌─────────────────────────────────────────────┐
│           Client Application                │
│  (Browser, Postman, curl, etc.)            │
└─────────────────┬───────────────────────────┘
                  │ HTTP Request
                  ▼
┌─────────────────────────────────────────────┐
│         Express.js Server                   │
│  /api/tron/tatum/* endpoints               │
└─────────────────┬───────────────────────────┘
                  │ Method Call
                  ▼
┌─────────────────────────────────────────────┐
│          TronService Class                  │
│  ┌───────────────────────────────────────┐ │
│  │  TronWeb Methods   │  Tatum Methods   │ │
│  │  (Direct chain)    │  (API Gateway)   │ │
│  └───────────────────────────────────────┘ │
└────────┬────────────────────────┬───────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌────────────────────┐
│  TRON Network   │      │   Tatum Gateway    │
│  (TronGrid)     │      │   (tron-mainnet)   │
└─────────────────┘      └────────────────────┘
```

## Best Practices

### 1. **Choose the Right Method**

- Use TronWeb methods for transaction signing and sending
- Use Tatum methods for read-only operations and querying
- Tatum provides better error messages and data formatting

### 2. **Implement Fallbacks**

```javascript
async function getCurrentBlock() {
  try {
    return await tronService.getCurrentBlockViaTatum();
  } catch (error) {
    console.warn('Tatum API failed, using TronWeb');
    return await tronService.getBlockNumber();
  }
}
```

### 3. **Monitor API Usage**

- Track API call counts
- Implement caching for frequently accessed data
- Use rate limiting to avoid API quota exhaustion

### 4. **Security**

- Never expose API keys in client-side code
- Always use authentication for API endpoints
- Validate all input parameters
- Implement proper error handling

## Rate Limits

Tatum API has rate limits based on your plan:

- **Free Plan**: 5 requests per second
- **Start Plan**: 10 requests per second
- **Enterprise**: Custom limits

Monitor your usage at: <https://dashboard.tatum.io>

## Support and Resources

### Documentation

- **Tatum TRON API Docs**: <https://docs.tatum.io/docs/rpc-api-reference/tron-rpc-documentation>
- **TronWeb Docs**: <https://developers.tron.network/docs/tronweb>
- **TRON Network**: <https://tron.network>

### API Keys

- Get your Tatum API key: <https://dashboard.tatum.io>
- Current key in use: `YOUR_TATUM_API_KEY`

### Troubleshooting

**Issue:** API returns 401 Unauthorized

- **Solution:** Check that `TRON_RPC_API_KEY` is set correctly in `.env`

**Issue:** API returns 429 Too Many Requests

- **Solution:** Implement rate limiting or upgrade your Tatum plan

**Issue:** Block/transaction not found

- **Solution:** Verify the block number or transaction hash is correct

**Issue:** Address validation fails

- **Solution:** Ensure address is in base58 format (starts with 'T')

## Future Enhancements

Potential additions for future versions:

1. **Advanced Features**
   - Smart contract interaction via Tatum
   - Historical data queries
   - Bulk operations support
   - WebSocket streaming

2. **Optimization**
   - Response caching
   - Request batching
   - Automatic retry logic
   - Load balancing between providers

3. **Monitoring**
   - API call analytics
   - Performance metrics
   - Error rate tracking
   - Cost monitoring

## Summary

The Tatum API integration provides:

✅ **5 new API endpoints** for TRON blockchain operations  
✅ **Enhanced reliability** through Tatum's infrastructure  
✅ **Alternative access methods** alongside existing TronWeb  
✅ **Better error handling** and data formatting  
✅ **Production-ready** implementation with authentication  
✅ **Fully documented** with examples in multiple languages  

Your TRON integration is now more robust and feature-rich! 🚀

---

**Version:** 2.1.0  
**Last Updated:** 2026-07-29  
**Status:** ✅ Fully Operational
