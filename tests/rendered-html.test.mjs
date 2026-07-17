import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

function renderedText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

for (const [pathname, expected] of [
  ["/", "Venture Governance System"],
  ["/lab", "Explore how governed agents"],
  ["/lab/demo", "Run Lab Simulation"],
  ["/lab/methodology", "Score is an analytical interface"],
  ["/lab/results/example", "LOADING LOCAL RESULT"],
  ["/applications", "One architecture"],
  ["/applications/energy-prioritize", "Prioritized portfolio"],
]) {
  test(`server renders ${pathname}`, async () => {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(await response.text(), new RegExp(expected, "i"));
  });
}

test("applications exposes the governed explorer and mission builder", async () => {
  const response = await render("/applications");
  const html = await response.text();
  const text = renderedText(html);
  for (const expected of ["APPLICATION EXPLORER", "MISSION BUILDER", "Cards", "Map", "Matrix", "Value", "HIGH-IMPACT DOMAINS", "HUMAN GATE"]) assert.match(text, new RegExp(expected, "i"));
  assert.doesNotMatch(text, /guaranteed outcome|autonomous investment approval/i);
});

test("public demo exposes only the four allowed public agents", async () => {
  const response = await render("/lab/demo");
  const html = await response.text();
  for (const name of ["Mathematics", "Finance", "Strategy", "Marketing"]) assert.match(html, new RegExp(`${name}`, "i"));
  assert.doesNotMatch(html, /Tokenomics Agent|Red Team Agent|Investment Committee Agent/i);
  assert.match(html, /Public demonstration model/i);
  assert.match(html, /synthetic data/i);
  assert.match(html, /How to use the Lab/i);
  assert.match(html, /Never read score alone/i);
  assert.match(html, /Put your full idea here/i);
  assert.match(html, /Summarize idea &amp; suggest parameters/i);
  assert.match(html, /not a fifth specialist agent/i);
  assert.match(html, /How Venture Governance Works/i);
  assert.match(html, /Human Input/i);
  assert.match(html, /Changing this affects/i);
  assert.match(html, />Help</i);
});

test("first-time tour remains available without changing the public model", async () => {
  const source = await readFile(new URL("../src/lab/components/LabTour.tsx", import.meta.url), "utf8");
  assert.match(source, /Welcome to Venture Governance Lab/i);
  assert.match(source, /Start Tour/i);
  assert.match(source, /Skip/i);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /Modify assumptions/i);
});

test("methodology explains how to interpret dashboard results", async () => {
  const response = await render("/lab/methodology");
  const html = await response.text();
  assert.match(html, /Dashboard reading/i);
  assert.match(html, /not a probability of startup success/i);
  assert.match(html, /No score approves an investment/i);
  for (const model of ["Tornado Sensitivity", "Break-even", "Rank Robustness", "Validation Priority"]) assert.match(html, new RegExp(model, "i"));
});

test("public Lab summary is synchronized with the model catalog", async () => {
  const response = await render("/lab");
  assert.match(renderedText(await response.text()), /12 public models/i);
});

test("landing is synchronized with public whitepaper v2 and the IP boundary", async () => {
  const response = await render("/");
  const html = await response.text();
  const text = renderedText(html);
  assert.match(html, /venture-governance-system-whitepaper-publico-v2\.pdf/i);
  assert.match(text, /Whitepaper p[uú]blico v2\.0/i);
  assert.match(text, /26 p[aá]ginas/i);
  assert.match(text, /4 agentes p[uú]blicos/i);
  assert.match(text, /12 modelos/i);
  for (const name of ["Mathematics", "Finance", "Strategy", "Marketing"]) assert.match(text, new RegExp(name, "i"));
  assert.doesNotMatch(text, /20 roles|6 runtimes|Whitepaper v1\.0|1[\.,]000 hip[oó]tesis/i);
});

test("Lab audio has no autoplay markup", async () => {
  const response = await render("/lab/demo");
  const html = await response.text();
  assert.doesNotMatch(html, /<audio[^>]+autoplay/i);
  assert.match(html, /Sound On/i);
  assert.match(html, /Lab volume/i);
});
