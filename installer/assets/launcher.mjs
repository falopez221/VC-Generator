import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  LOCAL_HEALTH_PATH,
  LOOPBACK_HOST,
  createRestrictedChildEnv,
  isMatchingLocalInstanceResponse,
  parseLocalInstanceToken,
  parsePublicPort,
} from "./local-proxy-security.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const settingsText = fs.readFileSync(path.join(root, "local-settings.json"), "utf8").replace(/^\uFEFF/, "");
const settings = JSON.parse(settingsText);
const port = parsePublicPort(settings.port);
const localInstanceToken = parseLocalInstanceToken(settings.localInstanceToken);
const host = LOOPBACK_HOST;
const url = `http://${host}:${port}/app`;
const runtime = path.join(root, "runtime", "node.exe");
const localServer = path.join(root, "local-server.mjs");
const pidFile = path.join(root, "server.pid");
const logsDir = path.join(root, "logs");

function probe() {
  return new Promise((resolve) => {
    const request = http.get({
      host,
      port,
      path: LOCAL_HEALTH_PATH,
      headers: {
        host: `${host}:${port}`,
        "x-vg-local-instance": localInstanceToken,
      },
      timeout: 800,
    }, (response) => {
      response.resume();
      resolve(isMatchingLocalInstanceResponse(
        response.statusCode,
        response.headers["x-vg-local-instance"],
        localInstanceToken,
      ));
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
      env: createRestrictedChildEnv(process.env, {
        NEXT_TELEMETRY_DISABLED: "1",
        VG_LOCAL_INSTALL_MODE: "1",
        VG_LOCAL_BIND_ADDRESS: host,
      }),
    });
    child.unref();
    fs.writeFileSync(pidFile, String(child.pid), "utf8");
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await delay(250);
      if (await probe()) { ready = true; break; }
    }
  }

  if (ready && process.env.VG_NO_OPEN !== "1") {
    const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR;
    if (!windowsRoot || !path.win32.isAbsolute(windowsRoot)) throw new Error("The Windows directory could not be resolved.");
    const explorer = path.join(windowsRoot, "explorer.exe");
    const opener = spawn(explorer, [url], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
      env: createRestrictedChildEnv(process.env),
    });
    opener.unref();
  }
  if (!ready) process.exitCode = 1;
}

main().catch((error) => {
  fs.mkdirSync(logsDir, { recursive: true });
  fs.appendFileSync(path.join(logsDir, "launcher-error.log"), `${new Date().toISOString()} ${error.stack || error}\n`);
  process.exitCode = 1;
});
