"use client";

import { useMemo, useState } from "react";
import { DEMO_AUDIT_EVENTS, DEMO_GOVERNANCE_QUEUE } from "../data";

type EvidenceClass = "Source" | "Claim" | "Assumption" | "Inference";

const EVIDENCE_ITEMS: Array<{ id: string; kind: EvidenceClass; label: string; detail: string; state: string }> = [
  { id: "SRC-018", kind: "Source", label: "Grid-cost outlook", detail: "Publisher and retrieval date are recorded; original document still needs human reading.", state: "Source recorded" },
  { id: "CLM-042", kind: "Claim", label: "Storage cost declines may improve project economics", detail: "A claim derived from SRC-018. It is not observed evidence or a forecast.", state: "Needs review" },
  { id: "ASM-011", kind: "Assumption", label: "Discount rate held at 12%", detail: "Declared model input, not externally supported evidence.", state: "Declared" },
  { id: "INF-007", kind: "Inference", label: "Stage capital commitment before scale-up", detail: "Interpretation combining a claim and declared uncertainty range.", state: "Human review" },
];

const CONTRADICTIONS = [
  { id: "CON-003", topic: "Storage deployment timing", supports: "SRC-018", challenges: "CLM-042", note: "A second source reports supply constraints that are not yet reconciled." },
  { id: "CON-005", topic: "Demand signal", supports: "CLM-042", challenges: "INF-007", note: "Evidence supports interest, not a commitment to purchase." },
];

export function EvidenceWorkbench() {
  const [filter, setFilter] = useState<EvidenceClass | "All">("All");
  const [selectedContradiction, setSelectedContradiction] = useState<string | null>(null);
  const visibleItems = filter === "All" ? EVIDENCE_ITEMS : EVIDENCE_ITEMS.filter((item) => item.kind === filter);

  return <section className="workflow-stack" aria-labelledby="evidence-workbench-title">
    <div className="workflow-status"><strong>SESSION-LOCAL REVIEW BOARD</strong><span>Fixtures and selections stay in this browser session. No private documents or review outcomes are persisted.</span></div>
    <div className="platform-grid platform-grid--wide">
      <article className="platform-panel"><header><div><span>EVIDENCE CLASSES</span><h2 id="evidence-workbench-title">Do not promote a source into a conclusion.</h2></div></header>
        <div className="workflow-tabs" role="tablist" aria-label="Filter evidence classes">{(["All", "Source", "Claim", "Assumption", "Inference"] as const).map((kind) => <button key={kind} type="button" role="tab" aria-selected={filter === kind} onClick={() => setFilter(kind)}>{kind}</button>)}</div>
        <div className="workflow-list">{visibleItems.map((item) => <article key={item.id}><span className={`workflow-chip is-${item.kind.toLowerCase()}`}>{item.kind}</span><div><small>{item.id} · {item.state}</small><strong>{item.label}</strong><p>{item.detail}</p></div></article>)}</div>
      </article>
      <aside className="platform-panel"><header><div><span>PROVENANCE CHECK</span><h2>Minimum review rule</h2></div></header><ol className="workflow-steps"><li>Open the original source and record why it is relevant.</li><li>State the claim separately from the quotation or data point.</li><li>Label assumptions and inference explicitly.</li><li>Route unresolved contradictions to a named reviewer.</li></ol><p className="platform-caveat">This interface is a working draft, not a fact-verification service.</p></aside>
    </div>
    <section className="platform-panel"><header><div><span>CONTRADICTION REVIEW</span><h2>Keep conflicting signals visible</h2></div></header><div className="workflow-list workflow-list--compact">{CONTRADICTIONS.map((item) => <article key={item.id}><span className="workflow-chip is-contradiction">Open</span><div><small>{item.id} · {item.supports} ↔ {item.challenges}</small><strong>{item.topic}</strong><p>{item.note}</p></div><button type="button" onClick={() => setSelectedContradiction(item.id)}>{selectedContradiction === item.id ? "Marked for local review" : "Mark for review"}</button></article>)}</div><p role="status" aria-live="polite" className="platform-caveat">{selectedContradiction ? `${selectedContradiction} is marked in this session only; a named reviewer must resolve it in a persisted workflow.` : "No contradiction review has been recorded."}</p></section>
  </section>;
}

const KNOWLEDGE_NODES = [
  { id: "SRC-018", kind: "Source", label: "Grid-cost outlook", connectsTo: ["CLM-042"] },
  { id: "CLM-042", kind: "Claim", label: "Storage cost decline", connectsTo: ["INF-007", "MOD-003"] },
  { id: "ASM-011", kind: "Assumption", label: "12% discount rate", connectsTo: ["MOD-003"] },
  { id: "MOD-003", kind: "Model", label: "Scenario NPV", connectsTo: ["DEC-006"] },
  { id: "INF-007", kind: "Inference", label: "Stage commitment", connectsTo: ["DEC-006"] },
  { id: "DEC-006", kind: "Decision draft", label: "Review package", connectsTo: [] },
];

export function KnowledgeWorkbench() {
  const [selected, setSelected] = useState("SRC-018");
  const node = KNOWLEDGE_NODES.find((item) => item.id === selected)!;
  const inbound = KNOWLEDGE_NODES.filter((item) => item.connectsTo.includes(selected));
  const outbound = KNOWLEDGE_NODES.filter((item) => node.connectsTo.includes(item.id));
  return <section className="workflow-stack" aria-labelledby="knowledge-workbench-title">
    <div className="workflow-status"><strong>BOUNDED RELATIONSHIP MAP</strong><span>Six illustrative nodes only. It does not query a knowledge database or create persistent links.</span></div>
    <div className="platform-grid platform-grid--wide"><article className="platform-panel"><header><div><span>TRACEABLE PATH</span><h2 id="knowledge-workbench-title">Inspect one relationship at a time.</h2></div></header><div className="knowledge-path">{KNOWLEDGE_NODES.map((item, index) => <div key={item.id}><button type="button" className={selected === item.id ? "is-selected" : ""} onClick={() => setSelected(item.id)}><small>{item.kind} · {item.id}</small><strong>{item.label}</strong></button>{index < KNOWLEDGE_NODES.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div></article><aside className="platform-panel"><header><div><span>NODE INSPECTOR</span><h2>{node.label}</h2></div></header><dl className="workflow-definition"><div><dt>Class</dt><dd>{node.kind}</dd></div><div><dt>Inputs</dt><dd>{inbound.length ? inbound.map((item) => item.id).join(", ") : "No displayed incoming links"}</dd></div><div><dt>Outputs</dt><dd>{outbound.length ? outbound.map((item) => item.id).join(", ") : "No displayed outgoing links"}</dd></div><div><dt>Status</dt><dd>Illustrative local graph; not persisted</dd></div></dl></aside></div>
  </section>;
}

type GateDraft = { id: string; outcome: "approve" | "return"; note: string };

export function GovernanceWorkbench() {
  const [draft, setDraft] = useState<GateDraft | null>(null);
  return <section className="workflow-stack" aria-labelledby="governance-workbench-title">
    <div className="workflow-status"><strong>HUMAN GATES · LOCAL DRAFT MODE</strong><span>Buttons prepare a review recommendation only. They cannot approve capital, actions, or a mission.</span></div>
    <div className="platform-grid"><article className="platform-panel"><header><div><span>REVIEW QUEUE</span><h2 id="governance-workbench-title">Named people retain decision authority.</h2></div></header><div className="workflow-list workflow-list--compact">{DEMO_GOVERNANCE_QUEUE.map((item) => <article key={item.id}><span className="workflow-chip is-gate">Gate</span><div><small>{item.id} · {item.authority}</small><strong>{item.mission}</strong><p>{item.issue}</p></div><div className="workflow-actions"><button type="button" onClick={() => setDraft({ id: item.id, outcome: "return", note: "" })}>Draft return</button><button type="button" onClick={() => setDraft({ id: item.id, outcome: "approve", note: "" })}>Draft conditions</button></div></article>)}</div></article><aside className="platform-panel"><header><div><span>LOCAL REVIEW DRAFT</span><h2>{draft ? `${draft.id} · ${draft.outcome === "approve" ? "conditions" : "return"}` : "Choose a gate"}</h2></div></header>{draft ? <><label className="workflow-field">Rationale and conditions<textarea maxLength={800} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="State evidence gaps, conditions, dissent or why the package is returned." /></label><p role="status" aria-live="polite" className="platform-caveat">Draft remains in memory. A future persisted workflow must capture the named reviewer, authority, timestamp and final decision.</p></> : <p className="platform-caveat">No review recommendation is active. Review authority cannot be simulated or delegated to this interface.</p>}</aside></div><section className="platform-panel"><header><div><span>NON-NEGOTIABLE BOUNDARIES</span><h2>Every gate keeps these constraints active</h2></div></header><ul className="platform-rule-list"><li>No autonomous investment approval or capital deployment.</li><li>No replacing named human accountability with a model result.</li><li>No promotion of weak evidence into a “Highly Promising” conclusion.</li><li>No action without the authority and review record appropriate to materiality.</li></ul></section>
  </section>;
}

type DraftEvent = { action: string; resource: string; rationale: string; timestamp: string };

export function AuditWorkbench() {
  const [action, setAction] = useState("review.draft_created");
  const [resource, setResource] = useState("GATE-019");
  const [rationale, setRationale] = useState("");
  const [draftEvents, setDraftEvents] = useState<DraftEvent[]>([]);
  const canDraft = action.trim().length >= 3 && resource.trim().length >= 3 && rationale.trim().length >= 8;
  const events = useMemo(() => [...draftEvents.map((event, index) => ({ timestamp: event.timestamp, actor: "current.authorized.user", action: event.action, resource: event.resource, correlation: `LOCAL-${String(index + 1).padStart(3, "0")}`, note: event.rationale })), ...DEMO_AUDIT_EVENTS.map((event) => ({ ...event, note: "Synthetic fixture; not durable." }))], [draftEvents]);
  function draftEvent() { if (!canDraft) return; setDraftEvents((current) => [{ action: action.trim().slice(0, 80), resource: resource.trim().slice(0, 80), rationale: rationale.trim().slice(0, 500), timestamp: new Date().toLocaleString() }, ...current]); setRationale(""); }
  return <section className="workflow-stack" aria-labelledby="audit-workbench-title"><div className="workflow-status"><strong>LOCAL AUDIT EVENT DRAFTING</strong><span>Drafts are held in browser memory and disappear on refresh. This is not an immutable or durable audit log.</span></div><div className="platform-grid platform-grid--wide"><section className="platform-panel"><header><div><span>EVENT DRAFT</span><h2 id="audit-workbench-title">Record the intended audit shape.</h2></div></header><div className="workflow-form"><label>Action<input value={action} maxLength={80} onChange={(event) => setAction(event.target.value)} /></label><label>Resource<input value={resource} maxLength={80} onChange={(event) => setResource(event.target.value)} /></label><label>Reason / authority context<textarea value={rationale} maxLength={500} onChange={(event) => setRationale(event.target.value)} placeholder="Why is this change proposed, and which human authority is involved?" /></label></div><button className="platform-primary-link" type="button" disabled={!canDraft} onClick={draftEvent}>Create local event draft</button><p role="status" aria-live="polite" className="platform-caveat">{canDraft ? "Ready to add a local draft; it will not be sent to a server." : "Action, resource and an 8-character rationale are required."}</p></section><aside className="platform-panel"><header><div><span>DURABLE LOG REQUIREMENTS</span><h2>Not available in this build</h2></div></header><ul className="platform-rule-list"><li>Authenticated actor and authorization context.</li><li>Server-side timestamp and correlation identifier.</li><li>Append-only retention and access controls.</li><li>Reviewable export governed by policy.</li></ul></aside></div><section className="platform-panel"><header><div><span>EVENT VIEW</span><h2>Fixtures and local drafts</h2></div></header><div className="platform-table-wrap"><table className="platform-data-table"><caption className="sr-only">Local audit drafts and synthetic fixture events</caption><thead><tr><th scope="col">Timestamp</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Resource</th><th scope="col">Correlation</th><th scope="col">Status</th></tr></thead><tbody>{events.map((event) => <tr key={`${event.correlation}-${event.timestamp}`}><td>{event.timestamp}</td><td>{event.actor}</td><td>{event.action}</td><td>{event.resource}</td><td>{event.correlation}</td><td>{event.note}</td></tr>)}</tbody></table></div></section></section>;
}
