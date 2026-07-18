"use client";

import { useMemo, useState } from "react";
import { analyzeScenarios, PRIVATE_MODEL_DISCLOSURE, simulateScenarioOutcomes } from "@/src/private/models";
import type { ScenarioInput } from "@/src/private/models";

type ScenarioField = Exclude<keyof ScenarioInput, "id">;
type ScenarioDraft = ScenarioInput;

const INITIAL_SCENARIOS: ScenarioDraft[] = [
  { id: "Adverse", likelihood: 25, annualRevenue: 1_200_000, grossMarginPercent: 42, annualOperatingCost: 760_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 30 },
  { id: "Base", likelihood: 50, annualRevenue: 2_400_000, grossMarginPercent: 55, annualOperatingCost: 1_050_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 18 },
  { id: "Favorable", likelihood: 25, annualRevenue: 4_100_000, grossMarginPercent: 63, annualOperatingCost: 1_500_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 24 },
];

const MONEY_FORMATTER = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatMoney(value: number) {
  return MONEY_FORMATTER.format(value);
}

function formatPercent(value: number) {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

function numberFromEvent(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function PrivateSimulationLab() {
  const [scenarios, setScenarios] = useState<ScenarioDraft[]>(INITIAL_SCENARIOS);
  const [discountRatePercent, setDiscountRatePercent] = useState(12);
  const [samples, setSamples] = useState(2_000);
  const [seed, setSeed] = useState(240719);
  const [hasRun, setHasRun] = useState(true);

  const input = useMemo(() => ({ scenarios, discountRatePercent }), [scenarios, discountRatePercent]);
  const analysis = useMemo(() => analyzeScenarios(input), [input]);
  const simulation = useMemo(() => simulateScenarioOutcomes(input, { samples, seed }), [input, samples, seed]);
  const likelihoodTotal = scenarios.reduce((total, scenario) => total + scenario.likelihood, 0);

  function updateScenario(index: number, field: ScenarioField, rawValue: string) {
    setScenarios((current) => current.map((scenario, scenarioIndex) => scenarioIndex === index
      ? { ...scenario, [field]: numberFromEvent(rawValue, scenario[field] ?? 0) }
      : scenario,
    ));
    setHasRun(false);
  }

  function updateScenarioName(index: number, value: string) {
    setScenarios((current) => current.map((scenario, scenarioIndex) => scenarioIndex === index
      ? { ...scenario, id: value.slice(0, 48) }
      : scenario,
    ));
    setHasRun(false);
  }

  function runModels() {
    setHasRun(true);
  }

  return <section className="private-simulation" aria-labelledby="private-simulation-title">
    <header className="platform-page-heading">
      <div><p>SIMULATION LAB · PRIVATE PLANNING</p><h1 id="private-simulation-title">Make uncertainty visible before a human decision.</h1></div>
      <p>Bounded scenario planning with declared assumptions. Identical inputs and seed produce identical demonstrative results; this is not a forecast, valuation, or investment recommendation.</p>
    </header>

    <div className="private-simulation__layout">
      <form className="platform-panel private-simulation__form" onSubmit={(event) => { event.preventDefault(); runModels(); }}>
        <header><div><span>DECLARED INPUTS</span><h2>Scenario configuration</h2></div><small>All currency values USD</small></header>
        <p className="platform-caveat">Likelihoods are relative weights. They are normalized to 100% by the model, even when the entered total differs.</p>
        <div className="private-simulation__global-inputs">
          <label>Discount rate (%)<input type="number" min="0" max="100" step="0.1" value={discountRatePercent} onChange={(event) => { setDiscountRatePercent(numberFromEvent(event.target.value, discountRatePercent)); setHasRun(false); }} /></label>
          <label>Monte Carlo samples<input type="number" min="100" max="20000" step="100" value={samples} onChange={(event) => { setSamples(numberFromEvent(event.target.value, samples)); setHasRun(false); }} /></label>
          <label>Reproducible seed<input type="number" min="1" max="2147483646" step="1" value={seed} onChange={(event) => { setSeed(numberFromEvent(event.target.value, seed)); setHasRun(false); }} /></label>
        </div>
        <div className="private-simulation__table-wrap">
          <table className="private-simulation__table"><caption className="sr-only">Scenario inputs for private planning simulation</caption><thead><tr><th scope="col">Scenario</th><th scope="col">Weight</th><th scope="col">Revenue</th><th scope="col">Margin</th><th scope="col">Operating cost</th><th scope="col">Initial capital</th><th scope="col">Years</th><th scope="col">Uncertainty</th></tr></thead><tbody>{scenarios.map((scenario, index) => <tr key={`${scenario.id}-${index}`}>
            <td><input aria-label={`Scenario ${index + 1} name`} maxLength={48} value={scenario.id} onChange={(event) => updateScenarioName(index, event.target.value)} /></td>
            <NumberCell label="relative likelihood" value={scenario.likelihood} min={0} max={1000000} step={1} onChange={(value) => updateScenario(index, "likelihood", value)} suffix="%" />
            <NumberCell label="annual revenue" value={scenario.annualRevenue} min={0} max={1000000000000} step={10000} onChange={(value) => updateScenario(index, "annualRevenue", value)} />
            <NumberCell label="gross margin" value={scenario.grossMarginPercent} min={0} max={100} step={0.1} onChange={(value) => updateScenario(index, "grossMarginPercent", value)} suffix="%" />
            <NumberCell label="annual operating cost" value={scenario.annualOperatingCost} min={0} max={1000000000000} step={10000} onChange={(value) => updateScenario(index, "annualOperatingCost", value)} />
            <NumberCell label="initial capital" value={scenario.initialCapital} min={0} max={1000000000000} step={10000} onChange={(value) => updateScenario(index, "initialCapital", value)} />
            <NumberCell label="horizon years" value={scenario.horizonYears} min={1} max={50} step={1} onChange={(value) => updateScenario(index, "horizonYears", value)} />
            <NumberCell label="contribution uncertainty" value={scenario.uncertaintyPercent ?? 0} min={0} max={95} step={0.1} onChange={(value) => updateScenario(index, "uncertaintyPercent", value)} suffix="%" />
          </tr>)}</tbody></table>
        </div>
        <div className="private-simulation__action-row"><span>Entered weight: {formatPercent(likelihoodTotal)} · Model-normalized weights are shown below.</span><button className="platform-primary-link" type="submit">Calculate scenarios and sampling</button></div>
        <p className="sr-only" aria-live="polite">{hasRun ? `Results calculated using ${simulation.samples.toLocaleString()} samples and seed ${simulation.seed}.` : "Inputs changed. Recalculate to confirm this simulation run."}</p>
      </form>

      <aside className="platform-panel private-simulation__method">
        <header><div><span>MODEL BOUNDARY</span><h2>What this calculates</h2></div></header>
        <ul className="platform-rule-list">{PRIVATE_MODEL_DISCLOSURE.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Limits</h3>
        <ul className="platform-rule-list">{PRIVATE_MODEL_DISCLOSURE.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
      </aside>
    </div>

    <section className="private-simulation__results" aria-labelledby="simulation-results-title">
      <header><div><span>DETERMINISTIC RESULTS</span><h2 id="simulation-results-title">Scenario analysis</h2></div><small>{hasRun ? "Current calculated run" : "Previewing changed inputs — recalculate to record a run"}</small></header>
      <div className="private-simulation__metrics">
        <Metric label="Expected NPV" value={formatMoney(analysis.expectedNetPresentValue)} detail={`Sensitivity range ${formatMoney(analysis.lowerExpectedNetPresentValue)} to ${formatMoney(analysis.upperExpectedNetPresentValue)}`} />
        <Metric label="Loss probability" value={formatPercent(analysis.probabilityOfLossPercent)} detail="Weighted declared scenarios" />
        <Metric label="P10 / Median / P90" value={`${formatMoney(analysis.p10NetPresentValue)} / ${formatMoney(analysis.medianNetPresentValue)} / ${formatMoney(analysis.p90NetPresentValue)}`} detail="Discrete weighted scenario distribution" />
      </div>
      <div className="platform-table-wrap"><table className="platform-data-table private-simulation__result-table"><caption className="sr-only">Calculated scenario outcomes</caption><thead><tr><th scope="col">Scenario</th><th scope="col">Normalized weight</th><th scope="col">Annual contribution</th><th scope="col">Net present value</th><th scope="col">Declared range</th></tr></thead><tbody>{analysis.scenarios.map((scenario) => <tr key={scenario.id}><td>{scenario.id}</td><td>{formatPercent(scenario.likelihoodPercent)}</td><td>{formatMoney(scenario.annualContribution)}</td><td>{formatMoney(scenario.netPresentValue)}</td><td>{formatMoney(scenario.lowerNetPresentValue)} to {formatMoney(scenario.upperNetPresentValue)}<small>±{formatPercent(scenario.uncertaintyPercent)} contribution sensitivity</small></td></tr>)}</tbody></table></div>
    </section>

    <section className="private-simulation__results" aria-labelledby="monte-carlo-results-title">
      <header><div><span>SEEDED SAMPLING</span><h2 id="monte-carlo-results-title">Monte Carlo outcome range</h2></div><small>{simulation.samples.toLocaleString()} samples · seed {simulation.seed}</small></header>
      <div className="private-simulation__metrics private-simulation__metrics--four">
        <Metric label="Mean NPV" value={formatMoney(simulation.meanNetPresentValue)} detail="Illustrative sampled average" />
        <Metric label="P10 / Median / P90" value={`${formatMoney(simulation.p10NetPresentValue)} / ${formatMoney(simulation.medianNetPresentValue)} / ${formatMoney(simulation.p90NetPresentValue)}`} detail="Sampled outcomes" />
        <Metric label="Loss probability" value={formatPercent(simulation.probabilityOfLossPercent)} detail="Sampled outcomes below zero" />
        <Metric label="Observed range" value={`${formatMoney(simulation.minimumNetPresentValue)} to ${formatMoney(simulation.maximumNetPresentValue)}`} detail="Bounded declared uncertainty only" />
      </div>
    </section>
  </section>;
}

function NumberCell({ label, value, min, max, step, onChange, suffix }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: string) => void; suffix?: string }) {
  return <td><label><span className="sr-only">{label}</span><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} /></label>{suffix && <small>{suffix}</small>}</td>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
