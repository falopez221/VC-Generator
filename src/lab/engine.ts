import { DEFAULT_WEIGHTS, OPPORTUNITY_BLUEPRINTS } from "./data.ts";
import { calculateMCDA, classifyOpportunity, recalculateRanking } from "./models.ts";
import { clamp, createRandom, hashString, randomBetween, round } from "./random.ts";
import { isOpportunity, validateLabInput } from "./schema.ts";
import { AGENT_NAMES, DIMENSION_KEYS, type AgentName, type AgentResult, type LabInput, type LabRun, type LabWeights, type Opportunity, type RiskItem } from "./types.ts";

const DISCLOSURES = [
  "Public demonstration model. The complete architecture, agent system, scoring logic and local implementation are proprietary and are not included in this demo.",
  "This lab illustrates the Venture Governance concept using simplified agents, synthetic data and demonstrative quantitative models.",
  "The complete local system, extended agent network, proprietary orchestration logic and private quantitative models are not included.",
];

function scoreSpread(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function buildAgentResult(name: AgentName, opportunity: Omit<Opportunity, "agents" | "totalScore" | "confidence" | "uncertainty" | "disagreement" | "category" | "humanDecision" | "rank" | "previousRank">): AgentResult {
  const d = opportunity.dimensions;
  const definitions: Record<AgentName, { domain: string; score: number; finding: string; risk: string; assumption: string; missing: string; recommendation: string; criticism: string }> = {
    Mathematics: {
      domain: "Uncertainty, robustness and data quality",
      score: d.technicalFeasibility * 0.28 + d.evidenceQuality * 0.32 + (100 - d.risk) * 0.25 + d.scalability * 0.15,
      finding: `The public model estimates ${Math.round(100 - d.risk)}% risk-adjusted robustness under visible synthetic assumptions.`,
      risk: "Ranking stability may change when evidence quality or risk aversion changes.",
      assumption: "Public dimension values are synthetic estimates, not calibrated observations.",
      missing: "Observed distributions and out-of-sample validation.",
      recommendation: "Stress-test the two most influential assumptions before increasing confidence.",
      criticism: "Finance and Marketing may overstate accessible demand when evidence is still synthetic.",
    },
    Finance: {
      domain: "Economics, capital and scalability",
      score: d.financialViability * 0.38 + d.marketPotential * 0.2 + d.scalability * 0.24 + (100 - d.risk) * 0.18,
      finding: `Capital intensity is estimated at $${Math.round(opportunity.estimatedCapital / 1000)}k with a demonstrative viability score of ${Math.round(d.financialViability)}.`,
      risk: "CAC, churn and margin remain scenario variables rather than observed unit economics.",
      assumption: "The base case assumes staged capital deployment and no major regulatory delay.",
      missing: "Willingness-to-pay, acquisition cost and retention evidence.",
      recommendation: "Validate price and cost-to-serve before treating the model as financeable.",
      criticism: "Strategy may value differentiation that does not yet translate into cash flow.",
    },
    Strategy: {
      domain: "Problem, positioning and early experiments",
      score: d.strategicAdvantage * 0.38 + d.marketPotential * 0.18 + d.technicalFeasibility * 0.17 + opportunity.novelty * 0.17 + (100 - d.risk) * 0.1,
      finding: `The strongest public strategic signal is a ${Math.round(d.strategicAdvantage)} advantage score linked to timing and workflow integration.`,
      risk: "A differentiated concept can still fail if the problem is not urgent or the switching cost is high.",
      assumption: "The target customer experiences the stated problem frequently enough to change behavior.",
      missing: "Problem interviews, alternatives map and a discriminating pilot.",
      recommendation: "Run a narrow Lean experiment around the critical workflow and willingness to switch.",
      criticism: "Mathematical stability should not be interpreted as strategic defensibility.",
    },
    Marketing: {
      domain: "ICP, adoption and accessible demand",
      score: d.marketPotential * 0.32 + d.adoptionPotential * 0.38 + d.evidenceQuality * 0.18 + d.scalability * 0.12,
      finding: `The accessible adoption score is ${Math.round(d.adoptionPotential)}, distinct from the broader theoretical market.`,
      risk: "TAM narratives may exceed the segment reachable through realistic channels.",
      assumption: "The selected ICP has budget authority and a measurable trigger for adoption.",
      missing: "Segment-level conversion, channel cost and retention signals.",
      recommendation: "Test one ICP, one message and one acquisition channel before expanding TAM claims.",
      criticism: "Finance assumptions depend on adoption rates that are not yet observed.",
    },
  };
  const definition = definitions[name];
  const score = round(clamp(definition.score));
  const evidenceQuality = round(clamp(d.evidenceQuality + (name === "Marketing" ? -3 : name === "Mathematics" ? 2 : 0)));
  const confidence = round(clamp(evidenceQuality * 0.72 + (100 - d.risk) * 0.28));
  return {
    agentName: name,
    domain: definition.domain,
    score,
    confidence,
    evidenceQuality,
    findings: [definition.finding, "Observed data: none supplied directly to this public synthetic run.", "Synthetic data: opportunity dimensions and scenarios generated from the selected seed."],
    risks: [definition.risk],
    assumptions: [definition.assumption],
    missingEvidence: [definition.missing],
    recommendation: definition.recommendation,
    uncertainties: ["Input quality", "Market response", "Execution timing"],
    criticism: definition.criticism,
    status: evidenceQuality < 45 ? "Warning" : "Completed",
  };
}

function buildRisks(random: () => number, evidence: number, risk: number): RiskItem[] {
  const definitions = [
    ["Demand concentration", "Run segmented willingness-to-pay tests"],
    ["Execution complexity", "Stage technical validation and define stop conditions"],
    ["Economic sensitivity", "Measure CAC, margin and retention before scaling"],
    ["Competitive response", "Test differentiation against the strongest alternative"],
  ] as const;
  return definitions.map(([name, mitigation], index) => ({
    name,
    probability: round(clamp(risk + randomBetween(random, -18, 15) + index * 2)),
    impact: round(clamp(52 + randomBetween(random, -12, 32))),
    uncertainty: round(clamp(100 - evidence + randomBetween(random, -8, 12))),
    mitigation,
    evidence: evidence >= 60 ? "Public secondary evidence represented synthetically" : "Evidence missing or synthetic",
  }));
}

function createOpportunity(input: LabInput, index: number, random: () => number): Opportunity {
  const blueprint = OPPORTUNITY_BLUEPRINTS[(index + Math.floor(random() * OPPORTUNITY_BLUEPRINTS.length)) % OPPORTUNITY_BLUEPRINTS.length];
  const evidenceSignal = Math.min(18, input.availableEvidence.length / 24);
  const signalSignal = Math.min(10, input.knownSignals.length / 38);
  const profile = blueprint.profile.map((value, profileIndex) => clamp(value + randomBetween(random, -8, 8) + (profileIndex === 5 ? evidenceSignal : 0) + (profileIndex === 0 ? signalSignal : 0)));
  const dimensions = Object.fromEntries(DIMENSION_KEYS.map((key, dimensionIndex) => [key, round(profile[dimensionIndex])])) as Opportunity["dimensions"];
  dimensions.risk = round(clamp(dimensions.risk + (input.innovationLevel - 50) * 0.14 - (input.riskTolerance - 50) * 0.08));
  const estimatedCapital = Math.round(clamp(input.estimatedCapital * blueprint.capital * randomBetween(random, 0.82, 1.2), 25000, 50000000));
  const base = {
    id: `OP-${String(index + 1).padStart(2, "0")}`,
    name: `${input.technology}: ${blueprint.suffix}`.slice(0, 92),
    problem: `${input.problem} The public demo explores a focused version for ${input.customerType.toLowerCase()} in ${input.region}.`,
    proposedSolution: `A limited ${blueprint.suffix.toLowerCase()} combining ${input.technology.toLowerCase()} with a governed validation workflow.`,
    targetCustomer: `${blueprint.customer}; initial ICP: ${input.customerType}`,
    businessModel: blueprint.model,
    industry: input.industry,
    technology: input.technology,
    region: input.region,
    novelty: round(clamp(blueprint.novelty + (input.innovationLevel - 50) * 0.18 + randomBetween(random, -5, 5))),
    estimatedCapital,
    criticalHypotheses: [
      "The target customer experiences the problem frequently and urgently.",
      "The proposed workflow improves an observable outcome.",
      "A reachable segment will pay enough to support the delivery model.",
    ],
    availableEvidence: input.availableEvidence ? [input.availableEvidence, "Synthetic demonstration profile"] : ["Synthetic demonstration profile only"],
    risks: buildRisks(random, dimensions.evidenceQuality, dimensions.risk),
    dimensions,
  };
  const agents = Object.fromEntries(AGENT_NAMES.map((name) => [name, buildAgentResult(name, base as Parameters<typeof buildAgentResult>[1])])) as Opportunity["agents"];
  const agentScores = AGENT_NAMES.map((name) => agents[name].score);
  const disagreement = round(scoreSpread(agentScores));
  const uncertainty = round(clamp((100 - dimensions.evidenceQuality) * 0.56 + dimensions.risk * 0.2 + disagreement * 1.18));
  const confidence = round(clamp(dimensions.evidenceQuality * 0.62 + (100 - uncertainty) * 0.38));
  const provisional = {
    ...base,
    agents,
    totalScore: 0,
    confidence,
    uncertainty,
    disagreement,
    category: "Uncertain" as const,
    humanDecision: "Pending" as const,
    rank: index + 1,
    previousRank: index + 1,
  } satisfies Opportunity;
  const mcda = calculateMCDA(provisional, DEFAULT_WEIGHTS);
  const agentScore = agentScores.reduce((sum, score) => sum + score, 0) / agentScores.length;
  const totalScore = round(clamp(mcda.weightedScore * 0.58 + agentScore * 0.42));
  return {
    ...provisional,
    totalScore,
    category: classifyOpportunity(totalScore, dimensions.evidenceQuality, dimensions.risk, uncertainty, disagreement),
  };
}

export function generateLabRun(rawInput: Partial<LabInput>, weights: LabWeights = DEFAULT_WEIGHTS): LabRun {
  const validated = validateLabInput(rawInput);
  if (!validated.success) throw new Error(validated.errors.join(" "));
  const input = validated.data;
  const fingerprint = `${input.seed}:${input.problem}:${input.thesis}:${input.industry}:${input.technology}:${input.opportunityCount}`;
  const random = createRandom(input.seed + hashString(fingerprint));
  const opportunities = Array.from({ length: input.opportunityCount }, (_, index) => createOpportunity(input, index, random));
  if (!opportunities.every(isOpportunity)) throw new Error("Structured opportunity validation failed.");
  const ranked = recalculateRanking(opportunities, weights).opportunities;
  return {
    id: `vg-${input.seed}-${hashString(fingerprint).toString(36)}`,
    createdAt: new Date().toISOString(),
    input,
    status: "Completed",
    weights,
    opportunities: ranked,
    warnings: input.availableEvidence.length < 18 ? ["Evidence is limited. Categories are capped by public evidence rules."] : [],
    disclosures: DISCLOSURES,
  };
}

export function rerankLabRun(run: LabRun, weights: LabWeights) {
  const ranked = recalculateRanking(run.opportunities, weights);
  return { run: { ...run, weights, opportunities: ranked.opportunities }, deltas: ranked.deltas };
}

export function updateHumanDecision(run: LabRun, opportunityId: string, decision: Opportunity["humanDecision"]) {
  return {
    ...run,
    opportunities: run.opportunities.map((opportunity) => opportunity.id === opportunityId ? { ...opportunity, humanDecision: decision } : opportunity),
  };
}

export function addEvidence(run: LabRun, opportunityId: string, evidence: string) {
  const text = evidence.trim().slice(0, 300);
  if (!text) return run;
  const updated = run.opportunities.map((opportunity) => {
    if (opportunity.id !== opportunityId) return opportunity;
    const dimensions = { ...opportunity.dimensions, evidenceQuality: round(clamp(opportunity.dimensions.evidenceQuality + 8)) };
    const agents = Object.fromEntries(AGENT_NAMES.map((name) => [name, { ...opportunity.agents[name], evidenceQuality: round(clamp(opportunity.agents[name].evidenceQuality + 7)), confidence: round(clamp(opportunity.agents[name].confidence + 5)) }])) as Opportunity["agents"];
    return { ...opportunity, availableEvidence: [...opportunity.availableEvidence, text], dimensions, agents, uncertainty: round(clamp(opportunity.uncertainty - 6)) };
  });
  return { ...run, opportunities: recalculateRanking(updated, run.weights).opportunities };
}

export function serializeReproducibleRun(run: LabRun) {
  return JSON.stringify({ input: run.input, weights: run.weights, opportunities: run.opportunities.map((opportunity) => ({ ...opportunity, humanDecision: "Pending" })) });
}
