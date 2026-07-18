"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActiveMission } from "../active-mission";

const STEPS = ["Decision", "Scope", "Evidence", "Review gate", "Confirm"] as const;
const CAPABILITIES = [
  ["Mathematical analysis", "Ranges, sensitivity, uncertainty and constraints."],
  ["Financial analysis", "Economics, staged commitment and exposure."],
  ["Strategic analysis", "Alternatives, timing and strategic constraints."],
  ["Market analysis", "Demand signals, adoption and evidence gaps."],
] as const;

type Risk = "standard" | "elevated" | "high-impact" | "critical";

export function MissionBuilder() {
  const { mission, ready, saveCore } = useActiveMission();
  const restored = useRef(false);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [decision, setDecision] = useState("");
  const [owner, setOwner] = useState("");
  const [domain, setDomain] = useState("");
  const [horizon, setHorizon] = useState("1–3 years");
  const [constraints, setConstraints] = useState("");
  const [evidence, setEvidence] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [risk, setRisk] = useState<Risk>("elevated");
  const [reviewer, setReviewer] = useState("");
  const [gate, setGate] = useState("Independent review required");
  const [acknowledged, setAcknowledged] = useState(false);
  const [created, setCreated] = useState(false);

  const validSteps = useMemo(() => [
    title.trim().length >= 4 && decision.trim().length >= 20 && owner.trim().length >= 2,
    domain.trim().length >= 2 && constraints.trim().length >= 10,
    evidence.trim().length >= 20 && capabilities.length > 0,
    reviewer.trim().length >= 2 && Boolean(gate) && acknowledged,
  ], [acknowledged, capabilities.length, constraints, decision, domain, evidence, gate, owner, reviewer, title]);
  const completeness = Math.round((validSteps.filter(Boolean).length / validSteps.length) * 100);
  const canContinue = step < validSteps.length ? validSteps[step] : validSteps.every(Boolean);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active || !ready || restored.current) return;
      restored.current = true;
      if (!mission) return;
      const core = mission.core;
      setTitle(core.title); setDecision(core.decision); setOwner(core.owner); setDomain(core.domain); setHorizon(core.horizon);
      setConstraints(core.constraints); setEvidence(core.evidence); setCapabilities(core.capabilities); setRisk(core.risk);
      setReviewer(core.reviewer); setGate(core.gate);
      setCreated(true);
    });
    return () => { active = false; };
  }, [mission, ready]);

  function toggleCapability(capability: string) {
    setCapabilities((current) => current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability]);
  }

  function createLocalDraft() {
    if (!validSteps.every(Boolean)) return;
    saveCore({ title, decision, owner, domain, horizon, constraints, evidence, capabilities, risk, reviewer, gate }, "mission-builder");
    setCreated(true);
  }

  return <>
    <header className="platform-page-heading">
      <div><p>MISSION BUILDER · LOCAL DRAFT</p><h1>Frame a bounded mission before any analysis begins.</h1></div>
      <p>Unconfirmed fields remain in this browser view. Confirming saves an identity-scoped, expiring browser-tab draft; it does not contact agents, run research, or authorize a real-world action.</p>
    </header>
    <div className="private-workflow-notice" role="status"><strong>ACTIVE CONTEXT · SESSION-LOCAL</strong><span>The confirmed draft continues into Simulation, Scenarios and Feasibility in this browser tab until it expires. Durable organizational storage and permissions are not connected.</span></div>
    <div className="builder-shell">
      <nav aria-label="Mission builder steps">
        {STEPS.map((item, index) => <button type="button" key={item} onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}>
          <span>{String(index + 1).padStart(2, "0")}</span>{item}<small>{index < validSteps.length && validSteps[index] ? "COMPLETE" : index === step ? "ACTIVE" : "PENDING"}</small>
        </button>)}
      </nav>
      <section className="builder-workspace" aria-labelledby="builder-step-title">
        <header aria-live="polite"><span>STEP {String(step + 1).padStart(2, "0")} / {STEPS.length}</span><strong id="builder-step-title">{STEPS[step]}</strong><small>Completeness {completeness}%</small></header>
        {step === 0 && <div className="builder-fields">
          <label>Working title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Example: resilient energy investment options" /></label>
          <label>Named decision owner<input value={owner} onChange={(event) => setOwner(event.target.value)} maxLength={120} placeholder="Role, committee, or accountable person" /></label>
          <label>Decision to support<textarea value={decision} onChange={(event) => setDecision(event.target.value)} maxLength={900} placeholder="Describe the specific decision, alternatives, and what is outside this mission." /></label>
        </div>}
        {step === 1 && <div className="builder-fields">
          <label>Domains or operating context<input value={domain} onChange={(event) => setDomain(event.target.value)} maxLength={180} placeholder="Energy · infrastructure · climate" /></label>
          <label>Decision horizon<select value={horizon} onChange={(event) => setHorizon(event.target.value)}><option>Immediate</option><option>1–3 years</option><option>3–10 years</option><option>10–25 years</option></select></label>
          <label>Constraints and non-goals<textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} maxLength={900} placeholder="State budget, reversibility, safety, authority, or evidence constraints." /></label>
        </div>}
        {step === 2 && <div className="builder-fields">
          <label>Evidence available and known gaps<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={900} placeholder="List sources, observations, uncertainty, and missing information. This form does not upload documents." /></label>
          <div className="builder-callout"><span>CAPABILITY SELECTION</span><p>Choose only the analytical capabilities needed for this local draft. This selects no executable agents and starts no process.</p></div>
          <div className="builder-selections private-workflow-selections">{CAPABILITIES.map(([capability, detail]) => <button type="button" key={capability} aria-pressed={capabilities.includes(capability)} onClick={() => toggleCapability(capability)}>{capability}<small>{detail}</small></button>)}</div>
        </div>}
        {step === 3 && <div className="builder-fields">
          <label>Materiality / risk<select value={risk} onChange={(event) => setRisk(event.target.value as Risk)}><option value="standard">Standard</option><option value="elevated">Elevated</option><option value="high-impact">High impact</option><option value="critical">Critical</option></select></label>
          <label>Required human gate<select value={gate} onChange={(event) => setGate(event.target.value)}><option>Human review required</option><option>Independent review required</option><option>Named authority approval required</option></select></label>
          <label>Named reviewer or approving authority<input value={reviewer} onChange={(event) => setReviewer(event.target.value)} maxLength={120} placeholder="A person, role, or committee" /></label>
          <label className="private-workflow-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I confirm that analysis can inform, but cannot make, the final decision or execute an action.</label>
          <div className="builder-callout"><span>HUMAN CONTROL</span><p>This draft remains blocked until the named human gate reviews evidence, assumptions, alternatives and objections. No autonomous approval is available here.</p></div>
        </div>}
        {step === 4 && <div className="builder-review">
          <span>{created ? "LOCAL MISSION DRAFT · TAB-LOCAL CONTEXT SAVED" : "LOCAL MISSION DRAFT · NOT YET SAVED"}</span><h2>{title || "Complete the decision step before creating this draft."}</h2>
          <dl><div><dt>DECISION</dt><dd>{decision || "Missing"}</dd></div><div><dt>OWNER</dt><dd>{owner || "Missing"}</dd></div><div><dt>DOMAIN</dt><dd>{domain || "Missing"}</dd></div><div><dt>HORIZON</dt><dd>{horizon}</dd></div><div><dt>CONSTRAINTS</dt><dd>{constraints || "Missing"}</dd></div><div><dt>EVIDENCE</dt><dd>{evidence || "Missing"}</dd></div><div><dt>CAPABILITIES</dt><dd>{capabilities.join(" · ") || "None selected"}</dd></div><div><dt>RISK</dt><dd>{risk}</dd></div><div><dt>HUMAN GATE</dt><dd>{gate} — {reviewer || "Missing authority"}</dd></div></dl>
          {!validSteps.every(Boolean) && <p role="status">Complete all required fields and confirm the human-control boundary before creating the local draft.</p>}
          {created && <p className="private-workflow-success" role="status">Active mission context saved for this browser tab. Continue to the simulation without re-entering the decision, domain or evidence.</p>}
        </div>}
        <footer><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</button>{step < STEPS.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} disabled={!canContinue}>Continue</button> : <button type="button" onClick={createLocalDraft} disabled={!canContinue}>Create local draft</button>}</footer>
      </section>
    </div>
    <p className="private-workflow-next">{created ? <>Next: <Link href="/app/simulation">open Simulation Lab with this mission</Link>, then continue through Scenarios and Feasibility.</> : <>Need to capture a governed conclusion? <Link href="/app/decision-lab">Open the local decision record</Link>.</>}</p>
  </>;
}
