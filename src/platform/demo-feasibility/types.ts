export const DELIVERY_STRATEGIES = ["internal", "vendor", "hybrid"] as const;
export type DeliveryStrategy = (typeof DELIVERY_STRATEGIES)[number];

export const COST_CATEGORIES = [
  "Development", "Personnel", "Infrastructure", "Licenses", "APIs and models", "Data",
  "Cybersecurity", "Compliance", "Consulting", "Training", "Support", "Maintenance",
  "Contingency", "Opportunity cost",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];

export type FeasibilityInput = {
  proposalName: string;
  proposalSummary: string;
  strategy: DeliveryStrategy;
  complexity: number;
  dataReadiness: number;
  internalCapacity: number;
  regulatoryIntensity: number;
  securityReadiness: number;
  adoptionReadiness: number;
  budgetReadiness: number;
  users: number;
  annualMissions: number;
  annualSimulations: number;
  annualAgentRuns: number;
  samples: number;
  seed: number;
};

export type FeasibilityTask = {
  id: string;
  phase: string;
  title: string;
  owner: string;
  dependencies: string[];
  deliverable: string;
  acceptance: string;
  optimisticWeeks: number;
  likelyWeeks: number;
  pessimisticWeeks: number;
  expectedWeeks: number;
  resource: string;
  costCategory: CostCategory;
  baseCost: number;
  reworkProbability: number;
  sourcing: "Internal" | "External" | "Hybrid";
  critical: boolean;
  earliestStartWeek: number;
  earliestFinishWeek: number;
  latestStartWeek: number;
  floatWeeks: number;
};

export type DistributionSummary = {
  optimistic: number;
  p50: number;
  p90: number;
  conservative: number;
  mean: number;
};

export type CapabilityGap = {
  capability: string;
  required: string;
  status: "Available internally" | "Partially available" | "Must hire" | "Must outsource" | "Partner dependent" | "Not currently available";
  action: string;
  scheduleImpactWeeks: number;
};

export type ReadinessComponent = {
  id: string;
  label: string;
  score: number;
  weight: number;
  status: "Ready" | "Conditional" | "Gap";
  evidence: string;
};

export type DeliveryOption = {
  id: string;
  label: string;
  timeP50Months: number;
  expectedCost: number;
  control: string;
  risk: string;
  dependency: string;
  lockIn: string;
  intellectualProperty: string;
  scalability: string;
  speed: string;
};

export type CostSummary = {
  expected: number;
  probableLow: number;
  probableHigh: number;
  capex: number;
  firstYearOpex: number;
  monthlyRunRate: number;
  annualRunRate: number;
  threeYearTco: number;
  perUser: number;
  perMission: number;
  perSimulation: number;
  perAgentRun: number;
  categories: Array<{ category: CostCategory; amount: number; kind: "CAPEX" | "OPEX" | "Economic" }>;
};

export type RoadmapStage = {
  id: string;
  label: string;
  outcome: string;
  owner: string;
  gate: string;
  metric: string;
  p50Month: number;
  p90Month: number;
};

export type FeasibilityResult = {
  modelVersion: string;
  generatedFrom: { proposalName: string; strategy: DeliveryStrategy; seed: number; samples: number };
  durationWeeks: DistributionSummary;
  durationMonths: DistributionSummary;
  probabilityByMonth: Array<{ month: number; probability: number }>;
  cost: CostSummary;
  tasks: FeasibilityTask[];
  phases: Array<{ name: string; taskIds: string[]; expectedWeeks: number }>;
  criticalPath: string[];
  scheduleDrivers: Array<{ taskId: string; title: string; impact: number }>;
  topFactors: string[];
  capabilities: CapabilityGap[];
  readiness: { score: number; components: ReadinessComponent[] };
  options: DeliveryOption[];
  roadmap: RoadmapStage[];
  assumptions: string[];
  limitations: string[];
};
