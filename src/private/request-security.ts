const JSON_CONTENT_TYPE = "application/json";

export class BoundedJsonRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

/** Reads an API body without allowing chunked requests to bypass the size limit. */
export async function readBoundedJson(request: Request, maximumBytes: number): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith(JSON_CONTENT_TYPE)) {
    throw new BoundedJsonRequestError(415, "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new BoundedJsonRequestError(413, "Request body is too large.");
  }
  if (!request.body) throw new BoundedJsonRequestError(400, "A JSON request body is required.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        throw new BoundedJsonRequestError(413, "Request body is too large.");
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
    throw new BoundedJsonRequestError(400, "Request body must contain valid JSON.");
  }
}

/** Reject browser cross-site writes before they can spend private provider capacity. */
export function isSameSiteWrite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const targetUrl = new URL(request.url);
    // The installer proxies a public loopback port to an internal loopback port.
    // Comparing protocol and hostname retains CSRF protection without breaking it.
    return originUrl.protocol === targetUrl.protocol && originUrl.hostname === targetUrl.hostname;
  } catch {
    return false;
  }
}
