<!-- markdownlint-disable MD022 MD032 MD031 MD040 MD060 MD036 -->

# ERC-1155 Quick Start Guide

## 🚀 Getting Started with ERC-1155 NFTs

This guide will help you start using ERC-1155 multi-token features in 5 minutes.

## Step 1: Access the ERC-1155 Dashboard

1. Open your browser to `http://localhost:4000`
2. Log in to your account
3. Click the **"ERC-1155"** tab in the dashboard

## Step 2: Add Your First Contract

### Using a Test Contract (Ethereum Testnet)

```
Contract Address: 0x... (any ERC-1155 contract)
Name: My First NFT Collection
Symbol: MNFT
Network: ethereum
```

Click **"Add Contract"** button.

### Using OpenSea Example

```
Contract Address: 0x76be3b62873462d2142405439777e971754e8e77
Name: OpenSea Shared Storefront
Symbol: OPENSTORE
Network: ethereum
```

## Step 3: Check Token Balance

1. Select your added contract from the dropdown
2. Enter Token ID (e.g., `1` for the first token)
3. Enter wallet address to check
4. Click **"Check Balance"**

Example:
```
Contract: My First NFT Collection
Token ID: 1
Wallet Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Step 4: View Token Metadata

1. Select contract from dropdown
2. Enter Token ID
3. Click **"Get Metadata"**

You'll see:
- Token name and description
- Image (if available)
- All attributes and properties
- Raw JSON metadata

## Step 5: Transfer Tokens

⚠️ **Requires Private Key** - Use testnet first!

```javascript
Contract: [Select from dropdown]
Token ID: 1
From Address: 0x... (your address)
To Address: 0x... (recipient address)
Amount: 1
Private Key: 0x... (your private key)
```

Click **"Transfer Tokens"**

## Common Use Cases

### Use Case 1: NFT Collection Manager

**Goal**: Track your NFT collection across multiple contracts

1. Add all your NFT contract addresses
2. Use balance checker for each token ID
3. View metadata to see your NFTs
4. Track transfers in transaction history

### Use Case 2: Game Items

**Goal**: Manage in-game items (fungible tokens)

1. Add game contract address
2. Check balances for different item types (tokenIds)
3. Transfer items between players
4. Mint new items (if you're the game owner)

### Use Case 3: Fractional NFTs

**Goal**: Manage fractional ownership of assets

1. Add ERC-1155 contract with fractional tokens
2. Check your share (balance) of token ID
3. Transfer fractional shares
4. View total supply to see total shares

## Quick API Examples

### Check Balance (cURL)

```bash
curl -X GET "http://localhost:4000/api/erc1155/balance/1/1?walletAddress=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Transfer Token (JavaScript)

```javascript
const response = await fetch('http://localhost:4000/api/erc1155/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    contractId: 1,
    privateKey: '0x...',
    from: '0x...',
    to: '0x...',
    tokenId: '1',
    amount: '5'
  })
});

const data = await response.json();
console.log('Transaction Hash:', data.transactionHash);
```

### Get Metadata (Python)

```python
import requests

headers = {'Authorization': f'Bearer {token}'}
response = requests.get(
    'http://localhost:4000/api/erc1155/token/1/1/metadata',
    headers=headers
)

metadata = response.json()
print(f"Token Name: {metadata['metadata']['name']}")
print(f"Image: {metadata['metadata']['image']}")
```

## Key Features at a Glance

| Feature | Description | Endpoint |
|---------|-------------|----------|
| 📋 Add Contract | Track new ERC-1155 contracts | POST `/api/erc1155/contract/add` |
| 💰 Check Balance | View token balances | GET `/api/erc1155/balance/:contractId/:tokenId` |
| 📦 Batch Balance | Check multiple balances | POST `/api/erc1155/balance/batch` |
| 🖼️ View Metadata | See token details & images | GET `/api/erc1155/token/:contractId/:tokenId/metadata` |
| 🔄 Transfer | Send tokens to others | POST `/api/erc1155/transfer` |
| 🎨 Mint | Create new tokens | POST `/api/erc1155/mint` |
| 🔥 Burn | Destroy tokens | POST `/api/erc1155/burn` |
| 📊 History | View all transactions | GET `/api/erc1155/transactions` |

## Important Notes

### 🔐 Security

- **Never share your private keys**
- Private keys are only used for signing transactions
- Test on testnet before using real tokens
- Use HTTPS in production

### ⚡ Gas Costs

- Transfers require ETH for gas
- Batch operations save gas
- Use gas estimation endpoint first
- Failed transactions still consume gas

### 🌐 Networks

Current support:
- Ethereum (mainnet & testnets)
- BSC (Binance Smart Chain)
- Polygon (configurable)

Change RPC endpoints in `.env` file for different networks.

### 💡 Tips

1. **Use Batch Operations**: Transfer multiple tokens in one transaction to save gas
2. **Cache Metadata**: Metadata is automatically cached in the database
3. **Track Transactions**: All operations are recorded in transaction history
4. **Estimate Gas**: Use the estimate endpoint before expensive operations

## Sample Workflow

### Complete NFT Trading Flow

```javascript
// 1. Add contract
const { contractId } = await addContract({
  contractAddress: '0x123...',
  name: 'Trading Cards',
  symbol: 'CARDS'
});

// 2. Check what you own
const balance = await checkBalance(contractId, tokenId, myAddress);
console.log(`You own ${balance} of token ${tokenId}`);

// 3. Get token details
const metadata = await getMetadata(contractId, tokenId);
console.log(`Token: ${metadata.name}`);

// 4. Transfer to buyer
const txHash = await transfer({
  contractId,
  from: myAddress,
  to: buyerAddress,
  tokenId,
  amount: '1',
  privateKey: myPrivateKey
});

console.log(`Sold! Transaction: ${txHash}`);
```

## Testing with Testnet

### Ethereum Goerli Testnet

1. Get testnet ETH from [faucet](https://goerlifaucet.com/)
2. Deploy test ERC-1155 contract or use existing one
3. Update RPC URL in `.env`:
   ```
   ETH_RPC_URL=https://goerli.infura.io/v3/YOUR_KEY
   ```
4. Add contract and test all features

### Example Test Contract

You can use OpenZeppelin's ERC-1155 mock contracts on testnet:
```
// Deploy your own using Remix IDE
// Or use community test contracts
```

## Troubleshooting

### "Contract not found"
- Check contract address is correct
- Verify contract is on selected network
- Refresh contracts list

### "Transaction failed"
- Ensure sufficient ETH for gas
- Verify you own the tokens
- Check private key is correct
- Try gas estimation first

### "Metadata not loading"
- URI might not be accessible
- IPFS gateways can be slow
- Check contract implements uri() function

## Next Steps

- Read the full [ERC1155_INTEGRATION_GUIDE.md](./ERC1155_INTEGRATION_GUIDE.md)
- Explore [OpenSea's ERC-1155](https://docs.opensea.io/docs/metadata-standards)
- Learn about [EIP-1155 Standard](https://eips.ethereum.org/EIPS/eip-1155)
- Check out [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/4.x/erc1155)

## Support

Need help?
1. Check the integration guide for detailed documentation
2. Review error messages in browser console
3. Check server logs for backend errors
4. Verify RPC endpoint is working

---

**Happy Trading! 🎉**

Start with a testnet, then move to mainnet when comfortable!
