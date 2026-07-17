import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";
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
          <ProgressiveDisclosure
            what="Un problema de capacidad para transformar información abundante en criterio compartido."
            does="Expone dónde el volumen, la fragmentación y los sesgos degradan la comparación entre oportunidades."
            matters="Sin trazabilidad, más investigación puede producir más ruido y una falsa sensación de precisión."
            how={["Separa señales, supuestos e inferencias.", "Identifica dependencias y desacuerdos.", "Convierte lagunas de evidencia en preguntas verificables."]}
            technical={["Provenance por fuente y fecha.", "Versionado de hipótesis y decisiones.", "Métricas de evidencia, incertidumbre y disenso."]}
            limitations={["La estructura no elimina sesgos humanos o de datos.", "La calidad de salida depende de la evidencia disponible.", "Los casos ambiguos requieren contexto institucional."]}
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
            description="Venture Governance System organiza agentes especializados alrededor de un flujo común: convertir señales e hipótesis en modelos, evidencia, escenarios y experimentos comparables."
          />
          <ProgressiveDisclosure
            what="Una capa de orquestación para el tramo exploratorio del proceso de venture."
            does="Organiza investigación, diseño, contraste, simulación y priorización en un flujo auditable."
            matters="Permite comparar más alternativas con criterios explícitos antes de consumir capital o tiempo ejecutivo."
            how={["Una persona define la tesis y las restricciones.", "Los agentes producen y critican artefactos.", "Los modelos cuantitativos estructuran rangos y el resultado vuelve a revisión humana."]}
            technical={["Flujo event-driven con dependencias visibles.", "Artefactos versionados y controles cross-layer.", "Read-only por defecto y gates de autoridad."]}
            limitations={["No automatiza la inversión ni la ejecución integral.", "Un score no reemplaza diligencia debida.", "Las integraciones y calibraciones dependen de cada institución."]}
          />
          <div className="transformation-grid">
            <div className="transform-column">
              <p className="column-label">Materia prima</p>
              {VALUE_TRANSFORMATION.map((item) => <div className="transform-input" key={item.input}>{item.input}</div>)}
            </div>
            <div className="transform-engine" aria-label="Proceso de Venture Governance System">
              <div className="engine-top"><span>VENTURE</span><span>GOVERNANCE</span></div>
              <div className="engine-layers">
                <span>Descubrir</span><span>Diseñar</span><span>Contrastar</span><span>Simular</span><span>Decidir</span>
              </div>
              <div className="engine-core">VG<span>orquestación multiagente</span></div>
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
