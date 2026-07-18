import { clamp, round } from "./random.ts";
import type { AgentName } from "./types.ts";

export interface CompanyFinancialSnapshot {
  revenueM: number;
  ebitdaM: number;
  freeCashFlowM: number;
  cashM: number;
  debtM: number;
  sharesOutstandingM: number;
  currentPrice: number;
  beta: number;
}

export interface CompanyAnalysisRequest {
  companyName: string;
  ticker: string;
  financialStatement: string;
  earningsCall: string;
  growthPct: number;
  discountRatePct: number;
  terminalGrowthPct: number;
  ebitdaMultiple: number;
}

export interface EarningsCallSignals {
  toneScore: number;
  positiveSignals: string[];
  negativeSignals: string[];
  uncertaintySignals: string[];
  wordCount: number;
}

export interface CompanyAgentOpinion {
  agentName: AgentName;
  weightPct: number;
  score: number;
  confidence: number;
  observedEvidence: string[];
  assumptions: string[];
  inference: string;
  limitation: string;
}

export interface CompanyAnalysis {
  id: string;
  companyName: string;
  ticker: string;
  snapshot: CompanyFinancialSnapshot;
  signals: EarningsCallSignals;
  projectedFcffM: number[];
  dcfEquityValueM: number;
  dcfValuePerShare: number;
  multipleValuePerShare: number;
  blendedFairValuePerShare: number;
  marginOfSafetyPct: number;
  evidenceQuality: number;
  uncertainty: number;
  negativeBeta: boolean;
  verdict: string;
  agents: Record<AgentName, CompanyAgentOpinion>;
  warnings: string[];
  assumptions: string[];
}

export const COMPANY_AGENT_WEIGHTS: Record<AgentName, number> = {
  Mathematics: 25,
  Finance: 35,
  Strategy: 25,
  Marketing: 15,
};

export const SYNTHETIC_BETA_UNIVERSE = [
  { ticker: "NTHR", company: "North Harbor Utilities", sector: "Regulated utilities", beta: -0.18, evidence: "Synthetic five-year monthly return series" },
  { ticker: "GLCR", company: "Glacier Reinsurance", sector: "Reinsurance", beta: -0.11, evidence: "Synthetic five-year monthly return series" },
  { ticker: "ARCV", company: "Arcvale Royalties", sector: "Royalties", beta: -0.06, evidence: "Synthetic five-year monthly return series" },
  { ticker: "MNRL", company: "Mineral Loop", sector: "Recycling", beta: 0.04, evidence: "Synthetic five-year monthly return series" },
  { ticker: "PINE", company: "Pine Health Systems", sector: "Healthcare", beta: 0.21, evidence: "Synthetic five-year monthly return series" },
  { ticker: "CLRD", company: "Clear Delta Software", sector: "Software", beta: 0.68, evidence: "Synthetic five-year monthly return series" },
] as const;

const metricAliases: Record<keyof CompanyFinancialSnapshot, string[]> = {
  revenueM: ["revenue", "ingresos", "ventas"],
  ebitdaM: ["ebitda"],
  freeCashFlowM: ["free cash flow", "fcf", "flujo de caja libre", "flujo libre"],
  cashM: ["cash", "efectivo", "caja"],
  debtM: ["debt", "deuda"],
  sharesOutstandingM: ["shares outstanding", "diluted shares", "acciones en circulacion", "acciones diluidas", "acciones"],
  currentPrice: ["share price", "stock price", "current price", "precio por accion", "precio actual", "precio"],
  beta: ["beta"],
};

const positivePhrases = [
  "raised guidance", "guidance raised", "strong demand", "record backlog", "margin expansion", "pricing power", "retention improved",
  "subimos la guia", "elevamos la guia", "demanda fuerte", "cartera record", "expansion de margen", "poder de precios", "mejor retencion",
];
const negativePhrases = [
  "cut guidance", "lowered guidance", "weak demand", "margin pressure", "liquidity risk", "customer churn", "demand slowdown",
  "recortamos la guia", "bajamos la guia", "demanda debil", "presion de margen", "riesgo de liquidez", "perdida de clientes", "desaceleracion de demanda",
];
const uncertaintyPhrases = [
  "uncertain", "limited visibility", "may", "could", "volatile", "macro headwind", "incertidumbre", "visibilidad limitada", "podria", "volatil", "viento en contra",
];

function normalizeText(value: string, maximum: number) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim().slice(0, maximum);
}

function foldText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseLocalizedNumber(raw: string) {
  const negative = /^\s*\(/.test(raw) || /^\s*-/.test(raw);
  let cleaned = raw.replace(/[$€£%()\s]/g, "").replace(/[^0-9,.-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    cleaned = cleaned.replace(decimal === "," ? /\./g : /,/g, "").replace(decimal, ".");
  } else if (lastComma >= 0) {
    const decimals = cleaned.length - lastComma - 1;
    cleaned = decimals > 0 && decimals <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  }
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;
  return negative ? -Math.abs(value) : value;
}

export function parseFinancialStatement(rawText: string) {
  const text = normalizeText(rawText, 8_000);
  const lines = text.split(/\r?\n|;/).map((line) => foldText(line));
  const snapshot: Partial<CompanyFinancialSnapshot> = {};
  const foundMetrics: (keyof CompanyFinancialSnapshot)[] = [];
  for (const [metric, aliases] of Object.entries(metricAliases) as [keyof CompanyFinancialSnapshot, string[]][]) {
    for (const line of lines) {
      const alias = aliases.find((candidate) => new RegExp(`(^|\\b)${candidate.replace(/ /g, "\\s+")}\\b`, "i").test(line));
      if (!alias) continue;
      const aliasIndex = line.indexOf(alias);
      const rawNumber = line.slice(Math.max(0, aliasIndex + alias.length)).match(/[-(]?[\s$€£]*\d[\d.,\s]*\)?/)?.[0];
      const value = rawNumber ? parseLocalizedNumber(rawNumber) : null;
      if (value !== null) {
        snapshot[metric] = value;
        foundMetrics.push(metric);
        break;
      }
    }
  }
  return { snapshot, foundMetrics, sanitizedText: text };
}

function matchPhrases(text: string, phrases: string[]) {
  const folded = foldText(text);
  return phrases.filter((phrase) => folded.includes(foldText(phrase)));
}

export function analyzeEarningsCall(rawText: string): EarningsCallSignals {
  const text = normalizeText(rawText, 12_000);
  const positiveSignals = matchPhrases(text, positivePhrases);
  const negativeSignals = matchPhrases(text, negativePhrases);
  const uncertaintySignals = matchPhrases(text, uncertaintyPhrases);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const directionalCount = positiveSignals.length + negativeSignals.length;
  const directionalTone = directionalCount ? (positiveSignals.length - negativeSignals.length) / directionalCount * 100 : 0;
  const uncertaintyPenalty = Math.min(30, uncertaintySignals.length * 5);
  return {
    toneScore: round(clamp(directionalTone - uncertaintyPenalty, -100, 100), 1),
    positiveSignals,
    negativeSignals,
    uncertaintySignals,
    wordCount,
  };
}

function requireSnapshot(snapshot: Partial<CompanyFinancialSnapshot>): CompanyFinancialSnapshot {
  const required = Object.keys(metricAliases) as (keyof CompanyFinancialSnapshot)[];
  const missing = required.filter((metric) => !Number.isFinite(snapshot[metric]));
  if (missing.length) throw new Error(`Missing required metrics: ${missing.join(", ")}.`);
  const complete = snapshot as CompanyFinancialSnapshot;
  if (complete.revenueM <= 0 || complete.sharesOutstandingM <= 0 || complete.currentPrice <= 0) {
    throw new Error("Revenue, shares outstanding and current price must be greater than zero.");
  }
  return {
    revenueM: clamp(complete.revenueM, 0.01, 10_000_000),
    ebitdaM: clamp(complete.ebitdaM, -1_000_000, 10_000_000),
    freeCashFlowM: clamp(complete.freeCashFlowM, -1_000_000, 10_000_000),
    cashM: clamp(complete.cashM, 0, 10_000_000),
    debtM: clamp(complete.debtM, 0, 10_000_000),
    sharesOutstandingM: clamp(complete.sharesOutstandingM, 0.01, 10_000_000),
    currentPrice: clamp(complete.currentPrice, 0.01, 1_000_000),
    beta: clamp(complete.beta, -5, 10),
  };
}

function createAgentOpinions(
  snapshot: CompanyFinancialSnapshot,
  signals: EarningsCallSignals,
  evidenceQuality: number,
  uncertainty: number,
  fairValue: number,
  marginOfSafetyPct: number,
  request: CompanyAnalysisRequest,
) {
  const ebitdaMargin = snapshot.ebitdaM / snapshot.revenueM * 100;
  const fcfMargin = snapshot.freeCashFlowM / snapshot.revenueM * 100;
  const confidence = round(clamp(evidenceQuality - uncertainty * 0.25));
  const opinions: Record<AgentName, CompanyAgentOpinion> = {
    Mathematics: {
      agentName: "Mathematics", weightPct: COMPANY_AGENT_WEIGHTS.Mathematics,
      score: round(clamp(55 + evidenceQuality * 0.25 - uncertainty * 0.35)), confidence,
      observedEvidence: [`Beta supplied: ${snapshot.beta.toFixed(2)}.`, `${signals.wordCount} earnings-call words processed.`],
      assumptions: [`Discount rate ${request.discountRatePct.toFixed(1)}%; terminal growth ${request.terminalGrowthPct.toFixed(1)}%.`],
      inference: snapshot.beta < 0 ? "The supplied beta is negative; test stability across windows and benchmarks before interpreting it as defensive behavior." : "The supplied beta is not negative.",
      limitation: "Beta is backward-looking, benchmark-dependent and can change sign across regimes.",
    },
    Finance: {
      agentName: "Finance", weightPct: COMPANY_AGENT_WEIGHTS.Finance,
      score: round(clamp(50 + fcfMargin * 1.2 + ebitdaMargin * 0.45 + marginOfSafetyPct * 0.18)), confidence,
      observedEvidence: [`Revenue $${snapshot.revenueM.toFixed(1)}m; EBITDA margin ${ebitdaMargin.toFixed(1)}%.`, `Free-cash-flow margin ${fcfMargin.toFixed(1)}%.`],
      assumptions: [`Five-year FCF growth starts at ${request.growthPct.toFixed(1)}%.`, `Comparable EV/EBITDA multiple ${request.ebitdaMultiple.toFixed(1)}x.`],
      inference: `Blended fair-value estimate is $${fairValue.toFixed(2)} per share, a ${marginOfSafetyPct.toFixed(1)}% difference from the supplied price.`,
      limitation: "A DCF is highly sensitive to cash-flow, discount-rate and terminal-value assumptions.",
    },
    Strategy: {
      agentName: "Strategy", weightPct: COMPANY_AGENT_WEIGHTS.Strategy,
      score: round(clamp(50 + signals.toneScore * 0.22 + evidenceQuality * 0.18 - uncertainty * 0.2)), confidence,
      observedEvidence: [...signals.positiveSignals.slice(0, 2), ...signals.negativeSignals.slice(0, 2)].map((signal) => `Detected phrase: “${signal}”.`),
      assumptions: ["Management language is treated as a signal to verify, not proof of durable advantage."],
      inference: signals.toneScore > 15 ? "Management language leans constructive." : signals.toneScore < -15 ? "Management language leans cautious or adverse." : "Management language is mixed or non-directional.",
      limitation: "A transcript cannot establish moat, capital allocation quality or execution credibility by itself.",
    },
    Marketing: {
      agentName: "Marketing", weightPct: COMPANY_AGENT_WEIGHTS.Marketing,
      score: round(clamp(50 + (signals.positiveSignals.length - signals.negativeSignals.length) * 7 - signals.uncertaintySignals.length * 2)), confidence,
      observedEvidence: [`${signals.positiveSignals.length} positive and ${signals.negativeSignals.length} negative operating phrases detected.`],
      assumptions: ["Demand, retention and pricing phrases are imperfect proxies for customer behavior."],
      inference: signals.negativeSignals.some((signal) => signal.includes("demand") || signal.includes("demanda")) ? "Demand language requires customer-level corroboration." : "No explicit negative demand phrase was detected in the supplied excerpt.",
      limitation: "Keyword evidence misses context, irony, negation and segment-level differences.",
    },
  };
  return opinions;
}

export function analyzeCompany(request: CompanyAnalysisRequest): CompanyAnalysis {
  const companyName = normalizeText(request.companyName, 80) || "Unnamed company";
  const ticker = normalizeText(request.ticker, 12).replace(/[^A-Za-z0-9.-]/g, "").toUpperCase() || "N/A";
  const parsed = parseFinancialStatement(request.financialStatement);
  const snapshot = requireSnapshot(parsed.snapshot);
  const signals = analyzeEarningsCall(request.earningsCall);
  const growth = clamp(request.growthPct, -30, 50) / 100;
  const discountRate = clamp(request.discountRatePct, 5, 40) / 100;
  const terminalGrowth = Math.min(clamp(request.terminalGrowthPct, -5, 5) / 100, discountRate - 0.01);
  const multiple = clamp(request.ebitdaMultiple, 0, 40);
  const projectedFcffM: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const fadedGrowth = growth + (terminalGrowth - growth) * (index / 5);
    const previous = index === 0 ? snapshot.freeCashFlowM : projectedFcffM[index - 1];
    projectedFcffM.push(round(previous * (1 + fadedGrowth), 2));
  }
  const forecastPv = projectedFcffM.reduce((sum, value, index) => sum + value / ((1 + discountRate) ** (index + 1)), 0);
  const finalFcff = projectedFcffM.at(-1) ?? 0;
  const terminalAtYearFive = finalFcff > 0 ? finalFcff * (1 + terminalGrowth) / (discountRate - terminalGrowth) : 0;
  const enterpriseValueM = forecastPv + terminalAtYearFive / ((1 + discountRate) ** 5);
  const dcfEquityValueM = enterpriseValueM + snapshot.cashM - snapshot.debtM;
  const dcfValuePerShare = Math.max(0, dcfEquityValueM / snapshot.sharesOutstandingM);
  const multipleEquityM = Math.max(0, snapshot.ebitdaM * multiple + snapshot.cashM - snapshot.debtM);
  const multipleValuePerShare = multipleEquityM / snapshot.sharesOutstandingM;
  const blendedFairValuePerShare = dcfValuePerShare * 0.7 + multipleValuePerShare * 0.3;
  const marginOfSafetyPct = (blendedFairValuePerShare / snapshot.currentPrice - 1) * 100;
  const evidenceQuality = round(clamp(parsed.foundMetrics.length / Object.keys(metricAliases).length * 70 + Math.min(1, signals.wordCount / 250) * 30));
  const uncertainty = round(clamp(100 - evidenceQuality + Math.abs(request.growthPct - request.terminalGrowthPct) * 0.55 + (signals.uncertaintySignals.length * 3)));
  const evidenceCapped = evidenceQuality < 60 || uncertainty > 45;
  const verdict = evidenceCapped
    ? "Valuación inconclusa: hace falta más evidencia primaria"
    : marginOfSafetyPct >= 20
      ? "Potencialmente por debajo del valor razonable estimado"
      : marginOfSafetyPct <= -20
        ? "Potencialmente por encima del valor razonable estimado"
        : "Dentro de una banda razonable bajo estos supuestos";
  const agents = createAgentOpinions(snapshot, signals, evidenceQuality, uncertainty, blendedFairValuePerShare, marginOfSafetyPct, request);
  const fingerprint = `${ticker}:${snapshot.revenueM}:${snapshot.freeCashFlowM}:${snapshot.currentPrice}:${request.growthPct}:${request.discountRatePct}`;
  return {
    id: `company-${Array.from(fingerprint).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36)}`,
    companyName, ticker, snapshot, signals, projectedFcffM,
    dcfEquityValueM: round(dcfEquityValueM, 2),
    dcfValuePerShare: round(dcfValuePerShare, 2),
    multipleValuePerShare: round(multipleValuePerShare, 2),
    blendedFairValuePerShare: round(blendedFairValuePerShare, 2),
    marginOfSafetyPct: round(marginOfSafetyPct, 1),
    evidenceQuality,
    uncertainty,
    negativeBeta: snapshot.beta < 0,
    verdict,
    agents,
    warnings: [
      "The financial figures and beta are user-supplied and are not independently verified.",
      "The earnings-call reader uses deterministic phrase matching, not a language model or private prompt.",
      ...(snapshot.beta < 0 ? ["Negative beta is not a stable hedge guarantee and does not make the company attractive by itself."] : []),
    ],
    assumptions: [
      `DCF blend 70%; EV/EBITDA comparable blend 30%.`,
      `Five-year starting FCF growth ${clamp(request.growthPct, -30, 50).toFixed(1)}%.`,
      `Discount rate ${clamp(request.discountRatePct, 5, 40).toFixed(1)}%; terminal growth ${(terminalGrowth * 100).toFixed(1)}%.`,
      `Comparable multiple ${multiple.toFixed(1)}x EV/EBITDA.`,
    ],
  };
}

export function screenNegativeBetas() {
  return SYNTHETIC_BETA_UNIVERSE.filter((company) => company.beta < 0).sort((a, b) => a.beta - b.beta);
}
