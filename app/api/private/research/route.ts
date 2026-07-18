import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import { normalizePrivateResearchRequest } from "@/src/private/research/normalize";
import { searchPrivateResearch } from "@/src/private/research/service";
import { isSameSiteWrite } from "@/src/private/request-security";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 6_000;
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 12;
const MAX_ACTIVE_REQUESTS = 4;
const MAX_TRACKED_IDENTITIES = 500;
const windows = new Map<string, { startedAt: number; count: number }>();
let activeRequests = 0;

class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

function rateLimited(email: string, now: number) {
  for (const [key, window] of windows) if (now - window.startedAt >= WINDOW_MS) windows.delete(key);
  const current = windows.get(email);
  if (!current) {
    if (windows.size >= MAX_TRACKED_IDENTITIES) windows.delete(windows.keys().next().value ?? "");
    windows.set(email, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > REQUESTS_PER_WINDOW;
}

async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RequestError(415, "Content-Type must be application/json.");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new RequestError(413, "Private research request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "A JSON request body is required.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) { await reader.cancel(); throw new RequestError(413, "Private research request is too large."); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(text) as unknown; } catch { throw new RequestError(400, "Request body must contain valid JSON."); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: "Authentication is required." }, 401);
  const authorized = authorizeChatGPTUser(user);
  if (!authorized) return response({ error: "This account is not authorized for the private workspace." }, 403);
  if (!isSameSiteWrite(request)) return response({ error: "Cross-site private requests are not allowed." }, 403);
  if (rateLimited(authorized.email.toLowerCase(), Date.now()) || activeRequests >= MAX_ACTIVE_REQUESTS) {
    return response({ error: "Private research is busy. Try again shortly." }, 429);
  }
  try {
    const parsed = normalizePrivateResearchRequest(await readJson(request));
    if (!parsed.success) return response({ error: parsed.errors.join(" ") }, 400);
    activeRequests += 1;
    try {
      return response(await searchPrivateResearch(parsed.data));
    } finally { activeRequests -= 1; }
  } catch (error) {
    if (error instanceof RequestError) return response({ error: error.message }, error.status);
    return response({ error: "Private research is temporarily unavailable." }, 503);
  }
}
