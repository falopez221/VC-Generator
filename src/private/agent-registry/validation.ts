import type { TextRow } from "./types.ts";

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;
const MARKUP = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]*>/gi;
const FORMULA_PREFIX = /^[=+\-@]/;

export function normalizeHeader(value: unknown) {
  return safeCellText(value, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Treat cells as text only. Objects, functions, formulas and markup are never evaluated. */
export function safeCellText(value: unknown, maxLength = 500) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return "";
  const text = String(value)
    .replace(MARKUP, " ")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  // This keeps a future CSV/XLSX export from interpreting imported text as a formula.
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function textRow(value: unknown): TextRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row: Record<string, string> = {};
  for (const [key, cell] of Object.entries(value as Record<string, unknown>)) {
    const header = normalizeHeader(key);
    if (header) row[header] = safeCellText(cell);
  }
  return row;
}

export function readFirst(row: TextRow, aliases: readonly string[], maxLength = 500) {
  for (const alias of aliases) {
    const value = safeCellText(row[alias], maxLength);
    if (value) return value;
  }
  return "";
}

export function splitTags(value: unknown) {
  return [...new Set(safeCellText(value, 600)
    .split(/[,;|/]/)
    .map((tag) => safeCellText(tag, 48))
    .filter(Boolean))]
    .slice(0, 12);
}

export function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const normalized = safeCellText(value, 40).replace("%", "").replace(",", ".").trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(Math.min(max, Math.max(min, parsed)));
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Stable non-cryptographic key for deduplication and database IDs. */
export function deterministicId(prefix: string, parts: readonly string[]) {
  const source = parts.map((part) => safeCellText(part, 500).toLocaleLowerCase("en-US")).join("\u001f");
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}_${(hash >>> 0).toString(36).padStart(7, "0")}`;
}
