/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { hasTrustedSitesIdentityContext } from "../src/security/sites-auth-trust";

interface Env {
  ASSETS: Fetcher;
  VG_TRUST_CHATGPT_AUTH_HEADERS?: string;
  VG_TRUSTED_SITES_HOSTS?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function withSecurityHeaders(response: Response, request: Request): Response {
  const secured = new Response(response.body, response);
  const url = new URL(request.url);
  secured.headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self' data:; connect-src 'self'");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  secured.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  secured.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (url.protocol === "https:") {
    secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (url.pathname === "/app" || url.pathname.startsWith("/app/") || (response.status >= 300 && response.status < 400)) {
    secured.headers.set("Cache-Control", "private, no-store, max-age=0");
    secured.headers.set("Pragma", "no-cache");
  }
  return secured;
}

const IDENTITY_HEADERS = [
  "oai-authenticated-user-email",
  "oai-authenticated-user-full-name",
  "oai-authenticated-user-full-name-encoding",
] as const;

function removeUntrustedIdentityHeaders(request: Request, env: Env): Request {
  const url = new URL(request.url);
  if (hasTrustedSitesIdentityContext(request.headers, url.host, env)) return request;

  const sanitizedHeaders = new Headers(request.headers);
  for (const header of IDENTITY_HEADERS) sanitizedHeaders.delete(header);
  return new Request(request, { headers: sanitizedHeaders });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const sanitizedRequest = removeUntrustedIdentityHeaders(request, env);
    const url = new URL(sanitizedRequest.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(sanitizedRequest, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, sanitizedRequest.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(response, sanitizedRequest);
    }

    return withSecurityHeaders(await handler.fetch(sanitizedRequest, env, ctx), sanitizedRequest);
  },
};

export default worker;
