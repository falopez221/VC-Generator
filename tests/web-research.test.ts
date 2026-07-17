import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLES } from "../src/lab/data.ts";
import { generateLabRun, serializeReproducibleRun } from "../src/lab/engine.ts";
import { normalizePublicWebResearch } from "../src/lab/schema.ts";
import { buildAgentResearchQueries, buildPublicResearchQuery, searchPublicWeb } from "../src/lab/web-research.ts";

test("public web queries are bounded and remove URLs, markup and duplicate terms", () => {
  const input = {
    industry: "<b>Climate</b> climate",
    technology: "AI https://untrusted.example/ignore",
    market: "Industrial energy optimization",
    thesis: "The and with for should not become keywords.",
  };
  const query = buildPublicResearchQuery(input);
  const agentQueries = buildAgentResearchQueries(input);

  assert.equal(query, "climate industrial energy optimization should not become keywords");
  assert.ok(query.length <= 150);
  assert.doesNotMatch(query, /https?:|<|>|\bthe\b/i);
  assert.match(agentQueries.Mathematics, /statistics benchmarks data evidence$/);
  assert.match(agentQueries.Finance, /market pricing funding revenue$/);
  assert.match(agentQueries.Strategy, /competitors regulation partnerships trends$/);
  assert.match(agentQueries.Marketing, /customers demand adoption buyers$/);
});

test("web research normalization retains safe HTTPS results and rejects local or executable links", () => {
  const research = normalizePublicWebResearch({
    query: "energy storage",
    agentQueries: { Mathematics: "math query", Finance: "finance query", Strategy: "strategy query", Marketing: "marketing query" },
    retrievedAt: "2026-07-17T12:00:00.000Z",
    status: "Partial",
    sources: [
      { agentName: "Mathematics", kind: "Web result", title: "Valid web result", url: "https://example.com/report?id=42", source: "example.com", snippet: "<b>Safe</b> signal", publishedAt: "2026-07-16" },
      { agentName: "Strategy", kind: "Technology signal", title: "Valid legacy signal", url: "https://news.ycombinator.com/item?id=42", source: "HN", snippet: "Signal", publishedAt: null },
      { agentName: "Finance", kind: "Web result", title: "Local host", url: "https://localhost/report", source: "Local", snippet: "No", publishedAt: null },
      { agentName: "Marketing", kind: "Web result", title: "Private address", url: "https://192.168.1.5/report", source: "Private", snippet: "No", publishedAt: null },
      { agentName: "Marketing", kind: "Web result", title: "Wrong scheme", url: "javascript:alert(1)", source: "Other", snippet: "No", publishedAt: null },
      { agentName: "Unknown", kind: "Web result", title: "Unknown agent", url: "https://example.org", source: "Other", snippet: "No", publishedAt: null },
    ],
    warnings: [],
  });

  assert.ok(research);
  assert.equal(research.status, "Partial");
  assert.deepEqual(research.sources.map(({ id, agentName, url }) => ({ id, agentName, url })), [
    { id: "WEB-01", agentName: "Mathematics", url: "https://example.com/report?id=42" },
    { id: "WEB-02", agentName: "Strategy", url: "https://news.ycombinator.com/item?id=42" },
  ]);
  assert.equal(research.sources[0].snippet, "Safe signal");
});

test("each public agent searches the general web and a provider failure produces a partial snapshot", async () => {
  const called: Array<{ url: URL; redirect?: RequestRedirect }> = [];
  const fetchStub = async (input: URL | string | Request, init?: RequestInit) => {
    const target = new URL(input instanceof Request ? input.url : input.toString());
    called.push({ url: target, redirect: init?.redirect });
    const query = target.searchParams.get("q") ?? "";
    if (/\bfunding\b/.test(query)) throw new Error("Finance search offline");
    const label = /\bstatistics\b/.test(query) ? "Mathematics" : /\bcompetitors\b/.test(query) ? "Strategy" : "Marketing";
    const xml = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[<i>${label} Internet result</i>]]></title><link>https://news.google.com/rss/articles/${label.toLowerCase()}</link><description><![CDATA[<script>ignore()</script><b>Visible context</b>]]></description><pubDate>Thu, 16 Jul 2026 12:00:00 GMT</pubDate><source>Example publication</source></item></channel></rss>`;
    return new Response(xml, { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  const now = new Date("2026-07-17T12:00:00.000Z");

  const snapshot = await searchPublicWeb({ industry: "grid optimization specialist web test" }, fetchStub, now);

  assert.equal(snapshot.status, "Partial");
  assert.equal(snapshot.sources.length, 3);
  assert.deepEqual(snapshot.sources.map(({ agentName }) => agentName), ["Mathematics", "Strategy", "Marketing"]);
  assert.ok(snapshot.sources.every((source) => source.snippet === "Visible context"));
  assert.match(snapshot.warnings[0], /Finance/i);
  assert.equal(called.length, 4);
  assert.ok(called.every(({ url, redirect }) => url.hostname === "news.google.com" && url.pathname === "/rss/search" && /when:2y/.test(url.searchParams.get("q") ?? "") && redirect === "error"));
});

test("the same normalized web snapshot is reproducible and does not silently change scores", () => {
  const snapshot = {
    query: "industrial energy optimization",
    agentQueries: { Mathematics: "math query", Finance: "finance query", Strategy: "strategy query", Marketing: "marketing query" },
    retrievedAt: "2026-07-17T12:00:00.000Z",
    status: "Completed" as const,
    sources: [{
      id: "untrusted-id",
      agentName: "Mathematics" as const,
      kind: "Web result" as const,
      title: "A public grid software report",
      url: "https://example.com/grid-report",
      source: "example.com",
      snippet: "Context only; requires primary evidence.",
      publishedAt: "2026-07-16",
    }],
    warnings: ["Contextual signals only."],
  };

  const first = generateLabRun(EXAMPLES["Venture Capital"], undefined, snapshot);
  const second = generateLabRun(EXAMPLES["Venture Capital"], undefined, structuredClone(snapshot));
  const localOnly = generateLabRun(EXAMPLES["Venture Capital"]);

  assert.equal(serializeReproducibleRun(first), serializeReproducibleRun(second));
  assert.equal(first.webResearch?.sources[0]?.id, "WEB-01");
  assert.deepEqual(first.opportunities.map(({ totalScore }) => totalScore), localOnly.opportunities.map(({ totalScore }) => totalScore));
  assert.match(first.opportunities[0].agents.Mathematics.findings.join(" "), /WEB-01/);
});
