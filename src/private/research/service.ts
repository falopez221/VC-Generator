import "server-only";

import { buildPrivateResearchQuery, normalizePrivateResearchSources, unavailablePrivateResearch } from "./normalize.ts";
import type { PrivateResearchRequest, PrivateResearchSnapshot } from "./types.ts";

const NEWS_ENDPOINT = "https://news.google.com/rss/search";
const RESPONSE_LIMIT_BYTES = 750_000;
const TIMEOUT_MS = 7_000;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_LIMIT = 100;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
const cache = new Map<string, { expiresAt: number; value: PrivateResearchSnapshot }>();

function decodeXml(value: string) {
  return value.replace(/&#(x?[0-9a-f]+);/gi, (match, code: string) => {
    const numeric = Number.parseInt(code.replace(/^x/i, ""), code.toLowerCase().startsWith("x") ? 16 : 10);
    try { return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : match; } catch { return match; }
  }).replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'").replace(/&amp;/gi, "&");
}

function tagValue(block: string, tag: "title" | "link" | "description" | "pubDate" | "source") {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml((match?.[1] ?? "").replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "").trim());
}

function parseGoogleNews(xml: string) {
  const items = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => ({
    title: tagValue(item, "title"),
    url: tagValue(item, "link"),
    snippet: tagValue(item, "description"),
    publisher: tagValue(item, "source"),
    publishedAt: tagValue(item, "pubDate"),
  }));
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > RESPONSE_LIMIT_BYTES) throw new Error("Provider response exceeded size limit.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > RESPONSE_LIMIT_BYTES) { await reader.cancel(); throw new Error("Provider response exceeded size limit."); }
      output += decoder.decode(value, { stream: true });
    }
    return output + decoder.decode();
  } finally { reader.releaseLock(); }
}

async function requestGoogleNews(query: string, fetchImpl: FetchLike) {
  const url = new URL(NEWS_ENDPOINT);
  url.searchParams.set("q", `${query} when:2y`);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, redirect: "error", headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9" } });
    if (!response.ok) throw new Error(`Approved provider returned ${response.status}.`);
    return parseGoogleNews(await readLimited(response));
  } finally { clearTimeout(timeout); }
}

export async function searchPrivateResearch(request: PrivateResearchRequest, fetchImpl: FetchLike = fetch, now = new Date()): Promise<PrivateResearchSnapshot> {
  const query = buildPrivateResearchQuery(request);
  if (query.length < 3) return unavailablePrivateResearch(request, now, "The normalized topic did not contain enough safe search terms.");
  const key = `${request.provider}:${request.maxSources}:${query}`;
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now.getTime()) return existing.value;
  if (existing) cache.delete(key);
  try {
    const rawSources = await requestGoogleNews(query, fetchImpl);
    const sources = normalizePrivateResearchSources(rawSources, request, now.toISOString());
    const value: PrivateResearchSnapshot = {
      status: sources.length ? "Completed" : "Partial",
      query,
      provider: request.provider,
      retrievedAt: now.toISOString(),
      sources,
      warnings: sources.length ? [] : ["The approved provider returned no usable HTTPS sources for this topic."],
      limitations: ["Provider snippets are unverified context. Open and assess the original source before treating it as evidence.", "This retrieval does not browse user-supplied URLs, execute instructions, change model scores or authorize action."],
    };
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value ?? "");
    cache.set(key, { expiresAt: now.getTime() + CACHE_TTL_MS, value });
    return value;
  } catch {
    return unavailablePrivateResearch(request, now, "The approved research provider is temporarily unavailable; no untrusted fallback was used.");
  }
}
