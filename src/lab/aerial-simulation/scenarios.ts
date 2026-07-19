import { createSyntheticConfig, sanitizeSimulationConfig } from "./engine.ts";
import { normalizeSeed } from "./random.ts";
import type { SimulationConfig, SyntheticObjectConfig } from "./types.ts";

export const PUBLIC_SCENARIO_IDS = [
  "single",
  "independent",
  "crossing",
  "high-noise",
  "sensor-loss",
  "false-observations",
  "progressive-saturation",
  "intermittent-comms",
  "limited-capacity",
  "extreme-uncertainty",
] as const;

export type PublicScenarioId = (typeof PUBLIC_SCENARIO_IDS)[number];

export interface PublicScenarioDefinition {
  id: PublicScenarioId;
  label: string;
  description: string;
  modeledEffect: string;
}

export const PUBLIC_SCENARIO_CATALOG: readonly PublicScenarioDefinition[] = [
  { id: "single", label: "Single object", description: "One clean synthetic trajectory.", modeledEffect: "Baseline propagation and estimation." },
  { id: "independent", label: "Independent objects", description: "Six separated synthetic trajectories.", modeledEffect: "Parallel estimates with reliable observations." },
  { id: "crossing", label: "Crossing paths", description: "Four abstract paths pass near the normalized origin.", modeledEffect: "Association ambiguity without real coordinates." },
  { id: "high-noise", label: "High noise", description: "Observations contain elevated seeded Gaussian noise.", modeledEffect: "Wider covariance and noisier updates." },
  { id: "sensor-loss", label: "Observation loss", description: "Many expected observations are reproducibly absent.", modeledEffect: "Prediction-only Kalman steps and recorded misses." },
  { id: "false-observations", label: "False observations", description: "Unrelated synthetic observations appear reproducibly.", modeledEffect: "Gating and unassigned observation behavior." },
  { id: "progressive-saturation", label: "Progressive saturation", description: "Twelve inward-trending objects share three review channels.", modeledEffect: "Rising abstract review demand." },
  { id: "intermittent-comms", label: "Intermittent observations", description: "Seeded Bernoulli availability creates observation gaps.", modeledEffect: "Alternating update and prediction-only steps." },
  { id: "limited-capacity", label: "Limited capacity", description: "Ten objects share one human-review channel.", modeledEffect: "Visible prioritization and overload metrics." },
  { id: "extreme-uncertainty", label: "Extreme uncertainty", description: "Noise, process variance, bias, misses, and unrelated observations are combined.", modeledEffect: "Bounded stress test of uncertainty disclosure." },
] as const;

function withObservationDefaults(object: SyntheticObjectConfig): SyntheticObjectConfig {
  return {
    ...object,
    detectionProbability: 1,
    falseAlarmRate: 0,
    measurementBias: { x: 0, y: 0 },
  };
}

function resizedObjects(base: SyntheticObjectConfig[], count: number): SyntheticObjectConfig[] {
  return Array.from({ length: count }, (_, index) => {
    const source = base[index % base.length];
    const angle = (2 * Math.PI * index) / count + 0.08;
    const radius = 0.9 + (index % 3) * 0.18;
    return withObservationDefaults({
      ...source,
      id: `synthetic-${index + 1}`,
      initialState: {
        position: { x: radius * Math.cos(angle), y: radius * Math.sin(angle) },
        velocity: { x: -0.1 * Math.cos(angle), y: -0.1 * Math.sin(angle) },
      },
      measurementBias: { ...(source.measurementBias ?? { x: 0, y: 0 }) },
    });
  });
}

function mapObjects(
  objects: SyntheticObjectConfig[],
  transform: (object: SyntheticObjectConfig, index: number) => Partial<SyntheticObjectConfig>,
): SyntheticObjectConfig[] {
  return objects.map((object, index) => ({ ...object, ...transform(object, index) }));
}

/** Creates one of ten bounded, public, synthetic scenario configurations. */
export function createScenarioConfig(scenarioId: PublicScenarioId, seed = 42): SimulationConfig {
  const base = createSyntheticConfig(normalizeSeed(seed));
  base.objects = base.objects.map(withObservationDefaults);
  base.steps = 30;
  base.monteCarloSamples = 600;

  switch (scenarioId) {
    case "single":
      base.objects = base.objects.slice(0, 1);
      base.reviewCapacity = 1;
      break;
    case "crossing": {
      const crossingStates = [
        { position: { x: -1.2, y: -0.18 }, velocity: { x: 0.22, y: 0.04 } },
        { position: { x: 1.2, y: 0.18 }, velocity: { x: -0.22, y: -0.04 } },
        { position: { x: 0.16, y: -1.2 }, velocity: { x: -0.03, y: 0.22 } },
        { position: { x: -0.16, y: 1.2 }, velocity: { x: 0.03, y: -0.22 } },
      ];
      base.objects = mapObjects(base.objects.slice(0, 4), (_, index) => ({
        initialState: crossingStates[index],
        dynamics: { forcing: { x: 0, y: 0 }, damping: 0.01, restoring: 0 },
        sensorNoise: 0.055,
      }));
      base.associationGate = 7;
      break;
    }
    case "high-noise":
      base.objects = mapObjects(base.objects, () => ({ sensorNoise: 0.28, processNoise: 0.035 }));
      break;
    case "sensor-loss":
      base.objects = mapObjects(base.objects, () => ({ detectionProbability: 0.28 }));
      break;
    case "false-observations":
      base.objects = mapObjects(base.objects, () => ({ detectionProbability: 0.92, falseAlarmRate: 0.82 }));
      break;
    case "progressive-saturation":
      base.objects = resizedObjects(base.objects, 12);
      base.reviewCapacity = 3;
      base.riskThreshold = 32;
      base.steps = 45;
      break;
    case "intermittent-comms":
      base.objects = mapObjects(base.objects, () => ({ detectionProbability: 0.55, falseAlarmRate: 0.04 }));
      break;
    case "limited-capacity":
      base.objects = resizedObjects(base.objects, 10);
      base.reviewCapacity = 1;
      base.riskThreshold = 35;
      break;
    case "extreme-uncertainty":
      base.objects = mapObjects(base.objects, (_, index) => ({
        sensorNoise: 0.5,
        processNoise: 0.5,
        detectionProbability: 0.62,
        falseAlarmRate: 0.3,
        measurementBias: { x: index % 2 === 0 ? 0.45 : -0.45, y: index % 3 === 0 ? 0.4 : -0.35 },
        evidenceQuality: 15,
      }));
      base.associationGate = 9;
      break;
    case "independent":
    default:
      break;
  }

  return sanitizeSimulationConfig(base);
}
