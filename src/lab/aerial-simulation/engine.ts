import {
  associateMeasurements,
  clamp,
  createKalmanTrack,
  integrateKinematics,
  predictKalman,
  round,
  uncertaintyEllipse,
  updateKalman,
} from "./math.ts";
import { createSeededRandom, deriveSeed, normalizeSeed } from "./random.ts";
import {
  PUBLIC_AGENT_NAMES,
  type AerialSimulationResult,
  type AgentDeployment,
  type AuditEvent,
  type KalmanTrack,
  type MonteCarloRiskResult,
  type NormalizedKinematicState,
  type ReviewAssignment,
  type RiskBreakdown,
  type SaturationMetrics,
  type SensorMeasurement,
  type SimulationConfig,
  type SimulationStep,
  type SyntheticObjectConfig,
} from "./types.ts";

export const MAX_SYNTHETIC_OBJECTS = 12;
export const MAX_SIMULATION_STEPS = 500;
export const MAX_MONTE_CARLO_SAMPLES = 5_000;

export const PUBLIC_SIMULATION_DISCLOSURE = {
  assumptions: [
    "All positions, velocities, distances, and time increments are dimensionless normalized values.",
    "Synthetic measurements use seeded Gaussian noise and a constant-velocity Kalman estimator.",
    "The visible risk index uses fictitious weights: proximity 25%, motion 20%, uncertainty 20%, consequence 25%, evidence penalty 10%.",
    "Assignments allocate abstract human-review channels only.",
  ],
  limitations: [
    "This educational model is not connected to sensors, maps, external systems, or real-world coordinates.",
    "It does not model weapons, interception, targeting, engagement, or operational decision-making.",
    "Synthetic risk values are explanatory simulation outputs, not safety, defense, financial, or investment advice.",
    "The four public agents are labels for transparent analytical responsibilities, not an autonomous operational network.",
  ],
} as const;

function sanitizeId(value: string, fallback: string): string {
  const safe = value.trim().slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");
  return safe || fallback;
}

function sanitizeState(state: NormalizedKinematicState): NormalizedKinematicState {
  return {
    position: { x: clamp(state.position.x, -2, 2), y: clamp(state.position.y, -2, 2) },
    velocity: { x: clamp(state.velocity.x, -1, 1), y: clamp(state.velocity.y, -1, 1) },
  };
}

function sanitizeObjects(objects: SyntheticObjectConfig[]): SyntheticObjectConfig[] {
  const usedIds = new Set<string>();
  return objects.slice(0, MAX_SYNTHETIC_OBJECTS).map((object, index) => {
    const baseId = sanitizeId(object.id, `synthetic-${index + 1}`);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId.slice(0, 27)}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return {
      id,
      initialState: sanitizeState(object.initialState),
      dynamics: {
        forcing: {
          x: clamp(object.dynamics.forcing.x, -1, 1),
          y: clamp(object.dynamics.forcing.y, -1, 1),
        },
        damping: clamp(object.dynamics.damping, 0, 2),
        restoring: clamp(object.dynamics.restoring, 0, 2),
      },
      processNoise: clamp(object.processNoise, 0.000001, 0.5),
      sensorNoise: clamp(object.sensorNoise, 0.0001, 0.5),
      detectionProbability: clamp(object.detectionProbability ?? 1, 0, 1),
      falseAlarmRate: clamp(object.falseAlarmRate ?? 0, 0, 1),
      measurementBias: {
        x: clamp(object.measurementBias?.x ?? 0, -0.5, 0.5),
        y: clamp(object.measurementBias?.y ?? 0, -0.5, 0.5),
      },
      evidenceQuality: clamp(object.evidenceQuality, 0, 100),
      consequence: clamp(object.consequence, 0, 100),
    };
  });
}

export function sanitizeSimulationConfig(config: SimulationConfig): SimulationConfig {
  return {
    seed: normalizeSeed(config.seed),
    steps: Math.round(clamp(config.steps, 1, MAX_SIMULATION_STEPS)),
    deltaTime: clamp(config.deltaTime, 0.001, 1),
    integrator: config.integrator === "euler" || config.integrator === "heun" ? config.integrator : "rk4",
    objects: sanitizeObjects(Array.isArray(config.objects) ? config.objects : []),
    reviewCapacity: Math.round(clamp(config.reviewCapacity, 0, MAX_SYNTHETIC_OBJECTS)),
    associationGate: clamp(config.associationGate, 0.1, 100),
    monteCarloSamples: Math.round(clamp(config.monteCarloSamples, 1, MAX_MONTE_CARLO_SAMPLES)),
    riskThreshold: clamp(config.riskThreshold, 0, 100),
  };
}

export function createSyntheticConfig(seed = 42): SimulationConfig {
  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(deriveSeed(normalizedSeed, "public-synthetic-scenario"));
  const objects = Array.from({ length: 6 }, (_, index): SyntheticObjectConfig => {
    const angle = (2 * Math.PI * index) / 6 + random.uniform() * 0.18;
    const radius = 0.85 + random.uniform() * 0.65;
    return {
      id: `synthetic-${index + 1}`,
      initialState: {
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
        velocity: {
          x: -0.08 * Math.cos(angle) + (random.uniform() - 0.5) * 0.04,
          y: -0.08 * Math.sin(angle) + (random.uniform() - 0.5) * 0.04,
        },
      },
      dynamics: {
        forcing: { x: (random.uniform() - 0.5) * 0.02, y: (random.uniform() - 0.5) * 0.02 },
        damping: 0.04 + random.uniform() * 0.04,
        restoring: 0.01 + random.uniform() * 0.02,
      },
      processNoise: 0.002 + random.uniform() * 0.004,
      sensorNoise: 0.025 + random.uniform() * 0.025,
      detectionProbability: 0.97,
      falseAlarmRate: 0.01,
      measurementBias: { x: 0, y: 0 },
      evidenceQuality: 45 + random.uniform() * 45,
      consequence: 20 + random.uniform() * 65,
    };
  });
  return {
    seed: normalizedSeed,
    steps: 24,
    deltaTime: 0.1,
    integrator: "rk4",
    objects,
    reviewCapacity: 3,
    associationGate: 5.991,
    monteCarloSamples: 600,
    riskThreshold: 45,
  };
}

export function calculateSyntheticRisk(track: KalmanTrack, object: SyntheticObjectConfig): RiskBreakdown {
  const [x, y, velocityX, velocityY] = track.state;
  const distance = Math.hypot(x, y);
  const proximity = clamp((1 - distance / 2) * 100, 0, 100);
  const closingRate = -(x * velocityX + y * velocityY) / Math.max(distance, 1e-9);
  const motion = clamp((closingRate + 0.25) * 200, 0, 100);
  const ellipse = uncertaintyEllipse(track);
  const uncertainty = clamp(ellipse.semiMajor * 80, 0, 100);
  const consequence = clamp(object.consequence, 0, 100);
  const evidencePenalty = 100 - clamp(object.evidenceQuality, 0, 100);
  const riskIndex = clamp(
    0.25 * proximity + 0.2 * motion + 0.2 * uncertainty + 0.25 * consequence + 0.1 * evidencePenalty,
    0,
    100,
  );
  return {
    objectId: object.id,
    riskIndex: round(riskIndex, 3),
    proximity: round(proximity, 3),
    motion: round(motion, 3),
    uncertainty: round(uncertainty, 3),
    consequence: round(consequence, 3),
    evidencePenalty: round(evidencePenalty, 3),
    explanation: [
      "Proximity is a dimensionless distance-to-reference score, not a real location.",
      "Motion represents normalized inward trend; it is not a tactical prediction.",
      "Uncertainty is derived from the 95% Kalman covariance ellipse.",
      "Consequence and evidence quality are fictitious scenario inputs.",
    ],
  };
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * clamp(fraction, 0, 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function runRiskMonteCarlo(
  tracks: KalmanTrack[],
  objects: SyntheticObjectConfig[],
  requestedSamples: number,
  seed: number,
  threshold: number,
): MonteCarloRiskResult {
  const requested = Number.isFinite(requestedSamples) ? Math.max(1, Math.round(requestedSamples)) : 1;
  const samples = Math.min(requested, MAX_MONTE_CARLO_SAMPLES);
  const random = createSeededRandom(deriveSeed(seed, "risk-monte-carlo"));
  const objectById = new Map(objects.map((object) => [object.id, object]));
  const values: number[] = [];

  for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
    const risks = tracks.map((track) => {
      const covarianceX = Math.max(1e-9, track.covariance[0][0]);
      const covarianceY = Math.max(1e-9, track.covariance[1][1]);
      const covarianceXY = track.covariance[1][0];
      const l11 = Math.sqrt(covarianceX);
      const l21 = covarianceXY / l11;
      const l22 = Math.sqrt(Math.max(1e-9, covarianceY - l21 * l21));
      const normalX = random.normal();
      const normalY = random.normal();
      const sampledTrack: KalmanTrack = {
        ...track,
        state: [
          track.state[0] + l11 * normalX,
          track.state[1] + l21 * normalX + l22 * normalY,
          track.state[2],
          track.state[3],
        ],
      };
      const object = objectById.get(track.objectId);
      return object ? calculateSyntheticRisk(sampledTrack, object).riskIndex : 0;
    });
    values.push(risks.length === 0 ? 0 : risks.reduce((sum, value) => sum + value, 0) / risks.length);
  }

  values.sort((left, right) => left - right);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return {
    requestedSamples: requested,
    samples,
    capped: requested > MAX_MONTE_CARLO_SAMPLES,
    meanRisk: round(mean, 3),
    standardDeviation: round(Math.sqrt(variance), 3),
    p10: round(percentile(values, 0.1), 3),
    median: round(percentile(values, 0.5), 3),
    p90: round(percentile(values, 0.9), 3),
    probabilityAboveThreshold: round(
      (values.filter((value) => value >= clamp(threshold, 0, 100)).length / values.length) * 100,
      3,
    ),
  };
}

export function allocateReviewCapacity(
  risks: RiskBreakdown[],
  capacity: number,
  threshold: number,
): { assignments: ReviewAssignment[]; saturation: SaturationMetrics } {
  const boundedCapacity = Math.round(clamp(capacity, 0, MAX_SYNTHETIC_OBJECTS));
  const demandItems = risks
    .filter((risk) => risk.riskIndex >= clamp(threshold, 0, 100))
    .sort((left, right) => right.riskIndex - left.riskIndex || left.objectId.localeCompare(right.objectId));
  const assignedItems = demandItems.slice(0, boundedCapacity);
  const assignments = assignedItems.map((risk, index): ReviewAssignment => ({
    objectId: risk.objectId,
    reviewChannelId: `review-channel-${index + 1}`,
    priority: index + 1,
    reason: `Synthetic risk ${risk.riskIndex} meets the review threshold; assignment requests human analysis only.`,
  }));
  const demand = demandItems.length;
  const assigned = assignments.length;
  const utilizationPercent = boundedCapacity === 0 ? (demand > 0 ? 100 : 0) : (assigned / boundedCapacity) * 100;
  const saturationPercent = boundedCapacity === 0 ? (demand > 0 ? 100 : 0) : Math.min(100, (demand / boundedCapacity) * 100);
  return {
    assignments,
    saturation: {
      demand,
      capacity: boundedCapacity,
      assigned,
      unassigned: Math.max(0, demand - assigned),
      utilizationPercent: round(utilizationPercent, 3),
      saturationPercent: round(saturationPercent, 3),
      overloaded: demand > boundedCapacity,
    },
  };
}

export function getPublicAgentDeployment(): AgentDeployment[] {
  const deployment: Record<(typeof PUBLIC_AGENT_NAMES)[number], Omit<AgentDeployment, "agentName">> = {
    Mathematics: {
      responsibility: "Validate deterministic propagation, estimation, uncertainty, and bounded sampling.",
      output: "Integrator comparison, Kalman covariance, uncertainty ellipse, and Monte Carlo summary.",
    },
    Finance: {
      responsibility: "Interpret fictitious capacity scarcity without pricing or investment claims.",
      output: "Review-channel utilization and saturation summary.",
    },
    Strategy: {
      responsibility: "Compare synthetic priorities, assumptions, trade-offs, and evidence gaps.",
      output: "Explainable risk ordering and abstract review allocation.",
    },
    Marketing: {
      responsibility: "Translate model outputs into accessible, non-operational public explanations.",
      output: "Plain-language disclosures, limitations, and scenario narrative.",
    },
  };
  return PUBLIC_AGENT_NAMES.map((agentName) => ({ agentName, ...deployment[agentName] }));
}

function cloneTrack(track: KalmanTrack): KalmanTrack {
  return { ...track, state: [...track.state], covariance: track.covariance.map((row) => [...row]) };
}

export function runAerialSimulation(input: SimulationConfig): AerialSimulationResult {
  const config = sanitizeSimulationConfig(input);
  const random = createSeededRandom(deriveSeed(config.seed, "sensor-stream"));
  const auditTrail: AuditEvent[] = [];
  const appendAudit = (
    step: number,
    kind: AuditEvent["kind"],
    summary: string,
    data: AuditEvent["data"],
  ) => auditTrail.push({ sequence: auditTrail.length + 1, step, kind, summary, data });

  appendAudit(0, "configuration", "Bounded synthetic configuration accepted.", {
    seed: config.seed,
    objects: config.objects.length,
    steps: config.steps,
    integrator: config.integrator,
  });
  appendAudit(0, "disclosure", "Non-operational public limitations attached.", {
    synthetic: true,
    limitationCount: PUBLIC_SIMULATION_DISCLOSURE.limitations.length,
  });

  let truth = new Map(config.objects.map((object) => [object.id, object.initialState]));
  let tracks = config.objects.map((object) => createKalmanTrack(`track-${object.id}`, object.id, object.initialState));
  const objectById = new Map(config.objects.map((object) => [object.id, object]));
  const simulationSteps: SimulationStep[] = [];

  for (let step = 1; step <= config.steps; step += 1) {
    truth = new Map(config.objects.map((object) => {
      const current = truth.get(object.id) ?? object.initialState;
      return [
        object.id,
        sanitizeState(integrateKinematics(current, object.dynamics, config.deltaTime, config.integrator)),
      ];
    }));
    appendAudit(step, "propagation", "Dimensionless states propagated.", {
      objectCount: truth.size,
      method: config.integrator,
      deltaTime: config.deltaTime,
    });

    const measurements = config.objects.flatMap((object, index): SensorMeasurement[] => {
      const state = truth.get(object.id) ?? object.initialState;
      const observations: SensorMeasurement[] = [];
      if (random.uniform() <= (object.detectionProbability ?? 1)) {
        observations.push({
          id: `detection-${step}-${index + 1}`,
          objectId: object.id,
          step,
          position: {
            x: clamp(
              state.position.x + (object.measurementBias?.x ?? 0) + random.normal() * object.sensorNoise,
              -2,
              2,
            ),
            y: clamp(
              state.position.y + (object.measurementBias?.y ?? 0) + random.normal() * object.sensorNoise,
              -2,
              2,
            ),
          },
          noiseStandardDeviation: object.sensorNoise,
          observationKind: "detection",
          synthetic: true,
        });
      }
      if (random.uniform() < (object.falseAlarmRate ?? 0)) {
        observations.push({
          id: `false-observation-${step}-${index + 1}`,
          objectId: `unrelated-${object.id}`,
          step,
          position: { x: random.uniform() * 4 - 2, y: random.uniform() * 4 - 2 },
          noiseStandardDeviation: object.sensorNoise,
          observationKind: "false-observation",
          synthetic: true,
        });
      }
      return observations;
    });
    const detections = measurements.filter((measurement) => measurement.observationKind === "detection").length;
    const falseObservations = measurements.length - detections;
    const observationSummary = {
      expectedDetections: config.objects.length,
      detections,
      misses: config.objects.length - detections,
      falseObservations,
    };
    appendAudit(step, "measurement", "Seeded synthetic observation quality generated.", {
      measurementCount: measurements.length,
      detections,
      misses: observationSummary.misses,
      falseObservations,
      synthetic: true,
    });

    const predictedTracks = tracks.map((track) => {
      const object = objectById.get(track.objectId);
      return predictKalman(track, config.deltaTime, object?.processNoise ?? 0.001);
    });
    const associations = associateMeasurements(predictedTracks, measurements, config.associationGate);
    appendAudit(step, "association", "Greedy gated association evaluated.", {
      matches: associations.matches.length,
      unassignedTracks: associations.unassignedTrackIds.length,
      unassignedMeasurements: associations.unassignedMeasurementIds.length,
      gate: associations.gateThreshold,
    });

    const measurementById = new Map(measurements.map((measurement) => [measurement.id, measurement]));
    const matchByTrack = new Map(associations.matches.map((match) => [match.trackId, match.measurementId]));
    tracks = predictedTracks.map((track) => {
      const measurementId = matchByTrack.get(track.id);
      const measurement = measurementId ? measurementById.get(measurementId) : undefined;
      return measurement ? updateKalman(track, measurement) : track;
    });
    appendAudit(step, "estimation", "Constant-velocity Kalman estimates updated.", {
      updatedTracks: associations.matches.length,
      predictedOnlyTracks: associations.unassignedTrackIds.length,
    });

    const risks = tracks.map((track) => {
      const object = objectById.get(track.objectId);
      return object ? calculateSyntheticRisk(track, object) : null;
    }).filter((risk): risk is RiskBreakdown => risk !== null);
    appendAudit(step, "risk", "Visible fictitious risk weights applied.", {
      riskCount: risks.length,
      maximumRisk: risks.length ? Math.max(...risks.map((risk) => risk.riskIndex)) : 0,
    });

    simulationSteps.push({
      step,
      truth: Object.fromEntries(truth.entries()),
      measurements,
      observationSummary,
      tracks: tracks.map(cloneTrack),
      associations,
      risks,
    });
  }

  const finalRisks = simulationSteps.at(-1)?.risks ?? [];
  const allocation = allocateReviewCapacity(finalRisks, config.reviewCapacity, config.riskThreshold);
  appendAudit(config.steps, "allocation", "Abstract human-review capacity allocated.", {
    demand: allocation.saturation.demand,
    assigned: allocation.saturation.assigned,
    overloaded: allocation.saturation.overloaded,
  });
  const monteCarlo = runRiskMonteCarlo(
    tracks,
    config.objects,
    config.monteCarloSamples,
    config.seed,
    config.riskThreshold,
  );

  return {
    modelVersion: "public-abstract-aerial-v1",
    synthetic: true,
    seed: config.seed,
    config,
    steps: simulationSteps,
    finalRisks,
    assignments: allocation.assignments,
    saturation: allocation.saturation,
    monteCarlo,
    agentDeployment: getPublicAgentDeployment(),
    auditTrail,
    assumptions: [...PUBLIC_SIMULATION_DISCLOSURE.assumptions],
    limitations: [...PUBLIC_SIMULATION_DISCLOSURE.limitations],
  };
}
