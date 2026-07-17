import type { LabRun, LabWeights, SimulationStatus } from "./types.ts";
import { DEFAULT_WEIGHTS } from "./data.ts";
import { normalizeLabWeights } from "./models.ts";
import { isOpportunity, validateLabInput } from "./schema.ts";

const RUNS_KEY = "venture-governance-public-lab-runs-v1";
const LAST_RUN_KEY = "venture-governance-public-lab-last-run";
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
  return typeof window === "undefined" ? null : window.localStorage;
}

function hydrateWeights(value: unknown): LabWeights {
  const candidate = value && typeof value === "object" ? value as Partial<LabWeights> : {};
  const agents = candidate.agents && typeof candidate.agents === "object"
    ? { ...DEFAULT_WEIGHTS.agents, ...candidate.agents }
    : DEFAULT_WEIGHTS.agents;
  const dimensions = candidate.dimensions && typeof candidate.dimensions === "object"
    ? { ...DEFAULT_WEIGHTS.dimensions, ...candidate.dimensions }
    : DEFAULT_WEIGHTS.dimensions;
  return normalizeLabWeights({
    agents,
    dimensions,
    riskAversion: Number.isFinite(candidate.riskAversion) ? candidate.riskAversion! : DEFAULT_WEIGHTS.riskAversion,
    innovationPreference: Number.isFinite(candidate.innovationPreference) ? candidate.innovationPreference! : DEFAULT_WEIGHTS.innovationPreference,
    evidenceThreshold: Number.isFinite(candidate.evidenceThreshold) ? candidate.evidenceThreshold! : DEFAULT_WEIGHTS.evidenceThreshold,
    uncertaintyTolerance: Number.isFinite(candidate.uncertaintyTolerance) ? candidate.uncertaintyTolerance! : DEFAULT_WEIGHTS.uncertaintyTolerance,
  });
}

function hydrateStoredRun(value: unknown): LabRun | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<LabRun>;
  const validatedInput = validateLabInput(candidate.input ?? {});
  if (!validatedInput.success
    || typeof candidate.id !== "string"
    || typeof candidate.createdAt !== "string"
    || !Number.isFinite(Date.parse(candidate.createdAt))
    || !Array.isArray(candidate.opportunities)
    || candidate.opportunities.length < 6
    || candidate.opportunities.length > 12
    || !candidate.opportunities.every(isOpportunity)) return null;

  return {
    id: candidate.id,
    modelVersion: typeof candidate.modelVersion === "string" ? candidate.modelVersion : "1.x-unversioned",
    createdAt: candidate.createdAt,
    input: validatedInput.data,
    status: candidate.status && SIMULATION_STATUSES.has(candidate.status) ? candidate.status : "Completed",
    weights: hydrateWeights(candidate.weights),
    opportunities: candidate.opportunities,
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.filter((item): item is string => typeof item === "string") : [],
    disclosures: Array.isArray(candidate.disclosures) ? candidate.disclosures.filter((item): item is string => typeof item === "string") : [],
  };
}

export function listRuns(): LabRun[] {
  const storage = browserStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RUNS_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.map(hydrateStoredRun).filter((run): run is LabRun => run !== null).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function saveRun(run: LabRun) {
  const storage = browserStorage();
  if (!storage) return;
  const runs = [run, ...listRuns().filter((candidate) => candidate.id !== run.id)].slice(0, 8);
  storage.setItem(RUNS_KEY, JSON.stringify(runs));
  storage.setItem(LAST_RUN_KEY, run.id);
}

export function loadRun(id: string) {
  return listRuns().find((run) => run.id === id) ?? null;
}

export function loadLastRun() {
  const storage = browserStorage();
  if (!storage) return null;
  const id = storage.getItem(LAST_RUN_KEY);
  return id ? loadRun(id) : listRuns()[0] ?? null;
}

export function clearRuns() {
  const storage = browserStorage();
  storage?.removeItem(RUNS_KEY);
  storage?.removeItem(LAST_RUN_KEY);
}

export function duplicateRun(run: LabRun) {
  const copy = { ...run, id: `${run.id}-copy-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), input: { ...run.input, analysisName: `${run.input.analysisName} (copy)` } };
  saveRun(copy);
  return copy;
}
