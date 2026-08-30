const state = {
  token: localStorage.getItem("token"),
  user: null,
  websocket: null,
  activeSection: "overviewPanel",
  assistantMessages: [],
  stakes: [],
  notifs: [],
  nfts: [],
  dashboard: {
    p2pOrders: [],
    p2pMyOrders: [],
    following: [],
    predictionPositions: [],
    predictionLeaderboard: [],
    hardhatAssets: [],
    hardhatAccounts: [],
    marketPrices: [],
    marketCurrency: "usd",
    portfolioHoldings: [],
    portfolioTotalValue: 0,
    portfolioSummary: "",
    chartRows: [],
    chartCoinId: "bitcoin",
    trendingCoins: [],
    globalStats: null,
    newsItems: [],
    dexTokens: [],
    dexPools: [],
    cryptoSearchResults: [],
    swapHistory: [],
    mtAccount: null,
    mtPositions: [],
    erc1155Transactions: [],
    apiKeys: [],
    orderBook: {
      bids: [],
      asks: [],
      spread: null,
      bestBid: null,
      bestAsk: null,
    },
    tradeHistory: [],
    watchlist: [],
    alerts: [],
    marketSort: {
      column: "price",
      direction: -1,
    },
    ticker: {
      btc: null,
      eth: null,
      sol: null,
      bnb: null,
    },
    gasTracker: {
      slow: null,
      standard: null,
      fast: null,
    },
  },
};

const wsOrigin = window.location.origin;
const apiBase = "";
const MARKET_SYMBOLS = {
  bitcoin: "BTC",
  ethereum: "ETH",
  tether: "USDT",
  binancecoin: "BNB",
  solana: "SOL",
};

function getHeaders(extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

  if (state.token) {
    headers.Authorization = "Bearer " + state.token;
  }

  return headers;
}

function setConnectionStatus(message, tone = "") {
  const status = document.getElementById("connectionStatus");
  if (status) {
    status.textContent = `API: ${message}`;
    status.className = `status-chip ${tone}`.trim();
  }
}

function setSessionStatus() {
  const session = document.getElementById("sessionStatus");
  if (!session) {
    return;
  }

  if (state.user) {
    session.textContent = `Session: ${state.user.email || state.user.username || `User ${state.user.id}`}`;
  } else if (state.token) {
    session.textContent = "Session: token cached";
  } else {
    session.textContent = "Session: signed out";
  }
}

function setWsStatus(message) {
  const status = document.getElementById("wsStatus");
  if (status) {
    status.textContent = `Realtime: ${message}`;
  }
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeGetCanvasContext(canvas) {
  if (!canvas || typeof canvas.getContext !== "function") {
    return null;
  }
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

async function apiCall(url, options = {}) {
  const { key, skipAuthRedirect = false, ...fetchOptions } = options;
  const requestOptions = {
    method: fetchOptions.method || "GET",
    headers: getHeaders(fetchOptions.headers),
    ...fetchOptions,
  };

  if (requestOptions.body && typeof requestOptions.body !== "string") {
    requestOptions.body = JSON.stringify(requestOptions.body);
  }

  setConnectionStatus(key ? `sending ${key}` : "sending request");

  const response = await fetch(`${apiBase}${url}`, requestOptions);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    setConnectionStatus(`error on ${key || url}`, "negative");
    if (response.status === 401 && !skipAuthRedirect) {
      logout();
    }
    throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
  }

  setConnectionStatus(key ? `ok ${key}` : "ready", "positive");
  return payload;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updateStoredToken(token) {
  state.token = token;
  localStorage.setItem("token", state.token);
}

function setUser(user) {
  state.user = user || null;
  setSessionStatus();
  renderAccountSnapshot();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("token");
  setSessionStatus();
  renderAccountSnapshot();
}

function switchSection(sectionId) {
  state.activeSection = sectionId;
  const dashboardTabs = document.querySelectorAll(".dashboard-tab");
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });
  document.querySelectorAll(".nav-link, .dashboard-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.sectionTarget === sectionId);
  });
  dashboardTabs.forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.sectionTarget === sectionId));
  });
}

function renderAccountSnapshot() {
  const root = document.getElementById("accountSnapshot");
  if (!root) {
    return;
  }

  if (!state.user) {
    root.innerHTML = `
      <article>
        <strong>Awaiting authentication</strong>
        <p class="meta">Sign in to unlock margin, P2P, Hardhat and assistant workflows.</p>
      </article>
    `;
    return;
  }

  root.innerHTML = `
    <article>
      <strong>${escapeHtml(state.user.username || state.user.email || `User ${state.user.id}`)}</strong>
      <p class="meta">One secure session powers every dashboard panel.</p>
    </article>
    <article>
      <strong>Token cached</strong>
      <p class="meta">Authenticated requests include your bearer token automatically.</p>
    </article>
  `;
}

function connectWebSocket() {
  if (!("WebSocket" in window)) {
    setWsStatus("unsupported");
    return;
  }

  const protocol = wsOrigin.startsWith("https") ? "wss" : "ws";
  const socketUrl = `${protocol}://${window.location.host}`;

  try {
    state.websocket = new WebSocket(socketUrl);
    setWsStatus("connecting");
    state.websocket.addEventListener("open", () => setWsStatus("connected"));
    state.websocket.addEventListener("close", () => setWsStatus("closed"));
    state.websocket.addEventListener("error", () => setWsStatus("error"));
    state.websocket.addEventListener("message", (event) => {
      const feed = document.getElementById("marketFeed");
      const parsed = safeJsonParse(event.data, { event: "update", message: event.data });
      if (feed) {
        const item = document.createElement("article");
        item.innerHTML = `
          <strong>${escapeHtml(parsed.event || "update")}</strong>
          <p class="meta">${escapeHtml(parsed.message || JSON.stringify(parsed))}</p>
        `;
        feed.prepend(item);
      }
    });
  } catch {
    setWsStatus("unavailable");
  }
}

async function login(credentials) {
  try {
    const result = await apiCall("/api/auth/login", {
      key: "auth-login",
      method: "POST",
      body: credentials,
      skipAuthRedirect: true,
    });
    const token = result.token;
    localStorage.setItem("token", token);
    updateStoredToken(token);
    setUser(result.user || { id: 1, email: credentials.email });
  } catch (err) {
    setConnectionStatus(`Login failed: ${err.message}`, "negative");
    return;
  }

  await refreshDashboard();
}

async function registerAccount(credentials) {
  try {
    const result = await apiCall("/api/auth/register", {
      key: "auth-register",
      method: "POST",
      body: credentials,
      skipAuthRedirect: true,
    });
    if (result.token) {
      localStorage.setItem("token", result.token);
      updateStoredToken(result.token);
    }
    setUser(result.user || { email: credentials.email, username: credentials.username });
    const registerSection = document.getElementById("registerSection");
    const toggleButton = document.querySelector('[data-action="toggle-register"]');
    if (registerSection) {
      registerSection.hidden = true;
    }
    if (toggleButton) {
      toggleButton.setAttribute("aria-expanded", "false");
    }
  } catch (err) {
    setConnectionStatus(`Registration failed: ${err.message}`, "negative");
    return;
  }

  await refreshDashboard();
}

async function hydrateSession() {
  setSessionStatus();
  renderAccountSnapshot();
  if (!state.token) {
    return;
  }

  localStorage.setItem("token", state.token);

  try {
    const me = await apiCall("/api/auth/me", {
      key: "auth-session",
      skipAuthRedirect: true,
    });
    setUser(me.user || me);
  } catch {
    setUser({ id: 1, email: "session@atlasx.dev", username: "Session Trader" });
  }

  await refreshDashboard();
}

async function refreshDashboard() {
  await Promise.all([
    loadP2POrders(),
    loadMyP2POrders(),
    loadFollowingTraders(),
    loadPredictionPositions(),
    loadPredictionLeaderboard(),
    loadHardhatAssets(),
    loadMarketPrices(),
    loadGlobalStats(),
    loadSwapHistory(),
    loadMTPositions(),
    loadERC1155Transactions(),
    loadAPIKeys(),
    loadTickerRates(),
  ]);
  renderMetrics();
}

function renderMetrics() {
  const portfolioValue = document.getElementById("portfolioValue");
  const marginCount = document.getElementById("marginCount");
  const p2pCount = document.getElementById("p2pCount");
  const followingCount = document.getElementById("followingCount");
  const volume24h = document.getElementById("volume24h");
  const activeNetworks = document.getElementById("activeNetworks");
  const totalVolume = state.dashboard.marketPrices.reduce(
    (sum, asset) => sum + (Number(asset.volume24h) || 0),
    0
  );

  if (portfolioValue) {
    const derivedPortfolioValue = state.dashboard.portfolioTotalValue || (state.dashboard.following.length * 12500 + 10000);
    portfolioValue.textContent = formatCompactCurrency(derivedPortfolioValue, 0);
  }
  if (marginCount) {
    marginCount.textContent = String(Math.max(1, state.dashboard.predictionPositions.length));
  }
  if (p2pCount) {
    p2pCount.textContent = String(state.dashboard.p2pOrders.length);
  }
  if (followingCount) {
    followingCount.textContent = String(state.dashboard.following.length);
  }
  if (volume24h) {
    volume24h.textContent = formatCompactCurrency(totalVolume || 0);
  }
  if (activeNetworks) {
    activeNetworks.textContent = String(4);
  }
}


function formatCompactCurrency(value, digits = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(amount) >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: digits,
  }).format(amount);
}

function formatPlainNumber(value, digits = 2) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "--";
  }
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function normalizeList(payload, keys = []) {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return Array.isArray(payload) ? payload : [];
}

function normalizeMarketPrices(prices, currency = "usd") {
  if (Array.isArray(prices)) {
    return prices;
  }

  return Object.entries(prices || {}).map(([assetId, quote]) => ({
    symbol: MARKET_SYMBOLS[assetId] || assetId.slice(0, 6).toUpperCase(),
    price: quote?.[currency] ?? quote?.usd ?? 0,
    change24h: quote?.[`${currency}_24h_change`] ?? quote?.usd_24h_change ?? 0,
    marketCap: quote?.[`${currency}_market_cap`] ?? quote?.usd_market_cap ?? 0,
    volume24h: quote?.[`${currency}_24h_vol`] ?? quote?.usd_24h_vol ?? 0,
  }));
}

function renderResultPanel(elementId, title, payload) {
  const panel = document.getElementById(elementId);
  if (!panel) {
    return;
  }

  const content = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  panel.innerHTML = `
    <article>
      <strong>${escapeHtml(title)}</strong>
      <p class="meta">${escapeHtml(content)}</p>
    </article>
  `;
}

function updateNotifCount() {
  const badge = document.getElementById("notifCount");
  if (badge) {
    badge.textContent = String(state.notifs.length);
  }
}

function getMockNotifications() {
  return [
    { title: "Yield opportunity", message: "DOT staking APY moved above 12%." },
    { title: "NFT mint ready", message: "Atlas Genesis mint window is now open." },
    { title: "Analytics update", message: "Win rate improved across major pairs today." },
  ];
}

function renderNotifications() {
  const list = document.getElementById("notifList");
  if (!list) {
    return;
  }

  if (!state.notifs.length) {
    list.innerHTML = '<div class="notif-item">All caught up.</div>';
    updateNotifCount();
    return;
  }

  list.innerHTML = state.notifs
    .map(
      (item) => `
        <div class="notif-item">
          <strong>${escapeHtml(item.title)}</strong>
          <div>${escapeHtml(item.message)}</div>
        </div>
      `
    )
    .join("");
  updateNotifCount();
}

function renderStakes() {
  const body = document.getElementById("stakesBody");
  if (!body) {
    return;
  }

  if (!state.stakes.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No active stakes yet.</td></tr>';
    return;
  }

  body.innerHTML = state.stakes
    .map(
      (stake) => `
        <tr>
          <td>${escapeHtml(stake.asset)}</td>
          <td>${escapeHtml(formatPlainNumber(stake.amount, 4))}</td>
          <td>${escapeHtml(formatPlainNumber(stake.apy, 2))}</td>
          <td>${escapeHtml(stake.duration)}</td>
          <td>${escapeHtml(formatPlainNumber(stake.rewards, 4))}</td>
          <td><button type="button" class="secondary" data-action="unstake" data-stake-id="${escapeHtml(stake.id)}">Unstake</button></td>
        </tr>
      `
    )
    .join("");
}

function truncateAddress(value, prefix = 6, suffix = 4) {
  const text = String(value || "").trim();
  if (text.length <= prefix + suffix) {
    return text || "--";
  }
  return `${text.slice(0, prefix)}...${text.slice(-suffix)}`;
}

function renderNfts() {
  const grid = document.getElementById("nftGrid");
  if (!grid) {
    return;
  }

  if (!state.nfts.length) {
    grid.innerHTML = '<div class="nft-card">Load a wallet to preview collectible inventory.</div>';
    return;
  }

  grid.innerHTML = state.nfts
    .map(
      (item) => `
        <div class="nft-card">
          <div class="nft-img-placeholder">🖼️</div>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="meta">Token ID: ${escapeHtml(item.tokenId)}</div>
          <div class="meta">${escapeHtml(truncateAddress(item.contractAddress))}</div>
        </div>
      `
    )
    .join("");
}

function refreshAnalytics() {
  const range = document.getElementById("analyticsRange")?.value || "7d";
  const multipliers = { "7d": 1, "30d": 2.6, "90d": 4.8, all: 7.2 };
  const multiplier = multipliers[range] || 1;
  const body = document.getElementById("analyticsBody");
  const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "DOT/USDT"].map((pair, index) => {
    const trades = Math.round((24 + index * 7 + Math.random() * 12) * multiplier);
    const winRate = 54 + index * 4 + Math.random() * 6;
    const avgPnl = 80 + index * 35 + Math.random() * 70;
    const volume = (42000 + index * 18000 + Math.random() * 12000) * multiplier;
    return { pair, trades, winRate, avgPnl, volume };
  });

  if (body) {
    body.innerHTML = pairs
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.pair)}</td>
            <td>${escapeHtml(String(item.trades))}</td>
            <td>${escapeHtml(`${formatPlainNumber(item.winRate, 1)}%`)}</td>
            <td>${escapeHtml(formatCompactCurrency(item.avgPnl, 0))}</td>
            <td>${escapeHtml(formatCompactCurrency(item.volume, 0))}</td>
          </tr>
        `
      )
      .join("");
  }

  const totalTrades = pairs.reduce((sum, item) => sum + item.trades, 0);
  const totalVolume = pairs.reduce((sum, item) => sum + item.volume, 0);
  const avgWinRate = pairs.reduce((sum, item) => sum + item.winRate, 0) / pairs.length;
  const totalPnl = pairs.reduce((sum, item) => sum + item.avgPnl * item.trades * 0.2, 0);
  const mappings = [
    ["analyticsVolume", formatCompactCurrency(totalVolume, 0)],
    ["analyticsTrades", String(totalTrades)],
    ["analyticsWinRate", `${formatPlainNumber(avgWinRate, 1)}%`],
    ["analyticsPnl", formatCompactCurrency(totalPnl, 0)],
  ];
  mappings.forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  });
}

function renderTickerRates() {
  const ticker = state.dashboard.ticker;
  const mappings = [
    ["ticker-btc", ticker.btc],
    ["ticker-eth", ticker.eth],
    ["ticker-sol", ticker.sol],
    ["ticker-bnb", ticker.bnb],
  ];

  mappings.forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value == null ? "--" : formatCompactCurrency(value, value > 1000 ? 0 : 2);
    }
  });
}

function renderMarketPrices() {
  const body = document.getElementById("pricesBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.marketPrices.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">Load market prices to view the latest moves.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.marketPrices
    .map(
      (asset) => {
        const derivedRange = getAssetHighLow(asset);
        return `
        <tr>
          <td>${escapeHtml(asset.symbol || asset.id || "N/A")}</td>
          <td>${escapeHtml(formatCompactCurrency(asset.price, asset.price > 1000 ? 0 : 2))}</td>
          <td class="${Number(asset.change24h) >= 0 ? "positive" : "negative"}">${escapeHtml(formatPlainNumber(asset.change24h, 2))}%</td>
          <td>${escapeHtml(formatCompactCurrency(asset.marketCap || 0, 0))}</td>
          <td>${escapeHtml(formatCompactCurrency(asset.volume24h || 0, 0))}</td>
          <td>${escapeHtml(`${formatCompactCurrency(derivedRange.high, derivedRange.high > 1000 ? 0 : 2)} / ${formatCompactCurrency(derivedRange.low, derivedRange.low > 1000 ? 0 : 2)}`)}</td>
        </tr>
      `;
      }
    )
    .join("");
}

function getAssetHighLow(asset) {
  const price = Number(asset.price) || 0;
  const change = Math.abs(Number(asset.change24h) || 0);
  const rangeFactor = Math.max(change / 100, 0.0125);
  const high = Number(asset.high24h ?? asset.high ?? price * (1 + rangeFactor));
  const low = Number(asset.low24h ?? asset.low ?? price * Math.max(0.1, 1 - rangeFactor));
  return { high, low };
}

function renderOrderBook() {
  const body = document.getElementById("orderbookBody");
  const summary = document.getElementById("orderbookSummary");
  if (!body || !summary) {
    return;
  }

  const bids = state.dashboard.orderBook.bids || [];
  const asks = state.dashboard.orderBook.asks || [];
  if (!bids.length && !asks.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">Refresh the order book to load simulated levels.</td></tr>';
    summary.innerHTML = '<article><strong>Spread waiting</strong><p class="meta">Best bid and ask appear after loading the book.</p></article>';
    return;
  }

  body.innerHTML = [...asks, ...bids]
    .map(
      (level) => `
        <tr>
          <td class="${level.side === "ask" ? "negative" : "positive"}">${escapeHtml(formatCompactCurrency(level.price, level.price > 1000 ? 0 : 2))}</td>
          <td>${escapeHtml(formatPlainNumber(level.amount, 4))}</td>
          <td>${escapeHtml(formatPlainNumber(level.total, 4))}</td>
        </tr>
      `
    )
    .join("");

  summary.innerHTML = `
    <article>
      <strong>${escapeHtml(`Spread ${formatCompactCurrency(state.dashboard.orderBook.spread || 0, 2)}`)}</strong>
      <p class="meta">${escapeHtml(`Best bid ${formatCompactCurrency(state.dashboard.orderBook.bestBid || 0, 2)} · Best ask ${formatCompactCurrency(state.dashboard.orderBook.bestAsk || 0, 2)}`)}</p>
    </article>
  `;
}

function renderTradeHistory() {
  const body = document.getElementById("tradeHistoryBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.tradeHistory.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Load the trade history to review recent executions.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.tradeHistory
    .map(
      (trade) => `
        <tr>
          <td>${escapeHtml(trade.time)}</td>
          <td>${escapeHtml(trade.pair)}</td>
          <td class="${trade.side === "Buy" ? "positive" : "negative"}">${escapeHtml(trade.side)}</td>
          <td>${escapeHtml(formatCompactCurrency(trade.price, trade.price > 1000 ? 0 : 2))}</td>
          <td>${escapeHtml(formatPlainNumber(trade.amount, 4))}</td>
        </tr>
      `
    )
    .join("");
}

function renderWatchlist() {
  const body = document.getElementById("watchlistBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.watchlist.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">Add a symbol to start a personal watchlist.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.watchlist
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.symbol)}</td>
          <td>${escapeHtml(formatCompactCurrency(entry.price, entry.price > 1000 ? 0 : 2))}</td>
          <td class="${Number(entry.change24h) >= 0 ? "positive" : "negative"}">${escapeHtml(formatPlainNumber(entry.change24h, 2))}%</td>
          <td><button type="button" class="secondary" data-action="remove-watchlist" data-symbol="${escapeHtml(entry.symbol)}">Remove</button></td>
        </tr>
      `
    )
    .join("");
}

function renderAlerts() {
  const body = document.getElementById("alertsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.alerts.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Create an alert to monitor price targets.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.alerts
    .map(
      (alert, index) => `
        <tr>
          <td>${escapeHtml(alert.symbol)}</td>
          <td>${escapeHtml(formatCompactCurrency(alert.targetPrice, alert.targetPrice > 1000 ? 0 : 2))}</td>
          <td>${escapeHtml(alert.direction)}</td>
          <td>${escapeHtml(alert.status)}</td>
          <td><button type="button" class="secondary" data-action="remove-alert" data-alert-index="${escapeHtml(index)}">Remove</button></td>
        </tr>
      `
    )
    .join("");
}

function renderQuickTradeStatus(title = "Quick Trade", message = "Enter an amount and choose a side to submit an instant simulated order.") {
  const panel = document.getElementById("quickTradeStatus");
  if (!panel) {
    return;
  }

  panel.innerHTML = `
    <article>
      <strong>${escapeHtml(title)}</strong>
      <p class="meta">${escapeHtml(message)}</p>
    </article>
  `;
}

function getMarketSnapshot(symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const market = state.dashboard.marketPrices.find(
    (asset) => String(asset.symbol || asset.id || "").trim().toUpperCase() === normalizedSymbol
  );

  if (market) {
    return {
      symbol: normalizedSymbol,
      price: Number(market.price) || 0,
      change24h: Number(market.change24h) || 0,
    };
  }

  const fallbackPrice = 100 + normalizedSymbol.length * 25;
  const fallbackChange = normalizedSymbol.length % 2 === 0 ? 1.5 : -1.1;
  return {
    symbol: normalizedSymbol,
    price: fallbackPrice,
    change24h: fallbackChange,
  };
}

function sortMarketPrices(column) {
  const sortMap = {
    price: "price",
    change: "change24h",
    mcap: "marketCap",
  };
  const sortKey = sortMap[column];
  if (!sortKey) {
    return;
  }

  if (state.dashboard.marketSort.column === column) {
    state.dashboard.marketSort.direction *= -1;
  } else {
    state.dashboard.marketSort.column = column;
    state.dashboard.marketSort.direction = column === "change" ? -1 : 1;
  }

  const direction = state.dashboard.marketSort.direction;
  state.dashboard.marketPrices = [...state.dashboard.marketPrices].sort((left, right) => {
    const leftValue = Number(left?.[sortKey]) || 0;
    const rightValue = Number(right?.[sortKey]) || 0;
    return (leftValue - rightValue) * direction;
  });
  renderMarketPrices();
}

function refreshOrderBook() {
  const basePrice =
    Number(state.dashboard.marketPrices[0]?.price) ||
    Number(state.dashboard.ticker.btc) ||
    65000;
  const bidLevels = [];
  const askLevels = [];
  let bidRunningTotal = 0;
  let askRunningTotal = 0;

  for (let index = 0; index < 5; index += 1) {
    const bidAmount = 0.15 + index * 0.07;
    const askAmount = 0.12 + index * 0.08;
    const bidPrice = basePrice - (index + 1) * 18.5;
    const askPrice = basePrice + (index + 1) * 18.5;
    bidRunningTotal += bidAmount;
    askRunningTotal += askAmount;
    bidLevels.push({ side: "bid", price: bidPrice, amount: bidAmount, total: bidRunningTotal });
    askLevels.push({ side: "ask", price: askPrice, amount: askAmount, total: askRunningTotal });
  }

  state.dashboard.orderBook = {
    bids: bidLevels,
    asks: [...askLevels].reverse(),
    spread: askLevels[0].price - bidLevels[0].price,
    bestBid: bidLevels[0].price,
    bestAsk: askLevels[0].price,
  };
  renderOrderBook();
}

function loadTradeHistory() {
  const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT"];
  state.dashboard.tradeHistory = Array.from({ length: 10 }, (_, index) => {
    const pair = pairs[index % pairs.length];
    const baseSymbol = pair.split("/")[0];
    const snapshot = getMarketSnapshot(baseSymbol);
    const side = index % 2 === 0 ? "Buy" : "Sell";
    const priceOffset = (index % 5) * 4.75;
    const price = snapshot.price + (side === "Buy" ? priceOffset : -priceOffset);
    return {
      time: new Date(Date.now() - index * 60000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      pair,
      side,
      price,
      amount: 0.05 + index * 0.015,
    };
  });
  renderTradeHistory();
}

function addToWatchlist() {
  const input = document.getElementById("watchlistAddInput");
  const symbol = String(input?.value || "").trim().toUpperCase();
  if (!symbol) {
    return;
  }

  if (!state.dashboard.watchlist.some((entry) => entry.symbol === symbol)) {
    state.dashboard.watchlist.push(getMarketSnapshot(symbol));
  }
  input.value = "";
  renderWatchlist();
}

function removeFromWatchlist(symbol) {
  state.dashboard.watchlist = state.dashboard.watchlist.filter((entry) => entry.symbol !== symbol);
  renderWatchlist();
}

function createAlert() {
  const symbol = String(document.getElementById("alertSymbol")?.value || "").trim().toUpperCase();
  const targetPrice = Number(document.getElementById("alertPrice")?.value || 0);
  const direction = String(document.getElementById("alertDirection")?.value || "above").trim().toLowerCase();
  if (!symbol || !Number.isFinite(targetPrice) || targetPrice <= 0) {
    return;
  }

  state.dashboard.alerts.unshift({
    symbol,
    targetPrice,
    direction: direction === "below" ? "below" : "above",
    status: "Watching",
  });

  const symbolInput = document.getElementById("alertSymbol");
  const priceInput = document.getElementById("alertPrice");
  const directionInput = document.getElementById("alertDirection");
  if (symbolInput) {
    symbolInput.value = "";
  }
  if (priceInput) {
    priceInput.value = "";
  }
  if (directionInput) {
    directionInput.value = "above";
  }
  renderAlerts();
}

function removeAlert(index) {
  const alertIndex = Number(index);
  if (!Number.isInteger(alertIndex) || alertIndex < 0) {
    return;
  }
  state.dashboard.alerts.splice(alertIndex, 1);
  renderAlerts();
}

function runQuickTrade(side) {
  const amount = Number(document.getElementById("quickTradeAmount")?.value || 0);
  const pair = String(document.getElementById("quickTradePair")?.value || "BTC").trim().toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) {
    renderQuickTradeStatus("Quick Trade", "Enter an amount greater than zero to place a simulated order.");
    return;
  }

  const snapshot = getMarketSnapshot(pair);
  renderQuickTradeStatus(
    side === "buy" ? "Quick Buy queued" : "Quick Sell queued",
    `${side === "buy" ? "Bought" : "Sold"} ${formatPlainNumber(amount, 4)} ${pair} near ${formatCompactCurrency(snapshot.price, snapshot.price > 1000 ? 0 : 2)}.`
  );
}

function renderPortfolio() {
  const body = document.getElementById("portfolioBody");
  const summary = document.getElementById("portfolioSummary");
  if (!body || !summary) {
    return;
  }

  if (!state.dashboard.portfolioHoldings.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">Load a wallet address to review on-chain balances.</td></tr>';
    summary.innerHTML = `
      <article>
        <strong>Portfolio idle</strong>
        <p class="meta">${escapeHtml(state.dashboard.portfolioSummary || "Enter an address and network to calculate holdings.")}</p>
      </article>
    `;
    renderPortfolioAnalytics();
    return;
  }

  body.innerHTML = state.dashboard.portfolioHoldings
    .map(
      (holding) => `
        <tr>
          <td>${escapeHtml(holding.symbol || "N/A")}</td>
          <td>${escapeHtml(formatPlainNumber(holding.amount || 0, 6))}</td>
          <td>${escapeHtml(formatCompactCurrency(holding.valueUsd || 0))}</td>
          <td>${escapeHtml(formatPlainNumber(holding.portfolioShare || 0, 2))}%</td>
        </tr>
      `
    )
    .join("");

  summary.innerHTML = `
    <article>
      <strong>Total value ${escapeHtml(formatCompactCurrency(state.dashboard.portfolioTotalValue || 0))}</strong>
      <p class="meta">${escapeHtml(state.dashboard.portfolioSummary || `${state.dashboard.portfolioHoldings.length} holdings loaded.`)}</p>
    </article>
  `;
  renderPortfolioAnalytics();
}

function getPortfolioAnalyticsRows() {
  const holdings = state.dashboard.portfolioHoldings || [];
  return holdings.map((holding, index) => {
    const snapshot = getMarketSnapshot(holding.symbol || `ASSET${index + 1}`);
    return {
      ...holding,
      returnPct: Number(snapshot.change24h) || ((index % 2 === 0 ? 1 : -1) * (index + 1.25)),
    };
  });
}

function renderPortfolioAnalytics() {
  const totalReturn = document.getElementById("portTotalReturn");
  const bestAsset = document.getElementById("portBestAsset");
  const worstAsset = document.getElementById("portWorstAsset");
  const chart = document.getElementById("portfolioChart");
  if (!totalReturn || !bestAsset || !worstAsset || !chart) {
    return;
  }

  const analytics = getPortfolioAnalyticsRows();
  if (!analytics.length) {
    totalReturn.textContent = "--";
    bestAsset.textContent = "--";
    worstAsset.textContent = "--";
    const context = safeGetCanvasContext(chart);
    if (context) {
      context.clearRect(0, 0, chart.width, chart.height);
      context.fillStyle = "#8aa2c8";
      context.font = "14px Inter, Arial, sans-serif";
      context.fillText("Chart rendering requires ChartJS", 16, 28);
    }
    return;
  }

  const weightedReturn = analytics.reduce(
    (sum, holding) => sum + (Number(holding.portfolioShare || 0) / 100) * Number(holding.returnPct || 0),
    0
  );
  const best = analytics.reduce((top, current) => (Number(current.returnPct) > Number(top.returnPct) ? current : top), analytics[0]);
  const worst = analytics.reduce((bottom, current) => (Number(current.returnPct) < Number(bottom.returnPct) ? current : bottom), analytics[0]);
  totalReturn.textContent = `${formatPlainNumber(weightedReturn, 2)}%`;
  bestAsset.textContent = `${best.symbol} (${formatPlainNumber(best.returnPct, 2)}%)`;
  worstAsset.textContent = `${worst.symbol} (${formatPlainNumber(worst.returnPct, 2)}%)`;

  const context = safeGetCanvasContext(chart);
  if (!context) {
    return;
  }
  const width = chart.width;
  const height = chart.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0f1b2d";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#39d0ff";
  context.lineWidth = 2;
  context.beginPath();
  analytics.forEach((holding, index) => {
    const x = analytics.length === 1 ? width / 2 : 20 + (index * (width - 40)) / (analytics.length - 1);
    const normalized = Math.max(-10, Math.min(10, Number(holding.returnPct) || 0));
    const y = height / 2 - normalized * 7;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function getMockNewsItems() {
  return [
    { category: "bitcoin", headline: "Bitcoin ETFs see renewed inflows after macro cooldown", source: "Atlas Wire", time: "5m ago", sentiment: "Bullish" },
    { category: "ethereum", headline: "Ethereum validators brace for higher staking participation", source: "Chain Desk", time: "14m ago", sentiment: "Neutral" },
    { category: "defi", headline: "DeFi lending volumes rebound as stablecoin liquidity expands", source: "Liquidity Post", time: "21m ago", sentiment: "Bullish" },
    { category: "nft", headline: "NFT floor prices soften as traders rotate into infrastructure plays", source: "Market Mosaic", time: "37m ago", sentiment: "Bearish" },
    { category: "bitcoin", headline: "Options desks hedge around Bitcoin resistance near recent highs", source: "Derivatives Daily", time: "52m ago", sentiment: "Neutral" },
  ];
}

function getSentimentBadgeClass(sentiment) {
  if (sentiment === "Bullish") {
    return "badge-bull";
  }
  if (sentiment === "Bearish") {
    return "badge-bear";
  }
  return "badge-neutral";
}

function renderNewsFeed(category = "all") {
  const feed = document.getElementById("newsFeed");
  if (!feed) {
    return;
  }

  const items = state.dashboard.newsItems || [];
  if (!items.length) {
    feed.innerHTML = '<article class="news-card"><strong>News standby</strong><p class="meta">Refresh News to load the latest market headlines.</p></article>';
    return;
  }

  const normalizedCategory = String(category || "all").toLowerCase();
  const filteredItems = normalizedCategory === "all"
    ? items
    : items.filter((item) => String(item.category || "").toLowerCase() === normalizedCategory);
  const categoryLabel = normalizedCategory === "all" ? "All categories" : normalizedCategory;

  feed.innerHTML = filteredItems
    .map(
      (item) => `
        <article class="news-card">
          <strong>${escapeHtml(item.headline)}</strong>
          <p class="meta">${escapeHtml(item.source)} · ${escapeHtml(item.time)} · Filter ${escapeHtml(categoryLabel)}</p>
          <span class="${escapeHtml(getSentimentBadgeClass(item.sentiment))}">${escapeHtml(item.sentiment)}</span>
        </article>
      `
    )
    .join("");
}

function renderGasTracker() {
  const mappings = [
    ["gasSlow", state.dashboard.gasTracker.slow],
    ["gasStandard", state.dashboard.gasTracker.standard],
    ["gasFast", state.dashboard.gasTracker.fast],
  ];
  mappings.forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value == null ? "--" : `${formatPlainNumber(value, 1)} gwei`;
    }
  });
}

function refreshGasTracker() {
  const createValue = (base) => Math.round((base + Math.random() * 3) * 10) / 10;
  state.dashboard.gasTracker = {
    slow: createValue(8),
    standard: createValue(12),
    fast: createValue(18),
  };
  renderGasTracker();
}

function calculateRisk() {
  const balance = Number(document.getElementById("riskBalance")?.value || 0);
  const riskPercent = Number(document.getElementById("riskPercent")?.value || 0);
  const entry = Number(document.getElementById("riskEntry")?.value || 0);
  const stop = Number(document.getElementById("riskStop")?.value || 0);
  const result = document.getElementById("riskResult");
  if (!result) {
    return;
  }

  const priceGap = Math.abs(entry - stop);
  if (!Number.isFinite(balance) || !Number.isFinite(riskPercent) || !Number.isFinite(entry) || !Number.isFinite(stop) || balance <= 0 || riskPercent <= 0 || priceGap <= 0) {
    result.innerHTML = '<article><strong>Risk calculator</strong><p class="meta">Enter valid balance, risk, entry and stop values to calculate position size.</p></article>';
    return;
  }

  const maxLoss = (balance * riskPercent) / 100;
  const positionSize = maxLoss / priceGap;
  const pipValue = positionSize * 0.0001;
  result.innerHTML = `
    <article>
      <strong>Risk summary</strong>
      <p class="meta">${escapeHtml(`Position size ${formatPlainNumber(positionSize, 6)} units · Max loss ${formatCompactCurrency(maxLoss, 2)} · Pip value ${formatPlainNumber(pipValue, 6)}`)}</p>
    </article>
  `;
}

function renderConvertResult(message = "Choose an amount and markets to calculate a conversion.") {
  const result = document.getElementById("convertResult");
  if (!result) {
    return;
  }
  result.innerHTML = `
    <article>
      <strong>Converter</strong>
      <p class="meta">${escapeHtml(message)}</p>
    </article>
  `;
}

function runConverter() {
  const amount = Number(document.getElementById("convertAmount")?.value || 0);
  const from = String(document.getElementById("convertFrom")?.value || "BTC").toUpperCase();
  const to = String(document.getElementById("convertTo")?.value || "USD").toUpperCase();
  const cryptoToUsd = { BTC: 65240, ETH: 3420, SOL: 162, BNB: 590, USDT: 1 };
  const usdToFiat = { USD: 1, EUR: 0.92, GBP: 0.78, JPY: 146, AUD: 1.52 };

  if (!Number.isFinite(amount) || amount <= 0 || !cryptoToUsd[from] || !usdToFiat[to]) {
    renderConvertResult("Enter a valid amount and choose supported currencies.");
    return;
  }

  const convertedValue = amount * cryptoToUsd[from] * usdToFiat[to];
  renderConvertResult(`${formatPlainNumber(amount, 4)} ${from} ≈ ${formatPlainNumber(convertedValue, 2)} ${to}`);
}

function exportPortfolioCsv() {
  const rows = (state.dashboard.portfolioHoldings.length ? state.dashboard.portfolioHoldings : [
    { symbol: "BTC", amount: 0.25, valueUsd: 16310, portfolioShare: 55.4 },
    { symbol: "ETH", amount: 3.2, valueUsd: 10944, portfolioShare: 37.2 },
    { symbol: "SOL", amount: 42, valueUsd: 6804, portfolioShare: 7.4 },
  ]).map((holding) => ({
    symbol: holding.symbol || "N/A",
    amount: Number(holding.amount || 0),
    valueUsd: Number(holding.valueUsd || 0),
    portfolioShare: Number(holding.portfolioShare || 0),
  }));
  const lines = [
    ["Symbol", "Amount", "Value USD", "Portfolio Share %"],
    ...rows.map((holding) => [
      holding.symbol,
      String(holding.amount),
      String(holding.valueUsd),
      String(holding.portfolioShare),
    ]),
  ];
  const csv = lines
    .map((line) => line.map((value) => `"${String(value).replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "portfolio-export.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function renderChartData() {
  const panel = document.getElementById("chartDataResult");
  if (!panel) {
    return;
  }

  if (!state.dashboard.chartRows.length) {
    panel.innerHTML = '<article><strong>Chart ready</strong><p class="meta">Load a coin ID to review OHLC candles.</p></article>';
    return;
  }

  panel.innerHTML = `
    <article>
      <strong>${escapeHtml(state.dashboard.chartCoinId || "chart")}</strong>
      <div style="overflow-x: auto; margin-top: 12px;">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Open</th>
              <th>High</th>
              <th>Low</th>
              <th>Close</th>
            </tr>
          </thead>
          <tbody>
            ${state.dashboard.chartRows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.timestamp)}</td>
                    <td>${escapeHtml(formatPlainNumber(row.open, 2))}</td>
                    <td>${escapeHtml(formatPlainNumber(row.high, 2))}</td>
                    <td>${escapeHtml(formatPlainNumber(row.low, 2))}</td>
                    <td>${escapeHtml(formatPlainNumber(row.close, 2))}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderTrendingCoins() {
  const body = document.getElementById("trendingCoinsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.trendingCoins.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">Load trending coins to inspect the current movers list.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.trendingCoins
    .map(
      (coin) => `
        <tr>
          <td>${escapeHtml(coin.name || coin.id || "Unknown")}</td>
          <td>${escapeHtml(String(coin.symbol || "--").toUpperCase())}</td>
          <td>${escapeHtml(coin.rank == null ? "--" : String(coin.rank))}</td>
        </tr>
      `
    )
    .join("");
}

function renderGlobalStats() {
  const globalMcap = document.getElementById("globalMcap");
  const globalVolume = document.getElementById("globalVolume");
  const globalBtcDom = document.getElementById("globalBtcDom");
  const resultPanel = document.getElementById("globalStatsResult");
  const globalStats = state.dashboard.globalStats || {};

  if (globalMcap) {
    globalMcap.textContent = formatCompactCurrency(globalStats.marketCap || 0, 0);
  }
  if (globalVolume) {
    globalVolume.textContent = formatCompactCurrency(globalStats.volume24h || 0, 0);
  }
  if (globalBtcDom) {
    globalBtcDom.textContent = `${formatPlainNumber(globalStats.btcDominance || 0, 2)}%`;
  }
  if (resultPanel) {
    resultPanel.innerHTML = `
      <article>
        <strong>Global market data</strong>
        <p class="meta">Market cap ${escapeHtml(formatCompactCurrency(globalStats.marketCap || 0, 0))} · Volume ${escapeHtml(formatCompactCurrency(globalStats.volume24h || 0, 0))} · BTC dominance ${escapeHtml(formatPlainNumber(globalStats.btcDominance || 0, 2))}%</p>
      </article>
    `;
  }
}

function renderDexTokens() {
  const body = document.getElementById("dexTokensBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.dexTokens.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">Load DEX tokens to review supported assets.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.dexTokens
    .map(
      (token) => `
        <tr>
          <td>${escapeHtml(token.symbol || "N/A")}</td>
          <td>${escapeHtml(token.name || "N/A")}</td>
          <td>${escapeHtml(token.address || token.contractAddress || token.assetAddress || "N/A")}</td>
          <td>${escapeHtml(token.chain || token.network || "AtlasX")}</td>
        </tr>
      `
    )
    .join("");
}

function renderDexPools() {
  const body = document.getElementById("dexPoolsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.dexPools.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">Load liquidity pools to review TVL and fee tiers.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.dexPools
    .map(
      (pool) => `
        <tr>
          <td>${escapeHtml(`${pool.pair || `${pool.tokenA || "?"}/${pool.tokenB || "?"}`}`)}</td>
          <td>${escapeHtml(formatCompactCurrency(pool.tvl ?? pool.totalLiquidity ?? 0))}</td>
          <td>${escapeHtml(pool.volume24h != null ? formatCompactCurrency(pool.volume24h) : "--")}</td>
          <td>${escapeHtml(pool.fee != null ? String(pool.fee) : formatPlainNumber((Number(pool.feeBps) || 0) / 100, 2) + "%")}</td>
        </tr>
      `
    )
    .join("");
}

function renderCryptoSearchResults(query = "") {
  const panel = document.getElementById("cryptoSearchResults");
  if (!panel) {
    return;
  }

  if (!query && !state.dashboard.cryptoSearchResults.length) {
    panel.innerHTML = '<article><p class="meta">Search for a coin ID, symbol or name to load discovery results.</p></article>';
    return;
  }

  if (!state.dashboard.cryptoSearchResults.length) {
    panel.innerHTML = `
      <article>
        <strong>No matches</strong>
        <p class="meta">No coins found for ${escapeHtml(query)}.</p>
      </article>
    `;
    return;
  }

  panel.innerHTML = state.dashboard.cryptoSearchResults
    .map(
      (coin) => `
        <article>
          <strong>${escapeHtml(coin.name || coin.id || "Unknown coin")}</strong>
          <p class="meta">${escapeHtml(String(coin.symbol || "--").toUpperCase())} · ID ${escapeHtml(coin.id || "n/a")} · Rank ${escapeHtml(coin.marketCapRank == null ? "--" : String(coin.marketCapRank))}</p>
        </article>
      `
    )
    .join("");
}

function renderSwapHistory() {
  const body = document.getElementById("swapHistoryBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.swapHistory.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Executed swaps will appear here.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.swapHistory
    .map(
      (swap) => `
        <tr>
          <td>${escapeHtml(`${swap.fromToken || swap.tokenIn || "?"}/${swap.toToken || swap.tokenOut || "?"}`)}</td>
          <td>${escapeHtml(formatPlainNumber(swap.amountIn ?? swap.amount ?? 0, 4))}</td>
          <td>${escapeHtml(formatPlainNumber(swap.amountOut ?? swap.outputAmount ?? 0, 4))}</td>
          <td>${escapeHtml(formatPlainNumber(swap.rate ?? 0, 4))}</td>
          <td>${escapeHtml(swap.status || "completed")}</td>
        </tr>
      `
    )
    .join("");
}

function renderMTAccount() {
  const panel = document.getElementById("mtAccountInfo");
  if (!panel) {
    return;
  }

  const account = state.dashboard.mtAccount;
  if (!account) {
    panel.innerHTML = '<article><strong>Connection idle</strong><p class="meta">Load the dashboard to request account information.</p></article>';
    return;
  }

  const data = account.data || account;
  panel.innerHTML = `
    <article>
      <strong>${escapeHtml(data.accountName || data.server || "MetaTrader account")}</strong>
      <p class="meta">Balance ${escapeHtml(formatCompactCurrency(data.balance ?? data.equity ?? 0))} · Equity ${escapeHtml(formatCompactCurrency(data.equity ?? data.balance ?? 0))}</p>
    </article>
  `;
}

function renderMTPositions() {
  const body = document.getElementById("mtPositionsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.mtPositions.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No open MetaTrader positions.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.mtPositions
    .map(
      (position) => `
        <tr>
          <td>${escapeHtml(position.positionId || position.ticket || "N/A")}</td>
          <td>${escapeHtml(position.symbol || "N/A")}</td>
          <td>${escapeHtml(position.type || position.side || "N/A")}</td>
          <td>${escapeHtml(formatPlainNumber(position.volume ?? position.lots ?? 0, 2))}</td>
          <td class="${Number(position.profit ?? position.pnl ?? 0) >= 0 ? "positive" : "negative"}">${escapeHtml(formatCompactCurrency(position.profit ?? position.pnl ?? 0))}</td>
        </tr>
      `
    )
    .join("");
}

function renderERC1155Transactions() {
  const body = document.getElementById("erc1155TxBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.erc1155Transactions.length) {
    body.innerHTML = '<tr><td colspan="6" class="empty">No ERC-1155 transactions recorded yet.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.erc1155Transactions
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.tx_hash || row.transactionHash || row.txHash || "pending")}</td>
          <td>${escapeHtml(row.transaction_type || row.type || "activity")}</td>
          <td>${escapeHtml(row.contract_name || row.contract_address || row.contractAddress || "contract")}</td>
          <td>${escapeHtml(row.token_id ?? row.tokenId ?? "-")}</td>
          <td>${escapeHtml(row.amount ?? "-")}</td>
          <td>${escapeHtml(row.status || "pending")}</td>
        </tr>
      `
    )
    .join("");
}

function renderAPIKeys() {
  const body = document.getElementById("apiKeysBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.apiKeys.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No API keys available for this account.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.apiKeys
    .map(
      (key) => `
        <tr>
          <td>${escapeHtml(key.name || "API Key")}</td>
          <td>${escapeHtml(key.keyId || key.id || "N/A")}</td>
          <td>${escapeHtml(Array.isArray(key.permissions) ? key.permissions.join(", ") : key.permissions || "default")}</td>
          <td>${escapeHtml(key.status || (key.revoked ? "revoked" : "active"))}</td>
          <td><button type="button" class="secondary" data-action="revoke-api-key" data-key-id="${escapeHtml(key.keyId || key.id || "")}">Revoke</button></td>
        </tr>
      `
    )
    .join("");
}

function renderP2POrders() {
  const body = document.getElementById("p2pOrdersBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.p2pOrders.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No active orders yet.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.p2pOrders
    .map(
      (order) => `
        <tr>
          <td>${escapeHtml(order.orderId)}</td>
          <td>${escapeHtml(order.crypto)}/${escapeHtml(order.fiat)}</td>
          <td>${escapeHtml(order.pricePerUnit)}</td>
          <td>${escapeHtml(order.minOrder)} - ${escapeHtml(order.maxOrder)}</td>
          <td><button type="button" class="secondary" data-action="accept-p2p-order" data-order-id="${escapeHtml(order.orderId)}">Accept</button></td>
        </tr>
      `
    )
    .join("");
}

function renderMyP2POrders() {
  const body = document.getElementById("p2pMyOrdersBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.p2pMyOrders.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No personal orders found.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.p2pMyOrders
    .map(
      (order) => `
        <tr>
          <td>${escapeHtml(order.orderId)}</td>
          <td>${escapeHtml(order.type)}</td>
          <td>${escapeHtml(order.amount)}</td>
          <td>${escapeHtml(order.status || "open")}</td>
          <td>${escapeHtml(order.createdAt || "recent")}</td>
        </tr>
      `
    )
    .join("");
}

function renderFollowingTraders() {
  const body = document.getElementById("followingTradersBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.following.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">Follow expert traders to mirror trades.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.following
    .map(
      (trader) => `
        <tr>
          <td>${escapeHtml(trader.displayName || `Trader ${trader.traderId}`)}</td>
          <td>${escapeHtml(trader.performance?.["30d"]?.return ?? 0)}%</td>
          <td>${escapeHtml(trader.stats?.winRate ?? 0)}%</td>
          <td>
            <button type="button" class="secondary" data-action="follow-trader" data-trader-id="${escapeHtml(trader.traderId)}">Follow</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderPredictionPositions() {
  const body = document.getElementById("predictionPositionsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.predictionPositions.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">No prediction positions yet.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.predictionPositions
    .map(
      (position) => `
        <tr>
          <td>${escapeHtml(position.marketName || position.marketId)}</td>
          <td>${escapeHtml(position.prediction)}</td>
          <td>${escapeHtml(position.amount)}</td>
          <td>${escapeHtml(position.status || "open")}</td>
        </tr>
      `
    )
    .join("");
}

function renderPredictionLeaderboard() {
  const body = document.getElementById("predictionLeaderboardBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.predictionLeaderboard.length) {
    body.innerHTML = '<tr><td colspan="4" class="empty">Leaderboard loads after authentication.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.predictionLeaderboard
    .map(
      (entry) => `
        <tr>
          <td>${escapeHtml(entry.displayName || entry.username || `Trader ${entry.userId || "N/A"}`)}</td>
          <td>${escapeHtml(entry.pnl ?? entry.totalPnl ?? 0)}</td>
          <td>${escapeHtml(entry.hitRate ?? entry.winRate ?? 0)}%</td>
          <td><button type="button" class="secondary" data-action="place-prediction" data-market-id="${escapeHtml(entry.marketId || "macro-btc-weekly")}">Place signal</button></td>
        </tr>
      `
    )
    .join("");
}

function normalizeHardhatContracts(payload) {
  const rawContracts = [];

  if (Array.isArray(payload?.contracts)) {
    rawContracts.push(...payload.contracts);
  } else if (payload?.contracts && typeof payload.contracts === "object") {
    rawContracts.push(
      ...Object.entries(payload.contracts).map(([contractName, value]) =>
        typeof value === "string" ? { contractName, address: value } : { contractName, ...value }
      )
    );
  } else if (payload?.deployment?.address) {
    rawContracts.push(payload.deployment);
  } else if (Array.isArray(payload?.assets)) {
    rawContracts.push(
      ...payload.assets.map((asset) => ({
        contractName: asset.name || asset.symbol || "Registry Asset",
        address: asset.assetAddress || asset.metadataUri || asset.registrar || "N/A",
        network: asset.chainId || payload?.deployment?.chainId || "31337",
        status: "registered",
        actionLabel: asset.symbol || "Ready",
      }))
    );
  } else if (Array.isArray(payload)) {
    rawContracts.push(...payload);
  }

  return rawContracts
    .filter(Boolean)
    .map((contract, index) => ({
      contract: contract.contract || contract.contractName || contract.name || `Contract ${index + 1}`,
      address: contract.address || contract.assetAddress || contract.value || "N/A",
      network: contract.network || contract.chainId || payload?.network || payload?.deployment?.chainId || "31337",
      status: contract.status || (contract.address ? "deployed" : "pending"),
      action: contract.action || contract.actionLabel || "Ready",
    }));
}

function renderHardhatAssets() {
  const body = document.getElementById("hardhatAssetsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.hardhatAssets.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Deploy AtlasX contracts to load local DEX addresses.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.hardhatAssets
    .map(
      (asset) => `
        <tr>
          <td>${escapeHtml(asset.contract)}</td>
          <td>${escapeHtml(asset.address)}</td>
          <td>${escapeHtml(asset.network)}</td>
          <td>${escapeHtml(asset.status)}</td>
          <td>${escapeHtml(asset.action)}</td>
        </tr>
      `
    )
    .join("");
}

function renderHardhatAccounts() {
  const body = document.getElementById("hardhatAccountsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.hardhatAccounts.length) {
    body.innerHTML = '<tr><td colspan="3" class="empty">Load the local Hardhat accounts to inspect funded test wallets.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.hardhatAccounts
    .map(
      (account, index) => `
        <tr>
          <td>${escapeHtml(index + 1)}</td>
          <td>${escapeHtml(account.address || account.account || "N/A")}</td>
          <td>${escapeHtml(account.balance ?? account.eth ?? account.formattedBalance ?? "0")}</td>
        </tr>
      `
    )
    .join("");
}

function appendAssistantMessage(role, message) {
  state.assistantMessages.push({ role, message });
  const panel = document.getElementById("assistantMessages");
  if (!panel) {
    return;
  }

  panel.innerHTML = state.assistantMessages
    .map(
      (item) => `
        <article>
          <strong>${item.role === "user" ? "You" : "AtlasX"}</strong>
          <p class="meta">${escapeHtml(item.message)}</p>
        </article>
      `
    )
    .join("");
}

async function loadP2POrders() {
  try {
    const result = await apiCall("/api/p2p/orders", { key: "p2p-orders" });
    state.dashboard.p2pOrders = result.orders || result.data || result;
  } catch {
    state.dashboard.p2pOrders = [
      {
        orderId: "ORDER_BTC_001",
        crypto: "BTC",
        fiat: "USD",
        pricePerUnit: 65000,
        minOrder: 0.01,
        maxOrder: 0.25,
      },
    ];
  }

  renderP2POrders();
}

async function loadMyP2POrders() {
  try {
    const result = await apiCall("/api/p2p/orders/my", { key: "p2p-my-orders" });
    state.dashboard.p2pMyOrders = result.orders || result.data || result;
  } catch {
    state.dashboard.p2pMyOrders = [
      { orderId: "MY_ORDER_1", type: "sell", amount: 0.2, status: "open", createdAt: "now" },
    ];
  }

  renderMyP2POrders();
}

async function loadFollowingTraders() {
  try {
    const tradersResponse = await apiCall("/api/copy-trading/traders/top", {
      key: "copy-trading-traders",
    });
    const statsResponse = await apiCall("/api/copy-trading/stats", {
      key: "copy-trading-stats",
    });
    const baseTraders = tradersResponse.traders || tradersResponse.data || tradersResponse;
    const stats = statsResponse.stats || statsResponse;
    state.dashboard.following = (Array.isArray(baseTraders) ? baseTraders : []).map((trader) => ({
      ...trader,
      stats: trader.stats || stats,
      performance: trader.performance || { "30d": { return: stats.return30d || 0 } },
    }));
  } catch {
    state.dashboard.following = [
      {
        traderId: 1,
        displayName: "Atlas Trader",
        stats: { winRate: 64 },
        performance: { "30d": { return: 18.4 } },
      },
    ];
  }

  renderFollowingTraders();
}

async function loadPredictionPositions() {
  try {
    const result = await apiCall("/api/prediction/positions", {
      key: "prediction-positions",
    });
    state.dashboard.predictionPositions = result.positions || result.data || result;
  } catch {
    state.dashboard.predictionPositions = [
      { marketId: "btc-weekly", marketName: "BTC Weekly Close", prediction: "above", amount: 150, status: "open" },
    ];
  }

  renderPredictionPositions();
}

async function loadPredictionLeaderboard() {
  try {
    const result = await apiCall("/api/prediction/leaderboard", {
      key: "prediction-leaderboard",
    });
    state.dashboard.predictionLeaderboard = result.leaderboard || result.data || result;
  } catch {
    state.dashboard.predictionLeaderboard = [
      { userId: 7, displayName: "Macro Atlas", pnl: 2840, hitRate: 71, marketId: "btc-weekly" },
    ];
  }

  renderPredictionLeaderboard();
}

async function loadHardhatAssets() {
  try {
    const result = await apiCall("/api/hardhat/contracts", {
      key: "hardhat-contracts",
    });
    state.dashboard.hardhatAssets = normalizeHardhatContracts(result);
  } catch {
    state.dashboard.hardhatAssets = [];
  }

  renderHardhatAssets();
}

async function loadHardhatAccounts() {
  try {
    const result = await apiCall("/api/hardhat/accounts", {
      key: "hardhat-accounts",
    });
    state.dashboard.hardhatAccounts = result.accounts || result.data || result || [];
  } catch {
    state.dashboard.hardhatAccounts = [];
  }

  renderHardhatAccounts();
}


async function loadMarketPrices() {
  try {
    const result = await apiCall("/api/crypto/prices", {
      key: "market-prices",
    });
    state.dashboard.marketCurrency = result.currency || "usd";
    state.dashboard.marketPrices = normalizeMarketPrices(result.prices || result.data || result, state.dashboard.marketCurrency);
  } catch {
    state.dashboard.marketCurrency = "usd";
    state.dashboard.marketPrices = [
      { symbol: "BTC", price: 65240, change24h: 2.1, marketCap: 1280000000000, volume24h: 32000000000 },
      { symbol: "ETH", price: 3420, change24h: 1.4, marketCap: 410000000000, volume24h: 18000000000 },
      { symbol: "SOL", price: 162, change24h: -0.8, marketCap: 72000000000, volume24h: 4200000000 },
      { symbol: "BNB", price: 590, change24h: 0.5, marketCap: 86000000000, volume24h: 1600000000 },
    ];
  }

  renderMarketPrices();
  state.dashboard.watchlist = state.dashboard.watchlist.map((entry) => getMarketSnapshot(entry.symbol));
  renderWatchlist();
  refreshOrderBook();
}

async function loadPortfolio() {
  const addressInput = document.getElementById("portfolioAddressInput");
  const networkSelect = document.getElementById("portfolioNetworkSelect");
  const selectedNetwork = String(networkSelect?.value || "ethereum");
  const addresses = String(addressInput?.value || "")
    .split(/[,\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!addresses.length) {
    state.dashboard.portfolioHoldings = [];
    state.dashboard.portfolioTotalValue = 0;
    state.dashboard.portfolioSummary = "Add at least one address to load holdings.";
    renderPortfolio();
    return;
  }

  try {
    const result = await apiCall("/api/portfolio/load", {
      key: "portfolio-load",
      method: "POST",
      body: {
        addresses,
        network: selectedNetwork,
      },
    });

    const portfolio = result.portfolio || {};
    const networkBuckets = ["ethereum", "bsc", "solana", "tron"];
    const allHoldings = networkBuckets.flatMap((network) =>
      normalizeList(portfolio[network] || [], []).map((item) => ({
        network,
        symbol: item.symbol || network.toUpperCase(),
        amount: Number(item.balance ?? item.amount ?? 0),
        valueUsd: Number(item.value ?? item.valueUsd ?? 0),
      }))
    );
    const holdings = allHoldings.filter((item) => item.network === selectedNetwork);
    const totalValue = holdings.reduce((sum, item) => sum + (Number(item.valueUsd) || 0), 0);

    state.dashboard.portfolioHoldings = holdings.map((item) => ({
      ...item,
      portfolioShare: totalValue ? (Number(item.valueUsd) / totalValue) * 100 : 0,
    }));
    state.dashboard.portfolioTotalValue = totalValue;
    state.dashboard.portfolioSummary = `${selectedNetwork.toUpperCase()} · ${addresses.length} address${addresses.length === 1 ? "" : "es"} scanned.`;
  } catch (error) {
    state.dashboard.portfolioHoldings = [];
    state.dashboard.portfolioTotalValue = 0;
    state.dashboard.portfolioSummary = `Portfolio load failed: ${error.message}`;
  }

  renderPortfolio();
}

async function loadChartData(coinId) {
  const normalizedCoinId = String(coinId || "").trim() || "bitcoin";

  try {
    const result = await apiCall(`/api/crypto/ohlc/${encodeURIComponent(normalizedCoinId)}`, {
      key: "crypto-ohlc",
    });
    const rows = Array.isArray(result.data) ? result.data : [];
    state.dashboard.chartCoinId = normalizedCoinId;
    state.dashboard.chartRows = rows.map((row, index) => ({
      timestamp: new Date(Number(Array.isArray(row) ? row[0] : row.timestamp || Date.now()) || Date.now() + index).toLocaleString(),
      open: Number(Array.isArray(row) ? row[1] : row.open ?? 0),
      high: Number(Array.isArray(row) ? row[2] : row.high ?? 0),
      low: Number(Array.isArray(row) ? row[3] : row.low ?? 0),
      close: Number(Array.isArray(row) ? row[4] : row.close ?? 0),
    }));
  } catch {
    state.dashboard.chartCoinId = normalizedCoinId;
    state.dashboard.chartRows = [
      { timestamp: new Date().toLocaleString(), open: 65200, high: 65540, low: 64880, close: 65310 },
      { timestamp: new Date(Date.now() - 3600000).toLocaleString(), open: 64800, high: 65290, low: 64640, close: 65200 },
    ];
  }

  renderChartData();
}

async function loadTrendingCoins() {
  try {
    const result = await apiCall("/api/crypto/trending", {
      key: "crypto-trending",
    });
    state.dashboard.trendingCoins = normalizeList(result.trending || result, []).map((item) => {
      const coin = item.item || item;
      return {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        rank: coin.market_cap_rank ?? coin.rank ?? coin.score,
      };
    });
  } catch {
    state.dashboard.trendingCoins = [
      { id: "bitcoin", name: "Bitcoin", symbol: "btc", rank: 1 },
      { id: "ethereum", name: "Ethereum", symbol: "eth", rank: 2 },
    ];
  }

  renderTrendingCoins();
}

async function loadGlobalStats() {
  try {
    const result = await apiCall("/api/crypto/global", {
      key: "crypto-global",
    });
    const global = result.global || result.data || result;
    state.dashboard.globalStats = {
      marketCap:
        Number(global?.data?.total_market_cap?.usd ?? global?.total_market_cap?.usd ?? global?.total_market_cap_usd ?? global?.marketCap ?? 0),
      volume24h:
        Number(global?.data?.total_volume?.usd ?? global?.total_volume?.usd ?? global?.total_volume_usd ?? global?.volume24h ?? 0),
      btcDominance:
        Number(global?.data?.market_cap_percentage?.btc ?? global?.market_cap_percentage?.btc ?? global?.btc_dominance ?? global?.btcDominance ?? 0),
    };
  } catch {
    state.dashboard.globalStats = {
      marketCap: 2480000000000,
      volume24h: 128000000000,
      btcDominance: 52.4,
    };
  }

  renderGlobalStats();
}

async function loadDexTokens() {
  try {
    const result = await apiCall("/api/dex/tokens", {
      key: "dex-tokens",
    });
    state.dashboard.dexTokens = normalizeList(result, ["tokens"]);
  } catch {
    state.dashboard.dexTokens = [
      { symbol: "ATX", name: "AtlasX Token", address: "N/A", chain: "AtlasX" },
    ];
  }

  renderDexTokens();
}

async function loadDexPools() {
  try {
    const result = await apiCall("/api/dex/pools", {
      key: "dex-pools",
    });
    state.dashboard.dexPools = normalizeList(result, ["pools"]).map((pool) => ({
      ...pool,
      tvl: Number(pool.tvl ?? pool.totalLiquidity ?? 0),
      volume24h: pool.volume24h ?? pool.volume ?? null,
    }));
  } catch {
    state.dashboard.dexPools = [
      { pair: "BTC/USDT", tvl: 1825000, volume24h: 245000, fee: "0.30%" },
    ];
  }

  renderDexPools();
}

async function searchCrypto(query) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) {
    state.dashboard.cryptoSearchResults = [];
    renderCryptoSearchResults();
    return;
  }

  try {
    const result = await apiCall(`/api/crypto/search?q=${encodeURIComponent(trimmedQuery)}`, {
      key: "crypto-search",
    });
    state.dashboard.cryptoSearchResults = normalizeList(result, ["results"]).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      marketCapRank: coin.market_cap_rank ?? coin.rank ?? null,
    }));
  } catch {
    state.dashboard.cryptoSearchResults = [
      { id: trimmedQuery.toLowerCase(), name: trimmedQuery, symbol: trimmedQuery.slice(0, 4), marketCapRank: "--" },
    ];
  }

  renderCryptoSearchResults(trimmedQuery);
}

async function loadSwapHistory() {
  try {
    const result = await apiCall("/api/swap/history", {
      key: "swap-history",
    });
    state.dashboard.swapHistory = normalizeList(result, ["swaps"]);
  } catch {
    state.dashboard.swapHistory = [
      { fromToken: "BTC", toToken: "USDT", amountIn: 0.01, amountOut: 650, rate: 65000, status: "completed" },
    ];
  }

  renderSwapHistory();
}

async function loadMTPositions() {
  try {
    const [positionsResult, accountResult] = await Promise.all([
      apiCall("/api/metatrader/positions", { key: "metatrader-positions" }),
      apiCall("/api/metatrader/account", { key: "metatrader-account" }),
    ]);
    state.dashboard.mtPositions = normalizeList(positionsResult, ["positions"]);
    state.dashboard.mtAccount = accountResult;
  } catch {
    state.dashboard.mtPositions = [
      { positionId: "MT-101", symbol: "EURUSD", type: "BUY", volume: 0.1, profit: 42.5 },
    ];
    state.dashboard.mtAccount = {
      data: { accountName: "Demo MT Account", balance: 25000, equity: 25042.5 },
    };
  }

  renderMTAccount();
  renderMTPositions();
}

async function loadERC1155Transactions() {
  try {
    const result = await apiCall("/api/erc1155/transactions", {
      key: "erc1155-transactions",
    });
    state.dashboard.erc1155Transactions = normalizeList(result, ["transactions"]);
  } catch {
    state.dashboard.erc1155Transactions = [];
  }

  renderERC1155Transactions();
}

async function loadAPIKeys() {
  try {
    const result = await apiCall("/api/keys", {
      key: "api-keys",
    });
    state.dashboard.apiKeys = normalizeList(result, ["keys"]);
  } catch {
    state.dashboard.apiKeys = [];
  }

  renderAPIKeys();
}

async function loadTickerRates() {
  try {
    const result = await apiCall("/api/rates", {
      key: "rates-ticker",
    });
    const usd = result.usd || {};
    state.dashboard.ticker = {
      btc: usd.BTC ?? usd.btc ?? null,
      eth: usd.ETH ?? usd.eth ?? null,
      sol: usd.SOL ?? usd.sol ?? null,
      bnb: usd.BNB ?? usd.bnb ?? null,
    };
  } catch {
    state.dashboard.ticker = {
      btc: 65240,
      eth: 3420,
      sol: 162,
      bnb: 590,
    };
  }

  renderTickerRates();
}

async function closeMarginPosition(positionId, price) {
  return apiCall(`/api/margin/position/${encodeURIComponent(positionId)}/close`, {
    key: "margin-close",
    method: "POST",
    body: { price: Number(price) },
  });
}

async function acceptP2POrder(orderId) {
  return apiCall(`/api/p2p/order/${encodeURIComponent(orderId)}/accept`, {
    key: "p2p-accept",
    method: "POST",
    body: {
      amount: 0.1,
      paymentMethod: "Bank Transfer",
    },
  });
}

async function resetDemoAccount() {
  return apiCall("/api/demo/account/reset", {
    key: "demo-reset",
    method: "POST",
  });
}

async function registerCopyTrader(payload) {
  return apiCall("/api/copy-trading/trader/register", {
    key: "copy-trading-register",
    method: "POST",
    body: payload,
  });
}

async function followTrader(traderId) {
  return apiCall(`/api/copy-trading/follow/${encodeURIComponent(traderId)}`, {
    key: "copy-trading-follow",
    method: "POST",
  });
}

async function verifyEmail() {
  return apiCall("/api/email/verify", {
    key: "email-verify",
    method: "POST",
  });
}

async function sendEmailTest() {
  return apiCall("/api/email/test", {
    key: "email-test",
    method: "POST",
    body: {
      to: state.user?.email || "trader@atlasx.dev",
      subject: "AtlasX SMTP test",
      text: "Integration check from AtlasX dashboard.",
    },
  });
}

async function lookupTransaction(network, txHash) {
  return apiCall(`/api/${network}/transaction/${encodeURIComponent(txHash)}`, {
    key: "transaction-lookup",
  });
}

async function getHardhatStatus() {
  return apiCall("/api/hardhat/status", {
    key: "hardhat-status",
  });
}

async function compileHardhat() {
  return apiCall("/api/hardhat/compile", {
    key: "hardhat-compile",
    method: "POST",
  });
}

async function deployHardhat() {
  return apiCall("/api/hardhat/deploy", {
    key: "hardhat-deploy",
    method: "POST",
  });
}

async function mintHardhatAtx(payload) {
  return apiCall("/api/hardhat/mint", {
    key: "hardhat-mint",
    method: "POST",
    body: payload,
  });
}

async function createHardhatPair(payload) {
  return apiCall("/api/hardhat/pair", {
    key: "hardhat-pair",
    method: "POST",
    body: payload,
  });
}

async function addHardhatLiquidity(payload) {
  return apiCall("/api/hardhat/liquidity", {
    key: "hardhat-liquidity",
    method: "POST",
    body: payload,
  });
}

async function loadHardhatContracts() {
  return apiCall("/api/hardhat/contracts", {
    key: "hardhat-contracts",
  });
}

async function loadHardhatAccountsRequest() {
  return apiCall("/api/hardhat/accounts", {
    key: "hardhat-accounts",
  });
}

async function registerHardhatAsset(payload) {
  return apiCall("/api/hardhat/assets", {
    key: "hardhat-register-asset",
    method: "POST",
    body: payload,
  });
}

async function loadAssistantStatus() {
  return apiCall("/api/assistant/status", {
    key: "assistant-status",
    skipAuthRedirect: true,
  });
}

async function chatWithAssistant(message) {
  return apiCall("/api/assistant/chat", {
    key: "assistant-chat",
    method: "POST",
    body: {
      messages: [...state.assistantMessages.map((item) => ({ role: item.role, content: item.message })), { role: "user", content: message }],
    },
  });
}

async function processTerminalPayment(formData) {
  if (!state.user) {
    state.user = { id: 1, email: "trader@atlasx.dev", username: "Demo Trader" };
  }

  const result = await apiCall("/api/payment-terminal/process", {
    key: "payment-terminal-process",
    method: "POST",
    body: {
      ...formData,
      amount: Number(formData.amount),
      terminalId: `TERMINAL_${state.user.id}`,
    },
  });

  const panel = document.getElementById("terminalResult");
  if (panel) {
    panel.innerHTML = `
      <article>
        <strong>Payment processed</strong>
        <p class="meta">Transaction ${escapeHtml(result.data?.transactionId || "created")} completed for ${escapeHtml(formData.amount)} ${escapeHtml(formData.currency)}.</p>
      </article>
    `;
  }

  return result;
}

async function loadPaymentTerminalTransactions() {
  const result = await apiCall("/api/payment-terminal/transactions", {
    key: "payment-terminal-transactions",
  });
  const panel = document.getElementById("terminalResult");
  if (panel) {
    const rows = result.transactions || result.data || [];
    panel.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
              <article>
                <strong>${escapeHtml(row.transactionId)}</strong>
                <p class="meta">${escapeHtml(row.amount)} ${escapeHtml(row.currency)} · ${escapeHtml(row.status)}</p>
              </article>
            `
          )
          .join("")
      : '<article><strong>No terminal transactions</strong><p class="meta">Process a payment to see recent activity.</p></article>';
  }
  return result;
}


function updateHardhatLog(panelId, payload, title) {
  const panel = document.getElementById(panelId);
  if (!panel) {
    return;
  }

  const output = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  panel.innerHTML = `
    <article>
      <strong>${escapeHtml(title)}</strong>
      <p class="meta">${escapeHtml(output)}</p>
    </article>
  `;
}

function updateHardhatStatusPanel(payload, title) {
  updateHardhatLog("hardhatDeployLog", payload, title);
}


function sanitizeNumericPayload(payload, keys) {
  const nextPayload = { ...payload };
  keys.forEach((key) => {
    if (nextPayload[key] === "" || nextPayload[key] == null) {
      delete nextPayload[key];
      return;
    }
    nextPayload[key] = Number(nextPayload[key]);
  });
  return nextPayload;
}

function toggleRegisterSection() {
  const registerSection = document.getElementById("registerSection");
  const toggleButton = document.querySelector('[data-action="toggle-register"]');
  if (!registerSection) {
    return;
  }

  registerSection.hidden = !registerSection.hidden;
  if (toggleButton) {
    toggleButton.setAttribute("aria-expanded", String(!registerSection.hidden));
  }
}

function bindFormHandlers() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const marginCloseForm = document.getElementById("marginCloseForm");
  const createP2POrderForm = document.getElementById("createP2POrderForm");
  const copyTraderRegisterForm = document.getElementById("copyTraderRegisterForm");
  const hardhatAssetForm = document.getElementById("hardhatAssetForm");
  const assistantForm = document.getElementById("assistantForm");
  const transactionLookupForm = document.getElementById("transactionLookupForm");
  const paymentTerminalForm = document.getElementById("paymentTerminalForm");

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    await login({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(registerForm).entries());
    await registerAccount(payload);
    registerForm.reset();
  });

  marginCloseForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(marginCloseForm);
    await closeMarginPosition(formData.get("positionId"), formData.get("price"));
    await refreshDashboard();
  });

  createP2POrderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(createP2POrderForm);
    const payload = Object.fromEntries(formData.entries());
    payload.amount = Number(payload.amount);
    payload.pricePerUnit = Number(payload.pricePerUnit);
    payload.minOrder = Number(payload.minOrder);
    payload.maxOrder = Number(payload.maxOrder);
    payload.paymentMethods = String(payload.paymentMethods)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    await apiCall("/api/p2p/order/create", {
      key: "p2p-create-order",
      method: "POST",
      body: payload,
    });
    await refreshDashboard();
  });

  copyTraderRegisterForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(copyTraderRegisterForm).entries());
    await registerCopyTrader(payload);
    await refreshDashboard();
  });

  hardhatAssetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(hardhatAssetForm).entries());
    if (payload.chainId) {
      payload.chainId = Number(payload.chainId);
    }
    const result = await registerHardhatAsset(payload);
    updateHardhatStatusPanel(result, "Asset registered");
    await refreshDashboard();
  });

  assistantForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(assistantForm);
    const message = String(formData.get("message") || "").trim();
    if (!message) {
      return;
    }
    appendAssistantMessage("user", message);
    const result = await chatWithAssistant(message).catch(() => ({ message: "Local fallback: review leverage, collateral and order exposure before increasing risk." }));
    appendAssistantMessage("assistant", result.message || "Assistant unavailable.");
    assistantForm.reset();
  });

  transactionLookupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(transactionLookupForm);
    const network = String(formData.get("network") || "ethereum");
    const txHash = String(formData.get("txHash") || "").trim();
    if (!txHash) {
      return;
    }
    const result = await lookupTransaction(network, txHash).catch((error) => ({ error: error.message }));
    const root = document.getElementById("transactionResult");
    if (root) {
      root.innerHTML = `
        <article>
          <strong>${escapeHtml(network.toUpperCase())} transaction</strong>
          <p class="meta">${escapeHtml(JSON.stringify(result, null, 2))}</p>
        </article>
      `;
    }
  });

  paymentTerminalForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(paymentTerminalForm).entries());
    await processTerminalPayment(payload);
  });
}

function bindGlobalHandlers() {
  document.addEventListener("click", async (event) => {
    const target = event.target.closest("button, [data-action], [data-section-target]");
    if (!target) {
      return;
    }

    if (target.dataset.sectionTarget) {
      switchSection(target.dataset.sectionTarget);
      return;
    }

    if (target.dataset.sortCol) {
      sortMarketPrices(target.dataset.sortCol);
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === "refresh-dashboard") {
      await refreshDashboard();
      return;
    }

    if (action === "load-market-prices") {
      await loadMarketPrices();
      renderMetrics();
      return;
    }

    if (action === "search-crypto") {
      const query = document.getElementById("cryptoSearchInput")?.value || "";
      await searchCrypto(query);
      return;
    }

    if (action === "load-portfolio") {
      await loadPortfolio();
      return;
    }

    if (action === "load-chart") {
      const coinId = document.getElementById("chartCoinInput")?.value || "bitcoin";
      await loadChartData(coinId);
      return;
    }

    if (action === "load-trending") {
      await loadTrendingCoins();
      return;
    }

    if (action === "load-global-stats") {
      await loadGlobalStats();
      return;
    }

    if (action === "load-dex-tokens") {
      await loadDexTokens();
      return;
    }

    if (action === "load-dex-pools") {
      await loadDexPools();
      return;
    }

    if (action === "toggle-register") {
      toggleRegisterSection();
      return;
    }

    if (action === "logout") {
      logout();
      return;
    }

    if (action === "reset-demo") {
      const result = await resetDemoAccount().catch((error) => ({ error: error.message }));
      const panel = document.getElementById("demoResult");
      if (panel) {
        panel.innerHTML = `<article><strong>Demo account</strong><p class="meta">${escapeHtml(JSON.stringify(result))}</p></article>`;
      }
      await refreshDashboard();
      return;
    }

    if (action === "refresh-demo") {
      await refreshDashboard();
      return;
    }

    if (action === "refresh-news") {
      state.dashboard.newsItems = getMockNewsItems();
      const category = document.getElementById("newsCategory")?.value || "all";
      renderNewsFeed(category);
      return;
    }

    if (action === "refresh-orderbook") {
      refreshOrderBook();
      return;
    }

    if (action === "refresh-gas") {
      refreshGasTracker();
      return;
    }

    if (action === "load-trade-history") {
      loadTradeHistory();
      return;
    }

    if (action === "add-to-watchlist") {
      addToWatchlist();
      return;
    }

    if (action === "remove-watchlist") {
      removeFromWatchlist(String(target.dataset.symbol || "").trim().toUpperCase());
      return;
    }

    if (action === "create-alert") {
      createAlert();
      return;
    }

    if (action === "remove-alert") {
      removeAlert(target.dataset.alertIndex);
      return;
    }

    if (action === "quick-buy") {
      runQuickTrade("buy");
      return;
    }

    if (action === "quick-sell") {
      runQuickTrade("sell");
      return;
    }

    if (action === "calc-risk") {
      calculateRisk();
      return;
    }

    if (action === "stake-asset") {
      const asset = String(document.getElementById("stakeAsset")?.value || "ETH");
      const amount = Number(document.getElementById("stakeAmount")?.value || 0);
      const duration = String(document.getElementById("stakeDuration")?.value || "30 days");
      const resultNode = document.getElementById("stakeResult");
      const apyMap = { ETH: 4.2, SOL: 6.8, BNB: 5.1, DOT: 12 };

      if (!amount || amount <= 0) {
        if (resultNode) {
          resultNode.innerHTML = '<article><strong>Stake request</strong><p class="meta">Enter a valid amount to continue.</p></article>';
        }
        return;
      }

      const durationDays = Number.parseInt(duration, 10) || 30;
      const apy = apyMap[asset] || 0;
      const rewards = amount * (apy / 100) * (durationDays / 365);
      state.stakes.unshift({
        id: `stake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        asset,
        amount,
        apy,
        duration,
        rewards,
      });
      renderStakes();
      if (resultNode) {
        resultNode.innerHTML = `
          <article>
            <strong>${escapeHtml(asset)} staked</strong>
            <p class="meta">${escapeHtml(`${formatPlainNumber(amount, 4)} locked for ${duration} at ${formatPlainNumber(apy, 2)}% APY.`)}</p>
          </article>
        `;
      }
      return;
    }

    if (action === "unstake") {
      state.stakes = state.stakes.filter((stake) => stake.id !== target.dataset.stakeId);
      renderStakes();
      setConnectionStatus("stake unstaked", "positive");
      return;
    }

    if (action === "run-convert") {
      runConverter();
      return;
    }

    if (action === "load-nfts") {
      const wallet = String(document.getElementById("nftWalletInput")?.value || "").trim() || "demo-wallet";
      const network = String(document.getElementById("nftNetwork")?.value || "ETH").trim();
      state.nfts = Array.from({ length: 4 }, (_, index) => ({
        name: `${network} Vault #${index + 1}`,
        tokenId: String(1000 + index),
        contractAddress: `${wallet.slice(0, 10) || "0xATLAS"}${network}${index}COLLECTIBLE`,
      }));
      renderNfts();
      return;
    }

    if (action === "mint-nft") {
      const contractValue = String(document.getElementById("nftMintContract")?.value || "").trim();
      const recipient = String(document.getElementById("nftMintTo")?.value || "").trim();
      const tokenIdValue = String(document.getElementById("nftMintId")?.value || "").trim();
      const tokenUri = String(document.getElementById("nftMintUri")?.value || "").trim();
      const contractId = Number(contractValue);
      const tokenId = Number(tokenIdValue);
      const payload = {
        contractId: Number.isFinite(contractId) && contractValue ? contractId : contractValue,
        contractAddress: contractValue,
        privateKey: "demo-private-key",
        to: recipient,
        tokenId: Number.isFinite(tokenId) && tokenIdValue ? tokenId : tokenIdValue,
        amount: 1,
        metadataUri: tokenUri,
      };
      const result = await apiCall("/api/erc1155/mint", {
        key: "mint-nft",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      const node = document.getElementById("nftMintResult");
      if (node) {
        node.innerHTML = `<article><strong>NFT mint</strong><p class="meta">${escapeHtml(output)}</p></article>`;
      }
      return;
    }

    if (action === "refresh-analytics") {
      refreshAnalytics();
      return;
    }

    if (action === "toggle-notif-panel") {
      const dropdown = document.getElementById("notifDropdown");
      const bell = document.getElementById("notifBell");
      if (!dropdown) {
        return;
      }
      if (!state.notifs.length) {
        state.notifs = getMockNotifications();
        renderNotifications();
      }
      const isOpen = dropdown.classList.toggle("open");
      dropdown.hidden = !isOpen;
      bell?.setAttribute("aria-expanded", String(isOpen));
      return;
    }

    if (action === "mark-notifs-read") {
      state.notifs = [];
      const list = document.getElementById("notifList");
      const badge = document.getElementById("notifCount");
      if (list) {
        list.innerHTML = "";
      }
      if (badge) {
        badge.textContent = "0";
      }
      const dropdown = document.getElementById("notifDropdown");
      const bell = document.getElementById("notifBell");
      if (dropdown) {
        dropdown.classList.remove("open");
        dropdown.hidden = true;
      }
      bell?.setAttribute("aria-expanded", "false");
      return;
    }

    if (action === "export-portfolio") {
      exportPortfolioCsv();
      return;
    }

    if (action === "accept-p2p-order") {
      await acceptP2POrder(target.dataset.orderId);
      await refreshDashboard();
      return;
    }

    if (action === "follow-trader") {
      await followTrader(target.dataset.traderId);
      await refreshDashboard();
      return;
    }

    if (action === "verify-email") {
      const result = await verifyEmail().catch((error) => ({ error: error.message }));
      const panel = document.getElementById("emailStatus");
      if (panel) {
        panel.innerHTML = `<article><strong>Verification</strong><p class="meta">${escapeHtml(JSON.stringify(result))}</p></article>`;
      }
      return;
    }

    if (action === "test-email") {
      const result = await sendEmailTest().catch((error) => ({ error: error.message }));
      const panel = document.getElementById("emailStatus");
      if (panel) {
        panel.innerHTML = `<article><strong>SMTP test</strong><p class="meta">${escapeHtml(JSON.stringify(result))}</p></article>`;
      }
      return;
    }

    if (action === "hardhat-deploy-all") {
      const result = await deployHardhat().catch((error) => ({
        error: `Unable to deploy AtlasX contracts right now. ${error.message}` ,
      }));
      updateHardhatLog("hardhatDeployLog", result, "Deployment result");
      state.dashboard.hardhatAssets = normalizeHardhatContracts(result);
      renderHardhatAssets();
      await refreshDashboard();
      return;
    }

    if (action === "hardhat-check-node") {
      const result = await getHardhatStatus().catch((error) => ({
        error: `Unable to reach the Hardhat node. ${error.message}` ,
      }));
      updateHardhatLog("hardhatDeployLog", result, "Hardhat node status");
      return;
    }

    if (action === "hardhat-mint-atx") {
      const payload = {
        to: String(document.getElementById("atxMintTo")?.value || "").trim(),
        amount: String(document.getElementById("atxMintAmount")?.value || "").trim(),
      };
      const result = await mintHardhatAtx(payload).catch((error) => ({
        error: `Unable to mint ATX right now. ${error.message}` ,
      }));
      updateHardhatLog("hardhatMintLog", result, "ATX mint result");
      return;
    }

    if (action === "hardhat-create-pair") {
      const payload = {
        tokenA: String(document.getElementById("dexTokenA")?.value || "").trim(),
        tokenB: String(document.getElementById("dexTokenB")?.value || "").trim(),
      };
      const result = await createHardhatPair(payload).catch((error) => ({
        error: `Unable to create the pair right now. ${error.message}` ,
      }));
      updateHardhatLog("hardhatDexLog", result, "Pair creation result");
      return;
    }

    if (action === "hardhat-add-liquidity") {
      const payload = {
        tokenA: String(document.getElementById("liqTokenA")?.value || "").trim(),
        tokenB: String(document.getElementById("liqTokenB")?.value || "").trim(),
        amountA: String(document.getElementById("liqAmountA")?.value || "").trim(),
        amountB: String(document.getElementById("liqAmountB")?.value || "").trim(),
      };
      const result = await addHardhatLiquidity(payload).catch((error) => ({
        error: `Unable to add liquidity right now. ${error.message}` ,
      }));
      updateHardhatLog("hardhatDexLog", result, "Liquidity result");
      return;
    }

    if (action === "hardhat-refresh-contracts") {
      const result = await loadHardhatContracts().catch((error) => ({
        error: `Unable to load deployed contracts right now. ${error.message}` ,
      }));
      if (result.error) {
        updateHardhatLog("hardhatDeployLog", result, "Contracts refresh");
      } else {
        state.dashboard.hardhatAssets = normalizeHardhatContracts(result);
        renderHardhatAssets();
      }
      return;
    }

    if (action === "hardhat-load-accounts") {
      const result = await loadHardhatAccountsRequest().catch((error) => ({
        error: `Unable to load local accounts right now. ${error.message}` ,
      }));
      if (result.error) {
        updateHardhatLog("hardhatDeployLog", result, "Accounts request");
      } else {
        state.dashboard.hardhatAccounts = result.accounts || result.data || result || [];
        renderHardhatAccounts();
      }
      return;
    }

    if (action === "load-terminal-transactions") {
      await loadPaymentTerminalTransactions().catch((error) => {
        const panel = document.getElementById("terminalResult");
        if (panel) {
          panel.innerHTML = `<article><strong>Terminal feed</strong><p class="meta">${escapeHtml(error.message)}</p></article>`;
        }
      });
      return;
    }


    if (action === "swap-quote") {
      const form = document.getElementById("swapForm");
      const payload = sanitizeNumericPayload(Object.fromEntries(new FormData(form).entries()), ["amountIn"]);
      const result = await apiCall("/api/swap/quote", {
        key: "swap-quote",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("swapQuoteResult", "Swap quote", result.quote || result);
      return;
    }

    if (action === "swap-execute") {
      const form = document.getElementById("swapForm");
      const payload = sanitizeNumericPayload(Object.fromEntries(new FormData(form).entries()), ["amountIn"]);
      const result = await apiCall("/api/swap/execute", {
        key: "swap-execute",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("swapQuoteResult", "Swap execution", result);
      await loadSwapHistory();
      renderMetrics();
      return;
    }

    if (action === "mt-market-order") {
      const form = document.getElementById("mtOrderForm");
      const payload = sanitizeNumericPayload(Object.fromEntries(new FormData(form).entries()), ["volume", "stopLoss", "takeProfit"]);
      const result = await apiCall("/api/metatrader/order/market", {
        key: "mt-market-order",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("mtOrderResult", "Market order", result.data || result);
      await loadMTPositions();
      return;
    }

    if (action === "generate-wallet") {
      const form = document.getElementById("walletGenerateForm");
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.includeMultiChain = payload.type === "multi";
      const result = await apiCall("/api/wallet/generate", {
        key: "generate-wallet",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("walletResult", "Wallet generation", result.wallet || result);
      return;
    }

    if (action === "wallet-import-mnemonic") {
      const form = document.getElementById("walletImportForm");
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await apiCall("/api/wallet/import-mnemonic", {
        key: "wallet-import-mnemonic",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("walletResult", "Mnemonic import", result.wallet || result);
      return;
    }

    if (action === "wallet-balance-check") {
      const form = document.getElementById("walletBalanceForm");
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await apiCall(`/api/${payload.network}/balance/${encodeURIComponent(payload.address || "")}`, {
        key: "wallet-balance-check",
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("walletResult", "Wallet balance", result);
      return;
    }

    if (action === "generate-api-key") {
      const form = document.getElementById("apiKeyForm");
      const payload = sanitizeNumericPayload(Object.fromEntries(new FormData(form).entries()), ["expiresInDays"]);
      if (payload.permissions) {
        payload.permissions = String(payload.permissions)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      }
      const result = await apiCall("/api/keys/generate", {
        key: "generate-api-key",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("apiKeyResult", "API key generated", result);
      await loadAPIKeys();
      return;
    }

    if (action === "revoke-api-key") {
      const keyId = target.dataset.keyId;
      const result = await apiCall(`/api/keys/${encodeURIComponent(keyId)}`, {
        key: "revoke-api-key",
        method: "DELETE",
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("apiKeyResult", "API key revoked", result);
      await loadAPIKeys();
      return;
    }

    if (action === "erc1155-add-contract") {
      const form = document.getElementById("erc1155ContractForm");
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await apiCall("/api/erc1155/contract/add", {
        key: "erc1155-add-contract",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("erc1155Result", "ERC-1155 contract", result);
      await loadERC1155Transactions();
      return;
    }

    if (action === "erc1155-balance-check") {
      const form = document.getElementById("erc1155BalanceForm");
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await apiCall(
        `/api/erc1155/balance/${encodeURIComponent(payload.contractId || "")}/${encodeURIComponent(payload.tokenId || "")}?walletAddress=${encodeURIComponent(payload.walletAddress || "")}`,
        {
          key: "erc1155-balance-check",
        }
      ).catch((error) => ({ error: error.message }));
      renderResultPanel("erc1155Result", "ERC-1155 balance", result);
      return;
    }

    if (action === "erc1155-mint") {
      const form = document.getElementById("erc1155MintForm");
      const payload = sanitizeNumericPayload(Object.fromEntries(new FormData(form).entries()), ["contractId", "tokenId", "amount"]);
      const result = await apiCall("/api/erc1155/mint", {
        key: "erc1155-mint",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("erc1155Result", "ERC-1155 mint", result);
      await loadERC1155Transactions();
      return;
    }

    if (action === "erc1155-transfer") {
      const form = document.getElementById("erc1155TransferForm");
      const payload = sanitizeNumericPayload(Object.fromEntries(new FormData(form).entries()), ["contractId", "tokenId", "amount"]);
      const result = await apiCall("/api/erc1155/transfer", {
        key: "erc1155-transfer",
        method: "POST",
        body: payload,
      }).catch((error) => ({ error: error.message }));
      renderResultPanel("erc1155Result", "ERC-1155 transfer", result);
      await loadERC1155Transactions();
      return;
    }

    if (action === "place-prediction") {
      const marketId = target.dataset.marketId || "btc-weekly";
      const result = await apiCall("/api/prediction/predict", {
        key: "prediction-place",
        method: "POST",
        body: {
          marketId,
          prediction: "above",
          amount: 50,
        },
      }).catch((error) => ({ error: error.message }));
      const body = document.getElementById("predictionPositionsBody");
      if (body) {
        body.insertAdjacentHTML(
          "afterbegin",
          `<tr><td>${escapeHtml(marketId)}</td><td>above</td><td>50</td><td>${escapeHtml(result.error ? "queued locally" : "submitted")}</td></tr>`
        );
      }
      return;
    }
  });
}

async function bootstrap() {
  bindFormHandlers();
  bindGlobalHandlers();
  connectWebSocket();
  appendAssistantMessage("assistant", "AtlasX assistant ready. Ask for risk summaries, on-chain status or desk workflows.");
  await loadAssistantStatus().catch(() => null);
  await hydrateSession();
}

document.addEventListener("DOMContentLoaded", () => {
  state.stakes = [];
  state.notifs = [];
  state.nfts = [];
  switchSection(state.activeSection);
  renderP2POrders();
  renderMyP2POrders();
  renderFollowingTraders();
  renderPredictionPositions();
  renderPredictionLeaderboard();
  renderHardhatAssets();
  renderMarketPrices();
  renderPortfolio();
  renderChartData();
  renderTrendingCoins();
  renderGlobalStats();
  renderDexTokens();
  renderDexPools();
  renderCryptoSearchResults();
  renderSwapHistory();
  renderMTAccount();
  renderMTPositions();
  renderERC1155Transactions();
  renderAPIKeys();
  renderOrderBook();
  renderTradeHistory();
  renderWatchlist();
  renderAlerts();
  renderNewsFeed();
  renderQuickTradeStatus();
  renderGasTracker();
  renderConvertResult();
  renderPortfolioAnalytics();
  renderTickerRates();
  renderAccountSnapshot();
  renderStakes();
  renderNfts();
  state.notifs = getMockNotifications();
  const notifCount = document.getElementById("notifCount");
  if (notifCount) {
    notifCount.textContent = "3";
  }
  renderNotifications();
  refreshAnalytics();
  loadTradeHistory();
  refreshOrderBook();
  refreshGasTracker();
  bootstrap().catch((error) => {
    setConnectionStatus(error.message, "warning");
  });
});
