"use client";

import { useState } from "react";
import { SectionHeading } from "@/src/components/ui/SectionHeading";
import { BLUE_OCEAN_FACTORS, ERRC, FRAMEWORK_GROUPS } from "@/src/content/frameworks";

export function StrategyLab() {
  const [curve, setCurve] = useState<number[]>(BLUE_OCEAN_FACTORS.map((item) => item.concept));

  return (
    <section className="section section--paper" id="frameworks">
      <div className="container">
        <SectionHeading
          eyebrow="06 · Frameworks estratégicos"
          title="Los frameworks no son checklists. Son lentes con entregas concretas."
          description="Cada marco entra al pipeline para reducir una clase distinta de incertidumbre y dejar un artefacto que otro agente pueda cuestionar."
        />
        <div className="framework-grid">
          {FRAMEWORK_GROUPS.map((group, index) => (
            <article className="framework-card" key={group.category}>
              <span>0{index + 1}</span><h3>{group.category}</h3><p>{group.outcome}</p>
              <div>{group.items.map((item) => <small key={item}>{item}</small>)}</div>
            </article>
          ))}
        </div>

        <div className="lab-header">
          <div><p className="eyebrow">Blue Ocean Strategy</p><h3>Diseñar una curva de valor, no una promesa.</h3></div>
          <p>Comparación conceptual editable. Los valores ilustran una herramienta de trabajo y no provienen de datos de mercado.</p>
        </div>
        <div className="strategy-layout">
          <div className="strategy-canvas" aria-label="Curva de valor conceptual editable">
            <div className="canvas-legend"><span><i className="incumbent-line" /> Proceso tradicional</span><span><i className="concept-line" /> Concepto VI</span></div>
            {BLUE_OCEAN_FACTORS.map((factor, index) => (
              <div className="factor-row" key={factor.label}>
                <label htmlFor={`factor-${index}`}>{factor.label}</label>
                <div className="factor-track">
                  <span className="factor-incumbent" style={{ width: `${factor.incumbent}%` }} />
                  <span className="factor-concept" style={{ width: `${curve[index]}%` }} />
                </div>
                <input
                  id={`factor-${index}`}
                  type="range"
                  min="5"
                  max="100"
                  value={curve[index]}
                  onChange={(event) => setCurve((values) => values.map((value, valueIndex) => valueIndex === index ? Number(event.target.value) : value))}
                  aria-label={`Nivel conceptual de ${factor.label}`}
                />
              </div>
            ))}
          </div>
          <div className="errc-grid">
            {ERRC.map((quadrant) => (
              <article key={quadrant.action}><span>{quadrant.action}</span>{quadrant.items.map((item) => <p key={item}>{item}</p>)}</article>
            ))}
          </div>
        </div>

        <div className="method-triptych">
          <article className="lean-loop">
            <p className="eyebrow">Lean Startup</p><h3>Aprendizaje como unidad de progreso.</h3>
            <div className="loop-visual"><span>BUILD<small>MVP</small></span><b>→</b><span>MEASURE<small>señal</small></span><b>→</b><span>LEARN<small>decidir</small></span></div>
            <p>El sistema prioriza el experimento que reduce la incertidumbre más decisiva: pivotar, perseverar o detener.</p>
          </article>
          <article className="game-matrix">
            <p className="eyebrow">Teoría de Juegos</p><h3>Incentivos bajo presión.</h3>
            <div className="payoff-table" role="table" aria-label="Matriz conceptual de pagos">
              <div /><div>Actor B coopera</div><div>Actor B desvía</div>
              <div>Actor A coopera</div><strong>3 · 3<small>equilibrio</small></strong><strong>−1 · 4<small>free-riding</small></strong>
              <div>Actor A desvía</div><strong>4 · −1<small>captura</small></strong><strong>0 · 0<small>bloqueo</small></strong>
            </div>
            <p>Los pagos son ilustrativos: sirven para exponer estrategias, colusión, ataques y fallas de coordinación.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
