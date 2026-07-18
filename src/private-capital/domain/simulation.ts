import { SIMULATION_NOTICE, type FinancialAsset, type RebalanceInstruction, type ScenarioDefinition, type ScenarioResult } from "./types.ts";
import { clampFinite, roundTo } from "./validation.ts";

export function simulateScenario(args: {
  scenario: ScenarioDefinition;
  positions: Array<{ asset: FinancialAsset; weight: number }>;
  startingValue: number;
}): ScenarioResult {
  const positiveWeights = args.positions.map((position) => Math.max(0, Number.isFinite(position.weight) ? position.weight : 0));
  const total = positiveWeights.reduce((sum, weight) => sum + weight, 0);
  const contributions = args.positions.map((position, index) => {
    const normalizedWeight = total > 0 ? positiveWeights[index] / total : 0;
    const rawShock = args.scenario.assetShocks?.[position.asset.id] ?? args.scenario.assetClassShocks[position.asset.assetClass] ?? 0;
    const shockLimit = clampFinite(args.scenario.maximumAbsoluteShock, 0, 1);
    const shock = clampFinite(rawShock, -shockLimit, shockLimit);
    return { assetId: position.asset.id, shock, contribution: roundTo(normalizedWeight * shock, 8) };
  });
  const portfolioReturn = roundTo(contributions.reduce((sum, item) => sum + item.contribution, 0), 8);
  const startingValue = clampFinite(args.startingValue, 0, 1_000_000_000_000);
  return {
    scenarioId: args.scenario.id,
    portfolioReturn,
    endingValue: roundTo(startingValue * (1 + portfolioReturn), 2),
    contributions,
    assumptions: [
      "Shocks are deterministic, instantaneous and supplied by the user or simulated scenario fixture.",
      "Asset interactions, taxes, slippage, path dependency and currency conversion are excluded.",
      "Weights are normalized before applying bounded shocks.",
    ],
    notice: SIMULATION_NOTICE,
  };
}

export function planRebalance(args: {
  currentValues: Record<string, number>;
  targetWeights: Record<string, number>;
  contribution: number;
  band: number;
  estimatedCostRate: number;
}): RebalanceInstruction[] {
  const assetIds = [...new Set([...Object.keys(args.currentValues), ...Object.keys(args.targetWeights)])].sort();
  const currentValueFor = (assetId: string) => clampFinite(args.currentValues[assetId] ?? 0, 0, 1_000_000_000_000);
  const targetFor = (assetId: string) => clampFinite(args.targetWeights[assetId] ?? 0, 0, 1);
  const currentTotal = assetIds.reduce((sum, assetId) => sum + currentValueFor(assetId), 0);
  const contribution = clampFinite(args.contribution, 0, 1_000_000_000_000);
  const futureTotal = currentTotal + contribution;
  const rawTargetTotal = assetIds.reduce((sum, assetId) => sum + targetFor(assetId), 0);
  const band = clampFinite(args.band, 0, 1);
  const costRate = clampFinite(args.estimatedCostRate, 0, 0.25);
  return assetIds.map((assetId) => {
    const currentValue = currentValueFor(assetId);
    const currentWeight = currentTotal > 0 ? currentValue / currentTotal : 0;
    const targetWeight = rawTargetTotal > 0 ? targetFor(assetId) / rawTargetTotal : 0;
    const differenceWeight = targetWeight - (futureTotal > 0 ? currentValue / futureTotal : 0);
    const referenceAmount = roundTo(differenceWeight * futureTotal, 2);
    const absoluteDifference = Math.abs(differenceWeight);
    return {
      assetId,
      currentWeight: roundTo(currentWeight, 8),
      targetWeight: roundTo(targetWeight, 8),
      differenceWeight: roundTo(differenceWeight, 8),
      referenceAmount,
      direction: absoluteDifference <= band ? "hold" : referenceAmount > 0 ? "increase" : "reduce",
      priority: absoluteDifference >= Math.max(0.1, band * 2) ? "high" : absoluteDifference > band ? "medium" : "low",
      estimatedCost: roundTo(Math.abs(referenceAmount) * costRate, 2),
      executionAuthorized: false,
    };
  });
}
