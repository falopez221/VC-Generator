const JSON_CONTENT_TYPE = "application/json";

export class BoundedJsonRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Reads an API body without allowing chunked or slow requests to bypass limits. */
export async function readBoundedJson(
  request: Request,
  maximumBytes: number,
  timeoutMilliseconds = 5_000,
): Promise<unknown> {
  if (request.headers.get("content-type")?.trim().toLowerCase() !== JSON_CONTENT_TYPE) {
    throw new BoundedJsonRequestError(415, "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new BoundedJsonRequestError(413, "Request body is too large.");
  }
  if (!request.body) throw new BoundedJsonRequestError(400, "A JSON request body is required.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const deadline = Date.now() + Math.max(1, Math.min(timeoutMilliseconds, 30_000));
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new BoundedJsonRequestError(408, "Request body timed out.");
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new BoundedJsonRequestError(408, "Request body timed out.")),
          remaining,
        );
      });
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await Promise.race([reader.read(), timeout]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      const { done, value } = chunk;
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        throw new BoundedJsonRequestError(413, "Request body is too large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BoundedJsonRequestError(400, "Request body must contain valid JSON.");
  }
}

/** Reject browser cross-site writes before they can spend private provider capacity. */
export function isSameSiteWrite(request: Request): boolean {
  const rawFetchSite = request.headers.get("sec-fetch-site");
  const fetchSite = rawFetchSite?.trim().toLowerCase();
  if (rawFetchSite !== null && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = parseHttpOrigin(origin);
    const targetUrl = requestTargetOrigin(request);
    if (!originUrl || !targetUrl) return false;

    if (originUrl.origin === targetUrl.origin) return true;

    // The installer proxies a public loopback port to an internal loopback port.
    // A browser-supplied same-origin Fetch Metadata value lets those two ports
    // differ without extending the exception to any non-loopback deployment.
    const loopbackOrigin = normalizeLoopbackHostname(originUrl.hostname);
    const loopbackTarget = normalizeLoopbackHostname(targetUrl.hostname);
    return fetchSite === "same-origin"
      && originUrl.protocol === targetUrl.protocol
      && loopbackOrigin !== null
      && loopbackOrigin === loopbackTarget;
  } catch {
    return false;
  }
}

function requestTargetOrigin(request: Request): URL | null {
  const requestUrl = parseHttpUrl(request.url);
  if (!requestUrl) return null;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost === null && forwardedProto === null) return requestUrl;

  const host = forwardedHost === null ? requestUrl.host : forwardedHost.trim();
  const protocol = forwardedProto === null ? requestUrl.protocol.slice(0, -1) : forwardedProto.trim().toLowerCase();
  if (!isSafeForwardedHost(host) || (protocol !== "http" && protocol !== "https")) return null;

  return parseHttpUrl(`${protocol}://${host}`);
}

function parseHttpOrigin(value: string): URL | null {
  const url = parseHttpUrl(value);
  if (!url || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
  return url;
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isSafeForwardedHost(value: string): boolean {
  return value.length > 0
    && value.length <= 255
    && !/[\u0000-\u0020\u007f,\\/@?#]/u.test(value);
}

function normalizeLoopbackHostname(value: string): string | null {
  const hostname = value.toLowerCase().replace(/^\[|\]$/g, "");
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" ? hostname : null;
}
