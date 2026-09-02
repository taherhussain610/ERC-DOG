const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function resolvePort() {
  const envPath = path.join(__dirname, "..", ".env");
  let port = 4000;

  if (!fs.existsSync(envPath)) {
    return port;
  }

  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(/^PORT=(\d+)$/m);
  if (!match) {
    return port;
  }

  const parsed = Number(match[1]);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
    port = parsed;
  }

  return port;
}

function stopOnWindows(port) {
  const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"]
  });

  const lines = output.split(/\r?\n/).filter(Boolean);
  const pids = new Set();

  for (const line of lines) {
    if (!line.includes("LISTENING")) {
      continue;
    }

    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }

  if (pids.size === 0) {
    return 0;
  }

  for (const pid of pids) {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    console.log(`Stopped process ${pid} on port ${port}`);
  }

  return pids.size;
}

function main() {
  const port = resolvePort();

  try {
    if (process.platform === "win32") {
      const stopped = stopOnWindows(port);
      if (stopped === 0) {
        console.log(`No listening process found on port ${port}`);
      }
      return;
    }

    const pid = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
    if (!pid) {
      console.log(`No listening process found on port ${port}`);
      return;
    }
    execSync(`kill -9 ${pid}`);
    console.log(`Stopped process ${pid} on port ${port}`);
  } catch {
    console.log(`No listening process found on port ${port}`);
  }
}

main();
