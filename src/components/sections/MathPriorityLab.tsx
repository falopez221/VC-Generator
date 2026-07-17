"use client";

import { useMemo, useState } from "react";
import { ChartExplainer } from "@/src/components/ui/ChartExplainer";

const DIMENSIONS = ["Mercado", "Tecnología", "Economía", "Diferenciación", "Validación"] as const;
const OPPORTUNITIES = [
  { id: "A", name: "Infraestructura de compliance IA", vector: [82, 74, 69, 76, 61], uncertainty: 0.28 },
  { id: "B", name: "Mercado energético distribuido", vector: [71, 66, 84, 80, 54], uncertainty: 0.36 },
  { id: "C", name: "Copiloto industrial vertical", vector: [77, 86, 73, 64, 72], uncertainty: 0.22 },
] as const;

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(ratio * sorted.length))];
}

function classify(score: number) {
  if (score >= 82) return "Excepcional";
  if (score >= 70) return "Muy prometedora";
  if (score >= 56) return "Prometedora";
  return "En exploración";
}

export function MathPriorityLab() {
  const [weights, setWeights] = useState([24, 20, 20, 20, 16]);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);

  const results = useMemo(() => OPPORTUNITIES.map((opportunity, opportunityIndex) => {
    const score = opportunity.vector.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight;
    const spread = 6 + opportunity.uncertainty * 20;
    const samples = Array.from({ length: 240 }, (_, index) => {
      const wave = Math.sin((index + 1) * (opportunityIndex + 2) * 1.731) + Math.cos((index + 4) * .619);
      return Math.max(0, Math.min(100, score + wave * spread * .52));
    });
    const latent = {
      demand: opportunity.vector[0] * .7 + opportunity.vector[4] * .3,
      execution: opportunity.vector[1] * .55 + opportunity.vector[2] * .45,
      edge: opportunity.vector[3] * .7 + opportunity.vector[0] * .3,
    };
    return {
      ...opportunity,
      score,
      classification: classify(score),
      p10: percentile(samples, .1),
      p50: percentile(samples, .5),
      p90: percentile(samples, .9),
      probability: samples.filter((value) => value >= 70).length / samples.length * 100,
      latent,
    };
  }).sort((a, b) => b.score - a.score), [totalWeight, weights]);

  const updateWeight = (index: number, value: number) => {
    setWeights((current) => current.map((weight, weightIndex) => weightIndex === index ? value : weight));
  };

  return (
    <div className="math-lab">
      <div className="math-lab-head">
        <div><p className="eyebrow">Laboratorio interactivo de priorización</p><h3>Mové los pesos y observá cómo cambia el ranking.</h3></div>
        <p>El modelo usa un score multicriterio lineal, una transformación a factores latentes y una simulación conceptual para expresar rango e incertidumbre.</p>
      </div>
      <ChartExplainer
        shows="Cómo cambian el ranking, los intervalos simulados y los factores latentes cuando la tesis modifica sus pesos."
        matters="Permite probar si una prioridad es robusta o depende de una preferencia muy específica."
        interpret="Leé primero el ranking, después el rango P10–P90 y finalmente la probabilidad ilustrativa. Un score alto con un intervalo amplio sigue siendo incierto."
      />
      <div className="math-lab-grid">
        <div className="weight-panel">
          <div className="panel-label"><span>VECTOR DE PESOS</span><strong>w / Σw</strong></div>
          {DIMENSIONS.map((dimension, index) => (
            <label className="weight-control" key={dimension}>
              <span>{dimension}<strong>{Math.round(weights[index] / totalWeight * 100)}%</strong></span>
              <input type="range" min="5" max="45" value={weights[index]} onChange={(event) => updateWeight(index, Number(event.target.value))} aria-label={`Peso de ${dimension}`} />
              <small>Impacta score, ranking, intervalo y clasificación.</small>
            </label>
          ))}
          <div className="formula-card"><span>SCORE LINEAL</span><strong>s = wᵀx / Σw</strong><p>Cada proyecto es un vector de features x. El producto interno con w permite comparar oportunidades bajo una tesis explícita.</p></div>
        </div>
        <div className="ranking-panel">
          <div className="panel-label"><span>RANKING ACTUALIZADO</span><strong>{results.length} oportunidades</strong></div>
          {results.map((result, index) => (
            <article className="ranked-opportunity" key={result.id}>
              <div className="rank-number">0{index + 1}</div>
              <div><span>CONCEPT-{result.id}</span><h4>{result.name}</h4><small>{result.classification}</small></div>
              <strong>{result.score.toFixed(1)}</strong>
              <div className="rank-bar"><i style={{ width: `${result.score}%` }} /></div>
            </article>
          ))}
        </div>
      </div>
      <div className="statistics-grid">
        {results.map((result) => (
          <article key={result.id}>
            <div className="statistics-head"><span>CONCEPT-{result.id}</span><strong>P(score ≥ 70) {result.probability.toFixed(0)}%</strong></div>
            <div className="interval-visual"><i style={{ left: `${result.p10}%`, width: `${result.p90 - result.p10}%` }} /><b style={{ left: `${result.p50}%` }} /></div>
            <dl><div><dt>P10</dt><dd>{result.p10.toFixed(1)}</dd></div><div><dt>Mediana</dt><dd>{result.p50.toFixed(1)}</dd></div><div><dt>P90</dt><dd>{result.p90.toFixed(1)}</dd></div></dl>
          </article>
        ))}
      </div>
      <p className="dashboard-reading"><strong>Cómo leer estos resultados:</strong> P10 representa un escenario bajo, la mediana el centro de la simulación y P90 un escenario alto. El porcentaje indica cuántas muestras sintéticas superaron 70; no es una probabilidad calibrada de éxito empresarial.</p>
      <div className="linear-transform-panel">
        <div><span>TRANSFORMACIÓN LINEAL</span><h3>z = Ax</h3><p>La matriz A combina features correlacionadas en tres factores interpretables. No crea evidencia nueva: reorganiza la disponible para comparar mejor.</p></div>
        <div className="matrix-card" aria-label="Matriz de transformación conceptual"><span>A =</span><code>0.70  0.00  0.00  0.00  0.30<br />0.00  0.55  0.45  0.00  0.00<br />0.30  0.00  0.00  0.70  0.00</code></div>
        <div className="latent-results">
          {results.map((result) => <div key={result.id}><strong>{result.id}</strong><span>Demanda {result.latent.demand.toFixed(0)}</span><span>Ejecución {result.latent.execution.toFixed(0)}</span><span>Ventaja {result.latent.edge.toFixed(0)}</span></div>)}
        </div>
      </div>
      <p className="math-caveat">Demostración conceptual. Los pesos, distribuciones, umbrales y correlaciones deben calibrarse con evidencia histórica y revisión humana antes de influir en capital real.</p>
    </div>
  );
}
