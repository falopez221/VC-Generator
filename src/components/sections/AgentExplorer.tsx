"use client";

import { useMemo, useState } from "react";
import { AGENTS, AGENT_GROUPS } from "@/src/content/agents";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { AgentDiagram } from "@/src/components/sections/AgentDiagram";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";

export function AgentExplorer() {
  const [selectedId, setSelectedId] = useState("mathematics");
  const selected = useMemo(() => AGENTS.find((agent) => agent.id === selectedId) ?? AGENTS[0], [selectedId]);

  return (
    <section className="section section--ink" id="agentes">
      <div className="container">
        <SectionHeading
          eyebrow="05 · Agentes públicos"
          title="Cuatro especialistas. Contratos y límites explícitos."
          description="Seleccioná un agente para inspeccionar su propósito, sus entregas, las dependencias que activa y los controles que limitan su actuación."
        />
        <ProgressiveDisclosure
          what="La superficie pública completa: Mathematics, Finance, Strategy y Marketing."
          does="Evalúa cada oportunidad desde cuatro lentes comparables y devuelve resultados estructurados."
          matters="Hace visible quién aporta cada conclusión, qué necesita y hasta dónde puede actuar."
          how={["Seleccioná un nodo para inspeccionarlo.", "Las conexiones resaltadas muestran dependencias directas.", "La ficha explica rol, entradas, salidas y límites."]}
          technical={["Los cuatro agentes comparten un contrato de salida.", "Los artefactos pasan con evidencia, supuestos, incertidumbre y versión.", "Orquestación, ranking y persistencia son módulos deterministas, no agentes adicionales."]}
          limitations={["La red privada y sus prompts permanecen fuera del repositorio.", "Los resultados públicos usan datos sintéticos y reglas demostrativas.", "Ningún agente tiene autoridad de inversión o ejecución."]}
        />
        <div className="agent-guide" aria-label="Cómo usar el explorador de agentes">
          <div><span>01</span><strong>Elegí un agente</strong><p>Hacé clic en cualquier nodo del mapa.</p></div>
          <div><span>02</span><strong>Leé sus relaciones</strong><p>El borde azul señala dependencias directas.</p></div>
          <div><span>03</span><strong>Inspeccioná la ficha</strong><p>Entradas, entregas, métricas y límite de actuación.</p></div>
        </div>
        <div className="agent-workbench">
          <div className="agent-map" role="list" aria-label="Agentes agrupados por función">
            <p className="map-stage-label">MAPA INTERACTIVO · 4 AGENTES PÚBLICOS</p>
            <div className="agent-groups">
              {AGENT_GROUPS.map((group) => (
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
            <div className="map-legend"><span><i className="selected-key" /> Nodo seleccionado</span><span><i className="connected-key" /> Conexión directa con el seleccionado</span></div>
          </div>
          <aside className="agent-detail" aria-live="polite">
            <p className="detail-guide">FICHA DEL NODO SELECCIONADO</p>
            <div className="agent-detail-top"><span>{selected.group}</span><span>{selected.phase}</span></div>
            <p className="detail-index">AGENT / {String(AGENTS.indexOf(selected) + 1).padStart(2, "0")}</p>
            <h3>{selected.name}</h3>
            <div className="agent-role-summary"><span>ROLE / ROL</span><p className="agent-purpose">{selected.purpose}</p></div>
            <dl className="agent-facts">
              <div><dt>INPUTS / ENTRADAS</dt><dd>{selected.inputs.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>OUTPUTS / ENTREGAS</dt><dd>{selected.outputs.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Criterios de calidad</dt><dd>{selected.quality.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Métricas</dt><dd>{selected.metrics.map((item) => <span key={item}>{item}</span>)}</dd></div>
            </dl>
            <div className="agent-responsibilities">
              <p>Responsabilidades</p>
              <ul>{selected.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="agent-limit"><span>LIMITATIONS / LÍMITES</span><p>{selected.limits}</p></div>
          </aside>
        </div>
        <AgentDiagram />
      </div>
    </section>
  );
}
