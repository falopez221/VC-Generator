import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ROADMAP } from "@/src/content/roadmap";
import { RISKS } from "@/src/content/risks";

export function RoadmapRisks() {
  return (
    <>
      <section className="section section--light" id="roadmap">
        <div className="container">
          <SectionHeading
            eyebrow="11 · Roadmap"
            title="Validar capacidad antes de construir plataforma."
            description="La secuencia reduce riesgo técnico, operativo e institucional. Cada fase agrega controles y alcance solo después de aprender del flujo anterior."
          />
          <div className="roadmap">
            {ROADMAP.map((item, index) => (
              <article key={item.stage}>
                <div className="roadmap-marker"><span>{index + 1}</span><i /></div>
                <small className={`status status--${item.status.toLowerCase()}`}>{item.status}</small>
                <h3>{item.stage}</h3><p>{item.capability}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--ink" id="riesgos">
        <div className="container">
          <SectionHeading
            eyebrow="12 · Riesgos y limitaciones"
            title="La credibilidad empieza donde termina la automatización."
            description="Un sistema serio documenta sus límites, diseña controles proporcionales y facilita la intervención cuando la evidencia o el modelo no alcanzan."
          />
          <div className="risk-grid">
            {RISKS.map((item, index) => (
              <article key={item.risk}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.risk}</h3><p>{item.control}</p></div></article>
            ))}
          </div>
          <div className="risk-manifesto">
            <span>NON-NEGOTIABLE</span>
            <p>Sin evidencia suficiente, el sistema debe poder decir <strong>“no sé”</strong>, explicar por qué y proponer qué aprender a continuación.</p>
          </div>
        </div>
      </section>
    </>
  );
}
