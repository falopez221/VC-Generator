import { NextResponse } from "next/server";
import { searchPublicWeb } from "@/src/lab/web-research";
import { BoundedJsonRequestError, isSameSiteWrite, readBoundedJson } from "@/src/private/request-security";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 12_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;
const MAX_RATE_KEYS = 500;
const MAX_CONCURRENT_RESEARCH = 8;

const rateWindows = new Map<string, { startedAt: number; count: number }>();
let activeResearch = 0;

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

export async function POST(request: Request) {
  if (!isSameSiteWrite(request)) {
    return NextResponse.json({ error: "Cross-site public research requests are not allowed." }, {
      status: 403,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

  // Application code cannot reliably distinguish a platform-overwritten IP
  // header from a client-supplied one on every supported runtime. Keep this
  // guard shared per instance and enforce per-client limits at the trusted edge.
  const rateKey = "shared-public-instance";
  if (exceedsRateLimit(rateKey, Date.now()) || activeResearch >= MAX_CONCURRENT_RESEARCH) {
    return NextResponse.json({ error: "Public web research is busy. Try again shortly." }, {
      status: 429,
      headers: { "cache-control": "no-store", "retry-after": "60" },
    });
  }

  activeResearch += 1;
  try {
    const body = await readBoundedJson(request, MAX_REQUEST_BYTES);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new BoundedJsonRequestError(400, "A structured research request is required.");
    }
    const candidate = body as Record<string, unknown>;
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
  } catch (error) {
    if (error instanceof BoundedJsonRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "cache-control": "no-store" } });
    }
    return NextResponse.json({ error: "Public web research is temporarily unavailable." }, {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  } finally {
    activeResearch -= 1;
  }
}
