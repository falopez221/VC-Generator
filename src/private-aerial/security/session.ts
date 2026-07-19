import { normalizeAerialEmail } from "./authorization.ts";

const SESSION_VERSION = "v1";
const SESSION_TTL_SECONDS = 4 * 60 * 60;
const MAX_CLOCK_SKEW_SECONDS = 60;
const MIN_CREDENTIAL_BYTES = 20;
const MAX_CREDENTIAL_BYTES = 512;
const MAX_TOKEN_LENGTH = 512;
const BASE64URL = /^[A-Za-z0-9_-]+$/u;

export const AERIAL_LAB_SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;

export type AerialLabSessionEnvironment = {
  [name: string]: string | undefined;
  NODE_ENV?: string;
  VG_AERIAL_LAB_CREDENTIAL?: string;
  VG_AERIAL_LAB_SESSION_SECRET?: string;
};

export type AerialLabSessionDecision =
  | { valid: true; expiresAt: number }
  | { valid: false; reason: "missing" | "malformed" | "expired" | "identity_mismatch" | "configuration_missing" };

export function aerialLabSessionCookieName(
  environment: AerialLabSessionEnvironment = process.env,
): string {
  return environment.NODE_ENV === "production"
    ? "__Secure-vg-aerial-lab"
    : "vg-aerial-lab";
}

export function hasAerialLabAccessConfiguration(
  environment: AerialLabSessionEnvironment = process.env,
): boolean {
  return validCredential(environment.VG_AERIAL_LAB_CREDENTIAL) !== null
    && sessionSecret(environment) !== null;
}

/**
 * Verifies the dedicated lab credential without returning or logging either
 * value. Web Crypto performs the HMAC comparison in constant time.
 */
export async function verifyAerialLabCredential(
  candidate: unknown,
  environment: AerialLabSessionEnvironment = process.env,
): Promise<boolean> {
  const received = validCredential(candidate);
  const configured = validCredential(environment.VG_AERIAL_LAB_CREDENTIAL);
  const secret = sessionSecret(environment);
  if (!received || !configured || !secret) return false;

  const key = await importHmacKey(secret, ["sign", "verify"]);
  const expectedProof = await crypto.subtle.sign(
    "HMAC",
    key,
    encode(`credential\u0000${configured}`),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    expectedProof,
    encode(`credential\u0000${received}`),
  );
}

export async function createAerialLabSessionToken(
  email: string,
  environment: AerialLabSessionEnvironment = process.env,
  now = Date.now(),
): Promise<string | null> {
  const normalizedEmail = normalizeAerialEmail(email);
  const secret = sessionSecret(environment);
  if (!normalizedEmail || !secret || !Number.isFinite(now)) return null;

  const issuedAt = Math.floor(now / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const subject = await sessionSubject(normalizedEmail, secret);
  const nonce = randomBase64Url(16);
  const payload = `${SESSION_VERSION}.${issuedAt}.${expiresAt}.${subject}.${nonce}`;
  const signature = await signSessionPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyAerialLabSessionToken(
  token: unknown,
  email: string,
  environment: AerialLabSessionEnvironment = process.env,
  now = Date.now(),
): Promise<AerialLabSessionDecision> {
  if (typeof token !== "string" || token.length === 0) {
    return { valid: false, reason: "missing" };
  }
  const normalizedEmail = normalizeAerialEmail(email);
  const secret = sessionSecret(environment);
  if (!secret) return { valid: false, reason: "configuration_missing" };
  if (!normalizedEmail || token.length > MAX_TOKEN_LENGTH) {
    return { valid: false, reason: "malformed" };
  }

  const parts = token.split(".");
  if (parts.length !== 6 || parts[0] !== SESSION_VERSION) {
    return { valid: false, reason: "malformed" };
  }
  const [, issuedRaw, expiresRaw, subject, nonce, signature] = parts;
  if (
    !/^[0-9]{10}$/u.test(issuedRaw)
    || !/^[0-9]{10}$/u.test(expiresRaw)
    || !isCanonicalBase64Url(subject, 32)
    || !isCanonicalBase64Url(nonce, 16)
    || !isCanonicalBase64Url(signature, 32)
  ) return { valid: false, reason: "malformed" };

  const issuedAt = Number(issuedRaw);
  const expiresAt = Number(expiresRaw);
  const nowSeconds = Math.floor(now / 1000);
  if (
    !Number.isSafeInteger(issuedAt)
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= issuedAt
    || expiresAt - issuedAt !== SESSION_TTL_SECONDS
    || issuedAt > nowSeconds + MAX_CLOCK_SKEW_SECONDS
  ) return { valid: false, reason: "malformed" };
  if (expiresAt <= nowSeconds) return { valid: false, reason: "expired" };

  const payload = parts.slice(0, 5).join(".");
  const key = await importHmacKey(secret, ["verify"]);
  const signatureValid = await crypto.subtle.verify(
    "HMAC",
    key,
    toArrayBuffer(decodeBase64Url(signature)),
    encode(`session\u0000${payload}`),
  );
  if (!signatureValid) return { valid: false, reason: "malformed" };

  const expectedSubject = await sessionSubject(normalizedEmail, secret);
  if (subject !== expectedSubject) {
    return { valid: false, reason: "identity_mismatch" };
  }
  return { valid: true, expiresAt };
}

function validCredential(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const bytes = encode(value);
  if (
    bytes.byteLength < MIN_CREDENTIAL_BYTES
    || bytes.byteLength > MAX_CREDENTIAL_BYTES
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) return null;
  return value;
}

function sessionSecret(environment: AerialLabSessionEnvironment): Uint8Array | null {
  const value = environment.VG_AERIAL_LAB_SESSION_SECRET;
  if (!value || !BASE64URL.test(value)) return null;
  try {
    const bytes = decodeBase64Url(value);
    if (bytes.byteLength < 32 || bytes.byteLength > 96) return null;
    return encodeBase64Url(bytes) === value ? bytes : null;
  } catch {
    return null;
  }
}

async function sessionSubject(email: string, secret: Uint8Array): Promise<string> {
  const key = await importHmacKey(secret, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encode(`subject\u0000${email}`));
  return encodeBase64Url(new Uint8Array(digest));
}

async function signSessionPayload(payload: string, secret: Uint8Array): Promise<string> {
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encode(`session\u0000${payload}`));
  return encodeBase64Url(new Uint8Array(signature));
}

async function importHmacKey(secret: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

function encode(value: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(value));
}

function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isCanonicalBase64Url(value: string, expectedBytes: number): boolean {
  if (!BASE64URL.test(value)) return false;
  try {
    const bytes = decodeBase64Url(value);
    return bytes.byteLength === expectedBytes && encodeBase64Url(bytes) === value;
  } catch {
    return false;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
