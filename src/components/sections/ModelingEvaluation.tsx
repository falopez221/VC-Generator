import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { ALGORITHMS, MATH_MODELS, SCORE_DIMENSIONS } from "@/src/content/models";

const distribution = [12, 18, 28, 41, 58, 76, 92, 100, 94, 82, 64, 44, 28, 17, 9];

export function ModelingEvaluation() {
  return (
    <>
      <section className="section section--navy" id="modelado">
        <div className="container">
          <SectionHeading
            eyebrow="08 · Modelado matemático"
            title="Modelar rangos. Explicar sensibilidad. Evitar falsa precisión."
            description="La matemática estructura incertidumbre y trade-offs. Sus resultados se presentan como escenarios conceptuales hasta que datos calibrados permitan afirmar más."
          />
          <div className="model-dashboard">
            <div className="distribution-card">
              <div className="card-top"><div><span>Distribución de escenarios</span><strong>DEMO CONCEPTUAL</strong></div><div className="percentile"><small>P50</small> 54</div></div>
              <div className="distribution-chart" aria-label="Distribución conceptual con escenarios entre percentiles 10 y 90">
                {distribution.map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}
                <span className="p10">P10</span><span className="p90">P90</span>
              </div>
              <div className="scenario-row"><span><i />Adverso <strong>18</strong></span><span><i />Base <strong>54</strong></span><span><i />Expansivo <strong>87</strong></span></div>
            </div>
            <div className="pareto-card">
              <div className="card-top"><div><span>Frontera de Pareto</span><strong>RIESGO / RETORNO</strong></div></div>
              <div className="pareto-chart" aria-label="Nueve oportunidades conceptuales comparadas por riesgo y retorno">
                {[18, 29, 38, 46, 52, 61, 70, 78, 88].map((x, index) => <i key={x} style={{ left: `${x}%`, bottom: `${18 + index * 7 + (index % 2) * 8}%` }}><span>{String.fromCharCode(65 + index)}</span></i>)}
                <div className="pareto-frontier" />
              </div>
              <div className="axis-labels"><span>menor riesgo</span><span>retorno potencial →</span></div>
            </div>
          </div>
          <div className="model-grid">
            {MATH_MODELS.map((model, index) => (
              <article key={model.name}><span>0{index + 1}</span><h3>{model.name}</h3><p>{model.purpose}</p><small>ENTREGA · {model.output}</small></article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--light" id="evaluacion">
        <div className="container">
          <SectionHeading
            eyebrow="09 · Sistema de evaluación"
            title="Un score no es una respuesta. Es una interfaz para discutir evidencia."
            description="La evaluación combina dimensiones, confianza, hipótesis y objeciones. Ningún agregado oculta qué datos faltan o quién debe decidir."
          />
          <div className="evaluation-grid">
            <div className="scorecard">
              <div className="scorecard-head"><span>OPORTUNIDAD / CONCEPT-01</span><strong>71<small>/100</small></strong></div>
              {SCORE_DIMENSIONS.map((dimension) => (
                <div className="score-row" key={dimension.name}>
                  <span>{dimension.name}</span><div><i style={{ width: `${dimension.value}%` }} /></div><strong>{dimension.value}</strong><small>conf. {dimension.confidence}</small>
                </div>
              ))}
              <p>Valores puramente demostrativos. El producto debe mostrar fuente y fecha de cada evidencia.</p>
            </div>
            <aside className="confidence-panel">
              <p className="eyebrow">Lectura del comité</p><h3>Prometedora, aún no invertible.</h3>
              <div className="confidence-meter"><span>Confianza global</span><strong>MEDIA</strong><i><b /></i></div>
              <dl>
                <div><dt>Hipótesis crítica</dt><dd>Disposición a integrar el flujo en procesos existentes.</dd></div>
                <div><dt>Evidencia faltante</dt><dd>Piloto con usuarios institucionales y datos reales.</dd></div>
                <div><dt>Próxima decisión</dt><dd>Aprobar experimento, no una inversión.</dd></div>
              </dl>
              <div className="human-decision"><span>HUMAN GATE</span><p>El comité conserva responsabilidad, contexto fiduciario y autoridad final.</p></div>
            </aside>
          </div>

          <div className="algorithm-section">
            <div className="lab-header"><div><p className="eyebrow">Arquitectura algorítmica</p><h3>Elegir el método por su función y trade-off.</h3></div><p>La eficiencia surge de recuperar menos, deduplicar mejor y asignar profundidad solo donde cambia una decisión.</p></div>
            <div className="algorithm-table" role="table" aria-label="Métodos algorítmicos por tarea">
              <div className="table-head"><span>Tarea</span><span>Método propuesto</span><span>Trade-off a gobernar</span></div>
              {ALGORITHMS.map((row) => <div className="table-row" key={row.task}><strong>{row.task}</strong><span>{row.method}</span><small>{row.tradeoff}</small></div>)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
