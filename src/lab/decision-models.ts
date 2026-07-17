import { calculateMCDA, normalizeWeights, recalculateRanking } from "./models.ts";
import { clamp, createRandom, hashString, round } from "./random.ts";
import { AGENT_NAMES, DIMENSION_KEYS, type AgentName, type DimensionKey, type LabWeights, type Opportunity } from "./types.ts";

export interface TornadoSensitivityItem {
  key: DimensionKey;
  inputLow: number;
  inputHigh: number;
  scoreLow: number;
  scoreHigh: number;
  downside: number;
  upside: number;
  spread: number;
}

export interface TornadoSensitivityResult {
  baseline: number;
  step: number;
  items: TornadoSensitivityItem[];
}

export function calculateTornadoSensitivity(
  opportunity: Opportunity,
  weights: LabWeights,
  requestedStep = 10,
): TornadoSensitivityResult {
  const step = round(clamp(requestedStep, 1, 30));
  const baseline = calculateMCDA(opportunity, weights).weightedScore;
  const items = DIMENSION_KEYS.map((key) => {
    const inputLow = round(clamp(opportunity.dimensions[key] - step));
    const inputHigh = round(clamp(opportunity.dimensions[key] + step));
    const lowOpportunity = {
      ...opportunity,
      dimensions: { ...opportunity.dimensions, [key]: inputLow },
    };
    const highOpportunity = {
      ...opportunity,
      dimensions: { ...opportunity.dimensions, [key]: inputHigh },
    };
    const scoreLow = calculateMCDA(lowOpportunity, weights).weightedScore;
    const scoreHigh = calculateMCDA(highOpportunity, weights).weightedScore;
    return {
      key,
      inputLow,
      inputHigh,
      scoreLow,
      scoreHigh,
      downside: round(Math.min(scoreLow, scoreHigh) - baseline),
      upside: round(Math.max(scoreLow, scoreHigh) - baseline),
      spread: round(Math.abs(scoreHigh - scoreLow)),
    };
  }).sort((left, right) => right.spread - left.spread);

  return { baseline, step, items };
}

export interface BreakEvenConfig {
  annualPrice: number;
  acquisitionCost: number;
  churn: number;
  grossMargin: number;
  fixedCost: number;
  addressableCustomers: number;
  expectedAdoption: number;
}

export interface BreakEvenResult {
  annualPrice: number;
  retainedRevenuePerCustomer: number;
  contributionPerCustomer: number;
  currentCustomers: number;
  breakEvenCustomers: number | null;
  breakEvenAdoption: number | null;
  revenueAtBreakEven: number | null;
  safetyMarginCustomers: number | null;
  paybackMonths: number | null;
  feasibleWithinMarket: boolean;
  status: string;
}

export function calculateBreakEven(config: BreakEvenConfig): BreakEvenResult {
  const annualPrice = round(clamp(config.annualPrice, 1, 100_000_000));
  const acquisitionCost = round(clamp(config.acquisitionCost, 0, 100_000_000));
  const churn = clamp(config.churn, 0, 99);
  const grossMargin = clamp(config.grossMargin, 0, 100);
  const fixedCost = round(clamp(config.fixedCost, 0, 1_000_000_000));
  const addressableCustomers = Math.round(clamp(config.addressableCustomers, 1, 10_000_000));
  const expectedAdoption = clamp(config.expectedAdoption, 0, 100);
  const retainedRevenuePerCustomer = round(annualPrice * (1 - churn / 100));
  const contributionPerCustomer = round(retainedRevenuePerCustomer * grossMargin / 100 - acquisitionCost);
  const currentCustomers = round(addressableCustomers * expectedAdoption / 100);

  if (contributionPerCustomer <= 0) {
    return {
      annualPrice,
      retainedRevenuePerCustomer,
      contributionPerCustomer,
      currentCustomers,
      breakEvenCustomers: null,
      breakEvenAdoption: null,
      revenueAtBreakEven: null,
      safetyMarginCustomers: null,
      paybackMonths: null,
      feasibleWithinMarket: false,
      status: "No break-even: retained contribution per customer is not positive.",
    };
  }

  const breakEvenCustomers = Math.ceil(fixedCost / contributionPerCustomer);
  const breakEvenAdoption = round(breakEvenCustomers / addressableCustomers * 100);
  const revenueAtBreakEven = round(breakEvenCustomers * annualPrice);
  const safetyMarginCustomers = round(currentCustomers - breakEvenCustomers);
  const currentAnnualContribution = currentCustomers * contributionPerCustomer;
  const paybackMonths = currentAnnualContribution > 0
    ? round(clamp(fixedCost / currentAnnualContribution * 12, 0, 1200), 1)
    : null;
  const feasibleWithinMarket = breakEvenCustomers <= addressableCustomers;

  return {
    annualPrice,
    retainedRevenuePerCustomer,
    contributionPerCustomer,
    currentCustomers,
    breakEvenCustomers,
    breakEvenAdoption,
    revenueAtBreakEven,
    safetyMarginCustomers,
    paybackMonths,
    feasibleWithinMarket,
    status: feasibleWithinMarket
      ? "Break-even fits inside the selected addressable-customer assumption."
      : "Break-even exceeds the selected addressable-customer assumption.",
  };
}

export interface RankRobustnessConfig {
  samples: number;
  jitter: number;
  seed: number;
}

export interface RankRobustnessItem {
  id: string;
  baselineRank: number;
  meanRank: number;
  bestRank: number;
  worstRank: number;
  firstPlaceFrequency: number;
  topThreeFrequency: number;
}

export interface RankRobustnessResult {
  samples: number;
  jitter: number;
  items: RankRobustnessItem[];
  mostStableId: string | null;
}

function perturbRecord<T extends string>(record: Record<T, number>, jitter: number, random: () => number) {
  const perturbed = Object.fromEntries((Object.keys(record) as T[]).map((key) => {
    const multiplier = 1 + (random() * 2 - 1) * jitter / 100;
    return [key, Math.max(0.0001, record[key] * multiplier)];
  })) as Record<T, number>;
  return normalizeWeights(perturbed);
}

export function calculateRankRobustness(
  opportunities: Opportunity[],
  weights: LabWeights,
  config: RankRobustnessConfig,
): RankRobustnessResult {
  if (opportunities.length === 0) {
    return { samples: 0, jitter: 0, items: [], mostStableId: null };
  }

  const samples = Math.round(clamp(config.samples, 50, 1000));
  const jitter = round(clamp(config.jitter, 0, 50));
  const seed = Math.round(clamp(config.seed, 1, 2_147_483_646));
  const fingerprint = opportunities.map((opportunity) => opportunity.id).join(":");
  const random = createRandom(seed + hashString(fingerprint));
  const stats = new Map(opportunities.map((opportunity) => [opportunity.id, {
    baselineRank: opportunity.rank,
    rankSum: 0,
    bestRank: opportunities.length,
    worstRank: 1,
    first: 0,
    topThree: 0,
  }]));

  for (let index = 0; index < samples; index += 1) {
    const scalarStep = () => (random() * 2 - 1) * jitter;
    const sampledWeights: LabWeights = {
      agents: perturbRecord(weights.agents, jitter, random),
      dimensions: perturbRecord(weights.dimensions, jitter, random),
      riskAversion: clamp(weights.riskAversion + scalarStep()),
      innovationPreference: clamp(weights.innovationPreference + scalarStep()),
      evidenceThreshold: clamp(weights.evidenceThreshold + scalarStep()),
      uncertaintyTolerance: clamp(weights.uncertaintyTolerance + scalarStep()),
    };
    const ranked = recalculateRanking(opportunities, sampledWeights).opportunities;
    ranked.forEach((opportunity) => {
      const item = stats.get(opportunity.id);
      if (!item) return;
      item.rankSum += opportunity.rank;
      item.bestRank = Math.min(item.bestRank, opportunity.rank);
      item.worstRank = Math.max(item.worstRank, opportunity.rank);
      if (opportunity.rank === 1) item.first += 1;
      if (opportunity.rank <= Math.min(3, opportunities.length)) item.topThree += 1;
    });
  }

  const items = opportunities.map((opportunity) => {
    const item = stats.get(opportunity.id)!;
    return {
      id: opportunity.id,
      baselineRank: item.baselineRank,
      meanRank: round(item.rankSum / samples, 2),
      bestRank: item.bestRank,
      worstRank: item.worstRank,
      firstPlaceFrequency: round(item.first / samples * 100, 1),
      topThreeFrequency: round(item.topThree / samples * 100, 1),
    };
  }).sort((left, right) => left.baselineRank - right.baselineRank);
  const mostStable = [...items].sort((left, right) => {
    const leftSpread = left.worstRank - left.bestRank;
    const rightSpread = right.worstRank - right.bestRank;
    return leftSpread - rightSpread || right.topThreeFrequency - left.topThreeFrequency;
  })[0];

  return { samples, jitter, items, mostStableId: mostStable?.id ?? null };
}

export interface ValidationPriorityItem {
  agentName: AgentName;
  evidenceRequest: string;
  evidenceGap: number;
  expectedEvidenceGain: number;
  decisionSensitivity: number;
  costPenalty: number;
  priority: number;
}

export interface ValidationPriorityResult {
  testPower: number;
  costIndex: number;
  items: ValidationPriorityItem[];
}

export function calculateValidationPriority(
  opportunity: Opportunity,
  requestedTestPower = 65,
  requestedCostIndex = 30,
): ValidationPriorityResult {
  const testPower = round(clamp(requestedTestPower, 5, 95));
  const costIndex = round(clamp(requestedCostIndex, 0, 100));
  const items = AGENT_NAMES.map((agentName) => {
    const agent = opportunity.agents[agentName];
    const evidenceGap = round(100 - agent.evidenceQuality);
    const scoreDivergence = Math.abs(agent.score - opportunity.totalScore);
    const decisionSensitivity = round(clamp(
      opportunity.uncertainty * 0.48
      + opportunity.disagreement * 0.82
      + scoreDivergence * 0.5,
    ));
    const expectedEvidenceGain = round(evidenceGap * testPower / 100);
    const grossInformationIndex = expectedEvidenceGain * 0.55 + decisionSensitivity * 0.45;
    const costPenalty = round(costIndex * 0.25);
    return {
      agentName,
      evidenceRequest: agent.missingEvidence[0] ?? "Collect discriminating observed evidence.",
      evidenceGap,
      expectedEvidenceGain,
      decisionSensitivity,
      costPenalty,
      priority: round(clamp(grossInformationIndex - costPenalty)),
    };
  }).sort((left, right) => right.priority - left.priority);

  return { testPower, costIndex, items };
}
