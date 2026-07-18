export const SIMULATED_DATA_NOTICE = "Simulated data — not suitable for real investment decisions." as const;
export const DECISION_SUPPORT_NOTICE =
  "Decision-support environment. No trades are executed automatically. Final investment decisions remain under human control." as const;
export const SIMULATION_NOTICE = "Simulation only — no real orders are being placed." as const;

export type Currency = "ARS" | "USD" | "BTC";
export type AssetClass = "cedear" | "bond" | "bitcoin" | "cash";

export interface MockDataProvenance {
  kind: "mock";
  source: string;
  timestamp: string;
  currency: Currency;
  market: string;
  latencyMs: number;
  confidence: number;
  confidenceLabel: "simulated";
  validated: boolean;
  notice: typeof SIMULATED_DATA_NOTICE;
}

export interface FinancialAsset {
  id: string;
  ticker: string;
  name: string;
  assetClass: AssetClass;
  currency: Currency;
  market: string;
  sector: string;
  geography: "argentina" | "international" | "global";
  referenceValue: number;
  riskScore: number;
  liquidityScore: number;
  provenance: MockDataProvenance;
}

export interface InvestorProfileInput {
  name: string;
  capital: number;
  referenceCurrency: "ARS" | "USD";
  horizonMonths: number;
  liquidityNeedPct: number;
  lossTolerancePct: number;
  maximumTolerableLossPct: number;
  targetReturnPct: number;
  maximumArgentinaPct: number;
  maximumBitcoinPct: number;
  maximumAssetPct: number;
  maximumSectorPct: number;
  preference: "growth" | "income" | "preservation";
  experienceYears: number;
  allowedAssetClasses: AssetClass[];
  excludedAssetIds: string[];
  contributionFrequency: "none" | "monthly" | "quarterly" | "annual";
  rebalanceMonths: number;
  periodicWithdrawalPct: number;
  emergencyReserveMonths: number;
  personalRestrictions: string[];
  /** Keeps the quantitative score visible while allowing an owner-authored profile. */
  profileMode?: "derived" | "custom";
}

export type RiskProfileLabel = "conservative" | "moderate" | "aggressive" | "custom";

export interface DerivedInvestorProfile {
  input: InvestorProfileInput;
  riskScore: number;
  label: RiskProfileLabel;
  components: {
    horizon: number;
    lossCapacity: number;
    liquidityCapacity: number;
    experience: number;
    objective: number;
  };
  componentWeights: Record<keyof DerivedInvestorProfile["components"], number>;
  constraints: PortfolioLimits;
  assumptions: string[];
}

export interface PortfolioLimits {
  maximumArgentinaWeight: number;
  maximumBitcoinWeight: number;
  maximumAssetWeight: number;
  maximumSectorWeight: number;
  minimumCashWeight: number;
  allowedAssetClasses: AssetClass[];
  excludedAssetIds: string[];
}

export interface ManualHolding {
  id: string;
  assetId: string;
  ticker: string;
  market: string;
  quantity: number;
  averagePrice: number;
  currency: Currency;
  accountReference?: string;
  acquiredAt: string;
  fees: number;
  thesis?: string;
  horizonMonths?: number;
  reviewCondition?: string;
  notes?: string;
}

export type TransactionSide = "buy" | "sell" | "deposit" | "withdrawal";

export interface PortfolioTransaction {
  id: string;
  holdingId?: string;
  assetId?: string;
  side: TransactionSide;
  quantity: number;
  unitPrice: number;
  currency: Currency;
  fees: number;
  occurredAt: string;
  note?: string;
}

export interface PortfolioSnapshotPosition {
  assetId: string;
  quantity: number;
  referenceValue: number;
  currency: Currency;
  weight: number;
}

export interface PortfolioSnapshot {
  id: string;
  capturedAt: string;
  referenceCurrency: "ARS" | "USD";
  totalReferenceValue: number;
  positions: PortfolioSnapshotPosition[];
  provenance: MockDataProvenance[];
}

export interface ValidationResult<T> {
  value: T | null;
  issues: string[];
}

export interface ProposalCandidate {
  asset: FinancialAsset;
  desiredWeight: number;
  rationale: string;
  role: string;
  risks: string[];
}

export interface ProposalAllocation extends ProposalCandidate {
  weight: number;
  suggestedAmount: number;
}

export interface PortfolioProposal {
  id: string;
  name: string;
  allocations: ProposalAllocation[];
  expectedReturnRangePct: [number, number];
  plausibleLossPct: number;
  horizonMonths: number;
  scenarios: { adversePct: number; basePct: number; favorablePct: number };
  invalidationConditions: string[];
  limitations: string[];
  normalized: true;
}

export interface MetricResult {
  value: number | null;
  unit: "ratio" | "decimal";
  observations: number;
  formula: string;
  assumptions: string[];
  limitations: string[];
}

export type SignalAction =
  | "possible_buy_opportunity"
  | "gradual_accumulation"
  | "hold"
  | "await_confirmation"
  | "reduce_exposure"
  | "review_thesis"
  | "possible_exit"
  | "elevated_risk"
  | "insufficient_data";

export interface SignalEvidence {
  label: string;
  detail: string;
  sourceType: "valuation" | "fundamental" | "trend" | "macro" | "risk" | "liquidity" | "portfolio";
  provenance: MockDataProvenance;
}

export interface ExplainableSignal {
  id: string;
  assetId: string;
  action: SignalAction;
  intensity: number;
  horizonMonths: number;
  confidence: number;
  evidenceFor: SignalEvidence[];
  evidenceAgainst: SignalEvidence[];
  risks: string[];
  invalidationCondition: string;
  observedRange?: [number, number];
  expiresAt: string;
  portfolioRelationship: string;
  estimatedRiskImpact: string;
  estimatedDiversificationImpact: string;
  assumptions: string[];
  executiveExplanation: string;
  technicalExplanation: string;
  humanReviewRequired: true;
}

export type AlertType =
  | "price_change"
  | "abnormal_movement"
  | "thesis_deterioration"
  | "valuation_improvement"
  | "bond_maturity"
  | "coupon_payment"
  | "rebalance_due"
  | "concentration_excess"
  | "risk_limit_breach"
  | "personal_drawdown"
  | "correlation_change"
  | "macro_event"
  | "material_news"
  | "regulatory_change"
  | "signal_expired"
  | "target_drift"
  | "bitcoin_change"
  | "multi_agent_opportunity";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  assetId?: string;
  title: string;
  explanation: string;
  detectedAt: string;
  nextReviewAt: string;
  maximumFrequencyMs: number;
  silencePeriodMs: number;
  operational: boolean;
  provenance: MockDataProvenance[];
}

export interface InAppAlert extends AlertCandidate {
  id: string;
  fingerprint: string;
  status: "unread" | "read" | "archived";
  groupedOccurrences: number;
}

export type HumanReviewState =
  | "draft"
  | "pending_review"
  | "approved_hypothesis"
  | "rejected"
  | "needs_research"
  | "expired"
  | "archived";

export type HumanReviewAction =
  | "submit"
  | "accept_for_tracking"
  | "investigate"
  | "discard"
  | "reformulate"
  | "expire"
  | "archive";

export interface HumanReviewRecord {
  id: string;
  signalId: string;
  state: HumanReviewState;
  updatedAt: string;
  history: Array<{
    from: HumanReviewState;
    to: HumanReviewState;
    action: HumanReviewAction;
    actorId: string;
    timestamp: string;
    note: string;
  }>;
  executionAuthorized: false;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  assetClassShocks: Partial<Record<AssetClass, number>>;
  assetShocks?: Record<string, number>;
  maximumAbsoluteShock: number;
}

export interface ScenarioResult {
  scenarioId: string;
  portfolioReturn: number;
  endingValue: number;
  contributions: Array<{ assetId: string; shock: number; contribution: number }>;
  assumptions: string[];
  notice: typeof SIMULATION_NOTICE;
}

export interface RebalanceInstruction {
  assetId: string;
  currentWeight: number;
  targetWeight: number;
  differenceWeight: number;
  referenceAmount: number;
  direction: "increase" | "reduce" | "hold";
  priority: "low" | "medium" | "high";
  estimatedCost: number;
  executionAuthorized: false;
}

export interface TransparentMetric {
  value: number | null;
  unit: string;
  formula: string;
  assumptions: string[];
  limitations: string[];
  provenance: MockDataProvenance[];
}

export interface CedearInstrument {
  assetId: string;
  underlyingSymbol: string;
  underlyingKind: "equity" | "etf";
  /** Number of local CEDEAR certificates representing one underlying security. */
  cedearsPerUnderlying: number;
  localPriceArs: number | null;
  underlyingPriceUsd: number | null;
  annualDividendPerUnderlyingUsd: number | null;
  sector: string;
  localLiquidityScore: number;
  provenance: MockDataProvenance[];
}

export interface CedearAnalysis {
  instrument: CedearInstrument;
  impliedExchangeRate: TransparentMetric;
  localDividendYield: TransparentMetric;
  risks: string[];
  limitations: string[];
}

export interface BondCashFlow {
  paymentAt: string;
  amountPerFace: number;
  kind: "coupon" | "principal";
}

export interface ArgentineBondInstrument {
  assetId: string;
  ticker: string;
  issuerKind: "sovereign" | "corporate";
  governingLaw: "argentina" | "new_york" | "other";
  currency: "ARS" | "USD";
  settlementAt: string;
  maturityAt: string;
  faceValue: number;
  cleanPricePerFace: number | null;
  annualYield: number | null;
  cashFlows: BondCashFlow[];
  liquidityScore: number;
  provenance: MockDataProvenance[];
}

export interface ArgentineBondAnalysis {
  instrument: ArgentineBondInstrument;
  parity: TransparentMetric;
  macaulayDuration: TransparentMetric;
  modifiedDuration: TransparentMetric;
  convexity: TransparentMetric;
  riskDimensions: {
    sovereignOrCredit: string;
    interestRate: string;
    currency: string;
    liquidity: string;
    restructuring: string;
  };
  limitations: string[];
}

export interface BitcoinPositionInput {
  assetId: string;
  quantity: number;
  averageCostUsd: number;
  observedPriceUsd: number | null;
  totalPortfolioValueUsd: number;
  maximumBitcoinWeight: number;
  returns: number[];
  valueHistory: number[];
  provenance: MockDataProvenance[];
}

export interface BitcoinPositionAnalysis {
  currentValueUsd: number | null;
  portfolioWeight: number | null;
  maximumBitcoinWeight: number;
  limitStatus: "within_limit" | "over_limit" | "insufficient_data";
  volatility: MetricResult;
  maximumDrawdown: MetricResult;
  reviewGuidance: string;
  assumptions: string[];
  limitations: string[];
  executionAuthorized: false;
}
