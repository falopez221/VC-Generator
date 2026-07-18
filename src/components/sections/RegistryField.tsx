"use client";

import { useEffect, useMemo, useRef } from "react";

type Signal = {
  cluster: number;
  angle: number;
  radius: number;
  drift: number;
  phase: number;
  size: number;
};

const SIGNAL_COUNT = 1_920;
const CLUSTER_HUBS = [
  [.08, .18], [.22, .1], [.39, .1], [.57, .11], [.75, .12], [.91, .2],
  [.94, .72], [.79, .86], [.61, .9], [.42, .89], [.24, .86], [.07, .7],
] as const;

function hash(value: number) {
  const raw = Math.sin(value * 78.233 + 19.19) * 43_758.5453;
  return raw - Math.floor(raw);
}

function makeSignals(): Signal[] {
  return Array.from({ length: SIGNAL_COUNT }, (_, index) => ({
    cluster: index % CLUSTER_HUBS.length,
    angle: hash(index + 13) * Math.PI * 2,
    radius: .012 + Math.pow(hash(index + 101), 1.7) * .105,
    drift: .035 + hash(index + 307) * .095,
    phase: hash(index + 503) * Math.PI * 2,
    size: .32 + hash(index + 709) * .72,
  }));
}

export function RegistryField({ active = true }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signals = useMemo(() => makeSignals(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let visible = document.visibilityState === "visible";

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 1 : 1.25);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width: rect.width, height: rect.height };
    };

    const draw = (now: number) => {
      const { width, height } = fit();
      const time = reducedMotion ? 12 : now / 1_000;
      context.clearRect(0, 0, width, height);

      const halo = context.createRadialGradient(width * .48, height * .5, 0, width * .48, height * .5, width * .46);
      halo.addColorStop(0, "rgba(24, 129, 194, .10)");
      halo.addColorStop(.48, "rgba(18, 91, 151, .045)");
      halo.addColorStop(1, "rgba(4, 18, 31, 0)");
      context.fillStyle = halo;
      context.fillRect(0, 0, width, height);

      CLUSTER_HUBS.forEach(([hubX, hubY], cluster) => {
        if (cluster % 2 === 0) {
          const next = CLUSTER_HUBS[(cluster + 3) % CLUSTER_HUBS.length];
          context.strokeStyle = "rgba(76, 177, 229, .055)";
          context.lineWidth = .65;
          context.beginPath();
          context.moveTo(hubX * width, hubY * height);
          context.lineTo(next[0] * width, next[1] * height);
          context.stroke();
        }
      });

      signals.forEach((signal, index) => {
        const [hubX, hubY] = CLUSTER_HUBS[signal.cluster];
        const orbit = signal.angle + time * signal.drift;
        const x = (hubX + Math.cos(orbit) * signal.radius) * width;
        const y = (hubY + Math.sin(orbit) * signal.radius * .52) * height;
        const pulse = .48 + Math.sin(time * .8 + signal.phase) * .17;

        if (index % 48 === 0) {
          context.strokeStyle = `rgba(72, 174, 229, ${.035 + pulse * .025})`;
          context.lineWidth = .45;
          context.beginPath();
          context.moveTo(hubX * width, hubY * height);
          context.lineTo(x, y);
          context.stroke();
        }

        context.fillStyle = index % 17 === 0
          ? `rgba(152, 228, 255, ${.32 + pulse * .38})`
          : `rgba(66, 164, 219, ${.14 + pulse * .28})`;
        context.beginPath();
        context.arc(x, y, signal.size, 0, Math.PI * 2);
        context.fill();
      });

      CLUSTER_HUBS.forEach(([x, y], index) => {
        const radius = 9 + Math.sin(time * .72 + index) * 2;
        const glow = context.createRadialGradient(x * width, y * height, 0, x * width, y * height, radius * 3.2);
        glow.addColorStop(0, "rgba(138, 224, 255, .24)");
        glow.addColorStop(.3, "rgba(47, 169, 229, .09)");
        glow.addColorStop(1, "rgba(47, 169, 229, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x * width, y * height, radius * 3.2, 0, Math.PI * 2);
        context.fill();
      });

      if (!reducedMotion && active && visible) frame = window.requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible && !reducedMotion && active) frame = window.requestAnimationFrame(draw);
    };

    document.addEventListener("visibilitychange", onVisibility);
    frame = window.requestAnimationFrame(draw);
    if (reducedMotion || !active) draw(performance.now());

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, signals]);

  return (
    <div className="ps-registry-field" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
