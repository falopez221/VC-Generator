import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLES, DEFAULT_WEIGHTS, PRESETS } from "../src/lab/data.ts";
import { addEvidence, generateLabRun, rerankLabRun, serializeReproducibleRun, updateHumanDecision } from "../src/lab/engine.ts";
import { bayesianUpdate, calculateMCDA, classifyOpportunity, leastSquaresTrend, normalizeLabWeights, normalizeWeights, paretoFront, runMonteCarlo } from "../src/lab/models.ts";
import { calculateBreakEven, calculateRankRobustness, calculateTornadoSensitivity, calculateValidationPriority } from "../src/lab/decision-models.ts";
import { PUBLIC_MODEL_CATALOG, PUBLIC_MODEL_COUNT, PUBLIC_MODEL_VERSION } from "../src/lab/model-catalog.ts";
import { isAgentResult, isOpportunity, validateLabInput } from "../src/lab/schema.ts";
import { structureIdea } from "../src/lab/idea-assistant.ts";
import { calculateDefensibilityLens, calculateMacroeconomicLens } from "../src/lab/context-lenses.ts";
import { buildCsv, csvCell } from "../src/lab/export.ts";
import { hydrateStoredRun, listRuns } from "../src/lab/storage.ts";

test("validates and bounds the public input", () => {
  const result = validateLabInput({ ...EXAMPLES["Venture Capital"], opportunityCount: 100, seed: -5, problem: "<b>test \u202eproblem\u2066 with enough detail</b>" });
  assert.equal(result.success, true);
  assert.equal(result.data.opportunityCount, 12);
  assert.equal(result.data.seed, 1);
  assert.doesNotMatch(result.data.problem, /[<>]/);
  assert.doesNotMatch(result.data.problem, /[\u202e\u2066]/u);
});

test("CSV export neutralizes spreadsheet formulas while preserving quoting", () => {
  assert.equal(csvCell("=HYPERLINK(\"https://example.invalid\")"), '"\'=HYPERLINK(""https://example.invalid"")"');
  assert.equal(csvCell("  +1+1"), '"\'  +1+1"');
  assert.equal(csvCell("ordinary, text"), '"ordinary, text"');
  assert.equal(buildCsv([["name", "value"], ["safe", "@SUM(A1:A2)"]]), '"name","value"\r\n"safe","\'@SUM(A1:A2)"');
});

test("stored run hydration rejects deeply corrupt or unbounded opportunity state", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  assert.ok(hydrateStoredRun(run));
  const createdAt = Date.parse(run.createdAt);
  assert.equal(hydrateStoredRun(run, createdAt + 30 * 24 * 60 * 60 * 1_000 + 1), null);
  assert.equal(hydrateStoredRun(run, createdAt - 6 * 60 * 1_000), null);
  const oversized = structuredClone(run);
  oversized.opportunities[0].agents.Mathematics.findings = Array.from({ length: 100 }, () => "unbounded");
  assert.equal(hydrateStoredRun(oversized), null);
  const outOfBounds = structuredClone(run);
  outOfBounds.opportunities[0].risks[0].probability = 101;
  assert.equal(hydrateStoredRun(outOfBounds), null);
});

test("listing physically removes expired public runs from browser storage", () => {
  const run = generateLabRun(EXAMPLES["Venture Capital"]);
  const expired = { ...run, createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1_000).toISOString() };
  const values = new Map<string, string>([
    ["venture-governance-public-lab-runs-v1", JSON.stringify([expired])],
    ["venture-governance-public-lab-last-run", expired.id],
  ]);
  const localStorage = {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage } });
  try {
    assert.deepEqual(listRuns(), []);
    assert.equal(values.has("venture-governance-public-lab-runs-v1"), false);
    assert.equal(values.has("venture-governance-public-lab-last-run"), false);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
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

test("zero and invalid weights fall back to an exact uniform normalization", () => {
  const normalized = normalizeWeights({ Mathematics: 0, Finance: -5, Strategy: Number.NaN, Marketing: 0 });
  assert.deepEqual(normalized, { Mathematics: 25, Finance: 25, Strategy: 25, Marketing: 25 });
  assert.equal(Object.values(normalized).reduce((total, value) => total + value, 0), 100);
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

test("Monte Carlo unit economics respond monotonically to price and investment", () => {
  const opportunity = generateLabRun(EXAMPLES["Venture Capital"]).opportunities[0];
  const base = { simulations: 800, distribution: "triangular" as const, seed: 44, successThreshold: 20, marketGrowth: 500, adoption: 35, price: 12000, cac: 1800, churn: 12, margin: 65, initialInvestment: 750000 };
  const baseline = runMonteCarlo(opportunity, base);
  const higherPrice = runMonteCarlo(opportunity, { ...base, price: base.price * 1.5 });
  const higherInvestment = runMonteCarlo(opportunity, { ...base, initialInvestment: base.initialInvestment * 1.5 });
  assert.ok(higherPrice.mean > baseline.mean);
  assert.ok(higherInvestment.mean < baseline.mean);
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

test("defensibility and macroeconomics are bounded context lenses, not agents", () => {
  const input = {
    ...EXAMPLES["Venture Capital"],
    ideaNarrative: "A dual-use aerospace supplier platform for critical infrastructure with imported hardware and long procurement cycles.",
    industry: "Defense and aerospace",
    technology: "Dual-use sensors and software",
    horizonYears: 9,
  };
  const run = generateLabRun(input);
  const opportunity = run.opportunities[0];
  const lenses = [calculateDefensibilityLens(opportunity, run.input), calculateMacroeconomicLens(opportunity, run.input)];
  assert.deepEqual(Object.keys(opportunity.agents), ["Mathematics", "Finance", "Strategy", "Marketing"]);
  assert.ok(lenses.every((lens) => lens.score >= 0 && lens.score <= 100 && lens.exposure >= 0 && lens.exposure <= 100));
  assert.equal(lenses[1].name, "Macroeconomics");
  assert.ok(lenses[1].exposure >= 40);
});

test("thirty varied input simulations stay finite, reproducible and input-responsive", () => {
  const cases = [
    ["Defense and aerospace", "dual-use sensors for critical infrastructure", "Government procurement teams", "Europe"],
    ["Health technology", "clinical workflow software for hospitals", "Hospital operations teams", "North America"],
    ["Agriculture technology", "crop sensors and irrigation optimization", "Agricultural producers", "Latin America"],
    ["Financial technology", "compliance API for cross-border payments", "Regional banks", "Global"],
    ["Education technology", "adaptive learning platform for schools", "Public schools", "South America"],
    ["Logistics", "freight marketplace and supply-chain control tower", "Freight operators", "Asia"],
    ["Industrial technology", "robotics for factory quality inspection", "Manufacturing plants", "Europe"],
    ["Consumer software", "family budgeting mobile application", "B2C consumers", "Global"],
    ["Climate and energy", "distributed energy controls for factories", "Industrial operators", "Latin America"],
    ["Enterprise software", "knowledge graph API for audit evidence", "Enterprise compliance teams", "Global"],
  ] as const;
  const signatures = new Set<string>();
  for (let index = 0; index < 30; index += 1) {
    const [industry, technology, customerType, region] = cases[index % cases.length];
    const input = {
      ...EXAMPLES["Venture Capital"],
      ideaNarrative: `${customerType} need a safer way to manage ${technology}. The venture would test a narrow workflow before expansion.`,
      ideaSummary: "",
      analysisName: `${industry} stress case ${index + 1}`,
      problem: `${customerType} face repeated operational losses because current tools do not manage ${technology} reliably.`,
      thesis: `A focused ${technology} product can improve a measurable workflow before broader expansion.`,
      industry,
      technology,
      customerType,
      region,
      horizonYears: 1 + index % 15,
      estimatedCapital: 25_000 + index * 175_000,
      riskTolerance: (index * 17) % 101,
      innovationLevel: (index * 29) % 101,
      availableEvidence: index % 3 === 0 ? "Observed pilot: 18 customer interviews and a 12% conversion test." : "",
      knownSignals: index % 2 === 0 ? "Supplier concentration and changing customer budgets." : "New software adoption and procurement pressure.",
      opportunityCount: 6 + index % 7,
      seed: 10_000 + index,
    };
    const first = generateLabRun(input);
    const second = generateLabRun(input);
    assert.equal(serializeReproducibleRun(first), serializeReproducibleRun(second));
    assert.equal(first.opportunities.length, input.opportunityCount);
    assert.ok(first.opportunities.every((opportunity) => Number.isFinite(opportunity.totalScore) && opportunity.totalScore >= 0 && opportunity.totalScore <= 100));
    assert.ok(first.opportunities.every((opportunity) => Object.values(opportunity.dimensions).every((value) => Number.isFinite(value) && value >= 0 && value <= 100)));
    signatures.add(first.opportunities.map((opportunity) => `${opportunity.totalScore}:${opportunity.dimensions.risk}:${opportunity.dimensions.evidenceQuality}`).join("|"));
  }
  assert.equal(signatures.size, 30);
});

test("the model catalog is the single complete public model inventory", () => {
  assert.equal(PUBLIC_MODEL_COUNT, 14);
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
