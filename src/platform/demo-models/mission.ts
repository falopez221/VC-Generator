import { clampFinite, normalizePositive, round } from "./math.ts";
import type { MissionAggregationInput, MissionAggregationResult } from "./types.ts";

const MAX_CANDIDATES = 100;

function safeId(value: string | undefined, index: number) {
  const trimmed = typeof value === "string" ? value.trim().slice(0, 120) : "";
  return trimmed || `candidate-${index + 1}`;
}

/**
 * Combines selected mission candidates using declared allocations, confidence,
 * and risk. It is an auditable comparison aid, not an autonomous decision.
 */
export function aggregateMission(input: MissionAggregationInput): MissionAggregationResult {
  const candidates = (Array.isArray(input.candidates) ? input.candidates : []).slice(0, MAX_CANDIDATES);
  if (candidates.length === 0) {
    return { candidateCount: 0, missionIndex: 0, evidenceCoveragePercent: 0, riskExposurePercent: 0, concentrationIndex: 0, highestRiskContributorId: null, contributions: [], reviewNotes: ["No candidates supplied; a human must define the comparison set."] };
  }

  const allocations = normalizePositive(candidates.map((candidate) => candidate.allocation));
  const contributions = candidates.map((candidate, index) => {
    const allocationPercent = allocations[index] * 100;
    const score = clampFinite(candidate.score, 0, 100);
    const confidencePercent = clampFinite(candidate.confidencePercent, 0, 100);
    const riskPercent = clampFinite(candidate.riskPercent, 0, 100);
    return {
      id: safeId(candidate.id, index),
      allocationPercent: round(allocationPercent, 4),
      evidenceAdjustedScoreContribution: round(allocationPercent * score / 100 * confidencePercent / 100 * (1 - riskPercent / 100)),
      riskContribution: round(allocationPercent * riskPercent / 100),
      confidenceContribution: allocationPercent * confidencePercent / 100,
    };
  });
  const highestRisk = [...contributions].sort((left, right) => right.riskContribution - left.riskContribution || left.id.localeCompare(right.id))[0];
  const concentrationIndex = contributions.reduce((sum, candidate) => sum + candidate.allocationPercent ** 2, 0);
  const evidenceCoveragePercent = contributions.reduce((sum, candidate) => sum + candidate.confidenceContribution, 0);
  const riskExposurePercent = contributions.reduce((sum, candidate) => sum + candidate.riskContribution, 0);
  const missionIndex = contributions.reduce((sum, candidate) => sum + candidate.evidenceAdjustedScoreContribution, 0);
  const reviewNotes = ["Demonstrative planning aggregate only; human review remains required."];
  if (Math.max(...contributions.map((candidate) => candidate.allocationPercent)) > 50) reviewNotes.push("Allocation concentration exceeds 50%; compare a less concentrated scenario.");
  if (evidenceCoveragePercent < 50) reviewNotes.push("Declared confidence coverage is below 50%; collect discriminating evidence before relying on the comparison.");

  return {
    candidateCount: candidates.length,
    missionIndex: round(missionIndex),
    evidenceCoveragePercent: round(evidenceCoveragePercent),
    riskExposurePercent: round(riskExposurePercent),
    concentrationIndex: round(concentrationIndex),
    highestRiskContributorId: highestRisk?.id ?? null,
    contributions: contributions.map((candidate) => ({
      id: candidate.id,
      allocationPercent: candidate.allocationPercent,
      evidenceAdjustedScoreContribution: candidate.evidenceAdjustedScoreContribution,
      riskContribution: candidate.riskContribution,
    })).sort((left, right) => right.riskContribution - left.riskContribution || left.id.localeCompare(right.id)),
    reviewNotes,
  };
}
