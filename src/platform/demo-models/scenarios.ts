import { clampFinite, createSeededRandom, MAX_CURRENCY, normalizePositive, percentile, round } from "./math.ts";
import type { MonteCarloConfig, MonteCarloSummary, NormalizedScenario, ScenarioAnalysisInput, ScenarioAnalysisResult, ScenarioInput } from "./types.ts";

const MAX_SCENARIOS = 50;
const MAX_HORIZON_YEARS = 50;

interface ComputedScenario extends NormalizedScenario {
  likelihood: number;
  initialCapital: number;
  contributionPresentValue: number;
}

function safeId(value: string | undefined, index: number) {
  const trimmed = typeof value === "string" ? value.trim().slice(0, 120) : "";
  return trimmed || `scenario-${index + 1}`;
}

function calculatePresentValue(annualContribution: number, initialCapital: number, horizonYears: number, discountRatePercent: number) {
  const rate = discountRatePercent / 100;
  let discountedContribution = 0;
  for (let year = 1; year <= horizonYears; year += 1) {
    discountedContribution += annualContribution / (1 + rate) ** year;
  }
  return Math.min(MAX_CURRENCY, Math.max(-MAX_CURRENCY, -initialCapital + discountedContribution));
}

function prepareScenarios(inputs: readonly ScenarioInput[], discountRatePercent: number): ComputedScenario[] {
  const bounded = inputs.slice(0, MAX_SCENARIOS);
  const likelihoods = normalizePositive(bounded.map((scenario) => scenario.likelihood));
  return bounded.map((scenario, index) => {
    const annualRevenue = clampFinite(scenario.annualRevenue, 0, MAX_CURRENCY);
    const grossMarginPercent = clampFinite(scenario.grossMarginPercent, 0, 100);
    const annualOperatingCost = clampFinite(scenario.annualOperatingCost, 0, MAX_CURRENCY);
    const initialCapital = clampFinite(scenario.initialCapital, 0, MAX_CURRENCY);
    const horizonYears = Math.round(clampFinite(scenario.horizonYears, 1, MAX_HORIZON_YEARS));
    const uncertaintyPercent = clampFinite(scenario.uncertaintyPercent, 0, 95);
    const annualContribution = Math.min(MAX_CURRENCY, Math.max(-MAX_CURRENCY, annualRevenue * grossMarginPercent / 100 - annualOperatingCost));
    const netPresentValue = calculatePresentValue(annualContribution, initialCapital, horizonYears, discountRatePercent);
    const contributionPresentValue = netPresentValue + initialCapital;
    const uncertaintyAmount = Math.abs(contributionPresentValue) * uncertaintyPercent / 100;
    return {
      id: safeId(scenario.id, index),
      likelihood: likelihoods[index],
      likelihoodPercent: round(likelihoods[index] * 100, 4),
      annualContribution: round(annualContribution),
      netPresentValue: round(netPresentValue),
      lowerNetPresentValue: round(Math.max(-MAX_CURRENCY, -initialCapital + contributionPresentValue - uncertaintyAmount)),
      upperNetPresentValue: round(Math.min(MAX_CURRENCY, -initialCapital + contributionPresentValue + uncertaintyAmount)),
      uncertaintyPercent: round(uncertaintyPercent),
      initialCapital,
      contributionPresentValue,
    };
  });
}

function weightedPercentile(scenarios: readonly ComputedScenario[], requestedPercentile: number) {
  if (scenarios.length === 0) return 0;
  const threshold = clampFinite(requestedPercentile, 0, 100) / 100;
  let cumulative = 0;
  const sorted = [...scenarios].sort((left, right) => left.netPresentValue - right.netPresentValue);
  for (const scenario of sorted) {
    cumulative += scenario.likelihood;
    if (cumulative >= threshold) return scenario.netPresentValue;
  }
  return sorted[sorted.length - 1].netPresentValue;
}

/** Calculates bounded, discounted scenario estimates from supplied assumptions. */
export function analyzeScenarios(input: ScenarioAnalysisInput): ScenarioAnalysisResult {
  const discountRatePercent = round(clampFinite(input.discountRatePercent, 0, 100), 4);
  const scenarios = prepareScenarios(Array.isArray(input.scenarios) ? input.scenarios : [], discountRatePercent);
  const weighted = (field: keyof Pick<ComputedScenario, "netPresentValue" | "lowerNetPresentValue" | "upperNetPresentValue">) =>
    scenarios.reduce((sum, scenario) => sum + scenario[field] * scenario.likelihood, 0);

  return {
    discountRatePercent,
    scenarioCount: scenarios.length,
    expectedNetPresentValue: round(weighted("netPresentValue")),
    lowerExpectedNetPresentValue: round(weighted("lowerNetPresentValue")),
    upperExpectedNetPresentValue: round(weighted("upperNetPresentValue")),
    probabilityOfLossPercent: round(scenarios.filter((scenario) => scenario.netPresentValue < 0).reduce((sum, scenario) => sum + scenario.likelihood, 0) * 100, 2),
    p10NetPresentValue: round(weightedPercentile(scenarios, 10)),
    medianNetPresentValue: round(weightedPercentile(scenarios, 50)),
    p90NetPresentValue: round(weightedPercentile(scenarios, 90)),
    scenarios: scenarios.map((scenario) => ({
      id: scenario.id,
      likelihoodPercent: scenario.likelihoodPercent,
      annualContribution: scenario.annualContribution,
      netPresentValue: scenario.netPresentValue,
      lowerNetPresentValue: scenario.lowerNetPresentValue,
      upperNetPresentValue: scenario.upperNetPresentValue,
      uncertaintyPercent: scenario.uncertaintyPercent,
    })),
  };
}

function sampleScenario(scenarios: readonly ComputedScenario[], random: () => number) {
  const target = random();
  let cumulative = 0;
  for (const scenario of scenarios) {
    cumulative += scenario.likelihood;
    if (target <= cumulative) return scenario;
  }
  return scenarios[scenarios.length - 1];
}

/**
 * Seeded illustrative sampling over declared scenarios and their declared
 * uncertainty. No external data, agent output, or hidden calibration is used.
 */
export function simulateScenarioOutcomes(input: ScenarioAnalysisInput, config: MonteCarloConfig): MonteCarloSummary {
  const discountRatePercent = round(clampFinite(input.discountRatePercent, 0, 100), 4);
  const scenarios = prepareScenarios(Array.isArray(input.scenarios) ? input.scenarios : [], discountRatePercent);
  const samples = Math.round(clampFinite(config.samples, 100, 20_000));
  const seed = Math.round(clampFinite(config.seed, 1, 2_147_483_646));
  if (scenarios.length === 0) {
    return { samples: 0, seed, meanNetPresentValue: 0, p10NetPresentValue: 0, medianNetPresentValue: 0, p90NetPresentValue: 0, probabilityOfLossPercent: 0, minimumNetPresentValue: 0, maximumNetPresentValue: 0 };
  }

  const random = createSeededRandom(seed);
  const outcomes: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    const scenario = sampleScenario(scenarios, random);
    const deviation = (random() + random() - 1) * scenario.uncertaintyPercent / 100;
    outcomes.push(round(Math.min(MAX_CURRENCY, Math.max(-MAX_CURRENCY, scenario.netPresentValue + scenario.contributionPresentValue * deviation))));
  }
  outcomes.sort((left, right) => left - right);
  const total = outcomes.reduce((sum, value) => sum + value, 0);
  return {
    samples,
    seed,
    meanNetPresentValue: round(total / samples),
    p10NetPresentValue: round(percentile(outcomes, 10)),
    medianNetPresentValue: round(percentile(outcomes, 50)),
    p90NetPresentValue: round(percentile(outcomes, 90)),
    probabilityOfLossPercent: round(outcomes.filter((value) => value < 0).length / samples * 100, 2),
    minimumNetPresentValue: round(outcomes[0]),
    maximumNetPresentValue: round(outcomes[outcomes.length - 1]),
  };
}
