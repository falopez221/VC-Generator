"use client";

import { useMemo, useState } from "react";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { PIPELINE } from "@/src/content/pipeline";
import { OPERATING_FUNNEL } from "@/src/content/publicResearch";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";

export function DecisionPipeline() {
  const [selectedPhase, setSelectedPhase] = useState("01");
  const selected = useMemo(() => PIPELINE.find((step) => step.phase === selectedPhase) ?? PIPELINE[0], [selectedPhase]);
  const rows = [PIPELINE.slice(0, 4), PIPELINE.slice(4, 8), PIPELINE.slice(8, 12)];

  return (
    <section className="section section--light" id="metodologia">
      <div className="container">
        <SectionHeading
          eyebrow="06 · Pipeline de decisión"
          title="Un flujo continuo, con gates donde importa."
          description="Cada etapa produce un artefacto verificable. Los puntos de revisión humana no son excepciones: forman parte de la arquitectura."
        />
        <ProgressiveDisclosure
          what="Un pipeline continuo que convierte una tesis en evidencia y candidatos revisables."
          does="Ordena doce etapas y hace explícitos los artefactos, controles y gates humanos."
          matters="Impide que una conclusión salte de una señal inicial a una recomendación sin trazabilidad."
          how={["Elegí una etapa para ver su propósito y control.", "Cada salida alimenta la siguiente etapa.", "Los gates detienen, redirigen o solicitan evidencia adicional."]}
          technical={["DAG de etapas con artefactos verificables.", "Embudo de cómputo progresivo.", "Revisiones humanas integradas al flujo, no agregadas al final."]}
          limitations={["Los volúmenes del embudo son ilustrativos.", "Una secuencia real puede iterar o volver a etapas previas.", "Los gates deben configurarse según riesgo y mandato."]}
        />
        <div className="pipeline-diagram" role="group" aria-label="Diagrama interactivo del pipeline de decisión">
          <div className="pipeline-origin"><span>INPUT</span><strong>Tesis de inversión</strong></div>
          <div className="pipeline-origin-arrow" aria-hidden="true">↓</div>
          {rows.map((row, rowIndex) => (
            <div className="pipeline-row-block" key={row[0].phase}>
              <div className="pipeline-flow-row">
                {row.map((step, index) => {
                  const globalIndex = rowIndex * 4 + index;
                  const humanGate = [0, 3, 9, 11].includes(globalIndex);
                  return (
                    <div className="pipeline-node-wrap" key={step.phase}>
                      <button type="button" className={`pipeline-node${selectedPhase === step.phase ? " is-selected" : ""}${humanGate ? " is-human" : ""}`} onClick={() => setSelectedPhase(step.phase)} aria-pressed={selectedPhase === step.phase}>
                        <span>{step.phase}</span>
                        <strong>{step.name}</strong>
                        <small>{humanGate ? "HUMAN GATE" : "SYSTEM"}</small>
                      </button>
                      {index < row.length - 1 && <span className="pipeline-arrow" aria-hidden="true">→</span>}
                    </div>
                  );
                })}
              </div>
              {rowIndex < rows.length - 1 && <div className="pipeline-row-bridge" aria-hidden="true"><i />↓</div>}
            </div>
          ))}
          <div className="pipeline-inspector" aria-live="polite">
            <div><span>ETAPA {selected.phase}</span><h3>{selected.name}</h3></div>
            <p>{selected.detail}</p>
            <strong>CONTROL · {selected.gate}</strong>
          </div>
        </div>
        <div className="funnel-section">
          <div className="funnel-copy">
            <p className="eyebrow">Flujo público reproducible</p>
            <h3>Acotado, inspeccionable y bajo revisión humana.</h3>
            <p>Una ejecución pública valida un input, genera de 6 a 12 alternativas, aplica cuatro perspectivas y catorce modelos, y conserva el conjunto completo para comparación.</p>
          </div>
          <div className="operating-funnel" aria-label="Flujo público desde un input humano hasta una revisión humana">
            {OPERATING_FUNNEL.map((step, index) => (
              <div key={step.label} style={{ width: `${100 - index * 9}%` }}><strong>{step.value}</strong><span>{step.label}</span></div>
            ))}
          </div>
          <p className="funnel-interpretation"><strong>Cómo leerlo:</strong> los valores describen etapas y contratos, no volumen de cómputo ni probabilidad de éxito. El ranking no elimina la evidencia ni autoriza una acción.</p>
        </div>
      </div>
    </section>
  );
}
