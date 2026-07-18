"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FeasibilityInput } from "@/src/platform/demo-feasibility";
import type { ScenarioInput } from "@/src/platform/demo-models";
import { purgeForeignPrivateSessionData } from "./session-storage";

export type MissionSource = "applications" | "mission-builder" | "simulation" | "scenarios" | "execution-feasibility";

export type MissionCore = {
  title: string;
  decision: string;
  owner: string;
  domain: string;
  horizon: string;
  constraints: string;
  evidence: string;
  capabilities: string[];
  risk: "standard" | "elevated" | "high-impact" | "critical";
  reviewer: string;
  gate: string;
  applicationSlugs: string[];
};

export type ScenarioPlan = {
  discountRatePercent: number;
  samples: number;
  seed: number;
  scenarios: ScenarioInput[];
  selectedAgentId?: string;
};

export type ActiveMission = {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  lastSource: MissionSource;
  core: MissionCore;
  scenarioPlan?: ScenarioPlan;
  feasibilityPlan?: FeasibilityInput;
};

type ActiveMissionValue = {
  mission: ActiveMission | null;
  ready: boolean;
  feasibilityStorageKey: string;
  clearSessionData: () => void;
  saveCore: (core: Partial<MissionCore>, source: MissionSource) => void;
  saveScenarioPlan: (plan: ScenarioPlan, source?: "simulation" | "scenarios" | "execution-feasibility") => void;
  saveFeasibilityPlan: (plan: FeasibilityInput) => void;
};

export const PRIVATE_STORAGE_TTL_MS = 8 * 60 * 60 * 1000;
export const PRIVATE_STORAGE_TTL_HOURS = PRIVATE_STORAGE_TTL_MS / 3_600_000;
const MAX_MISSION_STORAGE_LENGTH = 64_000;
const LEGACY_STORAGE_KEYS = ["vg-active-mission-v1", "vg-execution-feasibility-draft-v1", "vg-private-application-mission-draft"] as const;
const EMPTY_CORE: MissionCore = {
  title: "", decision: "", owner: "", domain: "", horizon: "1–3 years", constraints: "", evidence: "",
  capabilities: [], risk: "elevated", reviewer: "", gate: "Independent review required", applicationSlugs: [],
};

const ActiveMissionContext = createContext<ActiveMissionValue | null>(null);

const FEASIBILITY_DEFAULTS: FeasibilityInput = {
  proposalName: "Governed decision intelligence pilot",
  proposalSummary: "Deploy a controlled decision-intelligence workflow with governed data integrations, human approval gates and measurable pilot outcomes.",
  strategy: "hybrid",
  complexity: 68,
  dataReadiness: 52,
  internalCapacity: 58,
  regulatoryIntensity: 61,
  securityReadiness: 64,
  adoptionReadiness: 55,
  budgetReadiness: 72,
  users: 120,
  annualMissions: 24,
  annualSimulations: 720,
  annualAgentRuns: 2880,
  samples: 4000,
  seed: 240719,
};

function hashIdentity(identity: string) {
  const normalized = identity.trim().toLowerCase().slice(0, 320);
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function privateStorageKeys(identity: string) {
  const scope = hashIdentity(identity);
  return {
    mission: `vg-private-${scope}-active-mission-v1`,
    feasibility: `vg-private-${scope}-execution-feasibility-v1`,
  };
}

function text(value: unknown, max: number) {
  return typeof value === "string"
    ? value
      .slice(0, max * 4)
      .normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, max)
    : "";
}

function isoDate(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.length > 40) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function finite(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(finite(value, fallback, min, max));
}

export function normalizeFeasibilityInput(value: unknown, fallback: FeasibilityInput = FEASIBILITY_DEFAULTS): FeasibilityInput {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<FeasibilityInput> : {};
  const strategy = candidate.strategy === "internal" || candidate.strategy === "vendor" || candidate.strategy === "hybrid" ? candidate.strategy : fallback.strategy;
  return {
    proposalName: text(candidate.proposalName, 80) || text(fallback.proposalName, 80),
    proposalSummary: text(candidate.proposalSummary, 1200) || text(fallback.proposalSummary, 1200),
    strategy,
    complexity: integer(candidate.complexity, fallback.complexity, 0, 100),
    dataReadiness: integer(candidate.dataReadiness, fallback.dataReadiness, 0, 100),
    internalCapacity: integer(candidate.internalCapacity, fallback.internalCapacity, 0, 100),
    regulatoryIntensity: integer(candidate.regulatoryIntensity, fallback.regulatoryIntensity, 0, 100),
    securityReadiness: integer(candidate.securityReadiness, fallback.securityReadiness, 0, 100),
    adoptionReadiness: integer(candidate.adoptionReadiness, fallback.adoptionReadiness, 0, 100),
    budgetReadiness: integer(candidate.budgetReadiness, fallback.budgetReadiness, 0, 100),
    users: integer(candidate.users, fallback.users, 1, 1_000_000),
    annualMissions: integer(candidate.annualMissions, fallback.annualMissions, 1, 100_000),
    annualSimulations: integer(candidate.annualSimulations, fallback.annualSimulations, 1, 10_000_000),
    annualAgentRuns: integer(candidate.annualAgentRuns, fallback.annualAgentRuns, 1, 100_000_000),
    samples: integer(candidate.samples, fallback.samples, 500, 20_000),
    seed: integer(candidate.seed, fallback.seed, 1, 2_147_483_646),
  };
}

function sanitizeScenario(value: unknown, index: number): ScenarioInput | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<ScenarioInput>;
  return {
    id: text(item.id, 48) || `Scenario ${index + 1}`,
    likelihood: finite(item.likelihood, 0, 0, 1_000_000),
    annualRevenue: finite(item.annualRevenue, 0, 0, 1_000_000_000_000),
    grossMarginPercent: finite(item.grossMarginPercent, 0, 0, 100),
    annualOperatingCost: finite(item.annualOperatingCost, 0, 0, 1_000_000_000_000),
    initialCapital: finite(item.initialCapital, 0, 0, 1_000_000_000_000),
    horizonYears: finite(item.horizonYears, 1, 1, 50),
    uncertaintyPercent: finite(item.uncertaintyPercent, 0, 0, 95),
  };
}

function sanitizeCore(value: unknown): MissionCore {
  const core = value && typeof value === "object" ? value as Partial<MissionCore> : {};
  const risks = ["standard", "elevated", "high-impact", "critical"] as const;
  return {
    title: text(core.title, 120), decision: text(core.decision, 1200), owner: text(core.owner, 120), domain: text(core.domain, 180),
    horizon: text(core.horizon, 40) || EMPTY_CORE.horizon, constraints: text(core.constraints, 900), evidence: text(core.evidence, 900),
    capabilities: Array.isArray(core.capabilities) ? core.capabilities.slice(0, 24).map((item) => text(item, 120)).filter(Boolean) : [],
    risk: risks.includes(core.risk as typeof risks[number]) ? core.risk as MissionCore["risk"] : "elevated",
    reviewer: text(core.reviewer, 120), gate: text(core.gate, 120) || EMPTY_CORE.gate,
    applicationSlugs: Array.isArray(core.applicationSlugs) ? core.applicationSlugs.slice(0, 12).map((item) => text(item, 100)).filter(Boolean) : [],
  };
}

function sanitizeMission(value: unknown): ActiveMission | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ActiveMission>;
  if (candidate.version !== 1 || typeof candidate.id !== "string" || !candidate.core || typeof candidate.core !== "object" || Array.isArray(candidate.core)) return null;
  const sources: MissionSource[] = ["applications", "mission-builder", "simulation", "scenarios", "execution-feasibility"];
  const scenarioCandidate = candidate.scenarioPlan;
  const scenarios = Array.isArray(scenarioCandidate?.scenarios)
    ? scenarioCandidate.scenarios.slice(0, 12).map(sanitizeScenario).filter((item): item is ScenarioInput => Boolean(item))
    : [];
  const now = new Date().toISOString();
  return {
    version: 1,
    id: text(candidate.id, 80) || `MIS-LOCAL-${Date.now()}`,
    createdAt: isoDate(candidate.createdAt, now),
    updatedAt: isoDate(candidate.updatedAt, now),
    lastSource: sources.includes(candidate.lastSource as MissionSource) ? candidate.lastSource as MissionSource : "mission-builder",
    core: sanitizeCore(candidate.core),
    scenarioPlan: scenarioCandidate && scenarios?.length ? {
      discountRatePercent: finite(scenarioCandidate.discountRatePercent, 12, 0, 100),
      samples: integer(scenarioCandidate.samples, 2_000, 100, 20_000),
      seed: integer(scenarioCandidate.seed, 240_719, 1, 2_147_483_646),
      scenarios,
      selectedAgentId: text(scenarioCandidate.selectedAgentId, 80) || undefined,
    } : undefined,
    feasibilityPlan: candidate.feasibilityPlan && typeof candidate.feasibilityPlan === "object" && !Array.isArray(candidate.feasibilityPlan)
      ? normalizeFeasibilityInput(candidate.feasibilityPlan)
      : undefined,
  };
}

function createMission(core: Partial<MissionCore>, source: MissionSource): ActiveMission {
  const now = new Date().toISOString();
  return { version: 1, id: `MIS-LOCAL-${Date.now()}`, createdAt: now, updatedAt: now, lastSource: source, core: sanitizeCore({ ...EMPTY_CORE, ...core }) };
}

export function ActiveMissionProvider({ identity, children }: { identity: string; children: React.ReactNode }) {
  const [mission, setMission] = useState<ActiveMission | null>(null);
  const missionRef = useRef<ActiveMission | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const storageKeys = useMemo(() => privateStorageKeys(identity), [identity]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        for (const key of [...LEGACY_STORAGE_KEYS, storageKeys.mission, storageKeys.feasibility]) window.localStorage.removeItem(key);
      } catch { /* Legacy local storage may be unavailable. */ }
      try {
        purgeForeignPrivateSessionData(window.sessionStorage, storageKeys);
        const stored = window.sessionStorage.getItem(storageKeys.mission);
        if (stored) {
          if (stored.length > MAX_MISSION_STORAGE_LENGTH) {
            window.sessionStorage.removeItem(storageKeys.mission);
          } else {
            const envelope = JSON.parse(stored) as { version?: unknown; expiresAt?: unknown; mission?: unknown };
            const expiresAt = typeof envelope.expiresAt === "number" ? envelope.expiresAt : Number.NaN;
            const validExpiry = envelope.version === 1 && Number.isFinite(expiresAt) && expiresAt > Date.now() && expiresAt <= Date.now() + PRIVATE_STORAGE_TTL_MS;
            const restored = validExpiry ? sanitizeMission(envelope.mission) : null;
            if (restored) { missionRef.current = restored; setMission(restored); }
            else window.sessionStorage.removeItem(storageKeys.mission);
          }
        }
      } catch {
        try { window.sessionStorage.removeItem(storageKeys.mission); } catch { /* Storage may be unavailable. */ }
      }
      setReady(true);
    });
    return () => { active = false; };
  }, [storageKeys]);

  function commit(next: ActiveMission) {
    const sanitized = sanitizeMission(next);
    if (!sanitized) return;
    missionRef.current = sanitized;
    setMission(sanitized);
    try {
      window.sessionStorage.setItem(storageKeys.mission, JSON.stringify({ version: 1, expiresAt: Date.now() + PRIVATE_STORAGE_TTL_MS, mission: sanitized }));
    } catch { /* In-memory state remains usable when browser storage is unavailable. */ }
  }

  function clearSessionData() {
    missionRef.current = null;
    setMission(null);
    setSessionRevision((value) => value + 1);
    try {
      window.sessionStorage.removeItem(storageKeys.mission);
      window.sessionStorage.removeItem(storageKeys.feasibility);
    } catch { /* Clearing in-memory state still protects this browser view. */ }
    try {
      for (const key of [...LEGACY_STORAGE_KEYS, storageKeys.mission, storageKeys.feasibility]) window.localStorage.removeItem(key);
    } catch { /* Legacy local storage may be unavailable. */ }
  }

  const value: ActiveMissionValue = {
    mission,
    ready,
    feasibilityStorageKey: storageKeys.feasibility,
    clearSessionData,
    saveCore(core, source) {
      const current = missionRef.current ?? createMission(core, source);
      commit({ ...current, updatedAt: new Date().toISOString(), lastSource: source, core: sanitizeCore({ ...current.core, ...core }) });
    },
    saveScenarioPlan(plan, source = "simulation") {
      const current = missionRef.current ?? createMission({}, source);
      commit({ ...current, updatedAt: new Date().toISOString(), lastSource: source, scenarioPlan: plan });
    },
    saveFeasibilityPlan(plan) {
      const normalized = normalizeFeasibilityInput(plan);
      const current = missionRef.current ?? createMission({ title: normalized.proposalName, decision: normalized.proposalSummary }, "execution-feasibility");
      const scenarioPlan = current.scenarioPlan ? { ...current.scenarioPlan, samples: normalized.samples, seed: normalized.seed } : undefined;
      commit({ ...current, updatedAt: new Date().toISOString(), lastSource: "execution-feasibility", feasibilityPlan: normalized, scenarioPlan });
    },
  };

  return <ActiveMissionContext.Provider value={value}><Fragment key={sessionRevision}>{children}</Fragment></ActiveMissionContext.Provider>;
}

export function useActiveMission() {
  const context = useContext(ActiveMissionContext);
  if (!context) throw new Error("useActiveMission must be used inside ActiveMissionProvider");
  return context;
}
