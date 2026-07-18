/**
 * Deterministic planning models for the authenticated workspace.
 *
 * These inputs are deliberately generic. They do not encode a proprietary
 * scoring formula and their outputs are comparative planning estimates, not
 * investment recommendations or calibrated forecasts.
 */

export interface ScenarioInput {
  id: string;
  /** Relative likelihood. Values are normalized across the supplied scenarios. */
  likelihood: number;
  annualRevenue: number;
  grossMarginPercent: number;
  annualOperatingCost: number;
  initialCapital: number;
  horizonYears: number;
  /** Symmetric contribution uncertainty used only for the demonstrative range. */
  uncertaintyPercent?: number;
}

export interface ScenarioAnalysisInput {
  scenarios: readonly ScenarioInput[];
  /** Annual rate used to discount future operating contribution. */
  discountRatePercent?: number;
}

export interface NormalizedScenario {
  id: string;
  likelihoodPercent: number;
  annualContribution: number;
  netPresentValue: number;
  lowerNetPresentValue: number;
  upperNetPresentValue: number;
  uncertaintyPercent: number;
}

export interface ScenarioAnalysisResult {
  discountRatePercent: number;
  scenarioCount: number;
  expectedNetPresentValue: number;
  lowerExpectedNetPresentValue: number;
  upperExpectedNetPresentValue: number;
  probabilityOfLossPercent: number;
  p10NetPresentValue: number;
  medianNetPresentValue: number;
  p90NetPresentValue: number;
  scenarios: NormalizedScenario[];
}

export interface MonteCarloConfig {
  samples: number;
  seed: number;
}

export interface MonteCarloSummary {
  samples: number;
  seed: number;
  meanNetPresentValue: number;
  p10NetPresentValue: number;
  medianNetPresentValue: number;
  p90NetPresentValue: number;
  probabilityOfLossPercent: number;
  minimumNetPresentValue: number;
  maximumNetPresentValue: number;
}

export interface MissionCandidateInput {
  id: string;
  /** Relative planning allocation; values are normalized across candidates. */
  allocation: number;
  score: number;
  confidencePercent: number;
  riskPercent: number;
}

export interface MissionAggregationInput {
  candidates: readonly MissionCandidateInput[];
}

export interface MissionContribution {
  id: string;
  allocationPercent: number;
  evidenceAdjustedScoreContribution: number;
  riskContribution: number;
}

export interface MissionAggregationResult {
  candidateCount: number;
  missionIndex: number;
  evidenceCoveragePercent: number;
  riskExposurePercent: number;
  concentrationIndex: number;
  highestRiskContributorId: string | null;
  contributions: MissionContribution[];
  reviewNotes: string[];
}

export const PRIVATE_MODEL_DISCLOSURE = {
  version: "private-planning-models-1.0",
  assumptions: [
    "Scenario likelihoods and mission allocations are relative inputs normalized to 100%.",
    "Scenario operating contribution is annual revenue × gross margin minus annual operating cost.",
    "Uncertainty ranges are symmetric planning sensitivities; they are not confidence intervals.",
    "Monte Carlo sampling selects a declared scenario and varies only its declared contribution uncertainty.",
  ],
  limitations: [
    "Inputs are user- or evidence-supplied and are not independently calibrated or verified by these functions.",
    "The outputs do not predict returns, approve investments, allocate capital, or replace human review.",
    "Correlation, taxes, financing terms, liquidity, and many operational constraints are outside this bounded model.",
  ],
} as const;
