export const LOOPBACK_HOST = "127.0.0.1";
export const MAX_REQUEST_TARGET_BYTES = 8 * 1024;
export const LOCAL_HEALTH_PATH = "/__venture_governance_local_health";
export const LOCAL_UPSTREAM_HEALTH_PATH = "/api/local-runtime/health";
export const MAX_LOCAL_PROXY_BODY_BYTES = 20 * 1024;
export const MAX_ACTIVE_LOCAL_PROXY_REQUESTS = 16;
export const MAX_LOCAL_PROXY_CONNECTIONS = 32;
export const BLOCKED_CLIENT_FORWARDING_HEADERS = Object.freeze([
  "cf-connecting-ip",
  "cf-connecting-ipv6",
  "forwarded",
  "oai-authenticated-user-email",
  "oai-authenticated-user-full-name",
  "oai-authenticated-user-full-name-encoding",
  "true-client-ip",
  "x-client-ip",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "x-vg-local-gateway",
  "x-vg-local-instance",
]);

const SAFE_WINDOWS_CHILD_ENV_NAMES = new Set([
  "allusersprofile",
  "appdata",
  "commonprogramfiles",
  "commonprogramfiles(x86)",
  "commonprogramw6432",
  "comspec",
  "homedrive",
  "homepath",
  "localappdata",
  "number_of_processors",
  "os",
  "path",
  "pathext",
  "processor_architecture",
  "processor_identifier",
  "processor_level",
  "processor_revision",
  "programdata",
  "programfiles",
  "programfiles(x86)",
  "programw6432",
  "public",
  "systemdrive",
  "systemroot",
  "temp",
  "tmp",
  "userdomain",
  "userdomain_roamingprofile",
  "username",
  "userprofile",
  "windir",
]);

export function parsePublicPort(value) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1024 || value > 65534) {
    throw new Error("local-settings.json must contain a numeric port between 1024 and 65534.");
  }
  return value;
}

export function parseLocalInstanceToken(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("local-settings.json must contain a 256-bit hexadecimal local instance token.");
  }
  return value;
}

export function createRestrictedChildEnv(source, overrides = {}) {
  const result = {};
  for (const [name, value] of Object.entries(source ?? {})) {
    if (SAFE_WINDOWS_CHILD_ENV_NAMES.has(name.toLowerCase()) && typeof value === "string") {
      result[name] = value;
    }
  }
  for (const [name, value] of Object.entries(overrides)) {
    if (typeof value !== "string") throw new TypeError(`Child environment override ${name} must be a string.`);
    result[name] = value;
  }
  return result;
}

export function isMatchingLocalInstanceResponse(statusCode, responseToken, expectedToken) {
  return statusCode === 204 &&
    typeof expectedToken === "string" &&
    responseToken === expectedToken;
}

export function isRejectedCrossSiteWrite(method, headers, expectedOrigin) {
  const normalizedMethod = typeof method === "string" ? method.toUpperCase() : "";
  if (["GET", "HEAD", "OPTIONS"].includes(normalizedMethod)) return false;
  const fetchSiteValue = headers?.["sec-fetch-site"];
  const fetchSites = Array.isArray(fetchSiteValue) ? fetchSiteValue : [fetchSiteValue];
  if (fetchSites.some((value) => typeof value === "string" && value.trim().toLowerCase() === "cross-site")) return true;
  if (Array.isArray(headers?.origin)) return true;
  const origin = typeof headers?.origin === "string" ? headers.origin : null;
  return origin !== null && origin !== expectedOrigin;
}

export function isLocalUpstreamHealthTarget(target) {
  if (typeof target !== "string") return false;
  try {
    const url = new URL(target, "http://local.invalid");
    const decodedPath = decodeURIComponent(url.pathname)
      .replace(/\/{2,}/g, "/")
      .replace(/\/+$/g, "")
      .toLowerCase();
    return decodedPath === LOCAL_UPSTREAM_HEALTH_PATH;
  } catch {
    return false;
  }
}

export function isAllowedLoopbackHost(hostHeader, publicPort) {
  return hostHeader === `${LOOPBACK_HOST}:${publicPort}`;
}

export function isSafeOriginFormTarget(target) {
  return typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("#") &&
    Buffer.byteLength(target) <= MAX_REQUEST_TARGET_BYTES;
}
