import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ProgressiveDisclosure } from "@/src/components/ui/ProgressiveDisclosure";
import { AUTOMATION_BOUNDARY, MARKET_SIGNALS } from "@/src/content/publicResearch";

export function EvidenceContext() {
  return (
    <section className="section section--paper" id="evidencia">
      <div className="container">
        <SectionHeading
          eyebrow="03 · Contexto y frontera de automatización"
          title="Capital abundante. Atención escasa. Resultados concentrados."
          description="La oportunidad surge de una tensión concreta: el volumen de información aumenta, mientras el juicio inversor sigue dependiendo de contexto, relaciones y accountability humana."
        />
        <ProgressiveDisclosure
          what="El contexto económico y operativo que justifica ampliar la capacidad de análisis."
          does="Relaciona volumen de oportunidades, concentración de resultados y madurez tecnológica con una frontera explícita de automatización."
          matters="Evita presentar la IA como sustituto del juicio fiduciario y ubica su valor en la preparación de decisiones."
          how={["Contextualiza señales de mercado sin sumarlas.", "Distingue asistencia de autoridad.", "Aumenta supervisión a medida que crecen riesgo y autonomía."]}
          technical={["Fuentes declaradas y universos separados.", "Matriz de asistencia versus límite humano.", "Controles ajustados por materialidad."]}
          limitations={["Las magnitudes no conforman una proyección financiera.", "El contexto cambia y requiere actualización.", "Correlación de señales no demuestra causalidad."]}
        />
        <div className="market-signal-grid">
          {MARKET_SIGNALS.map((signal) => (
            <article className="market-signal" key={signal.value}>
              <strong>{signal.value}</strong>
              <h3>{signal.label}</h3>
              <p>{signal.detail}</p>
              <small>FUENTE · {signal.source}</small>
            </article>
          ))}
        </div>
        <p className="source-caveat">Las magnitudes pertenecen a universos distintos y no se suman. Se presentan para contextualizar volumen, concentración y madurez tecnológica.</p>

        <div className="boundary-heading">
          <div><p className="eyebrow">Human-in-command</p><h3>Asistir el proceso. No absorber la responsabilidad.</h3></div>
          <p>La intensidad de supervisión aumenta con materialidad, autonomía, complejidad y riesgo. El sistema prepara, compara y cuestiona; las personas autorizadas deciden.</p>
        </div>
        <div className="boundary-table" role="table" aria-label="Frontera entre asistencia del sistema y juicio humano">
          <div className="boundary-head"><span>Etapa</span><span>Asistencia del OS</span><span>Límite humano indispensable</span></div>
          {AUTOMATION_BOUNDARY.map((row) => (
            <div className="boundary-row" key={row.stage}>
              <strong>{row.stage}</strong><span>{row.assist}</span><span>{row.human}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
