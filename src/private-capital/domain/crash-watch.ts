export type CrashWatchRegime =
  | "stable"
  | "watch"
  | "stress_building"
  | "crash_risk_elevated"
  | "extreme_risk"
  | "insufficient_data";

export type CrashWatchInput = {
  volatility: number;
  breadthDeterioration: number;
  creditStress: number;
  liquidityStress: number;
  correlationConvergence: number;
  macroSurprise: number;
  crowdingNarrative: number;
  dataCoverage: number;
};

export type CrashWatchAgent = {
  id: "mathematics" | "finance" | "strategy" | "marketing";
  label: "Mathematics" | "Finance" | "Strategy" | "Marketing";
  mandate: string;
  score: number;
  evidenceQuality: number;
  stance: "support" | "caution" | "challenge";
  conclusion: string;
  evidenceState: "simulated_inference";
};

export type CrashWatchResult = {
  score: number;
  evidenceQuality: number;
  agreement: number;
  confirmations: number;
  regime: CrashWatchRegime;
  horizon: string;
  falsePositiveRisk: "not_calibrated";
  agents: CrashWatchAgent[];
  weights: Record<Exclude<keyof CrashWatchInput, "dataCoverage">, number>;
  limitations: string[];
  dataStatus: "simulated";
  predictionMade: false;
  executionAuthorized: false;
  humanReviewRequired: true;
};

const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

const round = (value: number) => Math.round(value * 10) / 10;

export const CRASH_WATCH_WEIGHTS: CrashWatchResult["weights"] = {
  volatility: 0.2,
  breadthDeterioration: 0.18,
  creditStress: 0.18,
  liquidityStress: 0.16,
  correlationConvergence: 0.1,
  macroSurprise: 0.08,
  crowdingNarrative: 0.1,
};

function weightedScore(input: CrashWatchInput): number {
  return round(
    clamp(input.volatility) * CRASH_WATCH_WEIGHTS.volatility
      + clamp(input.breadthDeterioration) * CRASH_WATCH_WEIGHTS.breadthDeterioration
      + clamp(input.creditStress) * CRASH_WATCH_WEIGHTS.creditStress
      + clamp(input.liquidityStress) * CRASH_WATCH_WEIGHTS.liquidityStress
      + clamp(input.correlationConvergence) * CRASH_WATCH_WEIGHTS.correlationConvergence
      + clamp(input.macroSurprise) * CRASH_WATCH_WEIGHTS.macroSurprise
      + clamp(input.crowdingNarrative) * CRASH_WATCH_WEIGHTS.crowdingNarrative,
  );
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function stance(score: number): CrashWatchAgent["stance"] {
  if (score >= 68) return "challenge";
  if (score >= 48) return "caution";
  return "support";
}

function conclusion(label: CrashWatchAgent["label"], score: number): string {
  const level = score >= 68 ? "señales convergentes de estrés" : score >= 48 ? "deterioro parcial que requiere confirmación" : "evidencia insuficiente de ruptura sistémica";
  const focus = {
    Mathematics: "volatilidad, amplitud, correlación y cambio de régimen",
    Finance: "crédito, financiación, liquidez y transmisión a valuaciones",
    Strategy: "catalizadores, contagio entre mercados y efectos de segundo orden",
    Marketing: "crowding, narrativa, posicionamiento y amplitud de participación",
  }[label];
  return `${level}; ${focus} permanecen bajo observación.`;
}

export function analyzeCrashWatch(raw: CrashWatchInput): CrashWatchResult {
  const input: CrashWatchInput = {
    volatility: clamp(raw.volatility),
    breadthDeterioration: clamp(raw.breadthDeterioration),
    creditStress: clamp(raw.creditStress),
    liquidityStress: clamp(raw.liquidityStress),
    correlationConvergence: clamp(raw.correlationConvergence),
    macroSurprise: clamp(raw.macroSurprise),
    crowdingNarrative: clamp(raw.crowdingNarrative),
    dataCoverage: clamp(raw.dataCoverage),
  };
  const score = weightedScore(input);
  const agentScores = [
    round(input.volatility * 0.36 + input.breadthDeterioration * 0.28 + input.correlationConvergence * 0.22 + input.liquidityStress * 0.14),
    round(input.creditStress * 0.4 + input.liquidityStress * 0.3 + input.volatility * 0.15 + input.macroSurprise * 0.15),
    round(input.macroSurprise * 0.32 + input.breadthDeterioration * 0.24 + input.creditStress * 0.2 + input.correlationConvergence * 0.24),
    round(input.crowdingNarrative * 0.46 + input.breadthDeterioration * 0.24 + input.correlationConvergence * 0.18 + input.volatility * 0.12),
  ];
  const agreement = round(clamp(100 - standardDeviation(agentScores) * 2.2));
  const evidenceQuality = round(Math.min(65, input.dataCoverage * 0.52 + agreement * 0.18));
  const confirmations = agentScores.filter((value) => value >= 65).length;

  let regime: CrashWatchRegime = "stable";
  if (input.dataCoverage < 60) regime = "insufficient_data";
  else if (score >= 82 && confirmations >= 3) regime = "extreme_risk";
  else if (score >= 68 && confirmations >= 3) regime = "crash_risk_elevated";
  else if (score >= 52 && confirmations >= 2) regime = "stress_building";
  else if (score >= 34) regime = "watch";

  const agentDefinitions: Array<Pick<CrashWatchAgent, "id" | "label" | "mandate">> = [
    { id: "mathematics", label: "Mathematics", mandate: "Señalizar patrones de estrés, correlación convergente y anomalías multivariadas." },
    { id: "finance", label: "Finance", mandate: "Contrastar crédito, liquidez, financiación, valuación y exposición de cartera." },
    { id: "strategy", label: "Strategy", mandate: "Mapear catalizadores, contagio y consecuencias de segundo orden." },
    { id: "marketing", label: "Marketing", mandate: "Medir crowding, narrativa, posicionamiento y deterioro de participación." },
  ];
  const agents = agentDefinitions.map((agent, index): CrashWatchAgent => ({
    ...agent,
    score: agentScores[index],
    evidenceQuality,
    stance: stance(agentScores[index]),
    conclusion: conclusion(agent.label, agentScores[index]),
    evidenceState: "simulated_inference",
  }));

  return {
    score,
    evidenceQuality,
    agreement,
    confirmations,
    regime,
    horizon: "No estimado",
    falsePositiveRisk: "not_calibrated",
    agents,
    weights: CRASH_WATCH_WEIGHTS,
    limitations: [
      "Es un modelo demostrativo con datos sintéticos; no monitorea mercados en tiempo real.",
      "Un crash puede ocurrir sin confirmación previa y una alerta puede ser un falso positivo.",
      "La tasa de falsos positivos no está calibrada porque el demo no usa un backtest observado.",
      "El régimen elevado exige cobertura mínima y confirmación independiente de al menos tres agentes.",
      "El resultado organiza evidencia para revisión humana; no recomienda ni ejecuta operaciones.",
    ],
    dataStatus: "simulated",
    predictionMade: false,
    executionAuthorized: false,
    humanReviewRequired: true,
  };
}
