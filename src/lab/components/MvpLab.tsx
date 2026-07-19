"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENT_NAMES, type LabRun, type Opportunity } from "../types.ts";
import { buildMvpBriefMarkdown, buildMvpPrototypeHtml, createMvpApproval, generateMvpDraft, isApprovalForOpportunity, MVP_AGENT_HANDOFFS, type MvpApproval, type MvpDraft, type MvpRecord } from "../mvp.ts";
import { loadMvpRecord, saveMvpRecord } from "../mvp-storage.ts";
import { listRuns } from "../storage.ts";
import { playSound, unlockAudio } from "../audio.ts";

type GenerationState = "Locked" | "Approved" | "Generating" | "Ready";

const STAGE_COPY = [
  "Strategy defines the narrow workflow and returns its scope to Mathematics.",
  "Mathematics turns that workflow into a measurable validation threshold for Finance.",
  "Finance bounds the effort and test budget before Marketing frames the demand signal.",
  "Marketing returns the customer invitation to Strategy for the final local prototype brief.",
];

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sourceLabel(run: LabRun) {
  return `${run.input.analysisName} · ${run.opportunities.length} opportunities`;
}

function selectedOpportunity(run: LabRun | null, id: string) {
  return run?.opportunities.find((opportunity) => opportunity.id === id) ?? null;
}

function OpportunitySummary({ opportunity }: { opportunity: Opportunity }) {
  return <div className="mvp-source-summary"><div><span>SELECTED OPPORTUNITY</span><h3>{opportunity.name}</h3><p>{opportunity.proposedSolution}</p></div><dl><div><dt>Score</dt><dd>{opportunity.totalScore.toFixed(1)}</dd></div><div><dt>Evidence</dt><dd>{opportunity.dimensions.evidenceQuality.toFixed(0)}</dd></div><div><dt>Risk</dt><dd>{opportunity.dimensions.risk.toFixed(0)}</dd></div><div><dt>Review state</dt><dd>{opportunity.humanDecision}</dd></div></dl></div>;
}

export function MvpLab() {
  const [runs, setRuns] = useState<LabRun[]>([]);
  const [runId, setRunId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [approval, setApproval] = useState<MvpApproval | null>(null);
  const [draft, setDraft] = useState<MvpDraft | null>(null);
  const [state, setState] = useState<GenerationState>("Locked");
  const [stage, setStage] = useState(-1);
  const [notice, setNotice] = useState("Choose a locally stored Lab result to begin.");

  const run = useMemo(() => runs.find((item) => item.id === runId) ?? null, [runId, runs]);
  const opportunity = useMemo(() => selectedOpportunity(run, opportunityId), [opportunityId, run]);
  const approvedForSelection = isApprovalForOpportunity(approval, runId, opportunityId);

  useEffect(() => {
    const storedRuns = listRuns();
    const params = new URLSearchParams(window.location.search);
    const requestedRun = params.get("run") ?? "";
    const requestedOpportunity = params.get("opportunity") ?? "";
    const initialRun = storedRuns.find((item) => item.id === requestedRun) ?? storedRuns[0] ?? null;
    queueMicrotask(() => {
      setRuns(storedRuns);
      setRunId(initialRun?.id ?? "");
      setOpportunityId(initialRun?.opportunities.find((item) => item.id === requestedOpportunity)?.id ?? initialRun?.opportunities[0]?.id ?? "");
      if (!initialRun) setNotice("No local Lab result is available yet. Run the opportunity Lab first; its data remains on this device.");
    });
  }, []);

  useEffect(() => {
    if (!run || !opportunity) {
      queueMicrotask(() => { setApproval(null); setDraft(null); setState("Locked"); setStage(-1); });
      return;
    }
    const record = loadMvpRecord(run.id, opportunity.id);
    queueMicrotask(() => {
      setApproval(record?.approval ?? null);
      setDraft(record?.draft ?? null);
      setState(record?.draft ? "Ready" : record?.approval ? "Approved" : "Locked");
      setStage(record?.draft ? AGENT_NAMES.length : -1);
      setNotice(record?.draft ? "A local MVP validation draft already exists for this exact opportunity." : record?.approval ? "Human approval recorded locally. The draft remains waiting for an explicit generation action." : "The generator is locked until a named human records the validation-only approval.");
    });
  }, [opportunity, run]);

  useEffect(() => {
    if (state !== "Generating" || !opportunity || !approval) return;
    if (stage >= AGENT_NAMES.length - 1) {
      const timer = window.setTimeout(() => {
        try {
          const nextDraft = generateMvpDraft(opportunity, approval);
          const record: MvpRecord = { approval, draft: nextDraft, generatedAt: new Date().toISOString() };
          saveMvpRecord(record);
          setDraft(nextDraft);
          setState("Ready");
          setNotice("The four public agents completed a deterministic local MVP validation brief. Nothing was deployed or executed.");
          playSound("simulation.complete");
        } catch {
          setState("Approved");
          setNotice("The draft could not be generated because the exact human approval record was not available.");
        }
      }, 460);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setStage((current) => current + 1);
      playSound("agent.complete");
    }, 520);
    return () => window.clearTimeout(timer);
  }, [approval, opportunity, stage, state]);

  const changeRun = (nextRunId: string) => {
    const nextRun = runs.find((item) => item.id === nextRunId);
    setRunId(nextRunId);
    setOpportunityId(nextRun?.opportunities[0]?.id ?? "");
  };

  const recordApproval = () => {
    if (!run || !opportunity) return;
    try {
      unlockAudio();
      const nextApproval = createMvpApproval({ sourceRunId: run.id, sourceOpportunityId: opportunity.id, reviewer, acknowledgement: acknowledged });
      saveMvpRecord({ approval: nextApproval });
      setApproval(nextApproval);
      setDraft(null);
      setState("Approved");
      setStage(-1);
      setNotice("Human approval recorded locally. The MVP draft is still not generated until you request it below.");
      playSound("human.approve");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "A named reviewer and acknowledgement are required.");
    }
  };

  const startGeneration = () => {
    if (!opportunity || !approvedForSelection || state === "Generating") return;
    unlockAudio();
    setStage(0);
    setState("Generating");
    setNotice("Generating a bounded, local validation artifact. The sequence cannot deploy, fetch, purchase or execute anything.");
    playSound("simulation.start");
  };

  return (
    <main className="lab-page mvp-lab" id="lab-content">
      <section className="mvp-hero">
        <div><p className="lab-kicker">HUMAN-GATED · PUBLIC · LOCAL ONLY</p><h1>From an opportunity to a <em>testable MVP draft.</em></h1><p>Mathematics, Finance, Strategy and Marketing exchange bounded handoffs to create a static validation prototype—but only after a named human records approval for that exact opportunity.</p></div>
        <aside><span>GATE STATUS</span><strong>{state === "Locked" ? "Locked" : state === "Approved" ? "Approved, not generated" : state === "Generating" ? "Drafting" : "Draft ready"}</strong><p>{notice}</p></aside>
      </section>

      <section className="mvp-boundary" aria-label="MVP Lab boundary"><strong>What this generates</strong><span>A deterministic validation brief, static preview and downloadable local artifacts.</span><strong>What it never does</strong><span>Deploy, run code, access data, contact customers, spend money, create a company or approve investment.</span></section>

      <section className="mvp-flow" aria-labelledby="mvp-flow-title"><header><p className="lab-kicker">CONNECTED PUBLIC AGENTS</p><h2 id="mvp-flow-title">A visible relay, not hidden automation.</h2><p>Each handoff uses the preceding agent&apos;s bounded output and returns a decision-useful constraint to the next agent.</p></header><ol>{MVP_AGENT_HANDOFFS.map((handoff, index) => <li key={handoff.agentName} className={state === "Generating" && index === stage ? "is-active" : stage > index || state === "Ready" ? "is-complete" : ""}><span>0{index + 1}</span><div><strong>{handoff.agentName}</strong><small>{handoff.receivesFrom} → {handoff.agentName} → {handoff.passesTo}</small><p>{handoff.contribution}</p></div></li>)}</ol></section>

      {!runs.length ? <section className="lab-warning"><strong>Start with opportunity detection</strong><p>This lab intentionally reads only locally stored synthetic opportunities. Run the public opportunity Lab, record your decision, then return here.</p><a className="lab-button lab-button--primary" href="/lab/demo">Open opportunity Lab</a></section> : <>
        <section className="mvp-selection" aria-labelledby="mvp-selection-title"><div className="lab-panel-heading"><div><p className="lab-kicker">01 · SELECT</p><h2 id="mvp-selection-title">Choose the opportunity to take to the human gate.</h2></div><span>All source data stays in this browser.</span></div><div className="mvp-select-grid"><label><span>Lab result</span><select value={runId} onChange={(event) => changeRun(event.target.value)}>{runs.map((item) => <option value={item.id} key={item.id}>{sourceLabel(item)}</option>)}</select></label><label><span>Synthetic opportunity</span><select value={opportunityId} onChange={(event) => setOpportunityId(event.target.value)}>{run?.opportunities.map((item) => <option value={item.id} key={item.id}>#{item.rank} · {item.name} · {item.humanDecision}</option>)}</select></label></div>{opportunity && <OpportunitySummary opportunity={opportunity} />}</section>

        <section className="mvp-gate" aria-labelledby="mvp-gate-title"><div><p className="lab-kicker">02 · HUMAN GATE · REQUIRED</p><h2 id="mvp-gate-title">No draft exists before approval.</h2><p>Approval allows only a local, limited MVP validation brief for the selected opportunity. It does not authorize deployment, outreach, spending, integration, data processing or company execution.</p></div><div className="mvp-gate-form">{approvedForSelection ? <div className="mvp-approved"><span>APPROVAL RECORDED</span><strong>{approval?.reviewer}</strong><p>{approval?.approvedAt ? new Date(approval.approvedAt).toLocaleString() : ""} · local validation only</p></div> : <><label><span>Named reviewer</span><input value={reviewer} maxLength={80} onChange={(event) => setReviewer(event.target.value)} placeholder="Name or review role" /></label><label className="mvp-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>I approve only a local, static validation draft for this opportunity. I understand it will not deploy or execute anything.</span></label><button className="lab-button lab-button--primary" type="button" onClick={recordApproval}>Record human approval</button></>}</div></section>

        <section className="mvp-generation" aria-labelledby="mvp-generation-title"><div className="lab-panel-heading"><div><p className="lab-kicker">03 · GENERATE</p><h2 id="mvp-generation-title">Generate the bounded MVP draft.</h2></div><span>Deterministic rules · no private prompts · no remote actions</span></div><p>The draft becomes available only after the approval above and a separate explicit generation action.</p><button className="lab-button lab-button--primary" type="button" disabled={!approvedForSelection || state === "Generating"} onClick={startGeneration}>{state === "Generating" ? "Four agents are drafting…" : draft ? "Regenerate local draft" : "Generate local MVP draft"}</button><div className="mvp-stage-list" aria-live="polite">{STAGE_COPY.map((copy, index) => <div key={copy} className={state === "Generating" && stage === index ? "is-active" : stage > index || state === "Ready" ? "is-complete" : ""}><span>{index + 1}</span><p>{copy}</p><small>{state === "Generating" && stage === index ? "Working" : stage > index || state === "Ready" ? "Completed" : "Waiting for approval"}</small></div>)}</div></section>
      </>}

      {draft && approval && <section className="mvp-output" aria-labelledby="mvp-output-title"><div className="lab-panel-heading"><div><p className="lab-kicker">04 · LOCAL MVP VALIDATION ARTIFACT</p><h2 id="mvp-output-title">{draft.opportunityName}</h2></div><div className="lab-export"><button type="button" onClick={() => download(`${draft.id}-brief.md`, buildMvpBriefMarkdown(draft, approval), "text/markdown;charset=utf-8")}>Download brief</button><button type="button" onClick={() => download(`${draft.id}-static-prototype.html`, buildMvpPrototypeHtml(draft), "text/html;charset=utf-8")}>Download static prototype</button></div></div><div className="mvp-output-grid"><div><section><span>VALIDATION OBJECTIVE</span><h3>{draft.objective}</h3><p>{draft.valueProposition}</p></section><section className="mvp-metric"><span>SUCCESS THRESHOLD</span><strong>{draft.successMetric}</strong><dl><div><dt>Window</dt><dd>{draft.validationWindowDays} days</dd></div><div><dt>Illustrative cap</dt><dd>${draft.validationBudgetUsd.toLocaleString("en-US")}</dd></div></dl></section><div className="mvp-lists"><section><span>IN SCOPE</span><ul>{draft.scope.map((item) => <li key={item}>{item}</li>)}</ul></section><section><span>OUT OF SCOPE</span><ul>{draft.outOfScope.map((item) => <li key={item}>{item}</li>)}</ul></section></div><section><span>RISKS TO TEST</span><ul>{draft.risksToTest.map((item) => <li key={item}>{item}</li>)}</ul></section></div><div className="mvp-preview"><div><span>STATIC PREVIEW · SANDBOXED · NO SCRIPTS</span><small>It is a visualization of the generated workflow, not a live application.</small></div><iframe title={`${draft.opportunityName} static validation prototype`} sandbox="" srcDoc={buildMvpPrototypeHtml(draft)} /></div></div><section className="mvp-disclosures"><strong>Limitations and human accountability</strong><ul>{draft.disclosures.map((item) => <li key={item}>{item}</li>)}</ul></section></section>}
    </main>
  );
}
