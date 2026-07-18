import type {
  PortfolioLimits,
  PortfolioProposal,
  ProposalAllocation,
  ProposalCandidate,
  ValidationResult,
} from "./types.ts";
import { clampFinite, roundTo, sanitizeText } from "./validation.ts";

interface ConstraintGroup {
  id: string;
  cap: number;
  memberIndexes: number[];
}

function constraintGroups(candidates: ProposalCandidate[], limits: PortfolioLimits): ConstraintGroup[] {
  const sectors = [...new Set(candidates.map((candidate) => candidate.asset.sector))].sort();
  return [
    {
      id: "argentina",
      cap: limits.maximumArgentinaWeight,
      memberIndexes: candidates.map((candidate, index) => candidate.asset.geography === "argentina" ? index : -1).filter((index) => index >= 0),
    },
    {
      id: "bitcoin",
      cap: limits.maximumBitcoinWeight,
      memberIndexes: candidates.map((candidate, index) => candidate.asset.assetClass === "bitcoin" ? index : -1).filter((index) => index >= 0),
    },
    ...sectors.map((sector) => ({
      id: `sector:${sector}`,
      cap: limits.maximumSectorWeight,
      memberIndexes: candidates.map((candidate, index) => candidate.asset.sector === sector ? index : -1).filter((index) => index >= 0),
    })),
  ].filter((group) => group.memberIndexes.length > 0);
}

export function normalizeProposalWeights(
  rawCandidates: ProposalCandidate[],
  limits: PortfolioLimits,
): ValidationResult<Array<ProposalCandidate & { weight: number }>> {
  const issues: string[] = [];
  const limitEntries: Array<[string, number, boolean]> = [
    ["maximum Argentina weight", limits.maximumArgentinaWeight, true],
    ["maximum Bitcoin weight", limits.maximumBitcoinWeight, true],
    ["maximum asset weight", limits.maximumAssetWeight, false],
    ["maximum sector weight", limits.maximumSectorWeight, false],
    ["minimum cash weight", limits.minimumCashWeight, true],
  ];
  for (const [label, value, allowZero] of limitEntries) {
    if (!Number.isFinite(value) || value < (allowZero ? 0 : Number.EPSILON) || value > 1) issues.push(`The ${label} must be ${allowZero ? "between 0 and 1" : "greater than 0 and at most 1"}.`);
  }
  if (limits.minimumCashWeight > limits.maximumSectorWeight) issues.push("Minimum cash weight cannot exceed the cash-sector cap.");
  if (issues.length > 0) return { value: null, issues };
  const candidates = rawCandidates
    .filter((candidate) =>
      limits.allowedAssetClasses.includes(candidate.asset.assetClass) &&
      !limits.excludedAssetIds.includes(candidate.asset.id) &&
      Number.isFinite(candidate.desiredWeight) && candidate.desiredWeight > 0,
    )
    .sort((left, right) => left.asset.id.localeCompare(right.asset.id));
  if (candidates.length === 0) return { value: null, issues: ["No eligible proposal candidates remain after applying limits."] };
  if (new Set(candidates.map((candidate) => candidate.asset.id)).size !== candidates.length) {
    return { value: null, issues: ["Proposal candidates must contain unique asset ids."] };
  }
  const cashIndexes = candidates.map((candidate, index) => candidate.asset.assetClass === "cash" ? index : -1).filter((index) => index >= 0);
  if (limits.minimumCashWeight > 0 && cashIndexes.length === 0) {
    return { value: null, issues: ["The minimum cash weight cannot be met because no cash candidate is eligible."] };
  }

  const desiredTotal = candidates.reduce((sum, candidate) => sum + candidate.desiredWeight, 0);
  const desired = candidates.map((candidate) => candidate.desiredWeight / desiredTotal);
  const weights = candidates.map(() => 0);
  const groups = constraintGroups(candidates, limits);

  if (limits.minimumCashWeight > 0) {
    const cashDesired = cashIndexes.reduce((sum, index) => sum + desired[index], 0);
    for (const index of cashIndexes) {
      weights[index] = limits.minimumCashWeight * (cashDesired > 0 ? desired[index] / cashDesired : 1 / cashIndexes.length);
    }
  }

  for (let iteration = 0; iteration < candidates.length + groups.length + 10; iteration += 1) {
    const remaining = 1 - weights.reduce((sum, weight) => sum + weight, 0);
    if (remaining <= 1e-10) break;
    const active = candidates.map((_, index) => index).filter((index) => {
      if (weights[index] >= limits.maximumAssetWeight - 1e-10) return false;
      return groups.every((group) => !group.memberIndexes.includes(index) ||
        group.memberIndexes.reduce((sum, member) => sum + weights[member], 0) < group.cap - 1e-10);
    });
    if (active.length === 0) break;
    const activeDesired = active.reduce((sum, index) => sum + desired[index], 0);
    const increments = new Map(active.map((index) => [index, remaining * desired[index] / activeDesired]));
    let scale = 1;
    for (const index of active) {
      const increment = increments.get(index) ?? 0;
      if (increment > 0) scale = Math.min(scale, (limits.maximumAssetWeight - weights[index]) / increment);
    }
    for (const group of groups) {
      const proposed = group.memberIndexes.reduce((sum, index) => sum + (increments.get(index) ?? 0), 0);
      const used = group.memberIndexes.reduce((sum, index) => sum + weights[index], 0);
      if (proposed > 0) scale = Math.min(scale, Math.max(0, group.cap - used) / proposed);
    }
    if (scale <= 1e-12) break;
    for (const index of active) weights[index] += (increments.get(index) ?? 0) * scale;
  }

  const allocated = weights.reduce((sum, weight) => sum + weight, 0);
  if (allocated < 1 - 0.000001) {
    issues.push(`Limits are infeasible for the supplied assets; only ${(allocated * 100).toFixed(2)}% can be allocated.`);
    return { value: null, issues };
  }
  const normalized = weights.map((weight) => weight / allocated);
  return {
    value: candidates.map((candidate, index) => ({ ...candidate, weight: roundTo(normalized[index], 8) })),
    issues,
  };
}

export function createPortfolioProposal(args: {
  id: string;
  name: string;
  capital: number;
  candidates: ProposalCandidate[];
  limits: PortfolioLimits;
  expectedReturnRangePct: [number, number];
  plausibleLossPct: number;
  horizonMonths: number;
  scenarios: PortfolioProposal["scenarios"];
  invalidationConditions: string[];
}): ValidationResult<PortfolioProposal> {
  const normalized = normalizeProposalWeights(args.candidates, args.limits);
  if (!normalized.value) return { value: null, issues: normalized.issues };
  const capital = clampFinite(args.capital, 0, 1_000_000_000_000);
  const allocations: ProposalAllocation[] = normalized.value.map((candidate) => ({
    ...candidate,
    rationale: sanitizeText(candidate.rationale, 1_000),
    role: sanitizeText(candidate.role, 200),
    risks: candidate.risks.map((risk) => sanitizeText(risk, 500)).filter(Boolean).slice(0, 30),
    suggestedAmount: roundTo(capital * candidate.weight, 2),
  }));
  const low = clampFinite(Math.min(...args.expectedReturnRangePct), -100, 500);
  const high = clampFinite(Math.max(...args.expectedReturnRangePct), -100, 500);
  return {
    value: {
      id: sanitizeText(args.id, 80),
      name: sanitizeText(args.name, 120),
      allocations,
      expectedReturnRangePct: [low, high],
      plausibleLossPct: clampFinite(args.plausibleLossPct, 0, 100),
      horizonMonths: clampFinite(args.horizonMonths, 1, 1_200),
      scenarios: {
        adversePct: clampFinite(args.scenarios.adversePct, -100, 500),
        basePct: clampFinite(args.scenarios.basePct, -100, 500),
        favorablePct: clampFinite(args.scenarios.favorablePct, -100, 500),
      },
      invalidationConditions: args.invalidationConditions.map((item) => sanitizeText(item, 500)).filter(Boolean),
      limitations: [
        "All values use simulated inputs and are not forecasts.",
        "Weights reflect user limits and deterministic heuristics, not unconstrained historical optimization.",
        "Expected return is shown as a bounded scenario range, not a guaranteed outcome.",
        "No allocation authorizes or executes a trade.",
      ],
      normalized: true,
    },
    issues: [],
  };
}
