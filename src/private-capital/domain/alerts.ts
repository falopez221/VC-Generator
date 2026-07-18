import type { AlertCandidate, InAppAlert } from "./types.ts";
import { isIsoTimestamp, sanitizeText } from "./validation.ts";

export interface AlertEvaluation {
  emitted: InAppAlert[];
  suppressed: Array<{ candidate: AlertCandidate; reason: "simulated_data" | "stale_data" | "unvalidated_data" | "deduplicated" | "invalid_time" }>;
}

export interface NotificationProvider {
  readonly channel: string;
  deliver(alerts: readonly InAppAlert[]): readonly InAppAlert[];
}

export class InAppNotificationProvider implements NotificationProvider {
  readonly channel = "in_app";

  deliver(alerts: readonly InAppAlert[]): readonly InAppAlert[] {
    return alerts.map((alert) => ({ ...alert }));
  }
}

export function alertFingerprint(candidate: AlertCandidate): string {
  return [candidate.type, candidate.assetId ?? "portfolio", sanitizeText(candidate.title, 120).toLowerCase()].join(":");
}

function createAlertId(fingerprint: string, detectedAt: string): string {
  let hash = 2166136261;
  for (const character of `${fingerprint}|${detectedAt}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `alert-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function evaluateAlertCandidates(args: {
  candidates: AlertCandidate[];
  existing: InAppAlert[];
  now: string;
  maximumDataAgeMs: number;
}): AlertEvaluation {
  const emitted: InAppAlert[] = [];
  const suppressed: AlertEvaluation["suppressed"] = [];
  const nowMs = Date.parse(args.now);
  const existingByFingerprint = new Map<string, InAppAlert>();
  for (const alert of [...args.existing, ...emitted]) existingByFingerprint.set(alert.fingerprint, alert);

  for (const candidate of [...args.candidates].sort((left, right) =>
    left.detectedAt.localeCompare(right.detectedAt) || alertFingerprint(left).localeCompare(alertFingerprint(right)),
  )) {
    if (!isIsoTimestamp(args.now) || !isIsoTimestamp(candidate.detectedAt) || !isIsoTimestamp(candidate.nextReviewAt)
      || Date.parse(candidate.nextReviewAt) < Date.parse(candidate.detectedAt)
      || !Number.isFinite(candidate.maximumFrequencyMs) || candidate.maximumFrequencyMs < 0
      || !Number.isFinite(candidate.silencePeriodMs) || candidate.silencePeriodMs < 0) {
      suppressed.push({ candidate, reason: "invalid_time" });
      continue;
    }
    if (candidate.operational && (candidate.provenance.length === 0 || candidate.provenance.some((item) => !item.validated))) {
      suppressed.push({ candidate, reason: "unvalidated_data" });
      continue;
    }
    if (candidate.operational && candidate.provenance.some((item) => {
      const age = nowMs - Date.parse(item.timestamp);
      return !Number.isFinite(age) || age < 0 || age > args.maximumDataAgeMs;
    })) {
      suppressed.push({ candidate, reason: "stale_data" });
      continue;
    }
    if (candidate.operational && candidate.provenance.some((item) => item.kind === "mock")) {
      suppressed.push({ candidate, reason: "simulated_data" });
      continue;
    }
    const fingerprint = alertFingerprint(candidate);
    const previous = existingByFingerprint.get(fingerprint);
    if (previous) {
      const elapsed = nowMs - Date.parse(previous.detectedAt);
      const wait = Math.max(candidate.maximumFrequencyMs, candidate.silencePeriodMs);
      if (elapsed < wait) {
        suppressed.push({ candidate, reason: "deduplicated" });
        continue;
      }
    }
    const alert: InAppAlert = {
      ...candidate,
      title: sanitizeText(candidate.title, 160),
      explanation: sanitizeText(candidate.explanation, 2_000),
      id: createAlertId(fingerprint, candidate.detectedAt),
      fingerprint,
      status: "unread",
      groupedOccurrences: previous ? previous.groupedOccurrences + 1 : 1,
    };
    emitted.push(alert);
    existingByFingerprint.set(fingerprint, alert);
  }
  return { emitted, suppressed };
}

export function markAlertRead(alert: InAppAlert): InAppAlert {
  return { ...alert, status: "read" };
}

export function archiveAlert(alert: InAppAlert): InAppAlert {
  return { ...alert, status: "archived" };
}
