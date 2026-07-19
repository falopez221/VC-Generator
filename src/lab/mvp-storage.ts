import { sanitizeText } from "./schema.ts";
import type { MvpApproval, MvpDraft, MvpRecord } from "./mvp.ts";

const MVP_RECORDS_KEY = "venture-governance-public-lab-mvp-records-v1";
const MAX_STORED_LENGTH = 1_000_000;
const MAX_RECORDS = 24;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

function browserStorage() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function isIsoDate(value: unknown) {
  return typeof value === "string" && value.length <= 80 && Number.isFinite(Date.parse(value));
}

function isApproval(value: unknown): value is MvpApproval {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MvpApproval>;
  return typeof item.id === "string" && item.id.length <= 180
    && typeof item.sourceRunId === "string" && item.sourceRunId.length > 0 && item.sourceRunId.length <= 180
    && typeof item.sourceOpportunityId === "string" && item.sourceOpportunityId.length > 0 && item.sourceOpportunityId.length <= 180
    && typeof item.reviewer === "string" && item.reviewer.trim().length >= 2 && item.reviewer.length <= 80
    && isIsoDate(item.approvedAt)
    && item.acknowledgement === "local-validation-only";
}

function isTextList(value: unknown, maximumItems: number, maximumLength: number) {
  return Array.isArray(value) && value.length <= maximumItems && value.every((item) => typeof item === "string" && item.length <= maximumLength);
}

function isDraft(value: unknown): value is MvpDraft {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MvpDraft>;
  const validHandoffs = Array.isArray(item.agentHandoffs) && item.agentHandoffs.length === 4 && item.agentHandoffs.every((handoff) => handoff && typeof handoff === "object" && typeof handoff.agentName === "string" && typeof handoff.receivesFrom === "string" && typeof handoff.passesTo === "string" && typeof handoff.contribution === "string" && typeof handoff.decisionUse === "string");
  const validScreens = Array.isArray(item.prototypeScreens) && item.prototypeScreens.length >= 1 && item.prototypeScreens.length <= 5 && item.prototypeScreens.every((screen) => screen && typeof screen === "object" && typeof screen.id === "string" && typeof screen.name === "string" && typeof screen.purpose === "string" && typeof screen.primaryAction === "string");
  return typeof item.id === "string" && item.id.length <= 180
    && typeof item.modelVersion === "string" && item.modelVersion.length <= 80
    && typeof item.sourceRunId === "string" && item.sourceRunId.length > 0 && item.sourceRunId.length <= 180
    && typeof item.sourceOpportunityId === "string" && item.sourceOpportunityId.length > 0 && item.sourceOpportunityId.length <= 180
    && typeof item.opportunityName === "string" && item.opportunityName.length > 0 && item.opportunityName.length <= 180
    && typeof item.targetCustomer === "string" && item.targetCustomer.length > 0 && item.targetCustomer.length <= 500
    && typeof item.objective === "string" && item.objective.length <= 800
    && typeof item.valueProposition === "string" && item.valueProposition.length <= 900
    && typeof item.successMetric === "string" && item.successMetric.length <= 600
    && typeof item.validationBudgetUsd === "number" && Number.isFinite(item.validationBudgetUsd) && item.validationBudgetUsd >= 0 && item.validationBudgetUsd <= 500_000
    && typeof item.validationWindowDays === "number" && Number.isInteger(item.validationWindowDays) && item.validationWindowDays >= 1 && item.validationWindowDays <= 90
    && isTextList(item.scope, 8, 600) && isTextList(item.outOfScope, 8, 600) && isTextList(item.assumptions, 8, 600) && isTextList(item.risksToTest, 8, 700) && isTextList(item.disclosures, 8, 700)
    && validHandoffs && validScreens;
}

export function hydrateMvpRecord(value: unknown, now = Date.now()): MvpRecord | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MvpRecord>;
  if (!isApproval(candidate.approval)) return null;
  const approvedAt = Date.parse(candidate.approval.approvedAt);
  if (approvedAt < now - MAX_AGE_MS || approvedAt > now + 5 * 60 * 1_000) return null;
  if (candidate.draft !== undefined && (!isDraft(candidate.draft) || candidate.draft.sourceRunId !== candidate.approval.sourceRunId || candidate.draft.sourceOpportunityId !== candidate.approval.sourceOpportunityId)) return null;
  if (candidate.generatedAt !== undefined && !isIsoDate(candidate.generatedAt)) return null;
  return {
    approval: {
      ...candidate.approval,
      reviewer: sanitizeText(candidate.approval.reviewer, "", 80),
      approvedAt: new Date(approvedAt).toISOString(),
    },
    ...(candidate.draft ? { draft: candidate.draft } : {}),
    ...(candidate.generatedAt ? { generatedAt: new Date(candidate.generatedAt).toISOString() } : {}),
  };
}

export function listMvpRecords() {
  const storage = browserStorage();
  if (!storage) return [] as MvpRecord[];
  try {
    const raw = storage.getItem(MVP_RECORDS_KEY) ?? "[]";
    if (raw.length > MAX_STORED_LENGTH) { storage.removeItem(MVP_RECORDS_KEY); return []; }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) { storage.removeItem(MVP_RECORDS_KEY); return []; }
    const records = parsed.slice(0, MAX_RECORDS).map((record) => hydrateMvpRecord(record)).filter((record): record is MvpRecord => record !== null);
    const normalized = JSON.stringify(records);
    if (normalized !== raw) storage.setItem(MVP_RECORDS_KEY, normalized);
    return records;
  } catch {
    try { storage.removeItem(MVP_RECORDS_KEY); } catch { /* Browser storage is unavailable. */ }
    return [];
  }
}

export function loadMvpRecord(sourceRunId: string, sourceOpportunityId: string) {
  return listMvpRecords().find((record) => record.approval.sourceRunId === sourceRunId && record.approval.sourceOpportunityId === sourceOpportunityId) ?? null;
}

export function saveMvpRecord(record: MvpRecord) {
  const storage = browserStorage();
  const safeRecord = hydrateMvpRecord(record);
  if (!storage || !safeRecord) return;
  const records = [safeRecord, ...listMvpRecords().filter((item) => item.approval.sourceRunId !== safeRecord.approval.sourceRunId || item.approval.sourceOpportunityId !== safeRecord.approval.sourceOpportunityId)].slice(0, MAX_RECORDS);
  const serialized = JSON.stringify(records);
  if (serialized.length > MAX_STORED_LENGTH) return;
  try { storage.setItem(MVP_RECORDS_KEY, serialized); } catch { /* The in-memory record remains available. */ }
}
