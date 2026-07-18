import assert from "node:assert/strict";
import test from "node:test";
import { aggregateMission, analyzeScenarios, PRIVATE_MODEL_DISCLOSURE, simulateScenarioOutcomes } from "../src/private/models/index.ts";

const scenarios = {
  discountRatePercent: 0,
  scenarios: [
    { id: "upside", likelihood: 60, annualRevenue: 1_000, grossMarginPercent: 100, annualOperatingCost: 0, initialCapital: 100, horizonYears: 2, uncertaintyPercent: 10 },
    { id: "downside", likelihood: 40, annualRevenue: 0, grossMarginPercent: 0, annualOperatingCost: 0, initialCapital: 100, horizonYears: 2, uncertaintyPercent: 0 },
  ],
};

test("scenario analysis is deterministic, discounted, and manually reconcilable", () => {
  const result = analyzeScenarios(scenarios);
  assert.equal(result.scenarioCount, 2);
  assert.equal(result.scenarios[0].netPresentValue, 1_900);
  assert.equal(result.scenarios[1].netPresentValue, -100);
  assert.equal(result.expectedNetPresentValue, 1_100);
  assert.equal(result.probabilityOfLossPercent, 40);
  assert.equal(result.p10NetPresentValue, -100);
  assert.equal(result.medianNetPresentValue, 1_900);
  assert.ok(result.lowerExpectedNetPresentValue <= result.expectedNetPresentValue);
  assert.ok(result.upperExpectedNetPresentValue >= result.expectedNetPresentValue);
});

test("scenario analysis bounds malformed inputs and normalizes zero likelihoods", () => {
  const result = analyzeScenarios({
    discountRatePercent: Number.NaN,
    scenarios: [{ id: "", likelihood: -20, annualRevenue: Number.POSITIVE_INFINITY, grossMarginPercent: 140, annualOperatingCost: -1, initialCapital: -2, horizonYears: 0, uncertaintyPercent: 999 }],
  });
  assert.equal(result.discountRatePercent, 0);
  assert.equal(result.scenarios[0].id, "scenario-1");
  assert.equal(result.scenarios[0].likelihoodPercent, 100);
  assert.ok(result.scenarios[0].netPresentValue <= 1_000_000_000_000);
  assert.ok(result.scenarios[0].uncertaintyPercent <= 95);
});

test("seeded scenario sampling is reproducible and reports bounded ordered statistics", () => {
  const config = { samples: 500, seed: 421 };
  const first = simulateScenarioOutcomes(scenarios, config);
  const second = simulateScenarioOutcomes(scenarios, config);
  assert.deepEqual(first, second);
  assert.equal(first.samples, 500);
  assert.ok(first.minimumNetPresentValue <= first.p10NetPresentValue);
  assert.ok(first.p10NetPresentValue <= first.medianNetPresentValue);
  assert.ok(first.medianNetPresentValue <= first.p90NetPresentValue);
  assert.ok(first.p90NetPresentValue <= first.maximumNetPresentValue);
  assert.ok(first.probabilityOfLossPercent >= 0 && first.probabilityOfLossPercent <= 100);
});

test("mission aggregation normalizes allocations and exposes risk contribution", () => {
  const result = aggregateMission({
    candidates: [
      { id: "evidence-led", allocation: 3, score: 80, confidencePercent: 75, riskPercent: 20 },
      { id: "speculative", allocation: 1, score: 90, confidencePercent: 30, riskPercent: 80 },
    ],
  });
  assert.equal(result.candidateCount, 2);
  assert.equal(result.contributions.reduce((sum, item) => sum + item.allocationPercent, 0), 100);
  assert.equal(result.highestRiskContributorId, "speculative");
  assert.ok(result.missionIndex >= 0 && result.missionIndex <= 100);
  assert.ok(result.evidenceCoveragePercent >= 0 && result.evidenceCoveragePercent <= 100);
  assert.ok(result.riskExposurePercent >= 0 && result.riskExposurePercent <= 100);
  assert.ok(result.concentrationIndex > 0 && result.concentrationIndex <= 10_000);
});

test("private model disclosure states assumptions and non-advisory limits", () => {
  assert.ok(PRIVATE_MODEL_DISCLOSURE.assumptions.length >= 3);
  assert.ok(PRIVATE_MODEL_DISCLOSURE.limitations.some((item) => /not predict returns/i.test(item)));
});
