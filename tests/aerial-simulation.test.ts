import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_MONTE_CARLO_SAMPLES,
  PUBLIC_AGENT_NAMES,
  PUBLIC_AGENT_CAPABILITIES,
  PUBLIC_SCENARIO_CATALOG,
  PUBLIC_SCENARIO_IDS,
  allocateReviewCapacity,
  associateMeasurements,
  compareIntegrators,
  createKalmanTrack,
  createSeededRandom,
  createScenarioConfig,
  createSyntheticConfig,
  predictKalman,
  runAerialSimulation,
  runRiskMonteCarlo,
  selectPublicAgentCapabilities,
  sanitizeSimulationConfig,
  uncertaintyEllipse,
  updateKalman,
  type SensorMeasurement,
} from "../src/lab/aerial-simulation/index.ts";

test("seeded Box-Muller noise is reproducible and approximately centered", () => {
  const first = createSeededRandom(9124);
  const second = createSeededRandom(9124);
  const values = Array.from({ length: 2_000 }, () => first.normal());
  assert.deepEqual(values.slice(0, 20), Array.from({ length: 20 }, () => second.normal()));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(Math.abs(mean) < 0.08);
});

test("Euler, Heun, and RK4 expose comparable deterministic propagation", () => {
  const comparison = compareIntegrators(
    { position: { x: 1, y: 0 }, velocity: { x: 0, y: 0.5 } },
    { forcing: { x: 0.1, y: -0.05 }, damping: 0.2, restoring: 0.4 },
    0.5,
  );
  assert.notDeepEqual(comparison.euler, comparison.rk4);
  assert.ok(comparison.heunVsRk4Distance < comparison.eulerVsRk4Distance);
  assert.ok(Number.isFinite(comparison.rk4.position.x));
});

test("constant-velocity Kalman update reduces positional uncertainty", () => {
  const initial = createKalmanTrack(
    "track-1",
    "synthetic-1",
    { position: { x: 0, y: 0 }, velocity: { x: 0.1, y: 0 } },
    0.5,
  );
  const predicted = predictKalman(initial, 0.1, 0.001);
  const measurement: SensorMeasurement = {
    id: "measurement-1",
    objectId: "synthetic-1",
    step: 1,
    position: { x: 0.02, y: -0.01 },
    noiseStandardDeviation: 0.03,
    observationKind: "detection",
    synthetic: true,
  };
  const before = uncertaintyEllipse(predicted);
  const updated = updateKalman(predicted, measurement);
  const after = uncertaintyEllipse(updated);
  assert.ok(after.semiMajor < before.semiMajor);
  assert.equal(updated.lastMeasurementId, measurement.id);
  assert.equal(updated.missedUpdates, 0);
});

test("Mahalanobis gating matches nearby measurements and rejects distant ones", () => {
  const track = createKalmanTrack(
    "track-1",
    "synthetic-1",
    { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
    0.02,
  );
  const measurements: SensorMeasurement[] = [
    {
      id: "near",
      objectId: "synthetic-1",
      step: 1,
      position: { x: 0.01, y: 0.01 },
      noiseStandardDeviation: 0.02,
      observationKind: "detection",
      synthetic: true,
    },
    {
      id: "far",
      objectId: "synthetic-2",
      step: 1,
      position: { x: 1.5, y: 1.5 },
      noiseStandardDeviation: 0.02,
      observationKind: "detection",
      synthetic: true,
    },
  ];
  const result = associateMeasurements([track], measurements, 5.991);
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].measurementId, "near");
  assert.ok(result.candidates.find((candidate) => candidate.measurementId === "far")?.accepted === false);
});

test("public simulation is deterministic, bounded, auditable, and uses exactly four allowed agents", () => {
  const config = createSyntheticConfig(7341);
  config.steps = 8;
  config.monteCarloSamples = 120;
  const first = runAerialSimulation(config);
  const second = runAerialSimulation(config);
  assert.deepEqual(first, second);
  assert.equal(first.synthetic, true);
  assert.equal(first.steps.length, 8);
  assert.deepEqual(first.agentDeployment.map((agent) => agent.agentName), [...PUBLIC_AGENT_NAMES]);
  assert.deepEqual(PUBLIC_AGENT_NAMES, ["Mathematics", "Finance", "Strategy", "Marketing"]);
  assert.ok(first.finalRisks.every((risk) => risk.riskIndex >= 0 && risk.riskIndex <= 100));
  assert.ok(first.auditTrail.every((event, index) => event.sequence === index + 1));
  assert.ok(first.limitations.some((item) => /does not model weapons/i.test(item)));
  assert.ok(first.assignments.every((assignment) => /human analysis only/i.test(assignment.reason)));
});

test("public capability registry is bounded to four agents and resolves dependencies", () => {
  assert.deepEqual(PUBLIC_AGENT_CAPABILITIES.map((agent) => agent.name), [...PUBLIC_AGENT_NAMES]);
  assert.ok(PUBLIC_AGENT_CAPABILITIES.every((agent) => agent.confidenceLevel >= 0 && agent.confidenceLevel <= 1));
  const selected = selectPublicAgentCapabilities(["executive-summary"]);
  assert.deepEqual(selected.map((agent) => agent.name), [...PUBLIC_AGENT_NAMES]);
  assert.ok(selected.every((agent) => agent.generatedOutputs.length > 0 && agent.validationCapabilities.length > 0));
});

test("configuration and Monte Carlo work are capped to public safe limits", () => {
  const config = createSyntheticConfig(Number.NaN);
  config.steps = Number.POSITIVE_INFINITY;
  config.monteCarloSamples = 999_999;
  config.objects = [...config.objects, ...config.objects, ...config.objects];
  const sanitized = sanitizeSimulationConfig(config);
  assert.equal(sanitized.seed, 1);
  assert.ok(sanitized.steps >= 1 && sanitized.steps <= 500);
  assert.equal(sanitized.objects.length, 12);
  assert.equal(new Set(sanitized.objects.map((object) => object.id)).size, 12);
  assert.equal(sanitized.monteCarloSamples, MAX_MONTE_CARLO_SAMPLES);

  const result = runRiskMonteCarlo([], [], MAX_MONTE_CARLO_SAMPLES + 10, 2, 50);
  assert.equal(result.samples, MAX_MONTE_CARLO_SAMPLES);
  assert.equal(result.capped, true);
  assert.equal(result.meanRisk, 0);
});

test("abstract review allocation reports overload without operational actions", () => {
  const risks = [
    { objectId: "a", riskIndex: 80, proximity: 0, motion: 0, uncertainty: 0, consequence: 0, evidencePenalty: 0, explanation: [] },
    { objectId: "b", riskIndex: 70, proximity: 0, motion: 0, uncertainty: 0, consequence: 0, evidencePenalty: 0, explanation: [] },
  ];
  const result = allocateReviewCapacity(risks, 1, 50);
  assert.equal(result.assignments.length, 1);
  assert.equal(result.assignments[0].objectId, "a");
  assert.equal(result.saturation.unassigned, 1);
  assert.equal(result.saturation.overloaded, true);
  assert.match(result.assignments[0].reviewChannelId, /^review-channel-/);
});

test("catalog exposes exactly ten typed public presets with bounded object counts", () => {
  assert.equal(PUBLIC_SCENARIO_IDS.length, 10);
  assert.deepEqual(PUBLIC_SCENARIO_CATALOG.map((scenario) => scenario.id), [...PUBLIC_SCENARIO_IDS]);
  for (const scenarioId of PUBLIC_SCENARIO_IDS) {
    const first = createScenarioConfig(scenarioId, 8192);
    const second = createScenarioConfig(scenarioId, 8192);
    assert.deepEqual(first, second);
    assert.ok(first.objects.length >= 1 && first.objects.length <= 12, scenarioId);
    assert.ok(first.objects.every((object) =>
      (object.detectionProbability ?? -1) >= 0
      && (object.detectionProbability ?? 2) <= 1
      && (object.falseAlarmRate ?? -1) >= 0
      && (object.falseAlarmRate ?? 2) <= 1
      && Math.abs(object.measurementBias?.x ?? 99) <= 0.5
      && Math.abs(object.measurementBias?.y ?? 99) <= 0.5
    ));
  }
});

test("observation-loss preset produces reproducible misses and audits them", () => {
  const config = createScenarioConfig("sensor-loss", 2718);
  config.steps = 12;
  config.monteCarloSamples = 20;
  const first = runAerialSimulation(config);
  const second = runAerialSimulation(config);
  assert.deepEqual(first.steps.map((step) => step.observationSummary), second.steps.map((step) => step.observationSummary));
  const misses = first.steps.reduce((sum, step) => sum + step.observationSummary.misses, 0);
  assert.ok(misses > 0);
  assert.ok(first.auditTrail.some((event) => event.kind === "measurement" && Number(event.data.misses) > 0));
});

test("false-observation preset produces labeled reproducible unrelated observations", () => {
  const config = createScenarioConfig("false-observations", 31415);
  config.steps = 8;
  config.monteCarloSamples = 20;
  const result = runAerialSimulation(config);
  const falseObservations = result.steps.flatMap((step) => step.measurements)
    .filter((measurement) => measurement.observationKind === "false-observation");
  assert.ok(falseObservations.length > 0);
  assert.ok(falseObservations.every((measurement) => measurement.objectId.startsWith("unrelated-")));
  assert.equal(
    falseObservations.length,
    result.steps.reduce((sum, step) => sum + step.observationSummary.falseObservations, 0),
  );
});
