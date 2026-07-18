import type { PrivateCatalogAgent } from "./types.ts";

export type SensitivityLens = "uncertainty" | "unit_economics" | "capital" | "market" | "horizon";
export type AgentRecommendation = Pick<PrivateCatalogAgent, "id" | "displayName" | "domain" | "specialization" | "capabilitySummary"> & { score: number; reasons: string[] };

const SENSITIVITY_TERMS: Record<SensitivityLens, readonly string[]> = {
  uncertainty: ["probabilidad", "estadística", "riesgo", "sensibilidad", "model", "incertidumbre"],
  unit_economics: ["finanzas", "economía", "precio", "margen", "cost", "operaciones"],
  capital: ["finanzas", "capital", "venture", "mercados", "inversión", "contabilidad"],
  market: ["marketing", "mercado", "comercial", "demanda", "cliente", "industria"],
  horizon: ["estrategia", "prospectiva", "planificación", "sistemas", "logística", "política"],
};

function cleanText(value: unknown, maximum = 800) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

function words(value: string) {
  return [...new Set(value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3))];
}

/** Transparent, deterministic routing. It recommends documentation, never runs an agent. */
export function recommendPrivateAgents(catalog: readonly PrivateCatalogAgent[], prompt: unknown, lenses: readonly SensitivityLens[], limit = 3): AgentRecommendation[] {
  const promptWords = words(cleanText(prompt));
  const selectedLenses = [...new Set(lenses)].filter((lens): lens is SensitivityLens => lens in SENSITIVITY_TERMS);
  const fallbackLenses: SensitivityLens[] = selectedLenses.length ? selectedLenses : ["uncertainty", "unit_economics"];
  const boundedLimit = Math.min(5, Math.max(1, Math.floor(limit)));

  return catalog.map((agent) => {
    const title = `${agent.displayName} ${agent.domain} ${agent.specialization}`.toLocaleLowerCase();
    const detail = agent.capabilitySummary.toLocaleLowerCase();
    const reasons: string[] = [];
    let score = 0;
    const matches = promptWords.filter((word) => title.includes(word) || detail.includes(word));
    if (matches.length) { score += matches.length * 3; reasons.push(`Mission terms: ${matches.slice(0, 3).join(", ")}`); }
    for (const lens of fallbackLenses) {
      const matchedTerm = SENSITIVITY_TERMS[lens].find((term) => title.includes(term) || detail.includes(term));
      if (matchedTerm) { score += 2; reasons.push(`${lens.replace("_", " ")}: ${matchedTerm}`); }
    }
    if (agent.domain === "Matemática" && fallbackLenses.includes("uncertainty")) score += 1;
    if (agent.domain === "Finanzas" && (fallbackLenses.includes("capital") || fallbackLenses.includes("unit_economics"))) score += 1;
    return { id: agent.id, displayName: agent.displayName, domain: agent.domain, specialization: agent.specialization, capabilitySummary: agent.capabilitySummary, score, reasons: reasons.length ? reasons : ["Fallback coverage for the selected sensitivity lenses"] };
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, boundedLimit);
}

export function parseSensitivityLenses(value: unknown): SensitivityLens[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SensitivityLens => typeof item === "string" && item in SENSITIVITY_TERMS).slice(0, 5);
}
