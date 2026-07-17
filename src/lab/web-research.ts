import { sanitizeText } from "./schema.ts";
import { AGENT_NAMES, type AgentName, type LabInput, type PublicWebResearch, type PublicWebSource } from "./types.ts";

const MAX_RESPONSE_BYTES = 1_000_000;
const SOURCE_TIMEOUT_MS = 7_000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const RESULTS_PER_AGENT = 3;

const STOP_WORDS = new Set([
  "about", "against", "also", "and", "are", "como", "con", "contra", "del", "desde", "esta", "este", "for", "from", "into", "las", "los", "para", "por", "que", "the", "their", "this", "una", "uno", "using", "with", "without",
]);

const AGENT_SEARCH_FOCUS: Record<AgentName, string[]> = {
  Mathematics: ["statistics", "benchmarks", "data", "evidence"],
  Finance: ["market", "pricing", "funding", "revenue"],
  Strategy: ["competitors", "regulation", "partnerships", "trends"],
  Marketing: ["customers", "demand", "adoption", "buyers"],
};

type ResearchInput = Pick<LabInput, "problem" | "thesis" | "industry" | "market" | "technology" | "region">;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const cache = new Map<string, { expiresAt: number; value: PublicWebResearch }>();

function stripUnsafeMarkup(value: unknown) {
  return String(value ?? "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ");
}

function cleanRemoteText(value: unknown, maxLength: number) {
  return sanitizeText(stripUnsafeMarkup(value), "", maxLength);
}

function compactKeywords(value: string) {
  return value
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 3 && word.length <= 32 && !STOP_WORDS.has(word));
}

export function buildPublicResearchQuery(input: Partial<ResearchInput>) {
  const fields = [input.industry, input.technology, input.market, input.region, input.thesis, input.problem]
    .map((value) => sanitizeText(stripUnsafeMarkup(value), "", 180));
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const word of compactKeywords(fields.join(" "))) {
    if (seen.has(word)) continue;
    seen.add(word);
    keywords.push(word);
    if (keywords.length === 8) break;
  }
  return keywords.join(" ").slice(0, 150);
}

export function buildAgentResearchQueries(input: Partial<ResearchInput>) {
  const base = buildPublicResearchQuery(input);
  return Object.fromEntries(AGENT_NAMES.map((agentName) => {
    const terms = [...base.split(/\s+/).filter(Boolean), ...AGENT_SEARCH_FOCUS[agentName]];
    return [agentName, [...new Set(terms)].join(" ").slice(0, 180)];
  })) as Record<AgentName, string>;
}

async function readLimitedText(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("Public source response exceeded the safe size limit.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Public source response exceeded the safe size limit.");
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

async function fetchText(url: URL, fetchImpl: FetchLike) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "error",
      headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9" },
    });
    if (!response.ok) throw new Error(`Public search returned ${response.status}.`);
    return await readLimitedText(response);
  } finally {
    clearTimeout(timer);
  }
}

function decodeXmlEntities(value: string) {
  const numeric = value.replace(/&#(x?[0-9a-f]+);/gi, (match, code: string) => {
    const radix = code.toLowerCase().startsWith("x") ? 16 : 10;
    const numericCode = Number.parseInt(code.replace(/^x/i, ""), radix);
    try {
      return Number.isFinite(numericCode) ? String.fromCodePoint(numericCode) : match;
    } catch {
      return match;
    }
  });
  return numeric
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

function xmlValue(block: string, tag: "title" | "link" | "description" | "pubDate" | "source") {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXmlEntities((match?.[1] ?? "").replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "").trim());
}

function safePublicResultUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!url.hostname || url.hostname === "localhost" || url.hostname.endsWith(".local")) return null;
    return url;
  } catch {
    return null;
  }
}

function parseWebNewsRss(xml: string, agentName: AgentName): Omit<PublicWebSource, "id">[] {
  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, RESULTS_PER_AGENT + 2).flatMap((item) => {
    const title = cleanRemoteText(xmlValue(item, "title"), 180);
    const url = safePublicResultUrl(xmlValue(item, "link"));
    if (title.length < 4 || !url) return [];
    const rawDate = xmlValue(item, "pubDate");
    const parsedDate = Date.parse(rawDate);
    return [{
      agentName,
      kind: "Web result" as const,
      title,
      url: url.toString(),
      source: cleanRemoteText(xmlValue(item, "source"), 100) || url.hostname.replace(/^www\./i, "").slice(0, 100),
      snippet: cleanRemoteText(xmlValue(item, "description"), 320) || "Public web-search result returned for this specialist query.",
      publishedAt: Number.isNaN(parsedDate) ? null : new Date(parsedDate).toISOString(),
    }];
  }).slice(0, RESULTS_PER_AGENT);
}

function deduplicateSources(sources: Omit<PublicWebSource, "id">[]) {
  const seen = new Set<string>();
  const output: PublicWebSource[] = [];
  for (const source of sources) {
    const key = `${source.agentName}:${source.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({ ...source, id: `WEB-${String(output.length + 1).padStart(2, "0")}` });
  }
  return output.slice(0, AGENT_NAMES.length * RESULTS_PER_AGENT);
}

function remember(key: string, value: PublicWebResearch, now: Date) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: now.getTime() + CACHE_TTL_MS, value });
}

export async function searchPublicWeb(input: Partial<ResearchInput>, fetchImpl: FetchLike = fetch, now = new Date()): Promise<PublicWebResearch> {
  const query = buildPublicResearchQuery(input);
  const agentQueries = buildAgentResearchQueries(input);
  if (query.length < 3) {
    return { query, agentQueries, retrievedAt: now.toISOString(), status: "Unavailable", sources: [], warnings: ["Add an industry, technology, market or thesis before requesting public web search."] };
  }

  const cacheKey = JSON.stringify(agentQueries);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now.getTime()) return cached.value;
  if (cached) cache.delete(cacheKey);

  const outcomes = await Promise.allSettled(AGENT_NAMES.map(async (agentName) => {
    const url = new URL("https://news.google.com/rss/search");
    url.searchParams.set("q", `${agentQueries[agentName]} when:2y`);
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
    return parseWebNewsRss(await fetchText(url, fetchImpl), agentName);
  }));

  const sources = deduplicateSources(outcomes.flatMap((outcome) => outcome.status === "fulfilled" ? outcome.value : []));
  const failedAgents = AGENT_NAMES.filter((_, index) => outcomes[index].status === "rejected");
  const emptyAgents = AGENT_NAMES.filter((agentName) => !sources.some((source) => source.agentName === agentName));
  const warnings: string[] = [];
  if (failedAgents.length) warnings.push(`Web search failed for ${failedAgents.join(", ")}; those agents used the local deterministic fallback.`);
  if (emptyAgents.length && emptyAgents.length !== failedAgents.length) warnings.push(`No matching web result was returned for ${emptyAgents.join(", ")}.`);
  warnings.push("Search snippets are unverified secondary context, not proof of demand, feasibility, financial performance or investment quality.");
  const value: PublicWebResearch = {
    query,
    agentQueries,
    retrievedAt: now.toISOString(),
    status: sources.length === 0 ? "Unavailable" : failedAgents.length || emptyAgents.length ? "Partial" : "Completed",
    sources,
    warnings,
  };
  remember(cacheKey, value, now);
  return value;
}
