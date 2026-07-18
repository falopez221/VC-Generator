"use client";

import { useEffect, useMemo, useState } from "react";
import { addEvidence, generateLabRun, rerankLabRun, updateHumanDecision } from "../engine.ts";
import { BayesianChart, HistogramChart, LeastSquaresChart, ParetoChart, RadarChart, RiskMatrixChart, ScenarioChart } from "./LabCharts.tsx";
import { DEFAULT_WEIGHTS, EXAMPLES, OBJECTIVES, PRESETS, STAGES } from "../data.ts";
import { bayesianUpdate, calculateMCDA, calculateScenarios, leastSquaresTrend, normalizeWeights, paretoFront, runMonteCarlo } from "../models.ts";
import { getAudioSettings, playSound, unlockAudio } from "../audio.ts";
import { clearRuns, duplicateRun, listRuns, loadLastRun, saveRun } from "../storage.ts";
import { normalizePublicWebResearch, validateLabInput } from "../schema.ts";
import { structureIdea } from "../idea-assistant.ts";
import { AGENT_NAMES, DIMENSION_KEYS, type AgentName, type HumanDecision, type LabInput, type LabRun, type MonteCarloConfig, type Opportunity, type PublicWebResearch } from "../types.ts";
import { AGENT_GUIDES, METRIC_HELP, METRIC_READ, MODEL_GUIDES } from "../ux.ts";
import { InfoTip, ModelIntro, PanelIntro, SliderImpact } from "./LabUX.tsx";
import { LabTour } from "./LabTour.tsx";
import { DecisionModelsDashboard } from "./DecisionModelsDashboard.tsx";
import { calculateDefensibilityLens, calculateMacroeconomicLens } from "../context-lenses.ts";
import { PUBLIC_MODEL_COUNT } from "../model-catalog.ts";
import { buildCsv } from "../export.ts";
import { CinematicField } from "@/src/components/experience/CinematicField";
import { APPLICATION_LAB_HANDOFF_KEY, parseApplicationLabHandoff } from "@/src/applications/lab-handoff";

const PUBLIC_STAGE_DELAY_MS = 650;

function consumeApplicationHandoff() {
  try {
    const raw = window.sessionStorage.getItem(APPLICATION_LAB_HANDOFF_KEY);
    window.sessionStorage.removeItem(APPLICATION_LAB_HANDOFF_KEY);
    return parseApplicationLabHandoff(raw);
  } catch {
    return null;
  }
}

const EMPTY_INPUT: LabInput = {
  ideaNarrative: "",
  ideaSummary: "",
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

async function requestPublicWebResearch(input: LabInput) {
  const response = await fetch("/api/lab/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      problem: input.problem,
      thesis: input.thesis,
      industry: input.industry,
      market: input.market,
      technology: input.technology,
      region: input.region,
    }),
  });
  if (!response.ok) throw new Error("Public web research is temporarily unavailable.");
  const research = normalizePublicWebResearch(await response.json());
  if (!research) throw new Error("Public web research returned an invalid response.");
  return research;
}

function Metric({ label, value, tooltip, reading }: { label: string; value: string | number; tooltip: string; reading?: string }) {
  return <article className="lab-metric"><header><span>{label}</span><InfoTip label={label} text={tooltip} /></header><strong>{value}</strong><small>{tooltip}</small>{reading && <em><b>How to read it:</b> {reading}</em>}</article>;
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
  const [assistantNotice, setAssistantNotice] = useState("");
  const [webResearchEnabled, setWebResearchEnabled] = useState(false);
  const [researchStatus, setResearchStatus] = useState<"Idle" | "Searching" | "Completed" | "Partial" | "Unavailable">("Idle");
  const [researchNotice, setResearchNotice] = useState("Live research has not run yet.");
  const [parameterNotice, setParameterNotice] = useState("");
  const [changedControl, setChangedControl] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [bayes, setBayes] = useState({ prior: 42, strength: 65, falsePositive: 18, falseNegative: 22, type: EVIDENCE_TYPES[0] });
  const [scenario, setScenario] = useState({ growth: 0, adoption: 0, margin: 0 });
  const [paretoAxes, setParetoAxes] = useState<{ x: "potential" | "evidence" | "scalability"; y: "risk" | "capital" | "novelty" }>({ x: "potential", y: "risk" });
  const [mcConfig, setMcConfig] = useState<MonteCarloConfig>({ simulations: 1200, distribution: "triangular", seed: 4217, successThreshold: 20, marketGrowth: 120, adoption: 42, price: 24000, cac: 5200, churn: 14, margin: 62, initialInvestment: 1000000 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get("handoff") === "applications" ? consumeApplicationHandoff() : null;
    const mission = handoff?.mission ?? params.get("mission")?.slice(0, 1200) ?? "";
    const domain = handoff?.domain ?? params.get("domain")?.slice(0, 120) ?? "";
    const horizon = handoff?.horizonYears ?? Math.max(1, Math.min(25, Number(params.get("horizon")) || 5));
    const riskParam = handoff?.risk ?? params.get("risk") ?? "";
    const risk = riskParam === "critical" ? 20 : riskParam === "high-impact" ? 35 : riskParam === "elevated" ? 50 : Number(riskParam) || 50;
    const previous = loadLastRun();
    const settings = getAudioSettings();
    void settings;
    queueMicrotask(() => {
      setHistory(listRuns());
      if (mission) {
        setInput((current) => ({ ...current, ideaNarrative: mission, ideaSummary: mission.slice(0, 280), analysisName: `${domain || "Cross-domain"} mission`, problem: mission, thesis: "Explore alternatives, uncertainty and evidence before human review.", industry: domain, horizonYears: horizon, riskTolerance: risk }));
        setAssistantNotice("Mission context imported from Applications. Review and complete the parameters before running the public demonstration.");
      } else if (previous) {
        setRun(previous);
        setInput({ ...EMPTY_INPUT, ...previous.input });
        setSelectedId(previous.opportunities[0]?.id ?? null);
        setStatus("Completed");
        setMcConfig((current) => ({ ...current, seed: previous.input.seed, initialInvestment: previous.input.estimatedCapital }));
      }
    });
  }, []);

  useEffect(() => {
    if (!parameterNotice) return;
    const timer = window.setTimeout(() => setParameterNotice(""), 5200);
    return () => window.clearTimeout(timer);
  }, [parameterNotice]);

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
      }, 450);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setStageIndex((current) => current + 1);
      if ([2, 3, 4, 5].includes(stageIndex + 1)) playSound("agent.complete");
    }, PUBLIC_STAGE_DELAY_MS);
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
  const leastSquares = useMemo(() => leastSquaresTrend(pareto), [pareto]);
  const paretoXLabel = ({ potential: "Total score", evidence: "Evidence quality", scalability: "Scalability" } as const)[paretoAxes.x];
  const paretoYLabel = ({ risk: "Risk (lower is better)", capital: "Estimated capital (lower is better)", novelty: "Novelty (higher is stronger)" } as const)[paretoAxes.y];
  const mcda = useMemo(() => selectedOpportunity && run ? calculateMCDA(selectedOpportunity, run.weights) : null, [run, selectedOpportunity]);
  const contextLenses = useMemo(() => selectedOpportunity && run ? [
    calculateDefensibilityLens(selectedOpportunity, run.input),
    calculateMacroeconomicLens(selectedOpportunity, run.input),
  ] : [], [run, selectedOpportunity]);

  const updateInput = (name: keyof LabInput, value: string | number) => setInput((current) => ({ ...current, [name]: value }));
  const announceChange = (control: string, message: string) => { setChangedControl(control); setParameterNotice(message); };

  const runIdeaAssistant = (source = input) => {
    unlockAudio();
    const structured = structureIdea(source);
    if (!structured.success) {
      setErrors([structured.error ?? "Add more context before structuring the idea."]);
      setAssistantNotice("");
      playSound("evidence.warning");
      return null;
    }
    setInput(structured.input);
    setErrors([]);
    setAssistantNotice(`Summary created and parameters suggested: ${structured.detected.join(" · ")}. Review every field before running.`);
    playSound("ui.select");
    return structured.input;
  };

  const startSimulation = async (nextInput = input) => {
    if (researchStatus === "Searching") return;
    unlockAudio();
    const shouldStructure = nextInput.ideaNarrative.trim().length >= 40 && !nextInput.ideaSummary.trim();
    const automaticStructure = shouldStructure ? structureIdea(nextInput) : null;
    if (automaticStructure && !automaticStructure.success) {
      setErrors([automaticStructure.error ?? "The idea could not be structured safely."]);
      setStatus("Invalid Configuration");
      playSound("evidence.warning");
      return;
    }
    const preparedInput = automaticStructure?.input ?? nextInput;
    if (shouldStructure) {
      setInput(preparedInput);
      setAssistantNotice("The idea was summarized automatically before the run. Review the suggested parameters when you rerun or compare results.");
    }
    const validated = validateLabInput(preparedInput);
    if (!validated.success) {
      setErrors(validated.errors);
      setStatus("Invalid Configuration");
      playSound("evidence.warning");
      return;
    }
    let research: PublicWebResearch | undefined;
    if (webResearchEnabled) {
      setResearchStatus("Searching");
      setResearchNotice("The four public agents are running specialist searches across the public web…");
      try {
        research = await requestPublicWebResearch(validated.data);
        setResearchStatus(research.status);
        setResearchNotice(research.sources.length
          ? `${research.sources.length} contextual signals captured in a dated snapshot.`
          : "No matching public signals were returned. Continuing with the deterministic fallback.");
      } catch {
        setResearchStatus("Unavailable");
        setResearchNotice("Public sources are unavailable. Continuing safely with the deterministic fallback.");
      }
    } else {
      setResearchStatus("Idle");
      setResearchNotice("Live public web signals were disabled for this run.");
    }
    try {
      const generated = generateLabRun(validated.data, run?.weights ?? DEFAULT_WEIGHTS, research);
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
  const reset = () => { setRun(null); setSelectedId(null); setComparisonIds([]); setStageIndex(-1); setStatus("Ready"); setResearchStatus("Idle"); setResearchNotice("Live research has not run yet."); setErrors([]); };
  const loadExample = (name: string) => { unlockAudio(); const example = EXAMPLES[name]; setInput(example); setRun(null); setStatus("Ready"); setErrors([]); setAssistantNotice("Example loaded. Replace the full idea or edit any suggested parameter."); playSound("ui.select"); };

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
    setParameterNotice("Unverified evidence note saved. It does not change score, confidence or ranking until primary validation is recorded through an approved workflow.");
    playSound("ui.select");
  };
  const toggleCompare = (id: string) => {
    setComparisonIds((current) => current.includes(id) ? current.filter((candidate) => candidate !== id) : current.length < 3 ? [...current, id] : current);
  };
  const applyWeights = (weights: LabRun["weights"]) => {
    if (!run) return;
    const next = rerankLabRun(run, weights);
    commitRun(next.run);
    setRankingDeltas(next.deltas);
    const moved = [...next.deltas].sort((a, b) => Math.abs(b.previousRank - b.rank) - Math.abs(a.previousRank - a.rank))[0];
    setChangedControl("sensitivity");
    setParameterNotice(moved && moved.previousRank !== moved.rank
      ? `Ranking updated. ${moved.id} moved from #${moved.previousRank} to #${moved.rank}. Main reason: ${moved.mainDriver}`
      : "Ranking updated. The current order remained stable under this change.");
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
    download(`${run.id}.csv`, buildCsv([header, ...rows]), "text/csv;charset=utf-8");
  };

  return (
    <main className="lab-page lab-demo" id="lab-content">
      <LabTour />
      {parameterNotice && <div className="lab-toast" role="status" aria-live="polite"><span>UPDATED</span><p>{parameterNotice}</p></div>}
      <section className={`lab-live-field lab-live-field--${status.toLowerCase().replaceAll(" ", "-")}`}>
        <CinematicField mode="lab" state={status === "Running" ? "running" : status === "Paused" ? "paused" : status === "Completed" ? "completed" : "idle"} stage={Math.max(0, stageIndex)} opportunityCount={run?.opportunities.length ?? input.opportunityCount} />
        <div className="lab-live-field-copy">
          <div><p className="lab-kicker">SIMPLIFIED PUBLIC ORCHESTRATION MODEL</p><h2>{status === "Completed" ? "The field has converged." : status === "Running" ? "Possibilities are competing." : "Define the question. Observe the system respond."}</h2></div>
          <div className="lab-live-field-status" aria-live="polite"><span>{status.toUpperCase()}</span><strong>{stageIndex >= 0 ? `Stage ${Math.min(stageIndex + 1, 9)} / 9` : "Awaiting human input"}</strong><small>{stageIndex >= 0 ? STAGES[Math.min(stageIndex, 8)].task : "Synthetic demonstration data · deterministic and reproducible"}</small></div>
        </div>
      </section>

      <section className="lab-band">The complete Venture Governance architecture is designed for large-scale opportunity exploration. This public lab uses a reduced sample for speed, clarity and intellectual property protection.</section>

      <section className="lab-system-flow" aria-labelledby="system-flow-title">
        <div><p className="lab-kicker">SYSTEM AT A GLANCE</p><h2 id="system-flow-title">How Venture Governance Works</h2><p>This public Lab demonstrates a simplified version of the Venture Governance architecture.</p></div>
        <ol>{["Human Input", "Opportunity Generation", "Specialized AI Agents", "Quantitative Models", "Prioritization", "Human Review"].map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></li>)}</ol>
      </section>

      <section className="lab-public-agent-strip" aria-label="Four public agents">
        {AGENT_NAMES.map((name, index) => <div key={name}><span>0{index + 1}</span><strong>{name}</strong><small>Public structured agent</small></div>)}
      </section>

      <section className="lab-howto" aria-labelledby="lab-howto-title">
        <div className="lab-panel-heading"><div><p className="lab-kicker">HOW TO USE THE LAB</p><h2 id="lab-howto-title">From a question to a human decision.</h2></div><span>Four steps · accelerated public run</span></div>
        <ol className="lab-howto-steps">
          <li><span>01</span><div><strong>Define the boundary</strong><p>Describe the problem, thesis, market, technology, customer and constraints. Use a preset or replace every field with your own words.</p></div></li>
          <li><span>02</span><div><strong>Search and run</strong><p>Optionally capture current public technology and research signals, then generate 6–12 synthetic opportunities from a reproducible seed.</p></div></li>
          <li><span>03</span><div><strong>Read signals together</strong><p>Never read score alone. Compare evidence, risk, uncertainty and agent disagreement before opening an opportunity.</p></div></li>
          <li><span>04</span><div><strong>Stress-test and decide</strong><p>Change assumptions, compare up to three finalists, request evidence and record a human review state.</p></div></li>
        </ol>
        <p className="lab-howto-note"><strong>How does live research work?</strong> Mathematics, Finance, Strategy and Marketing each run a specialist query against a public Internet news index from the server. Result snippets are frozen as a dated snapshot; they guide questions but do not silently change scores.</p>
      </section>

      <section className="lab-intake" data-tour-target="configure">
        <div className="lab-panel-heading"><div><p className="lab-kicker">HUMAN INTAKE</p><h2>Define the exploration boundary.</h2></div><span>Optional public web signals · no user URLs accepted</span></div>
        <div className="lab-example-row">{Object.keys(EXAMPLES).map((name) => <button type="button" key={name} onClick={() => loadExample(name)}>Load {name}</button>)}<button type="button" onClick={() => { setInput(EMPTY_INPUT); setAssistantNotice(""); reset(); }}>Clear</button></div>
        <form onSubmit={(event) => { event.preventDefault(); void startSimulation(); }}>
          <section className="lab-idea-assistant" aria-labelledby="idea-assistant-title">
            <header><div><span>AI-READY IDEA INTAKE · PUBLIC MODE</span><h3 id="idea-assistant-title">Explain the complete idea in your own words.</h3></div><small>Local structuring assistant · not a fifth specialist agent</small></header>
            <label className="lab-field"><span>Put your full idea here / Poner idea aquí</span><textarea className="lab-idea-textarea" value={input.ideaNarrative} maxLength={4000} placeholder="Put your idea here / Poner idea aquí. Explain the problem, proposed solution, customer, market, technology, business model, evidence, risks and anything else that matters." onChange={(event) => { setInput((current) => ({ ...current, ideaNarrative: event.target.value, ideaSummary: "" })); setAssistantNotice(""); }} /><small>Do not enter confidential or personal information. Completed runs are stored in this browser for up to 30 days unless you clear them.</small></label>
            <div className="lab-assistant-actions"><button className="lab-button lab-button--primary" type="button" onClick={() => runIdeaAssistant()}>Summarize idea & suggest parameters</button><span aria-live="polite">{assistantNotice || "Structuring stays local. If live research is enabled, only the reviewed market fields are sent to the server-side public search."}</span></div>
            {input.ideaSummary && <label className="lab-field"><span>Assistant summary · editable</span><textarea className="lab-summary-textarea" value={input.ideaSummary} maxLength={900} onChange={(event) => updateInput("ideaSummary", event.target.value)} /></label>}
            <p>This assistant prepares the intake for Mathematics, Finance, Strategy and Marketing. It does not add another public agent, and its suggested parameters remain editable.</p>
          </section>
          <div className="lab-parameter-divider"><span>STRUCTURED PARAMETERS</span><p>Review and correct the assistant suggestions before running the simulation.</p></div>
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
            <label className={`lab-field ${changedControl === "riskTolerance" ? "is-modified" : ""}`}><span>Risk tolerance · {input.riskTolerance}</span><input type="range" min="0" max="100" value={input.riskTolerance} onChange={(event) => { updateInput("riskTolerance", Number(event.target.value)); announceChange("riskTolerance", "Risk tolerance updated. The next run will recalculate risk-adjusted ranking and prioritization."); }} /><SliderImpact /></label>
            <label className={`lab-field ${changedControl === "innovationLevel" ? "is-modified" : ""}`}><span>Innovation level · {input.innovationLevel}</span><input type="range" min="0" max="100" value={input.innovationLevel} onChange={(event) => { updateInput("innovationLevel", Number(event.target.value)); announceChange("innovationLevel", "Innovation preference updated. The next run will rebalance novelty, risk and final prioritization."); }} /><SliderImpact /></label>
            <label className={`lab-field ${changedControl === "opportunityCount" ? "is-modified" : ""}`}><span>Opportunities · {input.opportunityCount}</span><input type="range" min="6" max="12" value={input.opportunityCount} onChange={(event) => { updateInput("opportunityCount", Number(event.target.value)); announceChange("opportunityCount", "Opportunity count updated. The next run will change the generated set, ranking and review workload."); }} /><SliderImpact items={["Opportunity generation", "Ranking set", "Human review workload"]} /></label>
            <label className="lab-field lab-field--wide"><span>Known signals</span><textarea value={input.knownSignals} maxLength={600} onChange={(event) => updateInput("knownSignals", event.target.value)} /></label>
            <label className="lab-field lab-field--wide"><span>Available evidence</span><textarea value={input.availableEvidence} maxLength={600} onChange={(event) => updateInput("availableEvidence", event.target.value)} /></label>
          </div>
          <section className="lab-web-control" aria-labelledby="web-research-control-title">
            <label>
              <input type="checkbox" checked={webResearchEnabled} disabled={researchStatus === "Searching"} onChange={(event) => setWebResearchEnabled(event.target.checked)} />
              <span><strong id="web-research-control-title">Let the four agents search the Internet</strong><small>Off by default. When enabled, problem, thesis, industry, market, technology and region are reduced to bounded keywords and sent by the server to Google News RSS. Do not include confidential information. Snippets remain unverified context and never change ranking.</small></span>
            </label>
            <div className={`lab-research-state is-${researchStatus.toLowerCase()}`} role="status" aria-live="polite"><span>{researchStatus}</span><p>{researchNotice}</p></div>
          </section>
          {errors.length > 0 && <div className="lab-errors" role="alert" aria-atomic="true">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
          <div className="lab-run-actions" data-tour-target="run"><button className="lab-button lab-button--primary" type="submit" disabled={researchStatus === "Searching"}>{researchStatus === "Searching" ? "Agents are searching the web…" : webResearchEnabled ? "Agents Search Web & Run Lab Simulation" : "Run Lab Simulation"}</button>{status === "Running" && <button className="lab-button" type="button" onClick={pause}>Pause</button>}{status === "Paused" && <button className="lab-button" type="button" onClick={resume}>Resume</button>}{run && <button className="lab-button" type="button" onClick={() => void startSimulation(input)}>Run again</button>}<button className="lab-button" type="button" onClick={reset}>Reset</button>{run && <button className="lab-button" type="button" onClick={() => void startSimulation({ ...input, seed: input.seed + 1 })}>Change seed & run</button>}</div>
        </form>
      </section>

      {run && <>
        <section className="lab-progress" aria-live="polite">{STAGES.map((stage, index) => { const stageStatus = index < stageIndex || (index === stageIndex && status === "Completed") ? "Completed" : index === stageIndex && status === "Paused" ? "Paused" : index === stageIndex ? "Active" : "Waiting"; const processed = index <= stageIndex ? run.opportunities.length : 0; return <article className={`stage-${stageStatus.toLowerCase()}`} key={stage.id}><span>{String(stage.id).padStart(2, "0")}</span><div><strong>{stage.label}</strong><small>{stage.owner} · ~0.6s accelerated demo step</small><p>{stage.task} · {processed}/{run.opportunities.length} opportunities</p></div><b>{stageStatus}</b></article>; })}</section>

        {run.webResearch && <section className="lab-web-research" aria-labelledby="web-research-title">
          <div className="lab-panel-heading"><div><p className="lab-kicker">PUBLIC WEB SNAPSHOT</p><h2 id="web-research-title">Current signals, separated from synthetic estimates.</h2></div><span>{run.webResearch.status} · {run.webResearch.sources.length} sources · {new Date(run.webResearch.retrievedAt).toLocaleString()}</span></div>
          <div className="lab-web-summary"><div><span>FOUR SPECIALIST QUERIES</span><ul>{AGENT_NAMES.map((agentName) => <li key={agentName}><strong>{agentName}</strong><p>{run.webResearch?.agentQueries[agentName]}</p></li>)}</ul></div><div><span>INTERPRETATION</span><p>These Internet results help each public agent frame hypotheses in its own domain. They do not prove demand, unit economics, feasibility or investability.</p></div></div>
          {run.webResearch.sources.length > 0 ? <div className="lab-web-source-grid">{run.webResearch.sources.map((source) => <article key={source.id}><div><span>{source.id} · {source.agentName} · {source.kind}</span><small>{source.publishedAt ? new Date(source.publishedAt).toLocaleDateString() : "Date unavailable"}</small></div><h3>{source.title}</h3><p>{source.snippet}</p><a href={source.url} target="_blank" rel="noreferrer">Open source website: {source.source}<span aria-hidden="true"> ↗</span></a></article>)}</div> : <p className="lab-web-empty">No matching Internet results were available. All four agents continued with the local deterministic fallback.</p>}
          <ul className="lab-web-warnings">{run.webResearch.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>}

        <section className="lab-dashboard" aria-label="Executive overview">
          <div className="lab-panel-heading"><div><p className="lab-kicker">EXECUTIVE OVERVIEW</p><h2>{run.input.analysisName}</h2></div><div className="lab-export"><a href={`/lab/results/${run.id}`}>Open result view</a><button type="button" onClick={exportJson}>Export JSON</button><button type="button" onClick={exportCsv}>Export CSV</button><button type="button" onClick={() => window.print()}>Print</button></div></div>
          <PanelIntro shows="A compact view of generated opportunities, average signals and the path to human review." useful="It lets you detect weak evidence, elevated risk or disagreement before opening individual opportunities." />
          {run.input.ideaSummary && <div className="lab-executive-summary"><span>STRUCTURED IDEA SUMMARY</span><p>{run.input.ideaSummary}</p><small>Assistant-generated starting point · review against the original narrative and structured parameters</small></div>}
          {metrics && <div className="lab-metrics"><Metric label="Generated" value={run.opportunities.length} tooltip={METRIC_HELP.generated} reading={METRIC_READ.generated} /><Metric label="Average score" value={metrics.score} tooltip={METRIC_HELP.score} reading={METRIC_READ.score} /><Metric label="Average evidence" value={`${metrics.evidence}%`} tooltip={METRIC_HELP.evidence} reading={METRIC_READ.evidence} /><Metric label="Average risk" value={`${metrics.risk}%`} tooltip={METRIC_HELP.risk} reading={METRIC_READ.risk} /><Metric label="Uncertainty" value={`${metrics.uncertainty}%`} tooltip={METRIC_HELP.uncertainty} reading={METRIC_READ.uncertainty} /><Metric label="Agent disagreement" value={metrics.disagreement} tooltip={METRIC_HELP.disagreement} reading={METRIC_READ.disagreement} /><Metric label="Pending review" value={metrics.pending} tooltip={METRIC_HELP.pending} reading={METRIC_READ.pending} /></div>}
          <details className="lab-reading-guide" open>
            <summary>How to read this dashboard</summary>
            <div className="lab-reading-grid">
              <article><span>SCORE</span><strong>Comparative priority, not success probability.</strong><p>Higher means stronger under the current visible assumptions. A 70 does not mean a 70% chance of success.</p></article>
              <article><span>EVIDENCE</span><strong>How much support the estimate has.</strong><p>Higher is better. A strong score with weak evidence should trigger validation, not confidence.</p></article>
              <article><span>RISK</span><strong>Lower is preferable, but context matters.</strong><p>Open the risk matrix to inspect probability, impact, uncertainty and proposed mitigation.</p></article>
              <article><span>UNCERTAINTY</span><strong>How unstable the conclusion may be.</strong><p>High uncertainty means plausible input changes can materially alter the result or its ranking.</p></article>
              <article><span>AGENT DISAGREEMENT</span><strong>Difference between specialist views.</strong><p>A high value is a review signal: inspect each agent instead of averaging away the conflict.</p></article>
              <article><span>CATEGORY & RANK</span><strong>Conditional labels, not approvals.</strong><p>Rank compares the current set. Categories are gated by evidence and uncertainty; arrows show movement after recalculation.</p></article>
            </div>
            <ol className="lab-reading-sequence">
              <li><span>1</span>Scan score, evidence, risk and uncertainty together.</li>
              <li><span>2</span>Open the opportunity and inspect the four agents.</li>
              <li><span>3</span>Change weights, scenarios or evidence and watch the ranking move.</li>
              <li><span>4</span>Compare finalists and record the human decision.</li>
            </ol>
            <p className="lab-reading-rule"><strong>Recommended pattern:</strong> prioritize opportunities that combine a stronger score, stronger evidence, manageable risk and lower uncertainty. If those signals conflict, request more evidence before deciding.</p>
          </details>
          <div className="lab-funnel" aria-label="Public opportunity funnel">{[[run.opportunities.length + 2, "Initial"], [2, "Duplicates removed"], [run.opportunities.length, "First filter"], [run.opportunities.length, "Agent analysis"], [run.opportunities.length, "Quantitative Lab"], [Math.min(3, run.opportunities.length), "Finalists"], [metrics?.pending ?? 0, "Human review"]].map(([value, label], index) => <div key={String(label)} style={{ width: `${100 - index * 7}%` }}><strong>{value}</strong><span>{label}</span></div>)}</div>
        </section>

        <section className="lab-orchestration">
          <div className="lab-panel-heading"><div><p className="lab-kicker">FOUR PUBLIC AGENTS</p><h2>Click a node to inspect structured output.</h2></div><span>Active connections show public result exchange, not private reasoning.</span></div>
          <PanelIntro shows="Four specialist evaluations of the selected opportunity and where their scores agree or diverge." useful="It reveals the role, inputs, outputs and limitations behind each specialist perspective." />
          <div className="lab-agent-network" role="group" aria-label="Interactive network of four public agents"><div className="lab-agent-core"><span>HUMAN INPUT</span><strong>Public Orchestrator</strong><small>Simplified model</small></div>{AGENT_NAMES.map((name, index) => <button key={name} type="button" className={`${selectedAgent === name ? "is-selected" : ""} ${stageIndex === index + 2 && status === "Running" ? "is-active" : ""}`} onClick={() => { unlockAudio(); setSelectedAgent(name); playSound("agent.activate"); }}><span>0{index + 1}</span><strong>{name}</strong><small>{selectedOpportunity?.agents[name].status ?? "Waiting"}</small></button>)}</div>
          {selectedOpportunity && <div className="lab-agent-inspector" aria-live="polite">
            <div className="lab-agent-profile">
              <div><span>{selectedAgent} Agent</span><h3>{selectedOpportunity.agents[selectedAgent].domain}</h3><ul className="lab-agent-findings">{selectedOpportunity.agents[selectedAgent].findings.map((finding) => <li key={finding}>{finding}</li>)}</ul></div>
              <div className="lab-agent-guide"><article><span>ROLE</span><p>{AGENT_GUIDES[selectedAgent].role}</p></article><article><span>INPUTS</span><div>{AGENT_GUIDES[selectedAgent].inputs.map((item) => <small key={item}>{item}</small>)}</div></article><article><span>OUTPUTS</span><div>{AGENT_GUIDES[selectedAgent].outputs.map((item) => <small key={item}>{item}</small>)}</div></article><article><span>WHAT IT EVALUATES</span><p>{AGENT_GUIDES[selectedAgent].evaluates}</p></article><article><span>LIMITATIONS</span><p>{AGENT_GUIDES[selectedAgent].limitations}</p></article></div>
            </div>
            <dl><div><dt>Score <InfoTip label="agent score" text={METRIC_HELP.score} /></dt><dd>{selectedOpportunity.agents[selectedAgent].score}</dd></div><div><dt>Confidence <InfoTip label="confidence" text={METRIC_HELP.confidence} /></dt><dd>{selectedOpportunity.agents[selectedAgent].confidence}%</dd></div><div><dt>Evidence <InfoTip label="evidence" text={METRIC_HELP.evidence} /></dt><dd>{selectedOpportunity.agents[selectedAgent].evidenceQuality}%</dd></div></dl>
            <div><strong>Assumption</strong><p>{selectedOpportunity.agents[selectedAgent].assumptions[0]}</p><strong>Missing evidence</strong><p>{selectedOpportunity.agents[selectedAgent].missingEvidence[0]}</p><strong>Cross-agent criticism</strong><p>{selectedOpportunity.agents[selectedAgent].criticism}</p></div>
          </div>}
          <div className="lab-disagreement-heatmap" role="img" aria-label="Agent score heatmap across public opportunities"><div className="heatmap-head"><span>Agent</span>{run.opportunities.map((opportunity) => <span key={opportunity.id}>{opportunity.id}</span>)}</div>{AGENT_NAMES.map((name) => <div key={name}><strong>{name}</strong>{run.opportunities.map((opportunity) => <span key={opportunity.id} style={{ opacity: Math.max(.4, opportunity.agents[name].score / 100) }} title={`${name} score for ${opportunity.name}: ${opportunity.agents[name].score}`}>{opportunity.agents[name].score.toFixed(0)}</span>)}</div>)}</div>
          {selectedOpportunity && <section className="lab-context-lenses" aria-labelledby="context-lenses-title"><header><div><span>ADDITIONAL PUBLIC CONTEXT</span><h3 id="context-lenses-title">Defense and macroeconomic lenses</h3></div><small>Deterministic models · not additional agents · no ranking impact</small></header><p>These two review lenses cover competitive defense and macroeconomic exposure while the visible specialist network remains limited to Mathematics, Finance, Strategy and Marketing.</p><div>{contextLenses.map((lens) => <article key={lens.name}><span>{lens.name}</span><strong>{lens.score}</strong><small>{lens.status} · exposure {lens.exposure}</small><p>{lens.summary}</p><b>Next evidence</b><p>{lens.missingEvidence[0]}</p></article>)}</div></section>}
        </section>

        <section className="lab-ranking" data-tour-target="ranking">
          <div className="lab-panel-heading"><div><p className="lab-kicker">RANKING</p><h2>Opportunities for human review.</h2></div><span>High score plus weak evidence is never automatically “Highly Promising”.</span></div>
          <PanelIntro shows="This panel ranks the generated opportunities after combining four specialist evaluations and public quantitative models." useful="It identifies which opportunities deserve deeper human review and shows how the order changes under new assumptions." />
          <div className="lab-sort-row" aria-label="Sort ranking"><span>Sort by</span>{(["rank", "score", "risk", "evidence"] as const).map((key) => <button type="button" aria-pressed={sortKey === key} onClick={() => setSortKey(key)} key={key}>{key}</button>)}</div>
          <div className="lab-ranking-table" role="table" aria-label="Sortable public opportunity ranking">
            <div className="lab-rank-head" role="row"><span>Rank</span><span>Opportunity</span><span>Total <InfoTip label="total score" text={METRIC_HELP.score} /></span>{AGENT_NAMES.map((name) => <span key={name}>{name.slice(0, 4)} <InfoTip label={`${name} score`} text={`Visible public score produced by the ${name} specialist for this opportunity.`} /></span>)}<span>Risk <InfoTip label="risk" text={METRIC_HELP.risk} /></span><span>Evidence <InfoTip label="evidence" text={METRIC_HELP.evidence} /></span><span>Decision</span></div>
            {displayedOpportunities.map((opportunity) => <div className={`lab-rank-row ${selectedOpportunity?.id === opportunity.id ? "is-selected" : ""} ${opportunity.previousRank !== opportunity.rank ? "is-rank-changed" : ""}`} role="row" key={opportunity.id}><button type="button" className="rank-open" onClick={() => setSelectedId(opportunity.id)}><strong>#{opportunity.rank}</strong>{opportunity.previousRank !== opportunity.rank && <small>{opportunity.previousRank > opportunity.rank ? "↑" : "↓"}{Math.abs(opportunity.previousRank - opportunity.rank)}</small>}</button><button type="button" className="rank-name" onClick={() => setSelectedId(opportunity.id)}><strong>{opportunity.name}</strong><small>{opportunity.category}</small></button><strong>{opportunity.totalScore.toFixed(1)}</strong>{AGENT_NAMES.map((name) => <span key={name}>{opportunity.agents[name].score.toFixed(0)}</span>)}<span>{opportunity.dimensions.risk.toFixed(0)}</span><span>{opportunity.dimensions.evidenceQuality.toFixed(0)}</span><div><small>{opportunity.humanDecision}</small><button type="button" aria-pressed={comparisonIds.includes(opportunity.id)} onClick={() => toggleCompare(opportunity.id)}>{comparisonIds.includes(opportunity.id) ? "Remove" : "Compare"}</button></div></div>)}
          </div>
        </section>

        {comparison.length > 0 && <section className="lab-comparison"><div className="lab-panel-heading"><div><p className="lab-kicker">COMPARE · UP TO THREE</p><h2>Trade-offs side by side.</h2></div><button type="button" onClick={() => setComparisonIds([])}>Clear comparison</button></div><PanelIntro shows="The selected finalists aligned across score, risk, evidence, uncertainty and capital." useful="It exposes trade-offs that disappear when opportunities are viewed one at a time." /><div>{comparison.map((opportunity) => <article key={opportunity.id}><span>#{opportunity.rank} · {opportunity.category}</span><h3>{opportunity.name}</h3><strong>{opportunity.totalScore.toFixed(1)} <InfoTip label="total score" text={METRIC_HELP.score} /></strong><dl><div><dt>Risk <InfoTip label="risk" text={METRIC_HELP.risk} /></dt><dd>{opportunity.dimensions.risk.toFixed(0)}</dd></div><div><dt>Evidence <InfoTip label="evidence" text={METRIC_HELP.evidence} /></dt><dd>{opportunity.dimensions.evidenceQuality.toFixed(0)}</dd></div><div><dt>Uncertainty <InfoTip label="uncertainty" text={METRIC_HELP.uncertainty} /></dt><dd>{opportunity.uncertainty.toFixed(0)}</dd></div><div><dt>Capital <InfoTip label="estimated capital" text="Synthetic early capital requirement used only for comparison in this public demonstration." /></dt><dd>${Math.round(opportunity.estimatedCapital / 1000)}k</dd></div></dl><p>{opportunity.proposedSolution}</p></article>)}</div></section>}

        {selectedOpportunity && <section className="lab-detail">
          <div className="lab-panel-heading"><div><p className="lab-kicker">OPPORTUNITY DETAIL · {selectedOpportunity.id}</p><h2>{selectedOpportunity.name}</h2></div><div><span>{selectedOpportunity.category}</span><strong>{selectedOpportunity.totalScore.toFixed(1)}</strong><button type="button" onClick={() => setSelectedId(null)}>Close detail</button></div></div>
          <div className="lab-opportunity-guide"><div><span>HOW TO READ THIS OPPORTUNITY</span><p>This opportunity was independently evaluated by four specialized agents. The ranking combines their structured outputs with public quantitative models.</p></div><div>{AGENT_NAMES.map((name) => <small key={name}>{name}</small>)}</div></div>
          <div className="lab-detail-grid"><div><h3>Problem</h3><p>{selectedOpportunity.problem}</p><h3>Proposed solution</h3><p>{selectedOpportunity.proposedSolution}</p><h3>Target customer</h3><p>{selectedOpportunity.targetCustomer}</p><h3>Business model</h3><p>{selectedOpportunity.businessModel}</p><h3>Evidence ledger</h3><ul>{selectedOpportunity.availableEvidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul><h3>Critical hypotheses</h3><ul>{selectedOpportunity.criticalHypotheses.map((hypothesis) => <li key={hypothesis}>{hypothesis}</li>)}</ul></div><div><RadarChart opportunity={selectedOpportunity} /><h3>What would change this conclusion?</h3><p>Observed willingness to pay, lower acquisition cost, a failed technical prototype, a strong competitor response, or evidence that the problem is less urgent could materially change confidence and ranking.</p><h3>Lean Startup experiment</h3><p>Build the smallest measurable workflow prototype, define a behavioral success threshold and compare it with the current alternative.</p><h3>Jobs To Be Done</h3><p>When the target team faces the stated constraint, help it make a traceable decision with less coordination cost and clearer evidence.</p></div></div>
          <div className="lab-human-review-copy"><span>HUMAN REVIEW</span><strong>The system never makes investment decisions.</strong><p>Its role is to generate, analyze and prioritize opportunities. Final decisions always remain under human supervision.</p></div>
          <div className="lab-human-actions" aria-label="Human supervision"><button type="button" onClick={() => decide("Saved")}>Save</button><button type="button" onClick={() => toggleCompare(selectedOpportunity.id)}>Compare</button><button type="button" onClick={() => decide("More evidence")}>Request more evidence</button><button type="button" onClick={() => decide("Promising")}>Mark as promising</button><button type="button" onClick={() => decide("Uncertain")}>Uncertain</button><button type="button" onClick={() => decide("Rejected")}>Reject</button></div>
          <div className="lab-evidence-add"><label><span>Add an unverified evidence note</span><input value={evidenceText} maxLength={300} onChange={(event) => setEvidenceText(event.target.value)} placeholder="Observed result, interview, prototype or public artifact" /></label><button type="button" onClick={submitEvidence}>Save note</button></div>
        </section>}

        {selectedOpportunity && <section className="lab-quant" data-tour-target="models">
          <div className="lab-panel-heading"><div><p className="lab-kicker">PUBLIC QUANTITATIVE LABORATORY</p><h2>Change assumptions. Recalculate. Inspect limits.</h2></div><span>Demonstrative public formulas · not the private scoring system</span></div>
          <PanelIntro shows={`${PUBLIC_MODEL_COUNT} transparent public models applied to the selected opportunity, from weighted criteria to unit economics, defensibility, macro exposure, validation priority and seeded rank robustness.`} useful="They let you test whether a conclusion survives different assumptions before it reaches human review." />
          <article className="lab-model-panel"><header><div><span>01 · MCDA</span><h3>Visible contribution and adjustment</h3></div><p title="Combines visible criteria and weights.">Weights are normalized to 100%. Risk is inverted, then visible evidence and uncertainty adjustments are applied.</p></header><ModelIntro {...MODEL_GUIDES.MCDA} />{mcda && <><div className="lab-mcda-summary"><Metric label="Raw" value={mcda.rawScore} tooltip="Weighted dimension sum before public adjustments." /><Metric label="Weighted" value={mcda.weightedScore} tooltip="Public score after visible risk/evidence/uncertainty adjustments." /><Metric label="Risk penalty" value={`−${mcda.riskPenalty}`} tooltip="Demonstrative penalty from visible risk and risk aversion." /><Metric label="Evidence adjustment" value={`${mcda.evidenceAdjustment >= 0 ? "+" : ""}${mcda.evidenceAdjustment}`} tooltip="Visible support or penalty from evidence quality and the selected threshold." /><Metric label="Uncertainty penalty" value={`−${mcda.uncertaintyPenalty}`} tooltip="Uncertainty scaled by the inverse of the selected tolerance." /><Metric label="Interval" value={`${mcda.interval[0]}–${mcda.interval[1]}`} tooltip="Illustrative uncertainty interval, not a confidence guarantee." /></div><div className="lab-contributions">{DIMENSION_KEYS.map((key) => <div key={key}><span>{DIMENSION_LABELS[key]}</span><i><b style={{ width: `${Math.min(100, mcda.contributions[key] * 7)}%` }} /></i><strong>{mcda.contributions[key].toFixed(1)}</strong></div>)}</div></>}</article>

          <article className="lab-model-panel">
            <header><div><span>02 · MONTE CARLO</span><h3>Distribution, not a single forecast</h3></div><p title="Explores many possible outcomes by repeatedly varying uncertain inputs.">Same seed and parameters produce the same distribution.</p></header>
            <ModelIntro {...MODEL_GUIDES["Monte Carlo"]} />
            <div className="lab-control-grid">
              <label>Distribution<select value={mcConfig.distribution} onChange={(event) => { setMcConfig((current) => ({ ...current, distribution: event.target.value as MonteCarloConfig["distribution"] })); announceChange("mc-distribution", "Monte Carlo distribution updated. The chart now uses a different public uncertainty shape."); }}>{["normal", "triangular", "beta", "uniform", "bernoulli"].map((name) => <option key={name}>{name}</option>)}</select><small className="lab-control-note">Changes the shape used to model uncertainty.</small></label>
              <label className={changedControl === "mc-simulations" ? "is-modified" : ""}>Simulations · {mcConfig.simulations}<input type="range" min="200" max="5000" step="200" value={mcConfig.simulations} onChange={(event) => { setMcConfig((current) => ({ ...current, simulations: Number(event.target.value) })); announceChange("mc-simulations", "Simulation count updated. More trials make the displayed distribution smoother, not more certain."); }} /><SliderImpact items={["Outcome distribution", "Probability estimates", "Chart stability"]} /></label>
              <label>Seed<input type="number" value={mcConfig.seed} onChange={(event) => { setMcConfig((current) => ({ ...current, seed: Number(event.target.value) })); announceChange("mc-seed", "Seed updated. Reproducible simulated outcomes were regenerated."); }} /><small className="lab-control-note">Keeps repeated runs reproducible.</small></label>
              <label className={changedControl === "mc-threshold" ? "is-modified" : ""}>Success threshold · {mcConfig.successThreshold}%<input type="range" min="-20" max="100" value={mcConfig.successThreshold} onChange={(event) => { setMcConfig((current) => ({ ...current, successThreshold: Number(event.target.value) })); announceChange("mc-threshold", "Success threshold updated. The probability above threshold was recalculated."); }} /><SliderImpact items={["Probability above threshold", "Decision context", "Outcome interpretation"]} /></label>
              {(["marketGrowth", "adoption", "price", "cac", "churn", "margin", "initialInvestment"] as const).map((key) => {
                const control = key === "marketGrowth"
                  ? { label: "Addressable customers", min: 25, max: 5000, step: 25 }
                  : key === "price"
                    ? { label: "Annual price", min: 1000, max: 100000, step: 1000 }
                    : key === "initialInvestment"
                      ? { label: "Initial investment", min: 25000, max: 5000000, step: 25000 }
                      : key === "cac"
                        ? { label: "CAC", min: 0, max: 25000, step: 100 }
                        : { label: key.replace(/([A-Z])/g, " $1"), min: 0, max: 100, step: 1 };
                return <label className={changedControl === `mc-${key}` ? "is-modified" : ""} key={key}>{control.label} · {mcConfig[key]}<input type="range" min={control.min} max={control.max} step={control.step} value={mcConfig[key]} onChange={(event) => { setMcConfig((current) => ({ ...current, [key]: Number(event.target.value) })); announceChange(`mc-${key}`, `${control.label} updated. The outcome distribution and probabilities were recalculated.`); }} /><SliderImpact items={["Outcome distribution", "Expected return", "Loss probability"]} /></label>;
              })}
            </div>
            {monteCarlo && <><HistogramChart result={monteCarlo} /><div className="lab-metrics"><Metric label="Mean" value={`${monteCarlo.mean}%`} tooltip="Average simulated return under public assumptions." /><Metric label="Median" value={`${monteCarlo.median}%`} tooltip="50th percentile." /><Metric label="P10 / P90" value={`${monteCarlo.p10}% / ${monteCarlo.p90}%`} tooltip="Illustrative public outcome range." /><Metric label="Above threshold" value={`${monteCarlo.probabilityAboveThreshold}%`} tooltip="Share of simulations above the editable threshold." /><Metric label="Loss probability" value={`${monteCarlo.probabilityOfLoss}%`} tooltip="Share of simulations below zero." /></div></>}
          </article>

          <article className="lab-model-panel">
            <header><div><span>03 · SENSITIVITY</span><h3>Ranking under alternative priorities</h3></div><p title="Shows which assumptions have the greatest influence on the result.">Agent and dimension weights always normalize to 100%.</p></header>
            <ModelIntro {...MODEL_GUIDES.Sensitivity} />
            <div className="lab-presets"><span>Demonstrative public presets</span>{Object.keys(PRESETS).map((name) => <button type="button" key={name} onClick={() => applyWeights(PRESETS[name])}>{name}</button>)}</div>
            <div className="lab-control-grid">
              {AGENT_NAMES.map((name) => <label className={changedControl === "sensitivity" ? "is-modified" : ""} key={name}>{name} Agent · {run.weights.agents[name].toFixed(0)}%<input type="range" min="5" max="70" value={run.weights.agents[name]} onChange={(event) => updateAgentWeight(name, Number(event.target.value))} /><SliderImpact /></label>)}
              <label className={changedControl === "sensitivity" ? "is-modified" : ""}>Risk aversion · {run.weights.riskAversion}<input type="range" min="0" max="100" value={run.weights.riskAversion} onChange={(event) => applyWeights({ ...run.weights, riskAversion: Number(event.target.value) })} /><SliderImpact /></label>
              <label className={changedControl === "sensitivity" ? "is-modified" : ""}>Innovation preference · {run.weights.innovationPreference}<input type="range" min="0" max="100" value={run.weights.innovationPreference} onChange={(event) => applyWeights({ ...run.weights, innovationPreference: Number(event.target.value) })} /><SliderImpact /></label>
              <label className={changedControl === "sensitivity" ? "is-modified" : ""}>Evidence threshold · {run.weights.evidenceThreshold}<input type="range" min="0" max="100" value={run.weights.evidenceThreshold} onChange={(event) => applyWeights({ ...run.weights, evidenceThreshold: Number(event.target.value) })} /><SliderImpact /></label>
              <label className={changedControl === "sensitivity" ? "is-modified" : ""}>Uncertainty tolerance · {run.weights.uncertaintyTolerance}<input type="range" min="0" max="100" value={run.weights.uncertaintyTolerance} onChange={(event) => applyWeights({ ...run.weights, uncertaintyTolerance: Number(event.target.value) })} /><SliderImpact /></label>
            </div>
            <details><summary>Edit MCDA dimension weights</summary><div className="lab-control-grid">{DIMENSION_KEYS.map((key) => <label className={changedControl === "sensitivity" ? "is-modified" : ""} key={key}>{DIMENSION_LABELS[key]} · {run.weights.dimensions[key].toFixed(0)}%<input type="range" min="2" max="35" value={run.weights.dimensions[key]} onChange={(event) => updateDimensionWeight(key, Number(event.target.value))} /><SliderImpact /></label>)}</div></details>
            {rankingDeltas.length > 0 && <div className="lab-delta-table"><strong>Compare with previous configuration</strong>{rankingDeltas.slice(0, 6).map((delta) => <div key={delta.id}><span>{delta.id}</span><b>#{delta.previousRank} → #{delta.rank}</b><small>{delta.scoreDelta >= 0 ? "+" : ""}{delta.scoreDelta.toFixed(1)} · {delta.mainDriver}</small></div>)}</div>}
          </article>

          <article className="lab-model-panel">
            <header><div><span>04 · BAYESIAN UPDATE</span><h3>Prior to posterior</h3></div><p title="Updates confidence when new evidence becomes available.">A posterior remains conditional on the selected public likelihood assumptions.</p></header>
            <ModelIntro {...MODEL_GUIDES["Bayesian Update"]} />
            <div className="lab-control-grid"><label>Evidence type<select value={bayes.type} onChange={(event) => { setBayes((current) => ({ ...current, type: event.target.value })); announceChange("bayes-type", "Evidence type updated. Posterior confidence was recalculated under new public assumptions."); }}>{EVIDENCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select><small className="lab-control-note">Changes how the evidence is interpreted.</small></label>{(["prior", "strength", "falsePositive", "falseNegative"] as const).map((key) => <label className={changedControl === `bayes-${key}` ? "is-modified" : ""} key={key}>{key.replace(/([A-Z])/g, " $1")} · {bayes[key]}%<input type="range" min="1" max="99" value={bayes[key]} onChange={(event) => { setBayes((current) => ({ ...current, [key]: Number(event.target.value) })); announceChange(`bayes-${key}`, `${key.replace(/([A-Z])/g, " $1")} updated. Posterior confidence and evidence interpretation changed.`); }} /><SliderImpact items={["Posterior confidence", "Evidence interpretation", "Decision context"]} /></label>)}</div>
            <BayesianChart result={bayesian} /><p className="lab-model-note">Likelihood positive {bayesian.likelihoodPositive}% · likelihood under alternative {bayesian.likelihoodNegative}% · confidence change {bayesian.delta >= 0 ? "+" : ""}{bayesian.delta} points.</p>
          </article>

          <article className="lab-model-panel"><header><div><span>05 · SCENARIOS</span><h3>Downside, base and upside</h3></div><p>Scenario edits change score, an illustrative return index, risk, confidence and recommendation.</p></header><ModelIntro {...MODEL_GUIDES.Scenarios} /><div className="lab-control-grid">{(["growth", "adoption", "margin"] as const).map((key) => <label className={changedControl === `scenario-${key}` ? "is-modified" : ""} key={key}>{key} adjustment · {scenario[key]}<input type="range" min="-30" max="30" value={scenario[key]} onChange={(event) => { setScenario((current) => ({ ...current, [key]: Number(event.target.value) })); announceChange(`scenario-${key}`, `${key} scenario updated. Score, risk, confidence and recommendation were recalculated.`); }} /><SliderImpact items={["Scenario score", "Risk and confidence", "Recommendation"]} /></label>)}</div><ScenarioChart scenarios={scenarios} /></article>

          <article className="lab-model-panel"><header><div><span>06 · RISK MATRIX</span><h3>Probability, impact and uncertainty</h3></div><p>Expected risk is a prioritization aid; mitigation and residual exposure still require human ownership.</p></header><ModelIntro {...MODEL_GUIDES["Risk Matrix"]} /><RiskMatrixChart opportunity={selectedOpportunity} /><div className="lab-risk-list">{selectedOpportunity.risks.map((risk, index) => <div key={risk.name}><span>{index + 1}</span><strong>{risk.name}</strong><small>P {risk.probability.toFixed(0)} · I {risk.impact.toFixed(0)} · uncertainty {risk.uncertainty.toFixed(0)}</small><p>{risk.mitigation}</p></div>)}</div></article>

          <article className="lab-model-panel"><header><div><span>07 · PARETO</span><h3>Trade-offs without forcing one score</h3></div><p title="Highlights opportunities with stronger trade-offs that are not clearly dominated by another option.">Non-dominated points remain candidates for human comparison.</p></header><ModelIntro {...MODEL_GUIDES.Pareto} /><div className="lab-control-grid"><label>X objective<select value={paretoAxes.x} onChange={(event) => setParetoAxes((current) => ({ ...current, x: event.target.value as typeof paretoAxes.x }))}><option value="potential">potential</option><option value="evidence">evidence</option><option value="scalability">scalability</option></select></label><label>Y trade-off<select value={paretoAxes.y} onChange={(event) => setParetoAxes((current) => ({ ...current, y: event.target.value as typeof paretoAxes.y }))}><option value="risk">risk</option><option value="capital">capital</option><option value="novelty">novelty</option></select></label></div><ParetoChart points={pareto} opportunities={run.opportunities} xLabel={paretoXLabel} yLabel={paretoYLabel} /><div className="lab-chart-reading"><strong>How to read it</strong><p>Each small circle is one opportunity. The straight vertical and horizontal lines project its exact position onto both axes. Cyan points are non-dominated: no other opportunity is clearly better on both selected objectives. Gray points are dominated under this view, but can still matter under different assumptions.</p></div><p className="lab-model-note">{pareto.filter((point) => !point.dominated).length} non-dominated opportunities · {pareto.filter((point) => point.dominated).length} dominated under the selected public objectives.</p></article>

          <article className="lab-model-panel"><header><div><span>08 · LEAST SQUARES</span><h3>Descriptive relation between the selected dimensions</h3></div><p>The same Pareto axis selectors update this trend. It is explanatory only and does not enter the ranking.</p></header><ModelIntro {...MODEL_GUIDES["Least Squares"]} /><LeastSquaresChart result={leastSquares} xLabel={paretoXLabel} yLabel={paretoYLabel} /><div className="lab-metrics"><Metric label="Slope" value={leastSquares.slope} tooltip={`Expected descriptive change in ${paretoYLabel} for each one-unit increase in ${paretoXLabel} within this synthetic sample.`} reading="The sign shows direction; magnitude depends on the selected units." /><Metric label="R²" value={leastSquares.rSquared} tooltip="Share of variation in the selected Y dimension described by this straight line, from 0 to 1." reading="Closer to 1 means a tighter linear fit; it still does not prove causality." /><Metric label="RMSE" value={leastSquares.rmse} tooltip="Typical distance between each observed synthetic point and the fitted line, in Y-axis units." reading="Lower means the points sit closer to the line for this sample." /><Metric label="Sample" value={leastSquares.points.length} tooltip="Number of synthetic opportunities used in the least-squares calculation." reading="A 6–12 item demo sample is too small for a reliable forecast." /></div><div className="lab-chart-reading"><strong>How to read it</strong><p>The cyan line minimizes the sum of squared vertical errors. Each thin residual line shows how far one opportunity is from the fitted trend. Use it to notice association, not to claim that one metric causes the other or that the relation will continue outside this run. {leastSquares.reason}</p></div></article>

          <DecisionModelsDashboard opportunity={selectedOpportunity} opportunities={run.opportunities} weights={run.weights} economics={mcConfig} input={run.input} />
        </section>}

        <section className="lab-history"><div className="lab-panel-heading"><div><p className="lab-kicker">LOCAL PERSISTENCE</p><h2>Repeat and compare public runs.</h2></div><span>Browser-only · 30-day maximum</span></div><PanelIntro shows="The analyses created in this browser, including their reproducible seed and generated opportunity set." useful="It lets you return to an earlier run or duplicate it before testing different assumptions." /><button type="button" onClick={() => { clearRuns(); setHistory([]); setRun(null); setSelectedId(null); setStatus("Ready"); }}>Clear all saved runs</button><div>{history.map((item) => <article key={item.id}><span>{new Date(item.createdAt).toLocaleString()}</span><h3>{item.input.analysisName}</h3><p>Seed {item.input.seed} · {item.opportunities.length} opportunities</p><button type="button" onClick={() => { setRun(item); setInput({ ...EMPTY_INPUT, ...item.input }); setSelectedId(item.opportunities[0]?.id ?? null); setStatus("Completed"); }}>Load</button><button type="button" onClick={() => { const copy = duplicateRun(item); setRun(copy); setHistory(listRuns()); }}>Duplicate</button></article>)}</div></section>
      </>}

      <section className="lab-warning"><strong>Public demonstration model</strong><p>The complete architecture, agent system, scoring logic and local implementation are proprietary and are not included in this demo. This Lab uses simplified agents, synthetic data and demonstrative quantitative models. It does not constitute investment advice or predict startup success.</p></section>
    </main>
  );
}
