const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const baseUrl = process.env.APP_URL || "http://localhost:4000";
const browserOptions = {
  headless: true,
  ...(process.env.EDGE_PATH ? { executablePath: process.env.EDGE_PATH } : {}),
};

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
    return null;
  }

  assert.equal(
    process.env.APP_URL,
    undefined,
    `Application is not running at configured APP_URL ${baseUrl}`
  );

  const appRoot = path.join(__dirname, "..");
  const serverProcess = spawn(process.execPath, ["src/server.js"], {
    cwd: appRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isAppReady()) {
      return serverProcess;
    }
    if (serverProcess.exitCode !== null) {
      throw new Error(`Application exited during startup.\n${serverOutput}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  serverProcess.kill();
  throw new Error(`Application did not become ready at ${baseUrl}.\n${serverOutput}`);
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

async function assertNoPageOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} page overflows horizontally: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`
  );
}

async function run() {
  const serverProcess = await startAppIfNeeded();
  let browser;

  try {
    browser = await chromium.launch(browserOptions);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Create account" }).click();

    const timestamp = Date.now();
    await page.locator('#registerForm input[name="username"]').fill(`ui${timestamp}`);
    await page.locator('#registerForm input[name="email"]').fill(`ui-${timestamp}@example.com`);
    await page.locator('#registerForm input[name="password"]').fill("Passw0rd!UiSmoke");
    await page.locator('#registerForm button[type="submit"]').click();
    await page.locator("#dashboard").waitFor({ state: "visible", timeout: 20000 });
    await page.getByText("Account created", { exact: true }).waitFor({
      state: "visible",
      timeout: 20000,
    });
    assert.equal(await page.locator("#toast").textContent(), "Account created");

    const sessionKeys = await page.evaluate(() => ({
      canonical: localStorage.getItem("atlasx_token"),
      compatibility: localStorage.getItem("token"),
    }));
    assert.ok(sessionKeys.canonical);
    assert.equal(sessionKeys.compatibility, sessionKeys.canonical);
    await page.locator("#toast").waitFor({ state: "hidden" });

    await page.route("**/api/rates", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"Unavailable"}',
      })
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#dashboard").waitFor({ state: "visible", timeout: 20000 });
    const restoredSession = await page.evaluate(() => ({
      canonical: localStorage.getItem("atlasx_token"),
      compatibility: localStorage.getItem("token"),
    }));
    assert.deepEqual(restoredSession, sessionKeys);
    assert.match(await page.locator("#sessionStatus").textContent(), /^Authenticated as /);
    await page.unroute("**/api/rates");

    const dashboardTabs = page.locator(".dashboard-tab");
    const dashboardTabCount = await dashboardTabs.count();
    assert.ok(dashboardTabCount >= 16);
    assert.equal(await page.locator('.dashboard-tab[aria-selected="true"]').count(), 1);
    assert.equal(await page.locator('.dashboard-tab[tabindex="0"]').count(), 1);

    await page.route("**/api/hardhat/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rpcUrl: "http://127.0.0.1:8545",
          node: { online: false, chainId: null, blockNumber: null, accountCount: 0 },
          compiler: { version: "0.8.28", artifactAvailable: true },
          deployment: null,
          staleDeployment: false,
        }),
      })
    );

    for (let index = 0; index < dashboardTabCount; index += 1) {
      const tab = dashboardTabs.nth(index);
      const panelId = await tab.getAttribute("data-section-target");
      await tab.click();
      await page.locator(`#${panelId}`).waitFor({ state: "visible" });
    }

    await page.locator('.dashboard-tab[data-section-target="hardhatPanel"]').click();
    await page.locator('[data-action="hardhat-check-node"]').click();
    await page.locator("#hardhatDeployLog").getByText("Hardhat node status", { exact: true }).waitFor();
    assert.match(await page.locator("#hardhatDeployLog").textContent(), /online.*false/i);

    await dashboardTabs.last().click();
    await page.locator("#pluginPanel").waitFor({ state: "visible" });
    assert.equal(await dashboardTabs.last().getAttribute("aria-selected"), "true");

    const customApiKey = `smoke-api-${timestamp}`;
    const unsafeApiCategory = "<b data-api-injection>Unsafe</b>";
    const unsafeApiDescription = '<em data-api-description="true">Unsafe Description</em>';
    await page.locator("#customApiKey").fill(customApiKey);
    await page.locator("#customApiRoute").fill("/api/health");
    await page.locator("#customApiCategory").fill(unsafeApiCategory);
    await page.locator("#customApiDescription").fill(unsafeApiDescription);
    await page.locator("#saveCustomApiBtn").click();
    await page.getByText("Custom plugin API saved", { exact: true }).waitFor({
      state: "visible",
      timeout: 20000,
    });
    const customApiRow = page.locator(`#apiTableBody tr[data-api-key="${customApiKey}"]`);
    await customApiRow.waitFor({ state: "visible" });
    const customApiText = await customApiRow.textContent();
    assert.ok(customApiText.includes(unsafeApiCategory));
    assert.ok(customApiText.includes(unsafeApiDescription));
    assert.equal(await customApiRow.locator("[data-api-injection]").count(), 0);
    assert.equal(await customApiRow.locator("[data-api-description]").count(), 0);
    await page.locator("#deleteSelectedCustomApiBtn").click();
    await page.getByText("Custom plugin API deleted", { exact: true }).waitFor({
      state: "visible",
      timeout: 20000,
    });
    assert.equal(await customApiRow.count(), 0);
    await page.locator("#toast").waitFor({ state: "hidden" });

    await page.locator('.dashboard-tab[data-section-target="overviewPanel"]').click();
    await page.locator("#overviewPanel").waitFor({ state: "visible" });
    assert.equal(
      await page.locator('.dashboard-tab[data-section-target="overviewPanel"]').getAttribute("aria-selected"),
      "true"
    );

    await page.locator('.dashboard-tab[data-section-target="metatraderPanel"]').click();
    await page.locator("#mtAccountInfo").waitFor({ state: "visible" });
    assert.match(await page.locator("#mtAccountInfo").textContent(), /Connection idle|MetaTrader account|not configured/i);
    const passiveToastVisible = await page.locator("#toast").isVisible();
    const passiveToastText = await page.locator("#toast").textContent();
    assert.equal(
      passiveToastVisible,
      false,
      `Passive dashboard navigation displayed a toast: ${passiveToastText}`
    );

    await page.locator('.dashboard-tab[data-section-target="paymentPanel"]').click();
    await page.locator("#pgAmount").fill("25.50");
    await page.locator('[data-action="pg-submit"]').click();
    await page.getByText("Card Payment created", { exact: true }).waitFor({
      state: "visible",
      timeout: 20000,
    });
    const paymentRow = page.locator("#paymentHistoryBody tr").first();
    await paymentRow.waitFor({ state: "visible" });
    assert.match(await paymentRow.textContent(), /25\.50|25\.5/);

    await page.locator('.dashboard-tab[data-section-target="p2pPanel"]').click();
    await page.locator("#createP2POrderForm").waitFor({ state: "visible" });
    await page.locator('.dashboard-tab[data-section-target="p2pOrdersPanel"]').click();
    await page.locator("#p2pMyOrdersBody").waitFor({ state: "visible" });

    await page.locator('.dashboard-tab[data-section-target="copyTradingPanel"]').click();
    const unsafeTraderName = '<strong data-copy-injection="true">Unsafe Trader</strong>';
    await page.locator('#copyTraderRegisterForm input[name="displayName"]').fill(unsafeTraderName);
    await page.locator('#copyTraderRegisterForm button[type="submit"]').click();
    await page.getByText("Registered as signal provider!", { exact: true }).waitFor({
      state: "visible",
      timeout: 20000,
    });
    await page.locator("#followingTradersBody").waitFor({ state: "visible" });

    await page.locator('.dashboard-tab[data-section-target="predictionPanel"]').click();
    await page.locator('[data-action="place-prediction"]').first().click();
    await page.locator("#predictionPositionsBody").waitFor({ state: "visible" });
    assert.match(await page.locator("#predictionPositionsBody").textContent(), /No prediction positions|btc-weekly|submitted|queued locally/i);
    await page.locator("#predictionLeaderboardBody").waitFor({ state: "visible" });

    await assertNoPageOverflow(page, "desktop");
    const desktopScreenshot = path.join(os.tmpdir(), "atlasx-ui-smoke-desktop.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.dashboard-tab[data-section-target="overviewPanel"]').click();
    await assertNoPageOverflow(page, "mobile");
    const mobileScreenshot = path.join(os.tmpdir(), "atlasx-ui-smoke-mobile.png");
    await page.screenshot({ path: mobileScreenshot, fullPage: true });

    assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join("; ")}`);
    console.log(
      JSON.stringify(
        {
          dashboardTabs: dashboardTabCount,
          sessionSynchronized: true,
          desktopScreenshot,
          mobileScreenshot,
          pageErrors: pageErrors.length,
        },
        null,
        2
      )
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    await stopApp(serverProcess);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
