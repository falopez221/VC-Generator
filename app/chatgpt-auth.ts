import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasValidLocalGateway } from "@/src/security/local-runtime-trust";
import { hasTrustedSitesIdentityContext } from "@/src/security/sites-auth-trust";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export type AuthorizedChatGPTUser = ChatGPTUser & {
  role: "System Admin" | "Demo User";
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const MAX_EMAIL_LENGTH = 254;
const MAX_FULL_NAME_LENGTH = 160;

type HeaderReader = {
  get(name: string): string | null;
};

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  if (process.env.VERCEL === "1") return null;

  const localRuntime = isLocalRuntimeRequest(requestHeaders);
  const trustedSitesRuntime = hasTrustedSitesIdentityContext(requestHeaders, null, {
    VG_TRUST_CHATGPT_AUTH_HEADERS: process.env.VG_TRUST_CHATGPT_AUTH_HEADERS,
    VG_TRUSTED_SITES_HOSTS: process.env.VG_TRUSTED_SITES_HOSTS,
  });
  if (!trustedSitesRuntime && !localRuntime) return null;

  const headerUser = userFromAuthenticatedHeaders(requestHeaders);
  if (headerUser) return headerUser;
  return localRuntime ? localRuntimeUser() : null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
  throw new Error("ChatGPT sign-in redirect did not terminate the request.");
}

export function authorizeChatGPTUser(user: ChatGPTUser): AuthorizedChatGPTUser | null {
  if (process.env.VERCEL === "1") return null;
  const sanitizedUser = sanitizeUser(user);
  if (!sanitizedUser) return null;

  const email = sanitizedUser.email;
  const localEmail = sanitizeEmail(process.env.VG_LOCAL_DEV_USER_EMAIL ?? null);
  if (isLocalModeConfigured() && localEmail && email === localEmail) {
    return { ...sanitizedUser, role: "System Admin" };
  }
  const ownerEmail = sanitizeEmail(process.env.VG_OWNER_EMAIL ?? null);
  if (ownerEmail && email === ownerEmail) return { ...sanitizedUser, role: "System Admin" };

  const allowed = (process.env.VG_AUTHORIZED_EMAILS ?? "")
    .split(",")
    .map((value) => sanitizeEmail(value))
    .filter((value): value is string => value !== null);

  return allowed.includes(email) ? { ...sanitizedUser, role: "Demo User" } : null;
}

export async function requireAuthorizedChatGPTUser(
  returnTo: string,
): Promise<AuthorizedChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  const authorized = authorizeChatGPTUser(user);
  if (authorized) return authorized;

  redirect("/app/login?reason=not-authorized");
  throw new Error("Authorization redirect did not terminate the request.");
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function localRuntimeUser(): ChatGPTUser | null {
  const email = sanitizeEmail(process.env.VG_LOCAL_DEV_USER_EMAIL ?? null);
  if (!email) return null;
  const fullName = sanitizeDisplayText(process.env.VG_LOCAL_DEV_USER_NAME ?? null) ?? "Local Operator";
  return { displayName: fullName, email, fullName };
}

function userFromAuthenticatedHeaders(requestHeaders: HeaderReader): ChatGPTUser | null {
  const email = sanitizeEmail(requestHeaders.get(USER_EMAIL_HEADER));
  if (!email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const decodedFullName = encodedFullName
    && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
    ? safeDecodeURIComponent(encodedFullName)
    : null;
  const fullName = sanitizeDisplayText(decodedFullName);
  return { displayName: fullName ?? email, email, fullName };
}

function sanitizeUser(user: ChatGPTUser): ChatGPTUser | null {
  const email = sanitizeEmail(user.email);
  if (!email) return null;
  const fullName = sanitizeDisplayText(user.fullName);
  const displayName = sanitizeDisplayText(user.displayName) ?? fullName ?? email;
  return { displayName, email, fullName };
}

function sanitizeEmail(value: string | null): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH || /[\s\u0000-\u001f\u007f]/u.test(email)) return null;

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length > 64 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local)) return null;
  if (domain.length > 253 || !/^[a-z0-9.-]+$/u.test(domain)) return null;
  const labels = domain.split(".");
  if (labels.some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) return null;
  return email;
}

function sanitizeDisplayText(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!normalized) return null;
  return Array.from(normalized).slice(0, MAX_FULL_NAME_LENGTH).join("");
}

function isLocalRuntimeRequest(requestHeaders: HeaderReader): boolean {
  if (!isLocalModeConfigured()) return false;
  const installedMode = process.env.VG_LOCAL_INSTALL_MODE === "1";
  if (installedMode && !hasValidLocalGateway(requestHeaders, process.env)) return false;
  const hosts = [requestHeaders.get("host"), requestHeaders.get("x-forwarded-host")].filter(
    (value): value is string => Boolean(value),
  );
  return hosts.length > 0 && hosts.every((host) => isLoopbackHost(host));
}

function isLocalModeConfigured(): boolean {
  if (process.env.VERCEL === "1") return false;
  const developmentMode = process.env.NODE_ENV === "development" && process.env.VG_LOCAL_DEV_MODE === "1";
  const installedMode = process.env.VG_LOCAL_INSTALL_MODE === "1";
  return (developmentMode || installedMode)
    && isLoopbackHost(process.env.VG_LOCAL_BIND_ADDRESS ?? null);
}

function isLoopbackHost(value: string | null): boolean {
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
