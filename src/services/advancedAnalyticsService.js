/**
 * Advanced Analytics Service
 * Comprehensive trading analytics and performance metrics
 */

class AdvancedAnalyticsService {
  constructor() {
    this.portfolios = new Map(); // userId -> portfolio data
    this.performanceMetrics = new Map(); // userId -> metrics
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(holdings, prices) {
    let totalValue = 0;
    let totalCost = 0;
    const breakdown = {};

    holdings.forEach((holding) => {
      const price = prices[holding.symbol] || 0;
      const value = holding.quantity * price;
      const cost = holding.averageCost * holding.quantity;

      totalValue += value;
      totalCost += cost;

      breakdown[holding.symbol] = {
        quantity: holding.quantity,
        price,
        value,
        cost,
        gain: value - cost,
        gainPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        allocation: 0, // Set after total calculated
      };
    });

    // Calculate allocation percentages
    Object.keys(breakdown).forEach((symbol) => {
      breakdown[symbol].allocation = totalValue > 0 ? (breakdown[symbol].value / totalValue) * 100 : 0;
    });

    return {
      totalValue,
      totalCost,
      totalGain: totalValue - totalCost,
      totalGainPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      breakdown,
      holdingCount: holdings.length,
    };
  }

  /**
   * Calculate risk metrics (Sharpe ratio, Sortino ratio, max drawdown)
   */
  calculateRiskMetrics(returns, riskFreeRate = 0.02) {
    if (returns.length < 2) {
      return { sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0 };
    }

    // Calculate average return
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Calculate standard deviation
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Sharpe Ratio = (avg return - risk free rate) / std dev
    const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    // Sortino Ratio (only downside volatility)
    const downideVariance =
      returns
        .filter((r) => r < avgReturn)
        .reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const downideStdDev = Math.sqrt(downideVariance);
    const sortinoRatio = downideStdDev > 0 ? (avgReturn - riskFreeRate) / downideStdDev : 0;

    // Max Drawdown
    let cumulativeReturn = 1;
    let peak = 1;
    let maxDrawdown = 0;

    returns.forEach((r) => {
      cumulativeReturn *= 1 + r;
      if (cumulativeReturn > peak) peak = cumulativeReturn;
      const drawdown = (peak - cumulativeReturn) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      sharpeRatio: sharpeRatio.toFixed(4),
      sortinoRatio: sortinoRatio.toFixed(4),
      maxDrawdown: (maxDrawdown * 100).toFixed(2),
      volatility: (stdDev * 100).toFixed(2),
    };
  }

  /**
   * Analyze trading patterns
   */
  analyzeTradingPatterns(trades) {
    if (!trades || trades.length === 0) {
      return { totalTrades: 0, winRate: 0, averageWin: 0, averageLoss: 0, profitFactor: 0 };
    }

    const wins = trades.filter((t) => t.profit > 0);
    const losses = trades.filter((t) => t.profit < 0);
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length)
        : 0;

    return {
      totalTrades: trades.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: ((wins.length / trades.length) * 100).toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      averageWin: avgWin.toFixed(2),
      averageLoss: avgLoss.toFixed(2),
      profitFactor: avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 0,
      expectancy: ((avgWin * (wins.length / trades.length) - avgLoss * (losses.length / trades.length))).toFixed(2),
    };
  }

  /**
   * Calculate correlation between assets
   */
  calculateCorrelation(asset1Returns, asset2Returns) {
    if (asset1Returns.length !== asset2Returns.length || asset1Returns.length < 2) {
      return 0;
    }

    const mean1 = asset1Returns.reduce((a, b) => a + b, 0) / asset1Returns.length;
    const mean2 = asset2Returns.reduce((a, b) => a + b, 0) / asset2Returns.length;

    let covariance = 0;
    let var1 = 0;
    let var2 = 0;

    asset1Returns.forEach((r1, i) => {
      const r2 = asset2Returns[i];
      covariance += (r1 - mean1) * (r2 - mean2);
      var1 += Math.pow(r1 - mean1, 2);
      var2 += Math.pow(r2 - mean2, 2);
    });

    covariance /= asset1Returns.length;
    var1 /= asset1Returns.length;
    var2 /= asset2Returns.length;

    const stdDev1 = Math.sqrt(var1);
    const stdDev2 = Math.sqrt(var2);

    if (stdDev1 === 0 || stdDev2 === 0) return 0;

    return (covariance / (stdDev1 * stdDev2)).toFixed(4);
  }

  /**
   * Generate portfolio diversification report
   */
  generateDiversificationReport(holdings, breakdown) {
    const topHoldings = Object.entries(breakdown)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5);

    // Group by asset class (simplified) - reserved for future classification
    // const assetClasses = {
    //   "stablecoins": ["USDT", "USDC", "DAI"],
    //   "layer1": ["BTC", "ETH", "SOL"],
    //   "layer2": ["ARB", "OP", "MATIC"],
    //   "defi": ["AAVE", "UNI", "CURVE"],
    //   "other": [],
    // };

    let concentration = 0;
    topHoldings.forEach((h) => {
      concentration += h[1].allocation;
    });

    return {
      topHoldings: topHoldings.map((h) => ({
        symbol: h[0],
        allocation: h[1].allocation.toFixed(2),
        value: h[1].value.toFixed(2),
      })),
      concentration: concentration.toFixed(2),
      holdingCount: holdings.length,
      diversificationScore: Math.min(100, (100 / holdings.length) * 5).toFixed(2),
      recommendation:
        concentration > 80 ? "High concentration risk - diversify" : "Well diversified",
    };
  }

  /**
   * Performance attribution analysis
   */
  performanceAttribution(portfolio, benchmarkReturns) {
    const attribution = {};

    Object.entries(portfolio).forEach(([symbol, data]) => {
      const allocation = data.allocation / 100;
      const benchmarkReturn = benchmarkReturns[symbol] || 0;
      const actualReturn = data.gainPercent / 100;

      attribution[symbol] = {
        allocation: data.allocation.toFixed(2),
        benchmarkReturn: (benchmarkReturn * 100).toFixed(2),
        actualReturn: (actualReturn * 100).toFixed(2),
        selection: (actualReturn - benchmarkReturn).toFixed(4),
        allocationEffect: (allocation * benchmarkReturn).toFixed(4),
      };
    });

    return attribution;
  }

  /**
   * Backtesting simulation
   */
  runBacktest(strategy, historicalData, initialCapital) {
    let balance = initialCapital;
    let totalTrades = 0;
    let winTrades = 0;
    const results = [];

    historicalData.forEach((candle) => {
      const signal = strategy(candle);

      if (signal === "BUY") {
        balance *= 0.99; // Simulate 1% fee
        totalTrades++;
      } else if (signal === "SELL") {
        balance *= 1.01; // Simulate 1% gain
        winTrades++;
      }

      results.push({
        timestamp: candle.timestamp,
        balance,
        signal,
      });
    });

    const totalReturn = ((balance - initialCapital) / initialCapital) * 100;

    return {
      finalBalance: balance.toFixed(2),
      totalReturn: totalReturn.toFixed(2),
      totalTrades,
      winTrades,
      winRate: totalTrades > 0 ? ((winTrades / totalTrades) * 100).toFixed(2) : 0,
      results,
    };
  }
}

module.exports = AdvancedAnalyticsService;
