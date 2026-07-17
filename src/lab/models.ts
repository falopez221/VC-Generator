import { AGENT_NAMES, DIMENSION_KEYS, type BayesianResult, type ComparisonDelta, type LabWeights, type LeastSquaresResult, type MonteCarloConfig, type MonteCarloResult, type Opportunity, type OpportunityCategory, type ScenarioResult } from "./types.ts";
import { clamp, createRandom, round, sampleDistribution } from "./random.ts";

export function normalizeWeights<T extends string>(weights: Record<T, number>): Record<T, number> {
  const keys = Object.keys(weights) as T[];
  const safe = keys.map((key) => Math.max(0, Number(weights[key]) || 0));
  const total = safe.reduce((sum, value) => sum + value, 0) || keys.length;
  return Object.fromEntries(keys.map((key, index) => [key, round(safe[index] / total * 100, 4)])) as Record<T, number>;
}

export function normalizeLabWeights(weights: LabWeights): LabWeights {
  return {
    agents: normalizeWeights(weights.agents),
    dimensions: normalizeWeights(weights.dimensions),
    riskAversion: round(clamp(weights.riskAversion), 2),
    innovationPreference: round(clamp(weights.innovationPreference), 2),
    evidenceThreshold: round(clamp(weights.evidenceThreshold), 2),
    uncertaintyTolerance: round(clamp(weights.uncertaintyTolerance), 2),
  };
}

export function calculateMCDA(opportunity: Opportunity, weights: LabWeights) {
  const normalized = normalizeWeights(weights.dimensions);
  const contributions = Object.fromEntries(DIMENSION_KEYS.map((key) => {
    const value = key === "risk" ? 100 - opportunity.dimensions.risk : opportunity.dimensions[key];
    return [key, value * normalized[key] / 100];
  })) as Record<(typeof DIMENSION_KEYS)[number], number>;
  const rawScore = Object.values(contributions).reduce((sum, value) => sum + value, 0);
  const riskPenalty = opportunity.dimensions.risk * (weights.riskAversion / 100) * 0.12;
  const evidenceGap = Math.max(0, weights.evidenceThreshold - opportunity.dimensions.evidenceQuality);
  const evidenceAdjustment = opportunity.dimensions.evidenceQuality * 0.06 - evidenceGap * 0.16;
  const innovationAdjustment = (opportunity.novelty - 50) * (weights.innovationPreference - 50) / 2500;
  const uncertaintyPenalty = opportunity.uncertainty * ((100 - weights.uncertaintyTolerance) / 100) * 0.08;
  const weightedScore = clamp(rawScore - riskPenalty + evidenceAdjustment + innovationAdjustment - uncertaintyPenalty);
  const interval = Math.max(4, opportunity.uncertainty * 0.24 + opportunity.disagreement * 0.18);
  return {
    rawScore: round(rawScore),
    weightedScore: round(weightedScore),
    riskPenalty: round(riskPenalty),
    evidenceAdjustment: round(evidenceAdjustment),
    uncertaintyPenalty: round(uncertaintyPenalty),
    contributions,
    interval: [round(clamp(weightedScore - interval)), round(clamp(weightedScore + interval))] as [number, number],
  };
}

export function weightedAgentScore(opportunity: Opportunity, weights: LabWeights) {
  const normalized = normalizeWeights(weights.agents);
  return AGENT_NAMES.reduce((sum, name) => sum + opportunity.agents[name].score * normalized[name] / 100, 0);
}

export function classifyOpportunity(score: number, evidence: number, risk: number, uncertainty: number, disagreement: number): OpportunityCategory {
  if (evidence < 28) return "Insufficient Evidence";
  if (score < 45) return "Weak";
  if (uncertainty > 66 || disagreement > 22) return "Uncertain";
  if (score >= 80 && evidence >= 62 && risk <= 62 && uncertainty <= 48) return "Highly Promising";
  if (score >= 70 && (disagreement >= 14 || risk >= 58)) return "Priority for Human Review";
  if (score >= 62 && evidence >= 42) return "Promising";
  return "Uncertain";
}

function describeWeightChange(previousWeights: LabWeights | undefined, nextWeights: LabWeights) {
  if (!previousWeights) return "Initial public weights with visible risk, evidence and uncertainty adjustments";
  const previous = normalizeLabWeights(previousWeights);
  const next = normalizeLabWeights(nextWeights);
  const changes = [
    ...AGENT_NAMES.map((name) => ({ label: `${name} agent weight`, delta: next.agents[name] - previous.agents[name] })),
    ...DIMENSION_KEYS.map((key) => ({ label: `${key} dimension weight`, delta: next.dimensions[key] - previous.dimensions[key] })),
    { label: "Risk aversion", delta: next.riskAversion - previous.riskAversion },
    { label: "Innovation preference", delta: next.innovationPreference - previous.innovationPreference },
    { label: "Evidence threshold", delta: next.evidenceThreshold - previous.evidenceThreshold },
    { label: "Uncertainty tolerance", delta: next.uncertaintyTolerance - previous.uncertaintyTolerance },
  ];
  const driver = changes.reduce((largest, change) => Math.abs(change.delta) > Math.abs(largest.delta) ? change : largest, changes[0]);
  if (!driver || Math.abs(driver.delta) < 0.001) return "No public weight changed; movement reflects updated opportunity evidence or state";
  return `${driver.label} ${driver.delta >= 0 ? "increased" : "decreased"} by ${Math.abs(round(driver.delta, 2))} points`;
}

export function recalculateRanking(opportunities: Opportunity[], weights: LabWeights, previousWeights?: LabWeights) {
  const previous = new Map(opportunities.map((opportunity) => [opportunity.id, { rank: opportunity.rank, score: opportunity.totalScore }]));
  const recalculated = opportunities.map((opportunity) => {
    const mcda = calculateMCDA(opportunity, weights);
    const agentScore = weightedAgentScore(opportunity, weights);
    const totalScore = round(clamp(mcda.weightedScore * 0.58 + agentScore * 0.42));
    const category = classifyOpportunity(totalScore, opportunity.dimensions.evidenceQuality, opportunity.dimensions.risk, opportunity.uncertainty, opportunity.disagreement);
    return { ...opportunity, totalScore, category, previousRank: opportunity.rank };
  }).sort((a, b) => b.totalScore - a.totalScore)
    .map((opportunity, index) => ({ ...opportunity, rank: index + 1 }));

  const deltas: ComparisonDelta[] = recalculated.map((opportunity) => {
    const prior = previous.get(opportunity.id) ?? { rank: opportunity.rank, score: opportunity.totalScore };
    return {
      id: opportunity.id,
      previousRank: prior.rank,
      rank: opportunity.rank,
      scoreDelta: round(opportunity.totalScore - prior.score),
      mainDriver: describeWeightChange(previousWeights, weights),
    };
  });
  return { opportunities: recalculated, deltas };
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
}

export function runMonteCarlo(opportunity: Opportunity, config: MonteCarloConfig): MonteCarloResult {
  const simulations = Math.round(clamp(config.simulations, 200, 5000));
  const random = createRandom(config.seed + opportunity.id.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0));
  const samples = Array.from({ length: simulations }, () => {
    const market = config.marketGrowth * (1 + sampleDistribution(random, config.distribution) * 0.35);
    const adoption = config.adoption * (1 + sampleDistribution(random, config.distribution) * 0.42);
    const price = config.price * (1 + sampleDistribution(random, config.distribution) * 0.22);
    const cac = config.cac * (1 + sampleDistribution(random, config.distribution) * 0.36);
    const churn = clamp(config.churn * (1 + sampleDistribution(random, config.distribution) * 0.4), 0, 95);
    const margin = clamp(config.margin * (1 + sampleDistribution(random, config.distribution) * 0.2), 1, 95);
    const annualRevenue = market * adoption / 100 * price * (1 - churn / 100) * (1 + opportunity.dimensions.scalability / 180);
    const contribution = annualRevenue * margin / 100 - cac * Math.max(1, adoption / 8);
    const normalizedReturn = (contribution - config.initialInvestment) / Math.max(1, config.initialInvestment) * 100;
    return round(Math.max(-100, Math.min(300, normalizedReturn)));
  });
  const minimum = Math.min(...samples);
  const maximum = Math.max(...samples);
  const histogram = Array.from({ length: 18 }, () => 0);
  samples.forEach((sample) => {
    const bin = maximum === minimum ? 0 : Math.min(histogram.length - 1, Math.floor((sample - minimum) / (maximum - minimum) * histogram.length));
    histogram[bin] += 1;
  });
  return {
    samples,
    histogram,
    mean: round(samples.reduce((sum, value) => sum + value, 0) / samples.length),
    median: round(percentile(samples, 0.5)),
    p10: round(percentile(samples, 0.1)),
    p90: round(percentile(samples, 0.9)),
    probabilityAboveThreshold: round(samples.filter((sample) => sample >= config.successThreshold).length / samples.length * 100),
    probabilityOfLoss: round(samples.filter((sample) => sample < 0).length / samples.length * 100),
    downside: round(percentile(samples, 0.05)),
  };
}

export function bayesianUpdate(prior: number, evidenceStrength: number, falsePositive: number, falseNegative: number): BayesianResult {
  const safePrior = clamp(prior, 1, 99) / 100;
  const strength = clamp(evidenceStrength) / 100;
  const likelihoodPositive = clamp((100 - falseNegative) * (0.55 + strength * 0.45), 1, 99) / 100;
  const likelihoodNegative = clamp(falsePositive * (1.1 - strength * 0.45), 1, 99) / 100;
  const numerator = likelihoodPositive * safePrior;
  const posterior = numerator / (numerator + likelihoodNegative * (1 - safePrior));
  return {
    prior: round(safePrior * 100),
    likelihoodPositive: round(likelihoodPositive * 100),
    likelihoodNegative: round(likelihoodNegative * 100),
    posterior: round(posterior * 100),
    delta: round((posterior - safePrior) * 100),
  };
}

export function calculateScenarios(opportunity: Opportunity, growthAdjustment = 0, adoptionAdjustment = 0, marginAdjustment = 0): ScenarioResult[] {
  const definitions = [
    { name: "Downside" as const, multiplier: 0.76, risk: 18, confidence: -8 },
    { name: "Base" as const, multiplier: 1, risk: 0, confidence: 0 },
    { name: "Upside" as const, multiplier: 1.22, risk: -8, confidence: -4 },
  ];
  return definitions.map((definition) => {
    const adjustment = growthAdjustment * 0.12 + adoptionAdjustment * 0.14 + marginAdjustment * 0.1;
    const score = clamp(opportunity.totalScore * definition.multiplier + adjustment);
    return {
      name: definition.name,
      score: round(score),
      returnIndex: round((score - 50) * 3.2),
      risk: round(clamp(opportunity.dimensions.risk + definition.risk - adjustment * 0.15)),
      confidence: round(clamp(opportunity.confidence + definition.confidence)),
      recommendation: score >= 72 ? "Advance to human-designed validation" : score >= 58 ? "Request discriminating evidence" : "Do not prioritize without new evidence",
    };
  });
}

export function paretoFront(opportunities: Opportunity[], x: "potential" | "evidence" | "scalability", y: "risk" | "capital" | "novelty") {
  const xValue = (opportunity: Opportunity) => x === "potential" ? opportunity.totalScore : x === "evidence" ? opportunity.dimensions.evidenceQuality : opportunity.dimensions.scalability;
  const yValue = (opportunity: Opportunity) => y === "risk" ? opportunity.dimensions.risk : y === "capital" ? opportunity.estimatedCapital : opportunity.novelty;
  const minimizeY = y === "risk" || y === "capital";
  return opportunities.map((opportunity) => {
    const dominated = opportunities.some((candidate) => {
      if (candidate.id === opportunity.id) return false;
      const betterX = xValue(candidate) >= xValue(opportunity);
      const betterY = minimizeY ? yValue(candidate) <= yValue(opportunity) : yValue(candidate) >= yValue(opportunity);
      const strictlyBetter = xValue(candidate) > xValue(opportunity) || (minimizeY ? yValue(candidate) < yValue(opportunity) : yValue(candidate) > yValue(opportunity));
      return betterX && betterY && strictlyBetter;
    });
    return { id: opportunity.id, x: round(xValue(opportunity)), y: round(yValue(opportunity)), dominated };
  });
}

export function leastSquaresTrend(points: { id: string; x: number; y: number }[]): LeastSquaresResult {
  const count = points.length;
  if (count === 0) return { slope: 0, intercept: 0, rSquared: 0, rmse: 0, informative: false, reason: "No points are available.", points: [] };
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / count;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / count;
  const varianceX = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  const covariance = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const fitted = points.map((point) => ({ ...point, fittedY: intercept + slope * point.x }));
  const residualSum = fitted.reduce((sum, point) => sum + (point.y - point.fittedY) ** 2, 0);
  const totalSum = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const informative = count >= 2 && varianceX > 0 && totalSum > 0;
  const rSquared = informative ? clamp(1 - residualSum / totalSum, 0, 1) : 0;
  const reason = count < 2
    ? "At least two points are required."
    : varianceX === 0
      ? "The selected X values do not vary."
      : totalSum === 0
        ? "The selected Y values do not vary."
        : "Descriptive fit only; association does not imply causality.";
  return {
    slope: round(slope, 4),
    intercept: round(intercept, 2),
    rSquared: round(rSquared, 3),
    rmse: round(Math.sqrt(residualSum / count), 2),
    informative,
    reason,
    points: fitted.map((point) => ({ ...point, fittedY: round(point.fittedY, 2) })),
  };
}
