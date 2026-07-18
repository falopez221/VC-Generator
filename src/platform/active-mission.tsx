"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FeasibilityInput } from "@/src/private/feasibility";
import type { ScenarioInput } from "@/src/private/models";

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
  saveCore: (core: Partial<MissionCore>, source: MissionSource) => void;
  saveScenarioPlan: (plan: ScenarioPlan, source?: "simulation" | "scenarios" | "execution-feasibility") => void;
  saveFeasibilityPlan: (plan: FeasibilityInput) => void;
};

const STORAGE_KEY = "vg-active-mission-v1";
const EMPTY_CORE: MissionCore = {
  title: "", decision: "", owner: "", domain: "", horizon: "1–3 years", constraints: "", evidence: "",
  capabilities: [], risk: "elevated", reviewer: "", gate: "Independent review required", applicationSlugs: [],
};

const ActiveMissionContext = createContext<ActiveMissionValue | null>(null);

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function finite(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
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
    capabilities: Array.isArray(core.capabilities) ? core.capabilities.map((item) => text(item, 120)).filter(Boolean).slice(0, 24) : [],
    risk: risks.includes(core.risk as typeof risks[number]) ? core.risk as MissionCore["risk"] : "elevated",
    reviewer: text(core.reviewer, 120), gate: text(core.gate, 120) || EMPTY_CORE.gate,
    applicationSlugs: Array.isArray(core.applicationSlugs) ? core.applicationSlugs.map((item) => text(item, 100)).filter(Boolean).slice(0, 12) : [],
  };
}

function sanitizeMission(value: unknown): ActiveMission | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ActiveMission>;
  const sources: MissionSource[] = ["applications", "mission-builder", "simulation", "scenarios", "execution-feasibility"];
  const scenarioCandidate = candidate.scenarioPlan;
  const scenarios = scenarioCandidate?.scenarios?.map(sanitizeScenario).filter((item): item is ScenarioInput => Boolean(item)).slice(0, 12);
  const now = new Date().toISOString();
  return {
    version: 1,
    id: text(candidate.id, 80) || `MIS-LOCAL-${Date.now()}`,
    createdAt: text(candidate.createdAt, 40) || now,
    updatedAt: text(candidate.updatedAt, 40) || now,
    lastSource: sources.includes(candidate.lastSource as MissionSource) ? candidate.lastSource as MissionSource : "mission-builder",
    core: sanitizeCore(candidate.core),
    scenarioPlan: scenarioCandidate && scenarios?.length ? {
      discountRatePercent: finite(scenarioCandidate.discountRatePercent, 12, 0, 100),
      samples: finite(scenarioCandidate.samples, 2_000, 100, 20_000),
      seed: finite(scenarioCandidate.seed, 240_719, 1, 2_147_483_646),
      scenarios,
      selectedAgentId: text(scenarioCandidate.selectedAgentId, 80) || undefined,
    } : undefined,
    feasibilityPlan: candidate.feasibilityPlan,
  };
}

function createMission(core: Partial<MissionCore>, source: MissionSource): ActiveMission {
  const now = new Date().toISOString();
  return { version: 1, id: `MIS-LOCAL-${Date.now()}`, createdAt: now, updatedAt: now, lastSource: source, core: sanitizeCore({ ...EMPTY_CORE, ...core }) };
}

export function ActiveMissionProvider({ children }: { children: React.ReactNode }) {
  const [mission, setMission] = useState<ActiveMission | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setMission(sanitizeMission(JSON.parse(stored))); }
      catch { window.localStorage.removeItem(STORAGE_KEY); }
    }
    setReady(true);
  }, []);

  function commit(next: ActiveMission) {
    const sanitized = sanitizeMission(next) ?? next;
    setMission(sanitized);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  }

  const value = useMemo<ActiveMissionValue>(() => ({
    mission,
    ready,
    saveCore(core, source) {
      const current = mission ?? createMission(core, source);
      commit({ ...current, updatedAt: new Date().toISOString(), lastSource: source, core: sanitizeCore({ ...current.core, ...core }) });
    },
    saveScenarioPlan(plan, source = "simulation") {
      const current = mission ?? createMission({}, source);
      commit({ ...current, updatedAt: new Date().toISOString(), lastSource: source, scenarioPlan: plan });
    },
    saveFeasibilityPlan(plan) {
      const current = mission ?? createMission({ title: plan.proposalName, decision: plan.proposalSummary }, "execution-feasibility");
      const scenarioPlan = current.scenarioPlan ? { ...current.scenarioPlan, samples: plan.samples, seed: plan.seed } : undefined;
      commit({ ...current, updatedAt: new Date().toISOString(), lastSource: "execution-feasibility", feasibilityPlan: plan, scenarioPlan });
    },
  }), [mission, ready]);

  return <ActiveMissionContext.Provider value={value}>{children}</ActiveMissionContext.Provider>;
}

export function useActiveMission() {
  const context = useContext(ActiveMissionContext);
  if (!context) throw new Error("useActiveMission must be used inside ActiveMissionProvider");
  return context;
}

