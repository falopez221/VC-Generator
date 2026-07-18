import type { ExplainableSignal, SignalAction, SignalEvidence, ValidationResult } from "./types.ts";
import { clampFinite, isIsoTimestamp, sanitizeText } from "./validation.ts";

export interface SignalInput extends Omit<ExplainableSignal, "intensity" | "confidence" | "humanReviewRequired"> {
  intensity: number;
  confidence: number;
}

export function createExplainableSignal(input: SignalInput): ValidationResult<ExplainableSignal> {
  const issues: string[] = [];
  if (!sanitizeText(input.id, 80) || !sanitizeText(input.assetId, 80)) issues.push("Signal and asset ids are required.");
  if (!isIsoTimestamp(input.expiresAt)) issues.push("Signal expiry must be ISO-8601 UTC.");
  if (input.action !== "insufficient_data" && input.evidenceFor.length === 0) issues.push("A directional signal requires evidence in favor.");
  if (input.action !== "insufficient_data" && input.risks.length === 0) issues.push("A directional signal requires explicit risks.");
  if (!sanitizeText(input.invalidationCondition, 500)) issues.push("An invalidation condition is required.");
  if (!Number.isFinite(input.intensity) || input.intensity < 0 || input.intensity > 1) issues.push("Signal intensity must be between 0 and 1.");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) issues.push("Signal confidence must be between 0 and 1.");
  if (!Number.isFinite(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 1_200) issues.push("Signal horizon must be between 1 and 1,200 months.");
  if (input.observedRange && input.observedRange.some((value) => !Number.isFinite(value) || value < 0)) issues.push("Observed range must contain finite non-negative values.");
  const evidence = [...input.evidenceFor, ...input.evidenceAgainst];
  if (evidence.some((item) => item.provenance.kind !== "mock" || !item.provenance.notice || item.provenance.confidenceLabel !== "simulated" || !Number.isFinite(item.provenance.confidence) || item.provenance.confidence < 0 || item.provenance.confidence > 1)) {
    issues.push("Every evidence item must expose branded mock provenance.");
  }
  if (issues.length > 0) return { value: null, issues };

  return {
    value: {
      ...input,
      id: sanitizeText(input.id, 80),
      assetId: sanitizeText(input.assetId, 80),
      intensity: clampFinite(input.intensity, 0, 1),
      confidence: clampFinite(input.confidence, 0, 1),
      horizonMonths: clampFinite(input.horizonMonths, 1, 1_200),
      risks: input.risks.map((risk) => sanitizeText(risk, 500)).filter(Boolean),
      assumptions: input.assumptions.map((assumption) => sanitizeText(assumption, 500)).filter(Boolean),
      invalidationCondition: sanitizeText(input.invalidationCondition, 500),
      portfolioRelationship: sanitizeText(input.portfolioRelationship, 500),
      estimatedRiskImpact: sanitizeText(input.estimatedRiskImpact, 500),
      estimatedDiversificationImpact: sanitizeText(input.estimatedDiversificationImpact, 500),
      executiveExplanation: sanitizeText(input.executiveExplanation, 1_000),
      technicalExplanation: sanitizeText(input.technicalExplanation, 3_000),
      observedRange: input.observedRange
        ? [Math.min(...input.observedRange), Math.max(...input.observedRange)]
        : undefined,
      humanReviewRequired: true,
    },
    issues,
  };
}

export function inferSignalAction(args: {
  evidenceScore: number;
  riskScore: number;
  confidence: number;
  dataSufficient: boolean;
  thesisBroken: boolean;
}): SignalAction {
  if (!args.dataSufficient || args.confidence < 0.35) return "insufficient_data";
  if (args.thesisBroken && args.riskScore >= 0.75) return "possible_exit";
  if (args.thesisBroken) return "review_thesis";
  if (args.riskScore >= 0.85) return "elevated_risk";
  if (args.evidenceScore >= 0.7 && args.riskScore < 0.6) return "possible_buy_opportunity";
  if (args.evidenceScore >= 0.55) return "gradual_accumulation";
  if (args.evidenceScore <= -0.5) return "reduce_exposure";
  if (Math.abs(args.evidenceScore) < 0.2) return "hold";
  return "await_confirmation";
}

export function signalEvidenceIsFresh(evidence: SignalEvidence, now: string, maximumAgeMs: number): boolean {
  const age = Date.parse(now) - Date.parse(evidence.provenance.timestamp);
  return evidence.provenance.validated && Number.isFinite(age) && age >= 0 && age <= maximumAgeMs;
}
