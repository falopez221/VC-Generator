import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { PIPELINE } from "@/src/content/pipeline";
import { OPERATING_FUNNEL } from "@/src/content/whitepaper";

export function DecisionPipeline() {
  return (
    <section className="section section--light" id="metodologia">
      <div className="container">
        <SectionHeading
          eyebrow="06 · Pipeline de decisión"
          title="Un flujo continuo, con gates donde importa."
          description="Cada etapa produce un artefacto verificable. Los puntos de revisión humana no son excepciones: forman parte de la arquitectura."
        />
        <div className="pipeline" role="list">
          {PIPELINE.map((step, index) => (
            <details className="pipeline-step" key={step.phase} open={index === 0}>
              <summary>
                <span className="pipeline-number">{step.phase}</span>
                <span className="pipeline-name">{step.name}</span>
                <span className="pipeline-marker">{index === 0 || index === 4 || index === 9 || index === 11 ? "HUMAN GATE" : "SYSTEM"}</span>
                <span className="pipeline-toggle" aria-hidden="true">+</span>
              </summary>
              <div className="pipeline-detail"><p>{step.detail}</p><span>Control · {step.gate}</span></div>
            </details>
          ))}
        </div>
        <div className="funnel-section">
          <div className="funnel-copy">
            <p className="eyebrow">Política de cómputo</p>
            <h3>Barato primero. Profundo sólo cuando cambia una decisión.</h3>
            <p>El embudo es ilustrativo y debe calibrarse por sector, costo y tolerancia a falsos negativos. Su función es evitar mil investigaciones profundas para mil hipótesis iniciales.</p>
          </div>
          <div className="operating-funnel" aria-label="Embudo conceptual desde mil hipótesis hasta una a tres decisiones humanas">
            {OPERATING_FUNNEL.map((step, index) => (
              <div key={step.label} style={{ width: `${100 - index * 9}%` }}><strong>{step.value}</strong><span>{step.label}</span></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
