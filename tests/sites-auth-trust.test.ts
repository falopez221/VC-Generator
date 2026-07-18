import assert from "node:assert/strict";
import test from "node:test";
import { hasTrustedSitesIdentityContext } from "../src/security/sites-auth-trust.ts";

test("Sites identity trust requires the switch and an exact host allowlist", () => {
  const headers = new Headers({ host: "app.example.test", "x-forwarded-host": "app.example.test" });

  assert.equal(hasTrustedSitesIdentityContext(headers, "app.example.test", {
    VG_TRUST_CHATGPT_AUTH_HEADERS: "1",
    VG_TRUSTED_SITES_HOSTS: "app.example.test",
  }), true);
  assert.equal(hasTrustedSitesIdentityContext(headers, "app.example.test", {
    VG_TRUST_CHATGPT_AUTH_HEADERS: "0",
    VG_TRUSTED_SITES_HOSTS: "app.example.test",
  }), false);
  assert.equal(hasTrustedSitesIdentityContext(headers, "app.example.test", {
    VG_TRUST_CHATGPT_AUTH_HEADERS: "1",
  }), false);
});

test("Sites identity trust rejects preview, mixed and malformed authorities", () => {
  const environment = {
    VG_TRUST_CHATGPT_AUTH_HEADERS: "1",
    VG_TRUSTED_SITES_HOSTS: "app.example.test",
  };

  assert.equal(hasTrustedSitesIdentityContext(
    new Headers({ host: "preview.example.test" }),
    "preview.example.test",
    environment,
  ), false);
  assert.equal(hasTrustedSitesIdentityContext(
    new Headers({ host: "app.example.test", "x-forwarded-host": "preview.example.test" }),
    "app.example.test",
    environment,
  ), false);
  assert.equal(hasTrustedSitesIdentityContext(
    new Headers({ host: "app.example.test, attacker.example" }),
    "app.example.test",
    environment,
  ), false);
  assert.equal(hasTrustedSitesIdentityContext(
    new Headers({ host: "app.example.test" }),
    "app.example.test",
    { ...environment, VG_TRUSTED_SITES_HOSTS: "app.example.test," },
  ), false);
});
