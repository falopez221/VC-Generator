import type { DataConfidenceLabel, DataProvenance, DataQualityAssessment, DecisionSuitability } from "./types.ts";

export function confidenceLabelFor(provenance: Pick<DataProvenance, "freshness" | "confidence" | "validated">): DataConfidenceLabel {
  if (provenance.freshness === "unavailable") return "unavailable";
  if (provenance.freshness === "simulated") return "simulated";
  if (!provenance.validated || !Number.isFinite(provenance.confidence) || provenance.confidence < 0 || provenance.confidence > 1 || provenance.confidence < 0.5) return "low";
  return provenance.confidence < 0.8 ? "medium" : "high";
}

export function assessDataQuality(
  provenance: DataProvenance,
  now: string,
  maximumAgeMs: number,
): DataQualityAssessment {
  const reasons: string[] = [];
  const nowMs = Date.parse(now);
  const observedMs = provenance.observedAt === null ? Number.NaN : Date.parse(provenance.observedAt);
  const ageMs = Number.isFinite(nowMs) && Number.isFinite(observedMs) ? nowMs - observedMs : null;
  const maximumAge = Number.isFinite(maximumAgeMs) ? Math.max(0, maximumAgeMs) : 0;
  const confidenceLabel = confidenceLabelFor(provenance);

  if (!provenance.source.trim()) reasons.push("Provider source is missing.");
  if (!Number.isFinite(Date.parse(provenance.retrievedAt))) reasons.push("Retrieval timestamp is invalid.");
  if (!Number.isFinite(provenance.confidence) || provenance.confidence < 0 || provenance.confidence > 1) reasons.push("Provider confidence must be between 0 and 1.");
  if (provenance.confidenceLabel !== confidenceLabel) reasons.push("Provider confidence label does not match its provenance fields.");
  if (!provenance.validated) reasons.push("Provider datum is not validated.");
  if (provenance.freshness === "simulated") reasons.push("Simulated fixtures are never suitable for real investment decisions.");
  if (provenance.freshness === "estimated") reasons.push("Estimated data requires corroboration before material decisions.");
  if (provenance.freshness === "unavailable") reasons.push("Provider datum is unavailable.");
  if (ageMs === null) reasons.push("Observed timestamp is unavailable or invalid.");
  else if (ageMs < 0) reasons.push("Observed timestamp is in the future.");
  else if (ageMs > maximumAge) reasons.push("Provider datum exceeds the configured freshness window.");
  if (confidenceLabel === "low" || confidenceLabel === "unavailable") reasons.push("Provider confidence is below the analysis threshold.");

  let decisionSuitability: DecisionSuitability = "analysis_eligible";
  if (provenance.freshness === "simulated" || provenance.freshness === "unavailable" || !provenance.validated) {
    decisionSuitability = "not_suitable";
  } else if (provenance.freshness === "estimated" || reasons.length > 0 || confidenceLabel !== "high") {
    decisionSuitability = "analysis_with_caution";
  }
  return { freshness: provenance.freshness, confidenceLabel, decisionSuitability, ageMs, reasons };
}
