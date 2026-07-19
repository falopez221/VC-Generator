import { NextResponse } from "next/server";
import { authorizeChatGPTUser, getChatGPTUser } from "@/app/chatgpt-auth";
import {
  AERIAL_SIMULATION_ACCESS_PATH,
  evaluateAerialPrivateAuthorization,
  sanitizeAerialReturnPath,
} from "@/src/private-aerial/security/authorization";
import {
  AERIAL_LAB_SESSION_MAX_AGE_SECONDS,
  aerialLabSessionCookieName,
  createAerialLabSessionToken,
  hasAerialLabAccessConfiguration,
  verifyAerialLabCredential,
} from "@/src/private-aerial/security/session";

export const dynamic = "force-dynamic";

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const BLOCK_DURATION_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_FORM_BYTES = 4 * 1024;

type AttemptState = { failures: number; windowStartedAt: number; blockedUntil: number };
const attemptsByIdentity = new Map<string, AttemptState>();

export async function POST(request: Request): Promise<NextResponse> {
  const requestOrigin = sameOriginRequestBase(request);
  if (!requestOrigin) {
    return privateResponse("Access request rejected.", 403);
  }

  const identity = await getChatGPTUser();
  const workspaceIdentity = identity ? authorizeChatGPTUser(identity) : null;
  if (!workspaceIdentity) {
    return redirectResponse(requestOrigin, "/app/login?reason=not-authorized");
  }

  const authorization = evaluateAerialPrivateAuthorization(workspaceIdentity);
  if (!authorization.authorized) {
    return redirectResponse(requestOrigin, "/app/login?reason=aerial-private");
  }

  const formData = await readLimitedForm(request);
  if (!formData) return accessErrorRedirect(requestOrigin, "request");
  if (formData.get("action") === "lock") {
    const response = redirectResponse(requestOrigin, "/app");
    response.cookies.set({
      name: aerialLabSessionCookieName(),
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/app/aerial-simulation",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  }
  if (!hasAerialLabAccessConfiguration()) {
    return accessErrorRedirect(requestOrigin, "configuration");
  }
  if (isBlocked(authorization.email)) {
    return accessErrorRedirect(requestOrigin, "rate");
  }

  const credential = formData.get("credential");
  const validCredential = await verifyAerialLabCredential(credential);
  if (!validCredential) {
    const blocked = recordFailure(authorization.email);
    return accessErrorRedirect(requestOrigin, blocked ? "rate" : "invalid");
  }

  attemptsByIdentity.delete(authorization.email);
  const token = await createAerialLabSessionToken(authorization.email);
  if (!token) return accessErrorRedirect(requestOrigin, "configuration");

  const returnTo = sanitizeAerialReturnPath(formData.get("next"));
  const response = redirectResponse(requestOrigin, returnTo);
  response.cookies.set({
    name: aerialLabSessionCookieName(),
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/app/aerial-simulation",
    maxAge: AERIAL_LAB_SESSION_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + AERIAL_LAB_SESSION_MAX_AGE_SECONDS * 1000),
  });
  return response;
}

function sameOriginRequestBase(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite !== null && fetchSite !== "same-origin") return null;

    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
    const candidateHosts = new Set([
      requestUrl.host.toLowerCase(),
      request.headers.get("host")?.trim().toLowerCase(),
      forwardedHost?.toLowerCase(),
    ].filter((value): value is string => Boolean(value)));
    const exactHost = candidateHosts.has(originUrl.host.toLowerCase());
    const installedLoopbackProxy = process.env.VG_LOCAL_INSTALL_MODE === "1"
      && originUrl.protocol === "http:"
      && requestUrl.protocol === "http:"
      && isLoopbackHostname(originUrl.hostname)
      && isLoopbackHostname(requestUrl.hostname);
    if (!exactHost && !installedLoopbackProxy) return null;
    if (originUrl.protocol !== requestUrl.protocol && !installedLoopbackProxy) return null;
    return originUrl.origin;
  } catch {
    return null;
  }
}

async function readLimitedForm(request: Request): Promise<URLSearchParams | null> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded") return null;

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > MAX_FORM_BYTES)) {
    return null;
  }
  if (!request.body) return new URLSearchParams();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FORM_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new URLSearchParams(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function isBlocked(email: string, now = Date.now()): boolean {
  const current = attemptsByIdentity.get(email);
  if (!current) return false;
  if (current.blockedUntil > now) return true;
  if (now - current.windowStartedAt > ATTEMPT_WINDOW_MS) {
    attemptsByIdentity.delete(email);
  }
  return false;
}

function recordFailure(email: string, now = Date.now()): boolean {
  const current = attemptsByIdentity.get(email);
  const activeWindow = current && now - current.windowStartedAt <= ATTEMPT_WINDOW_MS;
  const failures = activeWindow ? current.failures + 1 : 1;
  const blockedUntil = failures >= MAX_FAILED_ATTEMPTS ? now + BLOCK_DURATION_MS : 0;
  attemptsByIdentity.set(email, {
    failures,
    windowStartedAt: activeWindow ? current.windowStartedAt : now,
    blockedUntil,
  });
  return blockedUntil > now;
}

function accessErrorRedirect(requestOrigin: string, error: string): NextResponse {
  return redirectResponse(
    requestOrigin,
    `${AERIAL_SIMULATION_ACCESS_PATH}?error=${encodeURIComponent(error)}`,
  );
}

function redirectResponse(requestOrigin: string, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, requestOrigin), 303);
  addPrivateHeaders(response.headers);
  return response;
}

function privateResponse(body: string, status: number): NextResponse {
  const response = new NextResponse(body, { status });
  addPrivateHeaders(response.headers);
  response.headers.set("content-type", "text/plain; charset=utf-8");
  return response;
}

function addPrivateHeaders(headers: Headers): void {
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("x-robots-tag", "noindex, nofollow, noarchive");
}
