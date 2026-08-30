# Testing Checklist - Advanced Features

## 🧪 Complete Testing Guide

Use this checklist to verify all advanced features are working correctly.

---

## ✅ Pre-Testing Setup

- [ ] Server is running on `http://localhost:4000`
- [ ] Browser opened to application
- [ ] User account created and logged in
- [ ] Test private keys prepared (⚠️ Use testnet or burner wallets only!)
- [ ] Test addresses prepared for all chains

---

## 📤 Transaction Sending Tests

### Ethereum Native (ETH)

- [ ] Navigate to Send Transactions section
- [ ] Select "Ethereum" network
- [ ] Enter valid private key
- [ ] Enter test recipient address
- [ ] Enter amount (e.g., 0.001)
- [ ] Click "Send Transaction"
- [ ] Verify transaction hash is displayed
- [ ] Check transaction status in result div

### BSC Native (BNB)

- [ ] Select "BSC" network
- [ ] Enter valid private key
- [ ] Enter test recipient address
- [ ] Enter amount (e.g., 0.001)
- [ ] Click "Send Transaction"
- [ ] Verify transaction hash is displayed

### Solana (SOL)

- [ ] Switch to Solana form
- [ ] Enter Solana private key (Base58 format)
- [ ] Enter recipient address
- [ ] Enter amount (e.g., 0.001)
- [ ] Click "Send SOL"
- [ ] Verify signature is displayed

### TRON (TRX)

- [ ] Switch to TRON form
- [ ] Enter TRON private key (hex format)
- [ ] Enter recipient address (T...)
- [ ] Enter amount (e.g., 1)
- [ ] Click "Send TRX"
- [ ] Verify transaction hash is displayed

### ERC20/BEP20 Token Transfer

- [ ] Navigate to token sending section
- [ ] Select network (Ethereum or BSC)
- [ ] Enter private key
- [ ] Enter token contract address (e.g., USDT)
- [ ] Enter recipient address
- [ ] Enter token amount
- [ ] Click "Send Token"
- [ ] Verify transaction hash

### TRC20 Token Transfer

- [ ] Switch to TRON token form
- [ ] Enter private key
- [ ] Enter TRC20 contract address
- [ ] Enter recipient address
- [ ] Enter token amount
- [ ] Click "Send TRC20"
- [ ] Verify transaction hash

---

## 💼 Wallet Management Tests

### Multi-Chain Wallet Generation

- [ ] Navigate to Multi-Chain Wallet Generator
- [ ] Select "Multi-Chain" type
- [ ] Click "Generate Wallet"
- [ ] Verify mnemonic phrase is displayed
- [ ] Verify Ethereum address is shown
- [ ] Verify BSC address is shown
- [ ] Verify Solana address is shown
- [ ] Copy mnemonic for next test

### Import from Mnemonic

- [ ] Scroll to Wallet Import/Export section
- [ ] Paste previously generated mnemonic
- [ ] Leave derivation path default or enter custom
- [ ] Click "Import from Mnemonic"
- [ ] Verify all addresses are displayed correctly
- [ ] Addresses should match generated wallet

### Import from Private Key (Ethereum)

- [ ] Select "Ethereum/BSC" from chain dropdown
- [ ] Enter a valid Ethereum private key
- [ ] Click "Import from Private Key"
- [ ] Verify address is displayed
- [ ] Address should match expected value

### Import from Private Key (Solana)

- [ ] Select "Solana" from chain dropdown
- [ ] Enter a valid Solana private key (Base58)
- [ ] Click "Import from Private Key"
- [ ] Verify Solana address is displayed

### Import from Private Key (TRON)

- [ ] Select "TRON" from chain dropdown
- [ ] Enter a valid TRON private key (hex)
- [ ] Click "Import from Private Key"
- [ ] Verify TRON address is displayed

### Export Wallet JSON

- [ ] Click "Export as JSON"
- [ ] Verify file downloads automatically
- [ ] Open JSON file
- [ ] Verify structure includes:
  - [ ] timestamp
  - [ ] user
  - [ ] balances array
  - [ ] transactions array
- [ ] Verify data is readable

### Export Wallet CSV

- [ ] Click "Export as CSV"
- [ ] Verify CSV file downloads
- [ ] Open CSV in spreadsheet software
- [ ] Verify columns include:
  - [ ] ID
  - [ ] User ID
  - [ ] Type
  - [ ] Currency
  - [ ] Amount
  - [ ] Status
  - [ ] Description
  - [ ] Timestamp
- [ ] Verify data is formatted correctly

---

## 📈 Portfolio Tracking Tests

### Single Address Portfolio

- [ ] Navigate to Multi-Chain Portfolio section
- [ ] Enter single Ethereum address
- [ ] Click "Load Portfolio"
- [ ] Verify summary card appears for Ethereum
- [ ] Verify total portfolio value is calculated
- [ ] Verify breakdown table shows address and balance

### Multi-Chain Portfolio

- [ ] Enter comma-separated addresses:

  ```text
  0xEthAddress, SolanaAddress, TtronAddress
  ```

- [ ] Click "Load Portfolio"
- [ ] Verify multiple summary cards appear:
  - [ ] Ethereum card
  - [ ] BSC card (if applicable)
  - [ ] Solana card
  - [ ] TRON card
- [ ] Verify total portfolio value sums correctly
- [ ] Verify breakdown table shows all addresses
- [ ] Verify USD values are calculated for each

### Empty Address Portfolio

- [ ] Enter a new/empty address with zero balance
- [ ] Click "Load Portfolio"
- [ ] Verify it displays 0 balance correctly
- [ ] No errors should occur

---

## ⚡ Balance Checker Tests

### Ethereum Balance

- [ ] Navigate to Blockchain Balance Checker
- [ ] Select "Ethereum" network
- [ ] Enter valid Ethereum address
- [ ] Click "Check Balance"
- [ ] Verify balance is displayed in ETH
- [ ] Verify gas price information is shown

### BSC Balance

- [ ] Select "BSC" network
- [ ] Enter valid BSC address
- [ ] Click "Check Balance"
- [ ] Verify balance is displayed in BNB
- [ ] Verify gas price information is shown

### Solana Balance

- [ ] Enter valid Solana address
- [ ] Click "Check Balance"
- [ ] Verify balance is displayed in SOL
- [ ] Verify current slot number is shown

### TRON Balance

- [ ] Enter valid TRON address (starts with T)
- [ ] Click "Check Balance"
- [ ] Verify balance is displayed in TRX
- [ ] Verify account details are shown

---

## 🪙 Token Information Tests

### ERC20 Token Info (Ethereum)

- [ ] Navigate to Token Information section
- [ ] Select "Ethereum" network
- [ ] Enter USDT contract: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- [ ] Click "Get Token Info"
- [ ] Verify displays:
  - [ ] Name: "Tether USD"
  - [ ] Symbol: "USDT"
  - [ ] Decimals: 6
  - [ ] Total Supply

### BEP20 Token Info (BSC)

- [ ] Select "BSC" network
- [ ] Enter USDT contract: `0x55d398326f99059fF775485246999027B3197955`
- [ ] Click "Get Token Info"
- [ ] Verify token information displays correctly

### Token Balance Check

- [ ] Enter token contract address
- [ ] Enter wallet address in second field
- [ ] Click "Get Token Info"
- [ ] Verify balance is shown for that address

### TRC20 Token Info

- [ ] Enter USDT TRON contract: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- [ ] Click "Get Token Info"
- [ ] Verify TRON token info displays

---

## 🔍 Transaction Explorer Tests

### Ethereum Transaction

- [ ] Navigate to Transaction Explorer
- [ ] Find a recent Ethereum transaction hash
- [ ] Enter the hash
- [ ] Click "Get Transaction"
- [ ] Verify transaction details display:
  - [ ] From address
  - [ ] To address
  - [ ] Value
  - [ ] Gas used
  - [ ] Block number

### Solana Transaction

- [ ] Enter a Solana transaction signature
- [ ] Click "Get Transaction"
- [ ] Verify transaction details display
- [ ] Verify signature is shown

### TRON Transaction

- [ ] Enter a TRON transaction hash
- [ ] Click "Get Transaction"
- [ ] Verify transaction details display

---

## 💰 Cryptocurrency Prices Tests

### Multi-Currency Prices

- [ ] Navigate to Live Cryptocurrency Prices
- [ ] Enter: `bitcoin,ethereum,solana`
- [ ] Select currency: USD
- [ ] Click "Get Prices"
- [ ] Verify prices display for all coins

### Different Currency (EUR)

- [ ] Change currency selector to EUR
- [ ] Click "Get Prices"
- [ ] Verify prices update to EUR values

### Token Price by Contract

- [ ] Select platform (e.g., Ethereum)
- [ ] Enter token contract address
- [ ] Click "Get Token Price"
- [ ] Verify token price displays

### Trending Coins

- [ ] Click "Get Trending Coins"
- [ ] Verify top 10 trending coins display
- [ ] Verify each has name and market info

---

## 🌐 WebSocket Tests

### Connect WebSocket

- [ ] Navigate to WebSocket Real-Time Updates
- [ ] Click "Connect WebSocket"
- [ ] Verify connection status changes to "Connected"
- [ ] Check updates log for connection message

### Subscribe to Prices

- [ ] Click "Subscribe to Prices"
- [ ] Verify subscription confirmation in log
- [ ] Wait for price updates to appear in log

### Subscribe to Transactions

- [ ] Click "Subscribe to Transactions"
- [ ] Verify subscription confirmation

### Subscribe to Market

- [ ] Click "Subscribe to Market"
- [ ] Verify subscription confirmation

### Disconnect WebSocket

- [ ] Click "Disconnect"
- [ ] Verify status changes to "Disconnected"
- [ ] Verify no more updates appear

---

## 📊 Statistics Tests

### Ethereum Stats

- [ ] Navigate to Blockchain Statistics
- [ ] Click "Get ETH Stats"
- [ ] Verify displays:
  - [ ] Gas price
  - [ ] Current block number
  - [ ] Network info

### Solana Stats

- [ ] Click "Get SOL Stats"
- [ ] Verify displays:
  - [ ] Current slot
  - [ ] Network info

### Global Crypto Stats

- [ ] Click "Get Global Stats"
- [ ] Verify displays:
  - [ ] Total market cap
  - [ ] 24h volume
  - [ ] BTC dominance %
  - [ ] ETH dominance %
  - [ ] Active cryptocurrencies

---

## 🎨 Price Charts Tests

### Load BTC Chart

- [ ] Navigate to Trading tab
- [ ] Select market: Bitcoin (BTC/USD)
- [ ] Select interval: 1h
- [ ] Click interval button
- [ ] Verify chart renders with candlesticks
- [ ] Verify current price displays

### Change Interval

- [ ] Click different intervals (1m, 5m, 15m, etc.)
- [ ] Verify chart updates each time
- [ ] Verify candles adjust to timeframe

### Different Markets

- [ ] Select ETH/USD
- [ ] Verify chart updates to Ethereum data
- [ ] Try SOL/USD, BNB/USD, USDT/USD
- [ ] Verify each market loads correctly

---

## 🔄 DEX & Liquidity Tests

### Create Pool

- [ ] Navigate to Liquidity Pools section
- [ ] Enter Token A: TEST
- [ ] Enter Token B: USDT
- [ ] Enter Amount A: 1000
- [ ] Enter Amount B: 500
- [ ] Click "Create Pool"
- [ ] Verify success message
- [ ] Note the Pool ID

### Add Liquidity

- [ ] Enter Pool ID from previous test
- [ ] Enter Amount A: 100
- [ ] Enter Amount B: 50
- [ ] Click "Add Liquidity"
- [ ] Verify success message

### Swap in Pool

- [ ] Enter Pool ID
- [ ] Enter From Token: TEST
- [ ] Enter Amount: 10
- [ ] Click "Swap"
- [ ] Verify swap result shows received amount

### View All Pools

- [ ] Click "View All Pools"
- [ ] Verify table displays all created pools
- [ ] Verify pool details (tokens, reserves, LP tokens)

### Create Conditional Order

- [ ] Enter label: "Buy BTC at 60k"
- [ ] From Currency: USDT
- [ ] To Currency: BTC
- [ ] Amount: 1000
- [ ] Target Rate: 60000
- [ ] Direction: Buy
- [ ] Click "Create Order"
- [ ] Verify order created successfully

---

## 🔌 Plugin API Tests

### Browse APIs

- [ ] Navigate to Plugin APIs tab
- [ ] Verify API table loads with routes
- [ ] Verify categories are shown

### Filter APIs

- [ ] Use search box
- [ ] Type "balance"
- [ ] Verify only balance-related APIs show
- [ ] Clear search

### Test GET API

- [ ] Click on a GET route (e.g., `/api/health`)
- [ ] Click "Run Selected"
- [ ] Verify response displays in JSON format
- [ ] Verify status code shows success

### Test POST API with Body

- [ ] Click on a POST route
- [ ] Enter JSON body in custom body field
- [ ] Click "Run Selected"
- [ ] Verify response displays

### Create Custom API

- [ ] Scroll to Custom Plugin API section
- [ ] Key: "my-test-api"
- [ ] Method: GET
- [ ] Route: "/api/test"
- [ ] Category: "custom"
- [ ] Description: "Test API"
- [ ] Click "Save Custom API"
- [ ] Verify API appears in table

---

## 🔐 Web3 Wallet Integration Tests

### Connect MetaMask

- [ ] Ensure MetaMask is installed
- [ ] Navigate to Web3 Wallet Integration
- [ ] Click "Connect EVM Wallet"
- [ ] Approve connection in MetaMask
- [ ] Verify connected address displays
- [ ] Click "Import Connected"
- [ ] Verify success message

### Connect Phantom

- [ ] Ensure Phantom is installed
- [ ] Click "Connect Solana Wallet"
- [ ] Approve connection in Phantom
- [ ] Verify connected address displays
- [ ] Click "Import Connected"
- [ ] Verify success message

---

## 🎯 Integration Tests

### End-to-End Flow 1: Generate → Export

1. [ ] Generate multi-chain wallet
2. [ ] Copy addresses
3. [ ] Export wallet data (JSON)
4. [ ] Verify exported file contains generated addresses

### End-to-End Flow 2: Import → Check Balance → Send

1. [ ] Import wallet from private key
2. [ ] Use address to check balance
3. [ ] Send small transaction
4. [ ] Track transaction in explorer
5. [ ] Verify balance updates

### End-to-End Flow 3: Portfolio → WebSocket → Charts

1. [ ] Load portfolio with multiple addresses
2. [ ] Connect WebSocket for price updates
3. [ ] Subscribe to prices
4. [ ] View price chart for held assets
5. [ ] Verify real-time updates work

---

## 📝 Error Handling Tests

### Invalid Inputs

- [ ] Try sending transaction with invalid private key
- [ ] Try checking balance with malformed address
- [ ] Try importing invalid mnemonic phrase
- [ ] Verify error messages display clearly
- [ ] Verify application doesn't crash

### Empty Inputs

- [ ] Try submitting forms with empty fields
- [ ] Verify validation messages appear
- [ ] Verify required fields are highlighted

### Network Errors

- [ ] Stop the server
- [ ] Try any API operation
- [ ] Verify error handling works
- [ ] Restart server
- [ ] Verify operations resume normally

---

## ✅ Final Verification

- [ ] All transaction sending features work
- [ ] All wallet management features work
- [ ] Portfolio tracking works for all chains
- [ ] Balance checkers work for all chains
- [ ] Token operations work correctly
- [ ] Transaction explorer works for all chains
- [ ] Price APIs return data correctly
- [ ] WebSocket connects and receives updates
- [ ] Statistics APIs return current data
- [ ] Charts render and update correctly
- [ ] DEX operations create pools and execute swaps
- [ ] Plugin API explorer tests all endpoints
- [ ] Web3 wallet connections work
- [ ] Error handling is graceful
- [ ] No console errors (check browser DevTools)
- [ ] All UI elements are responsive

---

## 🐛 Bug Tracking

Use this section to note any issues found during testing:

### Issues Found

| Feature | Issue | Severity | Status |
|---------|-------|----------|--------|
| _TBD_   | _TBD_ | _TBD_    | _TBD_  |

### Notes

```text
Add any additional testing notes here...
```

---

## 📊 Test Results Summary

**Test Date:** _______________
**Tester:** _______________

**Total Tests:** _____
**Passed:** _____
**Failed:** _____
**Pass Rate:** _____%

---

## 🎉 Testing Complete

If all checkboxes are marked and no critical issues were found, the application is ready for use!

**Remember:**

- Always use test accounts for development
- Never share private keys
- Start with small transaction amounts
- Report any bugs or issues

---

**Version:** 2.0.0
**Last Updated:** 2026-07-29
