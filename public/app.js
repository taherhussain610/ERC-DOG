// [Previous content 1-260 lines remain the same]

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

  // Full panel coverage: load data for each section on switch
  switch (sectionId) {
    case "paymentPanel":
      renderPgFields();
      renderPgSummary();
      if (state.token) {
        loadPaymentHistory().catch(() => null);
        loadSavedPaymentMethods().catch(() => null);
      } else {
        renderPaymentHistory();
        renderSavedPaymentMethods();
      }
      break;
      
    case "marketsPanel":
      loadMarketPrices().catch(() => null);
      loadGlobalStats().catch(() => null);
      renderTrendingCoins();
      renderGlobalStats();
      break;
      
    case "tradingPanel":
      loadOrderBook().catch(() => null);
      loadTradeHistory().catch(() => null);
      renderOrderBook();
      renderTradeHistory();
      break;
      
    case "futuresPanel":
      loadFundingRates().catch(() => null);
      loadFuturesPositions().catch(() => null);
      renderFundingRates();
      renderFuturesPositions();
      break;
      
    case "copyTradingPanel":
      loadFollowingTraders().catch(() => null);
      renderFollowingTraders();
      break;
      
    case "predictionPanel":
      loadPredictionPositions().catch(() => null);
      renderPredictionPositions();
      renderPredictionLeaderboard();
      break;
      
    case "walletPanel":
      renderPortfolio();
      renderWatchlist();
      break;
      
    case "settingsPanel":
      // Settings render without external data loading
      break;
      
    case "overviewPanel":
      populateQuickStats();
      loadGlobalStats().catch(() => null);
      renderGlobalStats();
      renderTickerRates();
      break;
      
    case "assistantPanel":
      // Assistant panel ready without initial load
      break;
      
    case "dexPanel":
      loadDexTokens().catch(() => null);
      loadDexPools().catch(() => null);
      renderDexTokens();
      renderDexPools();
      break;
      
    case "defiPanel":
      refreshDefiDashboard();
      renderDefiPanel();
      break;
      
    case "hardhatPanel":
      loadHardhatAssets().catch(() => null);
      renderHardhatAssets();
      break;
      
    case "screeningPanel":
      renderScreenerResults();
      renderSavedScreens();
      break;
      
    case "swapPanel":
      loadSwapHistory().catch(() => null);
      renderSwapHistory();
      break;
      
    case "marginPanel":
      loadMarginPositions().catch(() => null);
      renderMTPositions();
      updateHealthFactorChip();
      break;
      
    case "p2pPanel":
      loadP2POrders().catch(() => null);
      renderP2POrders();
      renderMyP2POrders();
      break;
      
    case "nftPanel":
      loadNFTs().catch(() => null);
      renderNfts();
      break;
      
    case "bridgePanel":
      loadBridgeHistory().catch(() => null);
      renderBridgeHistory();
      break;
      
    case "lendingPanel":
      loadLendingData().catch(() => null);
      renderSupplyTable();
      renderBorrowTable();
      break;
      
    case "taxPanel":
      loadTaxTransactions().catch(() => null);
      renderTaxReport();
      break;
      
    case "launchpadPanel":
      loadLaunchpadData().catch(() => null);
      renderLaunchpad();
      break;
      
    case "apiPanel":
      loadAPIKeys().catch(() => null);
      renderAPIKeys();
      break;
  }
}

// Auto-refresh intervals: section-gated to avoid redundant API calls
const REFRESH_INTERVALS = {
  priceTicker: { interval: 30000, fn: () => refreshTickerRates(), always: true },
  gasTracker: { interval: 45000, fn: () => refreshGasTracker(), always: true },
  marketPrices: { interval: 60000, fn: () => loadMarketPrices().catch(() => null), guards: ['marketsPanel', 'overviewPanel'] },
  orderBook: { interval: 15000, fn: () => refreshOrderBook(), guards: ['tradingPanel'] },
  fundingRates: { interval: 30000, fn: () => loadFundingRates().catch(() => null), guards: ['futuresPanel'] },
  copyTrading: { interval: 60000, fn: () => loadFollowingTraders().catch(() => null), guards: ['copyTradingPanel'] },
  prediction: { interval: 60000, fn: () => loadPredictionPositions().catch(() => null), guards: ['predictionPanel'] }
};

// Setup auto-refresh handlers
Object.entries(REFRESH_INTERVALS).forEach(([key, config]) => {
  setInterval(() => {
    const shouldRun = config.always || (config.guards && config.guards.includes(state.activeSection));
    if (shouldRun) {
      config.fn();
    }
  }, config.interval);
});

// [Rest of the file continues with previous content]
