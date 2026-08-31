const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright-core");

const baseUrl = process.env.APP_URL || "http://localhost:4000";
const edgePath =
  process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function resolveBrowserLaunchOptions() {
  const preferredPath = process.env.CHROMIUM_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (preferredPath && fs.existsSync(preferredPath)) {
    return { headless: true, executablePath: preferredPath };
  }

  if (process.platform === "win32" && fs.existsSync(edgePath)) {
    return { headless: true, executablePath: edgePath };
  }

  if (process.platform === "linux") {
    const linuxCandidates = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/snap/bin/chromium",
    ];
    const linuxPath = linuxCandidates.find((candidate) => fs.existsSync(candidate));
    if (linuxPath) {
      return { headless: true, executablePath: linuxPath };
    }
  }

  if (process.platform === "darwin") {
    const macCandidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    const macPath = macCandidates.find((candidate) => fs.existsSync(candidate));
    if (macPath) {
      return { headless: true, executablePath: macPath };
    }
  }

  return { headless: true };
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

  return {
    label,
    hasOverflow: dimensions.scrollWidth > dimensions.clientWidth + 1,
    ...dimensions,
  };
}

async function run() {
  const serverProcess = await startAppIfNeeded();
  let browser;

  try {
    try {
      browser = await chromium.launch(resolveBrowserLaunchOptions());
    } catch (launchError) {
      const launchMessage = String(launchError?.message || "");
      const browserUnavailable =
        launchError?.name === "ExecutableDoesNotExistError" ||
        launchMessage.includes("Executable doesn't exist") ||
        launchMessage.includes("browserType.launch:") ||
        launchMessage.includes("download new browsers");
      if (browserUnavailable) {
        console.log("UI smoke skipped: no Playwright-compatible browser executable found.");
        return;
      }
      throw launchError;
    }

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="toggle-register"]').click();

    const timestamp = Date.now();
    await page.locator('#registerForm input[name="username"]').fill(`ui${timestamp}`);
    await page.locator('#registerForm input[name="email"]').fill(`ui-${timestamp}@example.com`);
    await page.locator('#registerForm input[name="password"]').fill("Passw0rd!UiSmoke");
    await page.locator('#registerForm button[type="submit"]').click();

    await page.waitForFunction(() => {
      const node = document.getElementById("sessionStatus");
      return node && !node.textContent.includes("signed out");
    }, { timeout: 20000 });

    const sessionToken = await page.evaluate(() => localStorage.getItem("token"));
    assert.ok(sessionToken, "Expected token to be stored after registration");

    const dashboardTabs = page.locator(".dashboard-tab");
    const dashboardTabCount = await dashboardTabs.count();
    assert.ok(dashboardTabCount >= 20, `Expected many dashboard tabs, got ${dashboardTabCount}`);

    const smokeTargets = ["marketsPanel", "paymentPanel", "hardhatPanel", "assistantPanel", "copyTradingPanel"];
    for (const target of smokeTargets) {
      await page.locator(`.dashboard-tab[data-section-target="${target}"]`).first().click();
      await page.locator(`#${target}.dashboard-section.active`).waitFor({ state: "visible" });
    }

    const desktopOverflow = await assertNoPageOverflow(page, "desktop");
    assert.ok(
      !desktopOverflow.hasOverflow,
      `desktop page overflows horizontally: ${desktopOverflow.scrollWidth}px > ${desktopOverflow.clientWidth}px`
    );
    const desktopScreenshot = path.join(os.tmpdir(), "atlasx-ui-smoke-desktop.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.dashboard-tab[data-section-target="overviewPanel"]').first().click();
    const mobileOverflow = await assertNoPageOverflow(page, "mobile");
    assert.ok(
      !mobileOverflow.hasOverflow,
      `mobile page overflows horizontally: ${mobileOverflow.scrollWidth}px > ${mobileOverflow.clientWidth}px`
    );
    const mobileScreenshot = path.join(os.tmpdir(), "atlasx-ui-smoke-mobile.png");
    await page.screenshot({ path: mobileScreenshot, fullPage: true });

    assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join("; ")}`);
    console.log(
      JSON.stringify(
        {
          dashboardTabs: dashboardTabCount,
          sessionTokenPresent: true,
          desktopOverflow,
          mobileOverflow,
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
