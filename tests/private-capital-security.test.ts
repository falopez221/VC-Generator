import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  authorizePrivateCapitalOwner,
  configuredPrivateCapitalOwnerEmails,
  evaluatePrivateCapitalAuthorization,
  normalizePrivateCapitalEmail,
  PRIVATE_CAPITAL_OWNER_ROLE,
  sanitizePrivateCapitalReturnPath,
} from "../src/private-capital/security/authorization.ts";
import {
  sanitizePrivateCapitalAccessAuditRecord,
} from "../src/private-capital/security/audit.ts";

const repositoryRoot = new URL("../", import.meta.url);

test("private-capital authorization denies by default and never inherits a broad role", () => {
  assert.equal(authorizePrivateCapitalOwner({ email: "owner@example.test" }, {}), null);
  assert.equal(authorizePrivateCapitalOwner({ email: "owner@example.test", role: "Demo User" }, {}), null);
  assert.equal(authorizePrivateCapitalOwner({ email: "owner@example.test", role: "System Admin" }, {}), null);
});

test("dedicated settings require base workspace authorization and exact normalized owner emails", () => {
  const environment = {
    VG_PRIVATE_CAPITAL_OWNER_EMAIL: " Owner@Example.Test ",
    VG_PRIVATE_CAPITAL_OWNER_EMAILS: "second@example.test,broken address,SECOND@example.test",
  };
  assert.deepEqual(
    [...configuredPrivateCapitalOwnerEmails(environment)],
    ["owner@example.test", "second@example.test"],
  );
  assert.equal(
    authorizePrivateCapitalOwner({ email: "OWNER@example.test" }, environment),
    null,
    "a raw authenticated identity must not bypass base workspace authorization",
  );
  assert.deepEqual(
    authorizePrivateCapitalOwner({ email: "OWNER@example.test", role: "System Admin" }, environment),
    { email: "owner@example.test", role: PRIVATE_CAPITAL_OWNER_ROLE },
  );
  assert.deepEqual(
    authorizePrivateCapitalOwner({ email: "second@example.test", role: "Demo User" }, environment),
    { email: "second@example.test", role: PRIVATE_CAPITAL_OWNER_ROLE },
    "an explicitly allowlisted owner may inherit either valid base workspace role",
  );
  assert.equal(authorizePrivateCapitalOwner(
    { email: "owner@example.test.attacker", role: "System Admin" },
    environment,
  ), null);
  assert.equal(authorizePrivateCapitalOwner({ email: "third@example.test", role: "System Admin" }, environment), null);
});

test("an invalid dedicated setting fails closed instead of enabling compatibility owners", () => {
  assert.equal(authorizePrivateCapitalOwner(
    { email: "legacy@example.test", role: "System Admin" },
    {
      VG_PRIVATE_CAPITAL_OWNER_EMAILS: "not an email",
      VG_OWNER_EMAIL: "legacy@example.test",
    },
  ), null);
  assert.deepEqual(evaluatePrivateCapitalAuthorization(
    { email: "legacy@example.test", role: "System Admin" },
    {
      VG_PRIVATE_CAPITAL_OWNER_EMAILS: "not an email",
      VG_OWNER_EMAIL: "legacy@example.test",
    },
  ), { authorized: false, reason: "owner_not_configured" });
});

test("existing owner and local operator compatibility require prior System Admin trust", () => {
  const existingOwnerEnvironment = { VG_OWNER_EMAIL: "legacy@example.test" };
  assert.equal(
    authorizePrivateCapitalOwner({ email: "legacy@example.test" }, existingOwnerEnvironment),
    null,
  );
  assert.deepEqual(
    authorizePrivateCapitalOwner(
      { email: "legacy@example.test", role: "System Admin" },
      existingOwnerEnvironment,
    ),
    { email: "legacy@example.test", role: PRIVATE_CAPITAL_OWNER_ROLE },
  );

  const localEnvironment = {
    VG_LOCAL_DEV_USER_EMAIL: "local@example.test",
    VG_LOCAL_INSTALL_MODE: "1",
    VG_LOCAL_BIND_ADDRESS: "127.0.0.1:4317",
  };
  assert.equal(authorizePrivateCapitalOwner({ email: "local@example.test" }, localEnvironment), null);
  assert.equal(authorizePrivateCapitalOwner(
    { email: "local@example.test", role: "System Admin" },
    { ...localEnvironment, VG_LOCAL_BIND_ADDRESS: "0.0.0.0:4317" },
  ), null);
  assert.deepEqual(authorizePrivateCapitalOwner(
    { email: "local@example.test", role: "System Admin" },
    localEnvironment,
  ), { email: "local@example.test", role: PRIVATE_CAPITAL_OWNER_ROLE });

  assert.equal(authorizePrivateCapitalOwner(
    { email: "local@example.test", role: "System Admin" },
    {
      VG_LOCAL_DEV_USER_EMAIL: "local@example.test",
      VG_LOCAL_DEV_MODE: "1",
      VG_LOCAL_BIND_ADDRESS: "127.0.0.1:4317",
      NODE_ENV: "production",
    },
  ), null);
});

test("authorization decisions expose only bounded audit reasons", () => {
  assert.deepEqual(evaluatePrivateCapitalAuthorization(null, {}), {
    authorized: false,
    reason: "identity_missing",
  });
  assert.deepEqual(evaluatePrivateCapitalAuthorization({ email: "broken address" }, {
    VG_PRIVATE_CAPITAL_OWNER_EMAIL: "owner@example.test",
  }), {
    authorized: false,
    reason: "identity_invalid",
  });
  assert.deepEqual(evaluatePrivateCapitalAuthorization({
    email: "other@example.test",
    role: "System Admin",
  }, {
    VG_PRIVATE_CAPITAL_OWNER_EMAIL: "owner@example.test",
  }), {
    authorized: false,
    reason: "owner_not_authorized",
  });
  assert.deepEqual(evaluatePrivateCapitalAuthorization({ email: "owner@example.test" }, {
    VG_PRIVATE_CAPITAL_OWNER_EMAIL: "owner@example.test",
  }), {
    authorized: false,
    reason: "owner_not_authorized",
  });
});

test("page and API guards never fall back from base authorization to a raw identity", async () => {
  const [pageGuard, apiGuard] = await Promise.all([
    readFile(new URL("src/private-capital/security/server.ts", repositoryRoot), "utf8"),
    readFile(new URL("app/api/private-capital/status/route.ts", repositoryRoot), "utf8"),
  ]);
  for (const guard of [pageGuard, apiGuard]) {
    assert.match(guard, /const workspaceIdentity = authorizeChatGPTUser\(identity\)/u);
    assert.match(guard, /if \(!workspaceIdentity\)/u);
    assert.match(guard, /evaluatePrivateCapitalAuthorization\(workspaceIdentity\)/u);
    assert.doesNotMatch(guard, /workspaceIdentity\s*\?\?\s*identity/u);
  }
});

test("post-authentication redirects stay inside the private-capital subtree", () => {
  assert.equal(
    sanitizePrivateCapitalReturnPath("/app/private-capital-intelligence/bitcoin?view=risk#details"),
    "/app/private-capital-intelligence/bitcoin?view=risk#details",
  );
  for (const value of [
    "https://attacker.example/private",
    "//attacker.example/private",
    "/app/private-capital-intelligence\\@attacker.example",
    "/app/private-capital-intelligence.evil",
    "/app",
    null,
  ]) {
    assert.equal(
      sanitizePrivateCapitalReturnPath(value),
      "/app/private-capital-intelligence",
    );
  }
});

test("email normalization rejects ambiguous or unsafe addresses", () => {
  for (const value of [
    null,
    "",
    "Display Name <owner@example.test>",
    "owner@@example.test",
    ".owner@example.test",
    "owner..name@example.test",
    "owner@example.test attacker@example.test",
    "owner@-example.test",
  ]) assert.equal(normalizePrivateCapitalEmail(value), null);
});

test("access audit sanitizer emits a narrow record without wealth values or query data", () => {
  const record = sanitizePrivateCapitalAccessAuditRecord({
    outcome: "allowed",
    reason: "owner_authorized",
    actorEmail: " OWNER@example.test ",
    route: "/app/private-capital/portfolio?netWorth=999999#balance",
    occurredAt: "2026-07-18T18:00:00.000Z",
    netWorth: 999999,
    holdings: [{ ticker: "SECRET", value: 123 }],
    accessToken: "must-not-leak",
  });

  assert.deepEqual(record, {
    schemaVersion: 1,
    event: "private_capital.access",
    role: PRIVATE_CAPITAL_OWNER_ROLE,
    outcome: "allowed",
    reason: "owner_authorized",
    actorEmail: "owner@example.test",
    route: "/app/private-capital/portfolio",
    occurredAt: "2026-07-18T18:00:00.000Z",
  });
  assert.doesNotMatch(JSON.stringify(record), /999999|SECRET|must-not-leak|netWorth|balance/u);
});

test("access audit sanitizer rejects malformed event metadata", () => {
  assert.equal(sanitizePrivateCapitalAccessAuditRecord(null), null);
  assert.equal(sanitizePrivateCapitalAccessAuditRecord({
    outcome: "maybe",
    reason: "owner_authorized",
    occurredAt: new Date(),
  }), null);
  assert.equal(sanitizePrivateCapitalAccessAuditRecord({
    outcome: "denied",
    reason: "unknown",
    occurredAt: new Date(),
  }), null);
});
