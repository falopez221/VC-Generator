import { AGENT_NAMES, DIMENSION_KEYS, type AgentResult, type LabInput, type Objective, type Opportunity, type PublicWebResearch, type PublicWebSource } from "./types.ts";
import { OBJECTIVES } from "./data.ts";
import { clamp } from "./random.ts";

const MAX_TEXT = 900;
const OPPORTUNITY_CATEGORIES = new Set(["Insufficient Evidence", "Weak", "Uncertain", "Promising", "Highly Promising", "Priority for Human Review"]);
const HUMAN_DECISIONS = new Set(["Pending", "Saved", "Promising", "Uncertain", "Rejected", "More evidence"]);

export function sanitizeText(value: unknown, fallback = "", maxLength = MAX_TEXT) {
  const raw = String(value ?? fallback).slice(0, Math.max(maxLength * 4, maxLength + 256));
  return raw
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateLabInput(value: Partial<LabInput> | unknown) {
  const errors: string[] = [];
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? value as Partial<LabInput> : {};
  const objective = OBJECTIVES.includes(candidate.objective as Objective) ? candidate.objective as Objective : OBJECTIVES[0];
  const data: LabInput = {
    ideaNarrative: sanitizeText(candidate.ideaNarrative, "", 4000),
    ideaSummary: sanitizeText(candidate.ideaSummary).slice(0, 900),
    analysisName: sanitizeText(candidate.analysisName, "Untitled public Lab analysis").slice(0, 120),
    problem: sanitizeText(candidate.problem).slice(0, 600),
    thesis: sanitizeText(candidate.thesis).slice(0, 600),
    industry: sanitizeText(candidate.industry, "Cross-industry").slice(0, 120),
    market: sanitizeText(candidate.market, "Exploratory market").slice(0, 120),
    technology: sanitizeText(candidate.technology, "Technology-neutral").slice(0, 120),
    region: sanitizeText(candidate.region, "Global").slice(0, 80),
    horizonYears: Math.round(clamp(Number(candidate.horizonYears ?? 5), 1, 15)),
    customerType: sanitizeText(candidate.customerType, "B2B customers").slice(0, 120),
    estimatedCapital: Math.round(clamp(Number(candidate.estimatedCapital ?? 1000000), 25000, 50000000)),
    riskTolerance: Math.round(clamp(Number(candidate.riskTolerance ?? 50))),
    innovationLevel: Math.round(clamp(Number(candidate.innovationLevel ?? 50))),
    knownSignals: sanitizeText(candidate.knownSignals).slice(0, 600),
    availableEvidence: sanitizeText(candidate.availableEvidence).slice(0, 600),
    objective,
    opportunityCount: Math.round(clamp(Number(candidate.opportunityCount ?? 8), 6, 12)),
    seed: Math.round(clamp(Number(candidate.seed ?? 1), 1, 2147483646)),
  };
  if (data.problem.length < 12) errors.push("Describe the problem with at least 12 characters.");
  if (data.thesis.length < 12) errors.push("Describe the thesis with at least 12 characters.");
  return { success: errors.length === 0, data, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedNumber(value: unknown, minimum = 0, maximum = 100) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isBoundedText(value: unknown, maximum: number, allowEmpty = true) {
  return typeof value === "string" && value.length <= maximum && (allowEmpty || value.trim().length > 0);
}

function isBoundedTextArray(value: unknown, maximumItems: number, maximumText: number) {
  return Array.isArray(value) && value.length <= maximumItems && value.every((item) => isBoundedText(item, maximumText));
}

export function isAgentResult(value: unknown): value is AgentResult {
  if (!isRecord(value)) return false;
  const candidate = value as unknown as AgentResult;
  return AGENT_NAMES.includes(candidate.agentName)
    && isBoundedText(candidate.domain, 180, false)
    && isBoundedNumber(candidate.score)
    && isBoundedNumber(candidate.confidence)
    && isBoundedNumber(candidate.evidenceQuality)
    && isBoundedTextArray(candidate.findings, 12, 1_000)
    && isBoundedTextArray(candidate.risks, 12, 600)
    && isBoundedTextArray(candidate.assumptions, 12, 600)
    && isBoundedTextArray(candidate.missingEvidence, 12, 600)
    && isBoundedTextArray(candidate.uncertainties, 12, 300)
    && isBoundedText(candidate.recommendation, 900)
    && isBoundedText(candidate.criticism, 900)
    && (candidate.status === "Completed" || candidate.status === "Warning");
}

function isRiskItem(value: unknown) {
  if (!isRecord(value)) return false;
  return isBoundedText(value.name, 180, false)
    && isBoundedNumber(value.probability)
    && isBoundedNumber(value.impact)
    && isBoundedNumber(value.uncertainty)
    && isBoundedText(value.mitigation, 600)
    && isBoundedText(value.evidence, 600);
}

export function isOpportunity(value: unknown): value is Opportunity {
  if (!isRecord(value)) return false;
  const candidate = value as unknown as Opportunity;
  const dimensions = candidate.dimensions;
  const agents = candidate.agents;
  const scalarTextIsValid = [
    [candidate.id, 80, false], [candidate.name, 180, false], [candidate.problem, 1_600, false],
    [candidate.proposedSolution, 1_200, false], [candidate.targetCustomer, 500, false], [candidate.businessModel, 300, false],
    [candidate.industry, 180, false], [candidate.technology, 180, false], [candidate.region, 120, false],
  ].every(([textValue, maximum, allowEmpty]) => isBoundedText(textValue, maximum as number, allowEmpty as boolean));
  return scalarTextIsValid
    && isBoundedNumber(candidate.novelty)
    && isBoundedNumber(candidate.estimatedCapital, 25_000, 50_000_000)
    && isBoundedTextArray(candidate.criticalHypotheses, 20, 800)
    && isBoundedTextArray(candidate.availableEvidence, 64, 1_000)
    && Array.isArray(candidate.risks)
    && candidate.risks.length <= 16
    && candidate.risks.every(isRiskItem)
    && isRecord(dimensions)
    && Object.keys(dimensions).length === DIMENSION_KEYS.length
    && DIMENSION_KEYS.every((key) => isBoundedNumber(dimensions[key]))
    && isRecord(agents)
    && Object.keys(agents).length === AGENT_NAMES.length
    && AGENT_NAMES.every((name) => isAgentResult(agents[name]) && agents[name].agentName === name)
    && isBoundedNumber(candidate.totalScore)
    && isBoundedNumber(candidate.confidence)
    && isBoundedNumber(candidate.uncertainty)
    && isBoundedNumber(candidate.disagreement)
    && OPPORTUNITY_CATEGORIES.has(candidate.category)
    && HUMAN_DECISIONS.has(candidate.humanDecision)
    && Number.isInteger(candidate.rank) && candidate.rank >= 1 && candidate.rank <= 12
    && Number.isInteger(candidate.previousRank) && candidate.previousRank >= 1 && candidate.previousRank <= 12;
}

function sanitizePlainText(value: unknown, fallback: string, maxLength: number) {
  const withoutMarkup = String(value ?? "").slice(0, Math.max(maxLength * 8, maxLength + 512))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  return sanitizeText(withoutMarkup, fallback, maxLength);
}

function isSafeExternalResultUrl(url: URL) {
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  const hostname = url.hostname.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.startsWith("[")) return false;
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
  if (!ipv4) return true;
  if (ipv4.some((part) => part > 255)) return false;
  return !(ipv4[0] === 0 || ipv4[0] === 10 || ipv4[0] === 127 || ipv4[0] >= 224 || (ipv4[0] === 100 && ipv4[1] >= 64 && ipv4[1] <= 127) || (ipv4[0] === 169 && ipv4[1] === 254) || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) || (ipv4[0] === 192 && (ipv4[1] === 0 || ipv4[1] === 168)) || (ipv4[0] === 198 && (ipv4[1] === 18 || ipv4[1] === 19)));
}

export function normalizePublicWebResearch(value: unknown): PublicWebResearch | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<PublicWebResearch>;
  const sources = Array.isArray(candidate.sources) ? candidate.sources.slice(0, 24).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Partial<PublicWebSource>;
    const kind = source.kind === "Web result" || source.kind === "Technology signal" || source.kind === "Public research" ? source.kind : null;
    const agentName = AGENT_NAMES.includes(source.agentName as (typeof AGENT_NAMES)[number]) ? source.agentName as (typeof AGENT_NAMES)[number] : null;
    const title = sanitizePlainText(source.title, "", 180);
    const provider = sanitizePlainText(source.source, "Public source", 100);
    const snippet = sanitizePlainText(source.snippet, "Contextual public signal.", 320);
    const rawPublishedAt = typeof source.publishedAt === "string" && source.publishedAt.length <= 80 ? source.publishedAt : "";
    const publishedDate = rawPublishedAt ? Date.parse(rawPublishedAt) : Number.NaN;
    const publishedAt = Number.isNaN(publishedDate) ? null : new Date(publishedDate).toISOString();
    let url: URL;
    try {
      const rawUrl = String(source.url ?? "");
      if (rawUrl.length > 2_048) return [];
      url = new URL(rawUrl);
    } catch {
      return [];
    }
    const hackerNewsAllowed = kind === "Technology signal" && url.hostname === "news.ycombinator.com" && url.pathname === "/item" && /^\d+$/.test(url.searchParams.get("id") ?? "") && [...url.searchParams.keys()].every((key) => key === "id");
    const openAlexAllowed = kind === "Public research" && url.hostname === "openalex.org" && /^\/W\d+$/i.test(url.pathname) && !url.search && !url.hash;
    const webResultAllowed = kind === "Web result" && isSafeExternalResultUrl(url);
    if (!kind || !agentName || title.length < 4 || (!hackerNewsAllowed && !openAlexAllowed && !webResultAllowed)) return [];
    return [{ id: "", agentName, kind, title, source: provider, snippet, publishedAt, url: url.toString() }];
  }).slice(0, 12).map((source, index) => ({ ...source, id: `WEB-${String(index + 1).padStart(2, "0")}` })) : [];
  const rawStatus = candidate.status;
  const status = sources.length === 0 ? "Unavailable" : rawStatus === "Partial" ? "Partial" : "Completed";
  const query = sanitizePlainText(candidate.query, "", 180);
  const retrievedAtText = typeof candidate.retrievedAt === "string" && candidate.retrievedAt.length <= 80 ? candidate.retrievedAt : "";
  const rawRetrievedAt = Date.parse(retrievedAtText);
  return {
    query,
    agentQueries: Object.fromEntries(AGENT_NAMES.map((agentName) => [agentName, sanitizePlainText(candidate.agentQueries?.[agentName], query, 180)])) as PublicWebResearch["agentQueries"],
    retrievedAt: Number.isNaN(rawRetrievedAt) ? new Date(0).toISOString() : new Date(rawRetrievedAt).toISOString(),
    status,
    sources,
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.slice(0, 4).map((warning) => sanitizeText(warning, "", 240)).filter(Boolean) : [],
  };
}
