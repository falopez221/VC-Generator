import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const settingsText = fs.readFileSync(path.join(root, "local-settings.json"), "utf8").replace(/^\uFEFF/, "");
const settings = JSON.parse(settingsText);
const port = Number(settings.port) || 34731;
const host = "127.0.0.1";
const url = `http://${host}:${port}/app`;
const runtime = path.join(root, "runtime", "node.exe");
const localServer = path.join(root, "local-server.mjs");
const pidFile = path.join(root, "server.pid");
const logsDir = path.join(root, "logs");

function probe() {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 800 }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on("timeout", () => { request.destroy(); resolve(false); });
    request.on("error", () => resolve(false));
  });
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function main() {
  let ready = await probe();
  if (!ready) {
    fs.mkdirSync(logsDir, { recursive: true });
    const stdout = fs.openSync(path.join(logsDir, "server.log"), "a");
    const stderr = fs.openSync(path.join(logsDir, "server-error.log"), "a");
    const child = spawn(runtime, [localServer], {
      cwd: root,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", stdout, stderr],
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
      },
    });
    child.unref();
    fs.writeFileSync(pidFile, String(child.pid), "utf8");
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await delay(250);
      if (await probe()) { ready = true; break; }
    }
  }

  if (ready && process.env.VG_NO_OPEN !== "1") {
    const opener = spawn("explorer.exe", [url], { detached: true, windowsHide: true, stdio: "ignore" });
    opener.unref();
  }
  if (!ready) process.exitCode = 1;
}

main().catch((error) => {
  fs.mkdirSync(logsDir, { recursive: true });
  fs.appendFileSync(path.join(logsDir, "launcher-error.log"), `${new Date().toISOString()} ${error.stack || error}\n`);
  process.exitCode = 1;
});
