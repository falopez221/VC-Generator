"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { aggregateMission, analyzeScenarios, DEMO_MODEL_DISCLOSURE } from "@/src/platform/demo-models";
import { PUBLIC_MODEL_CATALOG } from "@/src/lab/model-catalog";
import type { MissionCandidateInput, ScenarioInput } from "@/src/platform/demo-models/types";
import { useActiveMission } from "../active-mission";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const n = (raw: string, fallback: number) => Number.isFinite(Number(raw)) ? Number(raw) : fallback;

const DEFAULT_SCENARIOS: ScenarioInput[] = [
  { id: "Adverse", likelihood: 25, annualRevenue: 1_200_000, grossMarginPercent: 42, annualOperatingCost: 760_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 30 },
  { id: "Base", likelihood: 50, annualRevenue: 2_400_000, grossMarginPercent: 55, annualOperatingCost: 1_050_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 18 },
  { id: "Favorable", likelihood: 25, annualRevenue: 4_100_000, grossMarginPercent: 63, annualOperatingCost: 1_500_000, initialCapital: 1_800_000, horizonYears: 5, uncertaintyPercent: 24 },
];

function Heading({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return <header className="platform-page-heading"><div><p>{eyebrow} · PRIVATE PLANNING</p><h1>{title}</h1></div><p>{lede}</p></header>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export function ScenarioWorkbench() {
  const { mission, ready, saveScenarioPlan } = useActiveMission();
  const restored = useRef(false);
  const [scenarios, setScenarios] = useState(DEFAULT_SCENARIOS);
  const [rate, setRate] = useState(12);
  const [recorded, setRecorded] = useState(false);
  const result = useMemo(() => analyzeScenarios({ scenarios, discountRatePercent: rate }), [scenarios, rate]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || !ready || restored.current) return;
      restored.current = true;
      if (!mission?.scenarioPlan) return;
      setScenarios(mission.scenarioPlan.scenarios);
      setRate(mission.scenarioPlan.discountRatePercent);
    });
    return () => { active = false; };
  }, [mission, ready]);
  const persist = (nextScenarios: ScenarioInput[], nextRate: number) => saveScenarioPlan({ scenarios: nextScenarios, discountRatePercent: nextRate, samples: mission?.scenarioPlan?.samples ?? 2_000, seed: mission?.scenarioPlan?.seed ?? 240_719, selectedAgentId: mission?.scenarioPlan?.selectedAgentId }, "scenarios");
  const change = (row: number, field: keyof ScenarioInput, value: string) => {
    const next = scenarios.map((item, index) => index === row ? { ...item, [field]: field === "id" ? value.slice(0, 48) : n(value, Number(item[field]) || 0) } : item);
    setScenarios(next); persist(next, rate); setRecorded(false);
  };
  return <section className="private-workbench"><Heading eyebrow="SCENARIO LAB" title="Compare declared operating conditions." lede="Discounted scenario analysis is deterministic and bounded. It compares supplied assumptions; it does not forecast performance or authorize capital." />
    <div className="private-workbench__split"><form className="platform-panel" onSubmit={event => { event.preventDefault(); persist(scenarios, rate); setRecorded(true); }}><header><div><span>ASSUMPTION SET</span><h2>Three-condition comparison</h2></div><label>Discount rate (%)<input type="number" min="0" max="100" step=".1" value={rate} onChange={e => { const next = n(e.target.value, rate); setRate(next); persist(scenarios, next); setRecorded(false); }} /></label></header><div className="private-workbench__table"><table><caption className="sr-only">Editable scenario assumptions</caption><thead><tr><th>Scenario</th><th>Weight</th><th>Revenue</th><th>Margin</th><th>Costs</th><th>Capital</th><th>Years</th><th>Range</th></tr></thead><tbody>{scenarios.map((s, index) => <tr key={index}>{(["id", "likelihood", "annualRevenue", "grossMarginPercent", "annualOperatingCost", "initialCapital", "horizonYears", "uncertaintyPercent"] as const).map(field => <td key={field}><input aria-label={`${s.id} ${field}`} type={field === "id" ? "text" : "number"} min={field === "horizonYears" ? 1 : 0} max={field === "grossMarginPercent" || field === "uncertaintyPercent" ? 100 : undefined} value={s[field] ?? ""} onChange={e => change(index, field, e.target.value)} /></td>)}</tr>)}</tbody></table></div><div className="private-workbench__action"><small>Changes are carried into Simulation and Feasibility on this device. Weights normalize to 100% automatically.</small><button className="platform-primary-link">Confirm calculation</button></div><p className="sr-only" aria-live="polite">{recorded ? "Scenario calculation confirmed for human review." : "Assumptions changed; calculation is not confirmed."}</p></form>
      <aside className="platform-panel"><header><div><span>INTERPRETATION BOUNDARY</span><h2>Required review</h2></div></header><ul className="platform-rule-list">{DEMO_MODEL_DISCLOSURE.assumptions.slice(0, 3).map(item => <li key={item}>{item}</li>)}</ul><p className="platform-caveat">A positive expected value with weak evidence, uncertain demand, or untested constraints must remain under human review.</p></aside></div>
    <section className="platform-panel"><header><div><span>COMPARISON OUTPUT</span><h2>Expected discounted outcome</h2></div><small>{recorded ? "confirmed calculation" : "assumption preview"}</small></header><div className="private-simulation__metrics"><Metric label="Expected NPV" value={money.format(result.expectedNetPresentValue)} detail={`Declared sensitivity ${money.format(result.lowerExpectedNetPresentValue)} to ${money.format(result.upperExpectedNetPresentValue)}`} /><Metric label="Loss probability" value={`${pct.format(result.probabilityOfLossPercent)}%`} detail="Weighted supplied scenarios" /><Metric label="P10 / Median / P90" value={`${money.format(result.p10NetPresentValue)} / ${money.format(result.medianNetPresentValue)} / ${money.format(result.p90NetPresentValue)}`} detail="Discrete scenario distribution" /></div><div className="platform-table-wrap"><table className="platform-data-table"><thead><tr><th>Condition</th><th>Normalized weight</th><th>Annual contribution</th><th>NPV</th><th>Declared sensitivity</th></tr></thead><tbody>{result.scenarios.map(s => <tr key={s.id}><td>{s.id}</td><td>{pct.format(s.likelihoodPercent)}%</td><td>{money.format(s.annualContribution)}</td><td>{money.format(s.netPresentValue)}</td><td>{money.format(s.lowerNetPresentValue)} to {money.format(s.upperNetPresentValue)}</td></tr>)}</tbody></table></div><div className="private-flow-actions"><Link href="/app/simulation">Refine in Simulation Lab</Link><Link href="/app/execution-feasibility">Continue to Execution Feasibility →</Link></div></section></section>;
}

const INITIAL_PORTFOLIO: MissionCandidateInput[] = [
  { id: "Circular industrial software", allocation: 40, score: 75, confidencePercent: 62, riskPercent: 40 },
  { id: "Clinical operations tooling", allocation: 35, score: 71, confidencePercent: 54, riskPercent: 52 },
  { id: "Grid flexibility platform", allocation: 25, score: 68, confidencePercent: 70, riskPercent: 35 },
];

export function PortfolioWorkbench() {
  const [items, setItems] = useState(INITIAL_PORTFOLIO);
  const result = useMemo(() => aggregateMission({ candidates: items }), [items]);
  const update = (index: number, field: keyof MissionCandidateInput, value: string) => setItems(current => current.map((item, i) => i === index ? { ...item, [field]: field === "id" ? value.slice(0, 80) : n(value, Number(item[field]) || 0) } : item));
  return <section className="private-workbench"><Heading eyebrow="PORTFOLIO LAB" title="Preserve trade-offs when comparing alternatives." lede="The aggregate is a transparent planning aid. Allocation, evidence confidence and risk are user-declared inputs, not a recommendation to invest or deploy." />
    <div className="private-workbench__split"><section className="platform-panel"><header><div><span>COMPARISON SET</span><h2>Editable candidate mix</h2></div><small>Maximum 100 candidates</small></header><div className="private-workbench__table"><table><thead><tr><th>Alternative</th><th>Allocation</th><th>Comparative score</th><th>Evidence confidence</th><th>Risk exposure</th></tr></thead><tbody>{items.map((item, index) => <tr key={index}>{(["id", "allocation", "score", "confidencePercent", "riskPercent"] as const).map(field => <td key={field}><input aria-label={`${item.id} ${field}`} type={field === "id" ? "text" : "number"} min="0" max={field === "id" ? undefined : "100"} value={item[field]} onChange={e => update(index, field, e.target.value)} /></td>)}</tr>)}</tbody></table></div></section><aside className="platform-panel"><header><div><span>REVIEW FLAG</span><h2>Not a single-answer ranking</h2></div></header><p className="platform-caveat">Compare the contribution table with concentration and risk. A high index never overrides poor evidence or human governance.</p><button type="button" className="platform-secondary-button" onClick={() => setItems(current => [...current, { id: `Alternative ${current.length + 1}`, allocation: 10, score: 50, confidencePercent: 50, riskPercent: 50 }].slice(0, 12))}>Add alternative</button></aside></div>
    <section className="platform-panel"><header><div><span>TRANSPARENT AGGREGATE</span><h2>Portfolio comparison results</h2></div><small>Inputs normalized by allocation</small></header><div className="private-simulation__metrics private-simulation__metrics--four"><Metric label="Planning index" value={pct.format(result.missionIndex)} detail="Evidence and risk-adjusted contribution" /><Metric label="Evidence coverage" value={`${pct.format(result.evidenceCoveragePercent)}%`} detail="Declared confidence weighting" /><Metric label="Risk exposure" value={`${pct.format(result.riskExposurePercent)}%`} detail="Declared risk weighting" /><Metric label="Concentration" value={pct.format(result.concentrationIndex)} detail="Herfindahl-style allocation measure" /></div><div className="platform-table-wrap"><table className="platform-data-table"><thead><tr><th>Alternative</th><th>Allocation</th><th>Adjusted contribution</th><th>Risk contribution</th></tr></thead><tbody>{result.contributions.map(item => <tr key={item.id}><td>{item.id}</td><td>{pct.format(item.allocationPercent)}%</td><td>{pct.format(item.evidenceAdjustedScoreContribution)}</td><td>{pct.format(item.riskContribution)}</td></tr>)}</tbody></table></div><ul className="platform-rule-list">{result.reviewNotes.map(note => <li key={note}>{note}</li>)}</ul></section></section>;
}

export function ModelWorkbench() {
  const [family, setFamily] = useState("All");
  const families = ["All", ...Array.from(new Set(PUBLIC_MODEL_CATALOG.map(model => model.family)))];
  const visible = family === "All" ? PUBLIC_MODEL_CATALOG : PUBLIC_MODEL_CATALOG.filter(model => model.family === family);
  return <section className="private-workbench"><Heading eyebrow="MODEL LIBRARY" title="Choose models by question and failure mode." lede="This library is a governed catalogue. Models calculate bounded comparative outputs; they do not provide private scoring, investment advice, or autonomous decisions." />
    <section className="platform-panel"><header><div><span>MODEL CATALOGUE</span><h2>{visible.length} documented methods</h2></div><label>Family<select value={family} onChange={e => setFamily(e.target.value)}>{families.map(item => <option key={item}>{item}</option>)}</select></label></header><div className="private-model-grid">{visible.map(model => <article key={model.id}><span>{model.family}</span><h3>{model.name}</h3><p>{model.shows}</p><dl><div><dt>USE</dt><dd>{model.matters}</dd></div><div><dt>LIMIT</dt><dd>{model.limitation}</dd></div></dl></article>)}</div></section>
    <section className="platform-panel"><header><div><span>PRIVATE PLANNING EXTENSIONS</span><h2>Available in this workspace</h2></div></header><div className="private-model-grid">{[["Discounted scenarios", "Declared operating conditions and a bounded NPV sensitivity range."], ["Seeded Monte Carlo", "Reproducible sampling over declared scenario uncertainty only."], ["Mission aggregate", "Allocation, confidence and risk comparison with concentration flags."]].map(([name, description]) => <article key={name}><span>PRIVATE PLANNING</span><h3>{name}</h3><p>{description}</p><small>Requires a human interpretation and decision record.</small></article>)}</div></section></section>;
}

type Challenge = { id: string; likelihood: number; impact: number; evidence: number; owner: string };
const INITIAL_CHALLENGES: Challenge[] = [
  { id: "Demand assumption is not independently verified", likelihood: 4, impact: 5, evidence: 2, owner: "Research owner" },
  { id: "Unit economics depend on one acquisition channel", likelihood: 3, impact: 4, evidence: 2, owner: "Mission owner" },
  { id: "Regulatory dependency could delay adoption", likelihood: 3, impact: 5, evidence: 3, owner: "Domain reviewer" },
];

export function RedTeamWorkbench() {
  const [challenges, setChallenges] = useState(INITIAL_CHALLENGES);
  const [reviewed, setReviewed] = useState(false);
  const update = (index: number, field: keyof Challenge, value: string) => setChallenges(current => current.map((item, i) => i === index ? { ...item, [field]: field === "id" || field === "owner" ? value.slice(0, 120) : Math.min(5, Math.max(1, n(value, Number(item[field]) || 1))) } : item));
  const critical = challenges.filter(item => item.likelihood * item.impact >= 15 || item.evidence <= 2);
  return <section className="private-workbench"><Heading eyebrow="RED TEAM" title="Make objections inspectable before escalation." lede="This bounded review tool records challenge statements and ordinal exposure. It does not perform offensive testing, make claims of verification, or replace accountable reviewers." />
    <section className="platform-panel"><header><div><span>CHALLENGE REGISTER</span><h2>Assumption and failure-mode review</h2></div><button type="button" className="platform-secondary-button" onClick={() => setChallenges(current => [...current, { id: "New challenge", likelihood: 3, impact: 3, evidence: 3, owner: "Unassigned reviewer" }].slice(0, 12))}>Add challenge</button></header><div className="private-workbench__table"><table><thead><tr><th>Challenge statement</th><th>Likelihood (1–5)</th><th>Impact (1–5)</th><th>Evidence strength (1–5)</th><th>Review owner</th><th>Flag</th></tr></thead><tbody>{challenges.map((item, index) => { const level = item.likelihood * item.impact; const flagged = level >= 15 || item.evidence <= 2; return <tr key={index}>{(["id", "likelihood", "impact", "evidence", "owner"] as const).map(field => <td key={field}><input aria-label={`${item.id} ${field}`} type={field === "id" || field === "owner" ? "text" : "number"} min={field === "id" || field === "owner" ? undefined : 1} max={field === "id" || field === "owner" ? undefined : 5} value={item[field]} onChange={e => { update(index, field, e.target.value); setReviewed(false); }} /></td>)}<td><span className={`risk-label ${flagged ? "is-high" : "is-controlled"}`}>{flagged ? "Needs review" : "Bounded"}</span></td></tr>; })}</tbody></table></div><div className="private-workbench__action"><small>Ordinal values are a prioritization aid, not calibrated probabilities.</small><button type="button" className="platform-primary-link" onClick={() => setReviewed(true)}>Record human review</button></div><p className="sr-only" aria-live="polite">{reviewed ? "Human review recorded locally for this browser session." : "Review has not been recorded."}</p></section>
    <section className="platform-panel"><header><div><span>ESCALATION VIEW</span><h2>{critical.length} challenge{critical.length === 1 ? "" : "s"} need{critical.length === 1 ? "s" : ""} evidence or mitigation</h2></div><small>{reviewed ? "review acknowledgement recorded" : "awaiting human acknowledgement"}</small></header><div className="private-red-team-grid">{critical.map(item => <article key={item.id}><span>RISK SCORE {item.likelihood * item.impact} / 25</span><h3>{item.id}</h3><p>Owner: {item.owner} · Evidence strength: {item.evidence}/5</p><small>Required next step: name disconfirming evidence or a mitigation before advancing.</small></article>)}{critical.length === 0 && <p className="platform-caveat">No current rows meet the configured flag. That does not prove the mission is safe or ready to advance.</p>}</div></section></section>;
}
