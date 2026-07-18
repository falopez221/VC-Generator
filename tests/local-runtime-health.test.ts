import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { GET } from "../app/api/local-runtime/health/route.ts";

test("local upstream health returns only a challenge HMAC in installed loopback mode", async () => {
  const previous = {
    VERCEL: process.env.VERCEL,
    VG_LOCAL_INSTALL_MODE: process.env.VG_LOCAL_INSTALL_MODE,
    VG_LOCAL_BIND_ADDRESS: process.env.VG_LOCAL_BIND_ADDRESS,
    VG_LOCAL_UPSTREAM_SECRET: process.env.VG_LOCAL_UPSTREAM_SECRET,
  };
  const secret = "ab".repeat(32);
  const challenge = "cd".repeat(32);
  try {
    delete process.env.VERCEL;
    process.env.VG_LOCAL_INSTALL_MODE = "1";
    process.env.VG_LOCAL_BIND_ADDRESS = "127.0.0.1";
    process.env.VG_LOCAL_UPSTREAM_SECRET = secret;

    const missingChallenge = await GET(new Request("http://127.0.0.1:34732/api/local-runtime/health", {
      headers: { host: "127.0.0.1:34732" },
    }));
    assert.equal(missingChallenge.status, 404);
    assert.doesNotMatch(await missingChallenge.text(), new RegExp(secret));

    const response = await GET(new Request("http://127.0.0.1:34732/api/local-runtime/health", {
      headers: {
        host: "127.0.0.1:34732",
        "x-vg-upstream-challenge": challenge,
      },
    }));
    const expected = createHmac("sha256", Buffer.from(secret, "hex")).update(challenge).digest("hex");
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("x-vg-upstream-proof"), expected);
    assert.equal(await response.text(), "");

    process.env.VERCEL = "1";
    const publicDeployment = await GET(new Request("https://public.example/api/local-runtime/health", {
      headers: {
        host: "public.example",
        "x-vg-upstream-challenge": challenge,
      },
    }));
    assert.equal(publicDeployment.status, 404);
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
