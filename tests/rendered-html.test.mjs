import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";

process.env.VG_OWNER_EMAIL = "owner@example.test";
process.env.VG_TRUST_CHATGPT_AUTH_HEADERS = "1";
process.env.VG_TRUSTED_SITES_HOSTS = "localhost";

async function render(pathname, headers = {}, options = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  const requestHost = options.requestHost ?? "localhost";
  const workerEnvironment = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    VG_TRUST_CHATGPT_AUTH_HEADERS: options.trustFlag ?? "1",
    VG_TRUSTED_SITES_HOSTS: options.trustedHosts ?? "localhost",
  };
  return worker.fetch(
    new Request(`http://${requestHost}${pathname}`, { headers: { accept: "text/html", host: requestHost, ...headers } }),
    workerEnvironment,
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function renderedText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

for (const [pathname, expected] of [
  ["/", "Venture Governance System"],
  ["/lab", "Explore how governed agents"],
  ["/lab/demo", "Run Lab Simulation"],
  ["/lab/simulation", "Aerial resilience"],
  ["/lab/companies", "Estados contables"],
  ["/lab/methodology", "Score is an analytical interface"],
  ["/lab/results/example", "LOADING LOCAL RESULT"],
  ["/applications", "One architecture"],
  ["/applications/energy-prioritize", "Prioritized portfolio"],
  ["/app/login", "Enter the protected command layer"],
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
  assert.match(anonymous.headers.get("cache-control") ?? "", /private/i);
  assert.match(anonymous.headers.get("cache-control") ?? "", /no-store/i);

  const nonMember = await render("/app", { "oai-authenticated-user-email": "not-authorized@example.com" });
  assert.ok([302, 303, 307, 308].includes(nonMember.status));
  assert.match(nonMember.headers.get("location") ?? "", /\/app\/login\?reason=not-authorized/i);
  assert.match(nonMember.headers.get("cache-control") ?? "", /no-store/i);
});

test("private identity headers fail closed without exact Sites host trust", async () => {
  const originalHosts = process.env.VG_TRUSTED_SITES_HOSTS;
  try {
    process.env.VG_TRUSTED_SITES_HOSTS = "";
    const missingAllowlist = await render(
      "/app",
      { "oai-authenticated-user-email": "owner@example.test" },
      { trustedHosts: "" },
    );
    assert.match(missingAllowlist.headers.get("location") ?? "", /\/signin-with-chatgpt/i);
  } finally {
    process.env.VG_TRUSTED_SITES_HOSTS = originalHosts;
  }

  const previewHost = await render(
    "/app",
    { "oai-authenticated-user-email": "owner@example.test" },
    { requestHost: "preview.example.test", trustedHosts: "localhost" },
  );
  assert.match(previewHost.headers.get("location") ?? "", /\/signin-with-chatgpt/i);

  const contradictoryForwarding = await render("/app", {
    "oai-authenticated-user-email": "owner@example.test",
    "x-forwarded-host": "attacker.example.test",
  });
  assert.match(contradictoryForwarding.headers.get("location") ?? "", /\/signin-with-chatgpt/i);
});

test("private platform preserves a requested deep link through sign-in", async () => {
  const response = await render("/app/missions?mission=MIS-009");
  assert.ok([302, 303, 307, 308].includes(response.status));
  const location = new URL(response.headers.get("location") ?? "http://localhost/", "http://localhost");
  assert.equal(location.pathname, "/signin-with-chatgpt");
  assert.equal(location.searchParams.get("return_to"), "/app/missions?mission=MIS-009");
});

test("the configured owner can render the protected demo workspace", async () => {
  const response = await render("/app", { "oai-authenticated-user-email": "owner@example.test" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  const html = await response.text();
  assert.match(renderedText(html), /Decisions, evidence and human gates/i);
  assert.match(html, /noindex/i);
  assert.doesNotMatch(renderedText(html), /SYSTEM AVAILABLE/i);
  assert.match(renderedText(html), /AUTHENTICATED WORKSPACE/i);
  assert.match(html, /href="\/app\/private-capital-intelligence"/i);
  assert.match(renderedText(html), /Private Capital.*Owner only/i);
});

test("authorized non-owner users do not receive the Private Capital shortcut", async () => {
  const previous = process.env.VG_AUTHORIZED_EMAILS;
  process.env.VG_AUTHORIZED_EMAILS = "member@example.test";
  try {
    const response = await render("/app", { "oai-authenticated-user-email": "member@example.test" });
    assert.equal(response.status, 200);
    assert.doesNotMatch(await response.text(), /href="\/app\/private-capital-intelligence"/i);
  } finally {
    if (previous === undefined) delete process.env.VG_AUTHORIZED_EMAILS;
    else process.env.VG_AUTHORIZED_EMAILS = previous;
  }
});

test("the configured owner can open Private Capital and reach the Thesis Lab", async () => {
  const response = await render("/app/private-capital-intelligence", { "oai-authenticated-user-email": "owner@example.test" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(renderedText(html), /Private Capital.*Thesis Lab/i);
  assert.match(renderedText(html), /Decision-support environment/i);
  assert.match(html, /noindex/i);
});

test("the configured owner can render execution feasibility and its report controls", async () => {
  const response = await render("/app/execution-feasibility", { "oai-authenticated-user-email": "owner@example.test" });
  assert.equal(response.status, 200);
  const text = renderedText(await response.text());
  for (const expected of ["Determine whether a plan can be executed", "Duration estimate", "Expected cost", "Generate report", "WBS (?:&|&amp;) critical path", "Human review gate"]) {
    assert.match(text, new RegExp(expected, "i"));
  }
  assert.match(text, /Nothing here approves funding, procurement, contracting or deployment/i);
});

test("the configured owner can render a domain-specific private mini-app", async () => {
  const response = await render("/app/applications/agriculture", { "oai-authenticated-user-email": "owner@example.test" });
  assert.equal(response.status, 200);
  const text = renderedText(await response.text());
  for (const expected of ["Field Yield Command", "Rendimiento, agua y riesgo agronomico", "SIMULACION PROPIA", "Agronomy Analyst", "Sintetico"]) {
    assert.match(text, new RegExp(expected, "i"));
  }
  assert.doesNotMatch(text, /autonomous investment approval|real patient data/i);
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

test("synthetic aerial Lab stays non-operational and exposes only four public agents", async () => {
  const response = await render("/lab/simulation");
  assert.equal(response.status, 200);
  const html = await response.text();
  const text = renderedText(html);
  for (const name of ["Mathematics", "Finance", "Strategy", "Marketing"]) assert.match(text, new RegExp(name, "i"));
  assert.match(text, /synthetic.*academic.*non-operational/i);
  assert.match(text, /No real geography.*No weapons.*No physical control/i);
  assert.match(text, /cannot ingest live feeds or produce operational instructions/i);
  assert.doesNotMatch(text, /Tokenomics Agent|Red Team Agent|Investment Committee Agent/i);
  assert.doesNotMatch(html, /<audio[^>]+autoplay/i);
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
  assert.match(renderedText(await response.text()), /16 public models/i);
});

test("landing keeps the document private and preserves the public IP boundary", async () => {
  const response = await render("/");
  const html = await response.text();
  const text = renderedText(html);
  assert.doesNotMatch(html, /whitepaper|\/documents\/[^"']+\.pdf/i);
  assert.match(text, /4 agentes p[uú]blicos/i);
  assert.match(text, /16 modelos/i);
  for (const name of ["Mathematics", "Finance", "Strategy", "Marketing"]) assert.match(text, new RegExp(name, "i"));
  assert.doesNotMatch(text, /20 roles|6 runtimes|1[\.,]000 hip[oó]tesis/i);
  await assert.rejects(access(new URL("../public/documents/venture-governance-system-whitepaper-2026.pdf", import.meta.url)));
  await assert.rejects(access(new URL("../public/documents/venture-governance-system-whitepaper-publico-v2.pdf", import.meta.url)));
});

test("Lab audio has no autoplay markup", async () => {
  const response = await render("/lab/demo");
  const html = await response.text();
  assert.doesNotMatch(html, /<audio[^>]+autoplay/i);
  assert.match(html, /Sound On/i);
  assert.match(html, /Lab volume/i);
});
