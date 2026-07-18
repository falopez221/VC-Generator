"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

type FieldMode = "intro" | "lab" | "result";
type FieldState = "idle" | "running" | "paused" | "completed";
type Signal = { group: number; originX: number; originY: number; angle: number; radius: number; speed: number; size: number; phase: number };

const SPECIALISTS = ["Mathematics", "Finance", "Strategy", "Marketing"] as const;
const HUBS = [{ x: .27, y: .34 }, { x: .71, y: .33 }, { x: .31, y: .69 }, { x: .73, y: .67 }] as const;

const hash = (value: number) => {
  const raw = Math.sin(value * 91.733 + 13.17) * 43758.5453;
  return raw - Math.floor(raw);
};
const ease = (value: number) => { const safe = Math.max(0, Math.min(1, value)); return safe * safe * (3 - 2 * safe); };

function makeSignals(count: number): Signal[] {
  return Array.from({ length: count }, (_, index) => ({
    group: index % 4,
    originX: .04 + hash(index + 1) * .92,
    originY: .05 + hash(index + 101) * .9,
    angle: hash(index + 211) * Math.PI * 2,
    radius: .035 + hash(index + 307) * .15,
    speed: .12 + hash(index + 401) * .2,
    size: .55 + hash(index + 509) * 1.35,
    phase: hash(index + 601) * Math.PI * 2,
  }));
}

function phaseFor(elapsed: number, mode: FieldMode, state: FieldState) {
  if (mode === "result" || state === "completed") return 4;
  if (mode === "lab") return state === "running" ? 3 : state === "paused" ? 2 : 1;
  if (elapsed < 10) return 0;
  if (elapsed < 25) return 1;
  if (elapsed < 45) return 2;
  if (elapsed < 70) return 3;
  return 4;
}

export function CinematicField({ mode = "intro", state = "idle", stage = 0, opportunityCount = 8, active = true, className = "" }: { mode?: FieldMode; state?: FieldState; stage?: number; opportunityCount?: number; active?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signals = useMemo(() => makeSignals(88), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    let last = start;
    let elapsed = mode === "result" ? 75 : 0;
    let pointer = { x: .5, y: .5 };
    let visible = true;
    const positions = signals.map(() => ({ x: 0, y: 0 }));

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, rect.width < 640 ? 1 : 1.35);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width: rect.width, height: rect.height };
    };

    const draw = (now: number) => {
      const delta = Math.min(50, Math.max(0, now - last));
      last = now;
      if (active && state !== "paused" && visible && !reduced) elapsed += delta / 1000;
      const { width, height } = fit();
      const phase = phaseFor(elapsed, mode, state);
      const running = state === "running";
      const completed = state === "completed" || mode === "result";
      const time = reduced ? 42 : (now - start) / 1000;
      const mobile = width < 640;
      const shown = mobile ? 52 : signals.length;
      const attraction = mode === "intro" ? phase === 0 ? ease((elapsed - 3) / 7) * .16 : phase === 1 ? .42 : phase === 2 ? .72 : .9 : running ? .88 : completed ? .97 : .55;
      const intensity = running ? 1.35 : completed ? .72 : 1;

      context.clearRect(0, 0, width, height);
      const wash = context.createRadialGradient(width * .51, height * .49, 0, width * .51, height * .49, Math.max(width, height) * .7);
      wash.addColorStop(0, completed ? "rgba(24,121,174,.17)" : "rgba(16,82,133,.12)");
      wash.addColorStop(.48, "rgba(4,24,43,.055)");
      wash.addColorStop(1, "rgba(2,8,15,0)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < shown; index += 1) {
        const signal = signals[index];
        const hub = HUBS[signal.group];
        const orbit = signal.angle + time * signal.speed * (running ? 2.15 : 1);
        const pulse = 1 + Math.sin(time * .42 + signal.phase) * .14;
        let targetX = hub.x + Math.cos(orbit) * signal.radius * pulse;
        let targetY = hub.y + Math.sin(orbit) * signal.radius * pulse * .62;
        if (running) { targetX += Math.sin(time * .7 + signal.phase) * .014; targetY += Math.cos(time * .53 + signal.phase) * .011; }
        let x = signal.originX + (targetX - signal.originX) * attraction;
        let y = signal.originY + (targetY - signal.originY) * attraction;
        if (completed) {
          const finalist = index < Math.max(6, Math.min(12, opportunityCount));
          const converge = finalist ? .38 : .08;
          x += (.5 - x) * converge;
          y += (.52 - y) * converge;
        }
        x += (pointer.x - .5) * (signal.size / 160);
        y += (pointer.y - .5) * (signal.size / 210);
        positions[index] = { x: x * width, y: y * height };
      }

      const connectionAlpha = (phase === 0 ? .035 : phase === 1 ? .1 : phase === 2 ? .17 : .22) * intensity;
      context.lineWidth = .7;
      for (let index = 0; index < shown; index += 1) {
        const signal = signals[index];
        const point = positions[index];
        if (phase > 0 && index % 2 === 0) {
          const nextIndex = (index + 4) % shown;
          const next = positions[nextIndex];
          if (signals[nextIndex].group === signal.group) {
            context.strokeStyle = `rgba(88,178,224,${connectionAlpha})`;
            context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(next.x, next.y); context.stroke();
          }
        }
        if (phase >= 2 && index % (running ? 5 : 9) === 0) {
          const other = positions[(index + 17) % shown];
          context.strokeStyle = `rgba(164,207,231,${connectionAlpha * .48})`;
          context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(other.x, other.y); context.stroke();
        }
      }

      if (phase >= 1 || mode !== "intro") {
        HUBS.forEach((hub, index) => {
          const x = hub.x * width;
          const y = hub.y * height;
          const radius = (running && stage % 4 === index ? 18 : 11) + Math.sin(time * .9 + index) * 2;
          const glow = context.createRadialGradient(x, y, 0, x, y, radius * 3.4);
          glow.addColorStop(0, "rgba(154,226,255,.55)"); glow.addColorStop(.25, "rgba(55,174,226,.17)"); glow.addColorStop(1, "rgba(55,174,226,0)");
          context.fillStyle = glow; context.beginPath(); context.arc(x, y, radius * 3.4, 0, Math.PI * 2); context.fill();
          context.fillStyle = "rgba(208,241,255,.9)"; context.beginPath(); context.arc(x, y, running && stage % 4 === index ? 2.8 : 1.8, 0, Math.PI * 2); context.fill();
          if (!mobile) { context.fillStyle = "rgba(174,204,221,.58)"; context.font = "500 9px ui-monospace, SFMono-Regular, monospace"; context.fillText(SPECIALISTS[index].toUpperCase(), x + 10, y - 9); }
        });
      }

      if (phase >= 2 && !mobile) {
        ["P(θ | e)", "σ² → min", "arg max U(x)", "N = 1,200", "PARETO"].forEach((label, index) => {
          const alpha = .11 + Math.sin(time * .22 + index * 1.4) * .045;
          context.fillStyle = `rgba(152,204,232,${alpha})`; context.font = "500 10px ui-monospace, SFMono-Regular, monospace";
          context.fillText(label, width * (.12 + index * .18), height * (.16 + (index % 2) * .68));
        });
      }

      for (let index = 0; index < shown; index += 1) {
        const signal = signals[index];
        const point = positions[index];
        const activeSignal = running && stage % 4 === signal.group;
        const finalist = completed && index < Math.max(6, Math.min(12, opportunityCount));
        const alpha = finalist ? .9 : activeSignal ? .78 : phase === 0 ? .25 : .42;
        context.fillStyle = finalist ? `rgba(194,238,255,${alpha})` : `rgba(91,190,235,${alpha})`;
        context.beginPath(); context.arc(point.x, point.y, signal.size * (activeSignal ? 1.35 : 1), 0, Math.PI * 2); context.fill();
      }
      if (!reduced && active) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: (event.clientX - rect.left) / Math.max(1, rect.width), y: (event.clientY - rect.top) / Math.max(1, rect.height) };
    };
    const onVisibility = () => { visible = document.visibilityState === "visible"; last = performance.now(); };
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    frame = window.requestAnimationFrame(draw);
    if (reduced || !active) draw(performance.now());
    return () => { window.cancelAnimationFrame(frame); canvas.removeEventListener("pointermove", onPointerMove); document.removeEventListener("visibilitychange", onVisibility); };
  }, [active, mode, opportunityCount, signals, stage, state]);

  return <div className={`cinematic-field cinematic-field--${mode} cinematic-field--${state} ${className}`} style={{ "--field-stage": stage } as CSSProperties}><canvas ref={canvasRef} aria-hidden="true" /><p className="sr-only">A deterministic visualization of information signals organizing around four public specialist agents: Mathematics, Finance, Strategy and Marketing. They are a limited Lab sample of a private registry containing 1,970 profiles across 51 domains. The animation is illustrative and does not expose private reasoning.</p></div>;
}
