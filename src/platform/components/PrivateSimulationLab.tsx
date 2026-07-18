"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeScenarios, DEMO_MODEL_DISCLOSURE, simulateScenarioOutcomes } from "@/src/platform/demo-models";
import type { ScenarioInput } from "@/src/platform/demo-models";
import { useActiveMission } from "../active-mission";

type ScenarioField = Exclude<keyof ScenarioInput, "id">;
type ScenarioDraft = ScenarioInput;
type SensitivityLens = "uncertainty" | "unit_economics" | "capital" | "market" | "horizon";
type RecommendedAgent = { id: string; displayName: string; domain: string; specialization: string; capabilitySummary: string; score: number; reasons: string[] };

const SENSITIVITY_LENSES: Array<{ id: SensitivityLens; label: string }> = [
  { id: "uncertainty", label: "Uncertainty" }, { id: "unit_economics", label: "Unit economics" },
  { id: "capital", label: "Capital" }, { id: "market", label: "Market demand" }, { id: "horizon", label: "Strategic horizon" },
];

const INITIAL_SCENARIOS: ScenarioDraft[] = [
  { id: "Adverse", likelihood: 25, annualRevenue: 1_200_000, grossMarginPercent: 42, annualOperatingCost: 760_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 30 },
  { id: "Base", likelihood: 50, annualRevenue: 2_400_000, grossMarginPercent: 55, annualOperatingCost: 1_050_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 18 },
  { id: "Favorable", likelihood: 25, annualRevenue: 4_100_000, grossMarginPercent: 63, annualOperatingCost: 1_500_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 24 },
];

const PUBLIC_DEMO_AGENTS: Omit<RecommendedAgent, "score" | "reasons">[] = [
  { id: "PUBLIC-MATHEMATICS", displayName: "Mathematics", domain: "Public Lab", specialization: "Uncertainty and sensitivity", capabilitySummary: "Applies transparent demonstrative models to declared ranges." },
  { id: "PUBLIC-FINANCE", displayName: "Finance", domain: "Public Lab", specialization: "Economics and capital", capabilitySummary: "Examines bounded economics and staged capital assumptions." },
  { id: "PUBLIC-STRATEGY", displayName: "Strategy", domain: "Public Lab", specialization: "Alternatives and horizon", capabilitySummary: "Frames alternatives, timing and strategic constraints." },
  { id: "PUBLIC-MARKETING", displayName: "Marketing", domain: "Public Lab", specialization: "Demand and adoption", capabilitySummary: "Examines demand, adoption and market-evidence gaps." },
];

function recommendPublicDemoAgents(brief: string, lenses: readonly SensitivityLens[]): RecommendedAgent[] {
  const normalized = brief.toLocaleLowerCase();
  return PUBLIC_DEMO_AGENTS.map((agent) => {
    const reasons: string[] = [];
    let score = 1;
    if (agent.displayName === "Mathematics" && (lenses.includes("uncertainty") || /risk|uncertain|probab|sensitiv/.test(normalized))) { score += 4; reasons.push("uncertainty lens"); }
    if (agent.displayName === "Finance" && (lenses.includes("capital") || lenses.includes("unit_economics") || /capital|cost|margin|revenue/.test(normalized))) { score += 4; reasons.push("economics lens"); }
    if (agent.displayName === "Strategy" && (lenses.includes("horizon") || /strateg|horizon|timing|alternative/.test(normalized))) { score += 4; reasons.push("strategic-horizon lens"); }
    if (agent.displayName === "Marketing" && (lenses.includes("market") || /market|demand|customer|adoption/.test(normalized))) { score += 4; reasons.push("market-demand lens"); }
    return { ...agent, score, reasons: reasons.length ? reasons : ["fallback public-demo coverage"] };
  }).sort((left, right) => right.score - left.score || left.displayName.localeCompare(right.displayName));
}

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
  const { mission, ready, saveCore, saveScenarioPlan } = useActiveMission();
  const restored = useRef(false);
  const [scenarios, setScenarios] = useState<ScenarioDraft[]>(INITIAL_SCENARIOS);
  const [discountRatePercent, setDiscountRatePercent] = useState(12);
  const [samples, setSamples] = useState(2_000);
  const [seed, setSeed] = useState(240719);
  const [hasRun, setHasRun] = useState(false);
  const [missionBrief, setMissionBrief] = useState("");
  const [lenses, setLenses] = useState<SensitivityLens[]>(["uncertainty", "unit_economics"]);
  const [recommendations, setRecommendations] = useState<RecommendedAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<RecommendedAgent | null>(null);
  const [routingNotice, setRoutingNotice] = useState("Describe the mission and choose sensitivity lenses to rank the four public demo agents.");

  const input = useMemo(() => ({ scenarios, discountRatePercent }), [scenarios, discountRatePercent]);
  const analysis = useMemo(() => analyzeScenarios(input), [input]);
  const simulation = useMemo(() => simulateScenarioOutcomes(input, { samples, seed }), [input, samples, seed]);
  const likelihoodTotal = scenarios.reduce((total, scenario) => total + scenario.likelihood, 0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || !ready || restored.current) return;
      restored.current = true;
      if (!mission) return;
      const core = mission.core;
      setMissionBrief([core.title, core.decision, core.domain ? `Context: ${core.domain}.` : "", core.constraints ? `Constraints: ${core.constraints}` : ""].filter(Boolean).join("\n").slice(0, 800));
      if (mission.scenarioPlan) {
        setScenarios(mission.scenarioPlan.scenarios);
        setDiscountRatePercent(mission.scenarioPlan.discountRatePercent);
        setSamples(mission.scenarioPlan.samples);
        setSeed(mission.scenarioPlan.seed);
        setRoutingNotice("Active mission assumptions restored. Rank and select one public demo agent to label the new run.");
      }
    });
    return () => { active = false; };
  }, [mission, ready]);

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
    if (!selectedAgent) {
      setRoutingNotice("Select one recommended agent before confirming the solution package.");
      setHasRun(false);
      return;
    }
    saveCore({
      title: mission?.core.title || missionBrief.trim().split(/[.!?\n]/)[0].slice(0, 120),
      decision: mission?.core.decision || missionBrief.trim(),
    }, "simulation");
    saveScenarioPlan({ scenarios, discountRatePercent, samples, seed, selectedAgentId: selectedAgent.id }, "simulation");
    setHasRun(true);
  }

  function recommendAgent() {
    setSelectedAgent(null);
    setHasRun(false);
    if (missionBrief.trim().length < 20) {
      setRecommendations([]);
      setRoutingNotice("Describe the mission in at least 20 characters before ranking the public demo agents.");
      return;
    }
    setRecommendations(recommendPublicDemoAgents(missionBrief, lenses));
    setRoutingNotice("Transparent local rules ranked Mathematics, Finance, Strategy and Marketing. Choose one as the interpretive label for this model run.");
  }

  function toggleLens(lens: SensitivityLens) {
    setLenses((current) => current.includes(lens) ? current.filter((item) => item !== lens) : [...current, lens]);
    setSelectedAgent(null);
    setHasRun(false);
  }

  return <section className="private-simulation" aria-labelledby="private-simulation-title">
    <header className="platform-page-heading">
      <div><p>SIMULATION LAB · PUBLIC DEMO MODELS</p><h1 id="private-simulation-title">Make uncertainty visible before a human decision.</h1></div>
      <p>Bounded scenario planning with declared assumptions. Identical inputs and seed produce identical demonstrative results; this is not a forecast, valuation, or investment recommendation.</p>
    </header>

    <div className="private-simulation__layout">
      <form className="platform-panel private-simulation__form" onSubmit={(event) => { event.preventDefault(); runModels(); }}>
        <header><div><span>DECLARED INPUTS</span><h2>Scenario configuration</h2></div><small>All currency values USD</small></header>
        <section className="private-simulation__routing" aria-labelledby="simulation-routing-title">
          <header><div><span>TRANSPARENT PUBLIC ROUTING</span><h3 id="simulation-routing-title">Declared lenses rank the four visible demo agents</h3></div><button className="platform-secondary-button" type="button" onClick={recommendAgent}>Rank public agents</button></header>
          <label>Mission brief<textarea maxLength={800} value={missionBrief} onChange={(event) => { setMissionBrief(event.target.value); setSelectedAgent(null); setHasRun(false); }} placeholder="Example: assess a renewable-energy opportunity with uncertain demand, capital needs and a five-year horizon." /></label>
          <fieldset><legend>Sensitivity lenses</legend><div>{SENSITIVITY_LENSES.map((lens) => <label key={lens.id}><input type="checkbox" checked={lenses.includes(lens.id)} onChange={() => toggleLens(lens.id)} />{lens.label}</label>)}</div></fieldset>
          <p role="status" aria-live="polite">{routingNotice}</p>
          {recommendations.length > 0 && <div className="private-simulation__agent-options">{recommendations.map((agent) => <button type="button" key={agent.id} className={selectedAgent?.id === agent.id ? "is-selected" : ""} onClick={() => { setSelectedAgent(agent); setHasRun(false); setRoutingNotice(`${agent.id} selected. Confirm the scenario calculation to produce the solution package.`); }}><span>{agent.id} · {agent.domain}</span><strong>{agent.displayName}</strong><small>{agent.specialization} — {agent.reasons.join("; ")}</small></button>)}</div>}
        </section>
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
        <ul className="platform-rule-list">{DEMO_MODEL_DISCLOSURE.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Limits</h3>
        <ul className="platform-rule-list">{DEMO_MODEL_DISCLOSURE.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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

    {hasRun && selectedAgent && <section className="platform-panel private-simulation__solution" aria-labelledby="simulation-solution-title"><header><div><span>DEMO MODEL PACKAGE · HUMAN REVIEW REQUIRED</span><h2 id="simulation-solution-title">{selectedAgent.id} · {selectedAgent.displayName}</h2></div><small>{selectedAgent.domain} · {selectedAgent.specialization}</small></header><p>The selected public demo agent is an interpretive label chosen by transparent local rules; no private profile or language model executed. The NPV and sampling equations remain exactly the declared, reproducible model shown above.</p><dl><div><dt>ROUTING REASONS</dt><dd>{selectedAgent.reasons.join(" · ")}</dd></div><div><dt>MODEL OUTPUT</dt><dd>Expected NPV {formatMoney(analysis.expectedNetPresentValue)} · loss probability {formatPercent(analysis.probabilityOfLossPercent)}</dd></div><div><dt>REVIEW NEXT</dt><dd>Validate evidence, challenge assumptions, then record the human decision.</dd></div></dl><div className="private-flow-actions"><Link href="/app/scenarios">Continue with these inputs in Scenario Lab →</Link><Link href="/app/execution-feasibility">Continue to Execution Feasibility →</Link></div></section>}

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
