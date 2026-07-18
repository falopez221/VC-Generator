import { REVIEW_STATES, type ReviewAuditEntry, type ReviewOpportunity } from "./types";

const REVIEW_KEY = "venture-governance-human-review-v1";
const MAX_RECORDS = 80;
const MAX_LENGTH = 1_500_000;

function storage() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function isAuditEntry(value: unknown): value is ReviewAuditEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReviewAuditEntry>;
  return typeof item.id === "string" && typeof item.timestamp === "string" && typeof item.responsible === "string"
    && typeof item.comment === "string" && typeof item.justification === "string" && typeof item.opportunityVersion === "string"
    && REVIEW_STATES.includes(item.previousState as (typeof REVIEW_STATES)[number])
    && REVIEW_STATES.includes(item.newState as (typeof REVIEW_STATES)[number]);
}

export function loadReviewRecords(): ReviewOpportunity[] {
  const target = storage();
  if (!target) return [];
  try {
    const raw = target.getItem(REVIEW_KEY);
    if (!raw || raw.length > MAX_LENGTH) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECORDS).filter((item): item is ReviewOpportunity => {
      if (!item || typeof item !== "object") return false;
      const record = item as Partial<ReviewOpportunity>;
      return typeof record.id === "string" && typeof record.name === "string" && Array.isArray(record.audit)
        && record.audit.every(isAuditEntry) && REVIEW_STATES.includes(record.state as (typeof REVIEW_STATES)[number]);
    });
  } catch { return []; }
}

export function saveReviewRecords(records: ReviewOpportunity[]) {
  const target = storage();
  if (!target) return;
  try {
    const serialized = JSON.stringify(records.slice(0, MAX_RECORDS));
    if (serialized.length <= MAX_LENGTH) target.setItem(REVIEW_KEY, serialized);
  } catch { /* The current review remains available in memory. */ }
}

export function mergeReviewRecords(source: ReviewOpportunity[], stored: ReviewOpportunity[]) {
  const storedById = new Map(stored.map((record) => [record.id, record]));
  return source.map((record) => {
    const prior = storedById.get(record.id);
    if (!prior) return record;
    return { ...record, state: prior.state, owner: prior.owner, tags: prior.tags, priority: prior.priority, nextReview: prior.nextReview, audit: prior.audit };
  });
}
