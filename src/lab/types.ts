export const AGENT_NAMES = ["Mathematics", "Finance", "Strategy", "Marketing"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export const DIMENSION_KEYS = [
  "marketPotential",
  "financialViability",
  "strategicAdvantage",
  "adoptionPotential",
  "technicalFeasibility",
  "evidenceQuality",
  "risk",
  "scalability",
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type Objective =
  | "Generate startup opportunities"
  | "Explore new markets"
  | "Evaluate a thesis"
  | "Design new products"
  | "Support Venture Capital"
  | "Support a Venture Studio"
  | "Corporate innovation"
  | "Technology exploration";

export type DistributionName = "normal" | "triangular" | "beta" | "uniform" | "bernoulli";
export type HumanDecision = "Pending" | "Saved" | "Promising" | "Uncertain" | "Rejected" | "More evidence";
export type OpportunityCategory = "Insufficient Evidence" | "Weak" | "Uncertain" | "Promising" | "Highly Promising" | "Priority for Human Review";
export type SimulationStatus = "Ready" | "Running" | "Paused" | "Completed" | "Insufficient Evidence" | "Invalid Configuration" | "Simulation Failed";

export interface LabInput {
  ideaNarrative: string;
  ideaSummary: string;
  analysisName: string;
  problem: string;
  thesis: string;
  industry: string;
  market: string;
  technology: string;
  region: string;
  horizonYears: number;
  customerType: string;
  estimatedCapital: number;
  riskTolerance: number;
  innovationLevel: number;
  knownSignals: string;
  availableEvidence: string;
  objective: Objective;
  opportunityCount: number;
  seed: number;
}

export interface AgentResult {
  agentName: AgentName;
  domain: string;
  score: number;
  confidence: number;
  evidenceQuality: number;
  findings: string[];
  risks: string[];
  assumptions: string[];
  missingEvidence: string[];
  recommendation: string;
  uncertainties: string[];
  criticism: string;
  status: "Completed" | "Warning";
}

export interface RiskItem {
  name: string;
  probability: number;
  impact: number;
  uncertainty: number;
  mitigation: string;
  evidence: string;
}

export interface Opportunity {
  id: string;
  name: string;
  problem: string;
  proposedSolution: string;
  targetCustomer: string;
  businessModel: string;
  industry: string;
  technology: string;
  region: string;
  novelty: number;
  estimatedCapital: number;
  criticalHypotheses: string[];
  availableEvidence: string[];
  risks: RiskItem[];
  dimensions: Record<DimensionKey, number>;
  agents: Record<AgentName, AgentResult>;
  totalScore: number;
  confidence: number;
  uncertainty: number;
  disagreement: number;
  category: OpportunityCategory;
  humanDecision: HumanDecision;
  rank: number;
  previousRank: number;
}

export interface LabWeights {
  agents: Record<AgentName, number>;
  dimensions: Record<DimensionKey, number>;
  riskAversion: number;
  innovationPreference: number;
  evidenceThreshold: number;
  uncertaintyTolerance: number;
}

export interface MonteCarloConfig {
  simulations: number;
  distribution: DistributionName;
  seed: number;
  successThreshold: number;
  marketGrowth: number;
  adoption: number;
  price: number;
  cac: number;
  churn: number;
  margin: number;
  initialInvestment: number;
}

export interface MonteCarloResult {
  samples: number[];
  histogram: number[];
  mean: number;
  median: number;
  p10: number;
  p90: number;
  probabilityAboveThreshold: number;
  probabilityOfLoss: number;
  downside: number;
}

export interface BayesianResult {
  prior: number;
  likelihoodPositive: number;
  likelihoodNegative: number;
  posterior: number;
  delta: number;
}

export interface ScenarioResult {
  name: "Downside" | "Base" | "Upside";
  score: number;
  estimatedReturn: number;
  risk: number;
  confidence: number;
  recommendation: string;
}

export interface LabRun {
  id: string;
  createdAt: string;
  input: LabInput;
  status: SimulationStatus;
  weights: LabWeights;
  opportunities: Opportunity[];
  warnings: string[];
  disclosures: string[];
}

export interface StageDefinition {
  id: number;
  label: string;
  owner: string;
  task: string;
}

export interface ComparisonDelta {
  id: string;
  previousRank: number;
  rank: number;
  scoreDelta: number;
  mainDriver: string;
}
