export type OrbitalScenarioId = "demo" | "heavy-payload" | "high-wind";

export type FlightPhase =
  | "prelaunch"
  | "liftoff"
  | "ascent"
  | "max-q"
  | "stage-separation"
  | "upper-stage"
  | "fairing-separation"
  | "orbital-insertion"
  | "deployment"
  | "orbit";

export type MissionEventKind =
  | "ignition"
  | "liftoff"
  | "max-q"
  | "main-engine-cutoff"
  | "stage-separation"
  | "upper-stage-ignition"
  | "fairing-separation"
  | "orbital-insertion"
  | "solar-array-deployment"
  | "antenna-deployment"
  | "mission-complete";

export interface OrbitalSimulationInput {
  seed: number;
  scenarioId?: OrbitalScenarioId;
  targetAltitudeKm: number;
  payloadKg: number;
  launchAzimuthDeg: number;
  windSpeedMps: number;
  timeStepSeconds: number;
}

export interface SanitizedOrbitalSimulationInput extends OrbitalSimulationInput {
  scenarioId: OrbitalScenarioId;
}

export interface FlightSample {
  timeSeconds: number;
  phase: FlightPhase;
  altitudeKm: number;
  downrangeKm: number;
  speedMps: number;
  verticalSpeedMps: number;
  horizontalSpeedMps: number;
  accelerationG: number;
  dynamicPressureKpa: number;
  propellantPercent: number;
  pitchDeg: number;
  massKg: number;
  /** Display-space coordinates; they are not geographic coordinates. */
  scene: { x: number; y: number };
}

export interface MissionEvent {
  id: string;
  kind: MissionEventKind;
  phase: FlightPhase;
  timeSeconds: number;
  altitudeKm: number;
  label: string;
  detail: string;
  visualPart?: "first-stage" | "fairing-left" | "fairing-right" | "solar-left" | "solar-right" | "antenna";
}

export interface OrbitalSummary {
  targetAltitudeKm: number;
  achievedAltitudeKm: number;
  targetCircularSpeedMps: number;
  achievedSpeedMps: number;
  orbitalPeriodMinutes: number;
  peakDynamicPressureKpa: number;
  peakAccelerationG: number;
  insertionErrorPercent: number;
  reachedOrbit: boolean;
  deployed: boolean;
}

export interface OrbitalSimulationResult {
  modelVersion: "public-synthetic-orbital-v1";
  synthetic: true;
  seed: number;
  input: SanitizedOrbitalSimulationInput;
  samples: FlightSample[];
  events: MissionEvent[];
  summary: OrbitalSummary;
  assumptions: string[];
  limitations: string[];
}

export interface OrbitalScenario {
  id: OrbitalScenarioId;
  label: string;
  description: string;
  input: SanitizedOrbitalSimulationInput;
}
