"use client";

import { useMemo, useState } from "react";
import { AGENTS, AGENT_GROUPS } from "@/src/content/agents";
import { SectionHeading } from "@/src/components/ui/SectionHeading";

export function AgentExplorer() {
  const [selectedId, setSelectedId] = useState("orchestrator");
  const selected = useMemo(() => AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0], [selectedId]);

  return (
    <section className="section section--ink" id="agentes">
      <div className="container">
        <SectionHeading
          eyebrow="05 · Arquitectura multiagente"
          title="Especialistas coordinados. Límites explícitos."
          description="Seleccioná un agente para inspeccionar su propósito, sus entregas, las dependencias que activa y los controles que limitan su actuación."
        />
        <div className="agent-workbench">
          <div className="agent-map" role="list" aria-label="Agentes agrupados por función">
            <div className="map-orchestrator">
              <button
                className={selectedId === "orchestrator" ? "agent-node is-selected" : "agent-node"}
                type="button"
                onClick={() => setSelectedId("orchestrator")}
                aria-pressed={selectedId === "orchestrator"}
              >
                <i /><span>ORQ</span><small>Orquestador</small>
              </button>
            </div>
            <div className="agent-groups">
              {AGENT_GROUPS.filter((group) => group !== "Coordinación").map((group) => (
                <div className="agent-group" key={group}>
                  <p>{group}</p>
                  <div>
                    {AGENTS.filter((agent) => agent.group === group).map((agent) => {
                      const connected = selected.connectsTo.includes(agent.id) || agent.connectsTo.includes(selected.id);
                      return (
                        <button
                          type="button"
                          className={`agent-chip${selected.id === agent.id ? " is-selected" : ""}${connected ? " is-connected" : ""}`}
                          key={agent.id}
                          onClick={() => setSelectedId(agent.id)}
                          aria-pressed={selected.id === agent.id}
                        >
                          <span>{agent.shortName}</span><i aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="map-legend"><span><i className="selected-key" /> Seleccionado</span><span><i className="connected-key" /> Dependencia directa</span></div>
          </div>
          <aside className="agent-detail" aria-live="polite">
            <div className="agent-detail-top"><span>{selected.group}</span><span>{selected.phase}</span></div>
            <p className="detail-index">AGENT / {String(AGENTS.indexOf(selected) + 1).padStart(2, "0")}</p>
            <h3>{selected.name}</h3>
            <p className="agent-purpose">{selected.purpose}</p>
            <dl className="agent-facts">
              <div><dt>Entradas</dt><dd>{selected.inputs.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Entregas</dt><dd>{selected.outputs.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Criterios de calidad</dt><dd>{selected.quality.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Métricas</dt><dd>{selected.metrics.map((item) => <span key={item}>{item}</span>)}</dd></div>
            </dl>
            <div className="agent-responsibilities">
              <p>Responsabilidades</p>
              <ul>{selected.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="agent-limit"><span>Límite de actuación</span><p>{selected.limits}</p></div>
          </aside>
        </div>
      </div>
    </section>
  );
}
