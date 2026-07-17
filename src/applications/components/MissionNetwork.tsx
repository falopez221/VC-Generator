"use client";

import { useEffect, useState } from "react";

const missions = [
  { nodes: ["Energy", "Infrastructure", "Economics", "Climate"], result: "Energy Transition Portfolio" },
  { nodes: ["Defense", "Logistics", "Game Theory", "Geopolitics"], result: "Strategic Resilience Mission" },
  { nodes: ["Biotechnology", "Agriculture", "Climate", "Finance"], result: "Climate-Resilient Bioeconomy" },
] as const;

export function MissionNetwork() {
  const [mission, setMission] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setMission((value) => (value + 1) % missions.length), 3600);
    return () => window.clearInterval(timer);
  }, []);
  const current = missions[mission];
  return (
    <div className="applications-network" aria-label={`Mission network forming ${current.result}`}>
      <div className="applications-network-grid" aria-hidden="true" />
      <button type="button" className="applications-orchestrator" onClick={() => setSelected("ORCHESTRATOR")} aria-pressed={selected === "ORCHESTRATOR"}><i /><strong>ORCHESTRATOR</strong><span>governed routing</span></button>
      {current.nodes.map((node, index) => <button type="button" key={node} className={`applications-network-node node-${index + 1}`} onClick={() => setSelected(node)} aria-pressed={selected === node}><i /><span>{node}</span></button>)}
      <div className="applications-network-lines" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="applications-network-result"><span>MISSION / 0{mission + 1}</span><strong>{current.result}</strong><small>Evidence · Models · Human Gate</small></div>
      <div className="applications-network-switcher" aria-label="Example mission"><button type="button" onClick={() => setMission((mission + missions.length - 1) % missions.length)}>Previous</button><span>{mission + 1} / {missions.length}</span><button type="button" onClick={() => setMission((mission + 1) % missions.length)}>Next</button></div>
      {selected && <p className="applications-network-detail" aria-live="polite"><strong>{selected}</strong> contributes a bounded perspective to the active mission.</p>}
    </div>
  );
}

