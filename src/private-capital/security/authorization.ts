export const PRIVATE_CAPITAL_OWNER_ROLE = "private_capital_owner" as const;

export type PrivateCapitalOwnerRole = typeof PRIVATE_CAPITAL_OWNER_ROLE;

export type PrivateCapitalIdentity = {
  email: string;
  role?: string;
};

export type PrivateCapitalOwner = {
  email: string;
  role: PrivateCapitalOwnerRole;
};

export type PrivateCapitalAuthorizationFailureReason =
  | "identity_missing"
  | "identity_invalid"
  | "owner_not_configured"
  | "owner_not_authorized";

export type PrivateCapitalAuthorizationDecision =
  | { authorized: true; owner: PrivateCapitalOwner }
  | { authorized: false; reason: PrivateCapitalAuthorizationFailureReason };

export type PrivateCapitalAuthorizationEnvironment = {
  [name: string]: string | undefined;
  VG_PRIVATE_CAPITAL_OWNER_EMAIL?: string;
  VG_PRIVATE_CAPITAL_OWNER_EMAILS?: string;
  VG_OWNER_EMAIL?: string;
  VG_LOCAL_DEV_USER_EMAIL?: string;
  VG_LOCAL_DEV_MODE?: string;
  VG_LOCAL_INSTALL_MODE?: string;
  VG_LOCAL_BIND_ADDRESS?: string;
  NODE_ENV?: string;
  VERCEL?: string;
};

const MAX_EMAIL_LENGTH = 254;
const PRIVATE_CAPITAL_ROOT = "/app/private-capital-intelligence";
const BASE_WORKSPACE_ROLES = new Set(["System Admin", "Demo User"]);

/** Restricts post-authentication navigation to the protected route subtree. */
export function sanitizePrivateCapitalReturnPath(value: unknown): string {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || /[\\\u0000-\u001f\u007f]/u.test(value)
  ) return PRIVATE_CAPITAL_ROOT;

  try {
    const url = new URL(value, "https://private.local");
    const isPrivatePath = url.pathname === PRIVATE_CAPITAL_ROOT
      || url.pathname.startsWith(`${PRIVATE_CAPITAL_ROOT}/`);
    if (url.origin !== "https://private.local" || !isPrivatePath) {
      return PRIVATE_CAPITAL_ROOT;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return PRIVATE_CAPITAL_ROOT;
  }
}

/**
 * Normalizes an email address for exact authorization comparisons.
 *
 * This intentionally accepts a conservative ASCII subset. Authorization must
 * never depend on partial matches, display-name syntax or ambiguous whitespace.
 */
export function normalizePrivateCapitalEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || /[\s\u0000-\u001f\u007f]/u.test(email)) return null;

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (
    local.length > 64
    || local.startsWith(".")
    || local.endsWith(".")
    || local.includes("..")
    || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local)
  ) return null;
  if (domain.length > 253 || !/^[a-z0-9.-]+$/u.test(domain)) return null;

  const labels = domain.split(".");
  if (
    labels.some((label) => (
      !label
      || label.length > 63
      || label.startsWith("-")
      || label.endsWith("-")
    ))
  ) return null;
  return email;
}

export function configuredPrivateCapitalOwnerEmails(
  environment: PrivateCapitalAuthorizationEnvironment,
): ReadonlySet<string> {
  const values = [
    environment.VG_PRIVATE_CAPITAL_OWNER_EMAIL,
    ...(environment.VG_PRIVATE_CAPITAL_OWNER_EMAILS ?? "").split(","),
  ];
  return new Set(
    values
      .map((value) => normalizePrivateCapitalEmail(value))
      .filter((value): value is string => value !== null),
  );
}

/**
 * Pure, server-oriented authorizer for pages and APIs. It fails closed.
 *
 * Dedicated configuration takes precedence. The existing workspace owner and
 * trusted local operator are compatibility fallbacks only when neither
 * dedicated variable is set, and only after the existing auth layer has marked
 * the identity as System Admin.
 */
export function authorizePrivateCapitalOwner(
  identity: PrivateCapitalIdentity | null | undefined,
  environment: PrivateCapitalAuthorizationEnvironment = process.env,
): PrivateCapitalOwner | null {
  const decision = evaluatePrivateCapitalAuthorization(identity, environment);
  return decision.authorized ? decision.owner : null;
}

/**
 * Produces one server-side authorization decision and a safe audit reason.
 * It never accepts a role or owner identifier supplied by a browser request.
 */
export function evaluatePrivateCapitalAuthorization(
  identity: PrivateCapitalIdentity | null | undefined,
  environment: PrivateCapitalAuthorizationEnvironment = process.env,
): PrivateCapitalAuthorizationDecision {
  if (!identity) return { authorized: false, reason: "identity_missing" };
  if (environment.VERCEL === "1") {
    return { authorized: false, reason: "owner_not_authorized" };
  }
  const email = normalizePrivateCapitalEmail(identity.email);
  if (!email) return { authorized: false, reason: "identity_invalid" };
  // Private Capital is an additional authorization layer. A trusted Sites or
  // local identity must first have been granted a base workspace role by
  // authorizeChatGPTUser(); the dedicated email setting cannot bypass it.
  if (!identity.role || !BASE_WORKSPACE_ROLES.has(identity.role)) {
    return { authorized: false, reason: "owner_not_authorized" };
  }

  const dedicatedConfigurationPresent = hasDedicatedOwnerConfiguration(environment);
  if (dedicatedConfigurationPresent) {
    const configuredOwners = configuredPrivateCapitalOwnerEmails(environment);
    if (configuredOwners.size === 0) {
      return { authorized: false, reason: "owner_not_configured" };
    }
    return configuredOwners.has(email)
      ? { authorized: true, owner: { email, role: PRIVATE_CAPITAL_OWNER_ROLE } }
      : { authorized: false, reason: "owner_not_authorized" };
  }

  const existingOwner = normalizePrivateCapitalEmail(environment.VG_OWNER_EMAIL);
  const localOwner = normalizePrivateCapitalEmail(environment.VG_LOCAL_DEV_USER_EMAIL);
  const trustedLocalOwner = localOwner && hasConfiguredTrustedLocalMode(environment)
    ? localOwner
    : null;
  if (!existingOwner && !trustedLocalOwner) {
    return { authorized: false, reason: "owner_not_configured" };
  }
  if (identity.role !== "System Admin") {
    return { authorized: false, reason: "owner_not_authorized" };
  }
  if (existingOwner === email || trustedLocalOwner === email) {
    return { authorized: true, owner: { email, role: PRIVATE_CAPITAL_OWNER_ROLE } };
  }
  return { authorized: false, reason: "owner_not_authorized" };
}

function hasDedicatedOwnerConfiguration(
  environment: PrivateCapitalAuthorizationEnvironment,
): boolean {
  return [
    environment.VG_PRIVATE_CAPITAL_OWNER_EMAIL,
    environment.VG_PRIVATE_CAPITAL_OWNER_EMAILS,
  ].some((value) => typeof value === "string" && value.trim().length > 0);
}

function hasConfiguredTrustedLocalMode(
  environment: PrivateCapitalAuthorizationEnvironment,
): boolean {
  const modeEnabled = environment.VG_LOCAL_INSTALL_MODE === "1"
    || (environment.NODE_ENV === "development" && environment.VG_LOCAL_DEV_MODE === "1");
  return modeEnabled
    && environment.VERCEL !== "1"
    && isLoopbackAuthority(environment.VG_LOCAL_BIND_ADDRESS);
}

function isLoopbackAuthority(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === "::1") return true;
  if (!normalized || /[\s,\\/@?#]/u.test(normalized)) return false;
  try {
    const url = new URL(`http://${normalized}`);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
    const hostname = url.hostname.replace(/^\[|\]$/gu, "");
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}
