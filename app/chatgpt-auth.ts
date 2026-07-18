import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return localRuntimeUser();

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function authorizeChatGPTUser(user: ChatGPTUser): AuthorizedChatGPTUser | null {
  if (process.env.VERCEL === "1") return null;
  const email = user.email.trim().toLowerCase();
  const localEmail = process.env.VG_LOCAL_DEV_USER_EMAIL?.trim().toLowerCase();
  const developmentMode = process.env.NODE_ENV === "development" && process.env.VG_LOCAL_DEV_MODE === "1";
  const installedMode = process.env.VG_LOCAL_INSTALL_MODE === "1";
  if ((developmentMode || installedMode) && localEmail && email === localEmail) {
    return { ...user, role: "System Admin" };
  }
  const ownerEmail = process.env.VG_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && email === ownerEmail) return { ...user, role: "System Admin" };

  const allowed = (process.env.VG_AUTHORIZED_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email) ? { ...user, role: "Demo User" } : null;
}

export async function requireAuthorizedChatGPTUser(
  returnTo: string,
): Promise<AuthorizedChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  const authorized = authorizeChatGPTUser(user);
  if (authorized) return authorized;

  redirect("/app/login?reason=not-authorized");
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
  const developmentMode = process.env.NODE_ENV === "development" && process.env.VG_LOCAL_DEV_MODE === "1";
  const installedMode = process.env.VG_LOCAL_INSTALL_MODE === "1" && isLoopbackHost(process.env.VG_LOCAL_BIND_ADDRESS ?? null);
  if (!developmentMode && !installedMode) return null;
  const email = process.env.VG_LOCAL_DEV_USER_EMAIL?.trim();
  if (!email) return null;
  const fullName = process.env.VG_LOCAL_DEV_USER_NAME?.trim() || "Local Operator";
  return { displayName: fullName, email, fullName };
}

function isLoopbackHost(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "localhost" || normalized.startsWith("localhost:") || normalized === "127.0.0.1" || normalized.startsWith("127.0.0.1:") || normalized === "[::1]" || normalized.startsWith("[::1]:");
}
