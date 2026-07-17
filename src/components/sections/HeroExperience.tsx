"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { INTERFACE_SOUND_STATE_EVENT, readInterfaceSoundSettings, requestInterfaceSound, requestInterfaceSoundSettings } from "@/src/components/ui/SoundController";

const DURATION_MS = 11_200;
const phases = [
  { end: 1_700, label: "Human mandate", message: "Human defines the mission.", sound: "human.input" as const },
  { end: 4_800, label: "Agent collaboration", message: "Specialists exchange evidence, critique and perspective.", sound: "agent.pulse" as const },
  { end: 7_600, label: "Quantitative evaluation", message: "Quantitative models evaluate uncertainty.", sound: "stage.complete" as const },
  { end: 9_500, label: "Opportunity convergence", message: "One candidate emerges for human review.", sound: "opportunity.prioritized" as const },
  { end: DURATION_MS, label: "Human-in-command", message: "AI explores. Models evaluate. Humans decide.", sound: "stage.complete" as const },
] as const;

const agents = [
  { id: "mathematics", label: "Mathematics", x: 20, y: 38, z: .95, public: true, description: "Models uncertainty, sensitivity and risk." },
  { id: "finance", label: "Finance", x: 78, y: 35, z: .86, public: true, description: "Evaluates economics, capital and scalability." },
  { id: "strategy", label: "Strategy", x: 17, y: 62, z: .7, public: true, description: "Analyzes positioning, differentiation and timing." },
  { id: "marketing", label: "Marketing", x: 80, y: 61, z: .78, public: true, description: "Evaluates customer demand, adoption and channels." },
] as const;

const phaseAt = (elapsed: number) => {
  const index = phases.findIndex((phase) => elapsed < phase.end);
  return index === -1 ? phases.length - 1 : index;
};

function fitCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const mobile = rect.width < 560;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext("2d");
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width: rect.width, height: rect.height, mobile };
}

function drawScene(canvas: HTMLCanvasElement, elapsed: number, phase: number, pointer: { x: number; y: number }) {
  const { context, width, height, mobile } = fitCanvas(canvas);
  if (!context) return false;
  context.clearRect(0, 0, width, height);
  const px = pointer.x * (mobile ? 3 : 8);
  const py = pointer.y * (mobile ? 2 : 5);
  const center = { x: width * .5 + px, y: height * .54 + py };
  const human = { x: width * .5 + px * .25, y: height * .11 + py * .15 };
  const candidate = { x: width * .5 - px * .2, y: height * .78 - py * .12 };

  const glow = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, width * .6);
  glow.addColorStop(0, "rgba(37,131,232,.14)");
  glow.addColorStop(.55, "rgba(10,51,88,.06)");
  glow.addColorStop(1, "rgba(3,16,30,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.lineWidth = 1;
  context.strokeStyle = "rgba(112,169,207,.08)";
  for (let index = 0; index < 8; index += 1) {
    const y = height * (.24 + index * .085);
    context.beginPath(); context.moveTo(width * .08, y); context.lineTo(width * .92, y); context.stroke();
  }
  for (let index = -4; index <= 4; index += 1) {
    context.beginPath(); context.moveTo(center.x + index * width * .045, height * .18); context.lineTo(center.x + index * width * .1, height * .9); context.stroke();
  }

  const positioned = agents.map((agent) => ({ ...agent, px: width * agent.x / 100 + px * agent.z, py: height * agent.y / 100 + py * agent.z }));
  const connectionProgress = Math.min(1, Math.max(0, (elapsed - 1_450) / 1_000));
  if (phase >= 1) {
    positioned.forEach((agent, index) => {
      const startX = human.x;
      const startY = human.y;
      const endX = startX + (agent.px - startX) * connectionProgress;
      const endY = startY + (agent.py - startY) * connectionProgress;
      context.strokeStyle = agent.public ? "rgba(76,200,245,.29)" : "rgba(116,153,180,.16)";
      context.beginPath(); context.moveTo(startX, startY); context.lineTo(endX, endY); context.stroke();
      context.strokeStyle = "rgba(76,200,245,.18)";
      context.beginPath(); context.moveTo(agent.px, agent.py); context.lineTo(center.x, center.y); context.stroke();
      const travel = ((elapsed / 1250) + index * .17) % 1;
      const pulseX = agent.px + (center.x - agent.px) * travel;
      const pulseY = agent.py + (center.y - agent.py) * travel;
      context.fillStyle = agent.public ? "rgba(104,217,255,.9)" : "rgba(132,176,205,.5)";
      context.beginPath(); context.arc(pulseX, pulseY, agent.public ? 2.2 : 1.5, 0, Math.PI * 2); context.fill();
    });
    [[0, 1], [0, 2], [1, 3], [2, 3]].forEach(([a, b]) => {
      context.strokeStyle = "rgba(228,164,74,.14)";
      context.beginPath(); context.moveTo(positioned[a].px, positioned[a].py); context.lineTo(positioned[b].px, positioned[b].py); context.stroke();
    });
  }

  if (phase >= 2) {
    context.save();
    context.translate(center.x, center.y);
    context.strokeStyle = "rgba(76,200,245,.72)";
    context.lineWidth = 1.2;
    context.beginPath();
    for (let index = 0; index <= 34; index += 1) {
      const x = -width * .12 + index / 34 * width * .24;
      const sigma = width * .045;
      const y = -Math.exp(-(x * x) / (2 * sigma * sigma)) * height * .065;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.stroke();
    [-1, 0, 1].forEach((scenario, index) => {
      context.strokeStyle = index === 1 ? "rgba(76,200,245,.7)" : "rgba(145,177,200,.28)";
      context.beginPath(); context.moveTo(-width * .1, height * (.035 + index * .014)); context.lineTo(width * (.04 + scenario * .018), height * (.01 + index * .006)); context.lineTo(width * .11, height * (-.025 + index * .01)); context.stroke();
    });
    context.restore();

    const density = mobile ? 8 : 12;
    const keep = phase === 2 ? Math.max(6, Math.round(density * (1 - Math.min(1, (elapsed - 4_800) / 2_800) * .86))) : 5;
    for (let index = 0; index < density; index += 1) {
      const angle = index * 2.399;
      const radius = 36 + (index % 9) * (mobile ? 5 : 8);
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius * .52 + height * .14;
      context.fillStyle = index < keep ? "rgba(76,200,245,.66)" : "rgba(111,143,166,.09)";
      context.beginPath(); context.arc(x, y, index < keep ? 2 : 1.3, 0, Math.PI * 2); context.fill();
    }
    context.strokeStyle = "rgba(76,200,245,.35)";
    context.beginPath(); context.moveTo(center.x, center.y + height * .04); context.lineTo(candidate.x, candidate.y); context.stroke();
  }

  if (phase >= 3) {
    const returnProgress = phase >= 4 ? Math.min(1, Math.max(0, (elapsed - 9_500) / 1_300)) : 0;
    context.strokeStyle = "rgba(76,200,245,.62)";
    context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(candidate.x, candidate.y); context.lineTo(human.x, human.y); context.stroke();
    if (returnProgress > 0) {
      const x = candidate.x + (human.x - candidate.x) * returnProgress;
      const y = candidate.y + (human.y - candidate.y) * returnProgress;
      context.fillStyle = "rgba(122,220,255,.95)";
      context.beginPath(); context.arc(x, y, 3.2, 0, Math.PI * 2); context.fill();
    }
  }
  return true;
}

export function HeroExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);
  const lastTimeRef = useRef(0);
  const phaseRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const inViewRef = useRef(true);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [complete, setComplete] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<(typeof agents)[number] | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<(typeof agents)[number] | null>(null);
  const [sound, setSound] = useState({ enabled: false, volume: 25 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const unavailable = !canvas.getContext("2d");
    const compact = window.innerWidth < 360;
    const fallback = reduced || unavailable || compact;
    if (fallback) {
      elapsedRef.current = DURATION_MS;
      phaseRef.current = phases.length - 1;
      queueMicrotask(() => { setStaticMode(true); setPhase(phases.length - 1); setComplete(true); setPlaying(false); });
      drawScene(canvas, DURATION_MS, phases.length - 1, pointerRef.current);
    }
    const observer = new IntersectionObserver(([entry]) => { inViewRef.current = entry.isIntersecting; lastTimeRef.current = performance.now(); }, { threshold: .05 });
    observer.observe(shell);
    const initialSound = readInterfaceSoundSettings();
    queueMicrotask(() => setSound(initialSound));
    const onSoundState = (event: Event) => setSound((event as CustomEvent<{ enabled: boolean; volume: number }>).detail);
    window.addEventListener(INTERFACE_SOUND_STATE_EVENT, onSoundState);
    return () => { observer.disconnect(); window.removeEventListener(INTERFACE_SOUND_STATE_EVENT, onSoundState); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!playing || staticMode) { drawScene(canvas, elapsedRef.current, phaseRef.current, pointerRef.current); return; }
    let frame = 0;
    lastTimeRef.current = performance.now();
    const animate = (now: number) => {
      const delta = Math.min(50, Math.max(0, now - lastTimeRef.current));
      lastTimeRef.current = now;
      if (inViewRef.current && document.visibilityState === "visible") elapsedRef.current = Math.min(DURATION_MS, elapsedRef.current + delta);
      const nextPhase = phaseAt(elapsedRef.current);
      if (nextPhase !== phaseRef.current) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
        requestInterfaceSound(phases[nextPhase].sound);
      }
      drawScene(canvas, elapsedRef.current, nextPhase, pointerRef.current);
      if (elapsedRef.current >= DURATION_MS) { setComplete(true); setPlaying(false); return; }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, staticMode]);

  useEffect(() => {
    const onResize = () => { if (canvasRef.current) drawScene(canvasRef.current, elapsedRef.current, phaseRef.current, pointerRef.current); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const replay = () => {
    elapsedRef.current = 0;
    phaseRef.current = 0;
    setPhase(0);
    setComplete(false);
    setSelectedAgent(null);
    setPlaying(!staticMode);
    requestInterfaceSound("human.input");
  };
  const skip = () => {
    elapsedRef.current = DURATION_MS;
    phaseRef.current = phases.length - 1;
    setPhase(phases.length - 1);
    setComplete(true);
    setPlaying(false);
    if (canvasRef.current) drawScene(canvasRef.current, DURATION_MS, phases.length - 1, pointerRef.current);
  };
  const selectAgent = (agent: (typeof agents)[number]) => {
    setSelectedAgent((current) => current?.id === agent.id ? null : agent);
    setHoveredAgent(agent);
    setPlaying(false);
    requestInterfaceSound("agent.pulse");
  };
  const updatePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (staticMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = { x: (event.clientX - rect.left) / rect.width * 2 - 1, y: (event.clientY - rect.top) / rect.height * 2 - 1 };
    event.currentTarget.style.setProperty("--hero-tilt-x", `${pointerRef.current.x * 5}px`);
    event.currentTarget.style.setProperty("--hero-tilt-y", `${pointerRef.current.y * 3}px`);
  };
  const resetPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerRef.current = { x: 0, y: 0 };
    event.currentTarget.style.setProperty("--hero-tilt-x", "0px");
    event.currentTarget.style.setProperty("--hero-tilt-y", "0px");
    if (!selectedAgent) setHoveredAgent(null);
  };
  const detailAgent = selectedAgent ?? hoveredAgent;

  return (
    <div ref={shellRef} className={`hero-experience ${staticMode ? "is-static" : ""} phase-${phase} ${complete ? "is-complete" : ""}`} onPointerMove={updatePointer} onPointerLeave={resetPointer}>
      <canvas ref={canvasRef} className="hero-experience-canvas" aria-hidden="true" />
      <div className="experience-static-flow" aria-hidden="true"><span>Human Thesis</span><i>→</i><span>4 Public Agents</span><i>→</i><span>12+2 Models</span><i>→</i><span>Comparable Ranking</span><i>→</i><span>Human Review</span></div>
      <div className="experience-status"><span>{String(phase + 1).padStart(2, "0")} / 05</span><strong aria-live="polite">{phases[phase].label}</strong><small>{phases[phase].message}</small></div>
      <div className="experience-scene">
        <div className="experience-human"><i /><span>{phase >= 4 ? "Human Review" : "Human Thesis"}</span><small>{phase >= 4 ? "Human-in-command" : "market · problem · risk · horizon"}</small></div>
        <div className="experience-agent-layer" aria-label="Four interactive public specialist agents">
          {agents.map((agent) => <button type="button" key={agent.id} className={`experience-agent ${agent.public ? "is-public" : "is-secondary"} ${detailAgent?.id === agent.id ? "is-selected" : ""}`} style={{ left: `${agent.x}%`, top: `${agent.y}%`, "--agent-scale": String(.82 + agent.z * .2) } as CSSProperties} aria-pressed={selectedAgent?.id === agent.id} aria-label={`${agent.label}. ${agent.description}`} onPointerEnter={() => setHoveredAgent(agent)} onPointerLeave={() => { if (!selectedAgent) setHoveredAgent(null); }} onFocus={() => setHoveredAgent(agent)} onBlur={() => { if (!selectedAgent) setHoveredAgent(null); }} onClick={() => selectAgent(agent)}><i /><span>{agent.label}</span></button>)}
        </div>
        <div className="experience-quant" aria-hidden={phase !== 2}><span>12 CORE MODELS + 2 CONTEXT LENSES</span><strong>Monte Carlo · Tornado · Defensibility · Macroeconomics</strong><small>Risk · Evidence · Uncertainty</small></div>
        <div className="experience-funnel" aria-describedby="hero-funnel-note" aria-hidden={phase !== 2}><span>1 input</span><i>→</i><span>6–12 opportunities</span><i>→</i><span>4 agents</span><i>→</i><span>14 visible models</span><i>→</i><strong>human review</strong></div>
        <small className="experience-funnel-note" id="hero-funnel-note" aria-hidden={phase !== 2}>Deterministic public flow · same validated input, version, weights and seed produce the same run.</small>
        <article className="experience-candidate" aria-hidden={phase < 3}>
          <header><span>TOP-RANKED SYNTHETIC OPPORTUNITY</span><b>Priority for Human Review</b></header>
          <h3>Traceable Finance Operations</h3>
          <dl><div><dt>Problem</dt><dd>Fragmented financial workflows</dd></div><div><dt>Market</dt><dd>B2B financial operations</dd></div><div><dt>Model</dt><dd>AI-enabled infrastructure</dd></div></dl>
          <footer><span>Score range <b>68–76</b></span><span>Evidence <b>61</b></span><span>Risk <b>42</b></span><span>Confidence <b>Conditional</b></span></footer>
        </article>
      </div>
      {detailAgent && <aside className="experience-agent-detail" role="status"><span>PUBLIC LAB AGENT</span><strong>{detailAgent.label}</strong><p>{detailAgent.description}</p>{selectedAgent && <button type="button" onClick={() => { setSelectedAgent(null); setHoveredAgent(null); if (!complete) setPlaying(true); }}>Close & resume</button>}</aside>}
      <div className="experience-controls" aria-label="Animation controls">
        {!complete && <button type="button" onClick={skip}>Skip Animation</button>}
        {!staticMode && <button type="button" onClick={replay}>Replay</button>}
        {!complete && !staticMode && <button type="button" aria-pressed={!playing} onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Resume"}</button>}
        <button type="button" data-sound-control className={sound.enabled ? "is-on" : ""} aria-pressed={sound.enabled} onClick={() => requestInterfaceSoundSettings({ enabled: !sound.enabled, volume: sound.volume })}>{sound.enabled ? "Sound enabled" : "Enable sound"}</button>
        <label data-sound-control><span>Volume {sound.volume}%</span><input type="range" min="0" max="100" step="25" value={sound.volume} onChange={(event) => requestInterfaceSoundSettings({ enabled: sound.enabled, volume: Number(event.target.value) })} /></label>
      </div>
      <p className="sr-only">A human defines a thesis. Four public agents analyze six to twelve synthetic opportunities, twelve core quantitative models and two context lenses evaluate uncertainty, and a comparable ranking is returned for human review.</p>
    </div>
  );
}
