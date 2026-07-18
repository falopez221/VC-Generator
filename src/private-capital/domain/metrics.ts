import type { MetricResult } from "./types.ts";
import { clampFinite, roundTo } from "./validation.ts";

const MIN_OBSERVATIONS = 2;

function metric(
  value: number | null,
  observations: number,
  formula: string,
  assumptions: string[],
  limitations: string[],
  unit: MetricResult["unit"] = "decimal",
): MetricResult {
  return {
    value: value === null || !Number.isFinite(value) ? null : roundTo(clampFinite(value, -1_000_000, 1_000_000), 8),
    unit,
    observations,
    formula,
    assumptions,
    limitations,
  };
}
function finiteReturns(returns: readonly number[]): number[] {
  return returns.filter((value) => Number.isFinite(value) && value >= -1 && value <= 10);
}

function quantile(sorted: number[], probability: number): number {
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(probability * sorted.length)));
  return sorted[index];
}

export function historicalVolatility(returns: readonly number[], periodsPerYear = 252): MetricResult {
  const values = finiteReturns(returns);
  if (values.length < MIN_OBSERVATIONS) return metric(null, values.length, "sample standard deviation × √periods/year", [], ["At least two bounded return observations are required."]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
  return metric(Math.sqrt(variance) * Math.sqrt(clampFinite(periodsPerYear, 1, 100_000)), values.length,
    "sample standard deviation × √periods/year", ["Returns are equally spaced and serial dependence is ignored."],
    ["Historical volatility is backward-looking and is sensitive to sampling frequency."]);
}

export function maximumDrawdown(values: readonly number[]): MetricResult {
  const finite = values.filter((value) => Number.isFinite(value) && value >= 0);
  if (finite.length < MIN_OBSERVATIONS) return metric(null, finite.length, "max((peak − value) / peak)", [], ["At least two non-negative portfolio values are required."]);
  let peak = finite[0];
  let drawdown = 0;
  for (const value of finite) {
    peak = Math.max(peak, value);
    if (peak > 0) drawdown = Math.max(drawdown, (peak - value) / peak);
  }
  return metric(drawdown, finite.length, "max((running peak − value) / running peak)", [], ["Observed drawdown does not bound future losses."]);
}

export function concentrationIndex(weights: readonly number[]): MetricResult {
  const finite = weights.filter((weight) => Number.isFinite(weight) && weight >= 0);
  const total = finite.reduce((sum, weight) => sum + weight, 0);
  if (finite.length === 0 || total <= 0) return metric(null, finite.length, "Σ(normalized weight²)", [], ["Positive portfolio weights are required."], "ratio");
  const value = finite.reduce((sum, weight) => sum + (weight / total) ** 2, 0);
  return metric(value, finite.length, "Herfindahl index = Σ(normalized weight²)", ["Look-through exposures are not included."], ["Equal risk contributions can differ materially from capital weights."], "ratio");
}

export function historicalVar(returns: readonly number[], confidence = 0.95): MetricResult {
  const values = finiteReturns(returns).sort((left, right) => left - right);
  const level = clampFinite(confidence, 0.5, 0.999);
  if (values.length < 5) return metric(null, values.length, "max(0, −lower empirical quantile)", [], ["At least five bounded return observations are required."]);
  const tailQuantile = quantile(values, 1 - level);
  return metric(Math.max(0, -tailQuantile), values.length, "max(0, −empirical quantile at 1 − confidence)", [`Confidence is ${(level * 100).toFixed(1)}%.`], ["Historical VaR is not a worst-case loss and can understate regime shifts."]);
}

export function historicalExpectedShortfall(returns: readonly number[], confidence = 0.95): MetricResult {
  const values = finiteReturns(returns).sort((left, right) => left - right);
  const level = clampFinite(confidence, 0.5, 0.999);
  if (values.length < 5) return metric(null, values.length, "mean loss at or below the VaR quantile", [], ["At least five bounded return observations are required."]);
  const cutoff = quantile(values, 1 - level);
  const tail = values.filter((value) => value <= cutoff);
  const average = tail.reduce((sum, value) => sum + value, 0) / tail.length;
  return metric(Math.max(0, -average), values.length, "max(0, −mean(return | return ≤ lower empirical quantile))", [`Confidence is ${(level * 100).toFixed(1)}%.`], ["Expected Shortfall inherits the sample and regime limitations of historical simulation."]);
}

export function sharpeRatio(returns: readonly number[], riskFreePerPeriod = 0): MetricResult {
  const values = finiteReturns(returns);
  if (values.length < MIN_OBSERVATIONS) return metric(null, values.length, "mean(excess return) / sample standard deviation", [], ["At least two bounded observations are required."], "ratio");
  const excess = values.map((value) => value - clampFinite(riskFreePerPeriod, -1, 10));
  const average = excess.reduce((sum, value) => sum + value, 0) / excess.length;
  const variance = excess.reduce((sum, value) => sum + (value - average) ** 2, 0) / (excess.length - 1);
  if (variance <= 0) return metric(null, values.length, "mean(excess return) / sample standard deviation", [], ["Sharpe ratio is undefined when volatility is zero."], "ratio");
  return metric(average / Math.sqrt(variance), values.length, "mean(excess return) / sample standard deviation", ["Risk-free rate and returns use the same period."], ["The ratio treats upside and downside volatility equally and is not annualized."], "ratio");
}

export function sortinoRatio(returns: readonly number[], targetPerPeriod = 0): MetricResult {
  const values = finiteReturns(returns);
  if (values.length < MIN_OBSERVATIONS) return metric(null, values.length, "mean(return − target) / downside deviation", [], ["At least two bounded observations are required."], "ratio");
  const target = clampFinite(targetPerPeriod, -1, 10);
  const excess = values.map((value) => value - target);
  const downsideVariance = excess.reduce((sum, value) => sum + Math.min(0, value) ** 2, 0) / excess.length;
  if (downsideVariance <= 0) return metric(null, values.length, "mean(return − target) / downside deviation", [], ["Sortino ratio is undefined when no downside deviation is observed."], "ratio");
  const average = excess.reduce((sum, value) => sum + value, 0) / excess.length;
  return metric(average / Math.sqrt(downsideVariance), values.length, "mean(return − target) / √mean(min(0, return − target)²)", ["Target and returns use the same period."], ["Small samples can produce unstable downside deviation; the ratio is not annualized."], "ratio");
}

export function calculatePortfolioMetrics(args: { returns: readonly number[]; values: readonly number[]; weights: readonly number[]; confidence?: number }) {
  return {
    volatility: historicalVolatility(args.returns),
    drawdown: maximumDrawdown(args.values),
    concentration: concentrationIndex(args.weights),
    valueAtRisk: historicalVar(args.returns, args.confidence),
    expectedShortfall: historicalExpectedShortfall(args.returns, args.confidence),
    sharpe: sharpeRatio(args.returns),
    sortino: sortinoRatio(args.returns),
  };
}
