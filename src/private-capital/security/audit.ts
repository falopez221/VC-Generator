import {
  normalizePrivateCapitalEmail,
  PRIVATE_CAPITAL_OWNER_ROLE,
  type PrivateCapitalOwnerRole,
} from "./authorization.ts";

export type PrivateCapitalAccessOutcome = "allowed" | "denied";
export type PrivateCapitalAccessReason =
  | "owner_authorized"
  | "identity_missing"
  | "identity_invalid"
  | "owner_not_configured"
  | "owner_not_authorized";

export type PrivateCapitalAccessAuditRecord = {
  schemaVersion: 1;
  event: "private_capital.access";
  role: PrivateCapitalOwnerRole;
  outcome: PrivateCapitalAccessOutcome;
  reason: PrivateCapitalAccessReason;
  actorEmail: string | null;
  route: string;
  occurredAt: string;
};

export type PrivateCapitalAccessAuditInput = {
  outcome: PrivateCapitalAccessOutcome;
  reason: PrivateCapitalAccessReason;
  actorEmail?: unknown;
  route?: unknown;
  occurredAt?: unknown;
};

const ACCESS_OUTCOMES = new Set<PrivateCapitalAccessOutcome>(["allowed", "denied"]);
const ACCESS_REASONS = new Set<PrivateCapitalAccessReason>([
  "owner_authorized",
  "identity_missing",
  "identity_invalid",
  "owner_not_configured",
  "owner_not_authorized",
]);

/**
 * Produces a deliberately narrow access event. Unknown fields (including
 * holdings, balances, prices and other wealth values) are never copied.
 * Persistence and transport are intentionally left to a future server adapter.
 */
export function sanitizePrivateCapitalAccessAuditRecord(
  input: unknown,
): PrivateCapitalAccessAuditRecord | null {
  if (!isRecord(input)) return null;
  if (!ACCESS_OUTCOMES.has(input.outcome as PrivateCapitalAccessOutcome)) return null;
  if (!ACCESS_REASONS.has(input.reason as PrivateCapitalAccessReason)) return null;

  const occurredAt = sanitizeTimestamp(input.occurredAt);
  if (!occurredAt) return null;

  return {
    schemaVersion: 1,
    event: "private_capital.access",
    role: PRIVATE_CAPITAL_OWNER_ROLE,
    outcome: input.outcome as PrivateCapitalAccessOutcome,
    reason: input.reason as PrivateCapitalAccessReason,
    actorEmail: normalizePrivateCapitalEmail(input.actorEmail),
    route: sanitizeRoute(input.route),
    occurredAt,
  };
}

export function createPrivateCapitalAccessAuditRecord(
  input: Omit<PrivateCapitalAccessAuditInput, "occurredAt"> & { occurredAt?: Date | string },
): PrivateCapitalAccessAuditRecord {
  const record = sanitizePrivateCapitalAccessAuditRecord({
    ...input,
    occurredAt: input.occurredAt ?? new Date(),
  });
  if (!record) throw new TypeError("Invalid private-capital access audit event");
  return record;
}

function sanitizeRoute(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://private.local");
    if (url.origin !== "https://private.local") return "/";
    const pathname = url.pathname
      .replace(/[\u0000-\u001f\u007f]/gu, "")
      .slice(0, 256);
    return pathname.startsWith("/") ? pathname : "/";
  } catch {
    return "/";
  }
}

function sanitizeTimestamp(value: unknown): string | null {
  const date = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : null;
  if (!date || !Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
