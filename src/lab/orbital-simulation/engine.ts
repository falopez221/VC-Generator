import type {
  FlightPhase,
  FlightSample,
  MissionEvent,
  MissionEventKind,
  OrbitalSimulationInput,
  OrbitalSimulationResult,
  OrbitalSummary,
  SanitizedOrbitalSimulationInput,
} from "./types.ts";

const EARTH_RADIUS_M = 6_371_000;
const EARTH_MU = 3.986004418e14;
const SEA_LEVEL_DENSITY = 1.225;
const SCALE_HEIGHT_M = 8_500;
const MAX_SAMPLES = 1_200;

export const ORBITAL_DISCLOSURE = {
  assumptions: [
    "La trayectoria es una simulación sintética 2D con gravedad esférica, atmósfera exponencial y arrastre demostrativo.",
    "El perfil de guiado interpola de ascenso vertical a velocidad tangencial y fuerza una inserción educativa reproducible.",
    "Las separaciones y despliegues se programan por hitos visibles; no representan hardware, telemetría ni procedimientos reales.",
    "Las variaciones dependen de una semilla reproducible y permanecen dentro de límites públicos seguros.",
  ],
  limitations: [
    "No sirve para diseñar, operar, certificar ni lanzar un cohete real.",
    "No modela aerodinámica 3D, control, combustión, vibración, clima real, navegación ni fallos de componentes.",
    "Las masas, empuje, coeficientes y márgenes son ficticios y no corresponden a ningún vehículo existente.",
    "La órbita lograda es un resultado narrativo de demostración, no una predicción de misión ni asesoramiento técnico.",
  ],
} as const;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, finite(value, minimum)));
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(finite(value, 0) * factor) / factor;
}

function normalizeSeed(seed: number): number {
  const normalized = Math.trunc(finite(seed, 1)) >>> 0;
  return normalized || 1;
}

function seededUnit(seed: number, salt: number): number {
  let value = (seed + Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x21f0aaad);
  value ^= value >>> 15;
  value = Math.imul(value, 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) / 4_294_967_296;
}

function smoothstep(from: number, to: number, value: number): number {
  const fraction = clamp((value - from) / Math.max(to - from, 1e-9), 0, 1);
  return fraction * fraction * (3 - 2 * fraction);
}

export function sanitizeOrbitalInput(input: OrbitalSimulationInput): SanitizedOrbitalSimulationInput {
  const scenarioId = input.scenarioId === "heavy-payload" || input.scenarioId === "high-wind"
    ? input.scenarioId
    : "demo";
  return {
    seed: normalizeSeed(input.seed),
    scenarioId,
    targetAltitudeKm: round(clamp(input.targetAltitudeKm, 160, 800), 1),
    payloadKg: round(clamp(input.payloadKg, 100, 15_000), 0),
    launchAzimuthDeg: round(clamp(input.launchAzimuthDeg, 0, 180), 1),
    windSpeedMps: round(clamp(input.windSpeedMps, 0, 45), 1),
    timeStepSeconds: round(clamp(input.timeStepSeconds, 0.5, 10), 1),
  };
}

function flightPhase(timeSeconds: number): FlightPhase {
  if (timeSeconds <= 0) return "prelaunch";
  if (timeSeconds < 8) return "liftoff";
  if (timeSeconds < 75) return "ascent";
  if (timeSeconds < 90) return "max-q";
  if (timeSeconds < 105) return "stage-separation";
  if (timeSeconds < 180) return "upper-stage";
  if (timeSeconds < 210) return "fairing-separation";
  if (timeSeconds < 500) return "upper-stage";
  if (timeSeconds < 520) return "orbital-insertion";
  if (timeSeconds < 555) return "deployment";
  return "orbit";
}

function kinematicsAt(time: number, targetAltitudeM: number, circularSpeed: number, seed: number, wind: number) {
  const ascent = smoothstep(0, 510, time);
  const earlyRise = smoothstep(0, 115, time);
  const altitude = targetAltitudeM * (0.18 * earlyRise + 0.82 * ascent);
  const vertical = time >= 510 ? 0 : targetAltitudeM * (
    0.18 * (time < 115 ? 6 * (time / 115) * (1 - time / 115) / 115 : 0)
    + 0.82 * 6 * (time / 510) * (1 - time / 510) / 510
  );
  const horizontalFraction = smoothstep(22, 510, time);
  const guidanceVariation = (seededUnit(seed, Math.floor(time / 10)) - 0.5) * 0.002;
  const horizontal = circularSpeed * clamp(horizontalFraction + guidanceVariation, 0, 1);
  const windDrift = wind * (1 - altitude / Math.max(targetAltitudeM, 1)) * smoothstep(0, 120, time);
  return { altitude, vertical, horizontal: Math.max(0, horizontal + windDrift) };
}

function createSample(input: SanitizedOrbitalSimulationInput, time: number): FlightSample {
  const targetAltitudeM = input.targetAltitudeKm * 1_000;
  const circularSpeed = Math.sqrt(EARTH_MU / (EARTH_RADIUS_M + targetAltitudeM));
  const current = kinematicsAt(time, targetAltitudeM, circularSpeed, input.seed, input.windSpeedMps);
  const previous = kinematicsAt(Math.max(0, time - input.timeStepSeconds), targetAltitudeM, circularSpeed, input.seed, input.windSpeedMps);
  const speed = Math.hypot(current.vertical, current.horizontal);
  const previousSpeed = Math.hypot(previous.vertical, previous.horizontal);
  const density = SEA_LEVEL_DENSITY * Math.exp(-current.altitude / SCALE_HEIGHT_M);
  const dynamicPressure = 0.5 * density * speed * speed / 1_000;
  const accelerationG = time === 0 ? 0 : clamp(Math.abs(speed - previousSpeed) / input.timeStepSeconds / 9.80665 + 1, 0, 6);
  const stageOneFuel = 64 * (1 - smoothstep(0, 96, time));
  const stageTwoFuel = 35 * (1 - smoothstep(104, 510, time));
  const propellantPercent = clamp(stageOneFuel + stageTwoFuel, 0, 99);
  const firstStageAttached = time < 102;
  const dryMass = input.payloadKg + 9_500 + (firstStageAttached ? 22_000 : 0);
  const mass = dryMass + propellantPercent * 3_700;
  const pitch = 90 * (1 - smoothstep(12, 440, time));
  const azimuthRadians = input.launchAzimuthDeg * Math.PI / 180;
  const downrange = current.horizontal * time * (0.42 + 0.38 * smoothstep(80, 510, time)) / 1_000;
  return {
    timeSeconds: round(time, 1),
    phase: flightPhase(time),
    altitudeKm: round(current.altitude / 1_000),
    downrangeKm: round(downrange),
    speedMps: round(speed),
    verticalSpeedMps: round(current.vertical),
    horizontalSpeedMps: round(current.horizontal),
    accelerationG: round(accelerationG),
    dynamicPressureKpa: round(clamp(dynamicPressure, 0, 120)),
    propellantPercent: round(propellantPercent),
    pitchDeg: round(pitch),
    massKg: round(clamp(mass, input.payloadKg + 9_500, 500_000)),
    scene: {
      x: round(Math.cos(azimuthRadians) * downrange / Math.max(input.targetAltitudeKm * 8, 1), 6),
      y: round(current.altitude / targetAltitudeM, 6),
    },
  };
}

const EVENT_SCHEDULE: ReadonlyArray<{
  time: number; kind: MissionEventKind; phase: FlightPhase; label: string; detail: string; visualPart?: MissionEvent["visualPart"];
}> = [
  { time: 0, kind: "ignition", phase: "prelaunch", label: "Ignición", detail: "Secuencia sintética de motores iniciada." },
  { time: 2, kind: "liftoff", phase: "liftoff", label: "Despegue", detail: "El vehículo abandona la plataforma virtual." },
  { time: 79, kind: "max-q", phase: "max-q", label: "Max-Q", detail: "Máxima presión dinámica demostrativa." },
  { time: 96, kind: "main-engine-cutoff", phase: "stage-separation", label: "Corte principal", detail: "Finaliza el impulso de la primera etapa." },
  { time: 102, kind: "stage-separation", phase: "stage-separation", label: "Separación de etapa", detail: "La primera etapa se separa visualmente.", visualPart: "first-stage" },
  { time: 106, kind: "upper-stage-ignition", phase: "upper-stage", label: "Etapa superior", detail: "Comienza el tramo de inserción sintética." },
  { time: 188, kind: "fairing-separation", phase: "fairing-separation", label: "Separación de cofia", detail: "Las dos mitades de la cofia se despliegan.", visualPart: "fairing-left" },
  { time: 189, kind: "fairing-separation", phase: "fairing-separation", label: "Cofia liberada", detail: "Segunda mitad de cofia separada.", visualPart: "fairing-right" },
  { time: 510, kind: "orbital-insertion", phase: "orbital-insertion", label: "Inserción orbital", detail: "Altitud y velocidad circular objetivo alcanzadas." },
  { time: 528, kind: "solar-array-deployment", phase: "deployment", label: "Panel solar izquierdo", detail: "Primera capa exterior desplegada.", visualPart: "solar-left" },
  { time: 536, kind: "solar-array-deployment", phase: "deployment", label: "Panel solar derecho", detail: "Segunda capa exterior desplegada.", visualPart: "solar-right" },
  { time: 545, kind: "antenna-deployment", phase: "deployment", label: "Antena", detail: "Antena de comunicación sintética desplegada.", visualPart: "antenna" },
  { time: 560, kind: "mission-complete", phase: "orbit", label: "Órbita estable", detail: "Demostración completada; revisión humana disponible." },
];

function sampleAtOrAfter(samples: FlightSample[], time: number): FlightSample {
  return samples.find((sample) => sample.timeSeconds >= time) ?? samples[samples.length - 1];
}

export function runOrbitalSimulation(rawInput: OrbitalSimulationInput): OrbitalSimulationResult {
  const input = sanitizeOrbitalInput(rawInput);
  const durationSeconds = 600;
  const sampleCount = Math.min(MAX_SAMPLES, Math.ceil(durationSeconds / input.timeStepSeconds));
  const times = Array.from({ length: sampleCount + 1 }, (_, index) => Math.min(durationSeconds, index * input.timeStepSeconds));
  if (times[times.length - 1] !== durationSeconds) times.push(durationSeconds);
  const samples = times.map((time) => createSample(input, time));
  const events: MissionEvent[] = EVENT_SCHEDULE.map((event, index) => {
    const sample = sampleAtOrAfter(samples, event.time);
    return {
      id: `mission-event-${index + 1}`,
      kind: event.kind,
      phase: event.phase,
      timeSeconds: event.time,
      altitudeKm: sample.altitudeKm,
      label: event.label,
      detail: event.detail,
      ...(event.visualPart ? { visualPart: event.visualPart } : {}),
    };
  });
  const orbitSample = sampleAtOrAfter(samples, 510);
  const targetCircularSpeed = Math.sqrt(EARTH_MU / (EARTH_RADIUS_M + input.targetAltitudeKm * 1_000));
  const peakDynamicPressure = Math.max(...samples.map((sample) => sample.dynamicPressureKpa));
  const peakAcceleration = Math.max(...samples.map((sample) => sample.accelerationG));
  const insertionError = Math.abs(orbitSample.speedMps - targetCircularSpeed) / targetCircularSpeed * 100;
  const summary: OrbitalSummary = {
    targetAltitudeKm: input.targetAltitudeKm,
    achievedAltitudeKm: orbitSample.altitudeKm,
    targetCircularSpeedMps: round(targetCircularSpeed),
    achievedSpeedMps: orbitSample.speedMps,
    orbitalPeriodMinutes: round(2 * Math.PI * Math.sqrt((EARTH_RADIUS_M + input.targetAltitudeKm * 1_000) ** 3 / EARTH_MU) / 60, 2),
    peakDynamicPressureKpa: round(peakDynamicPressure),
    peakAccelerationG: round(peakAcceleration),
    insertionErrorPercent: round(insertionError, 4),
    reachedOrbit: Math.abs(orbitSample.altitudeKm - input.targetAltitudeKm) <= 1 && insertionError <= 1,
    deployed: events.some((event) => event.kind === "antenna-deployment"),
  };
  return {
    modelVersion: "public-synthetic-orbital-v1",
    synthetic: true,
    seed: input.seed,
    input,
    samples,
    events,
    summary,
    assumptions: [...ORBITAL_DISCLOSURE.assumptions],
    limitations: [...ORBITAL_DISCLOSURE.limitations],
  };
}
