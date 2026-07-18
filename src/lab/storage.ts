import type { LabRun, LabWeights, SimulationStatus } from "./types.ts";
import { AGENT_NAMES, DIMENSION_KEYS } from "./types.ts";
import { DEFAULT_WEIGHTS, OBJECTIVES } from "./data.ts";
import { normalizeLabWeights } from "./models.ts";
import { isOpportunity, normalizePublicWebResearch, sanitizeText, validateLabInput } from "./schema.ts";

const RUNS_KEY = "venture-governance-public-lab-runs-v1";
const LAST_RUN_KEY = "venture-governance-public-lab-last-run";
const MAX_STORED_RUNS_LENGTH = 2_500_000;
const PUBLIC_RUN_TTL_MS = 30 * 24 * 60 * 60 * 1_000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const SIMULATION_STATUSES = new Set<SimulationStatus>([
  "Ready",
  "Running",
  "Paused",
  "Completed",
  "Insufficient Evidence",
  "Invalid Configuration",
  "Simulation Failed",
]);

function browserStorage() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function hydrateWeights(value: unknown): LabWeights {
  const candidate = value && typeof value === "object" ? value as Partial<LabWeights> : {};
  const storedAgents = candidate.agents && typeof candidate.agents === "object" ? candidate.agents : {} as Partial<LabWeights["agents"]>;
  const storedDimensions = candidate.dimensions && typeof candidate.dimensions === "object" ? candidate.dimensions : {} as Partial<LabWeights["dimensions"]>;
  const agents = Object.fromEntries(AGENT_NAMES.map((name) => [name, Number.isFinite(storedAgents[name]) ? storedAgents[name] : DEFAULT_WEIGHTS.agents[name]])) as LabWeights["agents"];
  const dimensions = Object.fromEntries(DIMENSION_KEYS.map((name) => [name, Number.isFinite(storedDimensions[name]) ? storedDimensions[name] : DEFAULT_WEIGHTS.dimensions[name]])) as LabWeights["dimensions"];
  return normalizeLabWeights({
    agents,
    dimensions,
    riskAversion: Number.isFinite(candidate.riskAversion) ? candidate.riskAversion! : DEFAULT_WEIGHTS.riskAversion,
    innovationPreference: Number.isFinite(candidate.innovationPreference) ? candidate.innovationPreference! : DEFAULT_WEIGHTS.innovationPreference,
    evidenceThreshold: Number.isFinite(candidate.evidenceThreshold) ? candidate.evidenceThreshold! : DEFAULT_WEIGHTS.evidenceThreshold,
    uncertaintyTolerance: Number.isFinite(candidate.uncertaintyTolerance) ? candidate.uncertaintyTolerance! : DEFAULT_WEIGHTS.uncertaintyTolerance,
  });
}

function isStoredInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const textBounds: Record<string, number> = {
    ideaNarrative: 4_000, ideaSummary: 900, analysisName: 120, problem: 600, thesis: 600, industry: 120,
    market: 120, technology: 120, region: 80, customerType: 120, knownSignals: 600, availableEvidence: 600,
  };
  if (!Object.entries(textBounds).every(([key, maximum]) => typeof candidate[key] === "string" && (candidate[key] as string).length <= maximum)) return false;
  return typeof candidate.horizonYears === "number" && Number.isInteger(candidate.horizonYears) && candidate.horizonYears >= 1 && candidate.horizonYears <= 15
    && typeof candidate.estimatedCapital === "number" && Number.isFinite(candidate.estimatedCapital) && candidate.estimatedCapital >= 25_000 && candidate.estimatedCapital <= 50_000_000
    && typeof candidate.riskTolerance === "number" && Number.isFinite(candidate.riskTolerance) && candidate.riskTolerance >= 0 && candidate.riskTolerance <= 100
    && typeof candidate.innovationLevel === "number" && Number.isFinite(candidate.innovationLevel) && candidate.innovationLevel >= 0 && candidate.innovationLevel <= 100
    && typeof candidate.opportunityCount === "number" && Number.isInteger(candidate.opportunityCount) && candidate.opportunityCount >= 6 && candidate.opportunityCount <= 12
    && typeof candidate.seed === "number" && Number.isInteger(candidate.seed) && candidate.seed >= 1 && candidate.seed <= 2_147_483_646
    && typeof candidate.objective === "string" && OBJECTIVES.includes(candidate.objective as (typeof OBJECTIVES)[number]);
}

export function hydrateStoredRun(value: unknown, now = Date.now()): LabRun | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<LabRun>;
  if (!isStoredInput(candidate.input)) return null;
  const validatedInput = validateLabInput(candidate.input ?? {});
  const createdAtMs = typeof candidate.createdAt === "string" ? Date.parse(candidate.createdAt) : Number.NaN;
  if (!validatedInput.success
    || typeof candidate.id !== "string"
    || !/^[A-Za-z0-9._-]{1,180}$/.test(candidate.id)
    || typeof candidate.createdAt !== "string"
    || !Number.isFinite(createdAtMs)
    || createdAtMs < now - PUBLIC_RUN_TTL_MS
    || createdAtMs > now + MAX_FUTURE_CLOCK_SKEW_MS
    || !Array.isArray(candidate.opportunities)
    || candidate.opportunities.length < 6
    || candidate.opportunities.length > 12
    || candidate.opportunities.length !== validatedInput.data.opportunityCount
    || !candidate.opportunities.every(isOpportunity)
    || new Set(candidate.opportunities.map((opportunity) => opportunity.id)).size !== candidate.opportunities.length
    || new Set(candidate.opportunities.map((opportunity) => opportunity.rank)).size !== candidate.opportunities.length) return null;

  const normalizedResearch = candidate.webResearch === undefined ? undefined : normalizePublicWebResearch(candidate.webResearch);
  if (candidate.webResearch !== undefined && !normalizedResearch) return null;

  return {
    id: candidate.id,
    modelVersion: typeof candidate.modelVersion === "string" ? sanitizeText(candidate.modelVersion, "1.x-unversioned", 80) : "1.x-unversioned",
    createdAt: candidate.createdAt,
    input: validatedInput.data,
    status: candidate.status && SIMULATION_STATUSES.has(candidate.status) ? candidate.status : "Completed",
    weights: hydrateWeights(candidate.weights),
    opportunities: candidate.opportunities,
    webResearch: normalizedResearch,
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.slice(0, 12).map((item) => sanitizeText(item, "", 500)).filter(Boolean) : [],
    disclosures: Array.isArray(candidate.disclosures) ? candidate.disclosures.slice(0, 12).map((item) => sanitizeText(item, "", 700)).filter(Boolean) : [],
  };
}

export function listRuns(): LabRun[] {
  const storage = browserStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(RUNS_KEY) ?? "[]";
    if (raw.length > MAX_STORED_RUNS_LENGTH) {
      storage.removeItem(RUNS_KEY);
      storage.removeItem(LAST_RUN_KEY);
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      storage.removeItem(RUNS_KEY);
      storage.removeItem(LAST_RUN_KEY);
      return [];
    }
    const runs = parsed.slice(0, 8).map((value) => hydrateStoredRun(value)).filter((run): run is LabRun => run !== null);
    if (runs.length === 0) {
      storage.removeItem(RUNS_KEY);
      storage.removeItem(LAST_RUN_KEY);
      return [];
    }
    const sanitized = JSON.stringify(runs);
    if (sanitized !== raw) storage.setItem(RUNS_KEY, sanitized);
    const lastId = storage.getItem(LAST_RUN_KEY);
    if (!lastId || !runs.some((run) => run.id === lastId)) storage.setItem(LAST_RUN_KEY, runs[0].id);
    return runs;
  } catch {
    try { storage.removeItem(RUNS_KEY); storage.removeItem(LAST_RUN_KEY); } catch { /* Storage may be unavailable. */ }
    return [];
  }
}

export function saveRun(run: LabRun) {
  const storage = browserStorage();
  if (!storage) return;
  const safeRun = hydrateStoredRun(run);
  if (!safeRun) return;
  const runs = [safeRun, ...listRuns().filter((candidate) => candidate.id !== safeRun.id)].slice(0, 8);
  const serialized = JSON.stringify(runs);
  if (serialized.length > MAX_STORED_RUNS_LENGTH) return;
  try {
    storage.setItem(RUNS_KEY, serialized);
    storage.setItem(LAST_RUN_KEY, safeRun.id);
  } catch { /* The current run remains available in memory. */ }
}

export function loadRun(id: string) {
  return listRuns().find((run) => run.id === id) ?? null;
}

export function loadLastRun() {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const id = storage.getItem(LAST_RUN_KEY);
    return id && id.length <= 180 ? loadRun(id) : listRuns()[0] ?? null;
  } catch { return null; }
}

export function clearRuns() {
  const storage = browserStorage();
  try {
    storage?.removeItem(RUNS_KEY);
    storage?.removeItem(LAST_RUN_KEY);
  } catch { /* Storage may be unavailable. */ }
}

export function duplicateRun(run: LabRun) {
  const copy = { ...run, id: `${run.id}-copy-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), input: { ...run.input, analysisName: `${run.input.analysisName} (copy)` } };
  saveRun(copy);
  return copy;
}
