import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLES, DEFAULT_WEIGHTS, PRESETS } from "../src/lab/data.ts";
import { addEvidence, generateLabRun, rerankLabRun, serializeReproducibleRun, updateHumanDecision } from "../src/lab/engine.ts";
import { bayesianUpdate, calculateMCDA, classifyOpportunity, leastSquaresTrend, normalizeLabWeights, normalizeWeights, paretoFront, runMonteCarlo } from "../src/lab/models.ts";
import { calculateBreakEven, calculateRankRobustness, calculateTornadoSensitivity, calculateValidationPriority } from "../src/lab/decision-models.ts";
import { PUBLIC_MODEL_CATALOG, PUBLIC_MODEL_COUNT, PUBLIC_MODEL_VERSION } from "../src/lab/model-catalog.ts";
import { isAgentResult, isOpportunity, validateLabInput } from "../src/lab/schema.ts";
import { structureIdea } from "../src/lab/idea-assistant.ts";

test("validates and bounds the public input", () => {
  const result = validateLabInput({ ...EXAMPLES["Venture Capital"], opportunityCount: 100, seed: -5, problem: "<b>test problem with enough detail</b>" });
  assert.equal(result.success, true);
  assert.equal(result.data.opportunityCount, 12);
  assert.equal(result.data.seed, 1);
  assert.doesNotMatch(result.data.problem, /[<>]/);
});

test("idea intake assistant summarizes Spanish text and suggests editable parameters", () => {
  const result = structureIdea({
    ...EXAMPLES["Venture Capital"],
    ideaNarrative: "Las empresas agrícolas necesitan detectar enfermedades de cultivos antes de perder producción. Una plataforma con inteligencia artificial y sensores podría analizar imágenes para productores agrícolas y recomendar una inspección temprana.",
    ideaSummary: "",
  });
  assert.equal(result.success, true);
  assert.match(result.input.ideaSummary, /Core problem/i);
  assert.equal(result.input.industry, "Agriculture technology");
  assert.equal(result.input.technology, "Artificial intelligence");
  assert.equal(result.input.customerType, "B2B organizations");
  assert.match(result.input.market, /productores agrícolas/i);
});

test("idea intake assistant requests enough context", () => {
  const result = structureIdea({ ...EXAMPLES["Venture Capital"], ideaNarrative: "Una app.", ideaSummary: "" });
  assert.equal(result.success, false);
  assert.match(result.error ?? "", /at least 40 characters/i);
});

test("same seed and parameters generate reproducible structured results", () => {
  const first = generateLabRun(EXAMPLES["Venture Capital"]);
  const second = generateLabRun(EXAMPLES["Venture Capital"]);
  assert.equal(serializeReproducibleRun(first), serializeReproducibleRun(second));
  assert.equal(first.opportunities.length, EXAMPLES["Venture Capital"].opportunityCount);
  assert.ok(first.opportunities.every(isOpportunity));
  assert.ok(Object.values(first.opportunities[0].agents).every(isAgentResult));
});

test("changing seed changes generated values", () => {
  const first = generateLabRun(EXAMPLES["Corporate Innovation"]);
  const second = generateLabRun({ ...EXAMPLES["Corporate Innovation"], seed: EXAMPLES["Corporate Innovation"].seed + 1 });
  assert.notEqual(serializeReproducibleRun(first), serializeReproducibleRun(second));
});

test("normalizes public weights to one hundred percent", () => {
  const normalized = normalizeWeights({ Mathematics: 60, Finance: 20, Strategy: 10, Marketing: 4 });
  const sum = Object.values(normalized).reduce((total, value) => total + value, 0);
  assert.ok(Math.abs(sum - 100) < 0.001);
});

test("MCDA is bounded and exposes public adjustments", () => {
  const run = generateLabRun(EXAMPLES["Technology Exploration"]);
  const result = calculateMCDA(run.opportunities[0], DEFAULT_WEIGHTS);
  assert.ok(result.weightedScore >= 0 && result.weightedScore <= 100);
  assert.ok(result.riskPenalty >= 0);
  assert.ok(result.uncertaintyPenalty >= 0 && result.uncertaintyPenalty <= 8);
  assert.equal(Object.keys(result.contributions).length, 8);
  assert.ok(result.interval[0] <= result.weightedScore && result.interval[1] >= result.weightedScore);
});

test("default MCDA does not collapse almost every opportunity to zero", () => {
  for (const example of Object.values(EXAMPLES)) {
    const run = generateLabRun(example);
    assert.ok(run.opportunities.every((opportunity) => opportunity.totalScore > 0));
    assert.ok(run.opportunities.some((opportunity) => calculateMCDA(opportunity, run.weights).weightedScore > 40));
  }
});

test("run identity includes the complete validated input and public model version", () => {
  const baseline = EXAMPLES["Venture Capital"];
  const first = generateLabRun(baseline);
  const changedRegion = generateLabRun({ ...baseline, region: "Europe" });
  const changedEvidence = generateLabRun({ ...baseline, availableEvidence: `${baseline.availableEvidence}; new interview` });
  const changedCapital = generateLabRun({ ...baseline, estimatedCapital: baseline.estimatedCapital + 25000 });
  assert.equal(first.modelVersion, PUBLIC_MODEL_VERSION);
  assert.notEqual(first.id, changedRegion.id);
  assert.notEqual(first.id, changedEvidence.id);
  assert.notEqual(first.id, changedCapital.id);
});

test("stored public weights are normalized and bounded", () => {
  const weights = normalizeLabWeights({
    ...DEFAULT_WEIGHTS,
    agents: { Mathematics: 90, Finance: 4, Strategy: 3, Marketing: 3 },
    dimensions: { ...DEFAULT_WEIGHTS.dimensions, marketPotential: 99 },
    riskAversion: 140,
  });
  const run = generateLabRun(EXAMPLES["Venture Capital"], weights);
  assert.ok(Math.abs(Object.values(run.weights.agents).reduce((sum, value) => sum + value, 0) - 100) < 0.001);
  assert.ok(Math.abs(Object.values(run.weights.dimensions).reduce((sum, value) => sum + value, 0) - 100) < 0.001);
  assert.equal(run.weights.riskAversion, 100);
});

test("Monte Carlo is deterministic and returns requested public statistics", () => {
  const opportunity = generateLabRun(EXAMPLES["Venture Capital"]).opportunities[0];
  const config = { simulations: 600, distribution: "triangular" as const, seed: 99, successThreshold: 20, marketGrowth: 120, adoption: 42, price: 24000, cac: 5200, churn: 14, margin: 62, initialInvestment: 1000000 };
  const first = runMonteCarlo(opportunity, config);
  const second = runMonteCarlo(opportunity, config);
  assert.deepEqual(first, second);
  assert.equal(first.samples.length, 600);
  assert.equal(first.histogram.length, 18);
  assert.ok(first.p10 <= first.median && first.median <= first.p90);
});

test("Bayesian update responds to positive evidence", () => {
  const result = bayesianUpdate(35, 80, 12, 15);
  assert.ok(result.posterior > result.prior);
  assert.ok(result.posterior < 100);
});

test("high score with weak evidence is not highly promising", () => {
  assert.notEqual(classifyOpportunity(92, 24, 30, 20, 4), "Highly Promising");
  assert.equal(classifyOpportunity(92, 24, 30, 20, 4), "Insufficient Evidence");
});

test("sensitivity reranks and explains every opportunity", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  const result = rerankLabRun(run, PRESETS["Quantitative First"]);
  assert.equal(result.deltas.length, run.opportunities.length);
  assert.ok(result.deltas.every((delta) => delta.mainDriver.length > 10));
  assert.ok(Math.abs(Object.values(result.run.weights.agents).reduce((sum, value) => sum + value, 0) - 100) < 0.001);
});

test("reranking explanation identifies the parameter that actually changed", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  const result = rerankLabRun(run, { ...run.weights, riskAversion: run.weights.riskAversion + 12 });
  assert.ok(result.deltas.every((delta) => /Risk aversion increased by 12/i.test(delta.mainDriver)));
});

test("Pareto comparison retains at least one non-dominated opportunity", () => {
  const run = generateLabRun(EXAMPLES["Corporate Innovation"]);
  const points = paretoFront(run.opportunities, "potential", "risk");
  assert.ok(points.some((point) => !point.dominated));
});

test("least squares exposes a bounded descriptive fit", () => {
  const result = leastSquaresTrend([{ id: "A", x: 10, y: 20 }, { id: "B", x: 20, y: 40 }, { id: "C", x: 30, y: 60 }]);
  assert.equal(result.slope, 2);
  assert.equal(result.intercept, 0);
  assert.equal(result.rSquared, 1);
  assert.equal(result.rmse, 0);
  assert.equal(result.informative, true);
  assert.deepEqual(result.points.map((point) => point.fittedY), [20, 40, 60]);
});

test("least squares reports non-informative edge cases without NaN", () => {
  const empty = leastSquaresTrend([]);
  const single = leastSquaresTrend([{ id: "A", x: 10, y: 20 }]);
  const constantX = leastSquaresTrend([{ id: "A", x: 10, y: 20 }, { id: "B", x: 10, y: 30 }]);
  const constantY = leastSquaresTrend([{ id: "A", x: 10, y: 20 }, { id: "B", x: 30, y: 20 }]);
  for (const result of [empty, single, constantX, constantY]) {
    assert.equal(result.informative, false);
    assert.ok(Number.isFinite(result.rSquared));
    assert.ok(Number.isFinite(result.rmse));
  }
});

test("tornado sensitivity is deterministic, bounded and ordered by spread", () => {
  const run = generateLabRun(EXAMPLES["Corporate Innovation"]);
  const opportunity = run.opportunities[0];
  const first = calculateTornadoSensitivity(opportunity, run.weights, 10);
  const second = calculateTornadoSensitivity(opportunity, run.weights, 10);
  assert.deepEqual(first, second);
  assert.equal(first.items.length, 8);
  assert.ok(first.items.every((item) => item.scoreLow >= 0 && item.scoreHigh <= 100 && item.spread >= 0));
  assert.ok(first.items.every((item, index) => index === 0 || first.items[index - 1].spread >= item.spread));
});

test("break-even model reconciles a manually verifiable case", () => {
  const result = calculateBreakEven({ annualPrice: 1000, acquisitionCost: 100, churn: 0, grossMargin: 50, fixedCost: 4000, addressableCustomers: 20, expectedAdoption: 50 });
  assert.equal(result.contributionPerCustomer, 400);
  assert.equal(result.breakEvenCustomers, 10);
  assert.equal(result.breakEvenAdoption, 50);
  assert.equal(result.paybackMonths, 12);
  assert.equal(result.feasibleWithinMarket, true);
});

test("rank robustness is seeded, bounded and covers every opportunity", () => {
  const run = generateLabRun(EXAMPLES["Technology Exploration"]);
  const config = { samples: 100, jitter: 20, seed: 77 };
  const first = calculateRankRobustness(run.opportunities, run.weights, config);
  const second = calculateRankRobustness(run.opportunities, run.weights, config);
  assert.deepEqual(first, second);
  assert.equal(first.items.length, run.opportunities.length);
  assert.ok(first.items.every((item) => item.bestRank >= 1 && item.worstRank <= run.opportunities.length && item.firstPlaceFrequency >= 0 && item.topThreeFrequency <= 100));
});

test("validation priority uses only the four public agents and stays ordinal", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  const result = calculateValidationPriority(run.opportunities[0], 65, 30);
  assert.deepEqual(new Set(result.items.map((item) => item.agentName)), new Set(["Mathematics", "Finance", "Strategy", "Marketing"]));
  assert.ok(result.items.every((item) => item.priority >= 0 && item.priority <= 100));
  assert.ok(result.items.every((item, index) => index === 0 || result.items[index - 1].priority >= item.priority));
});

test("the model catalog is the single complete public model inventory", () => {
  assert.equal(PUBLIC_MODEL_COUNT, 12);
  assert.equal(new Set(PUBLIC_MODEL_CATALOG.map((model) => model.id)).size, PUBLIC_MODEL_COUNT);
  assert.ok(PUBLIC_MODEL_CATALOG.every((model) => model.limitation.length > 30));
});

test("human decisions and new evidence persist in run state", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  const id = run.opportunities[0].id;
  const decided = updateHumanDecision(run, id, "Promising");
  assert.equal(decided.opportunities.find((opportunity) => opportunity.id === id)?.humanDecision, "Promising");
  const updated = addEvidence(decided, id, "Observed willingness-to-pay test reached the public threshold.");
  assert.ok((updated.opportunities.find((opportunity) => opportunity.id === id)?.availableEvidence.length ?? 0) > run.opportunities[0].availableEvidence.length);
  assert.equal(updated.opportunities.find((opportunity) => opportunity.id === id)?.totalScore, decided.opportunities.find((opportunity) => opportunity.id === id)?.totalScore);
  assert.equal(updated.opportunities.find((opportunity) => opportunity.id === id)?.category, decided.opportunities.find((opportunity) => opportunity.id === id)?.category);
  assert.equal(updated.opportunities.find((opportunity) => opportunity.id === id)?.dimensions.evidenceQuality, decided.opportunities.find((opportunity) => opportunity.id === id)?.dimensions.evidenceQuality);
  const duplicate = addEvidence(updated, id, "Observed willingness-to-pay test reached the public threshold.");
  assert.equal(duplicate.opportunities.find((opportunity) => opportunity.id === id)?.availableEvidence.length, updated.opportunities.find((opportunity) => opportunity.id === id)?.availableEvidence.length);
});
