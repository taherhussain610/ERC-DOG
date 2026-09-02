const assert = require("node:assert/strict");
const test = require("node:test");

const MarketAnalysisService = require("../src/services/marketAnalysisService");
const TechnicalIndicators = require("../src/services/technicalIndicators");

function buildCandles(count = 60) {
  return Array.from({ length: count }, (_, index) => {
    const open = 100 + index * 0.8 + Math.sin(index / 3);
    const close = open + 0.6;
    return {
      time: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
      open,
      high: close + 1.2,
      low: open - 1.1,
      close,
      volume: 1000 + index * 20,
    };
  });
}

test("RSI includes the initial period and handles one-directional markets", () => {
  const rising = Array.from({ length: 15 }, (_, index) => index + 1);
  const flat = Array.from({ length: 15 }, () => 10);

  assert.deepEqual(TechnicalIndicators.calculateRSI(rising, 14), [100]);
  assert.deepEqual(TechnicalIndicators.calculateRSI(flat, 14), [50]);
});

test("market analysis calculates advanced indicators from OHLCV candles", () => {
  const analysis = MarketAnalysisService.analyzeCandles(buildCandles());

  assert.equal(analysis.candleCount, 60);
  assert.equal(analysis.signal.label, "bullish");
  assert.ok(analysis.signal.confidence > 0);
  assert.ok(Number.isFinite(analysis.price.current));
  assert.ok(Number.isFinite(analysis.indicators.rsi14));
  assert.ok(Number.isFinite(analysis.indicators.macd.histogram));
  assert.ok(Number.isFinite(analysis.indicators.bollinger.widthPercent));
  assert.ok(Number.isFinite(analysis.indicators.atr14));
  assert.ok(Number.isFinite(analysis.indicators.vwap));
  assert.ok(analysis.levels.support <= analysis.price.current);
  assert.ok(analysis.levels.resistance >= analysis.price.current);
});

test("market analysis safely handles missing candle data", () => {
  const analysis = MarketAnalysisService.analyzeCandles([{ close: "not-a-price" }]);

  assert.equal(analysis.candleCount, 0);
  assert.deepEqual(analysis.signal, { label: "neutral", score: 0, confidence: 0 });
  assert.deepEqual(analysis.levels, { support: null, resistance: null });
});
