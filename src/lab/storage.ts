import type { LabRun } from "./types.ts";

const RUNS_KEY = "venture-governance-public-lab-runs-v1";
const LAST_RUN_KEY = "venture-governance-public-lab-last-run";

function browserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function listRuns(): LabRun[] {
  const storage = browserStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(RUNS_KEY) ?? "[]") as LabRun[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
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

