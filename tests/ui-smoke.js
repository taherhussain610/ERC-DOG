const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const baseUrl = process.env.APP_URL || "http://localhost:4000";

function findBrowserExecutable() {
  const candidates = [
    process.env.EDGE_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function isAppReady() {
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    return health.ok;
  } catch {
    return false;
  }
}

async function startAppIfNeeded() {
  if (await isAppReady()) {
    return { process: null, databasePath: null };
  }

  assert.equal(
    process.env.APP_URL,
    undefined,
    `Application is not running at configured APP_URL ${baseUrl}`,
  );

  const appRoot = path.join(__dirname, "..");
  const databasePath = path.join(
    os.tmpdir(),
    `atlasx-ui-${process.pid}-${Date.now()}.db`,
  );
  const serverProcess = spawn(process.execPath, ["src/server.js"], {
    cwd: appRoot,
    env: { ...process.env, DB_PATH: databasePath },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isAppReady()) {
      return { process: serverProcess, databasePath };
    }
    if (serverProcess.exitCode !== null) {
      throw new Error(`Application exited during startup.\n${serverOutput}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  serverProcess.kill();
  throw new Error(
    `Application did not become ready at ${baseUrl}.\n${serverOutput}`,
  );
}

async function stopApp(serverProcess) {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill();
  await new Promise((resolve) => {
    const forceStop = setTimeout(() => {
      if (serverProcess.exitCode === null) {
        serverProcess.kill("SIGKILL");
      }
      resolve();
    }, 2000);
    serverProcess.once("exit", () => {
      clearTimeout(forceStop);
      resolve();
    });
  });
}

function removeTestDatabase(databasePath) {
  if (!databasePath) {
    return;
  }
  [databasePath, `${databasePath}-shm`, `${databasePath}-wal`].forEach(
    (filePath) => {
      fs.rmSync(filePath, { force: true });
    },
  );
}

async function assertNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} page overflows horizontally: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`,
  );
}

function buildChartFixture() {
  const points = Array.from({ length: 48 }, (_, index) => {
    const open = 64000 + index * 25;
    return {
      time: new Date(Date.UTC(2026, 7, 1, index)).toISOString(),
      open,
      high: open + 80,
      low: open - 60,
      close: open + 40,
      volume: 100 + index,
    };
  });

  return {
    symbol: "BTC",
    interval: "1h",
    intervalLabel: "1 Hour",
    source: "tatum-ohlcv-batch",
    rateSource: "coingecko",
    points,
    analysis: {
      candleCount: 48,
      signal: { label: "bullish", score: 3, confidence: 75 },
      price: {
        current: points.at(-1).close,
        changePercent: 1.91,
        high: points.at(-1).high,
        low: points[0].low,
        volume: 5928,
      },
      indicators: {
        sma20: 64820,
        ema20: 64880,
        rsi14: 62.4,
        stochastic14: 71.2,
        atr14: 140,
        vwap: 64610,
        macd: { value: 32.4, signal: 28.1, histogram: 4.3 },
        bollinger: {
          upper: 65300,
          middle: 64820,
          lower: 64340,
          widthPercent: 1.48,
        },
      },
      levels: { support: 64300, resistance: 65350 },
    },
  };
}

async function run() {
  const runtime = await startAppIfNeeded();
  const executablePath = findBrowserExecutable();
  assert.ok(
    executablePath,
    "No supported Chromium or Edge executable was found",
  );
  let browser;

  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="toggle-register"]').click();

    const timestamp = Date.now();
    const email = `ui-${timestamp}@example.com`;
    await page
      .locator('#registerForm input[name="username"]')
      .fill(`ui${timestamp}`);
    await page.locator('#registerForm input[name="email"]').fill(email);
    await page
      .locator('#registerForm input[name="password"]')
      .fill("Passw0rd!UiSmoke");
    await page.locator('#registerForm button[type="submit"]').click();
    await page.waitForFunction(
      (registeredEmail) =>
        document
          .getElementById("sessionStatus")
          ?.textContent?.includes(registeredEmail),
      email,
      { timeout: 20000 },
    );

    const token = await page.evaluate(() => localStorage.getItem("token"));
    assert.ok(token);
    await page.waitForFunction(
      () =>
        document.getElementById("wsStatus")?.textContent === "Realtime: live",
      null,
      { timeout: 10000 },
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      (registeredEmail) =>
        document
          .getElementById("sessionStatus")
          ?.textContent?.includes(registeredEmail),
      email,
      { timeout: 20000 },
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("token")),
      token,
    );

    const dashboardTabs = page.locator(".dashboard-tab");
    const dashboardTabCount = await dashboardTabs.count();
    assert.equal(dashboardTabCount, 37);
    assert.equal(
      await page.locator('.dashboard-tab[aria-selected="true"]').count(),
      1,
    );
    assert.equal(await page.locator('.dashboard-tab[tabindex="0"]').count(), 1);

    for (let index = 0; index < dashboardTabCount; index += 1) {
      const tab = dashboardTabs.nth(index);
      const panelId = await tab.getAttribute("data-section-target");
      assert.ok(panelId, `Dashboard tab ${index} has no panel target`);
      await tab.click();
      await page.locator(`#${panelId}`).waitFor({ state: "visible" });
    }

    await dashboardTabs.first().focus();
    await page.keyboard.press("End");
    await page.locator("#assistantPanel").waitFor({ state: "visible" });
    assert.equal(
      await dashboardTabs.last().getAttribute("aria-selected"),
      "true",
    );
    await page.keyboard.press("Home");
    await page.locator("#marketsPanel").waitFor({ state: "visible" });
    assert.equal(
      await dashboardTabs.first().getAttribute("aria-selected"),
      "true",
    );

    let chartAuthorization = "";
    await page.route("**/api/chart/series?*", (route) => {
      chartAuthorization = route.request().headers().authorization || "";
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildChartFixture()),
      });
    });
    await page
      .locator('.dashboard-tab[data-section-target="chartsPanel"]')
      .click();
    await page.locator("#chartCoinInput").selectOption("BTC");
    await page.locator("#chartIntervalSelect").selectOption("1h");
    await page.locator('[data-action="load-chart"]').click();
    await page.getByText("BULLISH", { exact: true }).waitFor();
    assert.ok(
      chartAuthorization.startsWith("Bearer "),
      "Chart request is missing bearer auth",
    );
    assert.match(
      await page.locator("#chartSourceStatus").textContent(),
      /Tatum live OHLCV/,
    );
    assert.equal(await page.locator("#chartDataResult tbody tr").count(), 20);
    const chartSize = await page
      .locator("#advancedMarketChart")
      .evaluate((canvas) => ({
        width: canvas.width,
        height: canvas.height,
      }));
    assert.ok(chartSize.width > 0 && chartSize.height > 0);

    await page.locator('[data-analysis-tab="momentum"]').click();
    await page.getByText("RSI (14)", { exact: true }).waitFor();
    await page.locator('[data-analysis-tab="volatility"]').click();
    await page.getByText("ATR (14)", { exact: true }).waitFor();

    await assertNoPageOverflow(page, "desktop");
    const desktopScreenshot = path.join(
      os.tmpdir(),
      "atlasx-ui-smoke-desktop.png",
    );
    await page.screenshot({ path: desktopScreenshot, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator('.dashboard-tab[data-section-target="chartsPanel"]')
      .click();
    await assertNoPageOverflow(page, "mobile");
    const mobileScreenshot = path.join(
      os.tmpdir(),
      "atlasx-ui-smoke-mobile.png",
    );
    await page.screenshot({ path: mobileScreenshot, fullPage: true });

    assert.deepEqual(
      pageErrors,
      [],
      `Browser page errors: ${pageErrors.join("; ")}`,
    );
    console.log(
      JSON.stringify(
        {
          dashboardTabs: dashboardTabCount,
          sessionRestored: true,
          realtimeAuthenticated: true,
          chartCandles: 48,
          desktopScreenshot,
          mobileScreenshot,
          pageErrors: pageErrors.length,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopApp(runtime.process);
    removeTestDatabase(runtime.databasePath);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
