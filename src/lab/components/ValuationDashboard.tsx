"use client";

import { useMemo, useState } from "react";
import valuationData from "../valuation-data.json";
import {
  calculateScenarioDcf,
  formatUsdMillions,
  logarithmicBarWidth,
  type ValuationScenario,
} from "../valuation.ts";

const stateClass: Record<string, string> = {
  Implemented: "is-positive",
  "Partially implemented": "is-partial",
  Prototype: "is-partial",
  "Functional demo": "is-partial",
  Planned: "is-planned",
  "No evidence": "is-negative",
};

const money = (value: number) => formatUsdMillions(value, value < 1 ? 2 : value < 10 ? 1 : 0);

export function ValuationDashboard() {
  const [scenarioId, setScenarioId] = useState("base");
  const initialScenario = valuationData.dcfScenarios.find((scenario) => scenario.id === scenarioId) ?? valuationData.dcfScenarios[2];
  const [discountRatePct, setDiscountRatePct] = useState(initialScenario.discountRatePct);
  const [terminalGrowthPct, setTerminalGrowthPct] = useState(initialScenario.terminalGrowthPct);
  const [probabilityPct, setProbabilityPct] = useState(initialScenario.probabilityPct);

  const scenario = valuationData.dcfScenarios.find((item) => item.id === scenarioId) ?? valuationData.dcfScenarios[2];
  const dcf = useMemo(
    () => calculateScenarioDcf(scenario as ValuationScenario, discountRatePct, terminalGrowthPct, probabilityPct),
    [scenario, discountRatePct, terminalGrowthPct, probabilityPct],
  );
  const maxStageValue = Math.max(...valuationData.stages.map((stage) => stage.highM));

  const chooseScenario = (next: ValuationScenario) => {
    setScenarioId(next.id);
    setDiscountRatePct(next.discountRatePct);
    setTerminalGrowthPct(next.terminalGrowthPct);
    setProbabilityPct(next.probabilityPct);
  };

  return (
    <main className="valuation-page" id="lab-content">
      <section className="valuation-hero" aria-labelledby="valuation-title">
        <div className="valuation-hero-copy">
          <p className="lab-kicker">EVIDENCE-BOUNDED VALUATION · {valuationData.asOf}</p>
          <h1 id="valuation-title">Value what exists. <em>Gate what might.</em></h1>
          <p>{valuationData.classification}. The analysis separates reusable economic value from a negotiated financing price and from future option value.</p>
          <div className="valuation-hero-actions">
            <a className="lab-button lab-button--primary" href="#valuation-model">Inspect the model</a>
            <a className="lab-button" href="#valuation-evidence">Review evidence</a>
          </div>
        </div>
        <div className="valuation-current" aria-label="Current valuation summary">
          <p>Current fair economic / IP value</p>
          <strong>$0.8–2.0m</strong>
          <span>P50 planning anchor {money(valuationData.currentValue.economicP50M)}</span>
          <hr />
          <p>Negotiated financing pre-money</p>
          <b>$1.5–4.0m</b>
          <small>Low-medium confidence · no revenue or customer evidence</small>
        </div>
      </section>

      <section className="valuation-disclaimer" role="note">
        <strong>Interpretation boundary</strong>
        <span>{valuationData.disclaimer}</span>
      </section>

      <section className="valuation-section valuation-headline-stages" aria-labelledby="value-ladder-title">
        <header>
          <p className="lab-kicker">CONDITIONAL VALUE LADDER</p>
          <h2 id="value-ladder-title">Future value belongs to milestones, not the current balance sheet.</h2>
        </header>
        <div className="valuation-kpi-grid">
          {valuationData.headlineStages.map((stage) => (
            <article key={stage.label}>
              <span>{stage.label}</span>
              <strong>{money(stage.lowM)}–{money(stage.highM)}</strong>
              <p>{stage.condition}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="valuation-section valuation-evidence" id="valuation-evidence" aria-labelledby="evidence-title">
        <header>
          <p className="lab-kicker">TECHNICAL & COMMERCIAL INVENTORY</p>
          <h2 id="evidence-title">Observed capability before narrative.</h2>
          <p>Repository evidence was classified by execution state. Designed or displayed capability is not treated as enterprise product evidence.</p>
        </header>
        <div className="valuation-evidence-grid">
          {valuationData.evidence.map((item) => (
            <article key={item.item}>
              <div>
                <h3>{item.item}</h3>
                <span className={stateClass[item.state] ?? "is-planned"}>{item.state}</span>
              </div>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
        <aside className="valuation-audit-note">
          <strong>Agent registry finding</strong>
          <p>The 1,970 records are documented specialist profiles across 51 domains that feed one common bounded executor. They are not 1,970 independently implemented, benchmarked or certified agents.</p>
        </aside>
      </section>

      <section className="valuation-section valuation-model" id="valuation-model" aria-labelledby="model-title">
        <header>
          <p className="lab-kicker">PROBABILISTIC DCF · INTERACTIVE</p>
          <h2 id="model-title">Stress the assumptions before trusting the output.</h2>
          <p>Each scenario contains a ten-year free-cash-flow path. Change discount, terminal growth and outcome probability; inputs are bounded and never treated as observed facts.</p>
        </header>
        <div className="valuation-scenario-tabs" role="tablist" aria-label="DCF scenarios">
          {valuationData.dcfScenarios.map((item) => (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={item.id === scenario.id}
              className={item.id === scenario.id ? "is-active" : undefined}
              onClick={() => chooseScenario(item as ValuationScenario)}
            >
              <span>{item.label}</span><small>{item.probabilityPct}% base probability</small>
            </button>
          ))}
        </div>
        <div className="valuation-model-grid">
          <div className="valuation-controls" aria-label="Editable DCF assumptions">
            <label>
              <span>Discount rate <output>{discountRatePct}%</output></span>
              <input type="range" min="20" max="80" step="1" value={discountRatePct} onChange={(event) => setDiscountRatePct(Number(event.target.value))} />
              <small>Early-stage risk and capital scarcity. Editable assumption.</small>
            </label>
            <label>
              <span>Terminal growth <output>{terminalGrowthPct}%</output></span>
              <input type="range" min="0" max="5" step="0.5" value={terminalGrowthPct} onChange={(event) => setTerminalGrowthPct(Number(event.target.value))} />
              <small>Bounded below the selected discount rate.</small>
            </label>
            <label>
              <span>Scenario probability <output>{probabilityPct}%</output></span>
              <input type="range" min="0" max="70" step="1" value={probabilityPct} onChange={(event) => setProbabilityPct(Number(event.target.value))} />
              <small>Subjective probability from the current state, not historical frequency.</small>
            </label>
          </div>
          <div className="valuation-dcf-output" aria-live="polite">
            <p>{scenario.label} conditional DCF</p>
            <strong>{money(dcf.enterpriseValueM)}</strong>
            <div><span>Forecast-period PV</span><b>{money(dcf.forecastValueM)}</b></div>
            <div><span>Terminal-value PV</span><b>{money(dcf.terminalValueM)}</b></div>
            <div><span>Positive-value probability contribution</span><b>{money(dcf.probabilityWeightedValueM)}</b></div>
            <small>Year-10 revenue assumption: {money(scenario.year10RevenueM)}. Negative DCFs are possible and are not hidden.</small>
          </div>
        </div>
        <div className="valuation-cashflow-chart" aria-label={`${scenario.label} revenue and free cash flow in USD millions`}>
          {scenario.revenueM.map((revenue, index) => {
            const max = Math.max(...scenario.revenueM.map(Math.abs), ...scenario.fcffM.map(Math.abs), 1);
            const cashFlow = scenario.fcffM[index];
            return (
              <div key={`${scenario.id}-${index}`}>
                <span>Y{index + 1}</span>
                <i title={`Revenue ${money(revenue)}`}><b style={{ height: `${Math.max(2, Math.abs(revenue) / max * 100)}%` }} /></i>
                <i className={cashFlow < 0 ? "is-negative" : "is-cashflow"} title={`FCFF ${money(cashFlow)}`}><b style={{ height: `${Math.max(2, Math.abs(cashFlow) / max * 100)}%` }} /></i>
              </div>
            );
          })}
          <p><span><i /> Revenue</span><span><i /> FCFF</span><span><i /> Negative FCFF</span></p>
        </div>
      </section>

      <section className="valuation-section valuation-monte" aria-labelledby="monte-title">
        <header>
          <p className="lab-kicker">MONTE CARLO · {valuationData.monteCarlo.draws.toLocaleString("en-US")} DRAWS · SEED {valuationData.monteCarlo.seed}</p>
          <h2 id="monte-title">A median under $0.5m with a very long right tail.</h2>
          <p>{valuationData.monteCarlo.note}</p>
        </header>
        <div className="valuation-percentiles">
          {(["p10M", "p25M", "p50M", "p75M", "p90M"] as const).map((key) => (
            <article key={key}>
              <span>{key.replace("M", "").toUpperCase()}</span>
              <strong>{money(valuationData.monteCarlo[key])}</strong>
              <i><b style={{ width: `${logarithmicBarWidth(valuationData.monteCarlo[key], valuationData.monteCarlo.p90M)}%` }} /></i>
            </article>
          ))}
          <article className="is-mean"><span>MEAN</span><strong>{money(valuationData.monteCarlo.meanM)}</strong><p>Not the recommended anchor</p></article>
        </div>
      </section>

      <section className="valuation-section valuation-readiness" aria-labelledby="readiness-title">
        <header>
          <p className="lab-kicker">VALUATION READINESS SCORE</p>
          <h2 id="readiness-title">Commercial evidence is the binding constraint.</h2>
        </header>
        <div className="valuation-readiness-layout">
          <div className="valuation-gauge" style={{ "--score": valuationData.readiness.score } as React.CSSProperties}>
            <span><strong>{valuationData.readiness.score}</strong>/100</span>
            <p>Evidence-based readiness</p>
          </div>
          <div className="valuation-readiness-components">
            {valuationData.readiness.components.map((item) => (
              <article key={item.name}>
                <div><strong>{item.name}</strong><span>{item.score}/100 · weight {item.weightPct}%</span></div>
                <i><b style={{ width: `${item.score}%` }} /></i>
                <p>{item.evidence}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="valuation-section valuation-stages" aria-labelledby="stages-title">
        <header>
          <p className="lab-kicker">STAGE VALUATION · CONDITIONAL PRE-MONEY</p>
          <h2 id="stages-title">Valuation rises only after evidence changes.</h2>
          <p>P50 and P90 are conditional marks at each achieved stage. The separate probability is the subjective chance of reaching that stage from today.</p>
        </header>
        <div className="valuation-stage-list">
          {valuationData.stages.map((stage) => (
            <article key={stage.stage}>
              <div><span>{stage.stage}</span><small>{stage.probabilityFromCurrentPct}% probability from current state</small></div>
              <i><b style={{ width: `${logarithmicBarWidth(stage.p50M, maxStageValue)}%` }} /><em style={{ left: `${logarithmicBarWidth(stage.p90M, maxStageValue)}%` }} /></i>
              <strong>{money(stage.p50M)} <small>P50</small></strong>
              <p>{stage.evidenceRequired}</p>
            </article>
          ))}
        </div>
        <p className="valuation-scale-note">Logarithmic scale · marker = P90 · values are conditional and must not be multiplied into current value without an explicit probability model.</p>
      </section>

      <section className="valuation-section valuation-market" aria-labelledby="market-title">
        <header>
          <p className="lab-kicker">FOCUS & MONETIZATION</p>
          <h2 id="market-title">Start with one governed mission for CVC and venture studios.</h2>
          <p>{valuationData.market.problem}. Multi-industry reach remains an option, not current SAM.</p>
        </header>
        <div className="valuation-market-summary">
          <article><span>RECOMMENDED WEDGE</span><strong>{valuationData.market.recommendedWedge}</strong></article>
          <article><span>VC-ONLY ILLUSTRATIVE SAM</span><strong>{valuationData.market.illustrativeVcSamM}</strong><small>Unvalidated ICP filter and ACV</small></article>
          <article><span>3-YEAR CAPACITY SOM</span><strong>{valuationData.market.threeYearSomArrM}</strong><small>15-40 customers, not a forecast</small></article>
        </div>
        <ol className="valuation-pricing-sequence">
          {valuationData.market.pricingSequence.map((item, index) => <li key={item}><span>0{index + 1}</span><p>{item}</p></li>)}
        </ol>
        <p className="valuation-warning">{valuationData.market.warning}</p>
      </section>

      <section className="valuation-section valuation-business-units" aria-labelledby="units-title">
        <header><p className="lab-kicker">BUSINESS-UNIT OPTIONS</p><h2 id="units-title">Sequence the options. Do not sum them.</h2></header>
        <div>
          {valuationData.businessUnits.map((unit) => (
            <article key={unit.name}>
              <span>{unit.status}</span><strong>{unit.priorityScore}</strong><h3>{unit.name}</h3>
              <p>{unit.buyer}</p><dl><div><dt>Pricing</dt><dd>{unit.price}</dd></div><div><dt>Sales cycle</dt><dd>{unit.salesCycle}</dd></div><div><dt>Margin</dt><dd>{unit.margin}</dd></div><div><dt>Risk</dt><dd>{unit.risk}</dd></div></dl>
            </article>
          ))}
        </div>
      </section>

      <section className="valuation-section valuation-deployment" aria-labelledby="deployment-title">
        <header><p className="lab-kicker">DEPLOYMENT INTELLIGENCE</p><h2 id="deployment-title">Capital and time to make the option real.</h2><p>Finance overlays are intentionally wider than the repository's synthetic demo cost distribution.</p></header>
        <div className="valuation-table-wrap" tabIndex={0} role="region" aria-label="Deployment time and cost table">
          <table>
            <thead><tr><th>Target state</th><th>Time P50 / P90</th><th>Cost P50 / P90</th><th>Capital</th><th>Evidence gate</th></tr></thead>
            <tbody>{valuationData.deployment.map((item) => <tr key={item.state}><th>{item.state}</th><td>{item.timeP50Months} / {item.timeP90Months} mo</td><td>{money(item.costP50M)} / {money(item.costP90M)}</td><td>{item.capitalRangeM}</td><td>{item.gate}</td></tr>)}</tbody>
          </table>
        </div>
        <ol className="valuation-critical-path" aria-label="Critical path">
          {valuationData.criticalPath.map((item, index) => <li key={item}><span>{index + 1}</span><p>{item}</p></li>)}
        </ol>
      </section>

      <section className="valuation-section valuation-risks" aria-labelledby="risks-title">
        <header><p className="lab-kicker">VALUE-DESTRUCTION RISKS</p><h2 id="risks-title">The biggest risks are commercial proof, differentiation and enterprise controls.</h2></header>
        <div className="valuation-table-wrap" tabIndex={0} role="region" aria-label="Valuation risk register">
          <table>
            <thead><tr><th>Risk</th><th>Probability</th><th>Impact</th><th>Mitigation</th><th>Owner</th><th>Budget</th></tr></thead>
            <tbody>{valuationData.risks.map((risk) => <tr key={risk.risk}><th>{risk.risk}</th><td>{risk.probability}</td><td>{risk.impact}</td><td>{risk.mitigation}</td><td>{risk.owner}</td><td>${risk.mitigationCostK}k</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="valuation-section valuation-comparables" aria-labelledby="comparables-title">
        <header><p className="lab-kicker">COMPETITORS & SUBSTITUTES</p><h2 id="comparables-title">General AI plus internal build is the sharpest substitute.</h2></header>
        <div>{valuationData.comparables.map((item) => <article key={item.category}><span>{item.category}</span><h3>{item.examples}</h3><p><strong>Incumbent strength:</strong> {item.strength}</p><p><strong>Current gap:</strong> {item.ventureGovernanceGap}</p><small>{item.implication}</small></article>)}</div>
      </section>

      <section className="valuation-section valuation-roadmap" aria-labelledby="roadmap-title">
        <header><p className="lab-kicker">VALUE-CREATION ROADMAP</p><h2 id="roadmap-title">The next year is an evidence program.</h2></header>
        <div>{valuationData.milestones.map((window) => <article key={window.window}><span>{window.window}</span><ol>{window.items.map((item) => <li key={item}>{item}</li>)}</ol></article>)}</div>
      </section>

      <section className="valuation-section valuation-methodology" aria-labelledby="methodology-title">
        <header><p className="lab-kicker">METHODS, ASSUMPTIONS & SOURCES</p><h2 id="methodology-title">Auditable inputs, explicit limits.</h2></header>
        <div className="valuation-methods-grid">{valuationData.methods.map((method) => <article key={method.name}><span>{method.weightPct}% triangulation weight</span><h3>{method.name}</h3><strong>{money(method.lowM)}–{money(method.highM)}</strong><p>{method.note}</p></article>)}</div>
        <details><summary>Unit-economics assumptions</summary><div className="valuation-assumption-grid"><p><strong>Base:</strong> ${valuationData.unitEconomics.base.annualAcvK}k ACV, {valuationData.unitEconomics.base.grossMarginPct}% GM, ${valuationData.unitEconomics.base.cacK}k CAC, {valuationData.unitEconomics.base.cacPaybackMonths} month payback, {valuationData.unitEconomics.base.nrrPct}% NRR.</p><p><strong>Downside:</strong> ${valuationData.unitEconomics.downside.annualAcvK}k ACV, {valuationData.unitEconomics.downside.grossMarginPct}% GM, ${valuationData.unitEconomics.downside.cacK}k CAC, {valuationData.unitEconomics.downside.cacPaybackMonths} month payback.</p><p>{valuationData.unitEconomics.note}</p></div></details>
        <details><summary>Source register</summary><ul className="valuation-sources">{valuationData.sources.map((source) => <li key={source.id}><span>{source.type}</span>{source.url.startsWith("http") ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : <b>{source.title} · {source.url}</b>}</li>)}</ul></details>
      </section>
    </main>
  );
}
