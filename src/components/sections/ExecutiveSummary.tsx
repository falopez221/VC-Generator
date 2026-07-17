import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";

const CAPABILITIES = [
  ["01", "Exploración acotada", "Genera entre 6 y 12 oportunidades sintéticas por ejecución reproducible."],
  ["02", "Cuatro perspectivas", "Mathematics, Finance, Strategy y Marketing entregan evaluaciones estructuradas."],
  ["03", "Decisión asistida", "Doce modelos exponen robustez, economía, riesgo y la siguiente evidencia útil."],
] as const;

export function ExecutiveSummary() {
  return (
    <section className="section executive-summary" id="resumen">
      <div className="container">
        <SectionHeading
          eyebrow="Resumen ejecutivo"
          title="Un sistema para ampliar el universo de oportunidades."
          description="Venture Governance System coordina inteligencia especializada para detectar, explicar y priorizar oportunidades que difícilmente surgirían de un análisis tradicional."
        />
        <ProgressiveDisclosure
          what="Un Lab público reproducible para explorar y priorizar oportunidades sintéticas."
          does="Convierte un mandato humano y señales dispersas en hipótesis comparables, riesgos explícitos y próximos experimentos."
          matters="Amplía la cantidad de oportunidades examinadas sin transferir la responsabilidad de inversión a la IA."
          how={["Coordina perspectivas especializadas.", "Contrasta evidencia, economía, riesgo y estrategia.", "Devuelve candidatos priorizados para revisión humana."]}
          technical={["Cuatro agentes públicos con un contrato común.", "Doce modelos determinísticos y probabilísticos demostrativos.", "Gates humanos proporcionales al riesgo, evidencia e incertidumbre."]}
          limitations={["No garantiza resultados ni predice unicornios.", "No reemplaza fundadores, validación comercial o ejecución.", "La demostración pública usa datos y reglas sintéticas."]}
        />
        <div className="executive-layout">
          <div className="executive-copy">
            <p>Venture Governance System recibe una tesis humana, valida sus límites y genera entre 6 y 12 oportunidades sintéticas. Mathematics, Finance, Strategy y Marketing evalúan cada alternativa mediante contratos estructurados que separan hallazgos, supuestos, riesgos, evidencia faltante, incertidumbre y crítica.</p>
            <p>Doce modelos públicos permiten inspeccionar MCDA, Monte Carlo, sensibilidad, actualización bayesiana, escenarios, riesgo, Pareto, mínimos cuadrados, tornado, break-even, robustez del ranking y prioridad de validación. El sistema compara y sugiere próximos experimentos; no construye una startup completa, no financia, no invierte y no reemplaza la validación comercial ni el juicio humano.</p>
          </div>
          <aside className="executive-boundary">
            <span>ALCANCE DEL SISTEMA</span>
            <strong>Amplía la exploración.<br />Preserva la decisión humana.</strong>
            <p>Su valor está en hacer comparables las alternativas y localizar qué evidencia puede reducir más incertidumbre, sin confundir una simulación con validación real.</p>
          </aside>
        </div>
        <div className="executive-capabilities">
          {CAPABILITIES.map(([index, title, copy]) => <article key={index}><span>{index}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>
  );
}
