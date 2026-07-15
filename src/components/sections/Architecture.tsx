import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ARCHITECTURE_LAYERS } from "@/src/content/architecture";

export function Architecture() {
  return (
    <section className="section section--paper" id="arquitectura">
      <div className="container">
        <SectionHeading
          eyebrow="03 · Arquitectura conceptual"
          title="Capas separadas para razonar, observar y gobernar."
          description="La arquitectura reduce acoplamiento: los agentes pueden evolucionar sin mezclar experiencia de usuario, conocimiento, simulación y controles institucionales."
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
          <span>MODULAR</span><span>FAULT-TOLERANT</span><span>AUDITABLE</span><span>SCALABLE</span><span>HUMAN-GOVERNED</span>
        </div>
      </div>
    </section>
  );
}
