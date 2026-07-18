export interface ValuationScenario {
  id: string;
  label: string;
  probabilityPct: number;
  discountRatePct: number;
  terminalGrowthPct: number;
  npvM: number;
  year10RevenueM: number;
  revenueM: number[];
  fcffM: number[];
}

export interface DcfResult {
  forecastValueM: number;
  terminalValueM: number;
  enterpriseValueM: number;
  probabilityWeightedValueM: number;
}

export function clampValuationInput(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateScenarioDcf(
  scenario: ValuationScenario,
  requestedDiscountRatePct = scenario.discountRatePct,
  requestedTerminalGrowthPct = scenario.terminalGrowthPct,
  requestedProbabilityPct = scenario.probabilityPct,
): DcfResult {
  const discountRate = clampValuationInput(requestedDiscountRatePct, 20, 80) / 100;
  const terminalGrowth = Math.min(
    clampValuationInput(requestedTerminalGrowthPct, 0, 5) / 100,
    discountRate - 0.01,
  );
  const probability = clampValuationInput(requestedProbabilityPct, 0, 100) / 100;
  const forecastValueM = scenario.fcffM.reduce(
    (sum, value, index) => sum + value / ((1 + discountRate) ** (index + 1)),
    0,
  );
  const finalCashFlow = scenario.fcffM.at(-1) ?? 0;
  const terminalValueAtYearTen = finalCashFlow > 0
    ? finalCashFlow * (1 + terminalGrowth) / (discountRate - terminalGrowth)
    : 0;
  const terminalValueM = terminalValueAtYearTen / ((1 + discountRate) ** scenario.fcffM.length);
  const enterpriseValueM = forecastValueM + terminalValueM;
  return {
    forecastValueM,
    terminalValueM,
    enterpriseValueM,
    probabilityWeightedValueM: Math.max(0, enterpriseValueM) * probability,
  };
}

export function calculateReadinessScore(components: ReadonlyArray<{ weightPct: number; score: number }>) {
  const totalWeight = components.reduce((sum, component) => sum + component.weightPct, 0);
  if (totalWeight <= 0) return 0;
  const weighted = components.reduce(
    (sum, component) => sum + clampValuationInput(component.score, 0, 100) * component.weightPct,
    0,
  );
  return Math.round(weighted / totalWeight);
}

export function formatUsdMillions(value: number, digits = value < 10 ? 2 : 1) {
  const absolute = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value < 0 ? "-" : ""}$${absolute}m`;
}

export function logarithmicBarWidth(value: number, maximum: number) {
  const boundedValue = Math.max(0, value);
  const boundedMaximum = Math.max(1, maximum);
  return Math.max(2, Math.min(100, Math.log10(1 + boundedValue) / Math.log10(1 + boundedMaximum) * 100));
}
