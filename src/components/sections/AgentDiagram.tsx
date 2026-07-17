"use client";

import { useMemo, useState } from "react";
import { AGENTS, AGENT_GROUPS } from "@/src/content/agents";

export function AgentDiagram() {
  const [selectedId, setSelectedId] = useState("mathematics");
  const selected = useMemo(() => AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0], [selectedId]);
  const groups = AGENT_GROUPS;

  return (
    <div className="agent-diagram-section">
      <div className="diagram-heading">
        <div><p className="eyebrow">Vista de sistema</p><h3>Cuatro lentes dentro de un flujo reproducible.</h3></div>
        <p>Seleccioná cualquier nodo para inspeccionar su rol. El coordinador público sólo valida, distribuye y consolida contratos estructurados.</p>
      </div>
      <div className="agent-diagram" role="group" aria-label="Diagrama interactivo de agentes y flujo de coordinación">
        <div className="diagram-entry"><span>ENTRADA</span><strong>Tesis · señales · restricciones</strong></div>
        <div className="diagram-arrow diagram-arrow--down" aria-hidden="true"><i /></div>
        <div className="diagram-orchestrator" aria-label="Coordinador determinista; no es un agente"><small>MÓDULO DETERMINISTA</small><strong>Coordinador público</strong><span>Valida · distribuye · registra</span></div>
        <div className="diagram-bus" aria-hidden="true"><i /></div>
        <div className="diagram-clusters">
          {groups.map((group) => (
            <section className="diagram-cluster" key={group}>
              <h4>{group}</h4>
              <div>
                {AGENTS.filter((agent) => agent.group === group).map((agent) => (
                  <button type="button" key={agent.id} className={selectedId === agent.id ? "diagram-agent is-selected" : "diagram-agent"} aria-pressed={selectedId === agent.id} onClick={() => setSelectedId(agent.id)}><i /><span>{agent.shortName}</span></button>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="diagram-convergence" aria-hidden="true"><i /></div>
        <div className="diagram-output"><span>SALIDA</span><strong>Ranking · evidencia · escenarios</strong><small>REVISIÓN Y DECISIÓN HUMANAS</small></div>
      </div>
      <div className="diagram-inspector" aria-live="polite">
        <div><span>{selected.group} · {selected.phase}</span><h3>{selected.name}</h3></div>
        <p>{selected.purpose}</p>
        <div><small>ENTREGA PRINCIPAL</small><strong>{selected.outputs[0]}</strong></div>
      </div>
    </div>
  );
}
