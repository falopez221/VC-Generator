export type ThesisRiskPreference = "defensive" | "balanced" | "aggressive";
export type ThesisHorizon = "under-1y" | "1-3y" | "3-5y" | "5y-plus";
export type ThesisCurrency = "USD" | "ARS";

export interface InvestmentThesisInput {
  idea: string;
  riskPreference: ThesisRiskPreference;
  horizon: ThesisHorizon;
  referenceCurrency: ThesisCurrency;
  maximumArgentinaPct: number;
  maximumBitcoinPct: number;
}

export interface ThesisAgentPerspective {
  id: string;
  label: string;
  mandate: string;
  stance: "support" | "caution" | "challenge";
  confidence: number;
  conclusion: string;
  evidenceState: "simulated_inference";
}

export interface ThesisScenario {
  name: "Favorable" | "Base" | "Adverse";
  illustrativeRange: string;
  narrative: string;
}

export interface ThesisOpportunity {
  id: string;
  ticker: string;
  name: string;
  assetClass: string;
  geography: "Argentina" | "International" | "Global";
  fitScore: number;
  confidence: number;
  suggestedAction: "Study" | "Consider gradual exposure" | "Watch for evidence";
  role: string;
  whyItFits: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  invalidation: string;
  maximumConsiderationPct: number;
  scenarios: ThesisScenario[];
  dataStatus: "simulated";
  executionAuthorized: false;
}

export interface ThesisAnalysis {
  id: string;
  seed: number;
  normalizedIdea: string;
  themes: string[];
  agents: ThesisAgentPerspective[];
  opportunities: ThesisOpportunity[];
  disagreements: string[];
  assumptions: string[];
  limitations: string[];
  executionAuthorized: false;
}

type Candidate = {
  ticker: string;
  name: string;
  assetClass: string;
  geography: ThesisOpportunity["geography"];
  tags: string[];
  risk: number;
  role: string;
  forEvidence: string;
  againstEvidence: string;
  invalidation: string;
};

const CANDIDATES: Candidate[] = [
  { ticker: "SPY", name: "S&P 500 CEDEAR", assetClass: "CEDEAR ETF", geography: "International", tags: ["global", "diversification", "growth", "usd"], risk: 45, role: "Diversified international core", forEvidence: "Broad underlying diversification can reduce single-company dependence.", againstEvidence: "International equity remains exposed to valuation, rate and drawdown risk.", invalidation: "The thesis no longer benefits from international equity or the personal equity ceiling is reached." },
  { ticker: "QQQ", name: "Nasdaq-100 CEDEAR", assetClass: "CEDEAR ETF", geography: "International", tags: ["technology", "ai", "growth", "usd"], risk: 67, role: "Concentrated growth satellite", forEvidence: "The instrument offers a diversified expression of a technology-led thesis.", againstEvidence: "Sector and mega-cap concentration can amplify valuation compression.", invalidation: "Earnings breadth weakens or technology concentration exceeds the personal sector limit." },
  { ticker: "XLE", name: "Energy Select Sector CEDEAR", assetClass: "CEDEAR ETF", geography: "International", tags: ["energy", "oil", "gas", "income", "usd"], risk: 58, role: "Energy and inflation-sensitive satellite", forEvidence: "Energy exposure can express a commodity or cash-flow thesis without selecting one producer.", againstEvidence: "Commodity cycles and policy shifts can reverse the thesis rapidly.", invalidation: "The energy thesis loses its supply-demand support or sector exposure breaches its ceiling." },
  { ticker: "GLD", name: "Gold ETF CEDEAR", assetClass: "CEDEAR ETF", geography: "International", tags: ["global", "inflation", "defensive", "usd", "diversification"], risk: 39, role: "Macro-diversifying satellite", forEvidence: "Gold can be studied as a diversifier across inflation, currency and risk-off scenarios.", againstEvidence: "It produces no operating cash flow and can underperform when real rates rise.", invalidation: "The diversification case disappears or the allocation adds no modeled risk reduction." },
  { ticker: "KO", name: "Coca-Cola CEDEAR", assetClass: "CEDEAR equity", geography: "International", tags: ["global", "defensive", "income", "usd"], risk: 36, role: "Defensive international equity", forEvidence: "Defensive demand and diversified revenue can counterbalance higher-beta thesis positions.", againstEvidence: "Valuation, currency translation and company-specific execution still matter.", invalidation: "The defensive earnings thesis deteriorates or single-company exposure exceeds policy." },
  { ticker: "IWM", name: "Russell 2000 ETF CEDEAR", assetClass: "CEDEAR ETF", geography: "International", tags: ["global", "growth", "rates", "diversification", "usd"], risk: 63, role: "Broader growth and rate-cycle satellite", forEvidence: "Smaller-company breadth can diversify mega-cap concentration in a growth thesis.", againstEvidence: "Financing costs and economic sensitivity can create deeper drawdowns.", invalidation: "Rate or earnings assumptions no longer support smaller-company exposure." },
  { ticker: "PAMP", name: "Pampa Energía", assetClass: "Argentine equity", geography: "Argentina", tags: ["argentina", "energy", "gas", "growth"], risk: 76, role: "Local energy satellite", forEvidence: "It links a local energy thesis to a listed operating company.", againstEvidence: "Regulatory, currency, liquidity and country risks remain material.", invalidation: "The Argentina allocation limit is reached or the regulatory thesis deteriorates." },
  { ticker: "GGAL", name: "Grupo Financiero Galicia", assetClass: "Argentine equity", geography: "Argentina", tags: ["argentina", "banks", "reform", "growth"], risk: 82, role: "High-beta local reform exposure", forEvidence: "It can express a thesis about domestic credit normalization and financial intermediation.", againstEvidence: "Bank earnings remain sensitive to macro, regulation, currency and sovereign exposure.", invalidation: "Credit normalization fails or total Argentina exposure exceeds policy." },
  { ticker: "AL30", name: "Bonar 2030", assetClass: "Sovereign bond", geography: "Argentina", tags: ["argentina", "bond", "sovereign", "usd", "recovery"], risk: 88, role: "Event-driven sovereign exposure", forEvidence: "It provides a direct but bounded way to study a sovereign recovery thesis.", againstEvidence: "Credit, restructuring, liquidity and legal risks can dominate quoted yield.", invalidation: "Recovery assumptions deteriorate or sovereign exposure breaches its hard limit." },
  { ticker: "GD35", name: "Global 2035", assetClass: "Sovereign bond", geography: "Argentina", tags: ["argentina", "bond", "sovereign", "duration", "usd"], risk: 91, role: "Long-duration sovereign scenario", forEvidence: "Longer duration can create convexity in a favorable recovery scenario.", againstEvidence: "Duration magnifies adverse credit and rate scenarios.", invalidation: "The recovery horizon extends beyond the investor horizon or downside tolerance." },
  { ticker: "CER", name: "Inflation-linked peso basket", assetClass: "Peso instruments", geography: "Argentina", tags: ["argentina", "inflation", "peso", "defensive", "income"], risk: 52, role: "Local inflation hedge study", forEvidence: "Indexation can be studied against a thesis of persistent local inflation.", againstEvidence: "Index methodology, real-rate, liquidity and policy risks remain.", invalidation: "The inflation hedge is no longer needed or peso liquidity requirements change." },
  { ticker: "ON-USD", name: "Diversified hard-currency corporate bond basket", assetClass: "Corporate bonds", geography: "Argentina", tags: ["argentina", "bond", "income", "usd", "defensive"], risk: 55, role: "Income-oriented credit sleeve", forEvidence: "Issuer diversification can reduce dependence on a single corporate credit.", againstEvidence: "Issuer, liquidity, call and currency-conversion risks require instrument-level review.", invalidation: "Verified credit quality or liquidity falls below the personal policy threshold." },
  { ticker: "BTC", name: "Bitcoin", assetClass: "Digital asset", geography: "Global", tags: ["bitcoin", "crypto", "scarcity", "usd", "growth"], risk: 95, role: "Capped asymmetric satellite", forEvidence: "A capped allocation can express a digital-scarcity thesis.", againstEvidence: "Large drawdowns, custody risk and regime-dependent correlations remain plausible.", invalidation: "The Bitcoin cap is reached, custody is unresolved or drawdown tolerance changes." },
  { ticker: "USD-LIQ", name: "USD liquidity reserve", assetClass: "Cash", geography: "Global", tags: ["usd", "liquidity", "defensive", "income"], risk: 8, role: "Liquidity and optionality reserve", forEvidence: "Liquidity preserves optionality while evidence is incomplete.", againstEvidence: "Cash can lose real purchasing power and create opportunity cost.", invalidation: "Emergency liquidity is fully funded and validated opportunities justify deployment." },
  { ticker: "ARS-LIQ", name: "ARS liquidity reserve", assetClass: "Cash", geography: "Argentina", tags: ["peso", "liquidity", "defensive"], risk: 28, role: "Short-horizon peso obligations", forEvidence: "Matching near-term peso liabilities can reduce forced conversion risk.", againstEvidence: "Inflation and currency depreciation can erode real value.", invalidation: "Near-term peso obligations disappear or the liquidity horizon changes." },
];

const THEME_RULES: Array<[string, RegExp]> = [
  ["argentina", /argentin|local|merval|reform|soberan/iu],
  ["technology", /tecnolog|technology|software|semiconductor|inteligencia artificial|\bai\b/iu],
  ["energy", /energ|oil|petr|gas|vaca muerta|commodity/iu],
  ["bitcoin", /bitcoin|\bbtc\b|cripto|crypto|blockchain/iu],
  ["inflation", /inflaci|inflation|cer|purchasing power/iu],
  ["income", /renta|income|cup|dividend|cash flow|flujo/iu],
  ["bond", /bono|bond|duration|tasa|rate|cr[eé]dito/iu],
  ["usd", /d[oó]lar|dollar|usd|hard currency|moneda dura/iu],
  ["growth", /crecimiento|growth|capital appreciation|apreciaci/iu],
  ["defensive", /preserv|defens|liquidez|liquidity|bajo riesgo/iu],
];

export function analyzeInvestmentThesis(raw: InvestmentThesisInput): ThesisAnalysis {
  const idea = sanitizeIdea(raw.idea);
  if (idea.length < 30) throw new RangeError("Describe the investment thesis with at least 30 characters.");
  const riskPreference = validRisk(raw.riskPreference);
  const horizon = validHorizon(raw.horizon);
  const referenceCurrency: ThesisCurrency = raw.referenceCurrency === "ARS" ? "ARS" : "USD";
  const maximumArgentinaPct = boundedPercent(raw.maximumArgentinaPct, 0, 60);
  const maximumBitcoinPct = boundedPercent(raw.maximumBitcoinPct, 0, 25);
  const themes = THEME_RULES.filter(([, pattern]) => pattern.test(idea)).map(([theme]) => theme);
  if (!themes.length) themes.push("diversification", "liquidity");
  const seed = hash(`${idea}|${riskPreference}|${horizon}|${referenceCurrency}|${maximumArgentinaPct}|${maximumBitcoinPct}`);
  const targetRisk = riskPreference === "defensive" ? 30 : riskPreference === "aggressive" ? 78 : 52;
  const candidates = CANDIDATES
    .filter((item) => item.geography !== "Argentina" || maximumArgentinaPct > 0)
    .filter((item) => item.ticker !== "BTC" || maximumBitcoinPct > 0)
    .map((item, index) => {
      const matches = item.tags.filter((tag) => themes.includes(tag)).length;
      const riskFit = Math.max(0, 18 - Math.abs(item.risk - targetRisk) * 0.24);
      const currencyFit = item.tags.includes(referenceCurrency.toLowerCase()) ? 5 : 0;
      const diversification = ["SPY", "USD-LIQ", "ON-USD"].includes(item.ticker) ? 5 : 0;
      const jitter = deterministicFraction(seed + index * 7919) * 8;
      return { item, score: 34 + matches * 13 + riskFit + currencyFit + diversification + jitter, matches };
    })
    .sort((left, right) => right.score - left.score || left.item.ticker.localeCompare(right.item.ticker))
    .slice(0, 8);
  const opportunities = candidates.map(({ item, score, matches }, index) => opportunityFromCandidate(item, score, matches, seed + index, raw, themes));
  return {
    id: `thesis-${seed.toString(16).padStart(8, "0")}`,
    seed,
    normalizedIdea: idea,
    themes,
    agents: selectAgents(themes, riskPreference, maximumArgentinaPct, maximumBitcoinPct),
    opportunities,
    disagreements: [
      "Portfolio Construction favors diversification and staged exposure; thematic specialists give more weight to thesis purity.",
      "Red Team treats missing live evidence as a reason to wait; synthesis retains the candidates only as research hypotheses.",
      ...(themes.includes("argentina") ? ["Sovereign Risk assigns more downside weight than the local-opportunity lens."] : []),
    ],
    assumptions: [
      `Reference currency: ${referenceCurrency}; horizon: ${horizon}; risk preference: ${riskPreference}.`,
      `Argentina ceiling: ${maximumArgentinaPct}%; Bitcoin ceiling: ${maximumBitcoinPct}%.`,
      "Candidate ranking uses transparent theme matching, risk fit and deterministic tie-breaking.",
    ],
    limitations: [
      "No live prices, financial statements, news, spreads or on-chain data were used.",
      "Scenario ranges are simulated asset-level shocks, not forecasts or expected returns.",
      "The shortlist is not a portfolio and does not authorize a purchase, sale or transfer.",
    ],
    executionAuthorized: false,
  };
}

function opportunityFromCandidate(item: Candidate, rawScore: number, matches: number, seed: number, input: InvestmentThesisInput, themes: string[]): ThesisOpportunity {
  const fitScore = Math.round(Math.min(92, Math.max(35, rawScore)));
  const confidence = Math.round(Math.min(72, 38 + matches * 7 + deterministicFraction(seed) * 8));
  const maximumPolicy = item.geography === "Argentina"
    ? boundedPercent(input.maximumArgentinaPct, 0, 60)
    : item.ticker === "BTC"
      ? boundedPercent(input.maximumBitcoinPct, 0, 25)
      : input.riskPreference === "defensive" ? 12 : input.riskPreference === "aggressive" ? 22 : 17;
  const maximumConsiderationPct = Math.round(Math.min(maximumPolicy, Math.max(0, 4 + fitScore / 7)));
  const suggestedAction: ThesisOpportunity["suggestedAction"] = confidence >= 60 && fitScore >= 68
    ? "Consider gradual exposure"
    : fitScore >= 55 ? "Study" : "Watch for evidence";
  const favorableHigh = Math.round(7 + item.risk * 0.22);
  const favorableLow = Math.max(2, Math.round(favorableHigh * 0.45));
  const baseLow = -Math.max(2, Math.round(item.risk * 0.06));
  const baseHigh = Math.max(3, Math.round(4 + fitScore * 0.09));
  const adverseLow = -Math.round(10 + item.risk * 0.4);
  const adverseHigh = -Math.max(5, Math.round(5 + item.risk * 0.18));
  return {
    id: `opp-${item.ticker.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`,
    ticker: item.ticker,
    name: item.name,
    assetClass: item.assetClass,
    geography: item.geography,
    fitScore,
    confidence,
    suggestedAction,
    role: item.role,
    whyItFits: matches > 0
      ? `Matches the ${item.tags.filter((tag) => themes.includes(tag)).join(", ")} dimensions detected in the thesis.`
      : "Retained as a diversification or liquidity counterweight to the main thesis.",
    evidenceFor: [item.forEvidence, "The candidate remains inside the declared high-level exposure policy."],
    evidenceAgainst: [item.againstEvidence, "No validated current market evidence is connected."],
    invalidation: item.invalidation,
    maximumConsiderationPct,
    scenarios: [
      { name: "Favorable", illustrativeRange: `+${favorableLow}% to +${favorableHigh}%`, narrative: "Thesis drivers strengthen and liquidity remains available." },
      { name: "Base", illustrativeRange: `${baseLow}% to +${baseHigh}%`, narrative: "Mixed evidence; position sizing and patience dominate the outcome." },
      { name: "Adverse", illustrativeRange: `${adverseLow}% to ${adverseHigh}%`, narrative: "The thesis weakens while correlation, liquidity or country risk rises." },
    ],
    dataStatus: "simulated",
    executionAuthorized: false,
  };
}

function selectAgents(themes: string[], risk: ThesisRiskPreference, argentinaLimit: number, bitcoinLimit: number): ThesisAgentPerspective[] {
  const agents: ThesisAgentPerspective[] = [
    { id: "data", label: "Data Validation", mandate: "Separate observed evidence from assumptions and missing data.", stance: "caution", confidence: 32, conclusion: "No live evidence is connected; every candidate remains a simulated research hypothesis.", evidenceState: "simulated_inference" },
    { id: "portfolio", label: "Portfolio Construction", mandate: "Relate candidates to diversification, limits and liquidity.", stance: "support", confidence: 61, conclusion: `Use ${risk} sizing constraints and compare candidates as a set, not as isolated scores.`, evidenceState: "simulated_inference" },
    { id: "risk", label: "Risk Management", mandate: "Challenge drawdown, concentration, liquidity and regime exposure.", stance: "caution", confidence: 66, conclusion: "Hard exposure ceilings and adverse scenarios must override thematic enthusiasm.", evidenceState: "simulated_inference" },
    { id: "red-team", label: "Financial Red Team", mandate: "Search for thesis failure, hidden correlation and narrative bias.", stance: "challenge", confidence: 69, conclusion: "The idea may be right for the wrong reason; require disconfirming evidence before activation.", evidenceState: "simulated_inference" },
  ];
  if (themes.includes("argentina") || argentinaLimit > 0) agents.splice(1, 0,
    { id: "macro-ar", label: "Argentina Macro", mandate: "Test inflation, FX, rates and activity assumptions.", stance: "caution", confidence: 54, conclusion: "Evaluate the thesis across currency, inflation and policy-regime branches rather than one macro path.", evidenceState: "simulated_inference" },
    { id: "sovereign", label: "Sovereign Risk", mandate: "Separate credit, restructuring, legal and liquidity risk.", stance: "challenge", confidence: 58, conclusion: "Quoted yield or recovery narratives cannot substitute for instrument-level downside analysis.", evidenceState: "simulated_inference" },
  );
  if (themes.includes("technology") || themes.includes("energy") || themes.includes("global")) agents.splice(1, 0,
    { id: "cedears", label: "CEDEARs & International Equity", mandate: "Test the underlying asset, local ratio, FX and liquidity layers.", stance: "support", confidence: 57, conclusion: "Prefer diversified instruments when the thesis does not require single-company risk.", evidenceState: "simulated_inference" },
  );
  if (themes.includes("bitcoin") && bitcoinLimit > 0) agents.splice(1, 0,
    { id: "bitcoin", label: "Bitcoin", mandate: "Test cycle, drawdown, correlation and custody assumptions.", stance: "caution", confidence: 49, conclusion: "Any Bitcoin expression must remain inside the declared cap and tolerate severe drawdowns.", evidenceState: "simulated_inference" },
  );
  const synthesis: ThesisAgentPerspective = { id: "synthesis", label: "Executive Synthesis", mandate: "Reconcile evidence, disagreement and personal suitability.", stance: "support", confidence: 55, conclusion: "Advance only the strongest candidates to human review; do not convert the shortlist into orders.", evidenceState: "simulated_inference" };
  return [...agents.slice(0, 7), synthesis];
}

function sanitizeIdea(value: unknown): string {
  if (typeof value !== "string") return "";
  return Array.from(value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f]/gu, " ").replace(/\s+/gu, " ").trim()).slice(0, 1200).join("");
}

function validRisk(value: unknown): ThesisRiskPreference {
  return value === "defensive" || value === "aggressive" ? value : "balanced";
}

function validHorizon(value: unknown): ThesisHorizon {
  return value === "under-1y" || value === "1-3y" || value === "5y-plus" ? value : "3-5y";
}

function boundedPercent(value: unknown, minimum: number, maximum: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : minimum;
  return Math.round(Math.min(maximum, Math.max(minimum, number)));
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function deterministicFraction(seed: number): number {
  let value = seed >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}
