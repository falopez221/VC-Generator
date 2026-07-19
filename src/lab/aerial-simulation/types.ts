export const PUBLIC_AGENT_NAMES = ["Mathematics", "Finance", "Strategy", "Marketing"] as const;

export type PublicAgentName = (typeof PUBLIC_AGENT_NAMES)[number];
export type IntegratorMethod = "euler" | "heun" | "rk4";
export type Matrix = number[][];

export interface AgentCapability {
  agentId: string;
  name: PublicAgentName;
  domains: string[];
  specializations: string[];
  supportedTasks: string[];
  requiredInputs: string[];
  generatedOutputs: string[];
  dependencies: string[];
  estimatedCost: number;
  estimatedLatency: number;
  confidenceLevel: number;
  validationCapabilities: string[];
}

export interface Vector2 {
  x: number;
  y: number;
}

/** Dimensionless planar state. It is intentionally not tied to real coordinates or units. */
export interface NormalizedKinematicState {
  position: Vector2;
  velocity: Vector2;
}

export interface AbstractDynamics {
  forcing: Vector2;
  damping: number;
  restoring: number;
}

export interface SyntheticObjectConfig {
  id: string;
  initialState: NormalizedKinematicState;
  dynamics: AbstractDynamics;
  processNoise: number;
  sensorNoise: number;
  /** Probability [0,1] of emitting a synthetic observation on a step. Defaults to 1. */
  detectionProbability?: number;
  /** Probability [0,1] of adding one unrelated synthetic observation on a step. Defaults to 0. */
  falseAlarmRate?: number;
  /** Fixed dimensionless observation offset. Defaults to zero. */
  measurementBias?: Vector2;
  evidenceQuality: number;
  consequence: number;
}

export interface SensorMeasurement {
  id: string;
  objectId: string;
  step: number;
  position: Vector2;
  noiseStandardDeviation: number;
  observationKind: "detection" | "false-observation";
  synthetic: true;
}

export interface ObservationSummary {
  expectedDetections: number;
  detections: number;
  misses: number;
  falseObservations: number;
}

export interface KalmanTrack {
  id: string;
  objectId: string;
  state: [number, number, number, number];
  covariance: Matrix;
  lastMeasurementId: string | null;
  missedUpdates: number;
}

export interface UncertaintyEllipse {
  center: Vector2;
  semiMajor: number;
  semiMinor: number;
  angleRadians: number;
  confidence: number;
}

export interface AssociationCandidate {
  trackId: string;
  measurementId: string;
  squaredMahalanobisDistance: number;
  accepted: boolean;
}

export interface AssociationResult {
  matches: Array<{ trackId: string; measurementId: string; squaredMahalanobisDistance: number }>;
  unassignedTrackIds: string[];
  unassignedMeasurementIds: string[];
  candidates: AssociationCandidate[];
  gateThreshold: number;
}

export interface RiskBreakdown {
  objectId: string;
  riskIndex: number;
  proximity: number;
  motion: number;
  uncertainty: number;
  consequence: number;
  evidencePenalty: number;
  explanation: string[];
}

export interface ReviewAssignment {
  objectId: string;
  reviewChannelId: string;
  priority: number;
  reason: string;
}

export interface SaturationMetrics {
  demand: number;
  capacity: number;
  assigned: number;
  unassigned: number;
  utilizationPercent: number;
  saturationPercent: number;
  overloaded: boolean;
}

export interface AgentDeployment {
  agentName: PublicAgentName;
  responsibility: string;
  output: string;
}

export type AuditEventKind =
  | "configuration"
  | "propagation"
  | "measurement"
  | "estimation"
  | "association"
  | "risk"
  | "allocation"
  | "disclosure";

export interface AuditEvent {
  sequence: number;
  step: number;
  kind: AuditEventKind;
  summary: string;
  data: Record<string, string | number | boolean>;
}

export interface IntegratorComparison {
  euler: NormalizedKinematicState;
  heun: NormalizedKinematicState;
  rk4: NormalizedKinematicState;
  eulerVsRk4Distance: number;
  heunVsRk4Distance: number;
}

export interface MonteCarloRiskResult {
  requestedSamples: number;
  samples: number;
  capped: boolean;
  meanRisk: number;
  standardDeviation: number;
  p10: number;
  median: number;
  p90: number;
  probabilityAboveThreshold: number;
}

export interface SimulationConfig {
  seed: number;
  steps: number;
  deltaTime: number;
  integrator: IntegratorMethod;
  objects: SyntheticObjectConfig[];
  reviewCapacity: number;
  associationGate: number;
  monteCarloSamples: number;
  riskThreshold: number;
}

export interface SimulationStep {
  step: number;
  truth: Record<string, NormalizedKinematicState>;
  measurements: SensorMeasurement[];
  observationSummary: ObservationSummary;
  tracks: KalmanTrack[];
  associations: AssociationResult;
  risks: RiskBreakdown[];
}

export interface AerialSimulationResult {
  modelVersion: "public-abstract-aerial-v1";
  synthetic: true;
  seed: number;
  config: SimulationConfig;
  steps: SimulationStep[];
  finalRisks: RiskBreakdown[];
  assignments: ReviewAssignment[];
  saturation: SaturationMetrics;
  monteCarlo: MonteCarloRiskResult;
  agentDeployment: AgentDeployment[];
  auditTrail: AuditEvent[];
  assumptions: string[];
  limitations: string[];
}
