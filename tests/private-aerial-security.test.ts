import assert from "node:assert/strict";
import test from "node:test";

import {
  AERIAL_SIMULATION_ROOT,
  evaluateAerialPrivateAuthorization,
  sanitizeAerialReturnPath,
} from "../src/private-aerial/security/authorization.ts";
import {
  createAerialLabSessionToken,
  hasAerialLabAccessConfiguration,
  verifyAerialLabCredential,
  verifyAerialLabSessionToken,
} from "../src/private-aerial/security/session.ts";

const sessionEnvironment = {
  VG_AERIAL_LAB_CREDENTIAL: "a-distinct-defense-lab-key-2026",
  VG_AERIAL_LAB_SESSION_SECRET: Buffer.alloc(48, 0x5a).toString("base64url"),
};

test("aerial authorization requires the base workspace role and exact dedicated allowlist", () => {
  const environment = { VG_AERIAL_SIMULATION_OWNER_EMAIL: "Owner@Example.Test" };
  assert.deepEqual(
    evaluateAerialPrivateAuthorization({ email: "owner@example.test" }, environment),
    { authorized: false, reason: "not_authorized" },
  );
  assert.deepEqual(
    evaluateAerialPrivateAuthorization(
      { email: "OWNER@example.test", role: "System Admin" },
      environment,
    ),
    { authorized: true, email: "owner@example.test" },
  );
  assert.deepEqual(
    evaluateAerialPrivateAuthorization(
      { email: "owner@example.test.attacker", role: "System Admin" },
      environment,
    ),
    { authorized: false, reason: "not_authorized" },
  );
});

test("aerial return paths cannot escape the lab subtree", () => {
  assert.equal(
    sanitizeAerialReturnPath("/app/aerial-simulation/results?run=7#summary"),
    "/app/aerial-simulation/results?run=7#summary",
  );
  for (const value of [
    "/app",
    "/app/aerial-simulation.evil",
    "//attacker.example/app/aerial-simulation",
    "https://attacker.example/app/aerial-simulation",
    null,
  ]) assert.equal(sanitizeAerialReturnPath(value), AERIAL_SIMULATION_ROOT);
});

test("dedicated lab credential is required and compared exactly", async () => {
  assert.equal(hasAerialLabAccessConfiguration({}), false);
  assert.equal(hasAerialLabAccessConfiguration(sessionEnvironment), true);
  assert.equal(
    await verifyAerialLabCredential("a-distinct-defense-lab-key-2026", sessionEnvironment),
    true,
  );
  assert.equal(
    await verifyAerialLabCredential("a-distinct-defense-lab-key-2027", sessionEnvironment),
    false,
  );
  assert.equal(
    await verifyAerialLabCredential("short", sessionEnvironment),
    false,
  );
});

test("signed lab session is identity-bound, tamper-evident and expiring", async () => {
  const issuedAt = 1_800_000_000_000;
  const token = await createAerialLabSessionToken(
    "owner@example.test",
    sessionEnvironment,
    issuedAt,
  );
  assert.ok(token);

  assert.deepEqual(
    await verifyAerialLabSessionToken(
      token,
      "OWNER@example.test",
      sessionEnvironment,
      issuedAt + 60_000,
    ),
    { valid: true, expiresAt: Math.floor(issuedAt / 1000) + 4 * 60 * 60 },
  );
  assert.deepEqual(
    await verifyAerialLabSessionToken(
      token,
      "other@example.test",
      sessionEnvironment,
      issuedAt + 60_000,
    ),
    { valid: false, reason: "identity_mismatch" },
  );

  const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(
    await verifyAerialLabSessionToken(
      tampered,
      "owner@example.test",
      sessionEnvironment,
      issuedAt + 60_000,
    ),
    { valid: false, reason: "malformed" },
  );
  assert.deepEqual(
    await verifyAerialLabSessionToken(
      token,
      "owner@example.test",
      sessionEnvironment,
      issuedAt + 4 * 60 * 60 * 1000,
    ),
    { valid: false, reason: "expired" },
  );
});
