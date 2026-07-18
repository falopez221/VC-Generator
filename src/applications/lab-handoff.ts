const HANDOFF_TTL_MS = 10 * 60 * 1000;
const MAX_HANDOFF_BYTES = 4_000;
const ALLOWED_RISKS = new Set(["standard", "elevated", "high-impact", "critical"]);

export const APPLICATION_LAB_HANDOFF_KEY = "vg-application-lab-handoff-v1";

export type ApplicationLabHandoff = Readonly<{
  mission: string;
  domain: string;
  horizonYears: number;
  risk: string;
}>;

function safeText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, maximum)
    : "";
}

function safeHorizon(value: unknown) {
  const firstNumber = typeof value === "string" ? value.match(/\d+(?:\.\d+)?/)?.[0] : value;
  const numeric = Number(firstNumber);
  return Number.isFinite(numeric) ? Math.max(1, Math.min(25, Math.round(numeric))) : 5;
}

export function createApplicationLabHandoff(value: {
  question: unknown;
  domain: unknown;
  horizon: unknown;
  risk: unknown;
}, now = Date.now()) {
  return JSON.stringify({
    version: 1,
    expiresAt: now + HANDOFF_TTL_MS,
    mission: safeText(value.question, 1_200),
    domain: safeText(value.domain, 120),
    horizonYears: safeHorizon(value.horizon),
    risk: ALLOWED_RISKS.has(value.risk as string) ? value.risk : "elevated",
  });
}

export function parseApplicationLabHandoff(raw: string | null, now = Date.now()): ApplicationLabHandoff | null {
  if (!raw || raw.length > MAX_HANDOFF_BYTES) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return null;
    const expiresAt = typeof value.expiresAt === "number" ? value.expiresAt : Number.NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= now || expiresAt > now + HANDOFF_TTL_MS) return null;
    const mission = safeText(value.mission, 1_200);
    if (!mission) return null;
    return {
      mission,
      domain: safeText(value.domain, 120),
      horizonYears: safeHorizon(value.horizonYears),
      risk: ALLOWED_RISKS.has(value.risk as string) ? value.risk as string : "elevated",
    };
  } catch {
    return null;
  }
}
