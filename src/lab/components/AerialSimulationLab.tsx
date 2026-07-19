"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INTERFACE_SOUND_STATE_EVENT, readInterfaceSoundSettings } from "@/src/components/ui/SoundController";
import { applyInterfaceAudioSettings, playSound, releaseInterfaceAudioSettings, unlockAudio } from "../audio.ts";
import {
  createScenarioConfig,
  integrateKinematics,
  PUBLIC_SCENARIO_CATALOG,
  runAerialSimulation,
  uncertaintyEllipse,
  type AerialSimulationResult,
  type IntegratorMethod,
  type KalmanTrack,
  type PublicScenarioId,
  type SimulationStep,
} from "../aerial-simulation/index.ts";

type Mode = "Live" | "Replay" | "Model Comparison" | "Monte Carlo" | "Saturation" | "Agents" | "Audit" | "Executive" | "Research";
type Layer = "truth" | "observed" | "estimated" | "prediction";
type ScenarioId = PublicScenarioId;
type AerialSurface = "public" | "private";

interface SavedControls {
  scenario: ScenarioId;
  seed: number;
  speed: number;
  layers: Record<Layer, boolean>;
  mode: Mode;
}

const STORAGE_KEY = "vgs-aerial-simulation-lab-v1";
const MODES: Mode[] = ["Live", "Replay", "Model Comparison", "Monte Carlo", "Saturation", "Agents", "Audit", "Executive", "Research"];
const LAYERS: Array<{ id: Layer; label: string; detail: string }> = [
  { id: "truth", label: "Truth", detail: "Synthetic ground truth" },
  { id: "observed", label: "Observed", detail: "Noisy virtual measurements" },
  { id: "estimated", label: "Estimated", detail: "Filtered state" },
  { id: "prediction", label: "Prediction", detail: "Uncertain projection" },
];
const SCENARIOS = Object.fromEntries(PUBLIC_SCENARIO_CATALOG.map((item) => [item.id, item])) as Record<ScenarioId, (typeof PUBLIC_SCENARIO_CATALOG)[number]>;

function clamp(value: number, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
function lerp(start: number, end: number, alpha: number) { return start + (end - start) * alpha; }
function round(value: number, digits = 1) { return Number(value.toFixed(digits)); }

interface TerrainLayerCache {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  ratio: number;
  seed: number;
}

interface MapRenderOptions {
  interpolateMotion?: boolean;
  terrainLayer?: HTMLCanvasElement | null;
  showTestMarkers?: boolean;
}

function terrainValue(horizontal: number, vertical: number, seed: number) {
  const phase = ((seed % 997) / 997) * Math.PI * 2;
  const ridge = Math.sin((horizontal * 3.3 + vertical * 1.5) * Math.PI + phase) * .09;
  const grain = Math.cos((horizontal * 8.2 - vertical * 5.1) * Math.PI - phase * .62) * .035;
  const hillA = .32 * Math.exp(-(((horizontal - .26) ** 2) / .055 + ((vertical - .34) ** 2) / .11));
  const hillB = .28 * Math.exp(-(((horizontal - .75) ** 2) / .095 + ((vertical - .63) ** 2) / .065));
  const basin = .22 * Math.exp(-(((horizontal - .56) ** 2) / .06 + ((vertical - .28) ** 2) / .075));
  return clamp(.35 + ridge + grain + hillA + hillB - basin, 0, 1);
}

function terrainColor(value: number) {
  // A warm, park-like palette keeps the synthetic relief readable without the
  // tactical green treatment associated with military maps.
  if (value < .27) return "#39354f";
  if (value < .39) return "#514964";
  if (value < .52) return "#74647a";
  if (value < .66) return "#a2817c";
  if (value < .79) return "#c9aa8a";
  return "#ead2a6";
}

/** Draws a seed-derived visual texture only; it has no geographic or elevation meaning. */
function drawSyntheticTerrain(context: CanvasRenderingContext2D, width: number, height: number, seed: number) {
  context.fillStyle = "#332f47";
  context.fillRect(0, 0, width, height);

  const cell = Math.max(18, Math.min(32, Math.floor(Math.min(width, height) / 18)));
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const horizontal = clamp((x + cell * .5) / width);
      const vertical = clamp((y + cell * .5) / height);
      context.fillStyle = terrainColor(terrainValue(horizontal, vertical, seed));
      context.fillRect(x, y, cell + 1, cell + 1);
    }
  }

  context.save();
  context.globalAlpha = .28;
  context.lineWidth = .7;
  for (const level of [.3, .42, .54, .66, .78]) {
      context.strokeStyle = level >= .66 ? "rgba(255, 237, 203, .68)" : "rgba(237, 211, 213, .52)";
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const x1 = Math.min(width, x + cell);
        const y1 = Math.min(height, y + cell);
        const topLeft = terrainValue(x / width, y / height, seed);
        const topRight = terrainValue(x1 / width, y / height, seed);
        const bottomRight = terrainValue(x1 / width, y1 / height, seed);
        const bottomLeft = terrainValue(x / width, y1 / height, seed);
        const crossings: Array<[number, number]> = [];
        const addCrossing = (from: number, to: number, fromX: number, fromY: number, toX: number, toY: number) => {
          if ((from - level) * (to - level) > 0 || from === to) return;
          const progress = clamp((level - from) / (to - from));
          crossings.push([lerp(fromX, toX, progress), lerp(fromY, toY, progress)]);
        };
        addCrossing(topLeft, topRight, x, y, x1, y);
        addCrossing(topRight, bottomRight, x1, y, x1, y1);
        addCrossing(bottomRight, bottomLeft, x1, y1, x, y1);
        addCrossing(bottomLeft, topLeft, x, y1, x, y);
        if (crossings.length === 2 || crossings.length === 4) {
          context.beginPath();
          context.moveTo(crossings[0][0], crossings[0][1]);
          context.lineTo(crossings[1][0], crossings[1][1]);
          if (crossings.length === 4) {
            context.moveTo(crossings[2][0], crossings[2][1]);
            context.lineTo(crossings[3][0], crossings[3][1]);
          }
          context.stroke();
        }
      }
    }
  }
  const vignette = context.createRadialGradient(width * .5, height * .45, Math.min(width, height) * .12, width * .5, height * .45, Math.max(width, height) * .76);
  vignette.addColorStop(0, "rgba(36, 31, 54, 0)");
  vignette.addColorStop(1, "rgba(25, 22, 38, .48)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function getTerrainLayer(
  existing: TerrainLayerCache | null,
  canvas: HTMLCanvasElement,
  seed: number,
): TerrainLayerCache | null {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, rect.width);
  const height = Math.max(360, rect.height);
  if (existing && existing.width === width && existing.height === height && existing.ratio === ratio && existing.seed === seed) return existing;
  const terrain = document.createElement("canvas");
  terrain.width = Math.floor(width * ratio);
  terrain.height = Math.floor(height * ratio);
  const context = terrain.getContext("2d");
  if (!context) return null;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawSyntheticTerrain(context, width, height, seed);
  return { canvas: terrain, width, height, ratio, seed };
}

function drawSyntheticTestMarker(
  context: CanvasRenderingContext2D,
  point: { x: number; y: number },
  velocity: { x: number; y: number },
  label: string,
  time: number,
  index: number,
) {
  const heading = Math.atan2(-velocity.y, velocity.x);
  const pulse = .55 + Math.sin(time * 6 + index * 1.37) * .18;
  const radius = 7 + pulse * 4;
  context.save();
  context.strokeStyle = `rgba(230, 252, 241, ${.2 + pulse * .18})`;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.translate(point.x, point.y);
  context.rotate(heading);
  const trail = context.createLinearGradient(-21, 0, 11, 0);
  trail.addColorStop(0, "rgba(89, 222, 177, 0)");
  trail.addColorStop(.72, "rgba(89, 222, 177, .4)");
  trail.addColorStop(1, "rgba(229, 255, 243, .9)");
  context.strokeStyle = trail;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(-22, 0);
  context.lineTo(7, 0);
  context.stroke();
  context.fillStyle = "#dff9ec";
  context.strokeStyle = "rgba(89, 222, 177, .9)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(0, 0, 4.1, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
  context.fillStyle = "rgba(232, 250, 239, .86)";
  context.font = "600 9px ui-monospace, monospace";
  context.fillText(label, point.x + 11, point.y - 10);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(query.matches);
    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function calculateSnapshot(result: AerialSimulationResult, step: SimulationStep) {
  const errors = step.tracks.flatMap((track) => {
    const truth = step.truth[track.objectId];
    return truth ? [Math.hypot(track.state[0] - truth.position.x, track.state[1] - truth.position.y)] : [];
  });
  const rmse = errors.length ? Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length) : 0;
  const ellipses = step.tracks.map(uncertaintyEllipse);
  const meanUncertainty = ellipses.length ? ellipses.reduce((sum, ellipse) => sum + ellipse.semiMajor, 0) / ellipses.length : 1;
  const confidenceProxy = clamp(1 - meanUncertainty / 2, 0, 1) * 100;
  const meanRisk = step.risks.length ? step.risks.reduce((sum, item) => sum + item.riskIndex, 0) / step.risks.length : 0;
  return {
    observed: step.observationSummary.detections,
    rmse: round(rmse, 4),
    confidence: round(confidenceProxy),
    utilization: result.saturation.utilizationPercent,
    queue: result.saturation.unassigned,
    risk: round(meanRisk),
    misses: step.observationSummary.misses,
    falseObservations: step.observationSummary.falseObservations,
    unassignedObservations: step.associations.unassignedMeasurementIds.length,
    reviewDemand: result.saturation.demand,
  };
}

/** Finds one reproducible visual cue; it does not affect any model output. */
function findSyntheticConvergenceTime(result: AerialSimulationResult) {
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestStep = 0;
  for (const step of result.steps) {
    const states = Object.values(step.truth);
    for (let leftIndex = 0; leftIndex < states.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < states.length; rightIndex += 1) {
        const left = states[leftIndex];
        const right = states[rightIndex];
        const distance = Math.hypot(left.position.x - right.position.x, left.position.y - right.position.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestStep = step.step;
        }
      }
    }
  }
  return closestStep * result.config.deltaTime;
}

function drawMap(
  canvas: HTMLCanvasElement,
  steps: SimulationStep[],
  simulationTime: number,
  deltaTime: number,
  layers: Record<Layer, boolean>,
  options: MapRenderOptions = {},
) {
  const { interpolateMotion = true, terrainLayer = null, showTestMarkers = false } = options;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, rect.width);
  const height = Math.max(360, rect.height);
  const pixelWidth = Math.floor(width * ratio);
  const pixelHeight = Math.floor(height * ratio);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (terrainLayer) {
    context.drawImage(terrainLayer, 0, 0, width, height);
    context.fillStyle = "rgba(33, 28, 48, .08)";
    context.fillRect(0, 0, width, height);
  } else {
    const backdrop = context.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, "#061724");
    backdrop.addColorStop(.52, "#082133");
    backdrop.addColorStop(1, "#061a28");
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);

    const ambient = context.createRadialGradient(width * .5, height * .42, 0, width * .5, height * .42, Math.max(width, height) * .72);
    ambient.addColorStop(0, "rgba(36, 119, 144, .12)");
    ambient.addColorStop(.62, "rgba(3, 14, 23, .04)");
    ambient.addColorStop(1, "rgba(1, 8, 14, .42)");
    context.fillStyle = ambient;
    context.fillRect(0, 0, width, height);

    const gridSize = 40;
    for (let x = 0; x <= width; x += gridSize) {
      const major = Math.round(x / gridSize) % 5 === 0;
      context.strokeStyle = major ? "rgba(120, 202, 218, .13)" : "rgba(120, 202, 218, .055)";
      context.lineWidth = major ? 1 : .75;
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      const major = Math.round(y / gridSize) % 5 === 0;
      context.strokeStyle = major ? "rgba(120, 202, 218, .13)" : "rgba(120, 202, 218, .055)";
      context.lineWidth = major ? 1 : .75;
      context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
    }
    context.strokeStyle = "rgba(118, 207, 217, .18)";
    context.beginPath(); context.moveTo(width / 2, 0); context.lineTo(width / 2, height); context.stroke();
    context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();

    context.fillStyle = "rgba(59, 148, 169, .025)";
    context.strokeStyle = "rgba(118, 207, 217, .17)";
    context.setLineDash([4, 8]);
    context.beginPath(); context.arc(width * .18, height * .78, Math.min(width, height) * .16, 0, Math.PI * 2); context.fill(); context.stroke();
    context.beginPath(); context.arc(width * .78, height * .68, Math.min(width, height) * .11, 0, Math.PI * 2); context.fill(); context.stroke();
    context.setLineDash([]);
  }

  const rawIndex = simulationTime / Math.max(deltaTime, .000001);
  const currentIndex = Math.min(steps.length - 1, Math.max(0, Math.floor(rawIndex)));
  const nextIndex = Math.min(steps.length - 1, currentIndex + 1);
  const alpha = interpolateMotion ? clamp(rawIndex - currentIndex) : 0;
  const current = steps[currentIndex] ?? steps[0];
  const next = steps[nextIndex] ?? current;
  if (!current) return;
  const toPoint = (x: number, y: number) => ({ x: width * (.5 + x / 4.4), y: height * (.5 - y / 4.4) });
  const interpolateTrack = (track: KalmanTrack | undefined, nextTrack: KalmanTrack | undefined): KalmanTrack | undefined => {
    if (!track) return nextTrack;
    if (!nextTrack) return track;
    return {
      ...track,
      state: track.state.map((value, index) => lerp(value, nextTrack.state[index], alpha)) as KalmanTrack["state"],
      covariance: track.covariance.map((row, rowIndex) => row.map((value, columnIndex) => lerp(value, nextTrack.covariance[rowIndex]?.[columnIndex] ?? value, alpha))),
    };
  };
  const objectIds = Object.keys(current.truth);
  for (const [index, objectId] of objectIds.entries()) {
    const currentTruth = current.truth[objectId];
    const nextTruth = next.truth[objectId] ?? currentTruth;
    const truth = {
      position: {
        x: lerp(currentTruth.position.x, nextTruth.position.x, alpha),
        y: lerp(currentTruth.position.y, nextTruth.position.y, alpha),
      },
      velocity: {
        x: lerp(currentTruth.velocity.x, nextTruth.velocity.x, alpha),
        y: lerp(currentTruth.velocity.y, nextTruth.velocity.y, alpha),
      },
    };
    const truthPoint = toPoint(truth.position.x, truth.position.y);
    const measurement = current.measurements.find((item) => item.objectId === objectId && item.observationKind === "detection");
    const nextMeasurement = next.measurements.find((item) => item.objectId === objectId && item.observationKind === "detection");
    const track = interpolateTrack(
      current.tracks.find((item) => item.objectId === objectId),
      next.tracks.find((item) => item.objectId === objectId),
    );
    const observedPoint = measurement
      ? toPoint(
          nextMeasurement ? lerp(measurement.position.x, nextMeasurement.position.x, alpha) : measurement.position.x,
          nextMeasurement ? lerp(measurement.position.y, nextMeasurement.position.y, alpha) : measurement.position.y,
        )
      : null;
    const estimatedPoint = track ? toPoint(track.state[0], track.state[1]) : null;

    if (layers.truth) {
      context.strokeStyle = "rgba(89, 222, 177, .45)";
      context.lineWidth = 1.3;
      context.beginPath();
      const history = steps.slice(Math.max(0, currentIndex - 42), currentIndex + 1);
      for (const [historyIndex, historyStep] of history.entries()) {
        const state = historyStep.truth[objectId];
        if (!state) continue;
        const point = toPoint(state.position.x, state.position.y);
        if (historyIndex === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
      }
      context.stroke();
    }
    if (layers.prediction && track && estimatedPoint) {
      context.strokeStyle = "rgba(239, 181, 83, .64)";
      context.setLineDash([5, 5]);
      const prediction = toPoint(track.state[0] + track.state[2] * 8, track.state[1] + track.state[3] * 8);
      context.beginPath(); context.moveTo(estimatedPoint.x, estimatedPoint.y);
      context.lineTo(prediction.x, prediction.y);
      context.stroke(); context.setLineDash([]);
      const ellipse = uncertaintyEllipse(track);
      context.fillStyle = "rgba(239, 181, 83, .07)";
      context.beginPath(); context.ellipse(prediction.x, prediction.y, Math.max(8, ellipse.semiMajor * width / 3), Math.max(5, ellipse.semiMinor * height / 3), ellipse.angleRadians, 0, Math.PI * 2); context.fill();
    }
    if (layers.observed && observedPoint) {
      context.strokeStyle = "#ee7184"; context.lineWidth = 1.2;
      context.beginPath(); context.moveTo(observedPoint.x - 4, observedPoint.y - 4); context.lineTo(observedPoint.x + 4, observedPoint.y + 4); context.moveTo(observedPoint.x + 4, observedPoint.y - 4); context.lineTo(observedPoint.x - 4, observedPoint.y + 4); context.stroke();
    }
    if (layers.estimated && track && estimatedPoint) {
      context.fillStyle = "#76d6ee"; context.strokeStyle = "rgba(118, 214, 238, .32)";
      const ellipse = uncertaintyEllipse(track);
      context.beginPath(); context.arc(estimatedPoint.x, estimatedPoint.y, 4.2, 0, Math.PI * 2); context.fill();
      context.beginPath(); context.ellipse(estimatedPoint.x, estimatedPoint.y, Math.max(6, ellipse.semiMajor * width / 4.4), Math.max(4, ellipse.semiMinor * height / 4.4), ellipse.angleRadians, 0, Math.PI * 2); context.stroke();
      context.fillStyle = "rgba(216, 239, 244, .72)"; context.font = "10px ui-monospace, monospace";
      context.fillText(`O-${String(index + 1).padStart(2, "0")}`, estimatedPoint.x + 11, estimatedPoint.y - 8);
    } else if (layers.truth) {
      context.fillStyle = "#59deb1";
      context.beginPath(); context.arc(truthPoint.x, truthPoint.y, 3.2, 0, Math.PI * 2); context.fill();
    }
    if (showTestMarkers && (layers.truth || layers.estimated)) {
      drawSyntheticTestMarker(
        context,
        layers.estimated && estimatedPoint ? estimatedPoint : truthPoint,
        truth.velocity,
        `T-${String(index + 1).padStart(2, "0")}`,
        simulationTime,
        index,
      );
    }
  }
  if (layers.observed) {
    for (const measurement of current.measurements.filter((item) => item.observationKind === "false-observation")) {
      const point = toPoint(measurement.position.x, measurement.position.y);
      context.strokeStyle = "rgba(238, 113, 132, .75)";
      context.strokeRect(point.x - 5, point.y - 5, 10, 10);
    }
  }
  context.fillStyle = terrainLayer ? "rgba(225, 239, 219, .74)" : "rgba(132, 170, 181, .7)";
  context.font = "10px ui-monospace, monospace";
  context.fillText(terrainLayer ? "FICTIONAL RELIEF · NO GEOGRAPHY · VISUAL ONLY" : "NORMALIZED SYNTHETIC SPACE · 0–100", 14, height - 16);
}

export function AerialSimulationLab({ surface = "public" }: { surface?: AerialSurface } = {}) {
  const isPrivateSurface = surface === "private";
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terrainCacheRef = useRef<TerrainLayerCache | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>("crossing");
  const [seed, setSeed] = useState(4127);
  const [speed, setSpeed] = useState(() => isPrivateSurface ? .5 : 1);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const timeRef = useRef(0);
  const launchFiredRef = useRef(false);
  const cueFiredRef = useRef(false);
  const cueTimerRef = useRef<number | null>(null);
  const [cueActive, setCueActive] = useState(false);
  const [mode, setMode] = useState<Mode>("Live");
  const [notice, setNotice] = useState("Ready. Local deterministic model initialized.");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ truth: true, observed: true, estimated: true, prediction: true });
  const config = useMemo(() => createScenarioConfig(scenario, seed), [scenario, seed]);
  const result = useMemo(() => runAerialSimulation(config), [config]);
  const duration = result.config.steps * result.config.deltaTime;
  const syntheticCueTime = useMemo(
    () => isPrivateSurface ? findSyntheticConvergenceTime(result) : null,
    [isPrivateSurface, result],
  );
  const currentIndex = Math.min(result.steps.length - 1, Math.max(0, Math.floor(time / result.config.deltaTime)));
  const currentStep = result.steps[currentIndex];
  const snapshot = useMemo(() => calculateSnapshot(result, currentStep), [result, currentStep]);
  const monteCarlo = result.monteCarlo;
  const auditEvents = useMemo(() => {
    const visible = result.auditTrail.filter((event) => event.step <= currentStep.step);
    return visible.slice(Math.max(0, visible.length - 4));
  }, [result.auditTrail, currentStep.step]);
  const models = useMemo(() => {
    const comparisonIndex = Math.min(currentIndex, result.steps.length - 2);
    const sourceStep = result.steps[comparisonIndex];
    const targetStep = result.steps[comparisonIndex + 1] ?? sourceStep;
    const propagationError = (method: IntegratorMethod) => {
      const errors = result.config.objects.flatMap((object) => {
        const source = sourceStep.truth[object.id];
        const target = targetStep.truth[object.id];
        if (!source || !target) return [];
        const estimate = integrateKinematics(source, object.dynamics, result.config.deltaTime, method);
        return [Math.hypot(estimate.position.x - target.position.x, estimate.position.y - target.position.y)];
      });
      return errors.length ? Math.sqrt(errors.reduce((sum, error) => sum + error * error, 0) / errors.length) : 0;
    };
    return (["euler", "heun", "rk4"] as IntegratorMethod[]).map((method, index) => ({
      name: `${method === "rk4" ? "RK4" : method[0].toUpperCase() + method.slice(1)} propagation + Kalman`,
      error: round(propagationError(method), 6),
      uncertainty: snapshot.confidence,
      cost: `${[1, 2, 4][index]}× relative`,
      note: method === result.config.integrator ? "Selected" : "Compared",
    }));
  }, [result, currentIndex, snapshot.confidence]);

  const replayProgress = Math.round(clamp(time / Math.max(duration, .001)) * 100);
  const synchronizedModels = [
    {
      id: "propagation",
      order: "01",
      name: "State propagation",
      formula: "xₖ₊₁ = RK4(f, xₖ, Δt)",
      detail: "Advances normalized position and velocity with the selected numerical integrator.",
      output: `step ${currentStep.step}/${result.config.steps}`,
    },
    {
      id: "observation",
      order: "02",
      name: "Observation + gate",
      formula: "zₖ = Hxₖ + vₖ · d² ≤ gate",
      detail: "Applies seeded synthetic noise, then keeps only bounded compatible observations.",
      output: `${snapshot.observed}/${result.config.objects.length} eligible`,
    },
    {
      id: "estimation",
      order: "03",
      name: "Kalman estimate",
      formula: "x̂ₖ = x̂⁻ₖ + Kₖ(zₖ − Hx̂⁻ₖ)",
      detail: "Updates the filtered state and its nominal 95% Gaussian covariance ellipse.",
      output: `${snapshot.confidence}% size proxy`,
    },
    {
      id: "sampling",
      order: "04",
      name: "Monte Carlo review",
      formula: "600 seeded draws → P10 / P50 / P90",
      detail: "Shows a reproducible uncertainty range; it does not forecast a real outcome.",
      output: `P50 ${monteCarlo.median}`,
    },
  ];

  const storageKey = isPrivateSurface ? "vgs-aerial-simulation-private-v1" : STORAGE_KEY;

  const resetSyntheticCue = useCallback(() => {
    cueFiredRef.current = false;
    if (cueTimerRef.current !== null) {
      window.clearTimeout(cueTimerRef.current);
      cueTimerRef.current = null;
    }
    setCueActive(false);
  }, []);

  const triggerSyntheticCue = useCallback(() => {
    if (!isPrivateSurface || cueFiredRef.current) return;
    cueFiredRef.current = true;
    if (cueTimerRef.current !== null) window.clearTimeout(cueTimerRef.current);
    setCueActive(true);
    cueTimerRef.current = window.setTimeout(() => {
      cueTimerRef.current = null;
      setCueActive(false);
    }, 1300);
    const played = playSound("simulation.collision");
    setNotice(played
      ? "Synthetic collision cue played; visual and audio marker only."
      : "Synthetic collision cue reached. Audio remains disabled.");
  }, [isPrivateSurface]);

  const triggerLaunchCue = useCallback(() => {
    if (!isPrivateSurface || launchFiredRef.current) return;
    launchFiredRef.current = true;
    playSound("simulation.launch");
  }, [isPrivateSurface]);

  useEffect(() => () => {
    if (cueTimerRef.current !== null) window.clearTimeout(cueTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isPrivateSurface) return undefined;
    const applyInterfaceSettings = (settings: { enabled: boolean; volume: number }) => applyInterfaceAudioSettings(settings);
    const onInterfaceSettings = (event: Event) => applyInterfaceSettings((event as CustomEvent<{ enabled: boolean; volume: number }>).detail);
    applyInterfaceSettings(readInterfaceSoundSettings());
    window.addEventListener(INTERFACE_SOUND_STATE_EVENT, onInterfaceSettings);
    return () => {
      window.removeEventListener(INTERFACE_SOUND_STATE_EVENT, onInterfaceSettings);
      releaseInterfaceAudioSettings();
    };
  }, [isPrivateSurface]);

  useEffect(() => {
    try {
      const storage = isPrivateSurface ? window.sessionStorage : window.localStorage;
      const parsed = JSON.parse(storage.getItem(storageKey) ?? "null") as SavedControls | null;
      if (parsed && SCENARIOS[parsed.scenario] && MODES.includes(parsed.mode)) queueMicrotask(() => {
        setScenario(parsed.scenario);
        setSeed(clamp(Math.round(parsed.seed), 1, 999999));
        setSpeed(clamp(parsed.speed, .25, 4));
        setLayers(Object.fromEntries(LAYERS.map(({ id }) => [id, parsed.layers?.[id] ?? true])) as Record<Layer, boolean>);
        setMode(parsed.mode);
        setNotice(isPrivateSurface ? "Private session settings restored." : "Local settings restored.");
      });
    } catch { /* Optional local persistence; defaults remain valid. */ }
  }, [isPrivateSurface, storageKey]);

  useEffect(() => {
    const storage = isPrivateSurface ? window.sessionStorage : window.localStorage;
    try { storage.setItem(storageKey, JSON.stringify({ scenario, seed, speed, layers, mode } satisfies SavedControls)); } catch { /* UI remains usable. */ }
  }, [isPrivateSurface, storageKey, scenario, seed, speed, layers, mode]);

  const renderCanvas = useCallback((simulationTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const terrain = isPrivateSurface
      ? getTerrainLayer(terrainCacheRef.current, canvas, seed)
      : null;
    terrainCacheRef.current = terrain;
    drawMap(
      canvas,
      result.steps,
      simulationTime,
      result.config.deltaTime,
      layers,
      {
        interpolateMotion: !prefersReducedMotion,
        terrainLayer: terrain?.canvas ?? null,
        showTestMarkers: isPrivateSurface,
      },
    );
  }, [isPrivateSurface, layers, prefersReducedMotion, result.config.deltaTime, result.steps, seed]);

  useEffect(() => {
    if (!running) return;
    let frameId = 0;
    let previousStamp = performance.now();
    let lastUiCommit = previousStamp;
    const animate = (stamp: number) => {
      const deltaSeconds = Math.min(.075, Math.max(0, (stamp - previousStamp) / 1000));
      previousStamp = stamp;
      const previousTime = timeRef.current;
      const next = Math.min(duration, previousTime + deltaSeconds * speed);
      const crossedIntegrationStep = Math.floor(previousTime / result.config.deltaTime)
        !== Math.floor(next / result.config.deltaTime);
      timeRef.current = next;

      if (
        isPrivateSurface
        && syntheticCueTime !== null
        && !cueFiredRef.current
        && previousTime < syntheticCueTime
        && next >= syntheticCueTime
      ) triggerSyntheticCue();

      if (!prefersReducedMotion || crossedIntegrationStep || next >= duration) renderCanvas(next);
      if (
        (prefersReducedMotion && crossedIntegrationStep)
        || (!prefersReducedMotion && stamp - lastUiCommit >= 32)
        || next >= duration
      ) {
        lastUiCommit = stamp;
        if (next >= duration) setTime(next);
        else startTransition(() => setTime(next));
      }

      if (next >= duration) {
        setRunning(false);
        playSound("simulation.complete");
        return;
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [duration, isPrivateSurface, prefersReducedMotion, renderCanvas, result.config.deltaTime, running, speed, syntheticCueTime, triggerSyntheticCue]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const render = () => renderCanvas(timeRef.current);
    render();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", render);
      return () => window.removeEventListener("resize", render);
    }
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [renderCanvas]);

  const toggleRunning = () => {
    const next = !running;
    if (next) unlockAudio();
    if (next && timeRef.current >= duration) {
      resetSyntheticCue();
      launchFiredRef.current = false;
      timeRef.current = 0;
      setTime(0);
      renderCanvas(0);
    } else if (!next) {
      setTime(timeRef.current);
    }
    if (next) triggerLaunchCue();
    setRunning(next);
    playSound(next ? "simulation.start" : "simulation.pause");
    setNotice(next ? "Simulation running." : "Simulation paused.");
  };
  const step = () => {
    const previousTime = timeRef.current;
    const next = Math.min(duration, timeRef.current + result.config.deltaTime);
    const crossesSyntheticCue = isPrivateSurface
      && syntheticCueTime !== null
      && !cueFiredRef.current
      && previousTime < syntheticCueTime
      && next >= syntheticCueTime;
    unlockAudio();
    if (previousTime <= .0001) triggerLaunchCue();
    setRunning(false);
    timeRef.current = next;
    setTime(next);
    renderCanvas(next);
    if (crossesSyntheticCue) triggerSyntheticCue();
    else {
      setNotice(`Advanced by one ${result.config.deltaTime} s integration step.`);
      playSound("ui.select");
    }
  };
  const reset = () => { resetSyntheticCue(); launchFiredRef.current = false; setRunning(false); setTime(0); timeRef.current = 0; renderCanvas(0); setNotice("Scenario reset with the same reproducible seed."); playSound("ui.select"); };
  const seek = (next: number) => {
    const bounded = clamp(next, 0, duration);
    if (syntheticCueTime !== null && bounded < syntheticCueTime) resetSyntheticCue();
    if (bounded <= .0001) launchFiredRef.current = false;
    setRunning(false);
    timeRef.current = bounded;
    setTime(bounded);
    renderCanvas(bounded);
    setNotice(`Replay position set to T+${bounded.toFixed(1)} s.`);
  };
  const changeScenario = (next: ScenarioId) => { resetSyntheticCue(); launchFiredRef.current = false; setScenario(next); setTime(0); timeRef.current = 0; setRunning(false); setNotice(`${SCENARIOS[next].label} loaded; outputs recalculated.`); };
  const changeSeed = (next: number) => { resetSyntheticCue(); launchFiredRef.current = false; setSeed(next); setTime(0); timeRef.current = 0; setRunning(false); setNotice("Seed changed; deterministic outputs recalculated."); };
  const setActiveMode = (next: Mode) => { setMode(next); setNotice(`${next} view selected.`); playSound("ui.select"); };
  const exportPayload = useCallback(() => ({
    classification: isPrivateSurface
      ? "PRIVATE SESSION — SYNTHETIC ACADEMIC SIMULATION — NON-OPERATIONAL"
      : "SYNTHETIC ACADEMIC SIMULATION — NON-OPERATIONAL",
    generatedAt: new Date().toISOString(), scenario, simulationTime: round(time, 1), layers, currentMetrics: snapshot,
    modelComparison: models, result,
  }), [isPrivateSurface, scenario, time, layers, snapshot, models, result]);
  const exportJson = () => { download(`synthetic-aerial-simulation-${seed}.json`, JSON.stringify(exportPayload(), null, 2), "application/json"); setNotice("Non-operational JSON exported."); };
  const exportCsv = () => {
    const header = "model,one_step_error,uncertainty_confidence_proxy,relative_cost,state\n";
    const rows = models.map((item) => [item.name, item.error, item.uncertainty, item.cost, item.note].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    download(`synthetic-model-comparison-${seed}.csv`, header + rows, "text/csv;charset=utf-8"); setNotice("Model comparison CSV exported.");
  };

  const riskLabel = snapshot.risk >= 70 ? "High simulated stress" : snapshot.risk >= 45 ? "Elevated simulated stress" : "Bounded simulated stress";
  const agentCards = result.agentDeployment.map((agent) => ({
    name: agent.agentName,
    code: ({ Mathematics: "MTH", Finance: "FIN", Strategy: "STR", Marketing: "MKT" } as const)[agent.agentName],
    status: agent.agentName === "Mathematics" || agent.agentName === "Strategy" || mode === "Executive" ? "Active" : "Standby",
    metric: agent.agentName === "Mathematics" ? `${snapshot.rmse} u` : agent.agentName === "Strategy" ? `${snapshot.utilization}%` : agent.agentName === "Finance" ? `${result.assignments.length} reviews` : "Plain",
    detail: agent.responsibility,
    confidence: snapshot.confidence,
  }));
  const Root = isPrivateSurface ? "section" : "main";
  const Title = isPrivateSurface ? "h2" : "h1";
  const surfaceTitleId = isPrivateSurface ? "private-aerial-workspace-title" : undefined;
  const mapSummaryId = isPrivateSurface ? "private-terrain-summary" : "public-map-summary";

  return (
    <Root
      className={`asl-shell${isPrivateSurface ? " asl-shell--private" : ""}`}
      id={isPrivateSurface ? "aerial-private-content" : "lab-content"}
      aria-labelledby={surfaceTitleId}
    >
      <header className="asl-masthead">
        <div>
          <p className="asl-eyebrow"><span /> {isPrivateSurface ? "Private lab / Aerial systems" : "Public Lab 03 / Aerial systems"}</p>
          <Title className="asl-title" id={surfaceTitleId}>Aerial resilience <em>{isPrivateSurface ? "workspace" : "simulation"}</em></Title>
          <p>{isPrivateSurface
            ? "A session-scoped analytical workspace for reproducible normalized scenarios, probabilistic state estimation and uncertainty-aware human review."
            : "A reproducible digital-twin experiment in normalized space: noisy virtual observations, probabilistic state estimation and uncertainty-aware review."}</p>
        </div>
        <aside role="note" aria-label="Simulation boundary">
          <span>{isPrivateSurface ? "PRIVATE SESSION · SYNTHETIC · NON-OPERATIONAL" : "SYNTHETIC · ACADEMIC · NON-OPERATIONAL"}</span>
          <strong>No real geography. No weapons. No physical control.</strong>
          <p>{isPrivateSurface
            ? "Dedicated authorization controls access; it does not enable live feeds or operational instructions."
            : "This public model cannot ingest live feeds or produce operational instructions."}</p>
        </aside>
      </header>

      <div className="asl-modebar" role="group" aria-label="Simulation workspace modes">
        <span>Workspace</span>
        <div>
          {MODES.map((item) => <button key={item} type="button" aria-pressed={mode === item} className={mode === item ? "is-active" : undefined} onClick={() => setActiveMode(item)}>{item}</button>)}
        </div>
      </div>

      <section className="asl-command" aria-label="Simulation controls">
        <div className="asl-run-controls">
          <button className="asl-control-primary" type="button" onClick={toggleRunning} aria-pressed={running}><span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>{running ? "Pause" : "Play"}</button>
          <button type="button" onClick={step} disabled={time >= duration}><span aria-hidden="true">▸|</span> Step</button>
          <button type="button" onClick={reset}><span aria-hidden="true">↺</span> Reset</button>
        </div>
        <label><span>Scenario</span><select value={scenario} onChange={(event) => changeScenario(event.target.value as ScenarioId)}>{Object.entries(SCENARIOS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
        <label><span>Seed</span><input type="number" min="1" max="999999" value={seed} onChange={(event) => changeSeed(clamp(Math.round(Number(event.target.value) || 1), 1, 999999))} /></label>
        <label className="asl-speed"><span>Speed <output>{speed}×</output></span><input type="range" min="0.25" max="4" step="0.25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
        <div className="asl-clock"><span>T +</span><strong>{time.toFixed(1)}</strong><small>/ {duration.toFixed(1)} s</small></div>
      </section>
      {isPrivateSurface && <label className="asl-timeline"><span>Replay position <output>T+{time.toFixed(1)} s · {replayProgress}%</output></span><input type="range" min="0" max={duration} step={result.config.deltaTime} value={time} onChange={(event) => seek(Number(event.target.value))} /></label>}

      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      <section className="asl-kpis" aria-label="Current calculated metrics">
        <article><span>Objects / observed</span><strong>{result.config.objects.length}<i>/ {snapshot.observed}</i></strong><small>synthetic entities</small></article>
        <article><span>Estimation RMSE</span><strong>{snapshot.rmse}<i> u</i></strong><small>normalized units</small></article>
        <article><span>Ellipse-size proxy</span><strong>{snapshot.confidence}<i>%</i></strong><small>heuristic; not empirical coverage</small></article>
        <article><span>Capacity utilization</span><strong>{snapshot.utilization}<i>%</i></strong><small>{snapshot.queue} queued abstractions</small></article>
        <article className={snapshot.risk >= 70 ? "is-alert" : undefined}><span>Composite stress</span><strong>{snapshot.risk}<i>/100</i></strong><small>{riskLabel}</small></article>
      </section>

      <section className="asl-main-grid">
        <article className="asl-map-panel asl-panel" aria-labelledby="map-title">
          <header className="asl-panel-head">
            <div><p>01 · {isPrivateSurface ? "SYNTHETIC RELIEF" : "NORMALIZED FIELD"}</p><h2 id="map-title">{isPrivateSurface ? "Fictional terrain field" : "Synthetic situation map"}</h2></div>
            <span className={running ? "asl-live is-running" : "asl-live"}><i /> {running ? "Running" : "Paused"}</span>
          </header>
          <div className="asl-canvas-wrap">
            <canvas ref={canvasRef} aria-label={isPrivateSurface ? `Fictional seed-derived terrain texture with synthetic test markers at ${time.toFixed(1)} seconds; the texture has no geographic, elevation, or operational meaning.` : `Abstract 2D simulation field at ${time.toFixed(1)} seconds`} aria-describedby={mapSummaryId} role="img">Text summary follows the visual field.</canvas>
            <div className="asl-map-stamp" aria-hidden="true">{isPrivateSurface ? "FICTIONAL TERRAIN · NOT A REAL MAP" : "NOT A REAL MAP"}</div>
            <div className="asl-map-scale" aria-hidden="true"><i />{isPrivateSurface ? "visual relief only" : "10 normalized units"}</div>
            {isPrivateSurface && <div className={`asl-synthetic-cue${cueActive ? " is-active" : ""}`} aria-hidden="true"><i /><span>synthetic collision cue</span><small>visual + audio marker only</small></div>}
            {isPrivateSurface && <div className="asl-private-map-key" aria-hidden="true"><span><i /> synthetic test marker</span><span><b /> filtered estimate</span><span><em /> forecast</span></div>}
          </div>
          {isPrivateSurface && <section className="asl-model-rail" aria-labelledby="model-rail-title">
            <header><div><p>LIVE MODEL VIEW</p><h3 id="model-rail-title">Four mathematical views in synchronized replay</h3></div><span>{running ? "SYNCED" : "READY"}</span></header>
            <ol>
              {synchronizedModels.map((model) => <li key={model.id} style={{ "--model-progress": `${Math.max(5, replayProgress)}%` } as React.CSSProperties}>
                <span className="asl-model-order">{model.order}</span>
                <div><strong>{model.name}</strong><code>{model.formula}</code><small>{model.detail}</small></div>
                <output>{model.output}</output>
                <i aria-hidden="true"><b /></i>
              </li>)}
            </ol>
            <p>Visual replay of precomputed local deterministic calculations. It does not show a live agent network or operational system.</p>
          </section>}
          <div className="asl-layer-controls" aria-label="Map layers">
            {LAYERS.map((layer) => <label key={layer.id} className={`is-${layer.id}`}><input type="checkbox" checked={layers[layer.id]} onChange={() => setLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))} /><i /><span><strong>{layer.label}</strong><small>{layer.detail}</small></span></label>)}
          </div>
          <p id={mapSummaryId} className="sr-only">{isPrivateSurface ? "The displayed terrain is a seed-derived visual texture only. It does not affect trajectories, estimation, risk, allocation, or location." : "The map shows"} {result.config.objects.length} synthetic objects, {snapshot.observed} currently observed, with a normalized RMSE of {snapshot.rmse}. Enabled layers: {LAYERS.filter((layer) => layers[layer.id]).map((layer) => layer.label).join(", ")}.</p>
        </article>

        <aside className="asl-situation asl-panel" aria-labelledby="situation-title">
          <header className="asl-panel-head"><div><p>02 · SITUATION</p><h2 id="situation-title">Current state</h2></div><span>T+{time.toFixed(1)}</span></header>
          <div className="asl-situation-score"><div style={{ "--value": snapshot.risk } as React.CSSProperties}><strong>{snapshot.risk}</strong><span>stress index</span></div><p><b>{riskLabel}</b>{SCENARIOS[scenario].description}</p></div>
          <dl>
            <div><dt>Observation availability</dt><dd>{round(snapshot.observed / Math.max(1, currentStep.observationSummary.expectedDetections) * 100)}%</dd></div>
            <div><dt>Misses / false observations</dt><dd>{snapshot.misses} / {snapshot.falseObservations}</dd></div>
            <div><dt>Abstract review demand</dt><dd>{snapshot.reviewDemand}</dd></div>
            <div><dt>Association state</dt><dd>{snapshot.unassignedObservations > 0 ? "Ambiguous" : "Stable"}</dd></div>
          </dl>
          <div className="asl-callout"><span>Interpretation</span><p>{snapshot.confidence < 70 ? "The ellipse-size proxy is degraded; high visual precision should not be read as high mathematical certainty." : "This run retains a bounded nominal covariance estimate; it is not validated coverage."}</p></div>
          <div className="asl-assumptions"><strong>Visible assumptions</strong><ul><li>Coordinates and zones are fictitious.</li><li>Noise is bounded and seed-derived.</li><li>No result is an instruction or decision.</li></ul></div>
        </aside>
      </section>

      <section className={`asl-analysis-grid mode-${mode.toLowerCase().replaceAll(" ", "-")}`}>
        <article className="asl-agents asl-panel" aria-labelledby="agents-title">
          <header className="asl-panel-head"><div><p>03 · {isPrivateSurface ? "CONTROLLED AGENTS" : "PUBLIC AGENTS"}</p><h2 id="agents-title">Four bounded perspectives</h2></div><span>4 / 4 {isPrivateSurface ? "enabled" : "visible"}</span></header>
          <div className="asl-agent-list">
            {agentCards.map((agent) => <article key={agent.code}><div className="asl-agent-code">{agent.code}</div><div><header><h3>{agent.name}</h3><span className={agent.status === "Active" ? "is-active" : undefined}>{agent.status}</span></header><p>{agent.detail}</p><footer><strong>{agent.metric}</strong><span>confidence {agent.confidence}%</span></footer></div></article>)}
          </div>
          <p className="asl-boundary-line">{isPrivateSurface
            ? "This authenticated view does not expose hidden prompts, private model weights or proprietary orchestration."
            : "This repository exposes no hidden agent network, private prompts or proprietary orchestration."}</p>
        </article>

        <article className="asl-math asl-panel" aria-labelledby="math-title">
          <header className="asl-panel-head"><div><p>04 · MATHEMATICS</p><h2 id="math-title">Estimator health</h2></div><span>linear state space</span></header>
          <div className="asl-equation" aria-label="State prediction equation x at k equals F times x at k minus one plus w at k"><span>x̂<sub>k|k−1</sub></span><i>=</i><span>F x̂<sub>k−1|k−1</sub> + w<sub>k</sub></span></div>
          <div className="asl-math-bars">
            <div><span>Normalized RMSE</span><i><b style={{ width: `${Math.min(100, snapshot.rmse * 9)}%` }} /></i><strong>{snapshot.rmse}</strong></div>
            <div><span>Covariance coverage</span><i><b style={{ width: `${snapshot.confidence}%` }} /></i><strong>{snapshot.confidence}%</strong></div>
            <div><span>Observation continuity</span><i><b style={{ width: `${round(snapshot.observed / Math.max(1, currentStep.observationSummary.expectedDetections) * 100)}%` }} /></i><strong>{round(snapshot.observed / Math.max(1, currentStep.observationSummary.expectedDetections) * 100)}%</strong></div>
          </div>
          <details><summary>Assumptions & validity</summary><p>Constant-velocity transition over {result.config.deltaTime} s steps; additive zero-mean bounded demo noise; normalized dimensionless space. The comparison is educational and is not calibrated against real-world sensors.</p></details>
        </article>

        <article className="asl-models asl-panel" aria-labelledby="models-title">
          <header className="asl-panel-head"><div><p>05 · MODEL COMPARISON</p><h2 id="models-title">Same state, different integrator</h2></div><span>lower error is better</span></header>
          <div className="asl-table-scroll"><table><caption className="sr-only">Calculated numerical integrator comparison</caption><thead><tr><th>Model</th><th>1-step error</th><th>Confidence proxy</th><th>Cost</th><th>State</th></tr></thead><tbody>{models.map((model) => <tr key={model.name}><th scope="row">{model.name}</th><td>{model.error} u</td><td>{model.uncertainty}%</td><td>{model.cost}</td><td><span className={model.note === "Selected" ? "is-selected" : undefined}>{model.note}</span></td></tr>)}</tbody></table></div>
          <p className="asl-table-note">Errors are calculated against the next RK4-generated core state; relative cost describes function evaluations, not wall-clock latency.</p>
        </article>

        <article className="asl-monte asl-panel" aria-labelledby="monte-title">
          <header className="asl-panel-head"><div><p>06 · MONTE CARLO</p><h2 id="monte-title">Uncertainty distribution</h2></div><span>{monteCarlo.samples} deterministic draws</span></header>
          <div className="asl-distribution" role="img" aria-label={`Stress distribution percentiles: P10 ${monteCarlo.p10}, P50 ${monteCarlo.median}, P90 ${monteCarlo.p90}`}>
            {Array.from({ length: 22 }, (_, index) => { const center = monteCarlo.median / 100; const x = index / 21; const width = Math.max(.018, monteCarlo.standardDeviation / 100 * .18); const height = Math.exp(-Math.pow(x - center, 2) / width); return <i key={index} style={{ height: `${Math.max(5, height * 100)}%` }} />; })}
          </div>
          <div className="asl-percentiles"><div><span>P10</span><strong>{monteCarlo.p10}</strong></div><div><span>P50</span><strong>{monteCarlo.median}</strong></div><div><span>Mean</span><strong>{monteCarlo.meanRisk}</strong></div><div><span>P90</span><strong>{monteCarlo.p90}</strong></div></div>
          <p>Distribution varies with scenario noise, capacity stress and seed. It does not estimate real-world outcomes.</p>
        </article>

        <article className="asl-audit asl-panel" aria-labelledby="audit-title">
          <header className="asl-panel-head"><div><p>07 · AUDIT</p><h2 id="audit-title">Traceable calculation log</h2></div><span>run {seed}-{Math.floor(time * 10).toString().padStart(4, "0")}</span></header>
          <ol>
            {auditEvents.map((event) => <li key={event.sequence}><time>T+{(event.step * result.config.deltaTime).toFixed(1)}</time><div><strong>{event.summary}</strong><p>{Object.entries(event.data).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || `Recorded by the deterministic ${isPrivateSurface ? "bounded" : "public"} core.`}</p></div><span>{event.kind.slice(0, 4).toUpperCase()}</span></li>)}
          </ol>
        </article>
      </section>

      <section className="asl-footer-tools" aria-label="Export and methodology">
        <div><p>Run status</p><strong>{notice}</strong><span>{isPrivateSurface ? "Configuration remains isolated to this browser tab session." : "Configuration is persisted locally in this browser."}</span></div>
        <div className="asl-export"><button type="button" onClick={exportJson}>Export JSON</button><button type="button" onClick={exportCsv}>Export CSV</button><a href="/lab/methodology">Methodology & limitations</a></div>
      </section>
    </Root>
  );
}
