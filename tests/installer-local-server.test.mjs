import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  LOCAL_HEALTH_PATH,
  LOCAL_UPSTREAM_HEALTH_PATH,
  MAX_ACTIVE_LOCAL_PROXY_REQUESTS,
  MAX_LOCAL_PROXY_BODY_BYTES,
} from "../installer/assets/local-proxy-security.mjs";

const isWindows = process.platform === "win32";
const host = "127.0.0.1";
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => { server.off("error", onError); resolve(); };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) { resolve(); return; }
    server.close(() => resolve());
  });
}

async function reserveAdjacentPorts(internalServer) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const publicReservation = net.createServer();
    await listen(publicReservation, 0);
    const publicPort = publicReservation.address().port;
    if (publicPort > 65534) {
      await closeServer(publicReservation);
      continue;
    }
    try {
      await listen(internalServer, publicPort + 1);
      await closeServer(publicReservation);
      return publicPort;
    } catch {
      await closeServer(publicReservation);
    }
  }
  throw new Error("Could not reserve adjacent loopback ports for the installer proxy test.");
}

function createFixture(publicPort, token) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vg-local-server-security-"));
  const runtimeRoot = path.join(fixtureRoot, "runtime");
  const appRoot = path.join(fixtureRoot, "app");
  const publicRoot = path.join(appRoot, "public");
  fs.mkdirSync(runtimeRoot, { recursive: true });
  fs.mkdirSync(publicRoot, { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "installer", "assets", "local-server.mjs"), path.join(fixtureRoot, "local-server.mjs"));
  fs.copyFileSync(path.join(repoRoot, "installer", "assets", "local-proxy-security.mjs"), path.join(fixtureRoot, "local-proxy-security.mjs"));
  try { fs.linkSync(process.execPath, path.join(runtimeRoot, "node.exe")); } catch {
    fs.copyFileSync(process.execPath, path.join(runtimeRoot, "node.exe"));
  }
  fs.writeFileSync(path.join(fixtureRoot, "local-settings.json"), JSON.stringify({
    port: publicPort,
    localUserEmail: "local-test@example.invalid",
    localUserName: "Local Test",
    localInstanceToken: token,
  }), "utf8");
  fs.writeFileSync(path.join(appRoot, "server.js"), `
const { createHmac } = require("node:crypto");
const http = require("node:http");
http.createServer((request, response) => {
  if (request.url === ${JSON.stringify(LOCAL_UPSTREAM_HEALTH_PATH)}) {
    const challenge = request.headers["x-vg-upstream-challenge"];
    const secret = process.env.VG_LOCAL_UPSTREAM_SECRET;
    if (typeof challenge !== "string" || !/^[a-f0-9]{64}$/.test(challenge) ||
        typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) {
      response.writeHead(404);
      response.end("Not found.");
      return;
    }
    const proof = createHmac("sha256", Buffer.from(secret, "hex")).update(challenge).digest("hex");
    response.writeHead(204, { "x-vg-upstream-proof": proof });
    response.end();
    return;
  }
  if (request.url === "/private") {
    request.resume();
    if (request.headers["x-vg-local-gateway"] !== process.env.VG_LOCAL_UPSTREAM_SECRET) {
      response.writeHead(403);
      response.end("gateway-required");
      return;
    }
    response.writeHead(200);
    response.end("gateway-ok");
    return;
  }
  request.resume();
  response.writeHead(200, { "content-type": "text/plain" });
  response.end("upstream-ok");
}).listen(Number(process.env.PORT), process.env.HOSTNAME);
`, "utf8");
  return fixtureRoot;
}

function startLocalServer(fixtureRoot) {
  return spawn(process.execPath, [path.join(fixtureRoot, "local-server.mjs")], {
    cwd: fixtureRoot,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function request({ port, requestPath = "/", method = "GET", headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const client = http.request({ host, port, path: requestPath, method, headers, timeout: 1_500 }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    client.on("timeout", () => client.destroy(new Error("request timeout")));
    client.on("error", reject);
    client.end(body);
  });
}

async function waitForReady(publicPort, token) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    try {
      const response = await request({
        port: publicPort,
        requestPath: LOCAL_HEALTH_PATH,
        headers: { host: `${host}:${publicPort}`, "x-vg-local-instance": token },
      });
      if (response.status === 204 && response.headers["x-vg-local-instance"] === token) return;
    } catch { /* not listening yet */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Local proxy did not become ready.");
}

function waitForExit(child, timeoutMs = 5_000) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((_, reject) => setTimeout(() => reject(new Error("child did not exit")), timeoutMs)),
  ]);
}

async function stopChild(child) {
  if (child.exitCode === null && child.signalCode === null) child.kill();
  try {
    await waitForExit(child, 3_000);
  } catch {
    child.kill("SIGKILL");
    await waitForExit(child, 3_000);
  }
}

async function removeFixture(fixtureRoot) {
  if (!fixtureRoot) return;
  const resolved = path.resolve(fixtureRoot);
  assert.ok(resolved.toLowerCase().startsWith(`${path.resolve(os.tmpdir()).toLowerCase()}${path.sep}`));
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      lastError = error;
      if (!["EBUSY", "ENOTEMPTY", "EPERM"].includes(error?.code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

test("pre-bound internal port never opens the public proxy or receives forwarded identity", { skip: !isWindows }, async () => {
  const observed = [];
  const impostor = http.createServer((incoming, response) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", () => observed.push({ method: incoming.method, url: incoming.url, headers: incoming.headers, body: Buffer.concat(chunks) }));
    response.writeHead(204, { "x-vg-upstream-proof": incoming.headers["x-vg-upstream-challenge"] ?? "" });
    response.end();
  });
  const publicPort = await reserveAdjacentPorts(impostor);
  const token = "a".repeat(64);
  const fixtureRoot = createFixture(publicPort, token);
  const localServer = startLocalServer(fixtureRoot);
  let publicAccepted = false;
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        await request({
          port: publicPort,
          method: "POST",
          headers: { host: `${host}:${publicPort}`, origin: `http://${host}:${publicPort}` },
          body: "mission-data",
        });
        publicAccepted = true;
      } catch { /* expected: the public proxy never listens */ }
      if (localServer.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await waitForExit(localServer);
    assert.equal(publicAccepted, false);
    assert.ok(observed.length >= 1, "the impostor should see only an unauthenticated readiness challenge");
    for (const seen of observed) {
      assert.equal(seen.method, "GET");
      assert.equal(seen.url, LOCAL_UPSTREAM_HEALTH_PATH);
      assert.equal(seen.headers["oai-authenticated-user-email"], undefined);
      assert.match(seen.headers["x-vg-upstream-challenge"], /^[a-f0-9]{64}$/);
      assert.equal(seen.body.length, 0);
    }
  } finally {
    await stopChild(localServer);
    await closeServer(impostor);
    await removeFixture(fixtureRoot);
  }
});

test("local proxy rejects cross-site/oversize writes and caps slow concurrent requests", { skip: !isWindows }, async () => {
  const internalReservation = net.createServer();
  const publicPort = await reserveAdjacentPorts(internalReservation);
  await closeServer(internalReservation);
  const token = "b".repeat(64);
  const fixtureRoot = createFixture(publicPort, token);
  const localServer = startLocalServer(fixtureRoot);
  const slowSockets = [];
  try {
    await waitForReady(publicPort, token);
    const unauthenticatedUpstream = await request({
      port: publicPort + 1,
      requestPath: LOCAL_UPSTREAM_HEALTH_PATH,
      headers: { host: `${host}:${publicPort + 1}` },
    });
    assert.equal(unauthenticatedUpstream.status, 404);
    assert.doesNotMatch(unauthenticatedUpstream.body, /^[a-f0-9]{64}$/);

    const blockedUpstreamRoute = await request({
      port: publicPort,
      requestPath: `${LOCAL_UPSTREAM_HEALTH_PATH}?challenge=leak`,
      headers: { host: `${host}:${publicPort}` },
    });
    assert.equal(blockedUpstreamRoute.status, 404);

    const directSpoof = await request({
      port: publicPort + 1,
      requestPath: "/private",
      headers: {
        host: `${host}:${publicPort + 1}`,
        "oai-authenticated-user-email": "local-test@example.invalid",
      },
    });
    assert.equal(directSpoof.status, 403);

    const gatewayRequest = await request({
      port: publicPort,
      requestPath: "/private",
      headers: {
        host: `${host}:${publicPort}`,
        "x-vg-local-gateway": "f".repeat(64),
      },
    });
    assert.equal(gatewayRequest.status, 200);
    assert.equal(gatewayRequest.body, "gateway-ok");

    const crossSite = await request({
      port: publicPort,
      requestPath: "/api/lab/research",
      method: "POST",
      headers: {
        host: `${host}:${publicPort}`,
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
        "content-length": "1",
      },
      body: "x",
    });
    assert.equal(crossSite.status, 403);

    const oversized = await request({
      port: publicPort,
      requestPath: "/api/lab/research",
      method: "POST",
      headers: {
        host: `${host}:${publicPort}`,
        origin: `http://${host}:${publicPort}`,
        "sec-fetch-site": "same-origin",
        "content-length": String(MAX_LOCAL_PROXY_BODY_BYTES + 1),
      },
      body: Buffer.alloc(MAX_LOCAL_PROXY_BODY_BYTES + 1),
    });
    assert.equal(oversized.status, 413);

    for (let index = 0; index < MAX_ACTIVE_LOCAL_PROXY_REQUESTS; index += 1) {
      const socket = net.createConnection({ host, port: publicPort });
      await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("error", reject);
      });
      socket.write(
        `POST /api/lab/research HTTP/1.1\r\n` +
        `Host: ${host}:${publicPort}\r\n` +
        `Origin: http://${host}:${publicPort}\r\n` +
        `Sec-Fetch-Site: same-origin\r\n` +
        `Content-Length: 10\r\n\r\nx`,
      );
      slowSockets.push(socket);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const saturated = await request({
      port: publicPort,
      requestPath: "/app",
      headers: { host: `${host}:${publicPort}` },
    });
    assert.equal(saturated.status, 503);
  } finally {
    for (const socket of slowSockets) socket.destroy();
    await stopChild(localServer);
    await removeFixture(fixtureRoot);
  }
});
