import { PRIVATE_RESEARCH_PROVIDERS, type PrivateResearchProvider, type PrivateResearchRequest, type PrivateResearchSnapshot, type PrivateResearchSource } from "./types.ts";

const MAX_TOPIC_LENGTH = 240;
const MAX_CONTEXT_LENGTH = 800;
const MAX_QUERY_LENGTH = 220;
const MAX_SOURCES = 8;
const MIN_TOPIC_LENGTH = 3;

const STOP_WORDS = new Set([
  "about", "also", "and", "are", "con", "de", "del", "for", "from", "las", "los", "para", "por", "the", "this", "una", "with",
]);

function plainText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function providerFrom(value: unknown): PrivateResearchProvider {
  return PRIVATE_RESEARCH_PROVIDERS.includes(value as PrivateResearchProvider)
    ? value as PrivateResearchProvider
    : "google-news";
}

export function normalizePrivateResearchRequest(value: unknown): { success: true; data: PrivateResearchRequest } | { success: false; errors: string[] } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { success: false, errors: ["A structured private research request is required."] };
  }
  const input = value as Record<string, unknown>;
  const topic = plainText(input.topic, MAX_TOPIC_LENGTH);
  if (topic.length < MIN_TOPIC_LENGTH) {
    return { success: false, errors: ["Provide a research topic with at least 3 characters."] };
  }
  return {
    success: true,
    data: {
      topic,
      context: plainText(input.context, MAX_CONTEXT_LENGTH),
      provider: providerFrom(input.provider),
      maxSources: boundedInteger(input.maxSources, 5, 1, MAX_SOURCES),
    },
  };
}

export function buildPrivateResearchQuery(request: Pick<PrivateResearchRequest, "topic" | "context">) {
  const words = `${request.topic} ${request.context}`
    .normalize("NFKC")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 3 && word.length <= 40 && !STOP_WORDS.has(word));
  const unique = [...new Set(words)].slice(0, 14);
  return unique.join(" ").slice(0, MAX_QUERY_LENGTH);
}

function isSafeEvidenceUrl(value: unknown) {
  try {
    const url = new URL(String(value ?? ""));
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.startsWith("[")) return null;
    const octets = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
    if (octets && (octets.some((part) => part > 255) || octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || (octets[0] === 169 && octets[1] === 254) || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168))) return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizePrivateResearchSources(value: unknown, request: PrivateResearchRequest, retrievedAt: string): PrivateResearchSource[] {
  if (!Array.isArray(value)) return [];
  const query = buildPrivateResearchQuery(request);
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const url = isSafeEvidenceUrl(source.url);
    const title = plainText(source.title, 220);
    if (!url || title.length < 4) return [];
    const publishedMs = Date.parse(String(source.publishedAt ?? ""));
    return [{
      id: "",
      provider: request.provider,
      query,
      title,
      url: url.toString(),
      publisher: plainText(source.publisher, 120) || url.hostname.replace(/^www\./i, "").slice(0, 120),
      snippet: plainText(source.snippet, 500) || "Provider result; review the original source before relying on it.",
      publishedAt: Number.isNaN(publishedMs) ? null : new Date(publishedMs).toISOString(),
      retrievedAt,
    }];
  }).filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index)
    .slice(0, request.maxSources)
    .map((source, index) => ({ ...source, id: `EVD-${String(index + 1).padStart(3, "0")}` }));
}

export function unavailablePrivateResearch(request: PrivateResearchRequest, now: Date, warning: string): PrivateResearchSnapshot {
  return {
    status: "Unavailable",
    query: buildPrivateResearchQuery(request),
    provider: request.provider,
    retrievedAt: now.toISOString(),
    sources: [],
    warnings: [plainText(warning, 240)],
    limitations: ["No remote content was retrieved. Retry later or record independently verified evidence.", "Results are contextual leads, not verified facts, recommendations or authorization for action."],
  };
}
