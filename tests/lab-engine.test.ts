import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLES, DEFAULT_WEIGHTS, PRESETS } from "../src/lab/data.ts";
import { addEvidence, generateLabRun, rerankLabRun, serializeReproducibleRun, updateHumanDecision } from "../src/lab/engine.ts";
import { bayesianUpdate, calculateMCDA, classifyOpportunity, normalizeWeights, paretoFront, runMonteCarlo } from "../src/lab/models.ts";
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
  assert.equal(Object.keys(result.contributions).length, 8);
  assert.ok(result.interval[0] <= result.weightedScore && result.interval[1] >= result.weightedScore);
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

test("Pareto comparison retains at least one non-dominated opportunity", () => {
  const run = generateLabRun(EXAMPLES["Corporate Innovation"]);
  const points = paretoFront(run.opportunities, "potential", "risk");
  assert.ok(points.some((point) => !point.dominated));
});

test("human decisions and new evidence persist in run state", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  const id = run.opportunities[0].id;
  const decided = updateHumanDecision(run, id, "Promising");
  assert.equal(decided.opportunities.find((opportunity) => opportunity.id === id)?.humanDecision, "Promising");
  const updated = addEvidence(decided, id, "Observed willingness-to-pay test reached the public threshold.");
  assert.ok((updated.opportunities.find((opportunity) => opportunity.id === id)?.availableEvidence.length ?? 0) > run.opportunities[0].availableEvidence.length);
});
