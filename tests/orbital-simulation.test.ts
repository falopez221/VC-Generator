import assert from "node:assert/strict";
import test from "node:test";
import {
  ORBITAL_SCENARIO_IDS,
  createOrbitalScenario,
  runOrbitalSimulation,
  sanitizeOrbitalInput,
} from "../src/lab/orbital-simulation/index.ts";

test("orbital demo is deterministic, finite, and reaches its synthetic orbit", () => {
  const scenario = createOrbitalScenario("demo", 7391);
  const first = runOrbitalSimulation(scenario.input);
  const second = runOrbitalSimulation(scenario.input);
  assert.deepEqual(first, second);
  assert.equal(first.synthetic, true);
  assert.equal(first.summary.reachedOrbit, true);
  assert.equal(first.summary.deployed, true);
  assert.ok(first.samples.length > 100 && first.samples.length <= 1_201);
  assert.ok(first.samples.every((sample) => Object.values(sample).flatMap((value) =>
    typeof value === "object" ? Object.values(value) : [value]
  ).filter((value) => typeof value === "number").every(Number.isFinite)));
});

test("mission exposes max-Q, separation, insertion, and layered deployment in order", () => {
  const result = runOrbitalSimulation(createOrbitalScenario().input);
  const kinds = result.events.map((event) => event.kind);
  const required = [
    "max-q",
    "stage-separation",
    "fairing-separation",
    "orbital-insertion",
    "solar-array-deployment",
    "antenna-deployment",
    "mission-complete",
  ];
  for (const kind of required) assert.ok(kinds.includes(kind as (typeof kinds)[number]), kind);
  assert.ok(result.events.every((event, index) => index === 0 || event.timeSeconds >= result.events[index - 1].timeSeconds));
  assert.deepEqual(
    result.events.filter((event) => event.visualPart).map((event) => event.visualPart),
    ["first-stage", "fairing-left", "fairing-right", "solar-left", "solar-right", "antenna"],
  );
});

test("untrusted numeric input is sanitized to documented safe public bounds", () => {
  const sanitized = sanitizeOrbitalInput({
    seed: Number.NaN,
    scenarioId: "demo",
    targetAltitudeKm: Number.POSITIVE_INFINITY,
    payloadKg: -5,
    launchAzimuthDeg: 999,
    windSpeedMps: -20,
    timeStepSeconds: 0,
  });
  assert.equal(sanitized.seed, 1);
  assert.equal(sanitized.targetAltitudeKm, 160);
  assert.equal(sanitized.payloadKg, 100);
  assert.equal(sanitized.launchAzimuthDeg, 180);
  assert.equal(sanitized.windSpeedMps, 0);
  assert.equal(sanitized.timeStepSeconds, 0.5);
  const result = runOrbitalSimulation(sanitized);
  assert.ok(result.samples.length <= 1_201);
  assert.ok(result.summary.reachedOrbit);
});

test("all public scenarios remain bounded, reproducible, and disclose limitations", () => {
  assert.deepEqual(ORBITAL_SCENARIO_IDS, ["demo", "heavy-payload", "high-wind"]);
  for (const id of ORBITAL_SCENARIO_IDS) {
    const scenario = createOrbitalScenario(id, 44);
    const result = runOrbitalSimulation(scenario.input);
    assert.equal(result.input.scenarioId, id);
    assert.ok(result.summary.achievedAltitudeKm >= 160 && result.summary.achievedAltitudeKm <= 800);
    assert.ok(result.summary.peakDynamicPressureKpa >= 0 && result.summary.peakDynamicPressureKpa <= 120);
    assert.ok(result.assumptions.length >= 3);
    assert.ok(result.limitations.some((item) => /No sirve para diseñar/i.test(item)));
  }
});
