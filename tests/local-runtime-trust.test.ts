import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { hasValidLocalGateway } from "../src/security/local-runtime-trust.ts";

const secret = "12".repeat(32);
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function headersWith(value: string | null) {
  return { get: (name: string) => name === "x-vg-local-gateway" ? value : null };
}

test("installed local runtime requires the ephemeral gateway secret", () => {
  assert.equal(hasValidLocalGateway(headersWith(secret), { VG_LOCAL_UPSTREAM_SECRET: secret }), true);
  assert.equal(hasValidLocalGateway(headersWith("34".repeat(32)), { VG_LOCAL_UPSTREAM_SECRET: secret }), false);
  assert.equal(hasValidLocalGateway(headersWith(null), { VG_LOCAL_UPSTREAM_SECRET: secret }), false);
  assert.equal(hasValidLocalGateway(headersWith(secret), {}), false);
});

test("both page middleware and server auth enforce the installed gateway proof", () => {
  const middlewareSource = fs.readFileSync(path.join(repoRoot, "proxy.ts"), "utf8");
  const authSource = fs.readFileSync(path.join(repoRoot, "app", "chatgpt-auth.ts"), "utf8");
  for (const source of [middlewareSource, authSource]) {
    assert.match(source, /installedMode\s*&&\s*!hasValidLocalGateway/);
  }
  assert.match(middlewareSource, /installedRuntime\s*&&\s*pathname !== "\/api\/local-runtime\/health"/);
  assert.match(middlewareSource, /"\/api\/:path\*"/);
});
