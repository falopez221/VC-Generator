import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ROADMAP } from "@/src/content/roadmap";
import { RISKS } from "@/src/content/risks";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";

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
          <ProgressiveDisclosure
            what="Una secuencia de validación que prioriza aprendizaje antes que expansión."
            does="Divide la construcción en fases con capacidad, controles y evidencia incremental."
            matters="Evita invertir en infraestructura antes de comprobar que el workflow mejora una decisión real."
            how={["Cada fase prueba una hipótesis operativa.", "Los criterios de salida habilitan la fase siguiente.", "El alcance aumenta después de medir calidad, tiempo y aprendizaje."]}
            technical={["Despliegue incremental y observable.", "Controles añadidos según autonomía y materialidad.", "Métricas comparables entre versiones."]}
            limitations={["El roadmap es orientativo, no un compromiso de fechas.", "Dependencias regulatorias o de datos pueden cambiar la secuencia.", "Escalar antes de calibrar degrada confiabilidad."]}
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
          <ProgressiveDisclosure
            what="El registro de fallas plausibles, controles y fronteras del sistema."
            does="Hace visibles riesgos de datos, modelos, automatización, seguridad y adopción."
            matters="La confianza enterprise depende de poder detener, explicar y auditar el sistema."
            how={["Cada riesgo se vincula con un control.", "La supervisión aumenta con materialidad.", "El sistema debe declarar desconocimiento cuando falta evidencia."]}
            technical={["Observabilidad, permisos, aislamiento y provenance.", "Umbrales de excepción y gates humanos.", "Auditoría de decisiones y versiones."]}
            limitations={["Los controles reducen riesgo, no lo eliminan.", "Riesgos emergentes requieren revisión continua.", "Una explicación legible no garantiza que el modelo sea correcto."]}
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
