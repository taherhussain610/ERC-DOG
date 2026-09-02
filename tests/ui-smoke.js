const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright-core");

const baseUrl = process.env.APP_URL || "http://localhost:4000";
const browserPath = process.env.EDGE_PATH || process.env.CHROMIUM_PATH || "/usr/bin/chromium";

async function isAppReady() {
  try {
    return (await fetch(`${baseUrl}/api/health`)).ok;
  } catch {
    return false;
  }
}

async function startAppIfNeeded() {
  if (await isAppReady()) {
    return null;
  }

  assert.equal(process.env.APP_URL, undefined, `Application is not running at ${baseUrl}`);
  const serverProcess = spawn(process.execPath, ["src/server.js"], {
    cwd: path.join(__dirname, ".."),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  serverProcess.stdout.on("data", (chunk) => {
    output += chunk;
  });
  serverProcess.stderr.on("data", (chunk) => {
    output += chunk;
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await isAppReady()) {
      return serverProcess;
    }
    if (serverProcess.exitCode !== null) {
      throw new Error(`Application exited during startup.\n${output}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  serverProcess.kill();
  throw new Error(`Application did not become ready.\n${output}`);
}

async function stopApp(serverProcess) {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }
  serverProcess.kill();
  await new Promise((resolve) => serverProcess.once("exit", resolve));
}

async function assertNoOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `${label} overflows horizontally: ${dimensions.scrollWidth}px > ${dimensions.clientWidth}px`
  );
}

async function run() {
  const serverProcess = await startAppIfNeeded();
  let browser;

  try {
    browser = await chromium.launch({ executablePath: browserPath, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-action="toggle-register"]').click();
    const stamp = Date.now();
    await page.locator('#registerForm input[name="email"]').fill(`ui-${stamp}@example.com`);
    await page.locator('#registerForm input[name="username"]').fill(`ui${stamp}`);
    await page.locator('#registerForm input[name="password"]').fill("Passw0rd!UiSmoke");
    await page.locator('#registerForm button[type="submit"]').click();
    await page.locator("#authPanel").waitFor({ state: "hidden", timeout: 20000 });

    assert.ok(await page.evaluate(() => localStorage.getItem("token")));
    assert.match(await page.locator("#sessionStatus").textContent(), /^Session: /);

    const navLinks = page.locator(".nav-link");
    const navCount = await navLinks.count();
    assert.ok(navCount >= 30, `Expected integrated tools, found ${navCount}`);
    for (let index = 0; index < navCount; index += 1) {
      const link = navLinks.nth(index);
      const panelId = await link.getAttribute("data-section-target");
      assert.ok(await page.locator(`#${panelId}`).count(), `Missing panel ${panelId}`);
      await link.click();
      await page.locator(`#${panelId}`).waitFor({ state: "visible" });
    }

    await page.locator("#navFilter").fill("wallet");
    assert.equal(await page.locator(".nav-link:visible").count(), 1);
    await page.locator("#navFilter").fill("");

    const sidebarToggle = page.locator('[data-action="toggle-sidebar"]');
    await sidebarToggle.click();
    assert.equal(await page.locator("body").getAttribute("class"), "sidebar-collapsed");
    assert.equal(await sidebarToggle.getAttribute("aria-expanded"), "false");
    await assertNoOverflow(page, "Desktop");

    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow(page, "Mobile");
    assert.deepEqual(pageErrors, [], `Browser errors: ${pageErrors.join("; ")}`);

    console.log(JSON.stringify({ navCount, authenticated: true, responsive: true }, null, 2));
  } finally {
    await browser?.close();
    await stopApp(serverProcess);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
