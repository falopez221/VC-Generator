import type {
  AbstractDynamics,
  AssociationResult,
  IntegratorComparison,
  IntegratorMethod,
  KalmanTrack,
  Matrix,
  NormalizedKinematicState,
  SensorMeasurement,
  UncertaintyEllipse,
  Vector2,
} from "./types.ts";

const EPSILON = 1e-9;

export function clamp(value: number, minimum: number, maximum: number): number {
  const finite = Number.isFinite(value) ? value : minimum;
  return Math.min(maximum, Math.max(minimum, finite));
}

export function round(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function vectorDistance(left: Vector2, right: Vector2): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

type FlatState = [number, number, number, number];

function flatten(state: NormalizedKinematicState): FlatState {
  return [state.position.x, state.position.y, state.velocity.x, state.velocity.y];
}

function expand(state: FlatState): NormalizedKinematicState {
  return {
    position: { x: state[0], y: state[1] },
    velocity: { x: state[2], y: state[3] },
  };
}

function derivative(state: FlatState, dynamics: AbstractDynamics): FlatState {
  return [
    state[2],
    state[3],
    dynamics.forcing.x - dynamics.damping * state[2] - dynamics.restoring * state[0],
    dynamics.forcing.y - dynamics.damping * state[3] - dynamics.restoring * state[1],
  ];
}

function addScaled(state: FlatState, slope: FlatState, scale: number): FlatState {
  return state.map((value, index) => value + slope[index] * scale) as FlatState;
}

export function integrateKinematics(
  state: NormalizedKinematicState,
  dynamics: AbstractDynamics,
  deltaTime: number,
  method: IntegratorMethod,
): NormalizedKinematicState {
  const dt = clamp(deltaTime, 0.001, 1);
  const initial = flatten(state);
  const k1 = derivative(initial, dynamics);

  if (method === "euler") return expand(addScaled(initial, k1, dt));

  const k2 = derivative(addScaled(initial, k1, method === "heun" ? dt : dt / 2), dynamics);
  if (method === "heun") {
    return expand(initial.map((value, index) => value + (dt / 2) * (k1[index] + k2[index])) as FlatState);
  }

  const k3 = derivative(addScaled(initial, k2, dt / 2), dynamics);
  const k4 = derivative(addScaled(initial, k3, dt), dynamics);
  return expand(
    initial.map(
      (value, index) => value + (dt / 6) * (k1[index] + 2 * k2[index] + 2 * k3[index] + k4[index]),
    ) as FlatState,
  );
}

export function compareIntegrators(
  state: NormalizedKinematicState,
  dynamics: AbstractDynamics,
  deltaTime: number,
): IntegratorComparison {
  const euler = integrateKinematics(state, dynamics, deltaTime, "euler");
  const heun = integrateKinematics(state, dynamics, deltaTime, "heun");
  const rk4 = integrateKinematics(state, dynamics, deltaTime, "rk4");
  return {
    euler,
    heun,
    rk4,
    eulerVsRk4Distance: round(vectorDistance(euler.position, rk4.position)),
    heunVsRk4Distance: round(vectorDistance(heun.position, rk4.position)),
  };
}

export function identity(size: number): Matrix {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => (row === column ? 1 : 0)),
  );
}

export function transpose(matrix: Matrix): Matrix {
  if (matrix.length === 0) return [];
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

export function multiply(left: Matrix, right: Matrix): Matrix {
  if (left.length === 0 || right.length === 0 || left[0].length !== right.length) {
    throw new Error("Incompatible matrix dimensions");
  }
  return left.map((row) =>
    right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)),
  );
}

export function add(left: Matrix, right: Matrix): Matrix {
  return left.map((row, rowIndex) => row.map((value, column) => value + right[rowIndex][column]));
}

export function subtract(left: Matrix, right: Matrix): Matrix {
  return left.map((row, rowIndex) => row.map((value, column) => value - right[rowIndex][column]));
}

export function inverse2(matrix: Matrix): Matrix {
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const safeDeterminant = Math.abs(determinant) < EPSILON ? (determinant < 0 ? -EPSILON : EPSILON) : determinant;
  return [
    [matrix[1][1] / safeDeterminant, -matrix[0][1] / safeDeterminant],
    [-matrix[1][0] / safeDeterminant, matrix[0][0] / safeDeterminant],
  ];
}

function symmetrize(matrix: Matrix): Matrix {
  return matrix.map((row, rowIndex) =>
    row.map((value, column) => {
      const symmetric = (value + matrix[column][rowIndex]) / 2;
      return rowIndex === column ? Math.max(EPSILON, symmetric) : symmetric;
    }),
  );
}

export function createKalmanTrack(
  id: string,
  objectId: string,
  initial: NormalizedKinematicState,
  initialVariance = 0.25,
): KalmanTrack {
  const variance = clamp(initialVariance, 1e-6, 10);
  return {
    id,
    objectId,
    state: flatten(initial),
    covariance: identity(4).map((row) => row.map((value) => value * variance)),
    lastMeasurementId: null,
    missedUpdates: 0,
  };
}

export function predictKalman(track: KalmanTrack, deltaTime: number, processNoise: number): KalmanTrack {
  const dt = clamp(deltaTime, 0.001, 1);
  const q = clamp(processNoise, 1e-8, 1);
  const transition: Matrix = [
    [1, 0, dt, 0],
    [0, 1, 0, dt],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  const dt2 = dt * dt;
  const dt3 = dt2 * dt;
  const dt4 = dt2 * dt2;
  const processCovariance: Matrix = [
    [(dt4 / 4) * q, 0, (dt3 / 2) * q, 0],
    [0, (dt4 / 4) * q, 0, (dt3 / 2) * q],
    [(dt3 / 2) * q, 0, dt2 * q, 0],
    [0, (dt3 / 2) * q, 0, dt2 * q],
  ];
  const stateColumn = track.state.map((value) => [value]);
  const predictedState = multiply(transition, stateColumn).map((row) => row[0]) as FlatState;
  const predictedCovariance = add(multiply(multiply(transition, track.covariance), transpose(transition)), processCovariance);
  return { ...track, state: predictedState, covariance: symmetrize(predictedCovariance), missedUpdates: track.missedUpdates + 1 };
}

export function innovation(
  track: KalmanTrack,
  measurement: SensorMeasurement,
  measurementNoise: number,
): { residual: Matrix; covariance: Matrix; squaredMahalanobisDistance: number } {
  const observation: Matrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
  ];
  const variance = Math.max(EPSILON, measurementNoise * measurementNoise);
  const residual: Matrix = [[measurement.position.x - track.state[0]], [measurement.position.y - track.state[1]]];
  const covariance = add(multiply(multiply(observation, track.covariance), transpose(observation)), [
    [variance, 0],
    [0, variance],
  ]);
  const distance = multiply(multiply(transpose(residual), inverse2(covariance)), residual)[0][0];
  return { residual, covariance, squaredMahalanobisDistance: Math.max(0, distance) };
}

export function updateKalman(track: KalmanTrack, measurement: SensorMeasurement): KalmanTrack {
  const observation: Matrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
  ];
  const estimate = innovation(track, measurement, measurement.noiseStandardDeviation);
  const gain = multiply(multiply(track.covariance, transpose(observation)), inverse2(estimate.covariance));
  const correction = multiply(gain, estimate.residual).map((row) => row[0]);
  const state = track.state.map((value, index) => value + correction[index]) as FlatState;

  // Joseph form keeps the covariance positive semidefinite under floating-point error.
  const residualProjection = subtract(identity(4), multiply(gain, observation));
  const measurementVariance = measurement.noiseStandardDeviation ** 2;
  const covariance = add(
    multiply(multiply(residualProjection, track.covariance), transpose(residualProjection)),
    multiply(multiply(gain, [[measurementVariance, 0], [0, measurementVariance]]), transpose(gain)),
  );
  return {
    ...track,
    state,
    covariance: symmetrize(covariance),
    lastMeasurementId: measurement.id,
    missedUpdates: 0,
  };
}

export function uncertaintyEllipse(track: KalmanTrack, confidence = 0.95): UncertaintyEllipse {
  const a = track.covariance[0][0];
  const b = (track.covariance[0][1] + track.covariance[1][0]) / 2;
  const d = track.covariance[1][1];
  const trace = a + d;
  const discriminant = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b ** 2));
  const majorEigenvalue = Math.max(EPSILON, trace / 2 + discriminant);
  const minorEigenvalue = Math.max(EPSILON, trace / 2 - discriminant);
  const boundedConfidence = clamp(confidence, 0.5, 0.999);
  const chiSquareScale = Math.sqrt(-2 * Math.log(1 - boundedConfidence));
  return {
    center: { x: track.state[0], y: track.state[1] },
    semiMajor: round(chiSquareScale * Math.sqrt(majorEigenvalue)),
    semiMinor: round(chiSquareScale * Math.sqrt(minorEigenvalue)),
    angleRadians: round(0.5 * Math.atan2(2 * b, a - d)),
    confidence: boundedConfidence,
  };
}

/** Greedy nearest-neighbour association after a chi-square-style Mahalanobis gate. */
export function associateMeasurements(
  tracks: KalmanTrack[],
  measurements: SensorMeasurement[],
  gateThreshold: number,
): AssociationResult {
  const gate = clamp(gateThreshold, 0.1, 100);
  const candidates = tracks.flatMap((track) =>
    measurements.map((measurement) => {
      const squaredMahalanobisDistance = innovation(
        track,
        measurement,
        measurement.noiseStandardDeviation,
      ).squaredMahalanobisDistance;
      return {
        trackId: track.id,
        measurementId: measurement.id,
        squaredMahalanobisDistance: round(squaredMahalanobisDistance),
        accepted: squaredMahalanobisDistance <= gate,
      };
    }),
  ).sort((left, right) =>
    left.squaredMahalanobisDistance - right.squaredMahalanobisDistance
      || left.trackId.localeCompare(right.trackId)
      || left.measurementId.localeCompare(right.measurementId),
  );

  const usedTracks = new Set<string>();
  const usedMeasurements = new Set<string>();
  const matches: AssociationResult["matches"] = [];
  for (const candidate of candidates) {
    if (!candidate.accepted || usedTracks.has(candidate.trackId) || usedMeasurements.has(candidate.measurementId)) continue;
    usedTracks.add(candidate.trackId);
    usedMeasurements.add(candidate.measurementId);
    matches.push({
      trackId: candidate.trackId,
      measurementId: candidate.measurementId,
      squaredMahalanobisDistance: candidate.squaredMahalanobisDistance,
    });
  }

  return {
    matches,
    unassignedTrackIds: tracks.filter((track) => !usedTracks.has(track.id)).map((track) => track.id),
    unassignedMeasurementIds: measurements.filter((measurement) => !usedMeasurements.has(measurement.id)).map((measurement) => measurement.id),
    candidates,
    gateThreshold: gate,
  };
}
