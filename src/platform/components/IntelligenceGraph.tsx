"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { requestInterfaceSound } from "@/src/components/ui/SoundController";
import { graphFor } from "../data";
import type { GraphNode, GraphVariant } from "../types";

type Props = {
  variant?: GraphVariant;
  scope?: "public" | "private";
  compact?: boolean;
  title?: string;
};

export function IntelligenceGraph({ variant = "overview", scope, compact = false, title = "Living intelligence architecture" }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const [rotation, setRotation] = useState({ x: 42, y: -5 });
  const [zoom, setZoom] = useState(88);
  const [selectedId, setSelectedId] = useState("mission");
  const [isolatedCluster, setIsolatedCluster] = useState("");
  const [trace, setTrace] = useState(false);
  const resolvedScope = scope ?? (variant === "applications" ? "public" : "private");
  const { nodes, edges } = useMemo(() => graphFor(variant, resolvedScope), [resolvedScope, variant]);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === "undefined") { queueMicrotask(() => setReady(true)); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setReady(true); observer.disconnect(); } }, { rootMargin: "180px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => {
      setReducedMotion(query.matches);
      if (query.matches) setMode("2d");
    };
    applyPreference();
    query.addEventListener("change", applyPreference);
    return () => query.removeEventListener("change", applyPreference);
  }, []);

  const connectedIds = useMemo(() => {
    if (!trace) return new Set(nodes.map((node) => node.id));
    const ids = new Set([selectedId]);
    edges.forEach((edge) => { if (edge.from === selectedId) ids.add(edge.to); if (edge.to === selectedId) ids.add(edge.from); });
    return ids;
  }, [edges, nodes, selectedId, trace]);

  const isVisible = (node: GraphNode) => (!isolatedCluster || node.cluster === isolatedCluster) && connectedIds.has(node.id);
  const selectedRelations = edges.filter((edge) => edge.from === selectedId || edge.to === selectedId);
  const selectNode = (node: GraphNode) => { setSelectedId(node.id); setTrace(false); requestInterfaceSound("ui.tick"); };
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { if (mode !== "3d" || reducedMotion) return; dragRef.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => { if (!dragRef.current || mode !== "3d" || reducedMotion) return; const dx = event.clientX - dragRef.current.x; const dy = event.clientY - dragRef.current.y; dragRef.current = { x: event.clientX, y: event.clientY }; setRotation((current) => ({ x: Math.max(28, Math.min(58, current.x - dy * .18)), y: current.y + dx * .22 })); };
  const setGraphMode = (nextMode: "2d" | "3d") => { if (nextMode === "3d" && reducedMotion) return; setMode(nextMode); requestInterfaceSound("ui.toggle"); };
  const reset = () => { setRotation({ x: 42, y: -5 }); setZoom(88); setIsolatedCluster(""); setTrace(false); setSelectedId("mission"); requestInterfaceSound("ui.toggle"); };

  return <section ref={hostRef} className={`intel-graph ${compact ? "is-compact" : ""}`} aria-labelledby={`graph-title-${variant}`}>
    <header className="intel-graph-header"><div><span>INTERACTIVE SYSTEM VIEW</span><h2 id={`graph-title-${variant}`}>{title}</h2></div><div className="intel-graph-controls" aria-label="Graph controls"><button type="button" aria-pressed={mode === "2d"} onClick={() => setGraphMode("2d")}>2D</button><button type="button" aria-pressed={mode === "3d"} onClick={() => setGraphMode("3d")} disabled={reducedMotion} aria-describedby={reducedMotion ? `graph-motion-${variant}` : undefined}>3D</button><button type="button" onClick={() => setRotation((value) => ({ ...value, y: value.y - 18 }))} disabled={mode === "2d" || reducedMotion} aria-label="Rotate left">↶</button><button type="button" onClick={() => setRotation((value) => ({ ...value, y: value.y + 18 }))} disabled={mode === "2d" || reducedMotion} aria-label="Rotate right">↷</button><button type="button" onClick={reset}>Reset</button></div>{reducedMotion && <p className="sr-only" id={`graph-motion-${variant}`}>3D motion is disabled by your reduced motion preference.</p>}</header>
    <div className="intel-graph-layout">
      <div className="intel-graph-viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        {!ready ? <div className="intel-graph-fallback"><span>MISSION</span><i /><span>AGENTS</span><i /><span>MODELS</span><i /><span>HUMAN GATE</span></div> : <div className={`intel-graph-space mode-${mode}`} style={{ "--graph-rx": `${mode === "3d" ? rotation.x : 0}deg`, "--graph-ry": `${mode === "3d" ? rotation.y : 0}deg`, "--graph-scale": zoom / 100 } as CSSProperties}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={`graph-arrow-${variant}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="3" markerHeight="3" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>{edges.map((edge) => { const from = nodes.find((node) => node.id === edge.from)!; const to = nodes.find((node) => node.id === edge.to)!; const visible = isVisible(from) && isVisible(to); const active = trace && (edge.from === selectedId || edge.to === selectedId); return <line key={`${edge.from}-${edge.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd={`url(#graph-arrow-${variant})`} className={`${visible ? "is-visible" : ""} ${active ? "is-active" : ""}`} />; })}</svg>
          {nodes.map((node) => { const visible = isVisible(node); return <button type="button" key={node.id} className={`intel-node kind-${node.kind} ${selectedId === node.id ? "is-selected" : ""} ${visible ? "is-visible" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, "--node-z": `${mode === "3d" ? node.z : 0}px` } as CSSProperties} onClick={(event) => { event.stopPropagation(); selectNode(node); }} tabIndex={visible ? 0 : -1} aria-hidden={!visible} aria-pressed={selectedId === node.id} aria-label={`${node.label}. ${node.kind}. ${node.detail}`}><i aria-hidden="true" /><span>{node.label}</span><small>{node.kind.toUpperCase()}</small></button>; })}
        </div>}
        <p className="sr-only">Agents and quantitative models connect evidence to a governed mission. A human gate controls the decision record.</p>
      </div>
      <aside className="intel-graph-inspector" aria-live="polite"><span>{selected.kind.toUpperCase()} · {selected.status}</span><h3>{selected.label}</h3><p>{selected.detail}</p><dl><div><dt>CLUSTER</dt><dd>{selected.cluster}</dd></div><div><dt>CONTROL</dt><dd>{selected.kind === "gate" ? "Named authority" : "Inspectable contribution"}</dd></div></dl><ul className="intel-graph-relations" aria-label={`Direct relationships for ${selected.label}`}>{selectedRelations.map((edge) => { const outbound = edge.from === selectedId; const other = nodes.find((node) => node.id === (outbound ? edge.to : edge.from)); return <li key={`${edge.from}-${edge.to}`}><span>{outbound ? "TO" : "FROM"}</span>{edge.label} {other?.label}</li>; })}</ul><div><button type="button" onClick={() => { setTrace((value) => !value); requestInterfaceSound("ui.toggle"); }} aria-pressed={trace}>Trace connections</button><button type="button" onClick={() => { setIsolatedCluster((value) => value === selected.cluster ? "" : selected.cluster); requestInterfaceSound("ui.toggle"); }} aria-pressed={isolatedCluster === selected.cluster}>Isolate cluster</button></div></aside>
    </div>
    <label className="intel-graph-zoom">Zoom <output>{zoom}%</output><input type="range" min="70" max="118" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
    <footer><span><i className="legend-agent" /> Agent</span><span><i className="legend-model" /> Model</span><span><i className="legend-evidence" /> Evidence</span><span><i className="legend-gate" /> Human Gate</span><p>{reducedMotion ? "Reduced motion is active. " : "Drag to rotate in 3D. "}Select a node to inspect, isolate or trace it. The graph is explanatory and does not represent live system activity.</p></footer>
  </section>;
}
