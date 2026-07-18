import { NextRequest, NextResponse } from "next/server";
import { hasValidLocalGateway } from "@/src/security/local-runtime-trust";
import { hasTrustedSitesIdentityContext } from "@/src/security/sites-auth-trust";

const AUTHENTICATED_USER_HEADER = "oai-authenticated-user-email";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const installedRuntime = process.env.VERCEL !== "1" &&
    process.env.VG_LOCAL_INSTALL_MODE === "1" &&
    isLoopbackHost(process.env.VG_LOCAL_BIND_ADDRESS ?? null);
  if (installedRuntime && pathname !== "/api/local-runtime/health" &&
      !hasValidLocalGateway(request.headers, process.env)) {
    return new NextResponse("Not found.", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (!pathname.startsWith("/app")) return NextResponse.next();

  if (pathname === "/app/login" || hasTrustedAuthenticatedUser(request) || isLocalRuntimeRequest(request)) {
    return NextResponse.next();
  }

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/signin-with-chatgpt";
  signInUrl.search = "";
  signInUrl.searchParams.set("return_to", `${pathname}${search}`);
  const response = NextResponse.redirect(signInUrl);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function hasTrustedAuthenticatedUser(request: NextRequest) {
  if (process.env.VERCEL === "1") return false;
  const email = request.headers.get(AUTHENTICATED_USER_HEADER)?.trim().toLowerCase();
  if (!email || email.length > 254 || !email.includes("@") || /[\s\u0000-\u001f\u007f]/u.test(email)) return false;
  return hasTrustedSitesIdentityContext(request.headers, request.nextUrl.host, {
    VG_TRUST_CHATGPT_AUTH_HEADERS: process.env.VG_TRUST_CHATGPT_AUTH_HEADERS,
    VG_TRUSTED_SITES_HOSTS: process.env.VG_TRUSTED_SITES_HOSTS,
  })
    || isLocalRuntimeRequest(request);
}

function isLocalRuntimeRequest(request: NextRequest) {
  if (process.env.VERCEL === "1") return false;
  const developmentMode = process.env.NODE_ENV === "development" && process.env.VG_LOCAL_DEV_MODE === "1";
  const installedMode = process.env.VG_LOCAL_INSTALL_MODE === "1";
  if ((!developmentMode && !installedMode) || !isLoopbackHost(process.env.VG_LOCAL_BIND_ADDRESS ?? null)) return false;
  if (installedMode && !hasValidLocalGateway(request.headers, process.env)) return false;

  const hosts = [request.nextUrl.hostname, request.headers.get("host"), request.headers.get("x-forwarded-host")]
    .filter((value): value is string => Boolean(value));
  return hosts.length > 0 && hosts.every((host) => isLoopbackHost(host));
}

function isLoopbackHost(value: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === "::1") return true;
  if (!normalized || /[\s,\\/@?#]/u.test(normalized)) return false;
  try {
    const url = new URL(`http://${normalized}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/app/:path*", "/api/:path*"],
};
