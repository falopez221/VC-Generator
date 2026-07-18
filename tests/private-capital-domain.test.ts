import test from "node:test";
import assert from "node:assert/strict";
import {
  DECISION_SUPPORT_NOTICE,
  InAppNotificationProvider,
  SIMULATED_DATA_NOTICE,
  SIMULATED_FINANCIAL_ASSETS,
  SIMULATION_NOTICE,
  analyzeArgentineBond,
  analyzeBitcoinPosition,
  analyzeCedear,
  analyzeInvestmentThesis,
  calculatePortfolioMetrics,
  createExplainableSignal,
  createHumanReview,
  createPortfolioProposal,
  createPortfolioSnapshot,
  deriveInvestorProfile,
  evaluateAlertCandidates,
  holdingsFromTransactions,
  inferSignalAction,
  investorProfileWeightTotal,
  planRebalance,
  simulateScenario,
  transitionHumanReview,
  validateManualHolding,
  validatePortfolioSnapshot,
  type AlertCandidate,
  type InvestorProfileInput,
  type ProposalCandidate,
} from "../src/private-capital/domain/index.ts";

const profileInput: InvestorProfileInput = {
  name: "Private simulated investor",
  capital: 100_000,
  referenceCurrency: "USD",
  horizonMonths: 84,
  liquidityNeedPct: 15,
  lossTolerancePct: 25,
  maximumTolerableLossPct: 30,
  targetReturnPct: 10,
  maximumArgentinaPct: 40,
  maximumBitcoinPct: 15,
  maximumAssetPct: 35,
  maximumSectorPct: 55,
  preference: "growth",
  experienceYears: 8,
  allowedAssetClasses: ["cedear", "bond", "bitcoin", "cash"],
  excludedAssetIds: [],
  contributionFrequency: "monthly",
  rebalanceMonths: 6,
  periodicWithdrawalPct: 0,
  emergencyReserveMonths: 6,
  personalRestrictions: ["No leverage"],
};

test("all financial fixtures are branded simulated data with complete provenance", () => {
  assert.match(DECISION_SUPPORT_NOTICE, /No trades are executed automatically/);
  assert.equal(SIMULATED_FINANCIAL_ASSETS.length, 6);
  assert.deepEqual(new Set(SIMULATED_FINANCIAL_ASSETS.map((asset) => asset.assetClass)), new Set(["cedear", "bond", "bitcoin", "cash"]));
  for (const asset of SIMULATED_FINANCIAL_ASSETS) {
    assert.match(asset.ticker, /^SIM-/);
    assert.equal(asset.provenance.kind, "mock");
    assert.equal(asset.provenance.notice, SIMULATED_DATA_NOTICE);
    assert.ok(asset.provenance.source.includes("simulated"));
    assert.ok(asset.provenance.currency);
    assert.ok(asset.provenance.market);
    assert.ok(Number.isFinite(asset.provenance.latencyMs));
    assert.ok(asset.provenance.confidence >= 0 && asset.provenance.confidence <= 1);
  }
});

test("investor profile is derived quantitatively with disclosed normalized component weights", () => {
  const result = deriveInvestorProfile(profileInput);
  assert.deepEqual(result.issues, []);
  assert.ok(result.value);
  assert.equal(investorProfileWeightTotal(), 1);
  assert.ok(result.value.riskScore >= 0 && result.value.riskScore <= 100);
  assert.equal(Object.keys(result.value.components).length, 5);
  assert.equal(result.value.constraints.maximumBitcoinWeight, 0.15);
  assert.ok(result.value.assumptions.some((item) => item.includes("not a prediction")));

  const repeated = deriveInvestorProfile(profileInput);
  assert.deepEqual(repeated, result);

  const custom = deriveInvestorProfile({ ...profileInput, profileMode: "custom" });
  assert.equal(custom.value?.label, "custom");
  assert.equal(deriveInvestorProfile({ ...profileInput, maximumBitcoinPct: 101 }).value, null);
});

test("manual holdings sanitize text and reject non-finite or unsafe values", () => {
  const valid = validateManualHolding({
    id: " h-1 ",
    assetId: "sim-cedear-alpha",
    ticker: "sim-ced-a",
    market: "SIMULATED-LOCAL",
    quantity: 4,
    averagePrice: 100,
    currency: "ARS",
    accountReference: "<private reference>",
    acquiredAt: "2026-01-15T15:00:00.000Z",
    fees: 1,
    thesis: "<script>treated as data</script>",
  });
  assert.ok(valid.value);
  assert.equal(valid.value.id, "h-1");
  assert.equal(valid.value.ticker, "SIM-CED-A");
  assert.doesNotMatch(valid.value.thesis ?? "", /[<>]/);

  const invalid = validateManualHolding({ ...valid.value, quantity: Number.POSITIVE_INFINITY });
  assert.equal(invalid.value, null);
  assert.ok(invalid.issues.length > 0);
});

test("transaction history is ordered deterministically and snapshots normalize", () => {
  const quantities = holdingsFromTransactions([
    { id: "2", assetId: "sim-bitcoin", side: "sell", quantity: 0.25, unitPrice: 100, currency: "USD", fees: 0, occurredAt: "2026-01-03T00:00:00.000Z" },
    { id: "1", assetId: "sim-bitcoin", side: "buy", quantity: 1, unitPrice: 100, currency: "USD", fees: 0, occurredAt: "2026-01-01T00:00:00.000Z" },
  ]);
  assert.equal(quantities["sim-bitcoin"], 0.75);

  const snapshot = createPortfolioSnapshot({
    id: "snap-1",
    capturedAt: "2026-01-15T15:00:00.000Z",
    referenceCurrency: "USD",
    holdings: [
      { asset: SIMULATED_FINANCIAL_ASSETS[0], quantity: 1, convertedReferenceValue: 60 },
      { asset: SIMULATED_FINANCIAL_ASSETS[4], quantity: 40, convertedReferenceValue: 40 },
    ],
  });
  assert.equal(snapshot.totalReferenceValue, 100);
  assert.equal(snapshot.positions.reduce((sum, item) => sum + item.weight, 0), 1);
  assert.ok(validatePortfolioSnapshot(snapshot).value);
});

test("portfolio proposals normalize to 100% while satisfying investor limits", () => {
  const profile = deriveInvestorProfile(profileInput).value;
  assert.ok(profile);
  const candidates: ProposalCandidate[] = SIMULATED_FINANCIAL_ASSETS.map((asset, index) => ({
    asset,
    desiredWeight: [0.3, 0.25, 0.2, 0.15, 0.08, 0.02][index],
    rationale: `Simulated rationale for ${asset.id}`,
    role: asset.assetClass,
    risks: ["Simulated uncertainty"],
  }));
  const proposal = createPortfolioProposal({
    id: "sim-balanced",
    name: "Simulated constrained proposal",
    capital: profile.input.capital,
    candidates,
    limits: profile.constraints,
    expectedReturnRangePct: [-5, 14],
    plausibleLossPct: 25,
    horizonMonths: 84,
    scenarios: { adversePct: -20, basePct: 6, favorablePct: 17 },
    invalidationConditions: ["Simulated assumptions no longer hold"],
  });
  assert.ok(proposal.value, proposal.issues.join(" "));
  const weights = proposal.value.allocations.reduce((sum, allocation) => sum + allocation.weight, 0);
  assert.ok(Math.abs(weights - 1) < 0.000001);
  assert.ok(proposal.value.allocations.every((allocation) => allocation.weight <= profile.constraints.maximumAssetWeight + 0.000001));
  const argentina = proposal.value.allocations.filter((allocation) => allocation.asset.geography === "argentina").reduce((sum, item) => sum + item.weight, 0);
  const bitcoin = proposal.value.allocations.filter((allocation) => allocation.asset.assetClass === "bitcoin").reduce((sum, item) => sum + item.weight, 0);
  assert.ok(argentina <= profile.constraints.maximumArgentinaWeight + 0.000001);
  assert.ok(bitcoin <= profile.constraints.maximumBitcoinWeight + 0.000001);
  assert.ok(proposal.value.limitations.some((item) => item.includes("No allocation authorizes")));
});

test("risk metrics calculate finite bounded values and expose insufficient-data limitations", () => {
  const returns = [-0.02, 0.01, -0.05, 0.03, 0, -0.01, 0.02, -0.04, 0.01, 0.02];
  const result = calculatePortfolioMetrics({ returns, values: [100, 105, 98, 90, 95], weights: [0.5, 0.3, 0.2] });
  for (const item of Object.values(result)) assert.ok(item.value === null || Number.isFinite(item.value));
  assert.ok((result.drawdown.value ?? 0) > 0);
  assert.ok((result.concentration.value ?? 0) > 0);
  assert.ok((result.valueAtRisk.value ?? -1) >= 0);
  assert.ok(result.valueAtRisk.limitations.some((item) => item.includes("not a worst-case")));

  const insufficient = calculatePortfolioMetrics({ returns: [0.01], values: [100], weights: [] });
  assert.equal(insufficient.volatility.value, null);
  assert.equal(insufficient.drawdown.value, null);
  assert.ok(insufficient.volatility.limitations.length > 0);
});

test("signals remain explainable, uncertain, and require human review", () => {
  const asset = SIMULATED_FINANCIAL_ASSETS[0];
  const evidence = {
    label: "Simulated valuation input",
    detail: "Scenario fixture only",
    sourceType: "valuation" as const,
    provenance: asset.provenance,
  };
  const signal = createExplainableSignal({
    id: "signal-1",
    assetId: asset.id,
    action: "await_confirmation",
    intensity: 0.4,
    horizonMonths: 12,
    confidence: 0.55,
    evidenceFor: [evidence],
    evidenceAgainst: [{ ...evidence, label: "Simulated counter-evidence", sourceType: "risk" }],
    risks: ["The simulated premise may fail"],
    invalidationCondition: "The simulated downside threshold is crossed",
    observedRange: [95, 105],
    expiresAt: "2026-02-15T15:00:00.000Z",
    portfolioRelationship: "Would increase simulated equity exposure",
    estimatedRiskImpact: "Potentially higher volatility",
    estimatedDiversificationImpact: "Depends on existing exposure",
    assumptions: ["All observations are simulated"],
    executiveExplanation: "Wait for more simulated evidence.",
    technicalExplanation: "Conflicting simulated evidence prevents a directional conclusion.",
  });
  assert.ok(signal.value);
  assert.equal(signal.value.humanReviewRequired, true);
  assert.equal(inferSignalAction({ evidenceScore: 0.9, riskScore: 0.2, confidence: 0.2, dataSufficient: true, thesisBroken: false }), "insufficient_data");
});

test("operational alerts suppress mock data while informational observations deduplicate deterministically", () => {
  const asset = SIMULATED_FINANCIAL_ASSETS[0];
  const candidate: AlertCandidate = {
    type: "target_drift",
    severity: "warning",
    assetId: asset.id,
    title: "Simulated target drift",
    explanation: "Portfolio differs from its simulated target.",
    detectedAt: "2026-01-15T15:10:00.000Z",
    nextReviewAt: "2026-01-16T15:10:00.000Z",
    maximumFrequencyMs: 86_400_000,
    silencePeriodMs: 3_600_000,
    operational: false,
    provenance: [asset.provenance],
  };
  const first = evaluateAlertCandidates({ candidates: [candidate, candidate], existing: [], now: "2026-01-15T15:10:00.000Z", maximumDataAgeMs: 3_600_000 });
  assert.equal(first.emitted.length, 1);
  assert.equal(first.suppressed[0].reason, "deduplicated");
  const provider = new InAppNotificationProvider();
  assert.equal(provider.deliver(first.emitted).length, 1);

  const operational = evaluateAlertCandidates({
    candidates: [{ ...candidate, operational: true }],
    existing: [],
    now: "2026-01-15T15:10:00.000Z",
    maximumDataAgeMs: 3_600_000,
  });
  assert.equal(operational.emitted.length, 0);
  assert.equal(operational.suppressed[0].reason, "simulated_data");

  const stale = evaluateAlertCandidates({
    candidates: [{ ...candidate, operational: true }],
    existing: [],
    now: "2026-01-20T15:10:00.000Z",
    maximumDataAgeMs: 3_600_000,
  });
  assert.equal(stale.emitted.length, 0);
  assert.equal(stale.suppressed[0].reason, "stale_data");
});

test("human review transitions never authorize execution", () => {
  const created = createHumanReview("review-1", "signal-1", "2026-01-15T15:00:00.000Z").value;
  assert.ok(created);
  const pending = transitionHumanReview({ review: created, action: "submit", actorId: "owner", timestamp: "2026-01-15T15:01:00.000Z", note: "Review requested" }).value;
  assert.ok(pending);
  const accepted = transitionHumanReview({ review: pending, action: "accept_for_tracking", actorId: "owner", timestamp: "2026-01-15T15:02:00.000Z", note: "Hypothesis only" }).value;
  assert.ok(accepted);
  assert.equal(accepted.state, "approved_hypothesis");
  assert.equal(accepted.executionAuthorized, false);
  assert.equal(transitionHumanReview({ review: accepted, action: "accept_for_tracking", actorId: "owner", timestamp: "2026-01-15T15:03:00.000Z", note: "Invalid" }).value, null);
});

test("scenario and rebalancing outputs are deterministic, bounded, and non-operational", () => {
  const scenario = {
    id: "sim-shock",
    name: "Simulated bounded shock",
    assetClassShocks: { cedear: -0.2, cash: 0 },
    maximumAbsoluteShock: 0.25,
  };
  const result = simulateScenario({
    scenario,
    positions: [
      { asset: SIMULATED_FINANCIAL_ASSETS[0], weight: 0.6 },
      { asset: SIMULATED_FINANCIAL_ASSETS[4], weight: 0.4 },
    ],
    startingValue: 100_000,
  });
  assert.equal(result.portfolioReturn, -0.12);
  assert.equal(result.endingValue, 88_000);
  assert.equal(result.notice, SIMULATION_NOTICE);
  assert.deepEqual(result, simulateScenario({ scenario, positions: [
    { asset: SIMULATED_FINANCIAL_ASSETS[0], weight: 0.6 },
    { asset: SIMULATED_FINANCIAL_ASSETS[4], weight: 0.4 },
  ], startingValue: 100_000 }));

  const plan = planRebalance({
    currentValues: { a: 80, b: 20 },
    targetWeights: { a: 0.5, b: 0.5 },
    contribution: 0,
    band: 0.05,
    estimatedCostRate: 0.01,
  });
  assert.deepEqual(plan.map((item) => item.direction), ["reduce", "increase"]);
  assert.equal(plan.reduce((sum, item) => sum + item.referenceAmount, 0), 0);
  assert.ok(plan.every((item) => item.executionAuthorized === false));
});

test("CEDEAR analysis separates conversion, currency, dividend and liquidity assumptions", () => {
  const result = analyzeCedear({
    assetId: "sim-cedear-alpha",
    underlyingSymbol: "sim-us-equity",
    underlyingKind: "equity",
    cedearsPerUnderlying: 10,
    localPriceArs: 12_000,
    underlyingPriceUsd: 300,
    annualDividendPerUnderlyingUsd: 6,
    sector: "technology",
    localLiquidityScore: 72,
    provenance: [SIMULATED_FINANCIAL_ASSETS[0].provenance],
  });
  assert.ok(result.value, result.issues.join(" "));
  assert.equal(result.value.impliedExchangeRate.value, 400);
  assert.equal(result.value.localDividendYield.value, 0.02);
  assert.match(result.value.impliedExchangeRate.formula, /ratio|CEDEAR/iu);
  assert.ok(result.value.risks.some((risk) => /liquidity/iu.test(risk)));

  const insufficient = analyzeCedear({ ...result.value.instrument, underlyingPriceUsd: null });
  assert.equal(insufficient.value?.impliedExchangeRate.value, null);
  assert.ok(insufficient.value?.impliedExchangeRate.limitations.length);
});

test("bond analysis only calculates duration and convexity with sufficient simulated inputs", () => {
  const result = analyzeArgentineBond({
    assetId: "sim-bond-sovereign",
    ticker: "sim-bond-s",
    issuerKind: "sovereign",
    governingLaw: "new_york",
    currency: "USD",
    settlementAt: "2026-01-15T15:00:00.000Z",
    maturityAt: "2028-01-15T15:00:00.000Z",
    faceValue: 100,
    cleanPricePerFace: 95,
    annualYield: 0.1,
    cashFlows: [
      { paymentAt: "2027-01-15T15:00:00.000Z", amountPerFace: 6, kind: "coupon" },
      { paymentAt: "2028-01-15T15:00:00.000Z", amountPerFace: 106, kind: "principal" },
    ],
    liquidityScore: 35,
    provenance: [SIMULATED_FINANCIAL_ASSETS[2].provenance],
  });
  assert.ok(result.value, result.issues.join(" "));
  assert.equal(result.value.parity.value, 0.95);
  assert.ok((result.value.modifiedDuration.value ?? 0) > 0);
  assert.ok((result.value.convexity.value ?? 0) > 0);
  assert.match(result.value.riskDimensions.restructuring, /restructuring/iu);

  const unavailable = analyzeArgentineBond({ ...result.value.instrument, cleanPricePerFace: null, annualYield: null });
  assert.equal(unavailable.value?.modifiedDuration.value, null);
});

test("Bitcoin analysis enforces the personal cap without authorizing a trade", () => {
  const result = analyzeBitcoinPosition({
    assetId: "sim-bitcoin",
    quantity: 2,
    averageCostUsd: 80,
    observedPriceUsd: 100,
    totalPortfolioValueUsd: 1_000,
    maximumBitcoinWeight: 0.1,
    returns: [-0.1, 0.05, 0.03, -0.08, 0.1],
    valueHistory: [100, 90, 95, 80, 100],
    provenance: [SIMULATED_FINANCIAL_ASSETS[3].provenance],
  });
  assert.ok(result.value, result.issues.join(" "));
  assert.equal(result.value.portfolioWeight, 0.2);
  assert.equal(result.value.limitStatus, "over_limit");
  assert.equal(result.value.executionAuthorized, false);
  assert.match(result.value.reviewGuidance, /Human review/iu);
});

test("investment thesis analysis is deterministic, bounded and produces six to twelve hypotheses", () => {
  const input = {
    idea: "I want to study Argentine energy, international technology and dollar liquidity while keeping country and Bitcoin exposure capped.",
    riskPreference: "balanced" as const,
    horizon: "3-5y" as const,
    referenceCurrency: "USD" as const,
    maximumArgentinaPct: 25,
    maximumBitcoinPct: 8,
  };
  const first = analyzeInvestmentThesis(input);
  const second = analyzeInvestmentThesis(input);
  assert.deepEqual(first, second);
  assert.ok(first.opportunities.length >= 6 && first.opportunities.length <= 12);
  assert.ok(first.agents.length >= 5 && first.agents.length <= 8);
  assert.equal(first.agents.at(-1)?.id, "synthesis");
  assert.equal(first.executionAuthorized, false);
  assert.ok(first.opportunities.every((item) => item.executionAuthorized === false));
  assert.ok(first.opportunities.every((item) => item.confidence <= 72));
  assert.ok(first.opportunities.every((item) => item.maximumConsiderationPct >= 0));
  assert.ok(first.opportunities.filter((item) => item.geography === "Argentina").every((item) => item.maximumConsiderationPct <= 25));
  assert.ok(first.opportunities.filter((item) => item.ticker === "BTC").every((item) => item.maximumConsiderationPct <= 8));
  assert.ok(first.opportunities.every((item) => item.scenarios.length === 3));
  assert.match(first.limitations.join(" "), /No live prices/iu);
});

test("investment thesis retains at least six diversified hypotheses when local and Bitcoin limits are zero", () => {
  const result = analyzeInvestmentThesis({
    idea: "I want a diversified defensive international thesis with liquidity and inflation protection over several years.",
    riskPreference: "defensive",
    horizon: "5y-plus",
    referenceCurrency: "USD",
    maximumArgentinaPct: 0,
    maximumBitcoinPct: 0,
  });
  assert.ok(result.opportunities.length >= 6);
  assert.ok(result.opportunities.every((item) => item.geography !== "Argentina"));
  assert.ok(result.opportunities.every((item) => item.ticker !== "BTC"));
});

test("investment thesis analysis treats short or unsafe text as invalid data", () => {
  assert.throws(() => analyzeInvestmentThesis({
    idea: "buy now\u0000",
    riskPreference: "aggressive",
    horizon: "under-1y",
    referenceCurrency: "ARS",
    maximumArgentinaPct: 100,
    maximumBitcoinPct: 100,
  }), /at least 30 characters/iu);
});
