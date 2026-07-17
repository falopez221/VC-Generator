import { AGENT_NAMES, DIMENSION_KEYS, type AgentResult, type LabInput, type Objective, type Opportunity, type PublicWebResearch, type PublicWebSource } from "./types.ts";
import { OBJECTIVES } from "./data.ts";
import { clamp } from "./random.ts";

const MAX_TEXT = 900;

export function sanitizeText(value: unknown, fallback = "", maxLength = MAX_TEXT) {
  return String(value ?? fallback)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateLabInput(value: Partial<LabInput>) {
  const errors: string[] = [];
  const objective = OBJECTIVES.includes(value.objective as Objective) ? value.objective as Objective : OBJECTIVES[0];
  const data: LabInput = {
    ideaNarrative: sanitizeText(value.ideaNarrative, "", 4000),
    ideaSummary: sanitizeText(value.ideaSummary).slice(0, 900),
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

function sanitizePlainText(value: unknown, fallback: string, maxLength: number) {
  const withoutMarkup = String(value ?? "")
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
  return !(ipv4[0] === 0 || ipv4[0] === 10 || ipv4[0] === 127 || (ipv4[0] === 169 && ipv4[1] === 254) || (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) || (ipv4[0] === 192 && ipv4[1] === 168));
}

export function normalizePublicWebResearch(value: unknown): PublicWebResearch | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<PublicWebResearch>;
  const sources = Array.isArray(candidate.sources) ? candidate.sources.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Partial<PublicWebSource>;
    const kind = source.kind === "Web result" || source.kind === "Technology signal" || source.kind === "Public research" ? source.kind : null;
    const agentName = AGENT_NAMES.includes(source.agentName as (typeof AGENT_NAMES)[number]) ? source.agentName as (typeof AGENT_NAMES)[number] : null;
    const title = sanitizePlainText(source.title, "", 180);
    const provider = sanitizePlainText(source.source, "Public source", 100);
    const snippet = sanitizePlainText(source.snippet, "Contextual public signal.", 320);
    const publishedDate = source.publishedAt ? Date.parse(String(source.publishedAt)) : Number.NaN;
    const publishedAt = Number.isNaN(publishedDate) ? null : new Date(publishedDate).toISOString();
    let url: URL;
    try {
      url = new URL(String(source.url ?? ""));
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
  const rawRetrievedAt = Date.parse(String(candidate.retrievedAt ?? ""));
  return {
    query,
    agentQueries: Object.fromEntries(AGENT_NAMES.map((agentName) => [agentName, sanitizePlainText(candidate.agentQueries?.[agentName], query, 180)])) as PublicWebResearch["agentQueries"],
    retrievedAt: Number.isNaN(rawRetrievedAt) ? new Date(0).toISOString() : new Date(rawRetrievedAt).toISOString(),
    status,
    sources,
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.map((warning) => sanitizeText(warning, "", 240)).filter(Boolean).slice(0, 4) : [],
  };
}
