import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BLOCKED_CLIENT_FORWARDING_HEADERS,
  LOCAL_UPSTREAM_HEALTH_PATH,
  MAX_ACTIVE_LOCAL_PROXY_REQUESTS,
  MAX_LOCAL_PROXY_BODY_BYTES,
  MAX_LOCAL_PROXY_CONNECTIONS,
  createRestrictedChildEnv,
  isAllowedLoopbackHost,
  isLocalUpstreamHealthTarget,
  isMatchingLocalInstanceResponse,
  isRejectedCrossSiteWrite,
  isSafeOriginFormTarget,
  parseLocalInstanceToken,
  parsePublicPort,
} from "../installer/assets/local-proxy-security.mjs";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("installer proxy accepts only the exact configured loopback Host", () => {
  assert.equal(isAllowedLoopbackHost("127.0.0.1:34731", 34731), true);
  assert.equal(isAllowedLoopbackHost("localhost:34731", 34731), false);
  assert.equal(isAllowedLoopbackHost("evil.example:34731", 34731), false);
  assert.equal(isAllowedLoopbackHost("127.0.0.1:34731.evil.example", 34731), false);
  assert.equal(isAllowedLoopbackHost("127.0.0.1", 34731), false);
  assert.equal(isAllowedLoopbackHost(undefined, 34731), false);
});

test("installer proxy accepts only bounded origin-form request targets", () => {
  assert.equal(isSafeOriginFormTarget("/app?view=summary"), true);
  assert.equal(isSafeOriginFormTarget("https://evil.example/app"), false);
  assert.equal(isSafeOriginFormTarget("//evil.example/app"), false);
  assert.equal(isSafeOriginFormTarget("*"), false);
  assert.equal(isSafeOriginFormTarget("/app#fragment"), false);
  assert.equal(isSafeOriginFormTarget(`/${"a".repeat(8192)}`), false);
});

test("installer proxy reserves a valid adjacent internal port", () => {
  assert.equal(parsePublicPort(34731), 34731);
  for (const invalid of [undefined, null, "34731", 0, 1023, 65535, 1.5]) {
    assert.throws(() => parsePublicPort(invalid));
  }
});

test("local child processes receive an allowlisted environment without user secrets", () => {
  const providerCredentialKey = ["OPENAI", "API", "KEY"].join("_");
  const childEnv = createRestrictedChildEnv({
    PATH: process.env.PATH ?? "",
    SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
    TEMP: process.env.TEMP ?? "C:\\Windows\\Temp",
    TEST_SECRET_SHOULD_NOT_PROPAGATE: "sensitive",
    [providerCredentialKey]: "not-a-real-provider-credential",
    NODE_OPTIONS: "--require=malicious.js",
  }, { VG_LOCAL_INSTALL_MODE: "1" });
  assert.equal(childEnv.TEST_SECRET_SHOULD_NOT_PROPAGATE, undefined);
  assert.equal(childEnv[providerCredentialKey], undefined);
  assert.equal(childEnv.NODE_OPTIONS, undefined);
  assert.equal(childEnv.VG_LOCAL_INSTALL_MODE, "1");

  const child = spawnSync(process.execPath, [
    "-e",
    "process.stdout.write(JSON.stringify({ secret: process.env.TEST_SECRET_SHOULD_NOT_PROPAGATE ?? null, mode: process.env.VG_LOCAL_INSTALL_MODE ?? null }))",
  ], { encoding: "utf8", env: childEnv, windowsHide: true });
  assert.equal(child.status, 0, child.stderr);
  assert.deepEqual(JSON.parse(child.stdout), { secret: null, mode: "1" });
});

test("local proxy strips client-controlled IP and identity forwarding headers", () => {
  for (const header of [
    "cf-connecting-ip",
    "forwarded",
    "oai-authenticated-user-email",
    "x-forwarded-for",
    "x-real-ip",
    "x-vg-local-gateway",
    "x-vg-local-instance",
  ]) {
    assert.equal(BLOCKED_CLIENT_FORWARDING_HEADERS.includes(header), true, `${header} must be blocked`);
  }
  const localServerSource = fs.readFileSync(path.join(repoRoot, "installer", "assets", "local-server.mjs"), "utf8");
  assert.match(localServerSource, /\.\.\.BLOCKED_CLIENT_FORWARDING_HEADERS/);
});

test("launcher accepts only the matching per-install health marker", () => {
  const token = parseLocalInstanceToken("a".repeat(64));
  assert.equal(isMatchingLocalInstanceResponse(204, token, token), true);
  assert.equal(isMatchingLocalInstanceResponse(200, token, token), false);
  assert.equal(isMatchingLocalInstanceResponse(204, "b".repeat(64), token), false);
  assert.throws(() => parseLocalInstanceToken(""));
  assert.throws(() => parseLocalInstanceToken("a".repeat(63)));
});

test("local proxy rejects cross-site writes before body buffering and has bounded resources", () => {
  const origin = "http://127.0.0.1:34731";
  assert.equal(isRejectedCrossSiteWrite("POST", { "sec-fetch-site": "cross-site" }, origin), true);
  assert.equal(isRejectedCrossSiteWrite("POST", { origin: "https://evil.example" }, origin), true);
  assert.equal(isRejectedCrossSiteWrite("POST", { origin }, origin), false);
  assert.equal(isRejectedCrossSiteWrite("GET", { "sec-fetch-site": "cross-site" }, origin), false);
  assert.equal(MAX_LOCAL_PROXY_BODY_BYTES, 20 * 1024);
  assert.ok(MAX_ACTIVE_LOCAL_PROXY_REQUESTS <= 16);
  assert.ok(MAX_LOCAL_PROXY_CONNECTIONS <= 32);
});

test("local proxy authenticates its private upstream before opening the public listener", () => {
  const localServerSource = fs.readFileSync(path.join(repoRoot, "installer", "assets", "local-server.mjs"), "utf8");
  assert.equal(LOCAL_UPSTREAM_HEALTH_PATH, "/api/local-runtime/health");
  assert.equal(isLocalUpstreamHealthTarget(`${LOCAL_UPSTREAM_HEALTH_PATH}?x=1`), true);
  assert.equal(isLocalUpstreamHealthTarget("/api/local-runtime/%68ealth"), true);
  assert.equal(isLocalUpstreamHealthTarget("/api/local-runtime/health/?x=1"), true);
  assert.match(localServerSource, /probeAuthenticatedUpstream/);
  assert.match(localServerSource, /createHmac/);
  assert.match(localServerSource, /if \(await probeAuthenticatedUpstream\(\)\)/);
  assert.match(localServerSource, /proxy\.listen\(publicPort, host\)/);
  assert.doesNotMatch(localServerSource, /proxy\.listen\(publicPort, host\);\s*\n\s*let shuttingDown/);
});
