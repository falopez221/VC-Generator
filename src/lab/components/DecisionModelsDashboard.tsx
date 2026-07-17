"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  calculateBreakEven,
  calculateRankRobustness,
  calculateTornadoSensitivity,
  calculateValidationPriority,
} from "../decision-models.ts";
import type { LabWeights, MonteCarloConfig, Opportunity } from "../types.ts";
import { MODEL_GUIDES } from "../ux.ts";
import { ModelIntro, SliderImpact } from "./LabUX.tsx";

const DIMENSION_LABELS = {
  marketPotential: "Market potential",
  financialViability: "Financial viability",
  strategicAdvantage: "Strategic advantage",
  adoptionPotential: "Adoption potential",
  technicalFeasibility: "Technical feasibility",
  evidenceQuality: "Evidence quality",
  risk: "Risk",
  scalability: "Scalability",
} as const;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function ModelMetric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="lab-decision-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export function DecisionModelsDashboard({
  opportunity,
  opportunities,
  weights,
  economics,
}: {
  opportunity: Opportunity;
  opportunities: Opportunity[];
  weights: LabWeights;
  economics: MonteCarloConfig;
}) {
  const [tornadoStep, setTornadoStep] = useState(10);
  const [addressableCustomers, setAddressableCustomers] = useState(500);
  const [robustnessConfig, setRobustnessConfig] = useState({ samples: 300, jitter: 20, seed: 9021 });
  const [validationConfig, setValidationConfig] = useState({ testPower: 65, costIndex: 30 });
  const deferredRobustnessConfig = useDeferredValue(robustnessConfig);

  const tornado = useMemo(
    () => calculateTornadoSensitivity(opportunity, weights, tornadoStep),
    [opportunity, tornadoStep, weights],
  );
  const breakEven = useMemo(() => calculateBreakEven({
    annualPrice: economics.price,
    acquisitionCost: economics.cac,
    churn: economics.churn,
    grossMargin: economics.margin,
    fixedCost: economics.initialInvestment,
    addressableCustomers,
    expectedAdoption: economics.adoption,
  }), [addressableCustomers, economics]);
  const robustness = useMemo(
    () => calculateRankRobustness(opportunities, weights, deferredRobustnessConfig),
    [deferredRobustnessConfig, opportunities, weights],
  );
  const validation = useMemo(
    () => calculateValidationPriority(opportunity, validationConfig.testPower, validationConfig.costIndex),
    [opportunity, validationConfig],
  );
  const opportunityNames = useMemo(
    () => new Map(opportunities.map((candidate) => [candidate.id, candidate.name])),
    [opportunities],
  );

  return <>
    <article className="lab-model-panel">
      <header><div><span>09 - TORNADO SENSITIVITY</span><h3>Which assumption moves the score most?</h3></div><p>Each row changes one dimension while all others remain fixed. This model does not enter the ranking.</p></header>
      <ModelIntro {...MODEL_GUIDES["Tornado Sensitivity"]} />
      <div className="lab-control-grid">
        <label>One-at-a-time change - +/-{tornadoStep} points<input type="range" min="5" max="25" step="5" value={tornadoStep} onChange={(event) => setTornadoStep(Number(event.target.value))} /><SliderImpact items={["MCDA range", "Driver order", "Validation priority"]} /></label>
      </div>
      <div className="lab-tornado" role="img" aria-label={`One-at-a-time sensitivity around a baseline MCDA score of ${tornado.baseline}. ${tornado.items.map((item) => `${DIMENSION_LABELS[item.key]} changes the score by ${item.spread} points`).join(". ")}.`}>
        <div className="lab-tornado-axis"><span>0</span><strong>Baseline {tornado.baseline}</strong><span>100</span></div>
        {tornado.items.map((item) => {
          const minimum = Math.min(item.scoreLow, item.scoreHigh);
          const maximum = Math.max(item.scoreLow, item.scoreHigh);
          return <div className="lab-tornado-row" key={item.key}>
            <span>{DIMENSION_LABELS[item.key]}<small>input {item.inputLow}-{item.inputHigh}</small></span>
            <i><b style={{ left: `${minimum}%`, width: `${Math.max(1, maximum - minimum)}%` }} /><em style={{ left: `${tornado.baseline}%` }} /></i>
            <strong>{minimum.toFixed(1)}-{maximum.toFixed(1)}</strong>
          </div>;
        })}
      </div>
      <div className="lab-chart-reading"><strong>How to read it</strong><p>Longer cyan ranges indicate greater local sensitivity. Risk may move in the opposite direction because lower risk is preferable. Interactions between dimensions are intentionally held outside this one-at-a-time view.</p></div>
    </article>

    <article className="lab-model-panel">
      <header><div><span>10 - BREAK-EVEN</span><h3>Connect unit economics to an operating threshold.</h3></div><p>Uses the visible Monte Carlo price, CAC, churn, margin, adoption and initial-capital assumptions.</p></header>
      <ModelIntro {...MODEL_GUIDES["Break-even"]} />
      <div className="lab-control-grid">
        <label>Addressable customers - {addressableCustomers}<input type="range" min="25" max="5000" step="25" value={addressableCustomers} onChange={(event) => setAddressableCustomers(Number(event.target.value))} /><SliderImpact items={["Break-even adoption", "Market feasibility", "Safety margin"]} /></label>
      </div>
      <div className="lab-decision-metrics">
        <ModelMetric label="Contribution / retained customer" value={usd.format(breakEven.contributionPerCustomer)} note="Annual retained revenue times gross margin, less acquisition cost." />
        <ModelMetric label="Break-even customers" value={breakEven.breakEvenCustomers ?? "n/a"} note="Initial capital divided by positive contribution per customer." />
        <ModelMetric label="Break-even adoption" value={breakEven.breakEvenAdoption === null ? "n/a" : `${breakEven.breakEvenAdoption}%`} note="Required customers as a share of the editable addressable-customer assumption." />
        <ModelMetric label="Payback at current adoption" value={breakEven.paybackMonths === null ? "n/a" : `${breakEven.paybackMonths} mo.`} note="Illustrative months to recover initial capital at the current adoption assumption." />
      </div>
      <p className={`lab-model-status ${breakEven.feasibleWithinMarket ? "is-positive" : "is-warning"}`}><strong>{breakEven.status}</strong> Current modeled customers: {breakEven.currentCustomers}. Revenue at break-even: {breakEven.revenueAtBreakEven === null ? "not available" : usd.format(breakEven.revenueAtBreakEven)}.</p>
      <div className="lab-chart-reading"><strong>Visible formula</strong><p>Retained contribution = price x (1 - churn) x margin - CAC. Break-even customers = initial capital / retained contribution. Taxes, timing, working capital and cohort behavior are excluded.</p></div>
    </article>

    <article className="lab-model-panel">
      <header><div><span>11 - RANK ROBUSTNESS</span><h3>Does the shortlist survive different reasonable weights?</h3></div><p>SMAA-style seeded perturbations recalculate the public ranking without historical calibration.</p></header>
      <ModelIntro {...MODEL_GUIDES["Rank Robustness"]} />
      <div className="lab-control-grid">
        <label>Weight samples - {robustnessConfig.samples}<input type="range" min="50" max="600" step="50" value={robustnessConfig.samples} onChange={(event) => setRobustnessConfig((current) => ({ ...current, samples: Number(event.target.value) }))} /><SliderImpact items={["Frequency precision", "Average rank", "Rank range"]} /></label>
        <label>Weight jitter - +/-{robustnessConfig.jitter}%<input type="range" min="0" max="40" step="5" value={robustnessConfig.jitter} onChange={(event) => setRobustnessConfig((current) => ({ ...current, jitter: Number(event.target.value) }))} /><SliderImpact items={["Ranking stress", "Top-three retention", "Leader stability"]} /></label>
        <label>Seed<input type="number" min="1" max="2147483646" value={robustnessConfig.seed} onChange={(event) => setRobustnessConfig((current) => ({ ...current, seed: Number(event.target.value) }))} /><small className="lab-control-note">The same seed, weights and opportunities reproduce the same table.</small></label>
      </div>
      <div className="lab-robustness-table" role="region" aria-label="Rank robustness results" tabIndex={0}>
        <table>
          <thead><tr><th>Opportunity</th><th>Base</th><th>Mean</th><th>Range</th><th>#1</th><th>Top 3</th></tr></thead>
          <tbody>{robustness.items.map((item) => <tr key={item.id}><td><strong>{item.id}</strong><span>{opportunityNames.get(item.id)}</span></td><td>{item.baselineRank}</td><td>{item.meanRank}</td><td>{item.bestRank}-{item.worstRank}</td><td>{item.firstPlaceFrequency}%</td><td>{item.topThreeFrequency}%</td></tr>)}</tbody>
        </table>
      </div>
      <p className="lab-model-note">{robustness.samples} reproducible samples at +/-{robustness.jitter}% jitter. Narrow rank ranges indicate greater stability. Most stable in this run: {robustness.mostStableId ?? "not available"}.</p>
    </article>

    <article className="lab-model-panel">
      <header><div><span>12 - VALIDATION PRIORITY</span><h3>Which evidence request should come next?</h3></div><p>A value-of-information-style ordinal index. It never triggers research, spending or an investment action.</p></header>
      <ModelIntro {...MODEL_GUIDES["Validation Priority"]} />
      <div className="lab-control-grid">
        <label>Expected test power - {validationConfig.testPower}%<input type="range" min="5" max="95" step="5" value={validationConfig.testPower} onChange={(event) => setValidationConfig((current) => ({ ...current, testPower: Number(event.target.value) }))} /><SliderImpact items={["Expected evidence gain", "Priority order", "Decision learning"]} /></label>
        <label>Validation cost index - {validationConfig.costIndex}<input type="range" min="0" max="100" step="5" value={validationConfig.costIndex} onChange={(event) => setValidationConfig((current) => ({ ...current, costIndex: Number(event.target.value) }))} /><SliderImpact items={["Cost penalty", "Priority order", "Experiment choice"]} /></label>
      </div>
      <div className="lab-validation-priority">
        {validation.items.map((item, index) => <article key={item.agentName}><span>0{index + 1} - {item.agentName}</span><strong>{item.priority}</strong><p>{item.evidenceRequest}</p><small>Gap {item.evidenceGap} - expected gain {item.expectedEvidenceGain} - decision sensitivity {item.decisionSensitivity} - cost penalty {item.costPenalty}</small></article>)}
      </div>
      <div className="lab-chart-reading"><strong>Visible heuristic</strong><p>Priority = 55% expected evidence gain + 45% decision sensitivity - validation-cost penalty, bounded to 0-100. It ranks learning tasks only; it is not monetary EVSI or a claim that the evidence will be obtained.</p></div>
    </article>
  </>;
}
