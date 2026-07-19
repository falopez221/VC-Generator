"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  pauseOrbitalLaunchSequence,
  playOrbitalLaunchSequence,
  stopOrbitalLaunchSequence,
} from "../audio.ts";
import {
  createOrbitalScenario,
  ORBITAL_SCENARIO_CATALOG,
  runOrbitalSimulation,
  type FlightSample,
  type OrbitalScenarioId,
  type OrbitalSimulationResult,
} from "../orbital-simulation/index.ts";

const REAL_DURATION_SECONDS = 20;
const MODEL_DURATION_SECONDS = 600;
const COUNTDOWN_END_SECONDS = 12.3;
const STORAGE_KEY = "vgs-public-orbital-lab-v1";

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

const CINEMATIC_SHOTS = [
  { src: "/orbital-mvp/01-pad.png", start: 0, end: 12.3, label: "Cohete ficticio preparado en plataforma" },
  { src: "/orbital-mvp/02-liftoff.png", start: 12.3, end: 15.3, label: "Cohete ficticio durante el ascenso" },
  { src: "/orbital-mvp/03-separation.png", start: 15.3, end: 18, label: "Separación sintética de etapas" },
  { src: "/orbital-mvp/04-orbit.png", start: 18, end: 20.001, label: "Nave ficticia desplegada en órbita" },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function modelTimeFromRealTime(realTime: number) {
  const flightProgress = clamp(
    (realTime - COUNTDOWN_END_SECONDS) / (REAL_DURATION_SECONDS - COUNTDOWN_END_SECONDS),
    0,
    1,
  );
  return flightProgress * MODEL_DURATION_SECONDS;
}

function realTimeFromModelTime(modelTime: number) {
  const flightProgress = clamp(modelTime / MODEL_DURATION_SECONDS, 0, 1);
  return COUNTDOWN_END_SECONDS + flightProgress * (REAL_DURATION_SECONDS - COUNTDOWN_END_SECONDS);
}

function sampleAt(result: OrbitalSimulationResult, modelTime: number) {
  const step = result.input.timeStepSeconds;
  const index = clamp(Math.floor(modelTime / step), 0, result.samples.length - 1);
  return result.samples[index];
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
  const [realTime, setRealTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("Simulación preparada.");
  const realTimeRef = useRef(0);
  const playbackOriginRef = useRef(0);
  const lastReducedUpdateRef = useRef(0);
  const preferencesLoadedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  const scenario = useMemo(() => createOrbitalScenario(scenarioId, seed), [scenarioId, seed]);
  const result = useMemo(() => runOrbitalSimulation(scenario.input), [scenario]);
  const modelTime = modelTimeFromRealTime(realTime);
  const current = sampleAt(result, modelTime);
  const visibleEvents = realTime < COUNTDOWN_END_SECONDS
    ? []
    : result.events.filter((event) => event.timeSeconds <= modelTime).slice(-5).reverse();
  const completedParts = new Set(
    result.events.filter((event) => event.timeSeconds <= modelTime).map((event) => event.visualPart),
  );

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as {
        scenarioId?: OrbitalScenarioId;
        seed?: number;
      } | null;
      queueMicrotask(() => {
        if (stored?.scenarioId && ORBITAL_SCENARIO_CATALOG.some((item) => item.id === stored.scenarioId)) {
          setScenarioId(stored.scenarioId);
        }
        if (Number.isFinite(stored?.seed)) setSeed(clamp(Math.round(stored?.seed ?? 2026), 1, 999999));
        preferencesLoadedRef.current = true;
      });
    } catch {
      preferencesLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (preferencesLoadedRef.current) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenarioId, seed }));
    }
  }, [scenarioId, seed]);

  useEffect(() => {
    if (!running) return;
    playbackOriginRef.current = performance.now() - realTimeRef.current * 1_000;
    let frame = 0;
    const animate = (timestamp: number) => {
      const next = clamp((timestamp - playbackOriginRef.current) / 1_000, 0, REAL_DURATION_SECONDS);
      realTimeRef.current = next;
      if (!reducedMotion || timestamp - lastReducedUpdateRef.current >= 250 || next >= REAL_DURATION_SECONDS) {
        lastReducedUpdateRef.current = timestamp;
        setRealTime(next);
      }
      if (next >= REAL_DURATION_SECONDS) {
        setRunning(false);
        pauseOrbitalLaunchSequence();
        setNotice("Demostración completada: criterio de órbita sintética alcanzado.");
        return;
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [running, reducedMotion]);

  useEffect(() => () => stopOrbitalLaunchSequence(), []);

  const toggleRunning = () => {
    if (running) {
      pauseOrbitalLaunchSequence();
      setRunning(false);
      setNotice("Simulación pausada.");
      return;
    }
    if (realTimeRef.current >= REAL_DURATION_SECONDS) {
      realTimeRef.current = 0;
      setRealTime(0);
    }
    playOrbitalLaunchSequence(realTimeRef.current);
    setRunning(true);
    setNotice("Simulación orbital sintética en curso.");
  };

  const reset = () => {
    stopOrbitalLaunchSequence();
    realTimeRef.current = 0;
    setRealTime(0);
    setRunning(false);
    setNotice("Simulación reiniciada con la misma semilla.");
  };

  const resetForNewConfiguration = () => {
    stopOrbitalLaunchSequence();
    realTimeRef.current = 0;
    setRealTime(0);
    setRunning(false);
    setNotice("Escenario recalculado con una semilla reproducible.");
  };

  const scrubTo = (nextTime: number) => {
    pauseOrbitalLaunchSequence();
    const bounded = clamp(nextTime, 0, REAL_DURATION_SECONDS);
    realTimeRef.current = bounded;
    setRealTime(bounded);
    setRunning(false);
    setNotice("Reproducción posicionada. Continuá para reanudar el audio sincronizado.");
  };

  const viewportSummary = `${PHASE_LABELS[current.phase]}. Altitud ${current.altitudeKm.toFixed(1)} kilómetros sintéticos; velocidad ${Math.round(current.speedMps)} metros por segundo demostrativos. Primera etapa ${completedParts.has("first-stage") ? "separada" : "unida"}; cofia ${completedParts.has("fairing-right") ? "separada" : "unida"}; paneles ${completedParts.has("solar-right") ? "desplegados" : "plegados"}; antena ${completedParts.has("antenna") ? "desplegada" : "plegada"}.`;

  return (
    <main id="lab-content" className="osl-shell">
      <header className="osl-masthead">
        <div><p className="osl-eyebrow">PUBLIC LAB · DINÁMICA ORBITAL FICTICIA</p><h1>Lanzamiento orbital sintético</h1><p>Observá un ascenso reproducible, la separación de sus capas y el despliegue de la nave. El modelo es educativo, acotado y no sirve para planificar una misión real.</p></div>
        <aside><strong>{result.summary.reachedOrbit ? "CRITERIO SINTÉTICO DISPONIBLE" : "REVISIÓN REQUERIDA"}</strong><p>Planeta, vehículo, masas, trayectoria y telemetría son ficticios. Ningún dato es una instrucción operacional.</p></aside>
      </header>

      <section className="osl-controls" aria-label="Controles de simulación">
        <div className="osl-playback"><button className="osl-primary" type="button" aria-pressed={running} onClick={toggleRunning}>{running ? "Pausar" : realTime === 0 ? "Iniciar cuenta regresiva" : "Continuar"}</button><button type="button" onClick={reset}>Reiniciar</button></div>
        <label><span>Escenario</span><select value={scenarioId} onChange={(event) => { setScenarioId(event.target.value as OrbitalScenarioId); resetForNewConfiguration(); }}>{ORBITAL_SCENARIO_CATALOG.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span>Semilla</span><input type="number" min="1" max="999999" value={seed} onChange={(event) => { setSeed(clamp(Math.round(Number(event.target.value) || 1), 1, 999999)); resetForNewConfiguration(); }} /></label>
        <div className="osl-clock"><span>T+</span><strong>{realTime.toFixed(1)}</strong><small>/ {REAL_DURATION_SECONDS} s</small></div>
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
          <div className="osl-canvas-wrap" role="img" aria-label={viewportSummary}>
            {CINEMATIC_SHOTS.map((shot) => {
              const active = realTime >= shot.start && realTime < shot.end;
              return <Image key={shot.src} className={`osl-cinematic-shot${active ? " is-active" : ""}`} src={shot.src} alt="" aria-hidden="true" width={1672} height={941} sizes="(max-width: 900px) 100vw, 70vw" priority={shot.start === 0} />;
            })}
            <span className="sr-only">{viewportSummary}</span>
          </div>
          <label className="osl-timeline"><span>Posición de reproducción <output>T+{realTime.toFixed(1)} s</output></span><input type="range" min="0" max={REAL_DURATION_SECONDS} step="0.1" value={realTime} onChange={(event) => scrubTo(Number(event.target.value))} /></label>
        </article>

        <aside className="osl-events" aria-labelledby="osl-events-title">
          <header><p>02 · EVENTOS</p><h2 id="osl-events-title">Secuencia visible</h2></header>
          <ol>{visibleEvents.length ? visibleEvents.map((event) => <li key={event.id}><time>T+{realTimeFromModelTime(event.timeSeconds).toFixed(1)}s</time><div><strong>{event.label}</strong><p>{event.detail}</p></div></li>) : <li><time>T+0s</time><div><strong>Preparada</strong><p>Iniciá la simulación para observar los hitos.</p></div></li>}</ol>
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
        <div className="osl-export"><p><strong>{notice}</strong><span>Misma entrada y semilla producen el mismo resultado.</span></p><button type="button" onClick={() => { downloadJson(result); setNotice("Resultado sintético exportado como JSON."); }}>Exportar JSON</button><a href="/lab/methodology">Metodología y límites</a></div>
      </section>
    </main>
  );
}
