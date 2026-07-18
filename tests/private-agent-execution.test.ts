import assert from "node:assert/strict";
import test from "node:test";
import { BoundedJsonRequestError, isSameSiteWrite, readBoundedJson } from "../src/private/request-security.ts";

test("private API parsing bounds streamed JSON and rejects browser cross-site writes", async () => {
  const accepted = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://venturegovernance.com", "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ mission: "bounded" }),
  });
  assert.deepEqual(await readBoundedJson(accepted, 100), { mission: "bounded" });
  assert.equal(isSameSiteWrite(accepted), true);

  const oversized = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mission: "this request is intentionally beyond the tiny test limit" }),
  });
  await assert.rejects(readBoundedJson(oversized, 10), BoundedJsonRequestError);

  const stalledBody = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new TextEncoder().encode("{")); },
  });
  const stalled = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stalledBody,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  await assert.rejects(
    readBoundedJson(stalled, 100, 10),
    (error: unknown) => error instanceof BoundedJsonRequestError && error.status === 408,
  );

  for (const contentType of ["application/jsonp", "application/json; charset=utf-8", "text/plain"]) {
    const wrongContentType = new Request("https://venturegovernance.com/api/private/agents/execute", {
      method: "POST",
      headers: { "content-type": contentType },
      body: JSON.stringify({ mission: "bounded" }),
    });
    await assert.rejects(
      readBoundedJson(wrongContentType, 100),
      (error: unknown) => error instanceof BoundedJsonRequestError && error.status === 415,
    );
  }

  const crossSite = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
  });
  assert.equal(isSameSiteWrite(crossSite), false);

  const sameSiteButNotSameOrigin = new Request("https://api.venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "https://venturegovernance.com", "sec-fetch-site": "same-site" },
  });
  assert.equal(isSameSiteWrite(sameSiteButNotSameOrigin), false);

  const emptyFetchMetadata = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "https://venturegovernance.com", "sec-fetch-site": "" },
  });
  assert.equal(isSameSiteWrite(emptyFetchMetadata), false);

  const contradictoryOrigin = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "https://attacker.example", "sec-fetch-site": "same-origin" },
  });
  assert.equal(isSameSiteWrite(contradictoryOrigin), false);

  const forwardedOrigin = new Request("http://127.0.0.1:8787/api/private/agents/execute", {
    method: "POST",
    headers: {
      origin: "https://venturegovernance.com",
      "sec-fetch-site": "same-origin",
      "x-forwarded-host": "venturegovernance.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isSameSiteWrite(forwardedOrigin), true);

  const poisonedForwardedOrigin = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      "sec-fetch-site": "same-origin",
      "x-forwarded-host": "attacker.example, venturegovernance.com",
      "x-forwarded-proto": "https",
    },
  });
  assert.equal(isSameSiteWrite(poisonedForwardedOrigin), false);

  const loopbackProxy = new Request("http://127.0.0.1:34732/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:34731", "sec-fetch-site": "same-origin" },
  });
  assert.equal(isSameSiteWrite(loopbackProxy), true);

  const unverifiedLoopbackProxy = new Request("http://127.0.0.1:34732/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:34731" },
  });
  assert.equal(isSameSiteWrite(unverifiedLoopbackProxy), false);

  const mismatchedLoopbackHost = new Request("http://127.0.0.1:34732/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "http://localhost:34731", "sec-fetch-site": "same-origin" },
  });
  assert.equal(isSameSiteWrite(mismatchedLoopbackHost), false);
});
