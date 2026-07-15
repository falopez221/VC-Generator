import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { VALUE_TRANSFORMATION } from "@/src/content/architecture";

const problems = [
  { index: "01", title: "Saturación", text: "Más señales, documentos y oportunidades de las que un equipo puede procesar con profundidad consistente." },
  { index: "02", title: "Fragmentación", text: "Fuentes, criterios y conclusiones viven en herramientas distintas y pierden su contexto." },
  { index: "03", title: "Sesgo", text: "Heurísticas útiles se vuelven invisibles, difíciles de contrastar y dependientes de memoria individual." },
  { index: "04", title: "Baja comparabilidad", text: "Oportunidades heterogéneas terminan resumidas en scores que ocultan supuestos y disenso." },
];

export function ProblemSolution() {
  return (
    <>
      <section className="section section--light" id="problema">
        <div className="container">
          <SectionHeading
            eyebrow="01 · Problema"
            title="El cuello de botella no es acceder a información. Es convertirla en criterio compartido."
            description="El análisis institucional combina investigación intensiva, juicio experto y coordinación. Cuando el volumen crece, la trazabilidad y la capacidad de contraste se degradan primero."
          />
          <div className="problem-grid">
            {problems.map((problem) => (
              <article className="problem-item" key={problem.index}>
                <span>{problem.index}</span><h3>{problem.title}</h3><p>{problem.text}</p>
              </article>
            ))}
          </div>
          <div className="problem-callout">
            <p>La oportunidad</p>
            <blockquote>Automatizar el trabajo repetible sin automatizar la responsabilidad.</blockquote>
            <span>El sistema aumenta amplitud y disciplina; el equipo conserva mandato, contexto y decisión.</span>
          </div>
        </div>
      </section>
      <section className="section section--navy" id="solucion">
        <div className="container">
          <SectionHeading
            eyebrow="02 · Solución"
            title="Un sistema operativo para explorar decisiones de venture."
            description="Venture Intelligence organiza agentes especializados alrededor de un flujo común: convertir señales e hipótesis en modelos, evidencia, escenarios y experimentos comparables."
          />
          <div className="transformation-grid">
            <div className="transform-column">
              <p className="column-label">Materia prima</p>
              {VALUE_TRANSFORMATION.map((item) => <div className="transform-input" key={item.input}>{item.input}</div>)}
            </div>
            <div className="transform-engine" aria-label="Proceso de Venture Intelligence">
              <div className="engine-top"><span>VENTURE</span><span>INTELLIGENCE</span></div>
              <div className="engine-layers">
                <span>Descubrir</span><span>Diseñar</span><span>Contrastar</span><span>Simular</span><span>Decidir</span>
              </div>
              <div className="engine-core">VI<span>orquestación multiagente</span></div>
              <p>Cada entrega conserva fuentes, supuestos, confianza y revisiones.</p>
            </div>
            <div className="transform-column transform-column--output">
              <p className="column-label">Decisiones asistidas</p>
              {VALUE_TRANSFORMATION.map((item) => <div className="transform-output" key={item.output}>{item.output}<span>→</span></div>)}
            </div>
          </div>
          <p className="concept-note"><strong>Principio de diseño:</strong> el sistema explicita qué sabe, qué infiere y qué necesita validar.</p>
        </div>
      </section>
    </>
  );
}
