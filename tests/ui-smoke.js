const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const baseUrl = process.env.APP_URL || "http://localhost:4000";
const browserCandidates = {
  linux: [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/microsoft-edge",
  ],
  darwin: [
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ],
  win32: [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

function resolveBrowserPath() {
  const candidates = process.env.EDGE_PATH
    ? [process.env.EDGE_PATH]
    : browserCandidates[process.platform] || [];
  const browserPath = candidates.find((candidate) => fs.existsSync(candidate));
  assert.ok(
    browserPath,
    `No Chromium-compatible browser found. Set EDGE_PATH to an installed browser executable.`,
  );
  return browserPath;
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
    return null;
  }

  assert.equal(
    process.env.APP_URL,
    undefined,
    `Application is not running at configured APP_URL ${baseUrl}`,
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

async function run() {
  const serverProcess = await startAppIfNeeded();
  let browser;

  try {
    browser = await chromium.launch({
      executablePath: resolveBrowserPath(),
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("tab", { name: "Register" }).click();

    const timestamp = Date.now();
    await page
      .locator('#registerForm input[name="username"]')
      .fill(`ui${timestamp}`);
    await page
      .locator('#registerForm input[name="email"]')
      .fill(`ui-${timestamp}@example.com`);
    await page
      .locator('#registerForm input[name="password"]')
      .fill("Passw0rd!UiSmoke");
    await page.locator('#registerForm button[type="submit"]').click();
    await page
      .locator("#dashboard")
      .waitFor({ state: "visible", timeout: 20000 });
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
      }),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .locator("#dashboard")
      .waitFor({ state: "visible", timeout: 20000 });
    const restoredSession = await page.evaluate(() => ({
      canonical: localStorage.getItem("atlasx_token"),
      compatibility: localStorage.getItem("token"),
    }));
    assert.deepEqual(restoredSession, sessionKeys);
    assert.match(
      await page.locator("#sessionStatus").textContent(),
      /^Authenticated as /,
    );
    await page.unroute("**/api/rates");

    const dashboardTabs = page.locator(".dashboard-tab");
    const dashboardTabCount = await dashboardTabs.count();
    assert.equal(dashboardTabCount, 36);
    assert.equal(
      await page.locator('.dashboard-tab[aria-selected="true"]').count(),
      1,
    );
    assert.equal(await page.locator('.dashboard-tab[tabindex="0"]').count(), 1);

    await page.route("**/api/hardhat/status", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rpcUrl: "http://127.0.0.1:8545",
          node: {
            online: false,
            chainId: null,
            blockNumber: null,
            accountCount: 0,
          },
          compiler: { version: "0.8.28", artifactAvailable: true },
          deployment: null,
          staleDeployment: false,
        }),
      }),
    );

    for (let index = 0; index < dashboardTabCount; index += 1) {
      const tab = dashboardTabs.nth(index);
      const panelId = await tab.getAttribute("data-section-target");
      await tab.click();
      await page.locator(`#${panelId}`).waitFor({ state: "visible" });
    }

    await page
      .locator('.dashboard-tab[data-section-target="hardhatPanel"]')
      .click();
    await page
      .locator("#hardhatStatus")
      .getByText("Offline", { exact: true })
      .waitFor();
    assert.equal(await page.locator("#hardhatCompileBtn").isEnabled(), true);
    assert.equal(await page.locator("#hardhatDeployBtn").isDisabled(), true);

    await dashboardTabs.first().focus();
    await page.keyboard.press("End");
    await page.locator("#assistantPanel").waitFor({ state: "visible" });
    assert.equal(
      await dashboardTabs.last().getAttribute("aria-selected"),
      "true",
    );
    assert.equal(await dashboardTabs.last().getAttribute("tabindex"), "0");

    await page
      .locator('.dashboard-tab[data-section-target="apiKeysPanel"]')
      .click();
    await page.locator("#apiKeyName").fill(`smoke-key-${timestamp}`);
    await page.locator('[data-action="create-api-key"]').click();
    await page.getByText("API key generated", { exact: true }).waitFor({
      state: "visible",
      timeout: 20000,
    });
    await page.locator("#apiKeysBody tr").first().waitFor({ state: "visible" });
    await page.locator("#toast").waitFor({ state: "hidden" });

    await dashboardTabs.last().focus();
    await page.keyboard.press("Home");
    await page.locator("#overviewPanel").waitFor({ state: "visible" });
    assert.equal(
      await dashboardTabs.first().getAttribute("aria-selected"),
      "true",
    );

    await page
      .locator('.dashboard-tab[data-section-target="metatraderPanel"]')
      .click();
    await page.waitForFunction(() => {
      const status = document.getElementById("mt5ConnectionStatus");
      return status && status.textContent !== "Checking...";
    });
    assert.match(
      await page.locator("#mt5ConnectionStatus").textContent(),
      /^(Connected|Not configured|Unavailable)$/,
    );
    const passiveToastVisible = await page.locator("#toast").isVisible();
    const passiveToastText = await page.locator("#toast").textContent();
    assert.equal(
      passiveToastVisible,
      false,
      `Passive dashboard navigation displayed a toast: ${passiveToastText}`,
    );

    await page
      .locator('.dashboard-tab[data-section-target="paymentPanel"]')
      .click();
    await page.locator("#cardNumber").fill("4532 0151 1283 0366");
    await page.locator("#expiryDate").fill("12/29");
    await page.locator("#cvv").fill("123");
    await page.locator("#cardholderName").fill("UI TEST USER");
    await page.locator("#paymentAmount").fill("25.50");
    await page.locator("#paymentTerminalForm button[type=submit]").click();
    await page
      .getByText("Payment processed successfully", { exact: true })
      .waitFor({
        state: "visible",
        timeout: 20000,
      });
    const paymentRow = page.locator("#paymentTransactionsBody tr").first();
    await paymentRow.waitFor({ state: "visible" });
    assert.match(await paymentRow.textContent(), /453201\*+0366/);
    assert.doesNotMatch(await paymentRow.textContent(), /4532015112830366/);
    page.once("dialog", (dialog) => dialog.accept());
    await paymentRow.locator(".refund-btn").click();
    await page
      .getByText("Refund processed successfully", { exact: true })
      .waitFor({
        state: "visible",
        timeout: 20000,
      });
    await page.waitForFunction(() => {
      const row = document.querySelector("#paymentTransactionsBody tr");
      return row?.textContent?.includes("refunded");
    });

    await page
      .locator('.dashboard-tab[data-section-target="p2pPanel"]')
      .click();
    await page.locator('[data-p2p-tab="my-orders"]').click();
    await page.locator("#createP2POrderForm").waitFor({ state: "visible" });
    await page.locator("#p2pMyOrdersBody").waitFor({ state: "visible" });

    await page
      .locator('.dashboard-tab[data-section-target="copyTradingPanel"]')
      .click();
    const unsafeTraderName =
      '<strong data-copy-injection="true">Unsafe Trader</strong>';
    await page.locator('[data-copy-tab="become-trader"]').click();
    assert.equal(
      await page
        .locator('[data-copy-tab="become-trader"]')
        .getAttribute("aria-selected"),
      "true",
    );
    await page.locator("#copyBecomeTraderTab").waitFor({ state: "visible" });
    await page
      .locator('#becomeTraderForm input[name="displayName"]')
      .fill(unsafeTraderName);
    await page
      .locator('#becomeTraderForm textarea[name="strategy"]')
      .fill("Smoke strategy");
    await page.locator('#becomeTraderForm button[type="submit"]').click();
    await page
      .getByText("Registered as signal provider!", { exact: true })
      .waitFor({
        state: "visible",
        timeout: 20000,
      });
    await page.locator('[data-copy-tab="traders"]').click();
    await page
      .locator("#topTradersBody td")
      .filter({ hasText: unsafeTraderName })
      .first()
      .waitFor({ state: "visible" });
    assert.equal(
      await page.locator("#topTradersBody [data-copy-injection]").count(),
      0,
    );
    await page.locator('[data-copy-tab="following"]').click();
    await page.locator("#copyFollowingTab").waitFor({ state: "visible" });

    await page
      .locator('.dashboard-tab[data-section-target="predictionPanel"]')
      .click();
    let predictionDialogType;
    page.once("dialog", async (dialog) => {
      predictionDialogType = dialog.type();
      await dialog.dismiss();
    });
    await page.locator('[data-action="place-prediction"]').first().click();
    assert.equal(predictionDialogType, "prompt");
    await page.locator('[data-pred-tab="positions"]').click();
    await page
      .locator("#predictionPositionsBody")
      .waitFor({ state: "visible" });
    await page.locator('[data-pred-tab="leaderboard"]').click();
    await page
      .locator("#predictionLeaderboardBody")
      .waitFor({ state: "visible" });

    await assertNoPageOverflow(page, "desktop");
    const desktopScreenshot = path.join(
      os.tmpdir(),
      "atlasx-ui-smoke-desktop.png",
    );
    await page.screenshot({ path: desktopScreenshot, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .locator('.dashboard-tab[data-section-target="overviewPanel"]')
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
          sessionSynchronized: true,
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
    await stopApp(serverProcess);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
