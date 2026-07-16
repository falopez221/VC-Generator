"use client";

import { useEffect, useMemo, useState } from "react";
import { addEvidence, generateLabRun, rerankLabRun, updateHumanDecision } from "../engine.ts";
import { BayesianChart, HistogramChart, ParetoChart, RadarChart, RiskMatrixChart, ScenarioChart } from "./LabCharts.tsx";
import { DEFAULT_WEIGHTS, EXAMPLES, OBJECTIVES, PRESETS, STAGES } from "../data.ts";
import { bayesianUpdate, calculateMCDA, calculateScenarios, normalizeWeights, paretoFront, runMonteCarlo } from "../models.ts";
import { getAudioSettings, playSound, unlockAudio } from "../audio.ts";
import { duplicateRun, listRuns, loadLastRun, saveRun } from "../storage.ts";
import { validateLabInput } from "../schema.ts";
import { AGENT_NAMES, DIMENSION_KEYS, type AgentName, type HumanDecision, type LabInput, type LabRun, type MonteCarloConfig, type Opportunity } from "../types.ts";

const EMPTY_INPUT: LabInput = {
  analysisName: "",
  problem: "",
  thesis: "",
  industry: "",
  market: "",
  technology: "",
  region: "Global",
  horizonYears: 5,
  customerType: "",
  estimatedCapital: 1000000,
  riskTolerance: 50,
  innovationLevel: 50,
  knownSignals: "",
  availableEvidence: "",
  objective: "Generate startup opportunities",
  opportunityCount: 8,
  seed: 4217,
};

const DIMENSION_LABELS: Record<(typeof DIMENSION_KEYS)[number], string> = {
  marketPotential: "Market potential",
  financialViability: "Financial viability",
  strategicAdvantage: "Strategic advantage",
  adoptionPotential: "Adoption potential",
  technicalFeasibility: "Technical feasibility",
  evidenceQuality: "Evidence quality",
  risk: "Risk (inverted in MCDA)",
  scalability: "Scalability",
};

const EVIDENCE_TYPES = ["customer interviews", "willingness-to-pay test", "landing page", "acquisition campaign", "technical prototype", "competitor reaction", "MCP technical artifact"];

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function Metric({ label, value, tooltip }: { label: string; value: string | number; tooltip: string }) {
  return <article className="lab-metric" title={tooltip}><span>{label}</span><strong>{value}</strong><small>{tooltip}</small></article>;
}

function InputField({ label, name, value, onChange, type = "text", min, max, step }: { label: string; name: keyof LabInput; value: string | number; onChange: (name: keyof LabInput, value: string | number) => void; type?: string; min?: number; max?: number; step?: number }) {
  return <label className="lab-field"><span>{label}</span><input name={name} type={type} value={value} min={min} max={max} step={step} onChange={(event) => onChange(name, type === "number" ? Number(event.target.value) : event.target.value)} /></label>;
}

export function LabDemo() {
  const [input, setInput] = useState<LabInput>(EXAMPLES["Venture Capital"]);
  const [run, setRun] = useState<LabRun | null>(null);
  const [history, setHistory] = useState<LabRun[]>([]);
  const [status, setStatus] = useState<"Ready" | "Running" | "Paused" | "Completed" | "Invalid Configuration" | "Simulation Failed">("Ready");
  const [stageIndex, setStageIndex] = useState(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentName>("Mathematics");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [rankingDeltas, setRankingDeltas] = useState<{ id: string; previousRank: number; rank: number; scoreDelta: number; mainDriver: string }[]>([]);
  const [sortKey, setSortKey] = useState<"rank" | "score" | "risk" | "evidence">("rank");
  const [errors, setErrors] = useState<string[]>([]);
  const [evidenceText, setEvidenceText] = useState("");
  const [bayes, setBayes] = useState({ prior: 42, strength: 65, falsePositive: 18, falseNegative: 22, type: EVIDENCE_TYPES[0] });
  const [scenario, setScenario] = useState({ growth: 0, adoption: 0, margin: 0 });
  const [paretoAxes, setParetoAxes] = useState<{ x: "potential" | "evidence" | "scalability"; y: "risk" | "capital" | "novelty" }>({ x: "potential", y: "risk" });
  const [mcConfig, setMcConfig] = useState<MonteCarloConfig>({ simulations: 1200, distribution: "triangular", seed: 4217, successThreshold: 20, marketGrowth: 120, adoption: 42, price: 24000, cac: 5200, churn: 14, margin: 62, initialInvestment: 1000000 });

  useEffect(() => {
    const previous = loadLastRun();
    const settings = getAudioSettings();
    void settings;
    queueMicrotask(() => {
      setHistory(listRuns());
      if (previous) {
        setRun(previous);
        setInput(previous.input);
        setSelectedId(previous.opportunities[0]?.id ?? null);
        setStatus("Completed");
        setMcConfig((current) => ({ ...current, seed: previous.input.seed, initialInvestment: previous.input.estimatedCapital }));
      }
    });
  }, []);

  useEffect(() => {
    if (status !== "Running") return;
    if (stageIndex >= STAGES.length - 1) {
      const timer = window.setTimeout(() => {
        setStatus("Completed");
        setRun((current) => {
          if (!current) return current;
          const complete = { ...current, status: "Completed" as const };
          saveRun(complete);
          setHistory(listRuns());
          return complete;
        });
        playSound("simulation.complete");
      }, 120);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setStageIndex((current) => current + 1);
      if ([2, 3, 4, 5].includes(stageIndex + 1)) playSound("agent.complete");
    }, 135);
    return () => window.clearTimeout(timer);
  }, [stageIndex, status]);

  const selectedOpportunity = useMemo(() => selectedId ? run?.opportunities.find((opportunity) => opportunity.id === selectedId) ?? null : null, [run, selectedId]);
  const displayedOpportunities = useMemo(() => {
    if (!run) return [];
    return [...run.opportunities].sort((a, b) => sortKey === "rank" ? a.rank - b.rank : sortKey === "score" ? b.totalScore - a.totalScore : sortKey === "risk" ? a.dimensions.risk - b.dimensions.risk : b.dimensions.evidenceQuality - a.dimensions.evidenceQuality);
  }, [run, sortKey]);
  const comparison = useMemo(() => run?.opportunities.filter((opportunity) => comparisonIds.includes(opportunity.id)) ?? [], [comparisonIds, run]);
  const metrics = useMemo(() => {
    if (!run?.opportunities.length) return null;
    const average = (selector: (opportunity: Opportunity) => number) => run.opportunities.reduce((sum, opportunity) => sum + selector(opportunity), 0) / run.opportunities.length;
    return {
      score: average((opportunity) => opportunity.totalScore).toFixed(1),
      evidence: average((opportunity) => opportunity.dimensions.evidenceQuality).toFixed(0),
      risk: average((opportunity) => opportunity.dimensions.risk).toFixed(0),
      uncertainty: average((opportunity) => opportunity.uncertainty).toFixed(0),
      disagreement: average((opportunity) => opportunity.disagreement).toFixed(1),
      pending: run.opportunities.filter((opportunity) => opportunity.humanDecision === "Pending" || opportunity.humanDecision === "More evidence").length,
    };
  }, [run]);
  const monteCarlo = useMemo(() => selectedOpportunity ? runMonteCarlo(selectedOpportunity, mcConfig) : null, [mcConfig, selectedOpportunity]);
  const bayesian = useMemo(() => bayesianUpdate(bayes.prior, Math.min(100, bayes.strength + EVIDENCE_TYPES.indexOf(bayes.type) * 2), bayes.falsePositive, bayes.falseNegative), [bayes]);
  const scenarios = useMemo(() => selectedOpportunity ? calculateScenarios(selectedOpportunity, scenario.growth, scenario.adoption, scenario.margin) : [], [scenario, selectedOpportunity]);
  const pareto = useMemo(() => run ? paretoFront(run.opportunities, paretoAxes.x, paretoAxes.y) : [], [paretoAxes, run]);
  const mcda = useMemo(() => selectedOpportunity && run ? calculateMCDA(selectedOpportunity, run.weights) : null, [run, selectedOpportunity]);

  const updateInput = (name: keyof LabInput, value: string | number) => setInput((current) => ({ ...current, [name]: value }));

  const startSimulation = (nextInput = input) => {
    unlockAudio();
    const validated = validateLabInput(nextInput);
    if (!validated.success) {
      setErrors(validated.errors);
      setStatus("Invalid Configuration");
      playSound("evidence.warning");
      return;
    }
    try {
      const generated = generateLabRun(validated.data, run?.weights ?? DEFAULT_WEIGHTS);
      setInput(validated.data);
      setRun({ ...generated, status: "Running" });
      setSelectedId(generated.opportunities[0]?.id ?? null);
      setComparisonIds([]);
      setRankingDeltas([]);
      setErrors([]);
      setStageIndex(0);
      setStatus("Running");
      setMcConfig((current) => ({ ...current, seed: validated.data.seed, initialInvestment: validated.data.estimatedCapital }));
      playSound("simulation.start");
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "The public simulation failed safely."]);
      setStatus("Simulation Failed");
    }
  };

  const pause = () => { unlockAudio(); setStatus("Paused"); playSound("simulation.pause"); };
  const resume = () => { unlockAudio(); setStatus("Running"); playSound("simulation.start"); };
  const reset = () => { setRun(null); setSelectedId(null); setComparisonIds([]); setStageIndex(-1); setStatus("Ready"); setErrors([]); };
  const loadExample = (name: string) => { unlockAudio(); const example = EXAMPLES[name]; setInput(example); setRun(null); setStatus("Ready"); setErrors([]); playSound("ui.select"); };

  const commitRun = (next: LabRun) => { setRun(next); saveRun(next); setHistory(listRuns()); };
  const decide = (decision: HumanDecision) => {
    if (!run || !selectedOpportunity) return;
    unlockAudio();
    commitRun(updateHumanDecision(run, selectedOpportunity.id, decision));
    playSound(decision === "Promising" ? "human.approve" : decision === "Rejected" ? "human.reject" : "human.uncertain");
  };
  const submitEvidence = () => {
    if (!run || !selectedOpportunity || !evidenceText.trim()) return;
    const next = addEvidence(run, selectedOpportunity.id, evidenceText);
    commitRun(next);
    setEvidenceText("");
    playSound("ranking.updated");
  };
  const toggleCompare = (id: string) => {
    setComparisonIds((current) => current.includes(id) ? current.filter((candidate) => candidate !== id) : current.length < 3 ? [...current, id] : current);
  };
  const applyWeights = (weights: LabRun["weights"]) => {
    if (!run) return;
    const next = rerankLabRun(run, weights);
    commitRun(next.run);
    setRankingDeltas(next.deltas);
    playSound("ranking.updated");
  };
  const updateAgentWeight = (name: AgentName, value: number) => {
    if (!run) return;
    const normalized = normalizeWeights({ ...run.weights.agents, [name]: value });
    applyWeights({ ...run.weights, agents: normalized });
  };
  const updateDimensionWeight = (name: (typeof DIMENSION_KEYS)[number], value: number) => {
    if (!run) return;
    const normalized = normalizeWeights({ ...run.weights.dimensions, [name]: value });
    applyWeights({ ...run.weights, dimensions: normalized });
  };

  const exportJson = () => run && download(`${run.id}.json`, JSON.stringify(run, null, 2), "application/json");
  const exportCsv = () => {
    if (!run) return;
    const header = ["rank", "id", "opportunity", "score", ...AGENT_NAMES, "risk", "evidence", "confidence", "uncertainty", "category", "humanDecision"];
    const rows = run.opportunities.map((opportunity) => [opportunity.rank, opportunity.id, opportunity.name, opportunity.totalScore, ...AGENT_NAMES.map((name) => opportunity.agents[name].score), opportunity.dimensions.risk, opportunity.dimensions.evidenceQuality, opportunity.confidence, opportunity.uncertainty, opportunity.category, opportunity.humanDecision]);
    download(`${run.id}.csv`, [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
  };

  return (
    <main className="lab-page lab-demo" id="lab-content">
      <section className="lab-demo-head">
        <div><p className="lab-kicker">SIMPLIFIED PUBLIC ORCHESTRATION MODEL</p><h1>Public opportunity exploration Lab</h1><p>Run a fast deterministic sample, inspect four structured agents, change public assumptions and leave the final decision to human review.</p></div>
        <div className={`lab-status lab-status--${status.toLowerCase().replaceAll(" ", "-")}`} aria-live="polite"><span>{status}</span><strong>{stageIndex >= 0 ? `Stage ${Math.min(stageIndex + 1, 9)} / 9` : "Awaiting human input"}</strong><small>{stageIndex >= 0 ? STAGES[Math.min(stageIndex, 8)].task : "Synthetic demonstration data"}</small></div>
      </section>

      <section className="lab-band">The complete Venture Governance architecture is designed for large-scale opportunity exploration. This public lab uses a reduced sample for speed, clarity and intellectual property protection.</section>

      <section className="lab-public-agent-strip" aria-label="Four public agents">
        {AGENT_NAMES.map((name, index) => <div key={name}><span>0{index + 1}</span><strong>{name}</strong><small>Public structured agent</small></div>)}
      </section>

      <section className="lab-intake">
        <div className="lab-panel-heading"><div><p className="lab-kicker">HUMAN INTAKE</p><h2>Define the exploration boundary.</h2></div><span>Synthetic demonstration data · inputs remain in this browser</span></div>
        <div className="lab-example-row">{Object.keys(EXAMPLES).map((name) => <button type="button" key={name} onClick={() => loadExample(name)}>Load {name}</button>)}<button type="button" onClick={() => { setInput(EMPTY_INPUT); reset(); }}>Clear</button></div>
        <form onSubmit={(event) => { event.preventDefault(); startSimulation(); }}>
          <div className="lab-form-grid">
            <InputField label="Analysis name" name="analysisName" value={input.analysisName} onChange={updateInput} />
            <label className="lab-field"><span>Objective</span><select value={input.objective} onChange={(event) => updateInput("objective", event.target.value)}>{OBJECTIVES.map((objective) => <option key={objective}>{objective}</option>)}</select></label>
            <label className="lab-field lab-field--wide"><span>Problem</span><textarea value={input.problem} maxLength={600} onChange={(event) => updateInput("problem", event.target.value)} /></label>
            <label className="lab-field lab-field--wide"><span>Thesis</span><textarea value={input.thesis} maxLength={600} onChange={(event) => updateInput("thesis", event.target.value)} /></label>
            <InputField label="Industry" name="industry" value={input.industry} onChange={updateInput} />
            <InputField label="Market" name="market" value={input.market} onChange={updateInput} />
            <InputField label="Technology" name="technology" value={input.technology} onChange={updateInput} />
            <InputField label="Region" name="region" value={input.region} onChange={updateInput} />
            <InputField label="Customer type" name="customerType" value={input.customerType} onChange={updateInput} />
            <InputField label="Horizon (years)" name="horizonYears" value={input.horizonYears} onChange={updateInput} type="number" min={1} max={15} />
            <InputField label="Estimated capital (USD)" name="estimatedCapital" value={input.estimatedCapital} onChange={updateInput} type="number" min={25000} max={50000000} step={25000} />
            <InputField label="Seed" name="seed" value={input.seed} onChange={updateInput} type="number" min={1} max={2147483646} />
            <label className="lab-field"><span>Risk tolerance · {input.riskTolerance}</span><input type="range" min="0" max="100" value={input.riskTolerance} onChange={(event) => updateInput("riskTolerance", Number(event.target.value))} /></label>
            <label className="lab-field"><span>Innovation level · {input.innovationLevel}</span><input type="range" min="0" max="100" value={input.innovationLevel} onChange={(event) => updateInput("innovationLevel", Number(event.target.value))} /></label>
            <label className="lab-field"><span>Opportunities · {input.opportunityCount}</span><input type="range" min="6" max="12" value={input.opportunityCount} onChange={(event) => updateInput("opportunityCount", Number(event.target.value))} /></label>
            <label className="lab-field lab-field--wide"><span>Known signals</span><textarea value={input.knownSignals} maxLength={600} onChange={(event) => updateInput("knownSignals", event.target.value)} /></label>
            <label className="lab-field lab-field--wide"><span>Available evidence</span><textarea value={input.availableEvidence} maxLength={600} onChange={(event) => updateInput("availableEvidence", event.target.value)} /></label>
          </div>
          {errors.length > 0 && <div className="lab-errors" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
          <div className="lab-run-actions"><button className="lab-button lab-button--primary" type="submit">Run Lab Simulation</button>{status === "Running" && <button className="lab-button" type="button" onClick={pause}>Pause</button>}{status === "Paused" && <button className="lab-button" type="button" onClick={resume}>Resume</button>}{run && <button className="lab-button" type="button" onClick={() => startSimulation(input)}>Run again</button>}<button className="lab-button" type="button" onClick={reset}>Reset</button>{run && <button className="lab-button" type="button" onClick={() => startSimulation({ ...input, seed: input.seed + 1 })}>Change seed & run</button>}</div>
        </form>
      </section>

      {run && <>
        <section className="lab-progress" aria-live="polite">{STAGES.map((stage, index) => { const stageStatus = index < stageIndex ? "Completed" : index === stageIndex && status === "Paused" ? "Paused" : index === stageIndex ? "Active" : "Waiting"; const processed = index < 2 ? Math.max(0, Math.min(run.opportunities.length, stageIndex + 1) * run.opportunities.length / 2) : index <= stageIndex ? run.opportunities.length : 0; return <article className={`stage-${stageStatus.toLowerCase()}`} key={stage.id}><span>{String(stage.id).padStart(2, "0")}</span><div><strong>{stage.label}</strong><small>{stage.owner} · ~0.1s demo step</small><p>{stage.task} · {Math.round(processed)}/{run.opportunities.length} opportunities</p></div><b>{stageStatus}</b></article>; })}</section>

        <section className="lab-dashboard" aria-label="Executive overview">
          <div className="lab-panel-heading"><div><p className="lab-kicker">EXECUTIVE OVERVIEW</p><h2>{run.input.analysisName}</h2></div><div className="lab-export"><a href={`/lab/results/${run.id}`}>Open result view</a><button type="button" onClick={exportJson}>Export JSON</button><button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={() => window.print()}>Print</button></div></div>
          {metrics && <div className="lab-metrics"><Metric label="Generated" value={run.opportunities.length} tooltip="Reduced public sample, not the complete architecture." /><Metric label="Average score" value={metrics.score} tooltip="Demonstrative weighted public score." /><Metric label="Average evidence" value={`${metrics.evidence}%`} tooltip="Synthetic and user-provided evidence quality estimate." /><Metric label="Average risk" value={`${metrics.risk}%`} tooltip="Visible probability/impact proxy, not a forecast." /><Metric label="Uncertainty" value={`${metrics.uncertainty}%`} tooltip="Public uncertainty from evidence, risk and disagreement." /><Metric label="Agent disagreement" value={metrics.disagreement} tooltip="Standard deviation across four public agent scores." /><Metric label="Pending review" value={metrics.pending} tooltip="Opportunities without a final human state." /></div>}
          <div className="lab-funnel" aria-label="Public opportunity funnel">{[[run.opportunities.length + 2, "Initial"], [2, "Duplicates removed"], [run.opportunities.length, "First filter"], [run.opportunities.length, "Agent analysis"], [run.opportunities.length, "Quantitative Lab"], [Math.min(3, run.opportunities.length), "Finalists"], [metrics?.pending ?? 0, "Human review"]].map(([value, label], index) => <div key={String(label)} style={{ width: `${100 - index * 7}%` }}><strong>{value}</strong><span>{label}</span></div>)}</div>
        </section>

        <section className="lab-orchestration">
          <div className="lab-panel-heading"><div><p className="lab-kicker">FOUR PUBLIC AGENTS</p><h2>Click a node to inspect structured output.</h2></div><span>Active connections show public result exchange, not private reasoning.</span></div>
          <div className="lab-agent-network" role="group" aria-label="Interactive network of four public agents"><div className="lab-agent-core"><span>HUMAN INPUT</span><strong>Public Orchestrator</strong><small>Simplified model</small></div>{AGENT_NAMES.map((name, index) => <button key={name} type="button" className={`${selectedAgent === name ? "is-selected" : ""} ${stageIndex === index + 2 && status === "Running" ? "is-active" : ""}`} onClick={() => { unlockAudio(); setSelectedAgent(name); playSound("agent.activate"); }}><span>0{index + 1}</span><strong>{name}</strong><small>{selectedOpportunity?.agents[name].status ?? "Waiting"}</small></button>)}</div>
          {selectedOpportunity && <div className="lab-agent-inspector" aria-live="polite"><div><span>{selectedAgent} Agent</span><h3>{selectedOpportunity.agents[selectedAgent].domain}</h3><p>{selectedOpportunity.agents[selectedAgent].findings[0]}</p></div><dl><div><dt>Score</dt><dd>{selectedOpportunity.agents[selectedAgent].score}</dd></div><div><dt>Confidence</dt><dd>{selectedOpportunity.agents[selectedAgent].confidence}%</dd></div><div><dt>Evidence</dt><dd>{selectedOpportunity.agents[selectedAgent].evidenceQuality}%</dd></div></dl><div><strong>Assumption</strong><p>{selectedOpportunity.agents[selectedAgent].assumptions[0]}</p><strong>Missing evidence</strong><p>{selectedOpportunity.agents[selectedAgent].missingEvidence[0]}</p><strong>Cross-agent criticism</strong><p>{selectedOpportunity.agents[selectedAgent].criticism}</p></div></div>}
          <div className="lab-disagreement-heatmap" role="img" aria-label="Agent score heatmap across public opportunities"><div className="heatmap-head"><span>Agent</span>{run.opportunities.map((opportunity) => <span key={opportunity.id}>{opportunity.id}</span>)}</div>{AGENT_NAMES.map((name) => <div key={name}><strong>{name}</strong>{run.opportunities.map((opportunity) => <span key={opportunity.id} style={{ opacity: Math.max(.4, opportunity.agents[name].score / 100) }} title={`${name} score for ${opportunity.name}: ${opportunity.agents[name].score}`}>{opportunity.agents[name].score.toFixed(0)}</span>)}</div>)}</div>
        </section>

        <section className="lab-ranking">
          <div className="lab-panel-heading"><div><p className="lab-kicker">RANKING</p><h2>Opportunities for human review.</h2></div><span>High score plus weak evidence is never automatically “Highly Promising”.</span></div>
          <div className="lab-sort-row" aria-label="Sort ranking"><span>Sort by</span>{(["rank", "score", "risk", "evidence"] as const).map((key) => <button type="button" aria-pressed={sortKey === key} onClick={() => setSortKey(key)} key={key}>{key}</button>)}</div>
          <div className="lab-ranking-table" role="table" aria-label="Sortable public opportunity ranking"><div className="lab-rank-head" role="row"><span>Rank</span><span>Opportunity</span><span>Total</span>{AGENT_NAMES.map((name) => <span key={name}>{name.slice(0, 4)}</span>)}<span>Risk</span><span>Evidence</span><span>Decision</span></div>{displayedOpportunities.map((opportunity) => <div className={selectedOpportunity?.id === opportunity.id ? "lab-rank-row is-selected" : "lab-rank-row"} role="row" key={opportunity.id}><button type="button" className="rank-open" onClick={() => setSelectedId(opportunity.id)}><strong>#{opportunity.rank}</strong>{opportunity.previousRank !== opportunity.rank && <small>{opportunity.previousRank > opportunity.rank ? "↑" : "↓"}{Math.abs(opportunity.previousRank - opportunity.rank)}</small>}</button><button type="button" className="rank-name" onClick={() => setSelectedId(opportunity.id)}><strong>{opportunity.name}</strong><small>{opportunity.category}</small></button><strong>{opportunity.totalScore.toFixed(1)}</strong>{AGENT_NAMES.map((name) => <span key={name}>{opportunity.agents[name].score.toFixed(0)}</span>)}<span>{opportunity.dimensions.risk.toFixed(0)}</span><span>{opportunity.dimensions.evidenceQuality.toFixed(0)}</span><div><small>{opportunity.humanDecision}</small><button type="button" aria-pressed={comparisonIds.includes(opportunity.id)} onClick={() => toggleCompare(opportunity.id)}>{comparisonIds.includes(opportunity.id) ? "Remove" : "Compare"}</button></div></div>)}</div>
        </section>

        {comparison.length > 0 && <section className="lab-comparison"><div className="lab-panel-heading"><div><p className="lab-kicker">COMPARE · UP TO THREE</p><h2>Trade-offs side by side.</h2></div><button type="button" onClick={() => setComparisonIds([])}>Clear comparison</button></div><div>{comparison.map((opportunity) => <article key={opportunity.id}><span>#{opportunity.rank} · {opportunity.category}</span><h3>{opportunity.name}</h3><strong>{opportunity.totalScore.toFixed(1)}</strong><dl><div><dt>Risk</dt><dd>{opportunity.dimensions.risk.toFixed(0)}</dd></div><div><dt>Evidence</dt><dd>{opportunity.dimensions.evidenceQuality.toFixed(0)}</dd></div><div><dt>Uncertainty</dt><dd>{opportunity.uncertainty.toFixed(0)}</dd></div><div><dt>Capital</dt><dd>${Math.round(opportunity.estimatedCapital / 1000)}k</dd></div></dl><p>{opportunity.proposedSolution}</p></article>)}</div></section>}

        {selectedOpportunity && <section className="lab-detail">
          <div className="lab-panel-heading"><div><p className="lab-kicker">OPPORTUNITY DETAIL · {selectedOpportunity.id}</p><h2>{selectedOpportunity.name}</h2></div><div><span>{selectedOpportunity.category}</span><strong>{selectedOpportunity.totalScore.toFixed(1)}</strong><button type="button" onClick={() => setSelectedId(null)}>Close detail</button></div></div>
          <div className="lab-detail-grid"><div><h3>Problem</h3><p>{selectedOpportunity.problem}</p><h3>Proposed solution</h3><p>{selectedOpportunity.proposedSolution}</p><h3>Target customer</h3><p>{selectedOpportunity.targetCustomer}</p><h3>Business model</h3><p>{selectedOpportunity.businessModel}</p><h3>Critical hypotheses</h3><ul>{selectedOpportunity.criticalHypotheses.map((hypothesis) => <li key={hypothesis}>{hypothesis}</li>)}</ul></div><div><RadarChart opportunity={selectedOpportunity} /><h3>What would change this conclusion?</h3><p>Observed willingness to pay, lower acquisition cost, a failed technical prototype, a strong competitor response, or evidence that the problem is less urgent could materially change confidence and ranking.</p><h3>Lean Startup experiment</h3><p>Build the smallest measurable workflow prototype, define a behavioral success threshold and compare it with the current alternative.</p><h3>Jobs To Be Done</h3><p>When the target team faces the stated constraint, help it make a traceable decision with less coordination cost and clearer evidence.</p></div></div>
          <div className="lab-human-actions" aria-label="Human supervision"><button type="button" onClick={() => decide("Saved")}>Save</button><button type="button" onClick={() => toggleCompare(selectedOpportunity.id)}>Compare</button><button type="button" onClick={() => decide("More evidence")}>Request more evidence</button><button type="button" onClick={() => decide("Promising")}>Mark as promising</button><button type="button" onClick={() => decide("Uncertain")}>Uncertain</button><button type="button" onClick={() => decide("Rejected")}>Reject</button></div>
          <div className="lab-evidence-add"><label><span>Add new evidence</span><input value={evidenceText} maxLength={300} onChange={(event) => setEvidenceText(event.target.value)} placeholder="Observed result, interview, prototype or public artifact" /></label><button type="button" onClick={submitEvidence}>Add & re-evaluate</button></div>
        </section>}

        {selectedOpportunity && <section className="lab-quant">
          <div className="lab-panel-heading"><div><p className="lab-kicker">PUBLIC QUANTITATIVE LABORATORY</p><h2>Change assumptions. Recalculate. Inspect limits.</h2></div><span>Demonstrative public formulas · not the private scoring system</span></div>
          <article className="lab-model-panel"><header><div><span>01 · MCDA</span><h3>Visible contribution and adjustment</h3></div><p title="Combines visible criteria and weights.">Weights are normalized to 100%. Risk is inverted, then visible evidence and uncertainty adjustments are applied.</p></header>{mcda && <><div className="lab-mcda-summary"><Metric label="Raw" value={mcda.rawScore} tooltip="Weighted dimension sum before public adjustments." /><Metric label="Weighted" value={mcda.weightedScore} tooltip="Public score after visible risk/evidence/uncertainty adjustments." /><Metric label="Risk penalty" value={`−${mcda.riskPenalty}`} tooltip="Demonstrative penalty from visible risk and risk aversion." /><Metric label="Interval" value={`${mcda.interval[0]}–${mcda.interval[1]}`} tooltip="Illustrative uncertainty interval, not a confidence guarantee." /></div><div className="lab-contributions">{DIMENSION_KEYS.map((key) => <div key={key}><span>{DIMENSION_LABELS[key]}</span><i><b style={{ width: `${Math.min(100, mcda.contributions[key] * 7)}%` }} /></i><strong>{mcda.contributions[key].toFixed(1)}</strong></div>)}</div></>}</article>

          <article className="lab-model-panel"><header><div><span>02 · MONTE CARLO</span><h3>Distribution, not a single forecast</h3></div><p title="Explores many possible outcomes by repeatedly varying uncertain inputs.">Same seed and parameters produce the same distribution.</p></header><div className="lab-control-grid"><label>Distribution<select value={mcConfig.distribution} onChange={(event) => setMcConfig((current) => ({ ...current, distribution: event.target.value as MonteCarloConfig["distribution"] }))}>{["normal", "triangular", "beta", "uniform", "bernoulli"].map((name) => <option key={name}>{name}</option>)}</select></label><label>Simulations · {mcConfig.simulations}<input type="range" min="200" max="5000" step="200" value={mcConfig.simulations} onChange={(event) => setMcConfig((current) => ({ ...current, simulations: Number(event.target.value) }))} /></label><label>Seed<input type="number" value={mcConfig.seed} onChange={(event) => setMcConfig((current) => ({ ...current, seed: Number(event.target.value) }))} /></label><label>Success threshold · {mcConfig.successThreshold}%<input type="range" min="-20" max="100" value={mcConfig.successThreshold} onChange={(event) => setMcConfig((current) => ({ ...current, successThreshold: Number(event.target.value) }))} /></label>{(["marketGrowth", "adoption", "price", "cac", "churn", "margin", "initialInvestment"] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1")} · {mcConfig[key]}<input type="range" min={key === "price" ? 1000 : key === "initialInvestment" ? 25000 : 1} max={key === "price" ? 100000 : key === "initialInvestment" ? 5000000 : key === "cac" ? 25000 : 100} step={key === "price" ? 1000 : key === "initialInvestment" ? 25000 : 1} value={mcConfig[key]} onChange={(event) => setMcConfig((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div>{monteCarlo && <><HistogramChart result={monteCarlo} /><div className="lab-metrics"><Metric label="Mean" value={`${monteCarlo.mean}%`} tooltip="Average simulated return under public assumptions." /><Metric label="Median" value={`${monteCarlo.median}%`} tooltip="50th percentile." /><Metric label="P10 / P90" value={`${monteCarlo.p10}% / ${monteCarlo.p90}%`} tooltip="Illustrative public outcome range." /><Metric label="Above threshold" value={`${monteCarlo.probabilityAboveThreshold}%`} tooltip="Share of simulations above the editable threshold." /><Metric label="Loss probability" value={`${monteCarlo.probabilityOfLoss}%`} tooltip="Share of simulations below zero." /></div></>}</article>

          <article className="lab-model-panel"><header><div><span>03 · SENSITIVITY</span><h3>Ranking under alternative priorities</h3></div><p title="Shows which assumptions have the greatest influence on the result.">Agent and dimension weights always normalize to 100%.</p></header><div className="lab-presets"><span>Demonstrative public presets</span>{Object.keys(PRESETS).map((name) => <button type="button" key={name} onClick={() => applyWeights(PRESETS[name])}>{name}</button>)}</div><div className="lab-control-grid">{AGENT_NAMES.map((name) => <label key={name}>{name} Agent · {run.weights.agents[name].toFixed(0)}%<input type="range" min="5" max="70" value={run.weights.agents[name]} onChange={(event) => updateAgentWeight(name, Number(event.target.value))} /></label>)}<label>Risk aversion · {run.weights.riskAversion}<input type="range" min="0" max="100" value={run.weights.riskAversion} onChange={(event) => applyWeights({ ...run.weights, riskAversion: Number(event.target.value) })} /></label><label>Innovation preference · {run.weights.innovationPreference}<input type="range" min="0" max="100" value={run.weights.innovationPreference} onChange={(event) => applyWeights({ ...run.weights, innovationPreference: Number(event.target.value) })} /></label><label>Evidence threshold · {run.weights.evidenceThreshold}<input type="range" min="0" max="100" value={run.weights.evidenceThreshold} onChange={(event) => applyWeights({ ...run.weights, evidenceThreshold: Number(event.target.value) })} /></label><label>Uncertainty tolerance · {run.weights.uncertaintyTolerance}<input type="range" min="0" max="100" value={run.weights.uncertaintyTolerance} onChange={(event) => applyWeights({ ...run.weights, uncertaintyTolerance: Number(event.target.value) })} /></label></div><details><summary>Edit MCDA dimension weights</summary><div className="lab-control-grid">{DIMENSION_KEYS.map((key) => <label key={key}>{DIMENSION_LABELS[key]} · {run.weights.dimensions[key].toFixed(0)}%<input type="range" min="2" max="35" value={run.weights.dimensions[key]} onChange={(event) => updateDimensionWeight(key, Number(event.target.value))} /></label>)}</div></details>{rankingDeltas.length > 0 && <div className="lab-delta-table"><strong>Compare with previous configuration</strong>{rankingDeltas.slice(0, 6).map((delta) => <div key={delta.id}><span>{delta.id}</span><b>#{delta.previousRank} → #{delta.rank}</b><small>{delta.scoreDelta >= 0 ? "+" : ""}{delta.scoreDelta.toFixed(1)} · {delta.mainDriver}</small></div>)}</div>}</article>

          <article className="lab-model-panel"><header><div><span>04 · BAYESIAN UPDATE</span><h3>Prior to posterior</h3></div><p title="Updates confidence when new evidence becomes available.">A posterior remains conditional on the selected public likelihood assumptions.</p></header><div className="lab-control-grid"><label>Evidence type<select value={bayes.type} onChange={(event) => setBayes((current) => ({ ...current, type: event.target.value }))}>{EVIDENCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>{(["prior", "strength", "falsePositive", "falseNegative"] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1")} · {bayes[key]}%<input type="range" min="1" max="99" value={bayes[key]} onChange={(event) => setBayes((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div><BayesianChart result={bayesian} /><p className="lab-model-note">Likelihood positive {bayesian.likelihoodPositive}% · likelihood under alternative {bayesian.likelihoodNegative}% · confidence change {bayesian.delta >= 0 ? "+" : ""}{bayesian.delta} points.</p></article>

          <article className="lab-model-panel"><header><div><span>05 · SCENARIOS</span><h3>Downside, base and upside</h3></div><p>Scenario edits change score, estimated return, risk, confidence and recommendation.</p></header><div className="lab-control-grid">{(["growth", "adoption", "margin"] as const).map((key) => <label key={key}>{key} adjustment · {scenario[key]}<input type="range" min="-30" max="30" value={scenario[key]} onChange={(event) => setScenario((current) => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}</div><ScenarioChart scenarios={scenarios} /></article>

          <article className="lab-model-panel"><header><div><span>06 · RISK MATRIX</span><h3>Probability, impact and uncertainty</h3></div><p>Expected risk is a prioritization aid; mitigation and residual exposure still require human ownership.</p></header><RiskMatrixChart opportunity={selectedOpportunity} /><div className="lab-risk-list">{selectedOpportunity.risks.map((risk, index) => <div key={risk.name}><span>{index + 1}</span><strong>{risk.name}</strong><small>P {risk.probability.toFixed(0)} · I {risk.impact.toFixed(0)} · uncertainty {risk.uncertainty.toFixed(0)}</small><p>{risk.mitigation}</p></div>)}</div></article>

          <article className="lab-model-panel"><header><div><span>07 · PARETO</span><h3>Trade-offs without forcing one score</h3></div><p title="Highlights opportunities with stronger trade-offs that are not clearly dominated by another option.">Non-dominated points remain candidates for human comparison.</p></header><div className="lab-control-grid"><label>X objective<select value={paretoAxes.x} onChange={(event) => setParetoAxes((current) => ({ ...current, x: event.target.value as typeof paretoAxes.x }))}><option value="potential">potential</option><option value="evidence">evidence</option><option value="scalability">scalability</option></select></label><label>Y trade-off<select value={paretoAxes.y} onChange={(event) => setParetoAxes((current) => ({ ...current, y: event.target.value as typeof paretoAxes.y }))}><option value="risk">risk</option><option value="capital">capital</option><option value="novelty">novelty</option></select></label></div><ParetoChart points={pareto} opportunities={run.opportunities} /><p className="lab-model-note">{pareto.filter((point) => !point.dominated).length} non-dominated opportunities · {pareto.filter((point) => point.dominated).length} dominated under the selected public objectives.</p></article>
        </section>}

        <section className="lab-history"><div className="lab-panel-heading"><div><p className="lab-kicker">LOCAL PERSISTENCE</p><h2>Repeat and compare public runs.</h2></div><span>Stored only in this browser</span></div><div>{history.map((item) => <article key={item.id}><span>{new Date(item.createdAt).toLocaleString()}</span><h3>{item.input.analysisName}</h3><p>Seed {item.input.seed} · {item.opportunities.length} opportunities</p><button type="button" onClick={() => { setRun(item); setInput(item.input); setSelectedId(item.opportunities[0]?.id ?? null); setStatus("Completed"); }}>Load</button><button type="button" onClick={() => { const copy = duplicateRun(item); setRun(copy); setHistory(listRuns()); }}>Duplicate</button></article>)}</div></section>
      </>}

      <section className="lab-warning"><strong>Public demonstration model</strong><p>The complete architecture, agent system, scoring logic and local implementation are proprietary and are not included in this demo. This Lab uses simplified agents, synthetic data and demonstrative quantitative models. It does not constitute investment advice or predict startup success.</p></section>
    </main>
  );
}
