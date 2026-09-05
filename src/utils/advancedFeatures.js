/**
 * Advanced Features Integration Module
 * Provides enhanced functionality for trading, analytics, and risk management
 * This module consolidates all advanced coding patterns and services
 */

const rateLimit = require("express-rate-limit");

// Performance Monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
  }

  startTimer(key) {
    this.metrics.set(key, Date.now());
  }

  endTimer(key) {
    const start = this.metrics.get(key);
    if (start) {
      const duration = Date.now() - start;
      this.metrics.delete(key);
      return duration;
    }
    return 0;
  }
}

// Advanced Cache Manager with TTL
class AdvancedCacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
  }

  set(key, value, ttlMs = 300000) {
    // Default 5 minutes
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);

    // Auto-cleanup on expiration
    setTimeout(() => {
      if (this.ttl.get(key) && Date.now() > this.ttl.get(key)) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }, ttlMs);
  }

  get(key) {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Circuit Breaker for external API calls
class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async call(...args) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "HALF_OPEN";
        this.failures = 0;
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await this.fn(...args);
      if (this.state === "HALF_OPEN") {
        this.state = "CLOSED";
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = "OPEN";
      }

      throw error;
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Advanced Request Validator
class RequestValidator {
  static validateTradingParams(params) {
    const errors = [];

    if (!params.symbol) errors.push("Symbol is required");
    if (params.amount && params.amount <= 0) errors.push("Amount must be positive");
    if (params.leverage && (params.leverage < 1 || params.leverage > 100))
      errors.push("Leverage must be between 1 and 100");
    if (params.stopLoss && params.stopLoss < 0) errors.push("Stop loss must be non-negative");
    if (params.takeProfit && params.takeProfit <= 0)
      errors.push("Take profit must be positive");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validatePortfolioParams(params) {
    const errors = [];

    if (!params.holdings || !Array.isArray(params.holdings))
      errors.push("Holdings must be an array");
    if (!params.prices || typeof params.prices !== "object")
      errors.push("Prices must be an object");

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateRiskParams(params) {
    const errors = [];

    if (params.riskTolerance && !["low", "medium", "high"].includes(params.riskTolerance))
      errors.push("Risk tolerance must be low, medium, or high");
    if (params.portfolioSize && params.portfolioSize <= 0)
      errors.push("Portfolio size must be positive");
    if (
      params.maxDrawdown &&
      (params.maxDrawdown <= 0 || params.maxDrawdown > 100)
    )
      errors.push("Max drawdown must be between 0 and 100");

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Rate Limiters for Different Endpoints
const createRateLimiters = () => ({
  // Strict limit for auth endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: "Too many authentication attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Medium limit for trading endpoints
  trading: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: "Too many trading requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Loose limit for read endpoints
  read: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Very strict for blockchain endpoints
  blockchain: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: "Too many blockchain requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  }),
});

// Advanced Error Handler
class AdvancedErrorHandler {
  static handle(error, context = {}) {
    const errorId = Date.now() + Math.random();

    const errorResponse = {
      id: errorId,
      message: error.message || "An unexpected error occurred",
      type: error.constructor.name,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (process.env.NODE_ENV === "development") {
      errorResponse.stack = error.stack;
    }

    return errorResponse;
  }

  static createErrorResponse(statusCode, error, context = {}) {
    return {
      statusCode,
      error: this.handle(error, context),
    };
  }
}

// Database Query Optimizer
class QueryOptimizer {
  static buildWhereClause(filters = {}) {
    const clauses = [];
    const values = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          clauses.push(`${key} IN (${value.map(() => "?").join(",")})`);
          values.push(...value);
        } else if (typeof value === "object" && value.operator) {
          clauses.push(`${key} ${value.operator} ?`);
          values.push(value.value);
        } else {
          clauses.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    return {
      clause: clauses.length > 0 ? "WHERE " + clauses.join(" AND ") : "",
      values,
    };
  }

  static buildOrderClause(sort = {}) {
    const clauses = [];

    Object.entries(sort).forEach(([field, direction]) => {
      if (["ASC", "DESC"].includes(direction.toUpperCase())) {
        clauses.push(`${field} ${direction.toUpperCase()}`);
      }
    });

    return clauses.length > 0 ? "ORDER BY " + clauses.join(", ") : "";
  }

  static buildLimitClause(limit, offset = 0) {
    if (limit && typeof limit === "number" && limit > 0) {
      return `LIMIT ${limit} OFFSET ${offset}`;
    }
    return "";
  }
}

// WebSocket Event Broadcaster
class WebSocketBroadcaster {
  constructor(wsService) {
    this.wsService = wsService;
  }

  broadcastTrade(trade) {
    this.broadcast({
      type: "TRADE_EXECUTED",
      data: trade,
      timestamp: Date.now(),
    });
  }

  broadcastPriceUpdate(symbol, price, change) {
    this.broadcast({
      type: "PRICE_UPDATE",
      data: { symbol, price, change },
      timestamp: Date.now(),
    });
  }

  broadcastPortfolioUpdate(userId, portfolio) {
    this.broadcast({
      type: "PORTFOLIO_UPDATE",
      data: portfolio,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastMarginAlert(userId, alert) {
    this.broadcast({
      type: "MARGIN_ALERT",
      data: alert,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastAnalyticsUpdate(userId, analytics) {
    this.broadcast({
      type: "ANALYTICS_UPDATE",
      data: analytics,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcast(message) {
    if (this.wsService && this.wsService.server) {
      // Send to all connected clients if no userId, or specific user if userId provided
      const targetClients = message.userId
        ? this.wsService.getClientsByUserId?.(message.userId) || []
        : this.wsService.getConnectedClients?.() || [];

      targetClients.forEach((client) => {
        if (client.readyState === 1) {
          // OPEN state
          client.send(JSON.stringify(message));
        }
      });
    }
  }
}

// Advanced Metrics Collector
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      trades: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: [],
    };
  }

  recordRequest(responseTime) {
    this.metrics.requests++;
    this.metrics.responseTimes.push(responseTime);

    // Keep only last 100 response times
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }

    this.metrics.avgResponseTime =
      this.metrics.responseTimes.reduce((a, b) => a + b, 0) /
      this.metrics.responseTimes.length;
  }

  recordTrade() {
    this.metrics.trades++;
  }

  recordError() {
    this.metrics.errors++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      trades: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: [],
    };
  }
}

// Advanced Logger
class AdvancedLogger {
  static log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    console.log(`[${timestamp}] [${level}] ${message}`, context);

    // Could integrate with external logging service here
    // Example: sendToSentry(logEntry), sendToDatadog(logEntry), etc.

    return logEntry;
  }

  static info(message, context) {
    return this.log("INFO", message, context);
  }

  static warn(message, context) {
    return this.log("WARN", message, context);
  }

  static error(message, context) {
    return this.log("ERROR", message, context);
  }

  static debug(message, context) {
    if (process.env.NODE_ENV === "development") {
      return this.log("DEBUG", message, context);
    }
  }
}

module.exports = {
  PerformanceMonitor,
  AdvancedCacheManager,
  CircuitBreaker,
  RequestValidator,
  createRateLimiters,
  AdvancedErrorHandler,
  QueryOptimizer,
  WebSocketBroadcaster,
  MetricsCollector,
  AdvancedLogger,
};
