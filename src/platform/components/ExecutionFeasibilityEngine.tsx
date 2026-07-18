"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_FEASIBILITY_INPUT, estimateExecutionFeasibility, type FeasibilityInput, type FeasibilityResult } from "@/src/private/feasibility";

type Tab = "summary" | "wbs" | "costs" | "capabilities" | "options" | "roadmap";
type ReviewState = "Not reviewed" | "Return for revision" | "Advance with conditions";

const STORAGE_KEY = "vg-execution-feasibility-draft-v1";
const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const MONEY_PRECISE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "summary", label: "Estimate" }, { id: "wbs", label: "WBS & critical path" }, { id: "costs", label: "Costs" },
  { id: "capabilities", label: "Gaps & readiness" }, { id: "options", label: "Build / buy / partner" }, { id: "roadmap", label: "Roadmap" },
];

function formatMoney(value: number) { return MONEY.format(value); }
function formatPreciseMoney(value: number) { return MONEY_PRECISE.format(value); }
function escapeHtml(value: string) { return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character] ?? character); }
function reportFileName(name: string) { return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "implementation"}-feasibility-report.html`; }

function buildReport(result: FeasibilityResult, input: FeasibilityInput, review: ReviewState, note: string) {
  const rows = (values: string[][]) => values.map((cells) => `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
  const list = (values: string[]) => `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
  const readiness = result.readiness.components.map((item) => [item.label, `${item.score}/100`, `${item.weight}%`, item.status, item.evidence]);
  const wbs = result.tasks.map((task) => [task.id, task.phase, task.title, task.owner, task.dependencies.join(", ") || "—", `${task.optimisticWeeks} / ${task.likelyWeeks} / ${task.pessimisticWeeks} weeks`, task.critical ? "Critical" : `${task.floatWeeks} weeks float`, task.sourcing]);
  const costs = result.cost.categories.map((item) => [item.category, item.kind, formatMoney(item.amount)]);
  const options = result.options.map((item) => [item.label, `${item.timeP50Months} months`, formatMoney(item.expectedCost), item.control, item.risk, item.lockIn, item.intellectualProperty]);
  const gaps = result.capabilities.map((item) => [item.capability, item.required, item.status, item.action, `${item.scheduleImpactWeeks} weeks`]);
  const roadmap = result.roadmap.map((item) => [item.label, item.outcome, item.owner, item.gate, item.metric, `M${item.p50Month} / M${item.p90Month}`]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(input.proposalName)} — Execution Feasibility Report</title><style>
  :root{font-family:Inter,Arial,sans-serif;color:#132334;background:#eef3f6}*{box-sizing:border-box}body{margin:0}main{max-width:1120px;margin:auto;background:white;padding:56px}header{border-bottom:4px solid #1679a8;padding-bottom:28px}h1{font-size:38px;margin:8px 0 16px}h2{margin-top:42px;color:#0b6087;border-bottom:1px solid #cddbe2;padding-bottom:8px}h3{margin:0 0 8px}.kicker,.label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#217ca3;font-weight:700}.lede{max-width:800px;color:#506371;line-height:1.6}.metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #cddbe2;margin:24px 0}.metric{padding:18px;border-right:1px solid #cddbe2}.metric:last-child{border:0}.metric strong{display:block;font-size:22px;margin-top:8px}.metric small{color:#647986}table{width:100%;border-collapse:collapse;font-size:12px;margin:16px 0 30px}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #dce5e9}th{background:#edf4f7;color:#31586a}ul{line-height:1.6}.notice{padding:16px;background:#fff7e7;border-left:4px solid #e4a33f}.review{display:grid;grid-template-columns:1fr 2fr;gap:20px;padding:20px;background:#edf4f7}.footer{margin-top:50px;padding-top:16px;border-top:1px solid #cddbe2;color:#657884;font-size:11px}@media(max-width:760px){main{padding:24px}.metrics{grid-template-columns:1fr 1fr}.metric:nth-child(2){border-right:0}.review{grid-template-columns:1fr}table{display:block;overflow:auto}}@media print{body{background:white}main{padding:0;max-width:none}h2{break-after:avoid}table{break-inside:auto}tr{break-inside:avoid}.no-print{display:none}}
  </style></head><body><main><header><p class="kicker">VENTURE GOVERNANCE SYSTEM™ · EXECUTION FEASIBILITY ENGINE</p><h1>${escapeHtml(input.proposalName)}</h1><p class="lede">${escapeHtml(input.proposalSummary || "No proposal summary supplied.")}</p><p class="label">Demonstrative planning estimate · ${escapeHtml(input.strategy)} delivery · seed ${result.generatedFrom.seed} · ${result.generatedFrom.samples.toLocaleString()} samples</p></header>
  <section><h2>Executive estimate</h2><div class="metrics"><div class="metric"><span class="label">Duration P50</span><strong>${result.durationMonths.p50} months</strong><small>P90 ${result.durationMonths.p90} months</small></div><div class="metric"><span class="label">Expected cost</span><strong>${formatMoney(result.cost.expected)}</strong><small>${formatMoney(result.cost.probableLow)}–${formatMoney(result.cost.probableHigh)}</small></div><div class="metric"><span class="label">Readiness</span><strong>${result.readiness.score}/100</strong><small>Decomposition follows</small></div><div class="metric"><span class="label">3-year TCO</span><strong>${formatMoney(result.cost.threeYearTco)}</strong><small>Planning assumption</small></div></div><p><strong>Main factors:</strong> ${escapeHtml(result.topFactors.join("; "))}.</p><p><strong>Critical path:</strong> ${escapeHtml(result.criticalPath.join(" → "))}.</p><table><thead><tr><th>Target month</th><th>Probability of completion</th></tr></thead><tbody>${rows(result.probabilityByMonth.map((item) => [`Month ${item.month}`, `${item.probability}%`]))}</tbody></table></section>
  <section><h2>Work Breakdown Structure</h2><table><thead><tr><th>ID</th><th>Phase</th><th>Task</th><th>Owner</th><th>Dependencies</th><th>O / M / P</th><th>Schedule</th><th>Source</th></tr></thead><tbody>${rows(wbs)}</tbody></table></section>
  <section><h2>Cost model</h2><div class="metrics"><div class="metric"><span class="label">CAPEX</span><strong>${formatMoney(result.cost.capex)}</strong></div><div class="metric"><span class="label">Annual run rate</span><strong>${formatMoney(result.cost.annualRunRate)}</strong></div><div class="metric"><span class="label">Monthly</span><strong>${formatMoney(result.cost.monthlyRunRate)}</strong></div><div class="metric"><span class="label">First-year OPEX</span><strong>${formatMoney(result.cost.firstYearOpex)}</strong></div></div><table><thead><tr><th>Category</th><th>Classification</th><th>Estimate</th></tr></thead><tbody>${rows(costs)}</tbody></table></section>
  <section><h2>Resource and capability gaps</h2><table><thead><tr><th>Capability</th><th>Required</th><th>Status</th><th>Action</th><th>Potential impact</th></tr></thead><tbody>${rows(gaps)}</tbody></table><h2>Deployment readiness</h2><table><thead><tr><th>Dimension</th><th>Score</th><th>Weight</th><th>Status</th><th>Basis</th></tr></thead><tbody>${rows(readiness)}</tbody></table></section>
  <section><h2>Build, buy or partner comparison</h2><table><thead><tr><th>Alternative</th><th>Time P50</th><th>Expected cost</th><th>Control</th><th>Risk</th><th>Lock-in</th><th>IP</th></tr></thead><tbody>${rows(options)}</tbody></table></section>
  <section><h2>Executable roadmap</h2><table><thead><tr><th>Stage</th><th>Outcome</th><th>Owner</th><th>Approval gate</th><th>Metric</th><th>P50 / P90</th></tr></thead><tbody>${rows(roadmap)}</tbody></table></section>
  <section><h2>Human review record</h2><div class="review"><div><span class="label">Status</span><h3>${escapeHtml(review)}</h3></div><div><span class="label">Conditions / rationale</span><p>${escapeHtml(note || "No review note recorded.")}</p></div></div></section>
  <section><h2>Assumptions</h2>${list(result.assumptions)}<h2>Limitations</h2><div class="notice">${list(result.limitations)}</div></section>
  <p class="footer">Generated by ${escapeHtml(result.modelVersion)}. This report is a reproducible demonstrative estimate, not a supplier quote, forecast, procurement decision, financial advice or authorization to deploy.</p></main></body></html>`;
}

function download(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExecutionFeasibilityEngine() {
  const [draft, setDraft] = useState<FeasibilityInput>(DEFAULT_FEASIBILITY_INPUT);
  const [committed, setCommitted] = useState<FeasibilityInput>(DEFAULT_FEASIBILITY_INPUT);
  const [tab, setTab] = useState<Tab>("summary");
  const [review, setReview] = useState<ReviewState>("Not reviewed");
  const [reviewNote, setReviewNote] = useState("");
  const [status, setStatus] = useState("Default synthetic planning case loaded. Run the estimate after changing inputs.");
  const result = useMemo(() => estimateExecutionFeasibility(committed), [committed]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored) as { input?: FeasibilityInput; review?: ReviewState; note?: string };
        if (parsed.input) { setDraft(parsed.input); setCommitted(parsed.input); }
        if (parsed.review) setReview(parsed.review);
        if (typeof parsed.note === "string") setReviewNote(parsed.note.slice(0, 1000));
        setStatus("Restored the last device-local estimate.");
      } catch { window.localStorage.removeItem(STORAGE_KEY); }
    });
    return () => { active = false; };
  }, []);

  function update<K extends keyof FeasibilityInput>(key: K, value: FeasibilityInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function runEstimate() {
    const next = { ...draft, proposalName: draft.proposalName.slice(0, 80), proposalSummary: draft.proposalSummary.slice(0, 1200) };
    setCommitted(next); setReview("Not reviewed"); setReviewNote("");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ input: next, review: "Not reviewed", note: "" }));
    setStatus(`Estimate recalculated with ${next.samples.toLocaleString()} deterministic samples and seed ${next.seed}.`);
  }
  function recordReview(nextReview: ReviewState) {
    setReview(nextReview); window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ input: committed, review: nextReview, note: reviewNote }));
    setStatus(`${nextReview} recorded on this device. No funding, contract or deployment action was triggered.`);
  }
  function downloadReport() { download(buildReport(result, committed, review, reviewNote), "text/html;charset=utf-8", reportFileName(committed.proposalName)); setStatus("Executive report generated. Open the HTML file to print or save it as PDF."); }
  function downloadJson() { download(JSON.stringify({ input: committed, result, humanReview: { status: review, note: reviewNote } }, null, 2), "application/json", reportFileName(committed.proposalName).replace(/\.html$/, ".json")); setStatus("Inspectable estimate data exported as JSON."); }

  return <section className="execution-feasibility" aria-labelledby="execution-feasibility-title">
    <header className="platform-page-heading"><div><p>EXECUTION FEASIBILITY ENGINE · PRIVATE PLANNING</p><h1 id="execution-feasibility-title">Determine whether a plan can be executed.</h1></div><p>Translate a selected alternative into a visible work structure, probabilistic schedule, cost model, capability gaps, sourcing choices and approval-gated roadmap.</p></header>
    <p className="execution-feasibility__boundary"><strong>ESTIMATE, NOT AUTHORIZATION</strong> Synthetic planning assumptions and deterministic demo rules. Proposal text is treated as data. Nothing here approves funding, procurement, contracting or deployment.</p>

    <div className="execution-feasibility__layout">
      <form className="platform-panel execution-feasibility__form" onSubmit={(event) => { event.preventDefault(); runEstimate(); }}>
        <header><div><span>IMPLEMENTATION INPUTS</span><h2>Describe the bounded delivery case</h2></div><small>USD · weeks · reproducible seed</small></header>
        <label className="is-wide">Proposal name<input maxLength={80} value={draft.proposalName} onChange={(event) => update("proposalName", event.target.value)} /></label>
        <label className="is-wide">Implementation summary<textarea maxLength={1200} value={draft.proposalSummary} onChange={(event) => update("proposalSummary", event.target.value)} /></label>
        <label>Delivery strategy<select value={draft.strategy} onChange={(event) => update("strategy", event.target.value as FeasibilityInput["strategy"])}><option value="internal">Build internally</option><option value="vendor">External provider</option><option value="hybrid">Hybrid delivery</option></select></label>
        <ScoreInput label="Solution complexity" value={draft.complexity} onChange={(value) => update("complexity", value)} />
        <ScoreInput label="Data readiness" value={draft.dataReadiness} onChange={(value) => update("dataReadiness", value)} />
        <ScoreInput label="Internal capacity" value={draft.internalCapacity} onChange={(value) => update("internalCapacity", value)} />
        <ScoreInput label="Regulatory intensity" value={draft.regulatoryIntensity} onChange={(value) => update("regulatoryIntensity", value)} />
        <ScoreInput label="Security readiness" value={draft.securityReadiness} onChange={(value) => update("securityReadiness", value)} />
        <ScoreInput label="Adoption readiness" value={draft.adoptionReadiness} onChange={(value) => update("adoptionReadiness", value)} />
        <ScoreInput label="Budget readiness" value={draft.budgetReadiness} onChange={(value) => update("budgetReadiness", value)} />
        <NumberInput label="Users" value={draft.users} min={1} max={1000000} onChange={(value) => update("users", value)} />
        <NumberInput label="Annual missions" value={draft.annualMissions} min={1} max={100000} onChange={(value) => update("annualMissions", value)} />
        <NumberInput label="Annual simulations" value={draft.annualSimulations} min={1} max={10000000} onChange={(value) => update("annualSimulations", value)} />
        <NumberInput label="Annual agent runs" value={draft.annualAgentRuns} min={1} max={100000000} onChange={(value) => update("annualAgentRuns", value)} />
        <NumberInput label="Monte Carlo samples" value={draft.samples} min={500} max={20000} step={500} onChange={(value) => update("samples", value)} />
        <NumberInput label="Seed" value={draft.seed} min={1} max={2147483646} onChange={(value) => update("seed", value)} />
        <footer className="is-wide"><p>Inputs are bounded before calculation. Identical inputs and seed produce identical outputs.</p><button className="platform-primary-link" type="submit">Run feasibility estimate</button></footer>
      </form>

      <aside className="platform-panel execution-feasibility__snapshot">
        <header><span>EXECUTIVE ESTIMATE</span><small>{result.modelVersion}</small></header><h2>{result.generatedFrom.proposalName}</h2>
        <div className="execution-feasibility__hero-metric"><span>DURATION ESTIMATE</span><strong>{result.durationMonths.optimistic}–{result.durationMonths.p90} months</strong><small>P50 {result.durationMonths.p50} · P90 {result.durationMonths.p90} · conservative {result.durationMonths.conservative}</small></div>
        <div className="execution-feasibility__hero-metric"><span>EXPECTED COST</span><strong>{formatMoney(result.cost.expected)}</strong><small>Probable range {formatMoney(result.cost.probableLow)}–{formatMoney(result.cost.probableHigh)}</small></div>
        <dl><div><dt>READINESS</dt><dd>{result.readiness.score}/100</dd></div><div><dt>CRITICAL TASKS</dt><dd>{result.criticalPath.length}</dd></div><div><dt>3-YEAR TCO</dt><dd>{formatMoney(result.cost.threeYearTco)}</dd></div></dl>
        <p><strong>Main factors</strong>{result.topFactors.join(" · ")}</p>
        <div className="execution-feasibility__report-actions"><button type="button" onClick={downloadReport}>Generate report</button><button type="button" onClick={downloadJson}>Export JSON</button></div>
      </aside>
    </div>

    <nav className="execution-feasibility__tabs" aria-label="Feasibility result sections">{TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}>{item.label}</button>)}</nav>
    {tab === "summary" && <Summary result={result} />}
    {tab === "wbs" && <Wbs result={result} />}
    {tab === "costs" && <Costs result={result} />}
    {tab === "capabilities" && <Capabilities result={result} />}
    {tab === "options" && <Options result={result} />}
    {tab === "roadmap" && <Roadmap result={result} />}

    <section className="platform-panel execution-feasibility__review" aria-labelledby="feasibility-review-title"><header><div><span>HUMAN REVIEW GATE</span><h2 id="feasibility-review-title">Record a planning disposition</h2></div><strong>{review}</strong></header><label>Conditions and rationale<textarea maxLength={1000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Record evidence gaps, conditions, ownership or reasons to revise." /></label><div><button type="button" onClick={() => recordReview("Return for revision")}>Return for revision</button><button type="button" onClick={() => recordReview("Advance with conditions")}>Advance with conditions</button></div><p>This state is stored only on this device. “Advance” means continue planning; it does not authorize investment or execution.</p></section>
    <p className="execution-feasibility__status" role="status" aria-live="polite">{status}</p>
  </section>;
}

function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label>{label}<span className="execution-feasibility__range"><input type="range" min="0" max="100" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} /><output>{value}</output></span></label>; }
function NumberInput({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) { return <label>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} /></label>; }

function Summary({ result }: { result: FeasibilityResult }) { return <section className="execution-feasibility__results"><div className="execution-feasibility__metrics"><Metric label="Optimistic" value={`${result.durationMonths.optimistic} mo`} detail="P10 sampled completion" /><Metric label="Most likely" value={`${result.durationMonths.p50} mo`} detail="P50 sampled completion" /><Metric label="Conservative" value={`${result.durationMonths.p90} mo`} detail="P90 sampled completion" /><Metric label="Expected cost" value={formatMoney(result.cost.expected)} detail={`${formatMoney(result.cost.probableLow)}–${formatMoney(result.cost.probableHigh)}`} /></div><div className="execution-feasibility__columns"><article className="platform-panel"><header><span>COMPLETION PROBABILITY</span><h2>Probability by target month</h2></header><div className="execution-feasibility__probability">{result.probabilityByMonth.map((item) => <div key={item.month}><span>Month {item.month}</span><i style={{ width: `${item.probability}%` }} /><strong>{item.probability}%</strong></div>)}</div></article><article className="platform-panel"><header><span>SCHEDULE SENSITIVITY</span><h2>Tasks with the largest sampled variation</h2></header><ol className="execution-feasibility__drivers">{result.scheduleDrivers.map((item) => <li key={item.taskId}><span>{item.taskId}</span><strong>{item.title}</strong><small>{item.impact} mean weeks of sampled variation</small></li>)}</ol></article></div></section>; }
function Wbs({ result }: { result: FeasibilityResult }) { return <section className="execution-feasibility__results"><div className="execution-feasibility__critical"><span>CRITICAL PATH</span><strong>{result.criticalPath.join(" → ")}</strong><small>PERT/CPM from declared dependencies; resource contention is added in Monte Carlo scheduling.</small></div><div className="platform-table-wrap"><table className="platform-data-table execution-feasibility__table"><thead><tr><th>Task</th><th>Owner / resource</th><th>O / M / P</th><th>Start / finish</th><th>Dependencies</th><th>Deliverable & acceptance</th><th>Sourcing</th></tr></thead><tbody>{result.tasks.map((task) => <tr key={task.id} className={task.critical ? "is-critical" : ""}><td><strong>{task.id}</strong><small>{task.phase}</small><b>{task.title}</b></td><td>{task.owner}<small>{task.resource}</small></td><td>{task.optimisticWeeks} / {task.likelyWeeks} / {task.pessimisticWeeks}<small>PERT {task.expectedWeeks} weeks</small></td><td>W{task.earliestStartWeek} / W{task.earliestFinishWeek}<small>{task.critical ? "Critical" : `${task.floatWeeks} weeks float`}</small></td><td>{task.dependencies.join(", ") || "—"}</td><td>{task.deliverable}<small>{task.acceptance}</small></td><td>{task.sourcing}</td></tr>)}</tbody></table></div></section>; }
function Costs({ result }: { result: FeasibilityResult }) { return <section className="execution-feasibility__results"><div className="execution-feasibility__metrics"><Metric label="CAPEX" value={formatMoney(result.cost.capex)} detail="Implementation categories" /><Metric label="Annual OPEX" value={formatMoney(result.cost.annualRunRate)} detail={`${formatMoney(result.cost.monthlyRunRate)} monthly`} /><Metric label="3-year TCO" value={formatMoney(result.cost.threeYearTco)} detail="CAPEX + 3 years of run rate" /><Metric label="Cost / user" value={formatMoney(result.cost.perUser)} detail="3-year TCO planning ratio" /></div><div className="execution-feasibility__columns"><article className="platform-panel"><header><span>COST BREAKDOWN</span><h2>All included categories</h2></header><div className="execution-feasibility__cost-list">{result.cost.categories.map((item) => <div key={item.category}><span>{item.category}<small>{item.kind}</small></span><strong>{formatMoney(item.amount)}</strong></div>)}</div></article><article className="platform-panel"><header><span>UNIT COSTS</span><h2>Operating allocation assumptions</h2></header><dl className="execution-feasibility__unit-costs"><div><dt>Per mission</dt><dd>{formatMoney(result.cost.perMission)}</dd></div><div><dt>Per simulation</dt><dd>{formatPreciseMoney(result.cost.perSimulation)}</dd></div><div><dt>Per agent run</dt><dd>{formatPreciseMoney(result.cost.perAgentRun)}</dd></div><div><dt>Monthly run rate</dt><dd>{formatMoney(result.cost.monthlyRunRate)}</dd></div></dl><p className="platform-caveat">Ratios allocate modeled annual OPEX across the declared volumes. They are not marginal provider prices.</p></article></div></section>; }
function Capabilities({ result }: { result: FeasibilityResult }) { return <section className="execution-feasibility__results"><div className="execution-feasibility__columns execution-feasibility__columns--readiness"><article className="platform-panel"><header><span>RESOURCE & CAPABILITY GAP</span><h2>What the plan still needs</h2></header><div className="execution-feasibility__gaps">{result.capabilities.map((item) => <article key={item.capability}><div><span>{item.status}</span><h3>{item.capability}</h3><p>{item.required}</p></div><div><strong>Action</strong><p>{item.action}</p><small>Potential schedule impact: {item.scheduleImpactWeeks} weeks</small></div></article>)}</div></article><article className="platform-panel"><header><span>DEPLOYMENT READINESS</span><h2>{result.readiness.score}/100 · decomposed</h2></header><div className="execution-feasibility__readiness">{result.readiness.components.map((item) => <div key={item.id}><header><span>{item.label}<small>{item.weight}% weight</small></span><strong>{item.score}</strong></header><i><b style={{ width: `${item.score}%` }} /></i><p>{item.status} · {item.evidence}</p></div>)}</div></article></div></section>; }
function Options({ result }: { result: FeasibilityResult }) { return <section className="execution-feasibility__results"><div className="platform-table-wrap"><table className="platform-data-table execution-feasibility__table execution-feasibility__options"><thead><tr><th>Strategy</th><th>Time P50</th><th>Expected cost</th><th>Control</th><th>Risk</th><th>Dependency</th><th>Lock-in</th><th>IP</th><th>Scalability</th><th>Speed</th></tr></thead><tbody>{result.options.map((item) => <tr key={item.id} className={item.id === "hybrid" ? "is-preferred" : ""}><td><strong>{item.label}</strong>{item.id === "hybrid" && <small>Balanced reference</small>}</td><td>{item.timeP50Months} mo</td><td>{formatMoney(item.expectedCost)}</td><td>{item.control}</td><td>{item.risk}</td><td>{item.dependency}</td><td>{item.lockIn}</td><td>{item.intellectualProperty}</td><td>{item.scalability}</td><td>{item.speed}</td></tr>)}</tbody></table></div><p className="platform-caveat">The balanced reference is not an automatic recommendation. Procurement, diligence, IP terms, evidence and accountable human review remain required.</p></section>; }
function Roadmap({ result }: { result: FeasibilityResult }) { return <section className="execution-feasibility__results"><div className="execution-feasibility__roadmap">{result.roadmap.map((item, index) => <article key={item.id}><span>{item.id} · {String(index + 1).padStart(2, "0")}</span><h2>{item.label}</h2><p>{item.outcome}</p><dl><div><dt>P50 / P90</dt><dd>M{item.p50Month} / M{item.p90Month}</dd></div><div><dt>Owner</dt><dd>{item.owner}</dd></div><div><dt>Approval gate</dt><dd>{item.gate}</dd></div><div><dt>Metric</dt><dd>{item.metric}</dd></div></dl></article>)}</div><article className="platform-panel execution-feasibility__learning"><header><span>PREDICTED VS ACTUAL · FUTURE GOVERNED CAPABILITY</span><h2>Learn after deployment without pretending calibration exists today.</h2></header><p>A future private record can compare estimated and actual cost, duration, risks, underestimated tasks, supplier performance and productivity. This repository does not contain historical organizational data or proprietary calibration.</p><div>{["Estimated vs actual cost", "Estimated vs actual duration", "Predicted vs occurred risks", "Task and supplier variance", "Productivity and learning curves"].map((item) => <span key={item}>{item}</span>)}</div></article></section>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
