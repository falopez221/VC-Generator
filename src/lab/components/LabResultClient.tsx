"use client";

import { useEffect, useState } from "react";
import { updateHumanDecision } from "../engine.ts";
import { loadRun, saveRun } from "../storage.ts";
import type { HumanDecision, LabRun } from "../types.ts";
import { CinematicField } from "@/src/components/experience/CinematicField";

export function LabResultClient({ id }: { id: string }) {
  const [run, setRun] = useState<LabRun | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => setRun(loadRun(id)));
  }, [id]);

  if (run === undefined) return <main className="lab-page lab-result" id="lab-content"><p className="lab-kicker">LOADING LOCAL RESULT</p></main>;
  if (!run) return <main className="lab-page lab-result" id="lab-content"><section className="lab-warning"><strong>Result not found in this browser</strong><p>Public Lab results are stored locally. Run or load the simulation on this device, then open its result view.</p><a className="lab-button lab-button--primary" href="/lab/demo">Open Lab demo</a></section></main>;

  const decide = (opportunityId: string, decision: HumanDecision) => {
    const next = updateHumanDecision(run, opportunityId, decision);
    saveRun(next);
    setRun(next);
  };

  return (
    <main className="lab-page lab-result" id="lab-content">
      <section className="lab-result-discovery"><CinematicField mode="result" state="completed" opportunityCount={run.opportunities.length} /><div><p className="lab-kicker">DISCOVERY CONVERGED · PUBLIC RESULT · {run.id}</p><h1>{run.input.analysisName}</h1><p>Seed {run.input.seed} · {run.opportunities.length} synthetic opportunities · strongest signals preserved for human review.</p><div className="lab-actions"><a className="lab-button lab-button--primary" href="/lab/demo">Open interactive Lab</a><a className="lab-button" href={`/lab/mvp?run=${encodeURIComponent(run.id)}&opportunity=${encodeURIComponent(run.opportunities[0]?.id ?? "")}`}>Open MVP Validation Lab</a><button className="lab-button" type="button" onClick={() => window.print()}>Print result</button></div></div></section>
      <section className="lab-warning"><strong>Limited public output</strong><p>This view contains synthetic data and demonstrative public models. It is not investment advice, approval or the complete Venture Governance architecture.</p></section>
      <section className="lab-ranking"><div className="lab-panel-heading"><div><p className="lab-kicker">RANKED OUTPUT</p><h2>Human review state</h2></div><span>Recommendation is not approval</span></div><div className="lab-result-grid">{run.opportunities.map((opportunity) => <article key={opportunity.id}><span>#{opportunity.rank} · {opportunity.category}</span><h3>{opportunity.name}</h3><strong>{opportunity.totalScore.toFixed(1)}</strong><p>{opportunity.proposedSolution}</p><dl><div><dt>Evidence</dt><dd>{opportunity.dimensions.evidenceQuality.toFixed(0)}</dd></div><div><dt>Risk</dt><dd>{opportunity.dimensions.risk.toFixed(0)}</dd></div><div><dt>Uncertainty</dt><dd>{opportunity.uncertainty.toFixed(0)}</dd></div></dl><div className="lab-result-actions"><button type="button" onClick={() => decide(opportunity.id, "Promising")}>Promising</button><button type="button" onClick={() => decide(opportunity.id, "Uncertain")}>Uncertain</button><button type="button" onClick={() => decide(opportunity.id, "Rejected")}>Reject</button></div><small>Human state: {opportunity.humanDecision}</small></article>)}</div></section>
    </main>
  );
}
