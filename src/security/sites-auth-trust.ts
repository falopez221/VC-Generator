export type HeaderReader = {
  get(name: string): string | null;
};

export type SitesIdentityTrustEnvironment = {
  VG_TRUST_CHATGPT_AUTH_HEADERS?: string;
  VG_TRUSTED_SITES_HOSTS?: string;
};

/**
 * Identity headers are meaningful only when both the Sites dispatcher trust
 * switch and an exact production-host allowlist are configured. Every host
 * view must agree so a spoofed forwarding header cannot widen that boundary.
 */
export function hasTrustedSitesIdentityContext(
  requestHeaders: HeaderReader,
  requestHost: string | null,
  environment: SitesIdentityTrustEnvironment,
): boolean {
  if (environment.VG_TRUST_CHATGPT_AUTH_HEADERS !== "1") return false;

  const trustedHosts = parseTrustedHosts(environment.VG_TRUSTED_SITES_HOSTS);
  if (trustedHosts.size === 0) return false;

  const candidates = [requestHost, requestHeaders.get("host"), requestHeaders.get("x-forwarded-host")]
    .filter((value): value is string => value !== null && value.length > 0);
  if (candidates.length === 0) return false;

  const normalized = candidates.map(normalizeHostAuthority);
  return normalized.every((host): host is string => host !== null && trustedHosts.has(host));
}

function parseTrustedHosts(value: string | undefined): Set<string> {
  if (!value) return new Set();
  const entries = value.split(",");
  if (entries.length > 20) return new Set();

  const normalized = entries.map((entry) => normalizeHostAuthority(entry));
  if (normalized.some((entry) => entry === null)) return new Set();
  return new Set(normalized as string[]);
}

function normalizeHostAuthority(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length > 255 || /[\s,\\/@?#%]/u.test(trimmed)) return null;

  try {
    const url = new URL(`https://${trimmed}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}
