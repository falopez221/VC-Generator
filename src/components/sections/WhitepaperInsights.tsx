import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { AUTOMATION_BOUNDARY, MARKET_SIGNALS } from "@/src/content/whitepaper";

export function WhitepaperInsights() {
  return (
    <section className="section section--paper" id="evidencia">
      <div className="container">
        <SectionHeading
          eyebrow="03 · Contexto y frontera de automatización"
          title="Capital abundante. Atención escasa. Resultados concentrados."
          description="El whitepaper sitúa la oportunidad en una tensión concreta: el volumen de información aumenta, mientras el juicio inversor sigue dependiendo de contexto, relaciones y accountability humana."
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
          <div><p className="eyebrow">AI-in-the-loop</p><h3>Asistir el proceso. No absorber la responsabilidad.</h3></div>
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
