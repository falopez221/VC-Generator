const MAX_EMAIL_LENGTH = 254;

type HeaderInput = string | undefined | null;

export type AerialIdentity = {
  email: string;
  role?: string;
};

export type PrivateAerialAuthorizationEnvironment = {
  [name: string]: string | undefined;
  VG_AERIAL_SIMULATION_OWNER_EMAIL?: string;
  VG_AERIAL_SIMULATION_OWNER_EMAILS?: string;
  VG_OWNER_EMAIL?: string;
  VG_LOCAL_DEV_USER_EMAIL?: string;
  VG_LOCAL_DEV_MODE?: string;
  VG_LOCAL_INSTALL_MODE?: string;
  VG_LOCAL_BIND_ADDRESS?: string;
  NODE_ENV?: string;
  VERCEL?: string;
};

export type PrivateAerialAuthorizationDecision =
  | { authorized: true; email: string }
  | { authorized: false; reason: "identity_missing" | "identity_invalid" | "configuration_missing" | "not_authorized" };

export const AERIAL_SIMULATION_ROOT = "/app/aerial-simulation";
export const AERIAL_SIMULATION_ACCESS_PATH = "/app/aerial-simulation-access";

const PRIVATE_AERIAL_CONFIG_VALUES = [
  "VG_AERIAL_SIMULATION_OWNER_EMAIL",
  "VG_AERIAL_SIMULATION_OWNER_EMAILS",
] as const;

export function configuredAerialOwners(environment: PrivateAerialAuthorizationEnvironment): ReadonlySet<string> {
  const values = [
    environment.VG_AERIAL_SIMULATION_OWNER_EMAIL,
    ...(environment.VG_AERIAL_SIMULATION_OWNER_EMAILS ?? "").split(","),
  ];
  return new Set(
    values
      .map((value) => normalizeAerialEmail(value))
      .filter((value): value is string => Boolean(value)),
  );
}

export function hasDedicatedAerialConfig(environment: PrivateAerialAuthorizationEnvironment): boolean {
  return PRIVATE_AERIAL_CONFIG_VALUES.some((name) => Boolean(environment[name]?.trim()));
}

/**
 * Dedicated authorization for aerial simulation private surface.
 *
 * This remains fully server-side and fails closed when credentials are
 * misconfigured or the identity does not match the allowlisted value.
 */
export function evaluateAerialPrivateAuthorization(
  identity: AerialIdentity | null | undefined,
  environment: PrivateAerialAuthorizationEnvironment = process.env,
): PrivateAerialAuthorizationDecision {
  if (!identity) return { authorized: false, reason: "identity_missing" };
  const email = normalizeAerialEmail(identity.email);
  if (!email) return { authorized: false, reason: "identity_invalid" };
  if (identity.role !== "System Admin" && identity.role !== "Demo User") {
    return { authorized: false, reason: "not_authorized" };
  }

  const dedicated = hasDedicatedAerialConfig(environment);
  if (dedicated) {
    const owners = configuredAerialOwners(environment);
    if (owners.size === 0) return { authorized: false, reason: "configuration_missing" };
    return owners.has(email)
      ? { authorized: true, email }
      : { authorized: false, reason: "not_authorized" };
  }

  const fallbackOwner = normalizeAerialEmail(environment.VG_OWNER_EMAIL);
  const localOwner = normalizeAerialEmail(environment.VG_LOCAL_DEV_USER_EMAIL);
  const localModeEnabled = environment.VERCEL !== "1" && isLocalModeEnabled(environment);

  if (!fallbackOwner && !(localModeEnabled && localOwner)) return { authorized: false, reason: "configuration_missing" };
  if (email === fallbackOwner || (localModeEnabled && email === localOwner)) {
    return { authorized: true, email };
  }
  return { authorized: false, reason: "not_authorized" };
}

export function hasAerialPrivateAuthorization(
  identity: AerialIdentity | null | undefined,
  environment: PrivateAerialAuthorizationEnvironment = process.env,
): boolean {
  return evaluateAerialPrivateAuthorization(identity, environment).authorized;
}

/** Keeps every post-authentication redirect inside the aerial lab subtree. */
export function sanitizeAerialReturnPath(value: unknown): string {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || /[\\\u0000-\u001f\u007f]/u.test(value)
  ) return AERIAL_SIMULATION_ROOT;

  try {
    const url = new URL(value, "https://private.local");
    const isAerialPath = url.pathname === AERIAL_SIMULATION_ROOT
      || url.pathname.startsWith(`${AERIAL_SIMULATION_ROOT}/`);
    if (url.origin !== "https://private.local" || !isAerialPath) {
      return AERIAL_SIMULATION_ROOT;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return AERIAL_SIMULATION_ROOT;
  }
}

export function normalizeAerialEmail(value: HeaderInput): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (
    !email
    || email.length > MAX_EMAIL_LENGTH
    || /[\s\u0000-\u001f\u007f]/u.test(email)
    || email.indexOf("@") <= 0
    || email.indexOf("@") !== email.lastIndexOf("@")
  ) return null;

  const at = email.indexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local)
    || local.length > 64
    || local.startsWith(".")
    || local.endsWith(".")
    || local.includes("..")
  ) return null;
  if (!/^[a-z0-9.-]+$/u.test(domain) || domain.length > 253) return null;
  const labels = domain.split(".");
  if (labels.some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) return null;

  return email;
}

function isLocalModeEnabled(environment: PrivateAerialEnvironmentSubset): boolean {
  const modeEnabled = Boolean(
    environment.VG_LOCAL_INSTALL_MODE === "1"
    || (environment.NODE_ENV === "development" && environment.VG_LOCAL_DEV_MODE === "1"),
  );
  return modeEnabled && isLoopbackAuthority(environment.VG_LOCAL_BIND_ADDRESS);
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

type PrivateAerialEnvironmentSubset = Pick<
  PrivateAerialAuthorizationEnvironment,
  "VG_LOCAL_INSTALL_MODE" | "VG_LOCAL_DEV_MODE" | "VG_LOCAL_BIND_ADDRESS" | "NODE_ENV"
>;
