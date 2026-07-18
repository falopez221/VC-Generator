import { NextResponse } from "next/server";
import { searchPublicWeb } from "@/src/lab/web-research";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 12_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;
const MAX_RATE_KEYS = 500;
const MAX_CONCURRENT_RESEARCH = 8;

const rateWindows = new Map<string, { startedAt: number; count: number }>();
let activeResearch = 0;

class ClientRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function anonymousRateKey(request: Request) {
  // Cloudflare overwrites this header at the edge. Do not accept x-real-ip,
  // which a browser client can forge to evade the per-client guard.
  const raw = request.headers.get("cf-connecting-ip") || "anonymous";
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function exceedsRateLimit(key: string, now: number) {
  for (const [storedKey, window] of rateWindows) {
    if (now - window.startedAt >= RATE_WINDOW_MS) rateWindows.delete(storedKey);
  }
  const current = rateWindows.get(key);
  if (!current) {
    if (rateWindows.size >= MAX_RATE_KEYS) rateWindows.delete(rateWindows.keys().next().value ?? "");
    rateWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

async function readJsonBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new ClientRequestError(415, "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new ClientRequestError(413, "Research request is too large.");
  }
  if (!request.body) throw new ClientRequestError(400, "A JSON request body is required.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ClientRequestError(413, "Research request is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ClientRequestError(400, "Request body must contain valid JSON.");
  }
}

export async function POST(request: Request) {
  const rateKey = anonymousRateKey(request);
  if (exceedsRateLimit(rateKey, Date.now()) || activeResearch >= MAX_CONCURRENT_RESEARCH) {
    return NextResponse.json({ error: "Public web research is busy. Try again shortly." }, {
      status: 429,
      headers: { "cache-control": "no-store", "retry-after": "60" },
    });
  }

  try {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ClientRequestError(400, "A structured research request is required.");
    }
    const candidate = body as Record<string, unknown>;
    activeResearch += 1;
    try {
      const research = await searchPublicWeb({
        problem: String(candidate.problem ?? ""),
        thesis: String(candidate.thesis ?? ""),
        industry: String(candidate.industry ?? ""),
        market: String(candidate.market ?? ""),
        technology: String(candidate.technology ?? ""),
        region: String(candidate.region ?? ""),
      });
      return NextResponse.json(research, {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    } finally {
      activeResearch -= 1;
    }
  } catch (error) {
    if (error instanceof ClientRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ error: "Public web research is temporarily unavailable." }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
}
