export const SIMULATED_DATA_WARNING =
  "Simulated data — not suitable for real investment decisions." as const;

export type DataFreshness =
  | "real_time"
  | "delayed"
  | "close"
  | "estimated"
  | "simulated"
  | "unavailable";

export type DataCurrency = "ARS" | "USD" | "BTC" | null;
export type DataConfidenceLabel = "unavailable" | "simulated" | "low" | "medium" | "high";
export type DecisionSuitability = "not_suitable" | "analysis_with_caution" | "analysis_eligible";

export interface DataProvenance {
  freshness: DataFreshness;
  source: string;
  observedAt: string | null;
  retrievedAt: string;
  currency: DataCurrency;
  market: string | null;
  latencyMs: number | null;
  confidence: number;
  confidenceLabel: DataConfidenceLabel;
  decisionSuitability: DecisionSuitability;
  validated: boolean;
  warning: typeof SIMULATED_DATA_WARNING | null;
}

export interface ProviderResult<T> {
  items: readonly T[];
  provenance: DataProvenance;
  limitations: readonly string[];
}

export interface MarketQuote {
  instrumentId: string;
  symbol: string;
  value: number | null;
  currency: DataCurrency;
  market: string | null;
  provenance: DataProvenance;
}

export interface MacroObservation {
  indicatorId: string;
  label: string;
  value: number | null;
  unit: string;
  period: string;
  provenance: DataProvenance;
}

export interface NewsObservation {
  id: string;
  headline: string;
  summary: string;
  publishedAt: string;
  relatedInstrumentIds: readonly string[];
  provenance: DataProvenance;
}

export interface OnChainObservation {
  network: "bitcoin";
  metricId: string;
  label: string;
  value: number | null;
  unit: string;
  provenance: DataProvenance;
}

export interface MarketDataRequest {
  instrumentIds: readonly string[];
}

export interface MacroDataRequest {
  indicatorIds: readonly string[];
}

export interface NewsDataRequest {
  query?: string;
  relatedInstrumentIds?: readonly string[];
  limit?: number;
}

export interface OnChainDataRequest {
  network: "bitcoin";
  metricIds: readonly string[];
}

export interface DataQualityAssessment {
  freshness: DataFreshness;
  confidenceLabel: DataConfidenceLabel;
  decisionSuitability: DecisionSuitability;
  ageMs: number | null;
  reasons: readonly string[];
}
