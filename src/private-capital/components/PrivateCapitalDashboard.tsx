"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  analyzeInvestmentThesis,
  type ThesisAnalysis,
  type ThesisOpportunity,
  type ThesisRiskPreference,
  type ThesisHorizon,
} from "../domain/thesis";
import { analyzeCrashWatch, type CrashWatchInput, type CrashWatchRegime } from "../domain/crash-watch";

export type PrivateCapitalView =
  | "overview"
  | "thesis"
  | "portfolio"
  | "builder"
  | "market"
  | "crash"
  | "argentina"
  | "cedears"
  | "bonds"
  | "bitcoin"
  | "signals"
  | "rebalancing"
  | "alerts"
  | "simulations"
  | "risk"
  | "review"
  | "settings";

export type Holding = {
  id: string;
  ticker: string;
  name: string;
  assetClass: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  currency: "ARS" | "USD";
  weight: number;
  brokerReference?: string;
  thesis?: string;
  market?: string;
  purchaseDate?: string;
  fees?: number;
  horizon?: string;
  reviewCondition?: string;
  notes?: string;
};

export type PortfolioProposal = {
  id: string;
  name: string;
  character: string;
  expectedRange: string;
  plausibleLoss: string;
  liquidity: string;
  concentration: number;
  risk: number;
  allocations: Array<{ label: string; value: number; color: string }>;
  rationale: string;
  invalidation: string;
};

export type CapitalAlert = {
  id: string;
  severity: "critical" | "watch" | "information";
  title: string;
  detail: string;
  nextReview: string;
  read: boolean;
  archived: boolean;
};

export type ReviewItem = {
  id: string;
  asset: string;
  hypothesis: string;
  confidence: number;
  evidence: string;
  counterEvidence: string;
  horizon: string;
  state: "Draft" | "Pending review" | "Approved as hypothesis" | "More research" | "Rejected" | "Expired" | "Archived";
};

export type PrivateCapitalViewData = {
  asOf: string;
  totalAssets: number;
  currency: "USD" | "ARS";
  periodReturn: number;
  volatility: number;
  maxDrawdown: number;
  availableLiquidity: number;
  allocation: Array<{ label: string; value: number; color: string }>;
  holdings: Holding[];
  proposals: PortfolioProposal[];
  alerts: CapitalAlert[];
  reviews: ReviewItem[];
};

export type AssetDataKind = "simulated" | "estimated" | "assumption" | "not-available";

export type AssetDataProvenance = {
  source: "SIM-CEQ" | "SIM-BOND" | "SIM-BTC";
  observedAt: string;
  currency: string;
  market: string;
  latency: string;
  confidence: "low" | "medium" | "high" | "not available";
  kind: AssetDataKind;
};

export type AssetDetailField = {
  label: string;
  value: string;
  provenance: AssetDataProvenance;
  sensitive?: boolean;
};

export type AssetDetailRecord = {
  id: string;
  title: string;
  classification: string;
  fields: AssetDetailField[];
};

export type PrivateCapitalAssetDetails = {
  cedears: AssetDetailRecord[];
  bonds: AssetDetailRecord[];
  bitcoin: AssetDetailRecord[];
};

export type PrivateCapitalDashboardProps = {
  initialData?: PrivateCapitalViewData;
  assetDetails?: PrivateCapitalAssetDetails;
  ownerLabel?: string;
  initialView?: PrivateCapitalView;
  onHoldingCreate?: (holding: Holding) => void;
  onReviewStateChange?: (id: string, state: ReviewItem["state"]) => void;
};

const NAV_ITEMS: Array<{ id: PrivateCapitalView; label: string; group: string; glyph: string }> = [
  { id: "overview", label: "Overview", group: "CAPITAL", glyph: "OV" },
  { id: "thesis", label: "Thesis Lab", group: "CAPITAL", glyph: "TL" },
  { id: "portfolio", label: "My Portfolio", group: "CAPITAL", glyph: "PF" },
  { id: "builder", label: "Portfolio Builder", group: "CAPITAL", glyph: "PB" },
  { id: "market", label: "Market Intelligence", group: "INTELLIGENCE", glyph: "MI" },
  { id: "crash", label: "Crash Watch", group: "INTELLIGENCE", glyph: "CW" },
  { id: "argentina", label: "Argentina", group: "INTELLIGENCE", glyph: "AR" },
  { id: "cedears", label: "CEDEARs", group: "INTELLIGENCE", glyph: "CE" },
  { id: "bonds", label: "Bonds", group: "INTELLIGENCE", glyph: "BO" },
  { id: "bitcoin", label: "Bitcoin", group: "INTELLIGENCE", glyph: "BT" },
  { id: "signals", label: "Signals", group: "DECISIONS", glyph: "SG" },
  { id: "rebalancing", label: "Rebalancing", group: "DECISIONS", glyph: "RB" },
  { id: "alerts", label: "Alerts", group: "DECISIONS", glyph: "AL" },
  { id: "simulations", label: "Simulations", group: "ANALYSIS", glyph: "SI" },
  { id: "risk", label: "Risk Center", group: "ANALYSIS", glyph: "RC" },
  { id: "review", label: "Human Review", group: "GOVERNANCE", glyph: "HR" },
  { id: "settings", label: "Settings", group: "GOVERNANCE", glyph: "ST" },
];

const VIEW_META: Record<PrivateCapitalView, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "CAPITAL COMMAND", title: "Good evening, Alex.", description: "A consolidated decision surface for exposure, liquidity and risk." },
  thesis: { eyebrow: "IDEA TO OPPORTUNITIES", title: "Investment Thesis Lab", description: "Describe an investment idea, convene the necessary specialists and compare explainable hypotheses and scenarios." },
  portfolio: { eyebrow: "POSITION REGISTRY", title: "My Portfolio", description: "Manually maintained positions, context and investment theses." },
  builder: { eyebrow: "CONSTRAINED ALLOCATION", title: "Portfolio Builder", description: "Compare proposals shaped by limits, scenarios and economic judgment." },
  market: { eyebrow: "VALIDATED CONTEXT", title: "Market Intelligence", description: "Cross-market observations separated from recommendations." },
  crash: { eyebrow: "SYSTEMIC STRESS WATCH", title: "Market Crash Watch", description: "Multi-signal stress patterns with four analytical lenses, explicit uncertainty and false-positive controls." },
  argentina: { eyebrow: "REGIME MONITOR", title: "Argentina", description: "Inflation, currency, sovereign and local-equity risk in one view." },
  cedears: { eyebrow: "INTERNATIONAL ACCESS", title: "CEDEARs", description: "Underlying exposure, local liquidity and implicit currency context." },
  bonds: { eyebrow: "FIXED INCOME", title: "Bonds", description: "Cash-flow structure, duration and sovereign risk scenarios." },
  bitcoin: { eyebrow: "DIGITAL SCARCITY", title: "Bitcoin", description: "Exposure discipline, drawdown tolerance and allocation bands." },
  signals: { eyebrow: "EXPLAINABLE EVIDENCE", title: "Signals", description: "Time-bounded hypotheses with supporting and contradicting evidence." },
  rebalancing: { eyebrow: "TARGET ALIGNMENT", title: "Rebalancing", description: "Decision suggestions only; no orders are created or transmitted." },
  alerts: { eyebrow: "ATTENTION QUEUE", title: "Alerts", description: "Grouped, rate-limited observations requiring human interpretation." },
  simulations: { eyebrow: "SCENARIO LAB", title: "Simulations", description: "Explore hypothetical shocks without placing real orders." },
  risk: { eyebrow: "PORTFOLIO DEFENSE", title: "Risk Center", description: "Loss, concentration, liquidity and regime exposure with visible limits." },
  review: { eyebrow: "HUMAN AUTHORITY", title: "Human Investment Review", description: "Accept an idea for monitoring, ask for research or reject it." },
  settings: { eyebrow: "PERSONAL POLICY", title: "Settings", description: "Display, notification and analysis preferences for this device." },
};

const TOUR_STORAGE_KEY = "vg-private-capital-tour-v1";
const TOUR_STEPS: Array<{ view: PrivateCapitalView; eyebrow: string; title: string; description: string; points: string[] }> = [
  { view: "overview", eyebrow: "01 · EMPEZÁ POR TU POLÍTICA", title: "Definí primero tus límites.", description: "Overview resume el patrimonio simulado, la liquidez y el riesgo. Ajustá horizonte, pérdida tolerable y topes antes de interpretar cualquier propuesta.", points: ["Los importes son simulados hasta que los cargues manualmente.", "Privacy mode oculta cifras sensibles en pantalla.", "Los límites personales condicionan el resto del análisis."] },
  { view: "thesis", eyebrow: "02 · DE IDEA A HIPÓTESIS", title: "Usá Thesis Lab para formular la pregunta.", description: "Describí una tesis de inversión como hipótesis, elegí especialistas y compará oportunidades explicables. El resultado no es una orden ni una recomendación automática.", points: ["Indicá horizonte, contexto y restricciones.", "Revisá evidencia a favor, en contra y desacuerdos.", "Enviá solo las hipótesis útiles a Human Review."] },
  { view: "portfolio", eyebrow: "03 · CONTEXTO DEL PORTAFOLIO", title: "Registrá posiciones sin conectar cuentas.", description: "My Portfolio permite cargar posiciones y su tesis de forma manual. No conecta brokers, custodios, billeteras ni cuentas bancarias.", points: ["Nunca ingreses claves, seed phrases ni credenciales.", "Agregá condición de revisión e horizonte.", "Verificá precios y cantidades con una fuente aprobada."] },
  { view: "market", eyebrow: "04 · INTELIGENCIA, NO SEÑALES CIEGAS", title: "Separá observaciones de inferencias.", description: "Market Intelligence organiza contexto global, Argentina, CEDEARs, bonos y Bitcoin. Cada dato declara si es simulado, supuesto o no disponible.", points: ["Unavailable significa que no se inventó un dato.", "Contrastá procedencia, latencia y confianza.", "Una observación de mercado no autoriza una transacción."] },
  { view: "simulations", eyebrow: "05 · PROBÁ EL PEOR CASO", title: "Simulá shocks antes de decidir.", description: "Simulations muestra cómo podría responder el portafolio a shocks de acciones, soberano, moneda y Bitcoin bajo reglas determinísticas visibles.", points: ["Modificá un supuesto por vez para entender su impacto.", "Compará el resultado con tu pérdida tolerable.", "Usá Risk Center para revisar concentración y liquidez."] },
  { view: "review", eyebrow: "06 · AUTORIDAD HUMANA", title: "Cerrá siempre en Human Review.", description: "Human Review permite aceptar una hipótesis para seguimiento, pedir más investigación o rechazarla. Ninguna opción ejecuta, financia ni transmite una orden.", points: ["Leé evidencia y contraevidencia juntas.", "Registrar una hipótesis no equivale a aprobar una inversión.", "La decisión material permanece fuera de esta interfaz."] },
];

const MOCK_DATA: PrivateCapitalViewData = {
  asOf: "18 Jul 2026 · 18:42 ART",
  totalAssets: 248750,
  currency: "USD",
  periodReturn: 12.4,
  volatility: 14.8,
  maxDrawdown: -8.7,
  availableLiquidity: 34820,
  allocation: [
    { label: "International equity", value: 38, color: "#54d5dc" },
    { label: "Fixed income", value: 24, color: "#8b80f9" },
    { label: "Cash & money market", value: 14, color: "#5e95ff" },
    { label: "Argentina equity", value: 12, color: "#efb66a" },
    { label: "Bitcoin", value: 8, color: "#f07d5b" },
    { label: "Other", value: 4, color: "#668095" },
  ],
  holdings: [
    { id: "h-1", ticker: "SPY", name: "S&P 500 CEDEAR", assetClass: "CEDEAR ETF", quantity: 420, averagePrice: 61.2, marketValue: 53620, currency: "USD", weight: 21.6, brokerReference: "Manual account A", thesis: "Diversified international core." },
    { id: "h-2", ticker: "AL30", name: "Bonar 2030", assetClass: "Sovereign bond", quantity: 39000, averagePrice: 0.58, marketValue: 27300, currency: "USD", weight: 11.0, brokerReference: "Manual account B", thesis: "Event-driven sovereign recovery, capped position." },
    { id: "h-3", ticker: "BTC", name: "Bitcoin", assetClass: "Digital asset", quantity: 0.21, averagePrice: 68100, marketValue: 19850, currency: "USD", weight: 8.0, brokerReference: "Self-custody reference", thesis: "Long-duration, asymmetric allocation within hard limit." },
    { id: "h-4", ticker: "USD", name: "US dollar liquidity", assetClass: "Cash", quantity: 34820, averagePrice: 1, marketValue: 34820, currency: "USD", weight: 14.0, thesis: "Emergency and opportunity reserve." },
  ],
  proposals: [
    { id: "defensive", name: "Defensive", character: "Preservation first", expectedRange: "4–8%", plausibleLoss: "−7% to −12%", liquidity: "High", concentration: 19, risk: 32, rationale: "Raises hard-currency liquidity and investment-grade exposure while retaining a small growth sleeve.", invalidation: "Liquidity requirement falls materially or inflation-linked instruments lose reliable price discovery.", allocations: [{ label: "Global equity", value: 24, color: "#54d5dc" }, { label: "Fixed income", value: 42, color: "#8b80f9" }, { label: "Cash", value: 26, color: "#5e95ff" }, { label: "Bitcoin", value: 4, color: "#f07d5b" }, { label: "Argentina", value: 4, color: "#efb66a" }] },
    { id: "balanced", name: "Balanced", character: "Resilient compounding", expectedRange: "7–13%", plausibleLoss: "−14% to −22%", liquidity: "Medium-high", concentration: 27, risk: 51, rationale: "Combines a global equity core with duration, local optionality and a bounded Bitcoin allocation.", invalidation: "Maximum tolerated loss drops below 15% or the investment horizon contracts below three years.", allocations: [{ label: "Global equity", value: 42, color: "#54d5dc" }, { label: "Fixed income", value: 27, color: "#8b80f9" }, { label: "Cash", value: 15, color: "#5e95ff" }, { label: "Bitcoin", value: 8, color: "#f07d5b" }, { label: "Argentina", value: 8, color: "#efb66a" }] },
    { id: "growth", name: "Growth", character: "Long-horizon upside", expectedRange: "10–18%", plausibleLoss: "−24% to −36%", liquidity: "Medium", concentration: 34, risk: 74, rationale: "Accepts greater equity and Bitcoin variability while preserving explicit liquidity and concentration limits.", invalidation: "A persistent drawdown breaches the personal risk budget or cash needs move inside twelve months.", allocations: [{ label: "Global equity", value: 54, color: "#54d5dc" }, { label: "Fixed income", value: 14, color: "#8b80f9" }, { label: "Cash", value: 9, color: "#5e95ff" }, { label: "Bitcoin", value: 12, color: "#f07d5b" }, { label: "Argentina", value: 11, color: "#efb66a" }] },
  ],
  alerts: [
    { id: "a-1", severity: "critical", title: "Argentina concentration near policy limit", detail: "Combined sovereign and local-equity exposure is 23.4% versus a personal limit of 25%.", nextReview: "19 Jul, 09:00", read: false, archived: false },
    { id: "a-2", severity: "watch", title: "AL30 thesis review due", detail: "The position has reached its scheduled 90-day review. Market data is simulated and must be validated.", nextReview: "Today", read: false, archived: false },
    { id: "a-3", severity: "information", title: "Bitcoin returned inside target band", detail: "Simulated allocation moved from 9.2% to 8.0%; no rebalance suggestion is active.", nextReview: "25 Jul", read: true, archived: false },
  ],
  reviews: [
    { id: "r-1", asset: "SPY CEDEAR", hypothesis: "Gradual accumulation could restore the international-equity target without exceeding the single-asset cap.", confidence: 67, evidence: "Three independent views agree on diversification benefit and portfolio fit.", counterEvidence: "Valuation is above its simulated ten-year median; local liquidity could widen spreads.", horizon: "3–5 years", state: "Pending review" },
    { id: "r-2", asset: "AL30", hypothesis: "Reduce concentration only if sovereign stress breaches the defined adverse-case threshold.", confidence: 48, evidence: "Cash-flow recovery scenario remains inside the prior hypothesis range.", counterEvidence: "Red Team flags restructuring and exit-liquidity risk; source data is not live.", horizon: "6–18 months", state: "More research" },
  ],
};

const mockProvenance = (source: AssetDataProvenance["source"], market: string, currency: string, kind: AssetDataKind = "simulated"): AssetDataProvenance => ({
  source,
  observedAt: "18 Jul 2026 · 18:42 ART",
  currency,
  market,
  latency: "Static fixture",
  confidence: kind === "not-available" ? "not available" : "low",
  kind,
});

const MOCK_ASSET_DETAILS: PrivateCapitalAssetDetails = {
  cedears: [{ id: "cedear-spy", title: "SPY CEDEAR", classification: "ETF CEDEAR · SIMULATED COVERAGE", fields: [
    { label: "Underlying", value: "SPDR S&P 500 ETF Trust", provenance: mockProvenance("SIM-CEQ", "BYMA / NYSE Arca", "USD") },
    { label: "Conversion ratio", value: "20:1 assumption", provenance: mockProvenance("SIM-CEQ", "BYMA", "ARS", "assumption") },
    { label: "Local price", value: "Not available", provenance: mockProvenance("SIM-CEQ", "BYMA", "ARS", "not-available"), sensitive: true },
    { label: "Implied FX", value: "Not available", provenance: mockProvenance("SIM-CEQ", "BYMA", "ARS", "not-available") },
    { label: "Local liquidity", value: "Medium — mock classification", provenance: mockProvenance("SIM-CEQ", "BYMA", "ARS") },
    { label: "Main risk", value: "Underlying drawdown + local spread", provenance: mockProvenance("SIM-CEQ", "BYMA / NYSE Arca", "USD", "assumption") },
  ] }],
  bonds: [{ id: "bond-al30", title: "AL30", classification: "SOVEREIGN BOND · SIMULATED COVERAGE", fields: [
    { label: "Law / currency", value: "Argentina / USD", provenance: mockProvenance("SIM-BOND", "BYMA", "USD") },
    { label: "Maturity", value: "09 Jul 2030 — fixture", provenance: mockProvenance("SIM-BOND", "BYMA", "USD") },
    { label: "Price / yield", value: "Not available", provenance: mockProvenance("SIM-BOND", "BYMA", "USD", "not-available"), sensitive: true },
    { label: "Duration / convexity", value: "Not calculated — insufficient validated data", provenance: mockProvenance("SIM-BOND", "BYMA", "USD", "not-available") },
    { label: "Credit risk", value: "High — scenario assumption", provenance: mockProvenance("SIM-BOND", "Argentina sovereign", "USD", "assumption") },
    { label: "Liquidity risk", value: "Instrument-specific; validation required", provenance: mockProvenance("SIM-BOND", "BYMA", "USD", "assumption") },
  ] }],
  bitcoin: [{ id: "btc-spot", title: "Bitcoin", classification: "DIGITAL ASSET · SIMULATED COVERAGE", fields: [
    { label: "Portfolio weight", value: "8.0%", provenance: mockProvenance("SIM-BTC", "Portfolio fixture", "USD") },
    { label: "Average price", value: "USD 68,100 — manual mock", provenance: mockProvenance("SIM-BTC", "Manual registry", "USD"), sensitive: true },
    { label: "Policy band", value: "6–10%", provenance: mockProvenance("SIM-BTC", "Personal policy", "USD", "assumption") },
    { label: "Market / on-chain", value: "Not connected", provenance: mockProvenance("SIM-BTC", "Provider unavailable", "USD", "not-available") },
    { label: "Drawdown budget", value: "−45% asset-level assumption", provenance: mockProvenance("SIM-BTC", "Personal policy", "USD", "assumption") },
    { label: "Custody", value: "Education only — no secrets collected", provenance: mockProvenance("SIM-BTC", "Local policy", "N/A", "assumption") },
  ] }],
};

const MARKET_VIEWS: Partial<Record<PrivateCapitalView, { tone: string; headline: string; summary: string; facts: Array<[string, string, string]> }>> = {
  market: { tone: "DIVERGENT", headline: "Cross-asset signals do not support a single directional conclusion.", summary: "Global equity momentum remains constructive in the simulated window, while local sovereign and currency uncertainty increases the value of liquidity.", facts: [["Global risk", "Neutral-positive", "Delayed close"], ["ARS regime", "Elevated uncertainty", "Estimate"], ["Portfolio fit", "Prefer gradual changes", "Inference"]] },
  argentina: { tone: "HIGH ATTENTION", headline: "Local opportunity remains inseparable from sovereign and currency risk.", summary: "The simulated dashboard separates inflation, FX, sovereign spread and local-equity evidence. No current observation is suitable for execution.", facts: [["Inflation regime", "Disinflation watch", "Mock"], ["Sovereign risk", "Elevated", "Mock"], ["Local liquidity", "Instrument-specific", "Inference"]] },
  cedears: { tone: "SELECTIVE", headline: "Underlying quality and local execution conditions must be reviewed together.", summary: "The displayed sample considers conversion ratio, underlying concentration, implied FX and local volume. Prices are intentionally omitted until a validated provider is connected.", facts: [["SPY", "Diversified core", "Mock coverage"], ["QQQ", "Growth concentration", "Mock coverage"], ["KO", "Defensive factor", "Mock coverage"]] },
  bonds: { tone: "SCENARIO-DEPENDENT", headline: "Yield alone cannot represent sovereign bond risk.", summary: "Duration, recovery assumptions, legal framework, liquidity and restructuring risk are presented as separate dimensions.", facts: [["AL30", "Shorter duration / high credit risk", "Mock"], ["GD35", "Long duration / NY law", "Mock"], ["BOPREAL", "FX-linked / policy sensitivity", "Mock"]] },
  bitcoin: { tone: "WITHIN BAND", headline: "Current simulated weight is below the personal 10% ceiling.", summary: "A 6–10% allocation band is used for exploration. Leverage and derivatives are excluded; custody is educational only and no secrets are requested.", facts: [["Portfolio weight", "8.0%", "Simulated snapshot"], ["Policy band", "6–10%", "Personal rule"], ["Drawdown budget", "−45% asset-level", "Assumption"]] },
};

function formatMoney(value: number, currency: string, hidden: boolean) {
  if (hidden) return "••••••";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function ActionButton({ children, tone = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "default" | "primary" | "danger" }) {
  return <button {...props} className={`pc-button pc-button--${tone}${props.className ? ` ${props.className}` : ""}`}>{children}</button>;
}

function AllocationBar({ items, compact = false }: { items: Array<{ label: string; value: number; color: string }>; compact?: boolean }) {
  return <div className={`pc-allocation${compact ? " pc-allocation--compact" : ""}`}>
    <div className="pc-allocation__bar" role="img" aria-label={items.map((item) => `${item.label} ${item.value}%`).join(", ")}>
      {items.map((item) => <span key={item.label} style={{ width: `${item.value}%`, background: item.color }} />)}
    </div>
    <ul>{items.map((item) => <li key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value}%</strong></li>)}</ul>
  </div>;
}

const CRASH_WATCH_PRESETS = {
  normal: { volatility: 24, breadthDeterioration: 29, creditStress: 22, liquidityStress: 18, correlationConvergence: 31, macroSurprise: 28, crowdingNarrative: 25, dataCoverage: 65 },
  stress: { volatility: 68, breadthDeterioration: 76, creditStress: 61, liquidityStress: 58, correlationConvergence: 71, macroSurprise: 64, crowdingNarrative: 73, dataCoverage: 65 },
  crash: { volatility: 84, breadthDeterioration: 88, creditStress: 79, liquidityStress: 76, correlationConvergence: 85, macroSurprise: 72, crowdingNarrative: 86, dataCoverage: 65 },
} satisfies Record<string, CrashWatchInput>;

const CRASH_REGIME_LABELS: Record<CrashWatchRegime, string> = {
  stable: "ESTABLE",
  watch: "VIGILANCIA",
  stress_building: "ESTRÉS EN FORMACIÓN",
  crash_risk_elevated: "PATRÓN COMPATIBLE CON RIESGO DE CRASH",
  extreme_risk: "PATRÓN DE ESTRÉS SISTÉMICO EXTREMO",
  insufficient_data: "DATOS INSUFICIENTES",
};

export function PrivateCapitalDashboard({ initialData = MOCK_DATA, assetDetails = MOCK_ASSET_DETAILS, ownerLabel = "Private owner", initialView = "overview", onHoldingCreate, onReviewStateChange }: PrivateCapitalDashboardProps) {
  const [view, setView] = useState<PrivateCapitalView>(initialView);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const tourPanelRef = useRef<HTMLElement>(null);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [holdings, setHoldings] = useState(initialData.holdings);
  const [alerts, setAlerts] = useState(initialData.alerts);
  const [reviews, setReviews] = useState(initialData.reviews);
  const [selectedProposal, setSelectedProposal] = useState(initialData.proposals[1]?.id ?? initialData.proposals[0]?.id ?? "");
  const [liveMessage, setLiveMessage] = useState("Quantitative Personal Capital loaded with simulated data.");
  const [profile, setProfile] = useState({ capital: initialData.totalAssets, referenceCurrency: initialData.currency, horizon: 7, liquidityNeed: 20, maxLoss: 22, argentinaLimit: 25, bitcoinLimit: 10, assetLimit: 25, sectorLimit: 35, rebalanceMonths: 6, style: "Balanced" });
  const [scenario, setScenario] = useState({ fxShock: 18, equityShock: -20, sovereignShock: -28, bitcoinShock: -35, contribution: 1500 });
  const [crashInputs, setCrashInputs] = useState<CrashWatchInput>(CRASH_WATCH_PRESETS.normal);
  const [evaluatedCrashInputs, setEvaluatedCrashInputs] = useState<CrashWatchInput>(CRASH_WATCH_PRESETS.normal);
  const [settings, setSettings] = useState({ compact: false, quietHours: true, groupAlerts: true });
  const [holdingDraft, setHoldingDraft] = useState({ ticker: "", name: "", assetClass: "CEDEAR", market: "BYMA", quantity: "", averagePrice: "", currency: "USD" as "USD" | "ARS", brokerReference: "", purchaseDate: "", fees: "", horizon: "", reviewCondition: "", thesis: "", notes: "" });

  useEffect(() => {
    try {
      if (window.localStorage.getItem(TOUR_STORAGE_KEY) !== "seen") {
        setTourStep(0);
        setView(TOUR_STEPS[0].view);
      }
    } catch { /* The tour remains available from its visible button without storage. */ }
  }, []);

  useEffect(() => {
    if (tourStep === null) return;
    tourPanelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      try { window.localStorage.setItem(TOUR_STORAGE_KEY, "seen"); } catch { /* Optional preference only. */ }
      setTourStep(null);
      setLiveMessage("Guided tour closed. Use the Tour button to open it again.");
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [tourStep]);

  const unreadCount = alerts.filter((alert) => !alert.read && !alert.archived).length;
  const activeAssetDetails = view === "cedears" ? assetDetails.cedears : view === "bonds" ? assetDetails.bonds : view === "bitcoin" ? assetDetails.bitcoin : null;
  const derivedProfile = useMemo(() => {
    const score = Math.round(Math.min(100, Math.max(0, profile.maxLoss * 2 + profile.horizon * 3 - profile.liquidityNeed * 0.45)));
    return { score, label: score < 40 ? "Conservative" : score < 68 ? "Moderate" : "Aggressive" };
  }, [profile.horizon, profile.liquidityNeed, profile.maxLoss]);
  const scenarioImpact = useMemo(() => {
    const equity = scenario.equityShock * 0.5;
    const local = scenario.sovereignShock * 0.18;
    const bitcoin = scenario.bitcoinShock * 0.08;
    const currencyBuffer = Math.max(0, scenario.fxShock) * 0.12;
    return Math.round((equity + local + bitcoin + currencyBuffer) * 10) / 10;
  }, [scenario]);
  const crashWatch = useMemo(() => analyzeCrashWatch(evaluatedCrashInputs), [evaluatedCrashInputs]);

  const changeView = (next: PrivateCapitalView) => {
    setView(next);
    setLiveMessage(`${VIEW_META[next].title} view selected.`);
  };

  const openTour = () => {
    setView(TOUR_STEPS[0].view);
    setTourStep(0);
    setLiveMessage(`Guided tour opened at step 1 of ${TOUR_STEPS.length}.`);
  };

  const goToTourStep = (next: number) => {
    const bounded = Math.min(TOUR_STEPS.length - 1, Math.max(0, next));
    setTourStep(bounded);
    setView(TOUR_STEPS[bounded].view);
    setLiveMessage(`Guided tour step ${bounded + 1} of ${TOUR_STEPS.length}: ${TOUR_STEPS[bounded].title}`);
  };

  const closeTour = (completed = false) => {
    try { window.localStorage.setItem(TOUR_STORAGE_KEY, "seen"); } catch { /* Optional preference only. */ }
    setTourStep(null);
    setLiveMessage(completed ? "Guided tour completed. Human review remains required." : "Guided tour closed. Use the Tour button to open it again.");
  };

  const trapTourFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"));
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const submitHolding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(holdingDraft.quantity);
    const averagePrice = Number(holdingDraft.averagePrice);
    if (!holdingDraft.ticker.trim() || !holdingDraft.name.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(averagePrice) || averagePrice <= 0) {
      setLiveMessage("Holding not added. Complete the required fields with positive numeric values.");
      return;
    }
    const holding: Holding = {
      id: `manual-${Date.now()}`,
      ticker: holdingDraft.ticker.trim().toUpperCase().slice(0, 12),
      name: holdingDraft.name.trim().slice(0, 80),
      assetClass: holdingDraft.assetClass,
      quantity,
      averagePrice,
      marketValue: quantity * averagePrice,
      currency: holdingDraft.currency,
      weight: 0,
      brokerReference: holdingDraft.brokerReference.trim().slice(0, 60),
      thesis: holdingDraft.thesis.trim().slice(0, 300),
      market: holdingDraft.market.trim().slice(0, 40),
      purchaseDate: holdingDraft.purchaseDate,
      fees: Math.max(0, Number(holdingDraft.fees) || 0),
      horizon: holdingDraft.horizon.trim().slice(0, 60),
      reviewCondition: holdingDraft.reviewCondition.trim().slice(0, 180),
      notes: holdingDraft.notes.trim().slice(0, 300),
    };
    setHoldings((current) => [...current, holding]);
    onHoldingCreate?.(holding);
    setHoldingDraft({ ticker: "", name: "", assetClass: "CEDEAR", market: "BYMA", quantity: "", averagePrice: "", currency: "USD", brokerReference: "", purchaseDate: "", fees: "", horizon: "", reviewCondition: "", thesis: "", notes: "" });
    setLiveMessage(`${holding.ticker} was added to the local manual registry. No account was connected.`);
  };

  const setAlertState = (id: string, action: "read" | "archive") => {
    setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, read: action === "read" ? true : alert.read, archived: action === "archive" ? true : alert.archived } : alert));
    setLiveMessage(action === "read" ? "Alert marked as read." : "Alert archived from the active queue.");
  };

  const changeReviewState = (id: string, state: ReviewItem["state"]) => {
    setReviews((current) => current.map((review) => review.id === id ? { ...review, state } : review));
    onReviewStateChange?.(id, state);
    setLiveMessage(`Review state changed to ${state}. This does not authorize or execute a trade.`);
  };

  const queueThesisReview = (opportunity: ThesisOpportunity, analysis: ThesisAnalysis) => {
    const reviewId = `${analysis.id}-${opportunity.id}`;
    const review: ReviewItem = {
      id: reviewId,
      asset: `${opportunity.ticker} · ${opportunity.name}`,
      hypothesis: `${opportunity.suggestedAction}: ${opportunity.whyItFits}`,
      confidence: opportunity.confidence,
      evidence: opportunity.evidenceFor.join(" "),
      counterEvidence: opportunity.evidenceAgainst.join(" "),
      horizon: analysis.assumptions[0] ?? "User-defined horizon",
      state: "Pending review",
    };
    setReviews((current) => current.some((item) => item.id === reviewId) ? current : [review, ...current]);
    setLiveMessage(`${opportunity.ticker} was sent to Human Review as a hypothesis. No trade was created or authorized.`);
  };

  return <section className={`pc-shell${settings.compact ? " is-compact" : ""}`} aria-label="Quantitative Personal Capital">
    <a className="pc-skip" href="#pc-main">Skip to capital workspace</a>
    <aside className="pc-sidebar">
      <div className="pc-brand"><span aria-hidden="true"><i /><i /><i /></span><div><strong>QUANTITATIVE</strong><small>PERSONAL CAPITAL · OWNER ACCESS</small></div></div>
      <nav aria-label="Quantitative Personal Capital sections">
        {[...new Set(NAV_ITEMS.map((item) => item.group))].map((group) => <div className="pc-nav-group" key={group}><span>{group}</span>{NAV_ITEMS.filter((item) => item.group === group).map((item) => <button type="button" key={item.id} onClick={() => changeView(item.id)} aria-current={view === item.id ? "page" : undefined}><i aria-hidden="true">{item.glyph}</i><b>{item.label}</b>{item.id === "alerts" && unreadCount > 0 && <em aria-label={`${unreadCount} unread alerts`}>{unreadCount}</em>}</button>)}</div>)}
      </nav>
      <div className="pc-sidebar__boundary"><span>DECISION SUPPORT ONLY</span><p>Owner-restricted interface. No broker connection, custody, transfer or execution capability.</p></div>
    </aside>

    <div className="pc-workspace">
      <header className="pc-topbar">
        <label className="pc-mobile-nav"><span>Section</span><select value={view} onChange={(event) => changeView(event.target.value as PrivateCapitalView)}>{NAV_ITEMS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
        <div className="pc-context"><span>QUANTITATIVE / PERSONAL CAPITAL</span><small>Snapshot · {initialData.asOf}</small></div>
        <div className="pc-system-state"><i /> SIMULATED FEED</div>
        <button className="pc-tour-trigger" type="button" onClick={openTour} aria-haspopup="dialog"><span aria-hidden="true">?</span>Tour guiado</button>
        <button className="pc-privacy" type="button" onClick={() => { setPrivacyMode((current) => !current); setLiveMessage(privacyMode ? "Sensitive amounts are visible." : "Privacy mode enabled. Sensitive amounts are hidden."); }} aria-pressed={privacyMode} aria-label={privacyMode ? "Show sensitive amounts" : "Hide sensitive amounts"}><span aria-hidden="true">{privacyMode ? "◉" : "◎"}</span>{privacyMode ? "Show amounts" : "Privacy mode"}</button>
        <div className="pc-owner"><i aria-hidden="true">AC</i><span><b>{ownerLabel}</b><small>private_capital_owner</small></span></div>
      </header>

      <div className="pc-permanent-notices" role="note">
        <p><strong>Decision-support environment.</strong> No trades are executed automatically. Final investment decisions remain under human control.</p>
        <p><strong>Simulated data — not suitable for real investment decisions.</strong> Validate every material input with an approved provider.</p>
      </div>

      <main id="pc-main" className="pc-main" tabIndex={-1}>
        <p className="pc-live" role="status" aria-live="polite" aria-atomic="true">{liveMessage}</p>
        <header className="pc-page-head"><div><span>{VIEW_META[view].eyebrow}</span><h1>{VIEW_META[view].title}</h1><p>{VIEW_META[view].description}</p></div><div className="pc-data-stamp"><i /> DATA STATUS<strong>MOCK · VALIDATION REQUIRED</strong><small>{initialData.asOf}</small></div></header>
        {view === "overview" && <OverviewView data={initialData} privacyMode={privacyMode} profile={profile} setProfile={setProfile} derivedProfile={derivedProfile} alerts={alerts} crashWatch={crashWatch} onOpenCrash={() => changeView("crash")} onOpenAlerts={() => changeView("alerts")} />}
        {view === "thesis" && <ThesisLabView profile={profile} onStatus={setLiveMessage} onQueueReview={queueThesisReview} onOpenReview={() => changeView("review")} />}
        {view === "portfolio" && <PortfolioView holdings={holdings} privacyMode={privacyMode} draft={holdingDraft} setDraft={setHoldingDraft} onSubmit={submitHolding} />}
        {view === "builder" && <BuilderView data={initialData} privacyMode={privacyMode} selected={selectedProposal} setSelected={setSelectedProposal} onStatus={setLiveMessage} />}
        {MARKET_VIEWS[view] && !activeAssetDetails && <MarketView view={view} data={MARKET_VIEWS[view]!} />}
        {view === "crash" && <CrashWatchView inputs={crashInputs} evaluatedInputs={evaluatedCrashInputs} setInputs={setCrashInputs} result={crashWatch} onEvaluate={() => {
          const nextResult = analyzeCrashWatch(crashInputs);
          setEvaluatedCrashInputs({ ...crashInputs });
          setLiveMessage(`Crash Watch index evaluated: ${nextResult.score} out of 100, ${CRASH_REGIME_LABELS[nextResult.regime]}. Synthetic analysis only; no action was executed.`);
        }} onStatus={setLiveMessage} />}
        {activeAssetDetails && <AssetDetailsView records={activeAssetDetails} privacyMode={privacyMode} />}
        {view === "signals" && <SignalsView onStatus={setLiveMessage} />}
        {view === "rebalancing" && <RebalancingView privacyMode={privacyMode} contribution={scenario.contribution} setContribution={(value) => setScenario((current) => ({ ...current, contribution: value }))} />}
        {view === "alerts" && <AlertsView alerts={alerts} onState={setAlertState} />}
        {view === "simulations" && <SimulationView scenario={scenario} setScenario={setScenario} impact={scenarioImpact} privacyMode={privacyMode} />}
        {view === "risk" && <RiskView data={initialData} profile={profile} />}
        {view === "review" && <ReviewView reviews={reviews} onState={changeReviewState} />}
        {view === "settings" && <SettingsView settings={settings} setSettings={setSettings} />}
      </main>
    </div>
    {tourStep !== null && <div className="pc-tour-backdrop">
      <section className="pc-tour" role="dialog" aria-modal="true" aria-labelledby="pc-tour-title" aria-describedby="pc-tour-description" ref={tourPanelRef} tabIndex={-1} onKeyDown={trapTourFocus}>
        <header className="pc-tour__header"><div><span>RECORRIDO DE QUANTITATIVE PERSONAL CAPITAL</span><strong>Paso {tourStep + 1} de {TOUR_STEPS.length}</strong></div><button type="button" onClick={() => closeTour()} aria-label="Cerrar tour">×</button></header>
        <nav className="pc-tour__progress" aria-label="Pasos del tour">{TOUR_STEPS.map((step, index) => <button type="button" key={step.view} onClick={() => goToTourStep(index)} aria-current={index === tourStep ? "step" : undefined} aria-label={`Ir al paso ${index + 1}: ${step.title}`}><i /><span>{String(index + 1).padStart(2, "0")}</span></button>)}</nav>
        <div className="pc-tour__body"><div className="pc-tour__number" aria-hidden="true">{String(tourStep + 1).padStart(2, "0")}</div><div><span>{TOUR_STEPS[tourStep].eyebrow}</span><h2 id="pc-tour-title">{TOUR_STEPS[tourStep].title}</h2><p id="pc-tour-description">{TOUR_STEPS[tourStep].description}</p><ul>{TOUR_STEPS[tourStep].points.map((point) => <li key={point}>{point}</li>)}</ul><small>La sección correspondiente ya está abierta detrás de este panel.</small></div></div>
        <footer className="pc-tour__footer"><button type="button" onClick={() => closeTour()}>Saltar tour</button><div>{tourStep > 0 && <button type="button" onClick={() => goToTourStep(tourStep - 1)}>Anterior</button>}{tourStep < TOUR_STEPS.length - 1 ? <button type="button" className="is-primary" onClick={() => goToTourStep(tourStep + 1)}>Siguiente</button> : <button type="button" className="is-primary" onClick={() => closeTour(true)}>Finalizar</button>}</div></footer>
      </section>
    </div>}
  </section>;
}

type Profile = { capital: number; referenceCurrency: "USD" | "ARS"; horizon: number; liquidityNeed: number; maxLoss: number; argentinaLimit: number; bitcoinLimit: number; assetLimit: number; sectorLimit: number; rebalanceMonths: number; style: string };

function OverviewView({ data, privacyMode, profile, setProfile, derivedProfile, alerts, crashWatch, onOpenCrash, onOpenAlerts }: { data: PrivateCapitalViewData; privacyMode: boolean; profile: Profile; setProfile: React.Dispatch<React.SetStateAction<Profile>>; derivedProfile: { score: number; label: string }; alerts: CapitalAlert[]; crashWatch: ReturnType<typeof analyzeCrashWatch>; onOpenCrash: () => void; onOpenAlerts: () => void }) {
  const metrics = [
    ["ESTIMATED NET ASSETS", formatMoney(data.totalAssets, data.currency, privacyMode), "Simulated total", "cyan"],
    ["PERIOD RETURN", `${data.periodReturn > 0 ? "+" : ""}${data.periodReturn}%`, "12-month mock window", "green"],
    ["AVAILABLE LIQUIDITY", privacyMode ? "••••••" : `${Math.round(data.availableLiquidity / data.totalAssets * 100)}% · ${formatMoney(data.availableLiquidity, data.currency, false)}`, "Cash + money market", "blue"],
    ["MAX DRAWDOWN", `${data.maxDrawdown}%`, "Simulated historical", "orange"],
  ];
  return <div className="pc-view-stack">
    <section className="pc-kpis" aria-label="Portfolio summary">{metrics.map(([label, value, note, tone]) => <article key={label} className={`is-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small><i /></article>)}</section>
    <section className={`pc-crash-strip is-${crashWatch.regime}`} aria-label="Systemic stress early warning">
      <div><span>MARKET CRASH WATCH · REPLAY SINTÉTICO SELECCIONADO</span><strong>{CRASH_REGIME_LABELS[crashWatch.regime]}</strong><p>{crashWatch.confirmations}/4 lentes coinciden · calidad de evidencia {crashWatch.evidenceQuality}% · horizonte {crashWatch.horizon}</p></div>
      <div className="pc-crash-strip__score"><strong>{crashWatch.score}</strong><small>STRESS / 100</small></div>
      <ActionButton onClick={onOpenCrash}>Abrir Crash Watch</ActionButton>
    </section>
    <div className="pc-grid pc-grid--overview">
      <section className="pc-panel"><header><div><span>01 / ALLOCATION</span><h2>Portfolio structure</h2></div><small>Percentage view remains visible in privacy mode</small></header><AllocationBar items={data.allocation} /><div className="pc-stat-row"><div><span>Argentina</span><strong>23.4%</strong><small>Limit 25%</small></div><div><span>International</span><strong>54.6%</strong><small>Across CEDEARs</small></div><div><span>Bitcoin</span><strong>8.0%</strong><small>Band 6–10%</small></div></div></section>
      <section className="pc-panel pc-profile"><header><div><span>02 / INVESTOR POLICY</span><h2>Risk profile</h2></div><div className="pc-profile-score"><strong>{derivedProfile.score}</strong><small>{derivedProfile.label}</small></div></header><div className="pc-form-grid"><label>Investable capital<input aria-label="Investable capital" inputMode="decimal" type={privacyMode ? "password" : "number"} min="0" max="1000000000000" value={profile.capital} onChange={(event) => setProfile((current) => ({ ...current, capital: Math.max(0, Math.min(1_000_000_000_000, Number(event.target.value) || 0)) }))} /></label><label>Reference currency<select value={profile.referenceCurrency} onChange={(event) => setProfile((current) => ({ ...current, referenceCurrency: event.target.value as "USD" | "ARS" }))}><option>USD</option><option>ARS</option></select></label><label>Allocation style<select value={profile.style} onChange={(event) => setProfile((current) => ({ ...current, style: event.target.value }))}><option>Preservation</option><option>Balanced</option><option>Growth</option><option>Income</option><option>Custom</option></select></label><RangeControl label="Horizon" value={profile.horizon} min={1} max={20} suffix=" years" onChange={(value) => setProfile((current) => ({ ...current, horizon: value }))} /><RangeControl label="Liquidity need" value={profile.liquidityNeed} min={0} max={100} suffix="%" onChange={(value) => setProfile((current) => ({ ...current, liquidityNeed: value }))} /><RangeControl label="Maximum tolerable loss" value={profile.maxLoss} min={5} max={50} suffix="%" onChange={(value) => setProfile((current) => ({ ...current, maxLoss: value }))} /><RangeControl label="Argentina ceiling" value={profile.argentinaLimit} min={0} max={60} suffix="%" onChange={(value) => setProfile((current) => ({ ...current, argentinaLimit: value }))} /><RangeControl label="Bitcoin ceiling" value={profile.bitcoinLimit} min={0} max={25} suffix="%" onChange={(value) => setProfile((current) => ({ ...current, bitcoinLimit: value }))} /><RangeControl label="Single-asset ceiling" value={profile.assetLimit} min={5} max={50} suffix="%" onChange={(value) => setProfile((current) => ({ ...current, assetLimit: value }))} /><RangeControl label="Sector ceiling" value={profile.sectorLimit} min={10} max={70} suffix="%" onChange={(value) => setProfile((current) => ({ ...current, sectorLimit: value }))} /><RangeControl label="Rebalance horizon" value={profile.rebalanceMonths} min={1} max={24} suffix=" months" onChange={(value) => setProfile((current) => ({ ...current, rebalanceMonths: value }))} /></div><p className="pc-method-note">Transparent demo rule: score = (maximum loss × 2) + (horizon × 3) − (liquidity need × 0.45), bounded to 0–100. The label alone never determines suitability.</p></section>
    </div>
    <section className="pc-panel pc-attention"><header><div><span>03 / ATTENTION</span><h2>Active observations</h2></div><ActionButton onClick={onOpenAlerts}>Open alert center</ActionButton></header><div>{alerts.filter((alert) => !alert.archived).slice(0, 3).map((alert) => <article key={alert.id}><i className={`is-${alert.severity}`} /><div><span>{alert.severity}</span><strong>{alert.title}</strong><p>{alert.detail}</p></div><small>{alert.nextReview}</small></article>)}</div></section>
  </div>;
}

function RangeControl({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="pc-range"><span>{label}<output>{value}{suffix}</output></span><input type="range" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ThesisLabView({ profile, onStatus, onQueueReview, onOpenReview }: {
  profile: Profile;
  onStatus: (message: string) => void;
  onQueueReview: (opportunity: ThesisOpportunity, analysis: ThesisAnalysis) => void;
  onOpenReview: () => void;
}) {
  const [draft, setDraft] = useState({
    idea: "",
    riskPreference: "balanced" as ThesisRiskPreference,
    horizon: "3-5y" as ThesisHorizon,
    referenceCurrency: profile.referenceCurrency,
  });
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");
  const selected = analysis?.opportunities.find((item) => item.id === selectedId) ?? analysis?.opportunities[0] ?? null;

  const runAnalysis = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const result = analyzeInvestmentThesis({
        idea: draft.idea,
        riskPreference: draft.riskPreference,
        horizon: draft.horizon,
        referenceCurrency: draft.referenceCurrency,
        maximumArgentinaPct: profile.argentinaLimit,
        maximumBitcoinPct: profile.bitcoinLimit,
      });
      setAnalysis(result);
      setSelectedId(result.opportunities[0]?.id ?? "");
      setError("");
      onStatus(`${result.agents.length} specialists produced ${result.opportunities.length} simulated research hypotheses. Human review remains required.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The thesis could not be analyzed.";
      setError(message);
      onStatus(message);
    }
  };

  return <div className="pc-view-stack pc-thesis-lab">
    <section className="pc-thesis-flow" aria-label="Investment thesis workflow">
      {["Describe thesis", "Select specialists", "Generate hypotheses", "Stress scenarios", "Human review"].map((step, index) => <div key={step}><i>{String(index + 1).padStart(2, "0")}</i><span>{step}</span></div>)}
    </section>

    <section className="pc-panel pc-thesis-intake">
      <header><div><span>THESIS INTAKE</span><h2>What do you believe may create an opportunity?</h2></div><small>Your text is treated as data, never as executable instructions</small></header>
      <form onSubmit={runAnalysis}>
        <label className="pc-thesis-prompt">Describe the investment idea, why it may matter and what could make it wrong.
          <textarea required minLength={30} maxLength={1200} value={draft.idea} onChange={(event) => setDraft((current) => ({ ...current, idea: event.target.value }))} placeholder="Example: I want to study whether Argentine energy, international AI infrastructure and dollar liquidity could form a diversified 3–5 year thesis. I want country exposure capped and I can tolerate moderate drawdowns." />
          <small>{draft.idea.length}/1200 characters · Do not enter credentials, account numbers or private keys.</small>
        </label>
        <div className="pc-thesis-controls">
          <label>Risk preference<select value={draft.riskPreference} onChange={(event) => setDraft((current) => ({ ...current, riskPreference: event.target.value as ThesisRiskPreference }))}><option value="defensive">Defensive</option><option value="balanced">Balanced</option><option value="aggressive">Aggressive</option></select></label>
          <label>Decision horizon<select value={draft.horizon} onChange={(event) => setDraft((current) => ({ ...current, horizon: event.target.value as ThesisHorizon }))}><option value="under-1y">Under 1 year</option><option value="1-3y">1–3 years</option><option value="3-5y">3–5 years</option><option value="5y-plus">5+ years</option></select></label>
          <label>Reference currency<select value={draft.referenceCurrency} onChange={(event) => setDraft((current) => ({ ...current, referenceCurrency: event.target.value as "USD" | "ARS" }))}><option>USD</option><option>ARS</option></select></label>
          <div className="pc-thesis-policy"><span>PROFILE LIMITS</span><b>Argentina {profile.argentinaLimit}% · Bitcoin {profile.bitcoinLimit}%</b><small>Change these in Overview before rerunning.</small></div>
        </div>
        {error && <p className="pc-thesis-error" role="alert">{error}</p>}
        <footer><p>Output is a simulated shortlist for research. It is not individualized financial advice or an instruction to transact.</p><ActionButton tone="primary" type="submit">Convene specialists</ActionButton></footer>
      </form>
    </section>

    {!analysis && <section className="pc-thesis-empty">
      <article><span>01</span><h3>You provide the thesis</h3><p>State the opportunity, time horizon, assumptions and what you think the market may be missing.</p></article>
      <article><span>02</span><h3>Only relevant specialists join</h3><p>Data validation, risk, portfolio construction and Red Team are mandatory; asset specialists join when the thesis calls for them.</p></article>
      <article><span>03</span><h3>Hypotheses, not orders</h3><p>The system returns 6–8 candidates, disagreements and scenarios. You decide what enters Human Review.</p></article>
    </section>}

    {analysis && <>
      <section className="pc-panel pc-agent-council">
        <header><div><span>SPECIALIST COUNCIL</span><h2>{analysis.agents.length} agents participated</h2></div><small>Simulated inference · no private prompts exposed</small></header>
        <div>{analysis.agents.map((agent) => <article key={agent.id} className={`is-${agent.stance}`}><header><i>{agent.label.split(" ").map((word) => word[0]).join("").slice(0, 2)}</i><div><strong>{agent.label}</strong><small>{agent.mandate}</small></div><em>{agent.confidence}%</em></header><p>{agent.conclusion}</p><footer>{agent.stance.toUpperCase()} · SIMULATED INFERENCE</footer></article>)}</div>
      </section>

      <section className="pc-thesis-disagreements">
        <div><span>DETECTED THEMES</span><p>{analysis.themes.join(" · ")}</p></div>
        <div><span>WHERE AGENTS DISAGREE</span><ul>{analysis.disagreements.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </section>

      <section className="pc-opportunity-workspace">
        <aside className="pc-opportunity-list" aria-label="Generated investment hypotheses">
          <header><span>SIMULATED SHORTLIST</span><h2>{analysis.opportunities.length} opportunities to research</h2></header>
          {analysis.opportunities.map((opportunity) => <button type="button" key={opportunity.id} onClick={() => { setSelectedId(opportunity.id); onStatus(`${opportunity.ticker} hypothesis selected. Data remains simulated.`); }} aria-pressed={selected?.id === opportunity.id}><i>{opportunity.ticker}</i><span><b>{opportunity.name}</b><small>{opportunity.assetClass} · {opportunity.geography}</small></span><em>{opportunity.fitScore}</em></button>)}
        </aside>

        {selected && <article className="pc-panel pc-opportunity-detail">
          <header><div><span>{selected.suggestedAction.toUpperCase()} · {selected.dataStatus.toUpperCase()}</span><h2>{selected.ticker} · {selected.name}</h2><p>{selected.whyItFits}</p></div><div className="pc-opportunity-score"><strong>{selected.fitScore}</strong><small>THESIS FIT</small><b>{selected.confidence}% confidence</b></div></header>
          <div className="pc-opportunity-summary"><dl><div><dt>Portfolio role</dt><dd>{selected.role}</dd></div><div><dt>Maximum consideration</dt><dd>Up to {selected.maximumConsiderationPct}%</dd></div><div><dt>Horizon</dt><dd>{draft.horizon}</dd></div><div><dt>Execution</dt><dd>Not authorized</dd></div></dl></div>
          <div className="pc-opportunity-evidence"><section><span>EVIDENCE FOR</span><ul>{selected.evidenceFor.map((item) => <li key={item}>{item}</li>)}</ul></section><section><span>EVIDENCE AGAINST</span><ul>{selected.evidenceAgainst.map((item) => <li key={item}>{item}</li>)}</ul></section><section><span>INVALIDATION</span><p>{selected.invalidation}</p></section></div>
          <section className="pc-opportunity-scenarios"><header><span>SCENARIO RANGE</span><small>Illustrative asset-level shocks · not forecasts</small></header><div role="table" aria-label={`Scenarios for ${selected.ticker}`}><div role="row"><b role="columnheader">Scenario</b><b role="columnheader">Range</b><b role="columnheader">Interpretation</b></div>{selected.scenarios.map((scenario) => <div role="row" key={scenario.name}><span role="cell">{scenario.name}</span><strong role="cell">{scenario.illustrativeRange}</strong><p role="cell">{scenario.narrative}</p></div>)}</div></section>
          <footer className="pc-governance-footer"><p>Sending this hypothesis to review records interest only. It does not create a broker ticket, recommendation approval or transaction.</p><div><ActionButton tone="primary" onClick={() => onQueueReview(selected, analysis)}>Send to Human Review</ActionButton><ActionButton onClick={onOpenReview}>Open review queue</ActionButton><ActionButton disabled>Execution unavailable</ActionButton></div></footer>
        </article>}
      </section>

      <details className="pc-thesis-method"><summary>Assumptions and limitations</summary><div><section><h3>Assumptions</h3><ul>{analysis.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Limitations</h3><ul>{analysis.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section></div></details>
    </>}
  </div>;
}

function PortfolioView({ holdings, privacyMode, draft, setDraft, onSubmit }: { holdings: Holding[]; privacyMode: boolean; draft: { ticker: string; name: string; assetClass: string; market: string; quantity: string; averagePrice: string; currency: "USD" | "ARS"; brokerReference: string; purchaseDate: string; fees: string; horizon: string; reviewCondition: string; thesis: string; notes: string }; setDraft: React.Dispatch<React.SetStateAction<typeof draft>>; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="pc-view-stack"><section className="pc-panel pc-table-panel"><header><div><span>MANUAL REGISTRY</span><h2>Recorded positions</h2></div><small>{holdings.length} entries · locally staged UI state</small></header><div className="pc-table" role="table" aria-label="Manual portfolio holdings"><div role="row" className="pc-table__head"><span role="columnheader">Instrument</span><span role="columnheader">Class</span><span role="columnheader">Quantity</span><span role="columnheader">Avg. price</span><span role="columnheader">Est. value</span><span role="columnheader">Weight</span></div>{holdings.map((holding) => <div role="row" key={holding.id}><span role="cell"><b>{holding.ticker}</b><small>{holding.name}</small></span><span role="cell">{holding.assetClass}</span><span role="cell">{privacyMode ? "••••" : holding.quantity.toLocaleString()}</span><span role="cell">{formatMoney(holding.averagePrice, holding.currency, privacyMode)}</span><span role="cell"><b>{formatMoney(holding.marketValue, holding.currency, privacyMode)}</b></span><span role="cell">{holding.weight ? `${holding.weight}%` : "Pending snapshot"}</span></div>)}</div></section>
    <section className="pc-panel pc-entry"><header><div><span>ADD POSITION</span><h2>Manual holding</h2></div><small>No broker or wallet connection</small></header><form onSubmit={onSubmit}><div className="pc-form-grid pc-form-grid--holding"><label>Ticker *<input required maxLength={12} value={draft.ticker} onChange={(event) => setDraft((current) => ({ ...current, ticker: event.target.value }))} placeholder="e.g. SPY" /></label><label>Instrument name *<input required maxLength={80} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Descriptive name" /></label><label>Asset class<select value={draft.assetClass} onChange={(event) => setDraft((current) => ({ ...current, assetClass: event.target.value }))}><option>CEDEAR</option><option>Argentine equity</option><option>Sovereign bond</option><option>Corporate bond</option><option>Bitcoin</option><option>Cash</option></select></label><label>Market<input maxLength={40} value={draft.market} onChange={(event) => setDraft((current) => ({ ...current, market: event.target.value }))} placeholder="e.g. BYMA" /></label><label>Currency<select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as "USD" | "ARS" }))}><option>USD</option><option>ARS</option></select></label><label>Quantity *<input required inputMode="decimal" type="number" min="0.00000001" max="1000000000000" step="any" value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} /></label><label>Average price *<input required inputMode="decimal" type="number" min="0.00000001" max="1000000000000" step="any" value={draft.averagePrice} onChange={(event) => setDraft((current) => ({ ...current, averagePrice: event.target.value }))} /></label><label>Purchase date<input type="date" value={draft.purchaseDate} onChange={(event) => setDraft((current) => ({ ...current, purchaseDate: event.target.value }))} /></label><label>Fees<input inputMode="decimal" type="number" min="0" max="1000000000" step="any" value={draft.fees} onChange={(event) => setDraft((current) => ({ ...current, fees: event.target.value }))} /></label><label>Broker / wallet reference<input maxLength={60} value={draft.brokerReference} onChange={(event) => setDraft((current) => ({ ...current, brokerReference: event.target.value }))} placeholder="Label only — never credentials" /></label><label>Horizon<input maxLength={60} value={draft.horizon} onChange={(event) => setDraft((current) => ({ ...current, horizon: event.target.value }))} placeholder="e.g. 3–5 years" /></label><label className="pc-form-wide">Review price or condition<textarea maxLength={180} value={draft.reviewCondition} onChange={(event) => setDraft((current) => ({ ...current, reviewCondition: event.target.value }))} placeholder="What condition should trigger a new human review?" /></label><label className="pc-form-wide">Investment thesis<textarea maxLength={300} value={draft.thesis} onChange={(event) => setDraft((current) => ({ ...current, thesis: event.target.value }))} placeholder="Why is this position held? What would invalidate it?" /></label><label className="pc-form-wide">Notes<textarea maxLength={300} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional context; do not enter credentials or secrets." /></label></div><footer><p>Manual metadata only. Never enter API keys, seed phrases, recovery codes or private keys.</p><ActionButton tone="primary" type="submit">Add to manual registry</ActionButton></footer></form></section>
  </div>;
}

function BuilderView({ data, privacyMode, selected, setSelected, onStatus }: { data: PrivateCapitalViewData; privacyMode: boolean; selected: string; setSelected: (value: string) => void; onStatus: (message: string) => void }) {
  const proposal = data.proposals.find((item) => item.id === selected) ?? data.proposals[0];
  const selectProposal = (id: string, name: string) => { setSelected(id); onStatus(`${name} proposal selected for comparison. No allocation was accepted or executed.`); };
  return <div className="pc-view-stack"><section className="pc-proposal-grid" aria-label="Portfolio proposals">{data.proposals.map((item) => <button type="button" key={item.id} onClick={() => selectProposal(item.id, item.name)} aria-pressed={selected === item.id}><span>{item.character}</span><strong>{item.name}</strong><AllocationBar items={item.allocations} compact /><div><small>Expected range <b>{item.expectedRange}</b></small><small>Plausible loss <b>{item.plausibleLoss}</b></small></div></button>)}</section>{proposal && <section className="pc-panel pc-proposal-detail"><header><div><span>SELECTED PROPOSAL · {proposal.id.toUpperCase()}</span><h2>{proposal.name} allocation</h2></div><div className="pc-risk-dial" role="img" aria-label={`Illustrative risk score ${proposal.risk} out of 100`} style={{ "--risk": `${proposal.risk * 3.6}deg` } as React.CSSProperties}><strong>{proposal.risk}</strong><small>RISK</small></div></header><div className="pc-builder-detail"><AllocationBar items={proposal.allocations} /><dl><div><dt>Expected return range</dt><dd>{proposal.expectedRange}</dd></div><div><dt>Plausible adverse range</dt><dd>{proposal.plausibleLoss}</dd></div><div><dt>Estimated liquidity</dt><dd>{proposal.liquidity}</dd></div><div><dt>Concentration index</dt><dd>{proposal.concentration}/100</dd></div><div><dt>Illustrative capital</dt><dd>{formatMoney(data.totalAssets, data.currency, privacyMode)}</dd></div><div><dt>Optimization policy</dt><dd>Bounded · regularized</dd></div></dl></div><div className="pc-thesis-grid"><article><span>RATIONALE</span><p>{proposal.rationale}</p></article><article><span>INVALIDATION CONDITION</span><p>{proposal.invalidation}</p></article></div><footer className="pc-governance-footer"><p>Expected ranges are assumptions, not forecasts. Historical fit never overrides liquidity, concentration and personal loss constraints.</p><div><ActionButton onClick={() => onStatus(`${proposal.name} was added to the simulated comparison set only. Human review is still required.`)}>Stage in simulation</ActionButton><ActionButton disabled title="This UI does not create or execute orders">Execution unavailable</ActionButton></div></footer></section>}</div>;
}

function CrashWatchView({ inputs, evaluatedInputs, setInputs, result, onEvaluate, onStatus }: {
  inputs: CrashWatchInput;
  evaluatedInputs: CrashWatchInput;
  setInputs: React.Dispatch<React.SetStateAction<CrashWatchInput>>;
  result: ReturnType<typeof analyzeCrashWatch>;
  onEvaluate: () => void;
  onStatus: (message: string) => void;
}) {
  const [monitoringDuration, setMonitoringDuration] = useState(24);
  const [monitoringUnit, setMonitoringUnit] = useState<"hours" | "days" | "weeks">("hours");
  const hasPendingChanges = (Object.keys(inputs) as Array<keyof CrashWatchInput>).some((key) => inputs[key] !== evaluatedInputs[key]);
  const controls: Array<{ key: keyof CrashWatchInput; label: string; note: string }> = [
    { key: "volatility", label: "Volatilidad implícita", note: "Nivel de estrés del escenario" },
    { key: "breadthDeterioration", label: "Deterioro de amplitud", note: "Menos activos sostienen el mercado" },
    { key: "creditStress", label: "Estrés de crédito", note: "Spreads, defaults y refinanciación" },
    { key: "liquidityStress", label: "Compresión de liquidez", note: "Profundidad, spreads y financiación" },
    { key: "correlationConvergence", label: "Convergencia de correlaciones", note: "Diversificación que deja de proteger" },
    { key: "macroSurprise", label: "Sorpresa macro", note: "Desvío contra expectativas de consenso" },
    { key: "crowdingNarrative", label: "Crowding y narrativa", note: "Posicionamiento, euforia y concentración temática" },
  ];
  const applyPreset = (key: keyof typeof CRASH_WATCH_PRESETS, label: string) => {
    setInputs(CRASH_WATCH_PRESETS[key]);
    onStatus(`${label} synthetic stress replay loaded. Press Evaluate index now to update the result.`);
  };
  return <div className="pc-view-stack">
    <section className={`pc-crash-command is-${result.regime}`}>
      <div className="pc-crash-command__status">
        <span>COMPOSITE SYSTEMIC STRESS · SYNTHETIC REPLAY</span>
        <h2>{CRASH_REGIME_LABELS[result.regime]}</h2>
        <p>El sistema busca convergencia entre volatilidad, amplitud, crédito, liquidez, correlaciones y macro. Una alerta indica condiciones compatibles con estrés; no predice fecha, magnitud ni dirección con certeza.</p>
        <div className="pc-crash-command__facts"><small>{result.confirmations}/4 LENTES COINCIDEN</small><small>{result.evidenceQuality}% CALIDAD DE EVIDENCIA</small><small>{result.agreement}% CONVERGENCIA</small><small>FALSOS POSITIVOS NO CALIBRADOS</small></div>
      </div>
      <div className="pc-crash-gauge" role="img" aria-label={`Simulated systemic stress score ${result.score} out of 100`} style={{ "--crash-score": `${result.score * 3.6}deg` } as React.CSSProperties}>
        <div><strong>{result.score}</strong><small>STRESS / 100</small></div>
      </div>
    </section>

    <section className="pc-panel pc-crash-controls">
      <header><div><span>REPLAY LAB</span><h2>Probá regímenes y verificá cómo cambia el consenso</h2></div><div className="pc-crash-presets"><ActionButton onClick={() => applyPreset("normal", "Normal regime")}>Normal</ActionButton><ActionButton onClick={() => applyPreset("stress", "Stress buildup")}>Stress buildup</ActionButton><ActionButton tone="danger" onClick={() => applyPreset("crash", "Crash-like regime")}>Crash-like</ActionButton></div></header>
      <div className="pc-crash-signal-grid">{controls.map((control) => <label key={control.key}><span><b>{control.label}</b><small>{control.note}</small></span><output>{inputs[control.key]}</output><input type="range" min="0" max="100" value={inputs[control.key]} onChange={(event) => setInputs((current) => ({ ...current, [control.key]: Number(event.target.value) }))} /></label>)}</div>
      <div className="pc-crash-actions">
        <div><strong>{hasPendingChanges ? "CAMBIOS PENDIENTES" : "ÍNDICE EVALUADO"}</strong><p>{hasPendingChanges ? "Ajustaste las señales. El resultado superior conserva la última evaluación hasta que confirmes." : `Lectura actual: ${result.score}/100. Modificá las señales y evaluá nuevamente cuando quieras.`}</p></div>
        <ActionButton tone="primary" onClick={onEvaluate}>Evaluar índice ahora</ActionButton>
      </div>
      <fieldset className="pc-crash-monitor" aria-describedby="crash-monitor-note">
        <legend>Monitoreo por duración <span>PRÓXIMAMENTE</span></legend>
        <label>Duración<input type="number" min="1" max="365" step="1" value={monitoringDuration} onChange={(event) => setMonitoringDuration(Math.min(365, Math.max(1, Number(event.target.value) || 1)))} /></label>
        <label>Unidad<select value={monitoringUnit} onChange={(event) => setMonitoringUnit(event.target.value as typeof monitoringUnit)}><option value="hours">Horas</option><option value="days">Días</option><option value="weeks">Semanas</option></select></label>
        <ActionButton disabled title="El monitoreo continuo todavía no está habilitado">Iniciar monitoreo</ActionButton>
        <p id="crash-monitor-note">Podés dejar definida la duración. Por ahora este control no inicia tareas automáticas ni consulta datos en segundo plano.</p>
      </fieldset>
      <p className="pc-method-note">Regla pública y determinística. Pesos: volatilidad 20%, amplitud 18%, crédito 18%, liquidez 16%, correlación 10%, macro 8% y crowding 10%. La cobertura está fijada en 65% por tratarse de un replay sintético y no puede aumentarse desde la interfaz. Un patrón elevado requiere cobertura ≥60% y al menos tres lentes por encima del umbral.</p>
    </section>

    <section className="pc-panel pc-agent-council pc-crash-agents">
      <header><div><span>FOUR-AGENT LENS CHECK</span><h2>Convergencia explicable, desacuerdo visible</h2></div><small>Solo Mathematics, Finance, Strategy y Marketing · inferencia simulada</small></header>
      <div>{result.agents.map((agent) => <article key={agent.id} className={`is-${agent.stance}`}><header><i>{agent.label.slice(0, 2).toUpperCase()}</i><div><strong>{agent.label}</strong><small>{agent.mandate}</small></div><em>{agent.score}</em></header><p>{agent.conclusion}</p><footer>{agent.stance.toUpperCase()} · EVIDENCE QUALITY {agent.evidenceQuality}%</footer></article>)}</div>
    </section>

    <section className="pc-crash-validation">
      <article><span>01 · CONFIRMATION</span><h3>No depende de una sola señal</h3><p>El régimen sube solo cuando múltiples familias de evidencia y al menos tres lentes determinísticas coinciden.</p></article>
      <article><span>02 · CALIBRATION</span><h3>Calidad limitada y falsos positivos</h3><p>La calidad de evidencia tiene un techo de 65%. La tasa de falsos positivos todavía no está calibrada con datos observados.</p></article>
      <article><span>03 · HUMAN GATE</span><h3>Señalizar no significa operar</h3><p>La salida sirve para revisar exposición, liquidez y escenarios. Nunca crea una orden ni recomienda una venta automática.</p></article>
    </section>
    <details className="pc-thesis-method"><summary>Supuestos, límites y condiciones de invalidación</summary><div><section><h3>Qué observa</h3><ul><li>Nivel compuesto de estrés dentro del escenario seleccionado.</li><li>Contagio entre crédito, liquidez, amplitud y correlación.</li><li>Convergencia entre lentes y calidad de evidencia.</li></ul></section><section><h3>Qué no puede saber</h3><ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section></div></details>
  </div>;
}

function MarketView({ view, data }: { view: PrivateCapitalView; data: { tone: string; headline: string; summary: string; facts: Array<[string, string, string]> } }) {
  return <div className="pc-view-stack"><section className="pc-intel-hero"><div><span>SIMULATED REGIME VIEW · {data.tone}</span><h2>{data.headline}</h2><p>{data.summary}</p></div><div className="pc-orbit" aria-hidden="true"><i /><i /><i /><b>{NAV_ITEMS.find((item) => item.id === view)?.glyph}</b></div></section><section className="pc-panel pc-intel-table"><header><div><span>OBSERVATION REGISTER</span><h2>Evidence status</h2></div><small>Price fields withheld without validated feed</small></header><div>{data.facts.map(([subject, reading, source]) => <article key={subject}><strong>{subject}</strong><span>{reading}</span><small>{source}</small><em>REVIEW</em></article>)}</div></section><section className="pc-three-cards"><article><span>WHAT MATTERS</span><h3>Portfolio relationship</h3><p>Interpret the observation relative to current exposure, liquidity needs and policy limits.</p></article><article><span>WHAT CAN FAIL</span><h3>Data and regime risk</h3><p>Delayed, estimated or simulated inputs can become invalid before a human review occurs.</p></article><article><span>NEXT GATE</span><h3>Validate, then decide</h3><p>Replace mock inputs, rerun the analysis and document any decision under human authority.</p></article></section></div>;
}

function AssetDetailsView({ records, privacyMode }: { records: AssetDetailRecord[]; privacyMode: boolean }) {
  return <div className="pc-view-stack"><section className="pc-asset-details" aria-label="Instrument data and provenance">{records.map((record) => <article className="pc-panel" key={record.id}><header><div><span>{record.classification}</span><h2>{record.title}</h2></div><small>Every field includes mock provenance</small></header><dl>{record.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.sensitive && privacyMode ? "••••••" : field.value}</dd><small><b>{field.provenance.kind.toUpperCase()}</b> · Source {field.provenance.source} · {field.provenance.market} · {field.provenance.currency}</small><small>Observed {field.provenance.observedAt} · Latency {field.provenance.latency} · Confidence {field.provenance.confidence}</small></div>)}</dl></article>)}</section><section className="pc-three-cards"><article><span>DATA GATE</span><h3>Unavailable means unavailable</h3><p>Price-derived metrics remain uncalculated until a validated provider supplies sufficient inputs.</p></article><article><span>RISK SEPARATION</span><h3>No composite certainty</h3><p>Market, currency, credit, liquidity and concentration risks remain visible as distinct dimensions.</p></article><article><span>HUMAN AUTHORITY</span><h3>Review before use</h3><p>These mock records support interface evaluation only and cannot authorize an investment decision.</p></article></section></div>;
}

function SignalsView({ onStatus }: { onStatus: (message: string) => void }) {
  const [decisions, setDecisions] = useState<Record<string, "tracking" | "dismissed">>({});
  const signals = [
    { asset: "SPY CEDEAR", action: "ACCUMULATE GRADUALLY", intensity: "Moderate", confidence: 67, horizon: "3–5 years", observedRange: "Price withheld — mock feed", expires: "25 Jul 2026", evidence: "Diversification benefit; target underweight. Portfolio Construction and Risk agree.", against: "Valuation and local-spread sensitivity. Red Team requests live liquidity validation.", invalidation: "International equity exceeds 48% or the horizon falls below three years.", portfolio: "Could lower Argentina concentration and raise equity risk moderately." },
    { asset: "AL30", action: "REVIEW THESIS", intensity: "High attention", confidence: 48, horizon: "6–18 months", observedRange: "Price unavailable", expires: "19 Jul 2026", evidence: "Recovery scenario remains possible; Bonds specialist finds cash-flow optionality.", against: "Sovereign, restructuring and exit-liquidity risk; Risk and Red Team disagree with accumulation.", invalidation: "Adverse recovery threshold is breached or validated liquidity deteriorates.", portfolio: "Existing exposure is near the Argentina policy ceiling; no increase is suggested." },
    { asset: "Bitcoin", action: "MAINTAIN BAND", intensity: "Low", confidence: 61, horizon: "4+ years", observedRange: "Price withheld — mock feed", expires: "25 Jul 2026", evidence: "Allocation is inside the personal band; Risk and Bitcoin specialists agree on no action.", against: "High drawdown and regime variability; on-chain inputs are not connected.", invalidation: "Portfolio weight exceeds 10% or loss tolerance is reduced.", portfolio: "No estimated change to current risk or diversification while the weight remains in-band." },
  ];
  const decide = (asset: string, decision: "tracking" | "dismissed") => {
    setDecisions((current) => ({ ...current, [asset]: decision }));
    onStatus(`${asset} signal ${decision === "tracking" ? "sent to human monitoring" : "dismissed"}. No trade was authorized or executed.`);
  };
  return <section className="pc-signal-list">{signals.map((signal) => <article key={signal.asset}><header><div><span>{signal.action} · {signal.intensity}</span><h2>{signal.asset}</h2></div><div className="pc-confidence"><i style={{ width: `${signal.confidence}%` }} /><strong>{signal.confidence}%</strong><small>SIMULATED CONFIDENCE</small></div></header><div><p><b>Evidence for</b>{signal.evidence}</p><p><b>Evidence against</b>{signal.against}</p><p><b>Invalidation</b>{signal.invalidation}</p><p><b>Portfolio relationship</b>{signal.portfolio}</p></div><footer className="pc-signal-actions"><span>Horizon {signal.horizon} · Observed range: {signal.observedRange} · Expires {signal.expires}. Not an instruction to transact.</span><div><ActionButton tone="primary" onClick={() => decide(signal.asset, "tracking")} aria-pressed={decisions[signal.asset] === "tracking"}>Track hypothesis</ActionButton><ActionButton onClick={() => decide(signal.asset, "dismissed")} aria-pressed={decisions[signal.asset] === "dismissed"}>Dismiss</ActionButton></div></footer></article>)}</section>;
}

function RebalancingView({ privacyMode, contribution, setContribution }: { privacyMode: boolean; contribution: number; setContribution: (value: number) => void }) {
  const rows = [["Global equity", "38%", "42%", "+4%", "Use new contributions"], ["Fixed income", "24%", "27%", "+3%", "Review duration mix"], ["Cash", "14%", "15%", "+1%", "Preserve reserve"], ["Argentina", "16%", "8%", "−8%", "Review concentration"], ["Bitcoin", "8%", "8%", "—", "Within band"]];
  return <div className="pc-view-stack"><section className="pc-panel"><header><div><span>CONTRIBUTION-AWARE MODE</span><h2>Current versus balanced target</h2></div><label className="pc-inline-field">New contribution <span>USD</span><input type="number" min="0" max="1000000" step="100" value={contribution} onChange={(event) => setContribution(Math.max(0, Math.min(1000000, Number(event.target.value) || 0)))} /></label></header><div className="pc-rebalance-table"><div><b>Allocation</b><b>Current</b><b>Target</b><b>Gap</b><b>Decision note</b></div>{rows.map((row) => <div key={row[0]}>{row.map((cell, index) => <span key={cell}>{index === 0 ? <b>{cell}</b> : cell}</span>)}</div>)}</div><div className="pc-rebalance-summary"><article><span>ILLUSTRATIVE CONTRIBUTION</span><strong>{formatMoney(contribution, "USD", privacyMode)}</strong><small>Could narrow gaps without simulated sales</small></article><article><span>CONCENTRATION EFFECT</span><strong>−5.2 pts</strong><small>Under balanced target assumptions</small></article><article><span>AUTHORITY</span><strong>Human only</strong><small>No trade tickets or broker messages</small></article></div></section></div>;
}

function AlertsView({ alerts, onState }: { alerts: CapitalAlert[]; onState: (id: string, action: "read" | "archive") => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const active = alerts.filter((alert) => !alert.archived);
  const visible = showHistory ? alerts : active;
  return <section className="pc-panel pc-alert-center"><header><div><span>IN-APP PROVIDER</span><h2>{active.filter((alert) => !alert.read).length} unread observations</h2></div><div className="pc-alert-tools"><small>Grouped · rate limited · no external channel</small><ActionButton onClick={() => setShowHistory((current) => !current)} aria-pressed={showHistory}>{showHistory ? "Active queue" : `History (${alerts.length - active.length})`}</ActionButton></div></header><div>{visible.length ? visible.map((alert) => <article key={alert.id} className={`${alert.read ? "is-read" : ""}${alert.archived ? " is-archived" : ""}`}><i className={`is-${alert.severity}`} /><div><span>{alert.severity} · next review {alert.nextReview}{alert.archived ? " · archived" : ""}</span><h3>{alert.title}</h3><p>{alert.detail}</p><small>Source: simulated portfolio snapshot · Confidence: limited · Operational alert suppressed until validation.</small></div><footer>{!alert.archived && !alert.read && <ActionButton onClick={() => onState(alert.id, "read")}>Mark read</ActionButton>}{!alert.archived && <ActionButton onClick={() => onState(alert.id, "archive")}>Archive</ActionButton>}</footer></article>) : <p className="pc-empty">No active alerts. Use History to review archived observations.</p>}</div></section>;
}

type Scenario = { fxShock: number; equityShock: number; sovereignShock: number; bitcoinShock: number; contribution: number };
function SimulationView({ scenario, setScenario, impact, privacyMode }: { scenario: Scenario; setScenario: React.Dispatch<React.SetStateAction<Scenario>>; impact: number; privacyMode: boolean }) {
  return <div className="pc-view-stack"><div className="pc-simulation-label">SIMULATION ONLY — NO REAL ORDERS ARE BEING PLACED.</div><section className="pc-grid pc-grid--simulation"><div className="pc-panel"><header><div><span>SHOCK CONTROLS</span><h2>Adverse-case explorer</h2></div><ActionButton onClick={() => setScenario((current) => ({ fxShock: 18, equityShock: -20, sovereignShock: -28, bitcoinShock: -35, contribution: current.contribution }))}>Reset scenario</ActionButton></header><div className="pc-scenario-controls"><RangeControl label="ARS depreciation" value={scenario.fxShock} min={0} max={100} suffix="%" onChange={(value) => setScenario((current) => ({ ...current, fxShock: value }))} /><RangeControl label="Global equity shock" value={scenario.equityShock} min={-50} max={20} suffix="%" onChange={(value) => setScenario((current) => ({ ...current, equityShock: value }))} /><RangeControl label="Sovereign bond shock" value={scenario.sovereignShock} min={-60} max={20} suffix="%" onChange={(value) => setScenario((current) => ({ ...current, sovereignShock: value }))} /><RangeControl label="Bitcoin shock" value={scenario.bitcoinShock} min={-80} max={40} suffix="%" onChange={(value) => setScenario((current) => ({ ...current, bitcoinShock: value }))} /></div><p className="pc-method-note">Illustrative linear sensitivities only. Inputs are bounded; no orders, URLs, scripts or external accounts are involved.</p></div><div className="pc-panel pc-impact"><span>ESTIMATED PORTFOLIO IMPACT</span><strong className={impact < -20 ? "is-critical" : ""}>{impact > 0 ? "+" : ""}{impact}%</strong><small>{privacyMode ? "••••••" : formatMoney(248750 * impact / 100, "USD", false)} illustrative change</small><div role="img" aria-label={`Simulated impact ${impact}%`}><i style={{ width: `${Math.min(100, Math.abs(impact) * 3)}%` }} /></div><p>Approximation combines static exposures and linear shock sensitivities. It excludes path dependency, liquidity gaps, taxes, spreads and correlation regime changes.</p></div></section></div>;
}

function RiskView({ data, profile }: { data: PrivateCapitalViewData; profile: Profile }) {
  const risks = [["Maximum drawdown", Math.abs(data.maxDrawdown), profile.maxLoss, "Historical simulation"], ["Argentina exposure", 23.4, profile.argentinaLimit, "Near limit"], ["Bitcoin exposure", 8, profile.bitcoinLimit, "Within band"], ["Single-asset concentration", 21.6, 25, "Within limit"], ["Portfolio volatility", data.volatility, 20, "Model estimate"]] as const;
  return <div className="pc-view-stack"><section className="pc-risk-grid">{risks.map(([label, value, limit, note]) => { const ratio = Math.min(100, value / limit * 100); return <article key={label}><span>{label}</span><strong>{value}% <small>/ {limit}% limit</small></strong><div><i style={{ width: `${ratio}%` }} className={ratio > 88 ? "is-warning" : ""} /></div><p>{note}</p></article>; })}</section><section className="pc-panel pc-risk-matrix"><header><div><span>RISK MATRIX</span><h2>Distinct loss channels</h2></div><small>Likelihood × impact · simulated</small></header><div><article className="is-high"><b>Sovereign restructuring</b><span>Lower likelihood</span><strong>Severe impact</strong></article><article className="is-high"><b>Currency regime shift</b><span>Medium likelihood</span><strong>High impact</strong></article><article className="is-medium"><b>Liquidity compression</b><span>Medium likelihood</span><strong>Medium impact</strong></article><article className="is-medium"><b>Equity drawdown</b><span>Higher likelihood</span><strong>Medium impact</strong></article></div></section></div>;
}

function ReviewView({ reviews, onState }: { reviews: ReviewItem[]; onState: (id: string, state: ReviewItem["state"]) => void }) {
  return <section className="pc-review-list">{reviews.map((review) => <article key={review.id}><header><div><span>{review.state}</span><h2>{review.asset}</h2><p>{review.hypothesis}</p></div><div className="pc-review-confidence"><strong>{review.confidence}%</strong><small>SIMULATED<br />CONFIDENCE</small></div></header><div className="pc-review-evidence"><p><b>EVIDENCE</b>{review.evidence}</p><p><b>COUNTER-EVIDENCE</b>{review.counterEvidence}</p><p><b>HORIZON</b>{review.horizon}</p></div><footer><ActionButton tone="primary" onClick={() => onState(review.id, "Approved as hypothesis")}>Accept for monitoring</ActionButton><ActionButton onClick={() => onState(review.id, "More research")}>Request research / reformulate</ActionButton><ActionButton tone="danger" onClick={() => onState(review.id, "Rejected")}>Reject</ActionButton><ActionButton onClick={() => onState(review.id, "Archived")}>Archive</ActionButton><small>Acceptance records a hypothesis for monitoring only. It creates no order and grants no execution authority.</small></footer></article>)}</section>;
}

function SettingsView({ settings, setSettings }: { settings: { compact: boolean; quietHours: boolean; groupAlerts: boolean }; setSettings: React.Dispatch<React.SetStateAction<{ compact: boolean; quietHours: boolean; groupAlerts: boolean }>> }) {
  return <div className="pc-grid pc-grid--settings"><section className="pc-panel"><header><div><span>DISPLAY</span><h2>Workspace preferences</h2></div><small>Device-local UI state</small></header><div className="pc-setting-list"><Toggle label="Compact information density" description="Reduce vertical space while preserving all labels." checked={settings.compact} onChange={(checked) => setSettings((current) => ({ ...current, compact: checked }))} /><Toggle label="Group similar alerts" description="Collapse related observations into a single attention item." checked={settings.groupAlerts} onChange={(checked) => setSettings((current) => ({ ...current, groupAlerts: checked }))} /><Toggle label="Quiet-hour preparation" description="Prepare the preference only; no external channel is connected." checked={settings.quietHours} onChange={(checked) => setSettings((current) => ({ ...current, quietHours: checked }))} /></div></section><section className="pc-panel pc-security-card"><header><div><span>SECURITY BOUNDARY</span><h2>Credential policy</h2></div><i>LOCKED</i></header><ul><li>No broker credentials accepted</li><li>No seed phrases or private keys accepted</li><li>No withdrawal-capable API keys</li><li>No trade execution interfaces</li><li>Server-side authorization required by integration</li></ul><p>This UI does not itself establish authorization. Integrators must protect the route and every backing endpoint with the <code>private_capital_owner</code> role.</p></section></div>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="pc-toggle"><span><b>{label}</b><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}

export { MOCK_DATA as PRIVATE_CAPITAL_MOCK_DATA };
