import { sanitizeOrbitalInput } from "./engine.ts";
import type { OrbitalScenario, OrbitalScenarioId } from "./types.ts";

export const ORBITAL_SCENARIO_IDS = ["demo", "heavy-payload", "high-wind"] as const;

export function createOrbitalScenario(id: OrbitalScenarioId = "demo", seed = 2026): OrbitalScenario {
  const definitions = {
    demo: {
      label: "Órbita baja demostrativa",
      description: "Perfil equilibrado para visualizar todas las etapas, cofia y despliegues.",
      targetAltitudeKm: 400,
      payloadKg: 2_400,
      windSpeedMps: 8,
    },
    "heavy-payload": {
      label: "Carga pesada sintética",
      description: "Compara una carga pública ficticia mayor dentro del mismo guiado educativo.",
      targetAltitudeKm: 320,
      payloadKg: 11_000,
      windSpeedMps: 6,
    },
    "high-wind": {
      label: "Viento elevado sintético",
      description: "Hace visible una perturbación atmosférica acotada, sin usar clima real.",
      targetAltitudeKm: 500,
      payloadKg: 1_800,
      windSpeedMps: 38,
    },
  } as const;
  const definition = definitions[id] ?? definitions.demo;
  return {
    id,
    label: definition.label,
    description: definition.description,
    input: sanitizeOrbitalInput({
      seed,
      scenarioId: id,
      targetAltitudeKm: definition.targetAltitudeKm,
      payloadKg: definition.payloadKg,
      launchAzimuthDeg: 90,
      windSpeedMps: definition.windSpeedMps,
      timeStepSeconds: 2,
    }),
  };
}

export const ORBITAL_SCENARIO_CATALOG = ORBITAL_SCENARIO_IDS.map((id) => createOrbitalScenario(id));
