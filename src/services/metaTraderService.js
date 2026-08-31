/**
 * MetaTrader API Service
 * Integration with MetaTrader API for forex and CFD trading
 */

const axios = require("axios");

class MetaTraderService {
  constructor() {
    this.apiKey = process.env.METATRADER_API_KEY || "";
    this.baseUrl = process.env.METATRADER_API_URL || "https://api.metatrader.com/v1";
    this.configured = Boolean(this.apiKey);

    // Configure axios instance with API key
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    // Trading state
    this.positions = new Map(); // positionId -> position data
    this.orders = new Map(); // orderId -> order data
    this.accountInfo = null;
    this.symbols = new Map(); // symbol -> symbol info
    this.priceCache = new Map(); // symbol -> price data

    console.log("✅ MetaTrader Service initialized");
  }

  /**
   * Return a mock response when the service is not configured.
   * Mirrors the PaymentGatewayService.mockMode pattern.
   */

  _mockAccount() {
    return {
      accountId: "DEMO-000001",
      name: "Demo Account",
      currency: "USD",
      server: "demo.metatrader.example.com",
      leverage: 100,
      tradeAllowed: false,
    };
  }

  _mockBalance() {
    return {
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      marginLevel: null,
      profit: 0,
      currency: "USD",
    };
  }

  _mockSymbols() {
    return [
      { name: "EURUSD", description: "Euro vs US Dollar", digits: 5, minLot: 0.01 },
      { name: "GBPUSD", description: "Pound vs US Dollar", digits: 5, minLot: 0.01 },
      { name: "USDJPY", description: "US Dollar vs Japanese Yen", digits: 3, minLot: 0.01 },
      { name: "XAUUSD", description: "Gold vs US Dollar", digits: 2, minLot: 0.01 },
      { name: "BTCUSD", description: "Bitcoin vs US Dollar", digits: 2, minLot: 0.01 },
    ];
  }

  _mockPrice(symbol) {
    const base = { EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 155.4, XAUUSD: 2340, BTCUSD: 65000 };
    const mid = base[symbol] || 1.0;
    const spread = mid * 0.0002;
    return { symbol, bid: +(mid - spread).toFixed(5), ask: +(mid + spread).toFixed(5), spread: +(spread * 2).toFixed(5), timestamp: Date.now() };
  }

  _mockOrderId() {
    return `MOCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    if (!this.configured) {
      return { success: true, data: this._mockAccount(), mock: true };
    }
    try {
      const response = await this.client.get("/account/info");
      this.accountInfo = response.data;
      return { success: true, data: response.data };
    } catch (error) {
      console.error("MetaTrader API Error (Account Info):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get account balance and equity
   */
  async getAccountBalance() {
    if (!this.configured) {
      return { success: true, data: this._mockBalance(), mock: true };
    }
    try {
      const response = await this.client.get("/account/balance");
      return {
        success: true,
        data: {
          balance: response.data.balance,
          equity: response.data.equity,
          margin: response.data.margin,
          freeMargin: response.data.freeMargin,
          marginLevel: response.data.marginLevel,
          profit: response.data.profit,
          currency: response.data.currency || "USD",
        },
      };
    } catch (error) {
      console.error("MetaTrader API Error (Balance):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get available symbols (currency pairs, CFDs)
   */
  async getSymbols() {
    if (!this.configured) {
      const symbols = this._mockSymbols();
      symbols.forEach((s) => this.symbols.set(s.name, s));
      return { success: true, data: symbols, mock: true };
    }
    try {
      const response = await this.client.get("/symbols");
      response.data.symbols?.forEach((symbol) => { this.symbols.set(symbol.name, symbol); });
      return { success: true, data: response.data.symbols || [] };
    } catch (error) {
      console.error("MetaTrader API Error (Symbols):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get symbol information
   */
  async getSymbolInfo(symbol) {
    if (!this.configured) {
      const info = this._mockSymbols().find((s) => s.name === symbol) || { name: symbol };
      return { success: true, data: info, mock: true };
    }
    try {
      const response = await this.client.get(`/symbols/${symbol}`);
      this.symbols.set(symbol, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`MetaTrader API Error (Symbol ${symbol}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol) {
    if (!this.configured) {
      const priceData = this._mockPrice(symbol);
      this.priceCache.set(symbol, priceData);
      return { success: true, data: priceData, mock: true };
    }
    try {
      const response = await this.client.get(`/quotes/${symbol}`);
      const priceData = {
        symbol,
        bid: response.data.bid,
        ask: response.data.ask,
        spread: response.data.spread,
        timestamp: response.data.timestamp || Date.now(),
      };
      this.priceCache.set(symbol, priceData);
      return { success: true, data: priceData };
    } catch (error) {
      console.error(`MetaTrader API Error (Price ${symbol}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get historical price data (OHLCV)
   */
  async getHistoricalData(symbol, timeframe = "1h", limit = 100) {
    if (!this.configured) {
      const mid = this._mockPrice(symbol).bid;
      const candles = Array.from({ length: Math.min(limit, 50) }, (_, i) => {
        const ts = Date.now() - (limit - i) * 3600000;
        const o = +(mid * (1 + (Math.random() - 0.5) * 0.01)).toFixed(5);
        const c = +(mid * (1 + (Math.random() - 0.5) * 0.01)).toFixed(5);
        return { time: ts, open: o, high: +Math.max(o, c, mid * 1.005).toFixed(5), low: +Math.min(o, c, mid * 0.995).toFixed(5), close: c, volume: Math.floor(Math.random() * 1000) };
      });
      return { success: true, data: candles, mock: true };
    }
    if (!/^[A-Za-z0-9]{1,20}$/.test(symbol)) {
      return { success: false, error: "Invalid symbol" };
    }
    try {
      const response = await this.client.get(`/quotes/${symbol}/history`, { params: { timeframe, limit } });
      return { success: true, data: response.data.candles || [] };
    } catch (error) {
      console.error(`MetaTrader API Error (History ${symbol}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(params) {
    const { symbol, type, volume, stopLoss, takeProfit, comment } = params;
    if (!this.configured) {
      const orderId = this._mockOrderId();
      const price = this._mockPrice(symbol);
      const order = { orderId, symbol, type: type.toUpperCase(), volume, openPrice: type === "buy" ? price.ask : price.bid, stopLoss, takeProfit, comment: comment || `Market ${type} order`, status: "open", openTime: new Date().toISOString() };
      this.orders.set(orderId, order);
      return { success: true, data: order, mock: true };
    }
    try {
      const response = await this.client.post("/orders/market", { symbol, type: type.toUpperCase(), volume, stopLoss, takeProfit, comment: comment || `Market ${type} order` });
      const order = response.data;
      this.orders.set(order.orderId, order);
      return { success: true, data: order };
    } catch (error) {
      console.error("MetaTrader API Error (Market Order):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Place a pending order
   */
  async placePendingOrder(params) {
    const { symbol, type, volume, price, stopLoss, takeProfit, expiration, comment } = params;
    if (!this.configured) {
      const orderId = this._mockOrderId();
      const order = { orderId, symbol, type: type.toUpperCase(), volume, price, stopLoss, takeProfit, expiration, comment: comment || `Pending ${type} order`, status: "pending", createTime: new Date().toISOString() };
      this.orders.set(orderId, order);
      return { success: true, data: order, mock: true };
    }
    try {
      const response = await this.client.post("/orders/pending", { symbol, type: type.toUpperCase(), volume, price, stopLoss, takeProfit, expiration, comment: comment || `Pending ${type} order` });
      const order = response.data;
      this.orders.set(order.orderId, order);
      return { success: true, data: order };
    } catch (error) {
      console.error("MetaTrader API Error (Pending Order):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(orderId, modifications) {
    if (!this.configured) {
      const order = this.orders.get(orderId);
      if (!order) return { success: false, error: "Order not found" };
      const updated = { ...order, ...modifications };
      this.orders.set(orderId, updated);
      return { success: true, data: updated, mock: true };
    }
    try {
      const response = await this.client.put(`/orders/${orderId}`, modifications);
      const order = response.data;
      this.orders.set(orderId, order);
      return { success: true, data: order };
    } catch (error) {
      console.error(`MetaTrader API Error (Modify Order ${orderId}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Close an order/position
   */
  async closeOrder(orderId, volume = null) {
    if (!this.configured) {
      const order = this.orders.get(orderId);
      if (!order) return { success: false, error: "Order not found" };
      const closed = { ...order, status: "closed", closeTime: new Date().toISOString(), profit: 0 };
      this.orders.delete(orderId);
      return { success: true, data: closed, mock: true };
    }
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(orderId))) {
      return { success: false, error: "Invalid orderId" };
    }
    try {
      const response = await this.client.post(`/orders/${orderId}/close`, { volume });
      if (!volume || response.data.status === "closed") { this.orders.delete(orderId); }
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`MetaTrader API Error (Close Order ${orderId}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderId) {
    if (!this.configured) {
      if (!this.orders.has(orderId)) return { success: false, error: "Order not found" };
      this.orders.delete(orderId);
      return { success: true, data: { orderId, status: "cancelled" }, mock: true };
    }
    try {
      const response = await this.client.delete(`/orders/${orderId}`);
      this.orders.delete(orderId);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`MetaTrader API Error (Cancel Order ${orderId}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get all open positions
   */
  async getOpenPositions() {
    if (!this.configured) {
      const positions = [...this.positions.values()];
      return { success: true, data: positions, mock: true };
    }
    try {
      const response = await this.client.get("/positions");
      this.positions.clear();
      response.data.positions?.forEach((position) => { this.positions.set(position.positionId, position); });
      return { success: true, data: response.data.positions || [] };
    } catch (error) {
      console.error("MetaTrader API Error (Open Positions):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get all pending orders
   */
  async getPendingOrders() {
    if (!this.configured) {
      const orders = [...this.orders.values()].filter((o) => o.status === "pending");
      return { success: true, data: orders, mock: true };
    }
    try {
      const response = await this.client.get("/orders/pending");
      return { success: true, data: response.data.orders || [] };
    } catch (error) {
      console.error("MetaTrader API Error (Pending Orders):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(startDate = null, endDate = null) {
    if (!this.configured) {
      return { success: true, data: [], mock: true };
    }
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await this.client.get("/history/trades", { params });
      return { success: true, data: response.data.trades || [] };
    } catch (error) {
      console.error("MetaTrader API Error (Trade History):", error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Get position details
   */
  async getPositionDetails(positionId) {
    if (!this.configured) {
      const pos = this.positions.get(positionId);
      if (!pos) return { success: false, error: "Position not found" };
      return { success: true, data: pos, mock: true };
    }
    try {
      const response = await this.client.get(`/positions/${positionId}`);
      this.positions.set(positionId, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`MetaTrader API Error (Position ${positionId}):`, error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }

  /**
   * Calculate position profit/loss
   */
  calculatePnL(position, currentPrice) {
    const { type, volume, openPrice } = position;
    const priceDiff = type === "BUY" ? currentPrice - openPrice : openPrice - currentPrice;

    return priceDiff * volume;
  }

  /**
   * Get trading statistics
   */
  async getTradingStats() {
    if (!this.configured) {
      return {
        success: true,
        mock: true,
        data: {
          account: this._mockBalance(),
          openPositions: this.positions.size,
          totalTrades: 0,
          profitableTrades: 0,
          losingTrades: 0,
          winRate: "0.00",
          totalProfit: "0.00",
          averageProfit: "0.00",
        },
      };
    }
    try {
      const [positionsResult, historyResult, balanceResult] = await Promise.all([
        this.getOpenPositions(),
        this.getTradeHistory(),
        this.getAccountBalance(),
      ]);

      if (!positionsResult.success || !historyResult.success || !balanceResult.success) {
        throw new Error("Failed to fetch trading statistics");
      }

      const positions = positionsResult.data;
      const history = historyResult.data;
      const balance = balanceResult.data;

      const totalTrades = history.length;
      const profitableTrades = history.filter((t) => t.profit > 0).length;
      const losingTrades = history.filter((t) => t.profit < 0).length;
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
      const totalProfit = history.reduce((sum, t) => sum + (t.profit || 0), 0);
      const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;

      return {
        success: true,
        data: {
          account: balance,
          openPositions: positions.length,
          totalTrades,
          profitableTrades,
          losingTrades,
          winRate: winRate.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          averageProfit: averageProfit.toFixed(2),
        },
      };
    } catch (error) {
      console.error("MetaTrader API Error (Trading Stats):", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check API connection status
   */
  async checkConnection() {
    if (!this.configured) {
      return {
        success: true,
        connected: false,
        configured: false,
        message: "Set METATRADER_API_KEY to enable MetaTrader integration",
      };
    }

    try {
      const response = await this.client.get("/ping");
      return {
        success: true,
        connected: true,
        configured: true,
        message: "MetaTrader API connected",
      };
    } catch (error) {
      console.error("MetaTrader API Error (Connection Check):", error.message);
      return {
        success: false,
        connected: false,
        configured: true,
        error: error.message,
      };
    }
  }

  /**
   * Format order/position for display
   */
  formatPosition(position) {
    return {
      id: position.positionId || position.orderId,
      symbol: position.symbol,
      type: position.type,
      volume: position.volume,
      openPrice: position.openPrice || position.price,
      currentPrice: position.currentPrice,
      profit: position.profit,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      openTime: position.openTime,
      comment: position.comment,
    };
  }
}

module.exports = MetaTraderService;
