import { REVIEW_DECISIONS, REVIEW_STATES, type ReviewAuditEntry, type ReviewOpportunity, type ReviewPriority } from "./types";

const REVIEW_KEY = "venture-governance-human-review-v1";
const MAX_RECORDS = 80;
const MAX_LENGTH = 1_500_000;
const REVIEW_PRIORITIES = new Set<ReviewPriority>(["Low", "Medium", "High", "Critical"]);

function storage() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function isAuditEntry(value: unknown): value is ReviewAuditEntry {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReviewAuditEntry>;
  return typeof item.id === "string" && typeof item.timestamp === "string" && typeof item.responsible === "string"
    && typeof item.comment === "string" && typeof item.justification === "string" && typeof item.opportunityVersion === "string"
    && REVIEW_DECISIONS.includes(item.decision as (typeof REVIEW_DECISIONS)[number])
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
        && record.id.length <= 360 && record.name.length <= 180
        && typeof record.owner === "string" && record.owner.length <= 120
        && typeof record.nextReview === "string" && record.nextReview.length <= 20
        && Array.isArray(record.tags) && record.tags.length <= 8 && record.tags.every((tag) => typeof tag === "string" && tag.length <= 40)
        && REVIEW_PRIORITIES.has(record.priority as ReviewPriority)
        && record.audit.length <= 100 && record.audit.every(isAuditEntry)
        && REVIEW_STATES.includes(record.state as (typeof REVIEW_STATES)[number]);
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
