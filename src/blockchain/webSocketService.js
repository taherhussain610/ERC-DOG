const { Server } = require("socket.io");

/**
 * WebSocket Service for Real-Time Updates
 * Provides real-time price updates, transaction notifications, and order updates
 */

class WebSocketService {
  constructor(httpServer, options = {}) {
    this.authenticate = typeof options.authenticate === "function" ? options.authenticate : null;
    this.io = new Server(httpServer, {
      cors: {
        origin: options.corsOrigin || "*",
        methods: ["GET", "POST"],
      },
    });
    this.connectedClients = new Map();
    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, {
        socket,
        userId: null,
        subscriptions: new Set(),
      });

      socket.on("authenticate", async (data) => {
        await this.handleAuthentication(socket, data);
      });

      socket.on("subscribe", (data) => {
        this.handleSubscription(socket, data);
      });

      socket.on("unsubscribe", (data) => {
        this.handleUnsubscription(socket, data);
      });

      socket.on("ping", () => {
        socket.emit("pong", { timestamp: Date.now() });
      });

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Handle client authentication
   * @param {object} socket - Socket instance
   * @param {object} data - Authentication data
   */
  async handleAuthentication(socket, data) {
    const client = this.connectedClients.get(socket.id);
    if (!client || !this.authenticate || typeof data?.token !== "string") {
      socket.emit("authenticated", { success: false });
      return;
    }

    try {
      const user = await this.authenticate(data.token);
      const userId = Number(user?.id);
      if (!Number.isInteger(userId) || userId < 1) {
        socket.emit("authenticated", { success: false });
        return;
      }

      if (client.userId) {
        await socket.leave(`user:${client.userId}`);
      }
      client.userId = userId;
      await socket.join(`user:${userId}`);
      socket.emit("authenticated", { success: true, userId });
      console.log(`Client ${socket.id} authenticated as user ${userId}`);
    } catch {
      client.userId = null;
      socket.emit("authenticated", { success: false });
    }
  }

  normalizeSubscriptionChannel(channel) {
    const value = String(channel || "").trim();
    if (value === "market") {
      return value;
    }
    if (/^price:[A-Za-z0-9._-]{1,16}$/.test(value)) {
      const [, symbol] = value.split(":");
      return `price:${symbol.toUpperCase()}`;
    }
    return null;
  }

  /**
   * Handle subscription to channels
   * @param {object} socket - Socket instance
   * @param {object} data - Subscription data
   */
  handleSubscription(socket, data) {
    const client = this.connectedClients.get(socket.id);
    const channel = this.normalizeSubscriptionChannel(data?.channel);
    if (!client?.userId || !channel) {
      socket.emit("subscriptionError", { channel: String(data?.channel || "") });
      return;
    }

    client.subscriptions.add(channel);
    socket.join(channel);
    socket.emit("subscribed", { channel });
    console.log(`Client ${socket.id} subscribed to ${channel}`);
  }

  /**
   * Handle unsubscription from channels
   * @param {object} socket - Socket instance
   * @param {object} data - Unsubscription data
   */
  handleUnsubscription(socket, data) {
    const client = this.connectedClients.get(socket.id);
    const channel = this.normalizeSubscriptionChannel(data?.channel);
    if (!client || !channel || !client.subscriptions.has(channel)) {
      return;
    }

    client.subscriptions.delete(channel);
    socket.leave(channel);
    socket.emit("unsubscribed", { channel });
    console.log(`Client ${socket.id} unsubscribed from ${channel}`);
  }

  /**
   * Broadcast price update to all subscribed clients
   * @param {string} symbol - Cryptocurrency symbol
   * @param {object} priceData - Price data
   */
  broadcastPriceUpdate(symbol, priceData) {
    this.io.to(`price:${symbol}`).emit("priceUpdate", {
      symbol,
      ...priceData,
      timestamp: Date.now(),
    });
  }

  /**
   * Send balance update to specific user
   * @param {number} userId - User ID
   * @param {object} balanceData - Balance data
   */
  sendBalanceUpdate(userId, balanceData) {
    this.io.to(`user:${userId}`).emit("balanceUpdate", {
      ...balanceData,
      timestamp: Date.now(),
    });
  }

  /**
   * Send transaction notification to user
   * @param {number} userId - User ID
   * @param {object} transaction - Transaction data
   */
  sendTransactionNotification(userId, transaction) {
    this.io.to(`user:${userId}`).emit("transaction", {
      ...transaction,
      timestamp: Date.now(),
    });
  }

  /**
   * Send order update to user
   * @param {number} userId - User ID
   * @param {object} order - Order data
   */
  sendOrderUpdate(userId, order) {
    this.io.to(`user:${userId}`).emit("orderUpdate", {
      ...order,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast market update
   * @param {object} marketData - Market data
   */
  broadcastMarketUpdate(marketData) {
    this.io.to("market").emit("marketUpdate", {
      ...marketData,
      timestamp: Date.now(),
    });
  }

  /**
   * Send notification to user
   * @param {number} userId - User ID
   * @param {object} notification - Notification data
   */
  sendNotification(userId, notification) {
    this.io.to(`user:${userId}`).emit("notification", {
      ...notification,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast to all connected clients
   * @param {string} event - Event name
   * @param {object} data - Event data
   */
  broadcastToAll(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connected clients count
   * @returns {number} Number of connected clients
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get client subscriptions
   * @param {string} socketId - Socket ID
   * @returns {Array} Array of subscriptions
   */
  getClientSubscriptions(socketId) {
    const client = this.connectedClients.get(socketId);
    return client ? Array.from(client.subscriptions) : [];
  }

  /**
   * Disconnect all clients
   */
  disconnectAll() {
    this.io.disconnectSockets();
    this.connectedClients.clear();
  }

  /**
   * Get statistics
   * @returns {object} WebSocket statistics
   */
  getStats() {
    const clients = Array.from(this.connectedClients.values());
    return {
      totalClients: clients.length,
      authenticatedClients: clients.filter((client) => client.userId).length,
      totalSubscriptions: clients.reduce((sum, client) => sum + client.subscriptions.size, 0),
    };
  }

  /**
   * Broadcast message to a specific channel
   * @param {string} channel - Channel name
   * @param {string} event - Event name
   * @param {object} data - Data to send
   */
  broadcast(channel, event, data) {
    this.io.to(channel).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Send message to a specific user
   * @param {number} userId - User ID
   * @param {string} event - Event name
   * @param {object} data - Data to send
   */
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }
}

module.exports = WebSocketService;
