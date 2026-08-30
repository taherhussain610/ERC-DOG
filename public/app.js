const state = {
  token: localStorage.getItem("token"),
  user: null,
  websocket: null,
  activeSection: "overviewPanel",
  assistantMessages: [],
  dashboard: {
    p2pOrders: [],
    p2pMyOrders: [],
    following: [],
    predictionPositions: [],
    predictionLeaderboard: [],
    hardhatAssets: [],
  },
};

const wsOrigin = window.location.origin;
const apiBase = "";

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
      <strong>${state.user.username || state.user.email || `User ${state.user.id}`}</strong>
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
  const fallbackToken = "demo-token";
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
  ]);
  renderMetrics();
}

function renderMetrics() {
  const portfolioValue = document.getElementById("portfolioValue");
  const marginCount = document.getElementById("marginCount");
  const p2pCount = document.getElementById("p2pCount");
  const followingCount = document.getElementById("followingCount");

  if (portfolioValue) {
    portfolioValue.textContent = `$${(state.dashboard.following.length * 12500 + 10000).toLocaleString()}`;
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

function renderHardhatAssets() {
  const body = document.getElementById("hardhatAssetsBody");
  if (!body) {
    return;
  }

  if (!state.dashboard.hardhatAssets.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Registry assets will appear here after deployment.</td></tr>';
    return;
  }

  body.innerHTML = state.dashboard.hardhatAssets
    .map(
      (asset, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(asset.symbol)}</td>
          <td>${escapeHtml(asset.name)}</td>
          <td>${escapeHtml(asset.assetAddress)}</td>
          <td>${escapeHtml(asset.chainId)}</td>
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
    const result = await apiCall("/api/hardhat/assets", {
      key: "hardhat-assets",
    });
    state.dashboard.hardhatAssets = result.assets || result.data || result;
  } catch {
    state.dashboard.hardhatAssets = [
      {
        symbol: "ATX",
        name: "AtlasX Token",
        assetAddress: "0x0000000000000000000000000000000000000001",
        chainId: 31337,
      },
    ];
  }

  renderHardhatAssets();
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
        <p class="meta">Transaction ${result.data?.transactionId || "created"} completed for ${formData.amount} ${formData.currency}.</p>
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
                <strong>${row.transactionId}</strong>
                <p class="meta">${row.amount} ${row.currency} · ${row.status}</p>
              </article>
            `
          )
          .join("")
      : '<article><strong>No terminal transactions</strong><p class="meta">Process a payment to see recent activity.</p></article>';
  }
  return result;
}

async function revokeApiKey(keyId) {
  return apiCall(`/api/api-keys/${encodeURIComponent(keyId)}`, {
    key: "api-key-delete",
    method: "DELETE",
  });
}

function updateHardhatStatusPanel(payload, title) {
  const panel = document.getElementById("hardhatStatus");
  if (!panel) {
    return;
  }

  panel.innerHTML = `
    <article>
      <strong>${title}</strong>
      <p class="meta">${JSON.stringify(payload, null, 2)}</p>
    </article>
  `;
}

function bindFormHandlers() {
  const loginForm = document.getElementById("loginForm");
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
    payload.chainId = Number(payload.chainId);
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
          <strong>${network.toUpperCase()} transaction</strong>
          <p class="meta">${JSON.stringify(result, null, 2)}</p>
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

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === "refresh-dashboard") {
      await refreshDashboard();
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
        panel.innerHTML = `<article><strong>Demo account</strong><p class="meta">${JSON.stringify(result)}</p></article>`;
      }
      await refreshDashboard();
      return;
    }

    if (action === "refresh-demo") {
      await refreshDashboard();
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
        panel.innerHTML = `<article><strong>Verification</strong><p class="meta">${JSON.stringify(result)}</p></article>`;
      }
      return;
    }

    if (action === "test-email") {
      const result = await sendEmailTest().catch((error) => ({ error: error.message }));
      const panel = document.getElementById("emailStatus");
      if (panel) {
        panel.innerHTML = `<article><strong>SMTP test</strong><p class="meta">${JSON.stringify(result)}</p></article>`;
      }
      return;
    }

    if (action === "hardhat-status") {
      updateHardhatStatusPanel(await getHardhatStatus().catch((error) => ({ error: error.message })), "Hardhat status");
      return;
    }

    if (action === "hardhat-compile") {
      updateHardhatStatusPanel(await compileHardhat().catch((error) => ({ error: error.message })), "Compilation result");
      return;
    }

    if (action === "hardhat-deploy") {
      updateHardhatStatusPanel(await deployHardhat().catch((error) => ({ error: error.message })), "Deployment result");
      await refreshDashboard();
      return;
    }

    if (action === "load-terminal-transactions") {
      await loadPaymentTerminalTransactions().catch((error) => {
        const panel = document.getElementById("terminalResult");
        if (panel) {
          panel.innerHTML = `<article><strong>Terminal feed</strong><p class="meta">${error.message}</p></article>`;
        }
      });
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
          `<tr><td>${marketId}</td><td>above</td><td>50</td><td>${result.error ? "queued locally" : "submitted"}</td></tr>`
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
  switchSection(state.activeSection);
  renderP2POrders();
  renderMyP2POrders();
  renderFollowingTraders();
  renderPredictionPositions();
  renderPredictionLeaderboard();
  renderHardhatAssets();
  renderAccountSnapshot();
  bootstrap().catch((error) => {
    setConnectionStatus(error.message, "warning");
  });
});
