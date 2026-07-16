import { SectionHeading } from "@/src/components/ui/SectionHeading";

const CAPABILITIES = [
  ["01", "Exploración permanente", "Investiga tendencias, problemas, tecnologías y cruces entre industrias."],
  ["02", "Priorización cuantitativa", "Clasifica hipótesis con modelos, Monte Carlo, sensibilidad y criterios probabilísticos."],
  ["03", "Validación inicial", "Puede avanzar hasta un MVP para reducir incertidumbre y aportar evidencia."],
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
        <div className="executive-layout">
          <div className="executive-copy">
            <p>Venture Governance System es un orquestador de agentes de inteligencia artificial especializados en economía, matemática aplicada, estrategia, negocios, teoría de juegos, criptografía, tecnología, blockchain y desarrollo de empresas. Trabajan de forma coordinada con modelos de lenguaje que investigan continuamente nuevas tendencias, problemas, tecnologías y combinaciones entre industrias. El sistema identifica posibles ideas de startups y analiza por qué podrían funcionar, cómo construirlas, qué modelo de negocio utilizar, cuáles son sus riesgos y qué pasos permitirían convertirlas en empresas reales.</p>
            <p>Como puede generar miles de hipótesis, utiliza modelos matemáticos predefinidos, simulaciones de Monte Carlo, análisis de sensibilidad y criterios probabilísticos para clasificarlas como débiles, prometedoras, muy prometedoras o excepcionales. Automatiza y fortalece la exploración, generación, filtrado y priorización inicial en Venture Capital, sin reemplazar a fundadores, equipos, capital, validación comercial ni gestión operativa. Cuando una oportunidad lo requiere, los agentes pueden construir un MVP inicial para aportar evidencia antes de una inversión. La misma infraestructura sirve para investigación estratégica, innovación corporativa y exploración de nuevos mercados.</p>
          </div>
          <aside className="executive-boundary">
            <span>ALCANCE DEL SISTEMA</span>
            <strong>Amplía la exploración.<br />Preserva la decisión humana.</strong>
            <p>Su valor está en aumentar la probabilidad de detectar ideas con potencial extraordinario —incluidos posibles futuros unicornios— sin confundir análisis inicial con ejecución empresarial completa.</p>
          </aside>
        </div>
        <div className="executive-capabilities">
          {CAPABILITIES.map(([index, title, copy]) => <article key={index}><span>{index}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>
  );
}
