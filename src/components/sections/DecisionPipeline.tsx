import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { PIPELINE } from "@/src/content/pipeline";

export function DecisionPipeline() {
  return (
    <section className="section section--light" id="metodologia">
      <div className="container">
        <SectionHeading
          eyebrow="05 · Pipeline de decisión"
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
      </div>
    </section>
  );
}
