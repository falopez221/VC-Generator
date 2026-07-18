import test from "node:test";
import assert from "node:assert/strict";
import valuationData from "../src/lab/valuation-data.json" with { type: "json" };
import { calculateReadinessScore, calculateScenarioDcf } from "../src/lab/valuation.ts";

test("valuation readiness weights normalize to one hundred percent", () => {
  const totalWeight = valuationData.readiness.components.reduce((sum, item) => sum + item.weightPct, 0);
  assert.equal(totalWeight, 100);
  assert.equal(calculateReadinessScore(valuationData.readiness.components), valuationData.readiness.score);
});

test("valuation DCF reproduces disclosed scenario values", () => {
  for (const scenario of valuationData.dcfScenarios) {
    const result = calculateScenarioDcf(scenario);
    assert.ok(Number.isFinite(result.enterpriseValueM));
    assert.ok(Math.abs(result.enterpriseValueM - scenario.npvM) < 0.01, `${scenario.id} should reconcile`);
  }
});

test("stage values remain ordered and probabilities do not increase", () => {
  for (const stage of valuationData.stages) {
    assert.ok(stage.lowM <= stage.p50M);
    assert.ok(stage.p50M <= stage.p90M);
    assert.ok(stage.p90M <= stage.highM);
  }
  for (let index = 1; index < valuationData.stages.length; index += 1) {
    assert.ok(valuationData.stages[index].probabilityFromCurrentPct <= valuationData.stages[index - 1].probabilityFromCurrentPct);
  }
});
