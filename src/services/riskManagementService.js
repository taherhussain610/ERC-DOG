/**
 * Advanced Risk Management Service
 * Comprehensive risk monitoring, hedging, and portfolio protection
 */

class RiskManagementService {
  constructor() {
    this.riskLimits = new Map(); // userId -> risk configuration
    this.alerts = new Map(); // userId -> active alerts
    this.hedges = new Map(); // userId -> hedging positions
  }

  /**
   * Initialize risk profile for user
   */
  initializeRiskProfile(userId, config = {}) {
    const profile = {
      userId,
      riskTolerance: config.riskTolerance || "medium", // low, medium, high, aggressive
      portfolioSize: config.portfolioSize || 10000,
      maxDrawdownPercent: config.maxDrawdownPercent || 20,
      maxPositionSize: config.maxPositionSize || 10, // % of portfolio
      maxLeverage: config.maxLeverage || 2,
      dailyLossLimit: config.dailyLossLimit || 5, // % of portfolio
      minStopLossPercent: config.minStopLossPercent || 2,
      maxConcentration: config.maxConcentration || 30, // % in single position
      correlationThreshold: config.correlationThreshold || 0.7,
      createdAt: new Date(),
    };

    this.riskLimits.set(userId, profile);
    return profile;
  }

  /**
   * Validate position against risk limits
   */
  validatePosition(userId, position, portfolio) {
    const profile = this.riskLimits.get(userId);
    if (!profile) {
      throw new Error("Risk profile not initialized");
    }

    const violations = [];
    const positionValue = position.quantity * position.price;
    const portfolioValue = Object.values(portfolio).reduce((sum, v) => sum + v, 0);
    const positionAllocation = (positionValue / portfolioValue) * 100;

    // Check position size
    if (positionAllocation > profile.maxPositionSize) {
      violations.push({
        type: "POSITION_SIZE",
        message: `Position size ${positionAllocation.toFixed(2)}% exceeds limit of ${profile.maxPositionSize}%`,
        severity: "high",
      });
    }

    // Check concentration
    if (positionAllocation > profile.maxConcentration) {
      violations.push({
        type: "CONCENTRATION",
        message: `Position concentration ${positionAllocation.toFixed(2)}% exceeds limit of ${profile.maxConcentration}%`,
        severity: "critical",
      });
    }

    // Check leverage
    if (position.leverage > profile.maxLeverage) {
      violations.push({
        type: "LEVERAGE",
        message: `Leverage ${position.leverage}x exceeds limit of ${profile.maxLeverage}x`,
        severity: "high",
      });
    }

    // Check stop loss
    const stopLossPercent = position.stopLoss
      ? (Math.abs(position.stopLoss - position.price) / position.price) * 100
      : 0;
    if (stopLossPercent < profile.minStopLossPercent) {
      violations.push({
        type: "STOP_LOSS",
        message: `Stop loss ${stopLossPercent.toFixed(2)}% is tighter than minimum ${profile.minStopLossPercent}%`,
        severity: "medium",
      });
    }

    return {
      valid: violations.length === 0,
      violations,
      positionAllocation: positionAllocation.toFixed(2),
    };
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  calculateVaR(portfolio, confidenceLevel = 0.95, timeHorizon = 1) {
    // Simplified VaR calculation using variance-covariance method
    const holdings = Object.values(portfolio);
    const n = holdings.length;

    if (n === 0) return 0;

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    let variance = 0;

    holdings.forEach((holding) => {
      const allocation = holding.value / totalValue;
      const historicalVolatility = holding.volatility || 0.2; // 20% default
      variance += Math.pow(allocation * historicalVolatility, 2);
    });

    const stdDev = Math.sqrt(variance);

    // Z-score for confidence level
    const zScores = { 0.9: 1.28, 0.95: 1.645, 0.99: 2.33 };
    const zScore = zScores[confidenceLevel] || 1.645;

    const var1Day = totalValue * stdDev * zScore;
    const varTimeHorizon = var1Day * Math.sqrt(timeHorizon);

    return {
      var1Day: var1Day.toFixed(2),
      varTimeHorizon: varTimeHorizon.toFixed(2),
      confidenceLevel: `${(confidenceLevel * 100).toFixed(0)}%`,
      timeHorizon: `${timeHorizon} day(s)`,
    };
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  calculateCVaR(returns, confidenceLevel = 0.95) {
    if (returns.length < 2) return 0;

    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.max(1, Math.floor(sortedReturns.length * (1 - confidenceLevel)));

    const cvar = sortedReturns.slice(0, index).reduce((sum, r) => sum + r, 0) / index;

    return {
      cvar: cvar.toFixed(4),
      description: `Average loss in worst ${(1 - confidenceLevel) * 100}% of cases`,
    };
  }

  /**
   * Analyze correlation risk
   */
  analyzeCorrelationRisk(portfolio, correlationMatrix) {
    const profile = this.riskLimits.get(portfolio.userId);
    if (!profile) return null;

    const symbols = Object.keys(portfolio.holdings || {});
    const risks = [];

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const corr = correlationMatrix[symbols[i]]?.[symbols[j]] || 0;

        if (Math.abs(corr) > profile.correlationThreshold) {
          risks.push({
            asset1: symbols[i],
            asset2: symbols[j],
            correlation: corr.toFixed(4),
            risk: "High correlation reduces diversification benefit",
          });
        }
      }
    }

    return {
      correlationRisks: risks,
      recommendation: risks.length > 0 ? "Consider reducing correlated positions" : "Portfolio well diversified",
    };
  }

  /**
   * Generate hedging recommendations
   */
  generateHedgingRecommendations(portfolio) {
    const recommendations = [];

    Object.entries(portfolio).forEach(([symbol, data]) => {
      if (data.allocation > 20) {
        recommendations.push({
          type: "CONCENTRATED_POSITION",
          symbol,
          allocation: data.allocation,
          recommendation: `Use put options or short call spreads to hedge ${symbol}`,
          cost: "2-3% premium",
        });
      }

      if (data.gainPercent > 50) {
        recommendations.push({
          type: "LARGE_GAIN",
          symbol,
          gain: data.gainPercent,
          recommendation: "Lock in gains with trailing stops or partial sells",
          cost: "Minimal",
        });
      }

      if (data.gainPercent < -10) {
        recommendations.push({
          type: "LARGE_LOSS",
          symbol,
          loss: data.gainPercent,
          recommendation: "Consider stop loss or hedge with inverse positions",
          cost: "1-2% premium",
        });
      }
    });

    return recommendations;
  }

  /**
   * Stress test portfolio
   */
  stressTestPortfolio(portfolio, scenarios) {
    const results = {};

    scenarios.forEach((scenario) => {
      let stressedValue = 0;

      Object.entries(portfolio).forEach(([symbol, data]) => {
        const symbolScenario = scenario.shocks[symbol] || 0;
        const newPrice = data.price * (1 + symbolScenario);
        stressedValue += data.quantity * newPrice;
      });

      const loss = stressedValue - Object.values(portfolio).reduce((sum, d) => sum + d.value, 0);
      const lossPercent = (loss / Object.values(portfolio).reduce((sum, d) => sum + d.value, 0)) * 100;

      results[scenario.name] = {
        scenarioDescription: scenario.description,
        stressedPortfolioValue: stressedValue.toFixed(2),
        loss: loss.toFixed(2),
        lossPercent: lossPercent.toFixed(2),
        status: Math.abs(lossPercent) > 20 ? "CRITICAL" : "ACCEPTABLE",
      };
    });

    return results;
  }

  /**
   * Set risk alert
   */
  setRiskAlert(userId, alert) {
    if (!this.alerts.has(userId)) {
      this.alerts.set(userId, []);
    }

    const userAlerts = this.alerts.get(userId);
    userAlerts.push({
      id: Date.now(),
      type: alert.type, // DRAWDOWN, LOSS_LIMIT, CONCENTRATION, CORRELATION
      threshold: alert.threshold,
      action: alert.action, // NOTIFY, AUTO_HEDGE, AUTO_CLOSE
      active: true,
      createdAt: new Date(),
    });

    return userAlerts[userAlerts.length - 1];
  }

  /**
   * Check active alerts
   */
  checkAlerts(userId, currentMetrics) {
    const userAlerts = this.alerts.get(userId) || [];
    const triggeredAlerts = [];

    userAlerts.forEach((alert) => {
      if (!alert.active) return;

      let shouldTrigger = false;

      if (alert.type === "DRAWDOWN" && currentMetrics.currentDrawdown > alert.threshold) {
        shouldTrigger = true;
      } else if (alert.type === "LOSS_LIMIT" && currentMetrics.dailyLoss > alert.threshold) {
        shouldTrigger = true;
      } else if (
        alert.type === "CONCENTRATION" &&
        currentMetrics.maxConcentration > alert.threshold
      ) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        triggeredAlerts.push(alert);
      }
    });

    return triggeredAlerts;
  }

  /**
   * Recommend portfolio rebalancing
   */
  recommendRebalancing(portfolio, targetAllocations) {
    const rebalancingActions = [];

    Object.entries(targetAllocations).forEach(([symbol, targetAllocation]) => {
      const currentAllocation = portfolio[symbol]?.allocation || 0;
      const drift = Math.abs(currentAllocation - targetAllocation);

      if (drift > 5) {
        // 5% threshold
        const action = currentAllocation > targetAllocation ? "SELL" : "BUY";
        const amount = drift;

        rebalancingActions.push({
          symbol,
          action,
          currentAllocation: currentAllocation.toFixed(2),
          targetAllocation: targetAllocation.toFixed(2),
          adjustmentPercent: amount.toFixed(2),
          priority: drift > 15 ? "HIGH" : drift > 10 ? "MEDIUM" : "LOW",
        });
      }
    });

    return rebalancingActions;
  }
}

module.exports = RiskManagementService;
