import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const settingsText = fs.readFileSync(path.join(root, "local-settings.json"), "utf8").replace(/^\uFEFF/, "");
const settings = JSON.parse(settingsText);
const host = "127.0.0.1";
const publicPort = Number(settings.port) || 34731;
const internalPort = publicPort + 1;
const runtime = path.join(root, "runtime", "node.exe");
const serverEntry = path.join(root, "app", "server.js");
const logsDir = path.join(root, "logs");

fs.mkdirSync(logsDir, { recursive: true });
const stdout = fs.openSync(path.join(logsDir, "server.log"), "a");
const stderr = fs.openSync(path.join(logsDir, "server-error.log"), "a");
const nextServer = spawn(runtime, [serverEntry], {
  cwd: path.join(root, "app"),
  windowsHide: true,
  stdio: ["ignore", stdout, stderr],
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: host,
    PORT: String(internalPort),
    NEXT_TELEMETRY_DISABLED: "1",
    VG_OWNER_EMAIL: settings.localUserEmail,
  },
});
fs.writeFileSync(path.join(root, "next-server.pid"), String(nextServer.pid), "utf8");

const proxy = http.createServer((request, response) => {
  const headers = {
    ...request.headers,
    host: `${host}:${internalPort}`,
    "oai-authenticated-user-email": settings.localUserEmail,
    "oai-authenticated-user-full-name": encodeURIComponent(settings.localUserName),
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  };
  const upstream = http.request({ host, port: internalPort, path: request.url, method: request.method, headers }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(503, { "content-type": "text/plain; charset=utf-8", "retry-after": "1" });
    response.end("Venture Governance Local is starting.");
  });
  request.pipe(upstream);
});

proxy.listen(publicPort, host);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  proxy.close();
  if (!nextServer.killed) nextServer.kill();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
nextServer.on("exit", (code) => {
  if (shuttingDown) return;
  shuttingDown = true;
  proxy.close(() => process.exit(code || 1));
});
