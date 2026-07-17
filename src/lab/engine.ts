import { DEFAULT_WEIGHTS, OPPORTUNITY_BLUEPRINTS } from "./data.ts";
import { deriveInputSignals } from "./context-lenses.ts";
import { PUBLIC_MODEL_VERSION } from "./model-catalog.ts";
import { calculateMCDA, classifyOpportunity, normalizeLabWeights, recalculateRanking } from "./models.ts";
import { clamp, createRandom, hashString, randomBetween, round } from "./random.ts";
import { isOpportunity, normalizePublicWebResearch, validateLabInput } from "./schema.ts";
import { AGENT_NAMES, DIMENSION_KEYS, type AgentName, type AgentResult, type LabInput, type LabRun, type LabWeights, type Opportunity, type PublicWebResearch, type RiskItem } from "./types.ts";

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
  const webContext = opportunity.availableEvidence.find((item) => item.startsWith(`Retrieved web context [${name}]`));
  const hasUserSuppliedEvidence = opportunity.availableEvidence.some((item) => !item.startsWith("Synthetic demonstration") && !item.startsWith("Retrieved web context ["));
  return {
    agentName: name,
    domain: definition.domain,
    score,
    confidence,
    evidenceQuality,
    findings: [
      definition.finding,
      hasUserSuppliedEvidence ? "User-supplied evidence: present but not independently verified by this public Lab." : "Observed evidence: none supplied directly to this public synthetic run.",
      webContext ? `${webContext} The agent uses this result to frame a validation question, not as proof or a scoring input.` : `Live web context: no matching result was available for ${name}.`,
      "Synthetic data: opportunity dimensions and scenarios generated from the selected seed.",
    ],
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

function createOpportunity(input: LabInput, index: number, random: () => number, research?: PublicWebResearch): Opportunity {
  const blueprint = OPPORTUNITY_BLUEPRINTS[(index + Math.floor(random() * OPPORTUNITY_BLUEPRINTS.length)) % OPPORTUNITY_BLUEPRINTS.length];
  const inputSignals = deriveInputSignals(input);
  const webSources = AGENT_NAMES.flatMap((agentName) => {
    const candidates = research?.sources.filter((source) => source.agentName === agentName) ?? [];
    return candidates.length ? [candidates[index % candidates.length]] : [];
  });
  const profile = blueprint.profile.map((value) => clamp(value + randomBetween(random, -8, 8)));
  const dimensions = Object.fromEntries(DIMENSION_KEYS.map((key, dimensionIndex) => {
    const adjusted = key === "evidenceQuality"
      ? inputSignals.evidenceQuality + randomBetween(random, -4, 4)
      : profile[dimensionIndex] + inputSignals.dimensionAdjustments[key];
    return [key, round(clamp(adjusted))];
  })) as Opportunity["dimensions"];
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
      "The opportunity can sustain an advantage against imitation, substitutes and incumbent distribution.",
      "Demand, financing, currency and supply shocks remain inside explicit downside tolerances.",
      ...webSources.map((source) => `${source.agentName} must verify the relevance and durability of ${source.id} with primary evidence.`),
    ],
    availableEvidence: [
      ...(input.availableEvidence ? [input.availableEvidence] : []),
      ...webSources.map((source) => `Retrieved web context [${source.agentName}] ${source.id}: ${source.title}`),
      input.availableEvidence || webSources.length ? "Synthetic demonstration profile" : "Synthetic demonstration profile only",
    ],
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

export function generateLabRun(rawInput: Partial<LabInput>, weights: LabWeights = DEFAULT_WEIGHTS, webResearch?: PublicWebResearch): LabRun {
  const validated = validateLabInput(rawInput);
  if (!validated.success) throw new Error(validated.errors.join(" "));
  const input = validated.data;
  const normalizedWeights = normalizeLabWeights(weights);
  const normalizedResearch = normalizePublicWebResearch(webResearch);
  const generationFingerprint = JSON.stringify({ modelVersion: PUBLIC_MODEL_VERSION, input, weights: normalizedWeights });
  const researchFingerprint = normalizedResearch?.sources.map(({ id, agentName, title, url, publishedAt }) => ({ id, agentName, title, url, publishedAt })) ?? [];
  const runFingerprint = JSON.stringify({ generationFingerprint, research: researchFingerprint });
  const random = createRandom(input.seed + hashString(generationFingerprint));
  const opportunities = Array.from({ length: input.opportunityCount }, (_, index) => createOpportunity(input, index, random, normalizedResearch));
  if (!opportunities.every(isOpportunity)) throw new Error("Structured opportunity validation failed.");
  const ranked = recalculateRanking(opportunities, normalizedWeights).opportunities;
  return {
    id: `vg-${PUBLIC_MODEL_VERSION.replace(/\./g, "-")}-${input.seed}-${hashString(runFingerprint).toString(36)}`,
    modelVersion: PUBLIC_MODEL_VERSION,
    createdAt: new Date().toISOString(),
    input,
    status: "Completed",
    weights: normalizedWeights,
    opportunities: ranked,
    webResearch: normalizedResearch,
    warnings: [
      ...(input.availableEvidence.length < 18 ? ["Evidence is limited. Categories are capped by public evidence rules."] : []),
      ...(normalizedResearch?.sources.length ? ["Public web results are unverified secondary context. They inform specialist questions but do not change evidence quality, scores or ranking without primary validation."] : []),
    ],
    disclosures: DISCLOSURES,
  };
}

export function rerankLabRun(run: LabRun, weights: LabWeights) {
  const normalizedWeights = normalizeLabWeights(weights);
  const ranked = recalculateRanking(run.opportunities, normalizedWeights, run.weights);
  return { run: { ...run, weights: normalizedWeights, opportunities: ranked.opportunities }, deltas: ranked.deltas };
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
    const normalizedText = text.toLowerCase();
    const duplicate = opportunity.availableEvidence.some((item) => item.replace(/^User-supplied \(unverified\):\s*/i, "").toLowerCase() === normalizedText);
    if (duplicate) return opportunity;
    return { ...opportunity, availableEvidence: [...opportunity.availableEvidence, `User-supplied (unverified): ${text}`] };
  });
  return { ...run, opportunities: updated };
}

export function serializeReproducibleRun(run: LabRun) {
  return JSON.stringify({ modelVersion: run.modelVersion, input: run.input, weights: run.weights, webResearch: run.webResearch, opportunities: run.opportunities.map((opportunity) => ({ ...opportunity, humanDecision: "Pending" })) });
}
