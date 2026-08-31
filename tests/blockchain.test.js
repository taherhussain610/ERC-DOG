"use strict";
/**
 * Expanded test coverage for blockchain services, governance,
 * payment gateway mock-mode, and the migration runner.
 */
const assert = require("node:assert/strict");
const test = require("node:test");

const TRC1155Service = require("../src/blockchain/trc1155Service");
const MetaTraderService = require("../src/services/metaTraderService");
const PaymentGatewayService = require("../src/services/paymentGatewayService");
const { runMigrations, MIGRATIONS } = require("../src/db/migrations");

// ── TRC1155Service ────────────────────────────────────────────────────────────

test("TRC1155Service initializes with default ETH RPC URL when no arg is given", () => {
  const svc = new TRC1155Service();
  const result = svc.initialize();
  assert.equal(result.success, true);
  assert.match(result.message, /initialized/i);
});

test("TRC1155Service returns error for invalid contract address", async () => {
  const svc = new TRC1155Service();
  svc.initialize();
  const result = await svc.balanceOf("not-an-address", "0x0000000000000000000000000000000000000000", 1n);
  assert.equal(result.success, false);
  assert.match(result.error, /invalid/i);
});

test("TRC1155Service _contract throws for zero address", () => {
  const svc = new TRC1155Service();
  svc.initialize();
  // The all-zero address is technically valid; a non-hex string is not.
  assert.throws(() => svc._contract("not-a-valid-ethereum-address"), /Invalid/i);
});

// ── MetaTraderService mock mode ───────────────────────────────────────────────

test("MetaTraderService.getAccountInfo returns mock data when unconfigured", async () => {
  const svc = new MetaTraderService();
  // Ensure unconfigured
  svc.configured = false;
  svc.apiKey = "";
  const result = await svc.getAccountInfo();
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.ok(result.data.accountId);
});

test("MetaTraderService.getAccountBalance returns mock balance when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.getAccountBalance();
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.equal(typeof result.data.balance, "number");
});

test("MetaTraderService.getSymbols returns default symbols when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.getSymbols();
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.ok(result.data.length > 0);
  assert.ok(result.data.every((s) => s.name));
});

test("MetaTraderService.getPrice returns mock price when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.getPrice("EURUSD");
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.equal(result.data.symbol, "EURUSD");
  assert.ok(result.data.bid > 0);
  assert.ok(result.data.ask > result.data.bid);
});

test("MetaTraderService.getHistoricalData returns mock candles when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.getHistoricalData("EURUSD", "1h", 20);
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.ok(result.data.length > 0);
  const c = result.data[0];
  assert.ok(["time", "open", "high", "low", "close"].every((k) => k in c));
});

test("MetaTraderService.placeMarketOrder creates a mock order when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.placeMarketOrder({ symbol: "EURUSD", type: "buy", volume: 0.1 });
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.ok(result.data.orderId);
  assert.equal(result.data.status, "open");
  assert.equal(result.data.symbol, "EURUSD");
});

test("MetaTraderService.closeOrder removes a mock order when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const open = await svc.placeMarketOrder({ symbol: "GBPUSD", type: "sell", volume: 0.01 });
  assert.equal(open.success, true);
  const closed = await svc.closeOrder(open.data.orderId);
  assert.equal(closed.success, true);
  assert.equal(closed.mock, true);
  assert.equal(closed.data.status, "closed");
});

test("MetaTraderService.cancelOrder removes a mock pending order when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const open = await svc.placePendingOrder({ symbol: "USDJPY", type: "buy_limit", volume: 0.1, price: 150 });
  const cancel = await svc.cancelOrder(open.data.orderId);
  assert.equal(cancel.success, true);
  assert.equal(cancel.mock, true);
  assert.equal(cancel.data.status, "cancelled");
});

test("MetaTraderService.getTradingStats returns mock stats when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.getTradingStats();
  assert.equal(result.success, true);
  assert.equal(result.mock, true);
  assert.equal(typeof result.data.winRate, "string");
  assert.equal(typeof result.data.openPositions, "number");
});

test("MetaTraderService.checkConnection returns not-connected when unconfigured", async () => {
  const svc = new MetaTraderService();
  svc.configured = false;
  const result = await svc.checkConnection();
  assert.equal(result.success, true);
  assert.equal(result.connected, false);
  assert.equal(result.configured, false);
});

// ── PaymentGatewayService mock mode ──────────────────────────────────────────

test("PaymentGatewayService enters mock mode when no API keys are configured", () => {
  const svc = new PaymentGatewayService({ stripeKey: null, paypalClientId: null, coingateToken: null });
  assert.equal(svc.mockMode, true);
});

test("PaymentGatewayService getSupportedMethods returns an array", () => {
  const svc = new PaymentGatewayService({});
  const methods = svc.getSupportedMethods();
  assert.ok(Array.isArray(methods.methods));
  assert.ok(methods.methods.includes("card"));
});

test("PaymentGatewayService createPayment returns a mock payment in mock mode", async () => {
  const svc = new PaymentGatewayService({});
  const result = await svc.createPayment({ amount: 50, currency: "USD", method: "card" });
  assert.ok(result.id);
  assert.equal(result.amount, 50);
  assert.equal(result.currency, "USD");
  assert.equal(result.mock, true);
});

test("PaymentGatewayService createPayment validates required fields", async () => {
  const svc = new PaymentGatewayService({});
  assert.throws(
    () => svc._validate({ amount: -1, currency: "USD", method: "card" }),
    /amount/i
  );
});

test("PaymentGatewayService refundPayment returns a refund object", async () => {
  const svc = new PaymentGatewayService({});
  const refund = await svc.refundPayment({ paymentId: "PAY_123", amount: 10 });
  assert.equal(refund.paymentId, "PAY_123");
  assert.equal(refund.status, "refunded");
  assert.equal(refund.mock, true);
});

test("PaymentGatewayService createCryptoPayment returns a crypto payment", async () => {
  const svc = new PaymentGatewayService({});
  const result = await svc.createCryptoPayment({ amount: 100, currency: "USD", cryptoSymbol: "BTC" });
  assert.ok(result.id);
  assert.equal(result.cryptoSymbol, "BTC");
  assert.ok(Number(result.cryptoAmount) > 0);
  assert.equal(result.mock, true);
});

// ── Migration runner ─────────────────────────────────────────────────────────

test("runMigrations creates schema_migrations table and applies all migrations", () => {
  // Use an in-memory SQLite database via better-sqlite3
  const Database = require("better-sqlite3");
  const db = new Database(":memory:");

  // Create minimal prerequisite table (migrations reference users(id))
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY)");

  runMigrations(db);

  const applied = db.prepare("SELECT id, name FROM schema_migrations ORDER BY id").all();
  assert.equal(applied.length, MIGRATIONS.length);
  assert.equal(applied[0].id, 1);
  assert.equal(applied[0].name, "add_trc1155_contracts_table");
});

test("runMigrations is idempotent — running twice applies each migration only once", () => {
  const Database = require("better-sqlite3");
  const db = new Database(":memory:");
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY)");

  runMigrations(db);
  runMigrations(db); // second call should be a no-op

  const count = db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get();
  assert.equal(count.n, MIGRATIONS.length);
});

test("runMigrations creates trc1155_contracts table after migration 1", () => {
  const Database = require("better-sqlite3");
  const db = new Database(":memory:");
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY)");

  runMigrations(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trc1155_contracts'").all();
  assert.equal(tables.length, 1);
});

test("runMigrations creates governance_proposals table after migration 2", () => {
  const Database = require("better-sqlite3");
  const db = new Database(":memory:");
  db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY)");

  runMigrations(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='governance_proposals'").all();
  assert.equal(tables.length, 1);
});
