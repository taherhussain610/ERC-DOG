const TechnicalIndicators = require("./technicalIndicators");

function roundValue(value, digits = 8) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }
  return Number(number.toFixed(digits));
}

function latestFinite(values) {
  if (!Array.isArray(values)) {
    return null;
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(Number(values[index]))) {
      return Number(values[index]);
    }
  }
  return null;
}

function normalizeCandle(point) {
  const close = Number(point?.close);
  const open = Number(point?.open ?? close);
  const high = Number(point?.high ?? Math.max(open, close));
  const low = Number(point?.low ?? Math.min(open, close));
  const volume = Math.max(0, Number(point?.volume) || 0);

  if (![open, high, low, close].every(Number.isFinite)) {
    return null;
  }

  return {
    open,
    high: Math.max(high, open, close),
    low: Math.min(low, open, close),
    close,
    volume,
  };
}

function nearestLevel(levels, currentPrice, direction) {
  const candidates = levels
    .map((entry) => Number(entry?.level))
    .filter((level) => Number.isFinite(level))
    .filter((level) => (direction === "support" ? level <= currentPrice : level >= currentPrice));

  if (!candidates.length) {
    return null;
  }

  return direction === "support" ? Math.max(...candidates) : Math.min(...candidates);
}

class MarketAnalysisService {
  static analyzeCandles(points) {
    const candles = (Array.isArray(points) ? points : [])
      .slice(-500)
      .map(normalizeCandle)
      .filter(Boolean);

    if (candles.length < 2) {
      return {
        candleCount: candles.length,
        signal: { label: "neutral", score: 0, confidence: 0 },
        price: null,
        indicators: {},
        levels: { support: null, resistance: null },
      };
    }

    const closes = candles.map((candle) => candle.close);
    const highs = candles.map((candle) => candle.high);
    const lows = candles.map((candle) => candle.low);
    const volumes = candles.map((candle) => candle.volume);
    const effectiveVolumes = volumes.some((volume) => volume > 0)
      ? volumes
      : volumes.map(() => 1);
    const currentPrice = closes.at(-1);
    const firstPrice = closes[0];
    const sma20 = latestFinite(TechnicalIndicators.calculateSMA(closes, 20));
    const ema20 = latestFinite(TechnicalIndicators.calculateEMA(closes, 20));
    const rsi14 = latestFinite(TechnicalIndicators.calculateRSI(closes, 14));
    const stochastic14 = latestFinite(
      TechnicalIndicators.calculateStochastic(highs, lows, closes, 14)
    );
    const atr14 = latestFinite(TechnicalIndicators.calculateATR(highs, lows, closes, 14));
    const vwap = latestFinite(TechnicalIndicators.calculateVWAP(closes, effectiveVolumes));
    const macd = TechnicalIndicators.calculateMACD(closes);
    const bollinger = TechnicalIndicators.calculateBollingerBands(closes, 20, 2);
    const macdValue = latestFinite(macd.macd);
    const macdSignal = latestFinite(macd.signal);
    const macdHistogram = latestFinite(macd.histogram);
    const bollingerUpper = latestFinite(bollinger.upper);
    const bollingerMiddle = latestFinite(bollinger.middle);
    const bollingerLower = latestFinite(bollinger.lower);
    const levelWindow = Math.max(2, Math.min(5, Math.floor(candles.length / 10)));
    const detectedLevels = TechnicalIndicators.detectSupportResistance(closes, levelWindow);
    const support =
      nearestLevel(detectedLevels.support, currentPrice, "support") ?? Math.min(...lows);
    const resistance =
      nearestLevel(detectedLevels.resistance, currentPrice, "resistance") ?? Math.max(...highs);

    const scoreParts = [];
    if (sma20 !== null) {
      scoreParts.push(currentPrice >= sma20 ? 1 : -1);
    }
    if (vwap !== null) {
      scoreParts.push(currentPrice >= vwap ? 1 : -1);
    }
    if (macdHistogram !== null) {
      scoreParts.push(macdHistogram >= 0 ? 1 : -1);
    }
    if (rsi14 !== null) {
      if (rsi14 < 30) {
        scoreParts.push(1);
      } else if (rsi14 > 70) {
        scoreParts.push(-1);
      } else if (rsi14 >= 55) {
        scoreParts.push(1);
      } else if (rsi14 <= 45) {
        scoreParts.push(-1);
      } else {
        scoreParts.push(0);
      }
    }

    const score = scoreParts.reduce((sum, value) => sum + value, 0);
    const label = score >= 2 ? "bullish" : score <= -2 ? "bearish" : "neutral";
    const confidence = scoreParts.length
      ? Math.round((Math.abs(score) / scoreParts.length) * 100)
      : 0;
    const changePercent =
      firstPrice === 0 ? null : ((currentPrice - firstPrice) / Math.abs(firstPrice)) * 100;
    const bollingerWidth =
      bollingerMiddle && bollingerUpper !== null && bollingerLower !== null
        ? ((bollingerUpper - bollingerLower) / Math.abs(bollingerMiddle)) * 100
        : null;

    return {
      candleCount: candles.length,
      signal: {
        label,
        score,
        confidence,
      },
      price: {
        current: roundValue(currentPrice),
        changePercent: roundValue(changePercent, 4),
        high: roundValue(Math.max(...highs)),
        low: roundValue(Math.min(...lows)),
        volume: roundValue(volumes.reduce((sum, volume) => sum + volume, 0)),
      },
      indicators: {
        sma20: roundValue(sma20),
        ema20: roundValue(ema20),
        rsi14: roundValue(rsi14, 4),
        stochastic14: roundValue(stochastic14, 4),
        atr14: roundValue(atr14),
        vwap: roundValue(vwap),
        macd: {
          value: roundValue(macdValue),
          signal: roundValue(macdSignal),
          histogram: roundValue(macdHistogram),
        },
        bollinger: {
          upper: roundValue(bollingerUpper),
          middle: roundValue(bollingerMiddle),
          lower: roundValue(bollingerLower),
          widthPercent: roundValue(bollingerWidth, 4),
        },
      },
      levels: {
        support: roundValue(support),
        resistance: roundValue(resistance),
      },
    };
  }
}

module.exports = MarketAnalysisService;
