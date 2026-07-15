import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ARCHITECTURE_LAYERS } from "@/src/content/architecture";

export function Architecture() {
  return (
    <section className="section section--paper" id="arquitectura">
      <div className="container">
        <SectionHeading
          eyebrow="04 · Arquitectura conceptual"
          title="Seis planos para razonar, observar y gobernar."
          description="Los veinte agentes son responsabilidades lógicas. El MVP los consolida en seis runtimes y sólo separa procesos cuando mejoran calidad, independencia, seguridad o costo."
        />
        <div className="architecture-layout">
          <div className="layer-stack" aria-label="Arquitectura de software por capas">
            {ARCHITECTURE_LAYERS.map((row, index) => (
              <article className="architecture-layer" key={row.layer}>
                <span className="layer-number">0{index + 1}</span>
                <h3>{row.layer}</h3>
                <div>{row.modules.map((module) => <span key={module}>{module}</span>)}</div>
              </article>
            ))}
          </div>
          <aside className="architecture-aside">
            <div className="aside-label">CROSS-LAYER CONTROLS</div>
            <div className="control-track"><span>01</span><div><strong>Memoria</strong><p>Contexto versionado, fuentes y decisiones.</p></div></div>
            <div className="control-track"><span>02</span><div><strong>Observabilidad</strong><p>Costos, latencia, errores y calidad.</p></div></div>
            <div className="control-track"><span>03</span><div><strong>Seguridad</strong><p>Permisos, aislamiento y auditoría.</p></div></div>
            <div className="control-track"><span>04</span><div><strong>Supervisión humana</strong><p>Gates, excepciones y autoridad final.</p></div></div>
          </aside>
        </div>
        <div className="architecture-principles">
          <span>6 RUNTIMES MVP</span><span>20 ROLES LÓGICOS</span><span>DAG EVENT-DRIVEN</span><span>READ-ONLY DEFAULT</span><span>HUMAN-IN-COMMAND</span>
        </div>
      </div>
    </section>
  );
}
