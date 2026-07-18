import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  BLOCKED_CLIENT_FORWARDING_HEADERS,
  LOCAL_HEALTH_PATH,
  LOCAL_UPSTREAM_HEALTH_PATH,
  LOOPBACK_HOST,
  MAX_ACTIVE_LOCAL_PROXY_REQUESTS,
  MAX_LOCAL_PROXY_BODY_BYTES,
  MAX_LOCAL_PROXY_CONNECTIONS,
  createRestrictedChildEnv,
  isAllowedLoopbackHost,
  isLocalUpstreamHealthTarget,
  isRejectedCrossSiteWrite,
  isSafeOriginFormTarget,
  parseLocalInstanceToken,
  parsePublicPort,
} from "./local-proxy-security.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const settingsText = fs.readFileSync(path.join(root, "local-settings.json"), "utf8").replace(/^\uFEFF/, "");
const settings = JSON.parse(settingsText);
const host = LOOPBACK_HOST;
const publicPort = parsePublicPort(settings.port);
const localInstanceToken = parseLocalInstanceToken(settings.localInstanceToken);
if (typeof settings.localUserEmail !== "string" || settings.localUserEmail.length > 254 ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.invalid$/.test(settings.localUserEmail)) {
  throw new Error("local-settings.json contains an invalid local user email.");
}
if (typeof settings.localUserName !== "string" || settings.localUserName.trim().length < 1 ||
    settings.localUserName.length > 120 || /[\u0000-\u001F\u007F]/.test(settings.localUserName)) {
  throw new Error("local-settings.json contains an invalid local user name.");
}
const internalPort = publicPort + 1;
const runtime = path.join(root, "runtime", "node.exe");
const serverEntry = path.join(root, "app", "server.js");
const logsDir = path.join(root, "logs");
const upstreamSecret = randomBytes(32).toString("hex");

fs.mkdirSync(logsDir, { recursive: true });
const stdout = fs.openSync(path.join(logsDir, "server.log"), "a");
const stderr = fs.openSync(path.join(logsDir, "server-error.log"), "a");
const nextServer = spawn(runtime, [serverEntry], {
  cwd: path.join(root, "app"),
  windowsHide: true,
  stdio: ["ignore", stdout, stderr],
  env: createRestrictedChildEnv(process.env, {
    NODE_ENV: "production",
    HOSTNAME: host,
    PORT: String(internalPort),
    NEXT_TELEMETRY_DISABLED: "1",
    VG_LOCAL_INSTALL_MODE: "1",
    VG_LOCAL_BIND_ADDRESS: host,
    VG_LOCAL_UPSTREAM_SECRET: upstreamSecret,
    VG_OWNER_EMAIL: settings.localUserEmail,
  }),
});
fs.writeFileSync(path.join(root, "next-server.pid"), String(nextServer.pid), "utf8");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function sanitizeHeaders(source, extraBlocked = []) {
  const blocked = new Set([...HOP_BY_HOP_HEADERS, ...extraBlocked]);
  const connection = source.connection;
  const connectionValues = Array.isArray(connection) ? connection : [connection];
  for (const value of connectionValues) {
    if (typeof value !== "string") continue;
    for (const token of value.split(",")) blocked.add(token.trim().toLowerCase());
  }

  const result = {};
  for (const [name, value] of Object.entries(source)) {
    const normalizedName = name.toLowerCase();
    if (!blocked.has(normalizedName) && value !== undefined) result[normalizedName] = value;
  }
  return result;
}

async function readRequestBody(request) {
  const declaredLength = request.headers["content-length"];
  if (declaredLength !== undefined) {
    if (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_LOCAL_PROXY_BODY_BYTES) {
      request.resume();
      const error = new Error("Request body is too large or has an invalid Content-Length.");
      error.statusCode = 413;
      throw error;
    }
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_LOCAL_PROXY_BODY_BYTES) {
      request.destroy();
      const error = new Error("Request body exceeds the local proxy limit.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}

function probeAuthenticatedUpstream() {
  return new Promise((resolve) => {
    const challenge = randomBytes(32).toString("hex");
    const expectedProof = createHmac("sha256", Buffer.from(upstreamSecret, "hex")).update(challenge).digest("hex");
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const request = http.get({
      host,
      port: internalPort,
      path: LOCAL_UPSTREAM_HEALTH_PATH,
      headers: {
        host: `${host}:${internalPort}`,
        "x-vg-upstream-challenge": challenge,
      },
      timeout: 500,
    }, (response) => {
      response.resume();
      const receivedProof = response.headers["x-vg-upstream-proof"];
      const proofMatches = typeof receivedProof === "string" && /^[a-f0-9]{64}$/.test(receivedProof) &&
        timingSafeEqual(Buffer.from(receivedProof, "hex"), Buffer.from(expectedProof, "hex"));
      finish(response.statusCode === 204 && proofMatches);
    });
    request.on("timeout", () => { request.destroy(); finish(false); });
    request.on("error", () => finish(false));
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sendProxyError(response, statusCode, message, retryAfter) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  const headers = {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
    connection: "close",
    "x-content-type-options": "nosniff",
  };
  if (retryAfter) headers["retry-after"] = retryAfter;
  response.writeHead(statusCode, headers);
  response.end(message);
}

let upstreamReady = false;
let activeRequests = 0;
const proxy = http.createServer({
  maxHeaderSize: 16 * 1024,
  headersTimeout: 10_000,
  requestTimeout: 30_000,
  keepAliveTimeout: 5_000,
}, async (request, response) => {
  if (!upstreamReady || nextServer.exitCode !== null || nextServer.signalCode !== null) {
    request.resume();
    sendProxyError(response, 503, "Venture Governance Local is starting.", "1");
    return;
  }
  if (!isAllowedLoopbackHost(request.headers.host, publicPort)) {
    request.resume();
    sendProxyError(response, 400, "Invalid Host header.");
    return;
  }
  if (!isSafeOriginFormTarget(request.url)) {
    request.resume();
    sendProxyError(response, 400, "Invalid request target.");
    return;
  }
  if (isLocalUpstreamHealthTarget(request.url)) {
    request.resume();
    sendProxyError(response, 404, "Not found.");
    return;
  }
  if (request.method === "GET" && request.url === LOCAL_HEALTH_PATH) {
    request.resume();
    if (request.headers["x-vg-local-instance"] !== localInstanceToken) {
      sendProxyError(response, 404, "Not found.");
      return;
    }
    if (!await probeAuthenticatedUpstream() || nextServer.exitCode !== null || nextServer.signalCode !== null) {
      sendProxyError(response, 503, "The local application server failed authenticated readiness.", "1");
      return;
    }
    response.writeHead(204, {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-vg-local-instance": localInstanceToken,
    });
    response.end();
    return;
  }
  if (isRejectedCrossSiteWrite(request.method, request.headers, `http://${host}:${publicPort}`)) {
    request.resume();
    sendProxyError(response, 403, "Cross-site writes are not accepted by the local proxy.");
    return;
  }
  if (activeRequests >= MAX_ACTIVE_LOCAL_PROXY_REQUESTS) {
    request.resume();
    sendProxyError(response, 503, "The local proxy is busy.", "1");
    return;
  }

  activeRequests += 1;
  let released = false;
  const releaseRequest = () => {
    if (released) return;
    released = true;
    activeRequests -= 1;
  };
  response.once("finish", releaseRequest);
  response.once("close", releaseRequest);

  let body;
  try {
    body = await readRequestBody(request);
  } catch (error) {
    sendProxyError(response, error?.statusCode === 413 ? 413 : 400, "Request rejected by the local proxy.");
    return;
  }
  if (!await probeAuthenticatedUpstream() || nextServer.exitCode !== null || nextServer.signalCode !== null) {
    sendProxyError(response, 503, "The local application server failed authenticated readiness.", "1");
    return;
  }

  const headers = {
    ...sanitizeHeaders(request.headers, [
      "content-length",
      ...BLOCKED_CLIENT_FORWARDING_HEADERS,
    ]),
    host: `${host}:${internalPort}`,
    "content-length": String(body.length),
    "oai-authenticated-user-email": settings.localUserEmail,
    "oai-authenticated-user-full-name": encodeURIComponent(settings.localUserName),
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    "x-vg-local-gateway": upstreamSecret,
  };
  const upstream = http.request({
    host,
    port: internalPort,
    path: request.url,
    method: request.method,
    headers,
    maxHeaderSize: 16 * 1024,
    timeout: 30_000,
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, sanitizeHeaders(upstreamResponse.headers, [
      "x-vg-local-gateway",
      "x-vg-upstream-proof",
    ]));
    upstreamResponse.pipe(response);
  });
  upstream.on("error", () => {
    sendProxyError(response, 503, "Venture Governance Local is starting.", "1");
  });
  upstream.on("timeout", () => upstream.destroy());
  response.on("close", () => {
    if (!response.writableEnded) upstream.destroy();
  });
  upstream.end(body);
});

proxy.maxHeadersCount = 100;
proxy.maxRequestsPerSocket = 100;
proxy.maxConnections = MAX_LOCAL_PROXY_CONNECTIONS;
proxy.dropMaxConnection = true;
const connections = new Set();
proxy.on("connection", (socket) => {
  if (connections.size >= MAX_LOCAL_PROXY_CONNECTIONS) {
    socket.destroy();
    return;
  }
  connections.add(socket);
  socket.once("close", () => connections.delete(socket));
});
proxy.on("clientError", (_error, socket) => {
  if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
});
proxy.on("error", (error) => {
  upstreamReady = false;
  fs.appendFileSync(path.join(logsDir, "proxy-error.log"), `${new Date().toISOString()} ${error.code || "PROXY_ERROR"}\n`);
  if (!nextServer.killed) nextServer.kill();
  process.exitCode = 1;
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  upstreamReady = false;
  if (proxy.listening) proxy.close();
  if (!nextServer.killed) nextServer.kill();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
nextServer.on("exit", (code) => {
  if (shuttingDown) return;
  shuttingDown = true;
  upstreamReady = false;
  if (proxy.listening) proxy.close(() => process.exit(code || 1));
  else process.exit(code || 1);
});
nextServer.on("error", (error) => {
  fs.appendFileSync(path.join(logsDir, "server-error.log"), `${new Date().toISOString()} ${error.code || "SPAWN_ERROR"}\n`);
  shutdown();
});

async function startAuthenticatedProxy() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (nextServer.exitCode !== null || nextServer.signalCode !== null) throw new Error("The local application server exited before readiness.");
    if (await probeAuthenticatedUpstream()) {
      upstreamReady = true;
      proxy.listen(publicPort, host);
      return;
    }
    await delay(250);
  }
  throw new Error("The local application server did not pass authenticated readiness.");
}

startAuthenticatedProxy().catch((error) => {
  fs.appendFileSync(path.join(logsDir, "proxy-error.log"), `${new Date().toISOString()} READINESS_FAILED ${error.message}\n`);
  shutdown();
  process.exitCode = 1;
});
