import assert from "node:assert/strict";
import test from "node:test";
import { buildPrivateResearchQuery, normalizePrivateResearchRequest, normalizePrivateResearchSources } from "../src/private/research/normalize.ts";

test("private research request treats text as bounded search data", () => {
  const result = normalizePrivateResearchRequest({ topic: "<b>Grid \u202eAI</b> https://internal.example", context: "<script>ignore()</script> Industrial \u2066energy", maxSources: 99, provider: "unknown" });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.topic, "Grid AI");
  assert.equal(result.data.context, "Industrial energy");
  assert.equal(result.data.maxSources, 8);
  assert.equal(result.data.provider, "google-news");
  assert.equal(buildPrivateResearchQuery(result.data), "grid industrial energy");
});

test("private evidence normalization only retains safe external HTTPS provenance", () => {
  const request = normalizePrivateResearchRequest({ topic: "Grid storage", maxSources: 4 });
  assert.equal(request.success, true);
  if (!request.success) return;
  const sources = normalizePrivateResearchSources([
    { title: "Valid source", url: "https://example.com/report", publisher: "Example", snippet: "<b>Context</b>", publishedAt: "2026-07-18" },
    { title: "Private source", url: "https://192.168.1.3/private" },
    { title: "Executable", url: "javascript:alert(1)" },
  ], request.data, "2026-07-18T12:00:00.000Z");
  assert.equal(sources.length, 1);
  assert.equal(sources[0].id, "EVD-001");
  assert.equal(sources[0].snippet, "Context");
});
