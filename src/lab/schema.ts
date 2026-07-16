import { AGENT_NAMES, DIMENSION_KEYS, type AgentResult, type LabInput, type Objective, type Opportunity } from "./types.ts";
import { OBJECTIVES } from "./data.ts";
import { clamp } from "./random.ts";

const MAX_TEXT = 900;

export function sanitizeText(value: unknown, fallback = "") {
  return String(value ?? fallback)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT);
}

export function validateLabInput(value: Partial<LabInput>) {
  const errors: string[] = [];
  const objective = OBJECTIVES.includes(value.objective as Objective) ? value.objective as Objective : OBJECTIVES[0];
  const data: LabInput = {
    analysisName: sanitizeText(value.analysisName, "Untitled public Lab analysis").slice(0, 120),
    problem: sanitizeText(value.problem).slice(0, 600),
    thesis: sanitizeText(value.thesis).slice(0, 600),
    industry: sanitizeText(value.industry, "Cross-industry").slice(0, 120),
    market: sanitizeText(value.market, "Exploratory market").slice(0, 120),
    technology: sanitizeText(value.technology, "Technology-neutral").slice(0, 120),
    region: sanitizeText(value.region, "Global").slice(0, 80),
    horizonYears: Math.round(clamp(Number(value.horizonYears ?? 5), 1, 15)),
    customerType: sanitizeText(value.customerType, "B2B customers").slice(0, 120),
    estimatedCapital: Math.round(clamp(Number(value.estimatedCapital ?? 1000000), 25000, 50000000)),
    riskTolerance: Math.round(clamp(Number(value.riskTolerance ?? 50))),
    innovationLevel: Math.round(clamp(Number(value.innovationLevel ?? 50))),
    knownSignals: sanitizeText(value.knownSignals).slice(0, 600),
    availableEvidence: sanitizeText(value.availableEvidence).slice(0, 600),
    objective,
    opportunityCount: Math.round(clamp(Number(value.opportunityCount ?? 8), 6, 12)),
    seed: Math.round(clamp(Number(value.seed ?? 1), 1, 2147483646)),
  };
  if (data.problem.length < 12) errors.push("Describe the problem with at least 12 characters.");
  if (data.thesis.length < 12) errors.push("Describe the thesis with at least 12 characters.");
  return { success: errors.length === 0, data, errors };
}

export function isAgentResult(value: unknown): value is AgentResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as AgentResult;
  return AGENT_NAMES.includes(candidate.agentName)
    && Number.isFinite(candidate.score)
    && Number.isFinite(candidate.confidence)
    && Number.isFinite(candidate.evidenceQuality)
    && Array.isArray(candidate.findings)
    && Array.isArray(candidate.risks)
    && Array.isArray(candidate.assumptions)
    && Array.isArray(candidate.missingEvidence)
    && Array.isArray(candidate.uncertainties)
    && typeof candidate.recommendation === "string"
    && typeof candidate.criticism === "string";
}

export function isOpportunity(value: unknown): value is Opportunity {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Opportunity;
  return typeof candidate.id === "string"
    && typeof candidate.name === "string"
    && Number.isFinite(candidate.totalScore)
    && DIMENSION_KEYS.every((key) => Number.isFinite(candidate.dimensions?.[key]))
    && AGENT_NAMES.every((name) => isAgentResult(candidate.agents?.[name]));
}

