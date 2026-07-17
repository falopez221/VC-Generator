import assert from "node:assert/strict";
import test from "node:test";
import { APPLICATION_CATALOG, APPLICATION_DOMAINS, CROSS_DOMAIN_MISSIONS, validateApplicationCatalog } from "../src/applications/catalog.ts";
import { buildMission, classifyMissionRisk, EMPTY_FILTERS, filterApplications, filtersFromSearchParams, filtersToSearchParams, recommendAgents, recommendModels } from "../src/applications/engine.ts";

test("catalog exposes 150 bilingual, unique and connected applications", () => {
  assert.equal(APPLICATION_CATALOG.length, 150);
  assert.equal(APPLICATION_DOMAINS.length, 30);
  assert.equal(CROSS_DOMAIN_MISSIONS.length, 25);
  assert.equal(APPLICATION_CATALOG.filter((item) => item.featured).length, 20);
  assert.deepEqual(validateApplicationCatalog(APPLICATION_CATALOG), []);
  assert.equal(new Set(APPLICATION_CATALOG.map((item) => item.id)).size, 150);
  assert.equal(new Set(APPLICATION_CATALOG.map((item) => item.slug)).size, 150);
  for (const item of APPLICATION_CATALOG) {
    assert.ok(item.title.es && item.title.en);
    assert.ok(item.agentRoles.length >= 4);
    assert.ok(item.mathematicalModels.length >= 3);
    assert.ok(item.outputs.length >= 3);
  }
});

test("search and combined filters remain deterministic", () => {
  const energy = filterApplications(APPLICATION_CATALOG, { ...EMPTY_FILTERS, query: "energy", decision: "Prioritize", risk: "high-impact" });
  assert.ok(energy.length > 0);
  assert.ok(energy.every((item) => item.decisionTypes.includes("Prioritize") && item.riskLevel === "high-impact"));
  assert.deepEqual(filterApplications(APPLICATION_CATALOG, { ...EMPTY_FILTERS, query: "impossible-query-value" }), []);
});

test("filter URL state round-trips without hidden values", () => {
  const filters = { ...EMPTY_FILTERS, domain: "Energy", decision: "Prioritize", method: "Monte Carlo", governance: "independent-review" };
  const params = filtersToSearchParams(filters, { view: "matrix" });
  assert.equal(params.get("view"), "matrix");
  assert.deepEqual(filtersFromSearchParams(params), filters);
});

test("mission recommendations expose reasons, outputs, limits and governance", () => {
  const question = "How should a country prioritize critical infrastructure and hospital capacity?";
  assert.equal(classifyMissionRisk(["Healthcare", "Infrastructure"], question), "mandatory-authorization");
  const agents = recommendAgents(["Healthcare", "Infrastructure"], question);
  const models = recommendModels(["Healthcare", "Infrastructure"], question);
  assert.ok(agents.some((agent) => agent.name === "Human Committee"));
  assert.ok(agents.every((agent) => agent.reason && agent.output && agent.limit));
  assert.ok(models.some((model) => model.name === "System dynamics"));
  assert.ok(models.every((model) => model.purpose && model.tradeoff));
  const mission = buildMission({ question, organization: "National government", domains: ["Healthcare", "Infrastructure"], horizon: "3–10 years", constraints: "Authorized evidence", riskTolerance: "low", output: "Decision dossier" });
  assert.equal(mission.governance, "mandatory-authorization");
});

test("defense catalog remains analytical and non-offensive", () => {
  const text = JSON.stringify(APPLICATION_CATALOG.filter((item) => item.primaryDomain === "Defense"));
  assert.doesNotMatch(text, /targeting|weapons design|autonomous lethal|attack optimization|evasion system/i);
  assert.match(text, /resilience/i);
});
