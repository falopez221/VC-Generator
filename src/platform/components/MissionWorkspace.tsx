"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DraftStatus = "Scoping" | "Ready for review";

export function MissionWorkspace() {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [purpose, setPurpose] = useState("");
  const [status, setStatus] = useState<DraftStatus>("Scoping");
  const [submitted, setSubmitted] = useState(false);
  const isReady = title.trim().length >= 4 && owner.trim().length >= 2 && purpose.trim().length >= 20;
  const summary = useMemo(() => `${title || "Untitled local draft"} · ${status}`, [status, title]);

  function updateLocalDraft() {
    if (!isReady) return;
    setSubmitted(true);
  }

  return <>
    <header className="platform-page-heading"><div><p>MISSIONS · LOCAL WORKBENCH</p><h1>Prepare one bounded question at a time.</h1></div><p>There is no mission database connected to this workspace. This screen is an editable browser-local planning surface, not a mission register.</p></header>
    <div className="private-workflow-notice" role="status"><strong>LOCAL ONLY</strong><span>No records, assignments, research, or approvals are saved. Refreshing removes this workbench state.</span></div>
    <section className="mission-workbench" aria-labelledby="mission-workbench-title">
      <header><div><span>WORKING MISSION</span><h2 id="mission-workbench-title">{summary}</h2></div><Link className="platform-primary-link" href="/app/missions/new">Open full mission builder</Link></header>
      <div className="mission-workbench__fields">
        <label>Working title<input value={title} onChange={(event) => { setTitle(event.target.value); setSubmitted(false); }} maxLength={120} placeholder="Name the decision package" /></label>
        <label>Decision owner<input value={owner} onChange={(event) => { setOwner(event.target.value); setSubmitted(false); }} maxLength={120} placeholder="Named role or person" /></label>
        <label>Current stage<select value={status} onChange={(event) => { setStatus(event.target.value as DraftStatus); setSubmitted(false); }}><option>Scoping</option><option>Ready for review</option></select></label>
        <label className="mission-workbench__wide">Purpose and decision boundary<textarea value={purpose} onChange={(event) => { setPurpose(event.target.value); setSubmitted(false); }} maxLength={900} placeholder="Explain the decision, the scope, and which questions are excluded." /></label>
      </div>
      <footer><p>Minimum: title, accountable owner, and a 20-character bounded purpose.</p><button type="button" onClick={updateLocalDraft} disabled={!isReady}>Update local workbench</button></footer>
      {submitted && <p className="private-workflow-success" role="status">Local workbench updated. This state is visible only until this page is refreshed or closed.</p>}
    </section>
    <section className="platform-grid mission-workbench__guidance" aria-label="Mission workflow guidance"><article className="platform-panel"><header><div><span>01 · FRAME</span><h2>Define the decision</h2></div></header><p>Name the accountable decision owner and state what is in or out of scope before requesting analysis.</p></article><article className="platform-panel"><header><div><span>02 · REVIEW</span><h2>Keep the human gate</h2></div></header><p>Use the full builder to identify a reviewer, evidence limits, and the conditions that prevent automatic action.</p><Link href="/app/missions/new">Continue to the mission builder →</Link></article></section>
  </>;
}
