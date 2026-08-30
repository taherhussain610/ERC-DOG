# AtlasX Crypto Wallet + Exchange

A full-stack multi-currency crypto wallet and exchange demo with:

- JWT authentication (register/login)
- Multi-currency balances (BTC, ETH, USDT, SOL, BNB)
- Deposit / withdraw
- User-to-user transfers
- Currency exchange using live CoinGecko rates, with quote preview, direct or multi-hop route selection, and slippage protection
- Conditional exchange orders (target-rate trigger, process, and cancel)
- Internal AMM DEX features: token launch, liquidity pools, LP add/remove, and pool swap
- Solana mainnet integration through Tatum gateway (`https://solana-mainnet.gateway.tatum.io`)
- BSC mainnet integration through Tatum gateway (primary `https://bsc-mainnet.gateway.tatum.io`, fallback `https://cloud-technology-c98ca9cb.gateway.tatum.io`)
- Tron mainnet block integration through Tatum gateway (`https://tron-mainnet.gateway.tatum.io/jsonrpc/`)
- BSC/Tron transaction hash verification with explorer links (BscScan + Tronscan)
- Live price chart powered by Tatum OHLCV batch endpoint (`GET https://api.tatum.io/v4/data/rate/symbol/OHLCV/batch`)
- 24h market change feed powered by Tatum price-change batch endpoint (`POST https://api.tatum.io/v4/data/rate/price-change/batch`)
- SQLite persistence and transaction history
- Responsive frontend dashboard

## Tech Stack

- Node.js + Express
- SQLite (`better-sqlite3`)
- Vanilla HTML/CSS/JS frontend
- Solana JSON-RPC via Tatum gateway
- BSC JSON-RPC via Tatum gateway

## Run Locally

1. Install dependencies:

```bash
npm install
```

1. Copy env file:

```bash
copy .env.example .env
```

1. Set your Tatum key in .env:

```env
BSC_RPC_API_KEY=your_tatum_key
BSC_RPC_URL=https://bsc-mainnet.gateway.tatum.io
BSC_RPC_FALLBACK_URL=https://cloud-technology-c98ca9cb.gateway.tatum.io
TRON_RPC_URL=https://tron-mainnet.gateway.tatum.io/jsonrpc/
TRON_RPC_API_KEY=your_tatum_key
PORT=4000
```

You can also set only `TATUM_API_KEY`; the app will reuse it for Solana, BSC, and Tron gateway auth.

For live chart OHLCV data, set either `TATUM_DATA_API_KEY` or `TATUM_API_KEY`:

```env
TATUM_DATA_API_URL=https://api.tatum.io
TATUM_DATA_API_KEY=your_tatum_key
```

For production-like setup, also set:

```env
NODE_ENV=production
JWT_SECRET=a-strong-random-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

If `NODE_ENV=production` and `JWT_SECRET` is left as default, startup will fail intentionally.

1. Start in development:

```bash
npm run dev
```

1. Run smoke test:

```bash
npm run smoke
```

`npm run smoke` reads `PORT` from `.env` automatically.

1. Stop app process:

```bash
npm run stop
```

`npm run stop` uses a Node script (`scripts/stop.js`) so it works without PowerShell analyzer issues.

## Hardhat

Hardhat is installed as a development dependency. Its ESM workspace lives in `hardhat/` so the
CommonJS application server does not need to change module formats.

```bash
npm run hardhat:compile
npm run hardhat:node
npm run hardhat:smoke
npm run hardhat:clean
```

The local JSON-RPC node listens on `http://127.0.0.1:8545`. Keep it running in a separate terminal,
start the application, and open the **Hardhat Lab** tab to compile, deploy
`AtlasXAssetRegistry`, register asset metadata, and inspect on-chain records. The official Hardhat
Solidity extension is recommended in `.vscode/extensions.json`.

1. Optional VS Code tasks:

- `Start App (npm start)`
- `Start Dev (npm run dev)`
- `Hardhat: Start Local Node`
- `Hardhat: Compile Contracts`
- `Hardhat: Contract Smoke Test`

1. Open:

- `http://localhost:4000`

If port 4000 is busy, change `PORT` in `.env` (for example `PORT=4001`) and open that port instead.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/hardhat/status`
- `POST /api/hardhat/compile`
- `POST /api/hardhat/deploy`
- `GET /api/hardhat/assets`
- `POST /api/hardhat/assets`
- `GET /api/rates`
- `GET /api/rates/price-change?interval=1d`
- `GET /api/chart/series?symbol=BTC&interval=1h` (uses Tatum OHLCV batch when API key is available, falls back to synthetic candles otherwise)
- `GET /api/wallet/balances`
- `POST /api/wallet/deposit`
- `POST /api/wallet/withdraw`
- `POST /api/wallet/transfer`
- `POST /api/exchange`
- `POST /api/exchange/quote`
- `GET /api/exchange/orders`
- `POST /api/exchange/orders`
- `POST /api/exchange/orders/process`
- `POST /api/exchange/orders/:id/cancel`
- `GET /api/dex/tokens`
- `POST /api/dex/tokens`
- `GET /api/dex/pools`
- `POST /api/dex/pools`
- `POST /api/dex/liquidity/add`
- `POST /api/dex/liquidity/remove`
- `POST /api/dex/swap`
- `GET /api/transactions?limit=50`
- `POST /api/solana/import-address`
- `GET /api/solana/wallet?limit=10`
- `POST /api/solana/sync-sol-balance`
- `GET /api/bsc/block-number`
- `GET /api/tron/block-number`
- `GET /api/bsc/verify-transaction?hash=0x...`
- `GET /api/tron/verify-transaction?hash=0x...`
- `POST /api/network/verify-transaction`
- `POST /api/bsc/import-address`
- `GET /api/bsc/wallet`
- `POST /api/bsc/sync-bnb-balance`
- `GET /api/setup/status`
- `GET /api/onchain/setup-status`
- `POST /api/onchain/sync-all`
- `GET /api/port-status`

All non-auth routes require header:

`Authorization: Bearer <token>`

## Notes

- This app uses an internal ledger for balances and includes a Solana read/sync integration.
- The exchange flow can preview and execute market or DEX routes, including multi-hop AMM paths when available.
- The BSC integration uses Tatum JSON-RPC and can read block number, balance, and nonce, plus sync BNB.
- Solana sync does not cryptographically verify ownership of an imported address (demo behavior).
- BSC sync does not cryptographically verify ownership of an imported address (demo behavior).
- It is production-incomplete by design (no KYC, no custody controls, no blockchain signing, no compliance tooling).
- Suitable for local demo/prototyping and extension.

## Tatum BSC Request Examples

Use environment variable `TATUM_API_KEY` (or `BSC_RPC_API_KEY`) instead of hardcoding keys.

Required setup checklist:

1. Create `.env` from `.env.example`.
1. Set `BSC_RPC_URL` to your tenant gateway URL.
1. Optional but recommended: set `BSC_RPC_FALLBACK_URL` to a backup tenant gateway URL.
1. Set `BSC_RPC_API_KEY` (or `TATUM_API_KEY`) to your valid key.
1. Run `npm run dev` from project folder `crypto-exchange-app`.

The dashboard includes a Setup Status panel that checks env setup and gateway connectivity.

### curl

```bash
curl --request POST \
  --url 'https://bsc-mainnet.gateway.tatum.io/' \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header "x-api-key: ${TATUM_API_KEY}" \
  --data '{"id":1,"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### Node.js (axios)

```javascript
import axios from "axios";

const apiKey = process.env.TATUM_API_KEY;

axios
  .post(
    "https://bsc-mainnet.gateway.tatum.io/",
    {
      id: 1,
      jsonrpc: "2.0",
      method: "eth_blockNumber",
    },
    {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
    }
  )
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error(error.response?.data || error.message);
  });
```

### Python

```python
import os
import requests

url = "https://bsc-mainnet.gateway.tatum.io/"
headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "x-api-key": os.environ.get("TATUM_API_KEY", "")
}
body = {
    "id": 1,
    "jsonrpc": "2.0",
    "method": "eth_blockNumber"
}

response = requests.post(url, headers=headers, json=body, timeout=15)
print(response.text)
```

### Ruby

```ruby
require "uri"
require "net/http"

url = URI("https://bsc-mainnet.gateway.tatum.io/")
http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["accept"] = "application/json"
request["content-type"] = "application/json"
request["x-api-key"] = ENV["TATUM_API_KEY"]
request.body = "{\"id\":1,\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\"}"

response = http.request(request)
puts response.read_body
```

### Go

```go
package main

import (
  "fmt"
  "io"
  "net/http"
  "os"
  "strings"
)

func main() {
  payload := strings.NewReader("{\"id\":1,\"jsonrpc\":\"2.0\",\"method\":\"eth_blockNumber\"}")

  req, _ := http.NewRequest("POST", "https://bsc-mainnet.gateway.tatum.io/", payload)
  req.Header.Add("accept", "application/json")
  req.Header.Add("content-type", "application/json")
  req.Header.Add("x-api-key", os.Getenv("TATUM_API_KEY"))

  res, _ := http.DefaultClient.Do(req)
  defer res.Body.Close()

  body, _ := io.ReadAll(res.Body)
  fmt.Println(string(body))
}
```
