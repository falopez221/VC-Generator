import assert from "node:assert/strict";
import test from "node:test";
import { parseTenantEntitlements, resolveTenantAccess } from "../src/private-access/tenant-authorization.ts";

const environment = { VG_TENANT_ENTITLEMENTS: JSON.stringify([
  { tenantId: "acme", members: [{ email: "buyer@example.test", role: "member", products: ["mvp-lab"] }] },
  { tenantId: "owner", members: [{ email: "owner@example.test", role: "owner", products: ["mvp-lab", "private-agent-runtime"] }] },
]) };

test("customers are limited to their purchased product and tenant", () => {
  const customer = { email: "buyer@example.test", role: "Demo User" };
  assert.equal(resolveTenantAccess(customer, "mvp-lab", "acme", environment)?.tenantId, "acme");
  assert.equal(resolveTenantAccess(customer, "private-agent-runtime", "acme", environment), null);
  assert.equal(resolveTenantAccess(customer, "mvp-lab", "owner", environment), null);
});

test("ambiguous tenant membership fails closed", () => {
  const multi = { VG_TENANT_ENTITLEMENTS: JSON.stringify([
    { tenantId: "one", members: [{ email: "owner@example.test", role: "owner", products: ["mvp-lab"] }] },
    { tenantId: "two", members: [{ email: "owner@example.test", role: "owner", products: ["mvp-lab"] }] },
  ]) };
  const identity = { email: "owner@example.test", role: "System Admin" };
  assert.equal(resolveTenantAccess(identity, "mvp-lab", null, multi), null);
  assert.equal(resolveTenantAccess(identity, "mvp-lab", "two", multi)?.tenantId, "two");
});

test("invalid configuration grants no tenant access", () => {
  assert.deepEqual(parseTenantEntitlements("{"), []);
  assert.equal(resolveTenantAccess({ email: "buyer@example.test", role: "Demo User" }, "mvp-lab", "acme", { VG_TENANT_ENTITLEMENTS: "{" }), null);
});
