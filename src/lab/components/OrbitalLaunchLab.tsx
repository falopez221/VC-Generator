"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playSound } from "../audio.ts";
import {
  createOrbitalScenario,
  ORBITAL_SCENARIO_CATALOG,
  runOrbitalSimulation,
  type FlightSample,
  type OrbitalScenarioId,
  type OrbitalSimulationResult,
} from "../orbital-simulation/index.ts";

const MISSION_DURATION = 600;
const STORAGE_KEY = "vgs-public-orbital-lab-v1";
const BASE_SIMULATION_RATE = 12;

const PHASE_LABELS: Record<FlightSample["phase"], string> = {
  prelaunch: "Preparación",
  liftoff: "Despegue",
  ascent: "Ascenso",
  "max-q": "Máxima carga sintética",
  "stage-separation": "Separación de etapa",
  "upper-stage": "Etapa superior",
  "fairing-separation": "Separación de cofia",
  "orbital-insertion": "Inserción sintética",
  deployment: "Despliegue",
  orbit: "Órbita sintética",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function ease(value: number) {
  const bounded = clamp(value, 0, 1);
  return bounded * bounded * (3 - 2 * bounded);
}

function progressBetween(time: number, start: number, duration: number) {
  return ease((time - start) / duration);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function sampleAt(result: OrbitalSimulationResult, time: number) {
  const step = result.input.timeStepSeconds;
  const index = clamp(Math.floor(time / step), 0, result.samples.length - 1);
  return result.samples[index];
}

function drawStars(context: CanvasRenderingContext2D, width: number, height: number, seed: number) {
  let state = seed >>> 0 || 1;
  for (let index = 0; index < 105; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const x = (state / 0xffffffff) * width;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const y = (state / 0xffffffff) * height * .82;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const radius = .35 + (state / 0xffffffff) * 1.15;
    context.fillStyle = `rgba(224, 241, 255, ${.24 + radius * .32})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function drawPanel(context: CanvasRenderingContext2D, side: -1 | 1, deployment: number) {
  if (deployment <= 0) return;
  const width = 46 * deployment;
  const x = side < 0 ? -11 - width : 11;
  context.fillStyle = "#173b74";
  context.strokeStyle = "rgba(127, 203, 255, .9)";
  context.lineWidth = 1;
  context.fillRect(x, -7, width, 14);
  context.strokeRect(x, -7, width, 14);
  context.strokeStyle = "rgba(164, 220, 255, .38)";
  for (let cell = 1; cell < 4; cell += 1) {
    const lineX = side < 0 ? -11 - width * cell / 4 : 11 + width * cell / 4;
    context.beginPath(); context.moveTo(lineX, -7); context.lineTo(lineX, 7); context.stroke();
  }
  context.beginPath(); context.moveTo(x, 0); context.lineTo(x + width, 0); context.stroke();
}

function drawPayload(context: CanvasRenderingContext2D, time: number) {
  context.save();
  context.fillStyle = "#e8edf2";
  context.strokeStyle = "#8fc9db";
  context.lineWidth = 1.4;
  context.fillRect(-10, -16, 20, 30);
  context.strokeRect(-10, -16, 20, 30);
  context.fillStyle = "#c28d3e";
  context.fillRect(-8, -11, 16, 19);
  context.strokeRect(-8, -11, 16, 19);
  drawPanel(context, -1, progressBetween(time, 528, 8));
  drawPanel(context, 1, progressBetween(time, 536, 8));
  const antenna = progressBetween(time, 545, 7);
  if (antenna > 0) {
    context.strokeStyle = "#d9f2ff";
    context.beginPath(); context.moveTo(0, -16); context.lineTo(0, -16 - 25 * antenna); context.stroke();
    context.beginPath(); context.arc(0, -18 - 25 * antenna, 7 * antenna, Math.PI, Math.PI * 2); context.stroke();
  }
  context.restore();
}

function drawAttachedVehicle(context: CanvasRenderingContext2D, time: number) {
  const stageAttached = time < 102;
  const fairingAttached = time < 188;
  context.save();
  context.strokeStyle = "rgba(214, 238, 246, .92)";
  context.lineWidth = 1.2;
  if (stageAttached) {
    const body = context.createLinearGradient(-10, 0, 10, 0);
    body.addColorStop(0, "#778c96"); body.addColorStop(.45, "#edf3f4"); body.addColorStop(1, "#6c808c");
    context.fillStyle = body;
    context.beginPath(); context.roundRect(-11, 3, 22, 61, 4); context.fill(); context.stroke();
    context.fillStyle = "#263844";
    context.fillRect(-11, 42, 22, 5);
  }
  context.fillStyle = "#d7e4e7";
  context.beginPath(); context.roundRect(-9, -23, 18, stageAttached ? 29 : 38, 4); context.fill(); context.stroke();
  if (fairingAttached) {
    context.fillStyle = "#f0f5f5";
    context.beginPath();
    context.moveTo(-10, -20); context.quadraticCurveTo(-7, -44, 0, -50);
    context.quadraticCurveTo(7, -44, 10, -20); context.closePath(); context.fill(); context.stroke();
    context.strokeStyle = "rgba(88, 124, 137, .55)";
    context.beginPath(); context.moveTo(0, -49); context.lineTo(0, -20); context.stroke();
  } else {
    drawPayload(context, time);
  }
  if (time > 0 && time < 510) {
    const flameLength = stageAttached ? 32 : 20;
    const flame = context.createLinearGradient(0, 15, 0, 15 + flameLength);
    flame.addColorStop(0, "rgba(224, 250, 255, .95)");
    flame.addColorStop(.34, "rgba(75, 196, 255, .85)");
    flame.addColorStop(1, "rgba(247, 151, 60, 0)");
    context.fillStyle = flame;
    context.beginPath(); context.moveTo(-6, stageAttached ? 64 : 6); context.quadraticCurveTo(0, (stageAttached ? 64 : 6) + flameLength, 6, stageAttached ? 64 : 6); context.fill();
  }
  context.restore();
}

function drawDetachedParts(context: CanvasRenderingContext2D, time: number, reducedMotion: boolean) {
  if (time >= 102 && time < 185) {
    const separation = progressBetween(time, 102, 40);
    context.save();
    context.translate(-20 * separation, 42 + 105 * separation);
    context.rotate(reducedMotion ? 0 : -.22 * separation);
    context.fillStyle = "rgba(155, 176, 184, .9)";
    context.strokeStyle = "rgba(218, 238, 241, .72)";
    context.beginPath(); context.roundRect(-10, 0, 20, 59, 4); context.fill(); context.stroke();
    context.restore();
  }
  if (time >= 188 && time < 268) {
    const separation = progressBetween(time, 188, 24);
    for (const side of [-1, 1] as const) {
      context.save();
      context.translate(side * (13 + separation * 50), -24 + separation * 26);
      context.rotate(side * separation * (reducedMotion ? .18 : .62));
      context.fillStyle = "rgba(226, 237, 239, .9)";
      context.strokeStyle = "rgba(149, 202, 217, .72)";
      context.beginPath(); context.moveTo(0, 28); context.quadraticCurveTo(side * 9, 4, 0, -21); context.lineTo(side * 5, 27); context.closePath(); context.fill(); context.stroke();
      context.restore();
    }
  }
}

function drawOrbitalScene(
  canvas: HTMLCanvasElement,
  result: OrbitalSimulationResult,
  time: number,
  reducedMotion: boolean,
) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, rect.width);
  const height = Math.max(430, rect.height);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = context.createLinearGradient(0, height, 0, 0);
  sky.addColorStop(0, "#14384b"); sky.addColorStop(.38, "#071728"); sky.addColorStop(1, "#02060e");
  context.fillStyle = sky; context.fillRect(0, 0, width, height);
  drawStars(context, width, height, result.seed);

  const planetRadius = Math.max(width, height) * .78;
  const planetX = width * .18;
  const planetY = height + planetRadius * .69;
  const atmosphere = context.createRadialGradient(planetX, planetY, planetRadius * .92, planetX, planetY, planetRadius * 1.04);
  atmosphere.addColorStop(0, "#184661"); atmosphere.addColorStop(.89, "#0d344e"); atmosphere.addColorStop(.96, "rgba(71, 182, 224, .7)"); atmosphere.addColorStop(1, "rgba(71, 182, 224, 0)");
  context.fillStyle = atmosphere; context.beginPath(); context.arc(planetX, planetY, planetRadius * 1.04, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#0a293d"; context.beginPath(); context.arc(planetX, planetY, planetRadius * .94, 0, Math.PI * 2); context.fill();

  const pointFor = (sample: FlightSample) => {
    const altitude = clamp(sample.altitudeKm / result.input.targetAltitudeKm, 0, 1);
    const mission = clamp(sample.timeSeconds / 510, 0, 1);
    return {
      x: width * (.2 + .66 * ease(mission)),
      y: height * (.84 - .61 * ease(altitude)),
    };
  };
  const current = sampleAt(result, time);
  context.strokeStyle = "rgba(94, 218, 239, .55)";
  context.lineWidth = 2;
  context.setLineDash([5, 7]);
  context.beginPath();
  for (const [index, sample] of result.samples.entries()) {
    if (sample.timeSeconds > time) break;
    const point = pointFor(sample);
    if (index === 0) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
  }
  context.stroke(); context.setLineDash([]);

  const craft = pointFor(current);
  context.save();
  context.translate(craft.x, craft.y);
  context.rotate((90 - current.pitchDeg) * Math.PI / 180);
  const scale = clamp(Math.min(width, height) / 560, .7, 1.18);
  context.scale(scale, scale);
  drawDetachedParts(context, time, reducedMotion);
  drawAttachedVehicle(context, time);
  context.restore();

  context.fillStyle = "rgba(224, 243, 248, .82)";
  context.font = "600 11px ui-monospace, monospace";
  context.fillText(`T+ ${time.toFixed(1)} s`, 18, 28);
  context.fillStyle = "rgba(146, 198, 211, .78)";
  context.font = "10px ui-monospace, monospace";
  context.fillText("PLANETA FICTICIO · ESCALA VISUAL NO OPERACIONAL", 18, 46);
}

function downloadJson(result: OrbitalSimulationResult) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `simulacion-orbital-sintetica-${result.seed}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function OrbitalLaunchLab() {
  const [scenarioId, setScenarioId] = useState<OrbitalScenarioId>("demo");
  const [seed, setSeed] = useState(2026);
  const [speed, setSpeed] = useState(1);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("Simulación preparada.");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastReducedUpdateRef = useRef(0);
  const preferencesLoadedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const scenario = useMemo(() => createOrbitalScenario(scenarioId, seed), [scenarioId, seed]);
  const result = useMemo(() => runOrbitalSimulation(scenario.input), [scenario]);
  const current = sampleAt(result, time);
  const visibleEvents = result.events.filter((event) => event.timeSeconds <= time).slice(-5).reverse();
  const completedParts = new Set(result.events.filter((event) => event.timeSeconds <= time).map((event) => event.visualPart));

  const render = useCallback((nextTime = timeRef.current) => {
    if (canvasRef.current) drawOrbitalScene(canvasRef.current, result, nextTime, reducedMotion);
  }, [result, reducedMotion]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as { scenarioId?: OrbitalScenarioId; seed?: number; speed?: number } | null;
      queueMicrotask(() => {
        if (stored?.scenarioId && ORBITAL_SCENARIO_CATALOG.some((item) => item.id === stored.scenarioId)) setScenarioId(stored.scenarioId);
        if (Number.isFinite(stored?.seed)) setSeed(clamp(Math.round(stored?.seed ?? 2026), 1, 999999));
        if (Number.isFinite(stored?.speed)) setSpeed(clamp(stored?.speed ?? 1, .25, 4));
        preferencesLoadedRef.current = true;
      });
    } catch { preferencesLoadedRef.current = true; }
  }, []);

  useEffect(() => {
    if (preferencesLoadedRef.current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenarioId, seed, speed }));
  }, [scenarioId, seed, speed]);

  useEffect(() => {
    render(time);
  }, [render, time]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => render());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => {
    if (!running) { lastFrameRef.current = null; return; }
    let frame = 0;
    const animate = (timestamp: number) => {
      const previous = lastFrameRef.current ?? timestamp;
      if (!reducedMotion || timestamp - lastReducedUpdateRef.current >= 500) {
        lastFrameRef.current = timestamp;
        lastReducedUpdateRef.current = timestamp;
        const next = clamp(timeRef.current + (timestamp - previous) / 1000 * BASE_SIMULATION_RATE * speed, 0, MISSION_DURATION);
        timeRef.current = next;
        setTime(next);
        if (next >= MISSION_DURATION) {
          setRunning(false);
          setNotice("Demostración completada: criterio de órbita sintética alcanzado.");
          playSound("simulation.complete");
          return;
        }
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [running, speed, reducedMotion]);

  const toggleRunning = () => {
    if (timeRef.current >= MISSION_DURATION) { timeRef.current = 0; setTime(0); }
    setRunning((value) => {
      const next = !value;
      setNotice(next ? "Simulación orbital sintética en curso." : "Simulación pausada.");
      playSound(next ? "simulation.start" : "simulation.pause");
      if (next && timeRef.current < 2) playSound("simulation.launch");
      return next;
    });
  };

  const reset = () => {
    timeRef.current = 0;
    setTime(0);
    setRunning(false);
    setNotice("Simulación reiniciada con la misma semilla.");
    playSound("ui.select");
  };

  const resetForNewConfiguration = () => {
    timeRef.current = 0;
    setTime(0);
    setRunning(false);
    setNotice("Escenario recalculado con una semilla reproducible.");
  };

  const canvasSummary = `${PHASE_LABELS[current.phase]}. Altitud ${current.altitudeKm.toFixed(1)} kilómetros sintéticos; velocidad ${Math.round(current.speedMps)} metros por segundo demostrativos. Primera etapa ${completedParts.has("first-stage") ? "separada" : "unida"}; cofia ${completedParts.has("fairing-right") ? "separada" : "unida"}; paneles ${completedParts.has("solar-right") ? "desplegados" : "plegados"}; antena ${completedParts.has("antenna") ? "desplegada" : "plegada"}.`;

  return (
    <main id="lab-content" className="osl-shell">
      <header className="osl-masthead">
        <div><p className="osl-eyebrow">PUBLIC LAB · DINÁMICA ORBITAL FICTICIA</p><h1>Lanzamiento orbital sintético</h1><p>Observá un ascenso reproducible, la separación de sus capas y el despliegue de la nave. El modelo es educativo, acotado y no sirve para planificar una misión real.</p></div>
        <aside><strong>{result.summary.reachedOrbit ? "CRITERIO SINTÉTICO DISPONIBLE" : "REVISIÓN REQUERIDA"}</strong><p>Planeta, vehículo, masas, trayectoria y telemetría son ficticios. Ningún dato es una instrucción operacional.</p></aside>
      </header>

      <section className="osl-controls" aria-label="Controles de simulación">
        <div className="osl-playback"><button className="osl-primary" type="button" aria-pressed={running} onClick={toggleRunning}>{running ? "Pausar" : "Iniciar"}</button><button type="button" onClick={reset}>Reiniciar</button></div>
        <label><span>Escenario</span><select value={scenarioId} onChange={(event) => { setScenarioId(event.target.value as OrbitalScenarioId); resetForNewConfiguration(); playSound("ui.select"); }}>{ORBITAL_SCENARIO_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Semilla</span><input type="number" min="1" max="999999" value={seed} onChange={(event) => { setSeed(clamp(Math.round(Number(event.target.value) || 1), 1, 999999)); resetForNewConfiguration(); }} /></label>
        <label className="osl-speed"><span>Velocidad <output>{speed}×</output></span><input type="range" min="0.25" max="4" step="0.25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label>
        <div className="osl-clock"><span>T+</span><strong>{time.toFixed(1)}</strong><small>/ {MISSION_DURATION} s</small></div>
      </section>

      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      <section className="osl-telemetry" aria-label="Telemetría sintética actual">
        <article><span>Fase</span><strong>{PHASE_LABELS[current.phase]}</strong><small>hito narrativo</small></article>
        <article><span>Altitud</span><strong>{current.altitudeKm.toFixed(1)} <i>km</i></strong><small>valor demostrativo</small></article>
        <article><span>Velocidad</span><strong>{Math.round(current.speedMps)} <i>m/s</i></strong><small>modelo ficticio</small></article>
        <article><span>Carga dinámica</span><strong>{current.dynamicPressureKpa.toFixed(1)} <i>kPa</i></strong><small>aproximación sintética</small></article>
        <article><span>Propelente</span><strong>{current.propellantPercent.toFixed(1)}<i>%</i></strong><small>estado calculado</small></article>
      </section>

      <section className="osl-workspace">
        <article className="osl-visual-panel" aria-labelledby="osl-visual-title">
          <header><div><p>01 · VISTA DE MISIÓN</p><h2 id="osl-visual-title">De la plataforma a la órbita</h2></div><span className={running ? "is-running" : undefined}>{running ? "EN CURSO" : "PAUSADA"}</span></header>
          <div className="osl-canvas-wrap"><canvas ref={canvasRef} role="img" aria-label="Visualización animada de un lanzamiento orbital completamente ficticio" aria-describedby="osl-canvas-summary">La descripción textual de la escena aparece a continuación.</canvas><div className="osl-canvas-stamp" aria-hidden="true">SIMULACIÓN · NO OPERACIONAL</div></div>
          <p id="osl-canvas-summary" className="sr-only">{canvasSummary}</p>
          <label className="osl-timeline"><span>Posición de reproducción <output>T+{time.toFixed(1)} s</output></span><input type="range" min="0" max={MISSION_DURATION} step={result.input.timeStepSeconds} value={time} onChange={(event) => { const next = Number(event.target.value); timeRef.current = next; setTime(next); setRunning(false); }} /></label>
        </article>

        <aside className="osl-events" aria-labelledby="osl-events-title">
          <header><p>02 · EVENTOS</p><h2 id="osl-events-title">Secuencia visible</h2></header>
          <ol>{visibleEvents.length ? visibleEvents.map((event) => <li key={event.id}><time>T+{event.timeSeconds}s</time><div><strong>{event.label}</strong><p>{event.detail}</p></div></li>) : <li><time>T+0s</time><div><strong>Preparada</strong><p>Iniciá la simulación para observar los hitos.</p></div></li>}</ol>
          <div className="osl-deployment" aria-label="Estado de componentes"><span className={completedParts.has("first-stage") ? "is-complete" : undefined}>1ª etapa</span><span className={completedParts.has("fairing-right") ? "is-complete" : undefined}>Cofia</span><span className={completedParts.has("solar-right") ? "is-complete" : undefined}>Paneles</span><span className={completedParts.has("antenna") ? "is-complete" : undefined}>Antena</span></div>
        </aside>
      </section>

      <section className="osl-summary" aria-labelledby="osl-summary-title">
        <div><p>03 · RESULTADO CALCULADO</p><h2 id="osl-summary-title">Criterio de órbita sintética</h2><p>{result.summary.reachedOrbit ? "El cálculo determinista satisface el criterio narrativo de altitud y velocidad del escenario." : "El cálculo requiere revisión dentro de este modelo demostrativo."} No equivale a viabilidad física, certificación ni asesoramiento técnico.</p></div>
        <dl><div><dt>Altitud objetivo</dt><dd>{result.summary.targetAltitudeKm} km</dd></div><div><dt>Período ilustrativo</dt><dd>{result.summary.orbitalPeriodMinutes} min</dd></div><div><dt>Error de inserción</dt><dd>{result.summary.insertionErrorPercent}%</dd></div><div><dt>Aceleración pico</dt><dd>{result.summary.peakAccelerationG} g</dd></div></dl>
      </section>

      <section className="osl-method" aria-label="Supuestos, limitaciones y exportación">
        <details><summary>Supuestos visibles</summary><ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></details>
        <details><summary>Limitaciones públicas</summary><ul>{result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
        <div className="osl-export"><p><strong>{notice}</strong><span>Misma entrada y semilla producen el mismo resultado.</span></p><button type="button" onClick={() => { downloadJson(result); setNotice("Resultado sintético exportado como JSON."); playSound("ui.primaryAction"); }}>Exportar JSON</button><a href="/lab/methodology">Metodología y límites</a></div>
      </section>
    </main>
  );
}
