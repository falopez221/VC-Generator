import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

for (const [pathname, expected] of [
  ["/", "Venture Governance System"],
  ["/lab", "Explore how governed agents"],
  ["/lab/demo", "Run Lab Simulation"],
  ["/lab/methodology", "Score is an analytical interface"],
  ["/lab/results/example", "LOADING LOCAL RESULT"],
]) {
  test(`server renders ${pathname}`, async () => {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(await response.text(), new RegExp(expected, "i"));
  });
}

test("public demo exposes only the four allowed public agents", async () => {
  const response = await render("/lab/demo");
  const html = await response.text();
  for (const name of ["Mathematics", "Finance", "Strategy", "Marketing"]) assert.match(html, new RegExp(`${name}`, "i"));
  assert.doesNotMatch(html, /Tokenomics Agent|Red Team Agent|Investment Committee Agent/i);
  assert.match(html, /Public demonstration model/i);
  assert.match(html, /synthetic data/i);
});

test("Lab audio has no autoplay markup", async () => {
  const response = await render("/lab/demo");
  const html = await response.text();
  assert.doesNotMatch(html, /<audio[^>]+autoplay/i);
  assert.match(html, /Sound On/i);
  assert.match(html, /Lab volume/i);
});
