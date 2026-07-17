import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

process.env.VG_OWNER_EMAIL = "franciscoariellopez22@gmail.com";

async function render(pathname, headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, { headers: { accept: "text/html", ...headers } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
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
  ["/app/login", "Authorized Platform Access"],
  ["/request-access", "Request an authorized workspace"],
]) {
  test(`server renders ${pathname}`, async () => {
    const response = await render(pathname);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    assert.match(await response.text(), new RegExp(expected, "i"));
  });
}

test("private platform redirects anonymous and non-member users server-side", async () => {
  const anonymous = await render("/app");
  assert.ok([302, 303, 307, 308].includes(anonymous.status));
  assert.match(anonymous.headers.get("location") ?? "", /\/signin-with-chatgpt\?return_to=%2Fapp/i);

  const nonMember = await render("/app", { "oai-authenticated-user-email": "not-authorized@example.com" });
  assert.ok([302, 303, 307, 308].includes(nonMember.status));
  assert.match(nonMember.headers.get("location") ?? "", /\/app\/login\?reason=not-authorized/i);
});

test("private platform preserves a requested deep link through sign-in", async () => {
  const response = await render("/app/missions?mission=MIS-009");
  assert.ok([302, 303, 307, 308].includes(response.status));
  const location = new URL(response.headers.get("location") ?? "http://localhost/", "http://localhost");
  assert.equal(location.pathname, "/signin-with-chatgpt");
  assert.equal(location.searchParams.get("return_to"), "/app/missions?mission=MIS-009");
});

test("the configured owner can render the protected demo workspace", async () => {
  const response = await render("/app", { "oai-authenticated-user-email": "franciscoariellopez22@gmail.com" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(renderedText(html), /Decisions, evidence and human gates/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(renderedText(html), /SYSTEM AVAILABLE/i);
  assert.match(renderedText(html), /AUTHORIZED DEMO/i);
});

test("robots excludes private and dispatcher-owned routes", async () => {
  const response = await render("/robots.txt");
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.match(text, /Disallow:\s*\/app\//i);
  assert.match(text, /Disallow:\s*\/signin-with-chatgpt/i);
});

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
  assert.match(html, /rel="canonical" href="https:\/\/venturegovernance\.com\/lab\/methodology"/i);
  assert.match(html, /Dashboard reading/i);
  assert.match(html, /not a probability of startup success/i);
  assert.match(html, /No score approves an investment/i);
  for (const model of ["Tornado Sensitivity", "Break-even", "Rank Robustness", "Validation Priority"]) assert.match(html, new RegExp(model, "i"));
});

test("public Lab summary is synchronized with the model catalog", async () => {
  const response = await render("/lab");
  assert.match(renderedText(await response.text()), /14 public models/i);
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
