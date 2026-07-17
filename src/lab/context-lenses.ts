import { clamp, round } from "./random.ts";
import type { DimensionKey, LabInput, Opportunity } from "./types.ts";

export type ContextLensName = "Defensibility" | "Macroeconomics";

export interface ContextLensResult {
  name: ContextLensName;
  score: number;
  exposure: number;
  status: "Resilient" | "Watch" | "Exposed";
  summary: string;
  drivers: string[];
  assumptions: string[];
  missingEvidence: string[];
}

interface InputSignals {
  regulated: number;
  physical: number;
  software: number;
  network: number;
  consumer: number;
  enterprise: number;
  defense: number;
  macroSensitive: number;
  evidenceQuality: number;
  dimensionAdjustments: Record<DimensionKey, number>;
}

const SIGNAL_PATTERNS = {
  regulated: /defen[cs]e|defensa|military|militar|aerospace|aeroespacial|health|salud|clinic|hospital|bank|banco|financ|insurance|seguro|government|gobierno|public sector|sector p[uú]blico|compliance|regulat|audit/i,
  physical: /hardware|sensor|robot|manufact|factory|f[aá]brica|industrial|energy|energ[ií]a|climate|clima|agricultur|agro|logistic|log[ií]stica|supply chain|cadena de suministro|biotech|biotecnolog/i,
  software: /software|saas|api|platform|plataforma|artificial intelligence|inteligencia artificial|machine learning|aprendizaje autom[aá]tico|\bai\b|\bia\b|data|datos|knowledge graph|grafo de conocimiento|cloud|nube/i,
  network: /marketplace|mercado digital|network|red de|protocol|protocolo|ecosystem|ecosistema|exchange|intercambio/i,
  consumer: /consumer|consumidor|individual|persona|family|familia|b2c|retail|minorista/i,
  enterprise: /enterprise|empresa|business|negocio|team|equipo|operator|operador|b2b|institution|instituci[oó]n/i,
  defense: /defen[cs]e|defensa|military|militar|aerospace|aeroespacial|dual.use|doble uso|critical infrastructure|infraestructura cr[ií]tica|cyber|ciber|sovereign|soberan/i,
  macroSensitive: /energy|energ[ií]a|commodity|materia prima|import|export|currency|divisa|foreign exchange|tipo de cambio|interest rate|tasa de inter[eé]s|construction|construcci[oó]n|real estate|inmobili|logistic|log[ií]stica|supply chain|cadena de suministro|manufact|industrial|agricultur|agro/i,
} as const;

const EVIDENCE_PATTERNS = [
  /interview|entrevista/i,
  /pilot|piloto|prototype|prototipo/i,
  /revenue|ingreso|sales|ventas/i,
  /contract|contrato|letter of intent|carta de intenci[oó]n|\bloi\b/i,
  /retention|retenci[oó]n|churn|conversion|conversi[oó]n/i,
  /observed|observado|measured|medido|benchmark|experimento|test/i,
  /report|informe|paper|estudio|research|investigaci[oó]n/i,
  /\b\d+(?:[.,]\d+)?\s*%/,
] as const;

function normalizedText(input: LabInput) {
  return [
    input.ideaNarrative,
    input.problem,
    input.thesis,
    input.industry,
    input.market,
    input.technology,
    input.region,
    input.customerType,
    input.knownSignals,
  ].join(" ");
}

function signal(pattern: RegExp, text: string) {
  return pattern.test(text) ? 1 : 0;
}

export function deriveInputSignals(input: LabInput): InputSignals {
  const text = normalizedText(input);
  const regulated = signal(SIGNAL_PATTERNS.regulated, text);
  const physical = signal(SIGNAL_PATTERNS.physical, text);
  const software = signal(SIGNAL_PATTERNS.software, text);
  const network = signal(SIGNAL_PATTERNS.network, text);
  const consumer = signal(SIGNAL_PATTERNS.consumer, text);
  const enterprise = signal(SIGNAL_PATTERNS.enterprise, text);
  const defense = signal(SIGNAL_PATTERNS.defense, text);
  const macroSensitive = signal(SIGNAL_PATTERNS.macroSensitive, text);
  const evidenceText = input.availableEvidence.trim();
  const evidenceIndicators = EVIDENCE_PATTERNS.filter((pattern) => pattern.test(evidenceText)).length;
  const evidenceQuality = round(clamp(
    16
      + Math.min(18, evidenceText.length / 24)
      + Math.min(28, evidenceIndicators * 5)
      + Math.min(8, input.knownSignals.trim().length / 75),
    12,
    70,
  ));
  const longHorizon = clamp((input.horizonYears - 5) * 1.1, -4, 10);
  const capitalDepth = clamp((Math.log10(Math.max(25_000, input.estimatedCapital)) - 5.5) * 5, -4, 7);

  return {
    regulated,
    physical,
    software,
    network,
    consumer,
    enterprise,
    defense,
    macroSensitive,
    evidenceQuality,
    dimensionAdjustments: {
      marketPotential: network * 4 + enterprise * 2 + consumer * 2,
      financialViability: software * 4 - physical * 4 - regulated * 2 + capitalDepth * Math.max(physical, regulated),
      strategicAdvantage: network * 4 + defense * 3 + regulated * 2,
      adoptionPotential: software * 3 + consumer * 2 - regulated * 5 - physical * 2,
      technicalFeasibility: software * 3 - physical * 6 - regulated * 2 - longHorizon * 0.35,
      evidenceQuality: 0,
      risk: physical * 6 + regulated * 6 + defense * 3 + macroSensitive * 4 + longHorizon,
      scalability: software * 6 + network * 4 - physical * 5 - regulated * 2,
    },
  };
}

function lensStatus(score: number): ContextLensResult["status"] {
  return score >= 68 ? "Resilient" : score >= 48 ? "Watch" : "Exposed";
}

export function calculateDefensibilityLens(opportunity: Opportunity, input: LabInput): ContextLensResult {
  const signals = deriveInputSignals(input);
  const structuralMoat = signals.network * 9 + signals.regulated * 5 + signals.defense * 5 + signals.software * 3;
  const score = round(clamp(
    opportunity.dimensions.strategicAdvantage * 0.34
      + opportunity.dimensions.scalability * 0.18
      + opportunity.dimensions.evidenceQuality * 0.16
      + opportunity.novelty * 0.14
      + (100 - opportunity.dimensions.risk) * 0.18
      + structuralMoat
      - 8,
  ));
  const exposure = round(clamp(100 - score + opportunity.uncertainty * 0.12));
  const drivers = [
    signals.network ? "Potential network or ecosystem effects require direct proof." : "No explicit network-effect signal was found in the intake.",
    signals.regulated ? "Regulatory knowledge may create friction for entrants, but also slows validation." : "Regulatory barriers do not appear to be a primary moat in the supplied text.",
    `Strategic advantage ${Math.round(opportunity.dimensions.strategicAdvantage)} and scalability ${Math.round(opportunity.dimensions.scalability)} are synthetic estimates.`,
  ];
  return {
    name: "Defensibility",
    score,
    exposure,
    status: lensStatus(score),
    summary: score >= 68
      ? "The public indicators suggest a potentially defensible position, conditional on observed switching costs or proprietary advantages."
      : score >= 48
        ? "Some defensibility signals exist, but imitation, distribution and switching-cost evidence remain unresolved."
        : "The opportunity currently appears exposed to imitation or weak switching costs under the visible assumptions.",
    drivers,
    assumptions: ["Defensibility is treated as a competitive-resilience lens, not as a fifth public agent or proof of a durable moat."],
    missingEvidence: ["Observed switching costs, win/loss reasons, replication time and a named alternative benchmark."],
  };
}

export function calculateMacroeconomicLens(opportunity: Opportunity, input: LabInput): ContextLensResult {
  const signals = deriveInputSignals(input);
  const capitalIntensity = clamp((Math.log10(Math.max(25_000, opportunity.estimatedCapital)) - 5) * 12, 0, 30);
  const durationExposure = clamp((input.horizonYears - 2) * 2.2, 0, 28);
  const exposure = round(clamp(
    18
      + signals.macroSensitive * 19
      + signals.physical * 12
      + signals.regulated * 5
      + capitalIntensity
      + durationExposure
      - signals.software * 7
      - opportunity.dimensions.financialViability * 0.12,
  ));
  const score = round(clamp(
    100 - exposure * 0.72
      + opportunity.dimensions.financialViability * 0.18
      + opportunity.dimensions.scalability * 0.12
      - opportunity.dimensions.risk * 0.08,
  ));
  return {
    name: "Macroeconomics",
    score,
    exposure,
    status: lensStatus(score),
    summary: exposure >= 65
      ? "The opportunity is materially exposed to financing, demand, currency or supply shocks and needs explicit downside triggers."
      : exposure >= 40
        ? "Macroeconomic exposure is meaningful but may be manageable with staged capital, pricing and geographic controls."
        : "The visible business model appears comparatively less sensitive to broad macroeconomic shocks, subject to validation.",
    drivers: [
      `Estimated capital intensity contributes ${Math.round(capitalIntensity)} exposure points before model scaling.`,
      `The ${input.horizonYears}-year horizon increases the window for rates, demand and currency conditions to change.`,
      signals.macroSensitive ? "The intake contains supply-chain, energy, industrial, currency or rate-sensitive signals." : "No explicit macro-sensitive sector signal was found in the intake.",
    ],
    assumptions: ["The lens uses deterministic public heuristics; it does not forecast inflation, rates, FX or GDP."],
    missingEvidence: ["Downside demand elasticity, financing terms, currency exposure, supplier concentration and repricing capacity."],
  };
}
