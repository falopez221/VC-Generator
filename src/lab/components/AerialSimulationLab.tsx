"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSound } from "../audio.ts";
import {
  createScenarioConfig,
  integrateKinematics,
  PUBLIC_SCENARIO_CATALOG,
  runAerialSimulation,
  uncertaintyEllipse,
  type AerialSimulationResult,
  type IntegratorMethod,
  type PublicScenarioId,
  type SimulationStep,
} from "../aerial-simulation/index.ts";

type Mode = "Live" | "Replay" | "Model Comparison" | "Monte Carlo" | "Saturation" | "Agents" | "Audit" | "Executive" | "Research";
type Layer = "truth" | "observed" | "estimated" | "prediction";
type ScenarioId = PublicScenarioId;

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
function round(value: number, digits = 1) { return Number(value.toFixed(digits)); }
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

function drawMap(
  canvas: HTMLCanvasElement,
  steps: SimulationStep[],
  currentIndex: number,
  layers: Record<Layer, boolean>,
) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, rect.width);
  const height = Math.max(360, rect.height);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);

  const grid = context.createLinearGradient(0, 0, width, height);
  grid.addColorStop(0, "#071a2b");
  grid.addColorStop(1, "#091f30");
  context.fillStyle = grid;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(116, 188, 203, .09)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 48) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y <= height; y += 48) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.strokeStyle = "rgba(118, 207, 217, .2)";
  context.setLineDash([4, 8]);
  context.beginPath(); context.arc(width * .18, height * .78, Math.min(width, height) * .16, 0, Math.PI * 2); context.stroke();
  context.beginPath(); context.arc(width * .78, height * .68, Math.min(width, height) * .11, 0, Math.PI * 2); context.stroke();
  context.setLineDash([]);

  const current = steps[currentIndex] ?? steps[0];
  if (!current) return;
  const toPoint = (x: number, y: number) => ({ x: width * (.5 + x / 4.4), y: height * (.5 - y / 4.4) });
  const objectIds = Object.keys(current.truth);
  for (const [index, objectId] of objectIds.entries()) {
    const truth = current.truth[objectId];
    const truthPoint = toPoint(truth.position.x, truth.position.y);
    const measurement = current.measurements.find((item) => item.objectId === objectId);
    const track = current.tracks.find((item) => item.objectId === objectId);
    const observedPoint = measurement ? toPoint(measurement.position.x, measurement.position.y) : null;
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
  }
  if (layers.observed) {
    for (const measurement of current.measurements.filter((item) => item.observationKind === "false-observation")) {
      const point = toPoint(measurement.position.x, measurement.position.y);
      context.strokeStyle = "rgba(238, 113, 132, .75)";
      context.strokeRect(point.x - 5, point.y - 5, 10, 10);
    }
  }
  context.fillStyle = "rgba(132, 170, 181, .7)"; context.font = "10px ui-monospace, monospace";
  context.fillText("NORMALIZED SYNTHETIC SPACE · 0—100", 14, height - 16);
}

export function AerialSimulationLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scenario, setScenario] = useState<ScenarioId>("crossing");
  const [seed, setSeed] = useState(4127);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<Mode>("Live");
  const [notice, setNotice] = useState("Ready. Local deterministic model initialized.");
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ truth: true, observed: true, estimated: true, prediction: true });
  const config = useMemo(() => createScenarioConfig(scenario, seed), [scenario, seed]);
  const result = useMemo(() => runAerialSimulation(config), [config]);
  const duration = result.config.steps * result.config.deltaTime;
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

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as SavedControls | null;
      if (parsed && SCENARIOS[parsed.scenario] && MODES.includes(parsed.mode)) queueMicrotask(() => {
        setScenario(parsed.scenario);
        setSeed(clamp(Math.round(parsed.seed), 1, 999999));
        setSpeed(clamp(parsed.speed, .25, 4));
        setLayers(parsed.layers);
        setMode(parsed.mode);
        setNotice("Local session restored.");
      });
    } catch { /* Optional local persistence; defaults remain valid. */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenario, seed, speed, layers, mode } satisfies SavedControls)); } catch { /* UI remains usable. */ }
  }, [scenario, seed, speed, layers, mode]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTime((current) => {
      const next = current + speed * result.config.deltaTime;
      if (next >= duration) { setRunning(false); playSound("simulation.complete"); return duration; }
      return next;
    }), 500);
    return () => window.clearInterval(timer);
  }, [running, speed, duration, result.config.deltaTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const render = () => drawMap(canvas, result.steps, currentIndex, layers);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [result, currentIndex, layers]);

  const toggleRunning = () => {
    setRunning((current) => {
      const next = !current;
      if (next && time >= duration) setTime(0);
      playSound(next ? "simulation.start" : "simulation.pause");
      setNotice(next ? "Simulation running." : "Simulation paused.");
      return next;
    });
  };
  const step = () => { setRunning(false); setTime((current) => Math.min(duration, current + result.config.deltaTime)); setNotice(`Advanced by one ${result.config.deltaTime} s integration step.`); playSound("ui.select"); };
  const reset = () => { setRunning(false); setTime(0); setNotice("Scenario reset with the same reproducible seed."); playSound("ui.select"); };
  const changeScenario = (next: ScenarioId) => { setScenario(next); setTime(0); setRunning(false); setNotice(`${SCENARIOS[next].label} loaded; outputs recalculated.`); };
  const setActiveMode = (next: Mode) => { setMode(next); setNotice(`${next} view selected.`); playSound("ui.select"); };
  const exportPayload = useCallback(() => ({
    classification: "SYNTHETIC ACADEMIC SIMULATION — NON-OPERATIONAL",
    generatedAt: new Date().toISOString(), scenario, simulationTime: round(time, 1), layers, currentMetrics: snapshot,
    modelComparison: models, result,
  }), [scenario, time, layers, snapshot, models, result]);
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

  return (
    <main className="asl-shell" id="lab-content">
      <header className="asl-masthead">
        <div>
          <p className="asl-eyebrow"><span /> Public Lab 03 / Aerial systems</p>
          <h1>Aerial resilience <em>simulation</em></h1>
          <p>A reproducible digital-twin experiment in normalized space: noisy virtual observations, probabilistic state estimation and uncertainty-aware review.</p>
        </div>
        <aside role="note" aria-label="Simulation boundary">
          <span>SYNTHETIC · ACADEMIC · NON-OPERATIONAL</span>
          <strong>No real geography. No weapons. No physical control.</strong>
          <p>This public model cannot ingest live feeds or produce operational instructions.</p>
        </aside>
      </header>

      <nav className="asl-modebar" aria-label="Simulation workspace modes">
        <span>Workspace</span>
        <div role="tablist" aria-label="Analysis mode">
          {MODES.map((item) => <button key={item} type="button" role="tab" aria-selected={mode === item} className={mode === item ? "is-active" : undefined} onClick={() => setActiveMode(item)}>{item}</button>)}
        </div>
      </nav>

      <section className="asl-command" aria-label="Simulation controls">
        <div className="asl-run-controls">
          <button className="asl-control-primary" type="button" onClick={toggleRunning} aria-pressed={running}><span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>{running ? "Pause" : "Play"}</button>
          <button type="button" onClick={step} disabled={time >= duration}><span aria-hidden="true">▸|</span> Step</button>
          <button type="button" onClick={reset}><span aria-hidden="true">↺</span> Reset</button>
        </div>
        <label><span>Scenario</span><select value={scenario} onChange={(event) => changeScenario(event.target.value as ScenarioId)}>{Object.entries(SCENARIOS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
        <label><span>Seed</span><input type="number" min="1" max="999999" value={seed} onChange={(event) => setSeed(clamp(Math.round(Number(event.target.value) || 1), 1, 999999))} /></label>
        <label className="asl-speed"><span>Speed <output>{speed}×</output></span><input type="range" min="0.25" max="4" step="0.25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
        <div className="asl-clock"><span>T +</span><strong>{time.toFixed(1)}</strong><small>/ {duration.toFixed(1)} s</small></div>
      </section>

      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      <section className="asl-kpis" aria-label="Current calculated metrics">
        <article><span>Objects / observed</span><strong>{result.config.objects.length}<i>/ {snapshot.observed}</i></strong><small>synthetic entities</small></article>
        <article><span>Estimation RMSE</span><strong>{snapshot.rmse}<i> u</i></strong><small>normalized units</small></article>
        <article><span>Covariance confidence proxy</span><strong>{snapshot.confidence}<i>%</i></strong><small>derived from ellipse size</small></article>
        <article><span>Capacity utilization</span><strong>{snapshot.utilization}<i>%</i></strong><small>{snapshot.queue} queued abstractions</small></article>
        <article className={snapshot.risk >= 70 ? "is-alert" : undefined}><span>Composite stress</span><strong>{snapshot.risk}<i>/100</i></strong><small>{riskLabel}</small></article>
      </section>

      <section className="asl-main-grid">
        <article className="asl-map-panel asl-panel" aria-labelledby="map-title">
          <header className="asl-panel-head">
            <div><p>01 · NORMALIZED FIELD</p><h2 id="map-title">Synthetic situation map</h2></div>
            <span className={running ? "asl-live is-running" : "asl-live"}><i /> {running ? "Running" : "Paused"}</span>
          </header>
          <div className="asl-canvas-wrap">
            <canvas ref={canvasRef} aria-label={`Abstract 2D simulation field at ${time.toFixed(1)} seconds`} role="img">Text summary follows the visual field.</canvas>
            <div className="asl-map-stamp" aria-hidden="true">NOT A REAL MAP</div>
            <div className="asl-map-scale" aria-hidden="true"><i />10 normalized units</div>
          </div>
          <div className="asl-layer-controls" aria-label="Map layers">
            {LAYERS.map((layer) => <label key={layer.id} className={`is-${layer.id}`}><input type="checkbox" checked={layers[layer.id]} onChange={() => setLayers((current) => ({ ...current, [layer.id]: !current[layer.id] }))} /><i /><span><strong>{layer.label}</strong><small>{layer.detail}</small></span></label>)}
          </div>
          <p className="sr-only">The map shows {result.config.objects.length} synthetic objects, {snapshot.observed} currently observed, with a normalized RMSE of {snapshot.rmse}. Enabled layers: {LAYERS.filter((layer) => layers[layer.id]).map((layer) => layer.label).join(", ")}.</p>
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
          <div className="asl-callout"><span>Interpretation</span><p>{snapshot.confidence < 70 ? "Confidence is degraded; high visual precision should not be read as high mathematical certainty." : "Estimates remain inside the demonstrative confidence boundary for this run."}</p></div>
          <div className="asl-assumptions"><strong>Visible assumptions</strong><ul><li>Coordinates and zones are fictitious.</li><li>Noise is bounded and seed-derived.</li><li>No result is an instruction or decision.</li></ul></div>
        </aside>
      </section>

      <section className={`asl-analysis-grid mode-${mode.toLowerCase().replaceAll(" ", "-")}`}>
        <article className="asl-agents asl-panel" aria-labelledby="agents-title">
          <header className="asl-panel-head"><div><p>03 · PUBLIC AGENTS</p><h2 id="agents-title">Four bounded perspectives</h2></div><span>4 / 4 visible</span></header>
          <div className="asl-agent-list">
            {agentCards.map((agent) => <article key={agent.code}><div className="asl-agent-code">{agent.code}</div><div><header><h3>{agent.name}</h3><span className={agent.status === "Active" ? "is-active" : undefined}>{agent.status}</span></header><p>{agent.detail}</p><footer><strong>{agent.metric}</strong><span>confidence {agent.confidence}%</span></footer></div></article>)}
          </div>
          <p className="asl-boundary-line">This repository exposes no hidden agent network, private prompts or proprietary orchestration.</p>
        </article>

        <article className="asl-math asl-panel" aria-labelledby="math-title">
          <header className="asl-panel-head"><div><p>04 · MATHEMATICS</p><h2 id="math-title">Estimator health</h2></div><span>linear state space</span></header>
          <div className="asl-equation" aria-label="State prediction equation x at k equals F times x at k minus one plus w at k"><span>x̂<sub>k|k−1</sub></span><i>=</i><span>F x̂<sub>k−1|k−1</sub> + w<sub>k</sub></span></div>
          <div className="asl-math-bars">
            <div><span>Normalized RMSE</span><i><b style={{ width: `${Math.min(100, snapshot.rmse * 9)}%` }} /></i><strong>{snapshot.rmse}</strong></div>
            <div><span>Covariance coverage</span><i><b style={{ width: `${snapshot.confidence}%` }} /></i><strong>{snapshot.confidence}%</strong></div>
            <div><span>Observation continuity</span><i><b style={{ width: `${round(snapshot.observed / Math.max(1, currentStep.observationSummary.expectedDetections) * 100)}%` }} /></i><strong>{round(snapshot.observed / Math.max(1, currentStep.observationSummary.expectedDetections) * 100)}%</strong></div>
          </div>
          <details><summary>Assumptions & validity</summary><p>Constant-velocity transition over 0.5 s steps; additive zero-mean bounded demo noise; normalized dimensionless space. The comparison is educational and is not calibrated against real-world sensors.</p></details>
        </article>

        <article className="asl-models asl-panel" aria-labelledby="models-title">
          <header className="asl-panel-head"><div><p>05 · MODEL COMPARISON</p><h2 id="models-title">Same state, different integrator</h2></div><span>lower error is better</span></header>
          <div className="asl-table-scroll"><table><caption className="sr-only">Calculated numerical integrator comparison</caption><thead><tr><th>Model</th><th>1-step error</th><th>Confidence proxy</th><th>Cost</th><th>State</th></tr></thead><tbody>{models.map((model) => <tr key={model.name}><th scope="row">{model.name}</th><td>{model.error} u</td><td>{model.uncertainty}%</td><td>{model.cost}</td><td><span className={model.note === "Selected" ? "is-selected" : undefined}>{model.note}</span></td></tr>)}</tbody></table></div>
          <p className="asl-table-note">Errors are calculated against the next RK4-generated core state; relative cost describes function evaluations, not wall-clock latency.</p>
        </article>

        <article className="asl-monte asl-panel" aria-labelledby="monte-title">
          <header className="asl-panel-head"><div><p>06 · MONTE CARLO</p><h2 id="monte-title">Uncertainty distribution</h2></div><span>{monteCarlo.samples} deterministic draws</span></header>
          <div className="asl-distribution" aria-label={`Stress distribution percentiles: P10 ${monteCarlo.p10}, P50 ${monteCarlo.median}, P90 ${monteCarlo.p90}`}>
            {Array.from({ length: 22 }, (_, index) => { const center = monteCarlo.median / 100; const x = index / 21; const width = Math.max(.018, monteCarlo.standardDeviation / 100 * .18); const height = Math.exp(-Math.pow(x - center, 2) / width); return <i key={index} style={{ height: `${Math.max(5, height * 100)}%` }} />; })}
          </div>
          <div className="asl-percentiles"><div><span>P10</span><strong>{monteCarlo.p10}</strong></div><div><span>P50</span><strong>{monteCarlo.median}</strong></div><div><span>Mean</span><strong>{monteCarlo.meanRisk}</strong></div><div><span>P90</span><strong>{monteCarlo.p90}</strong></div></div>
          <p>Distribution varies with scenario noise, capacity stress and seed. It does not estimate real-world outcomes.</p>
        </article>

        <article className="asl-audit asl-panel" aria-labelledby="audit-title">
          <header className="asl-panel-head"><div><p>07 · AUDIT</p><h2 id="audit-title">Traceable calculation log</h2></div><span>run {seed}-{Math.floor(time * 10).toString().padStart(4, "0")}</span></header>
          <ol>
            {auditEvents.map((event) => <li key={event.sequence}><time>T+{(event.step * result.config.deltaTime).toFixed(1)}</time><div><strong>{event.summary}</strong><p>{Object.entries(event.data).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || "Recorded by the deterministic public core."}</p></div><span>{event.kind.slice(0, 4).toUpperCase()}</span></li>)}
          </ol>
        </article>
      </section>

      <section className="asl-footer-tools" aria-label="Export and methodology">
        <div><p>Run status</p><strong>{notice}</strong><span>Configuration is persisted locally in this browser.</span></div>
        <div className="asl-export"><button type="button" onClick={exportJson}>Export JSON</button><button type="button" onClick={exportCsv}>Export CSV</button><a href="/lab/methodology">Methodology & limitations</a></div>
      </section>
    </main>
  );
}
