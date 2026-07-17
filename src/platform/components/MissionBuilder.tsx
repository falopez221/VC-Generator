"use client";

import { useMemo, useState } from "react";
import { IntelligenceGraph } from "./IntelligenceGraph";

const STEPS = ["Decision", "Context", "Evidence", "Agents", "Models", "Governance", "Review"] as const;
const PUBLIC_AGENTS = ["Mathematics", "Finance", "Strategy", "Marketing"];
const MODELS = ["Monte Carlo", "Bayesian Update", "Sensitivity", "Stress Testing", "MCDA", "Pareto"];

export function MissionBuilder() {
  const [step, setStep] = useState(0);
  const [decision, setDecision] = useState("");
  const [owner, setOwner] = useState("");
  const [domain, setDomain] = useState("");
  const [horizon, setHorizon] = useState("3–10 years");
  const [constraints, setConstraints] = useState("");
  const [evidence, setEvidence] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [risk, setRisk] = useState("high-impact");
  const [control, setControl] = useState("Independent review required");
  const [created, setCreated] = useState(false);

  const validSteps = useMemo(() => [
    decision.trim().length >= 20 && owner.trim().length >= 2,
    domain.trim().length >= 2 && constraints.trim().length >= 10 && Boolean(horizon),
    evidence.trim().length >= 20,
    agents.length > 0,
    models.length > 0,
    Boolean(risk && control),
  ], [agents.length, constraints, control, decision, domain, evidence, horizon, models.length, owner, risk]);
  const completeness = Math.round(validSteps.filter(Boolean).length / validSteps.length * 100);
  const canContinue = step === STEPS.length - 1 ? validSteps.every(Boolean) : validSteps[step] ?? true;
  const toggle = (value: string, current: string[], setter: (values: string[]) => void) => setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);

  return <>
    <header className="platform-page-heading"><div><p>MISSION BUILDER · DEMO</p><h1>Turn a complex decision into an inspectable mission architecture.</h1></div><p>This wizard prepares a page-local demonstration draft. It does not create a persistent enterprise mission or contact external agents.</p></header>
    <div className="builder-shell">
      <nav aria-label="Mission builder steps">{STEPS.map((item, index) => <button type="button" key={item} onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{item}<small>{index < step && validSteps[index] ? "COMPLETE" : index === step ? "ACTIVE" : "PENDING"}</small></button>)}</nav>
      <section className="builder-workspace" aria-labelledby="builder-step-title">
        <header aria-live="polite"><span>STEP {String(step + 1).padStart(2, "0")} / {STEPS.length}</span><strong id="builder-step-title">{STEPS[step]}</strong><small>Configuration completeness {completeness}%</small></header>
        {step === 0 && <div className="builder-fields"><label>What decision must be supported?<textarea value={decision} onChange={(event) => setDecision(event.target.value)} maxLength={900} placeholder="State the decision, not only the topic." /></label><label>Who owns the final decision?<input value={owner} onChange={(event) => setOwner(event.target.value)} maxLength={120} placeholder="Named role or committee" /></label></div>}
        {step === 1 && <div className="builder-fields"><label>Domains<input value={domain} onChange={(event) => setDomain(event.target.value)} maxLength={180} placeholder="Energy · Infrastructure · Climate" /></label><label>Time horizon<select value={horizon} onChange={(event) => setHorizon(event.target.value)}><option>Immediate</option><option>1–3 years</option><option>3–10 years</option><option>10–25 years</option></select></label><label>Constraints<textarea value={constraints} onChange={(event) => setConstraints(event.target.value)} maxLength={900} placeholder="Evidence provenance, reversibility, fiscal exposure…" /></label></div>}
        {step === 2 && <div className="builder-fields"><label>Available evidence<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={900} placeholder="List known sources, gaps and assumptions." /></label><div className="builder-callout"><span>EVIDENCE BOUNDARY</span><p>Documents are not uploaded in this demo. A production workflow requires controlled storage, permissions, MIME validation and provenance.</p></div></div>}
        {step === 3 && <div className="builder-selections"><p>Only the four public specialist agents are available in this repository.</p>{PUBLIC_AGENTS.map((agent) => <button type="button" key={agent} aria-pressed={agents.includes(agent)} onClick={() => toggle(agent, agents, setAgents)}>{agent}<small>{agent === "Mathematics" ? "Uncertainty and robustness" : agent === "Finance" ? "Economics and capital" : agent === "Strategy" ? "Positioning and timing" : "Adoption and demand"}</small></button>)}</div>}
        {step === 4 && <div className="builder-selections">{MODELS.map((model) => <button type="button" key={model} aria-pressed={models.includes(model)} onClick={() => toggle(model, models, setModels)}>{model}<small>Demonstrative public model · assumptions visible</small></button>)}</div>}
        {step === 5 && <div className="builder-fields"><label>Risk classification<select value={risk} onChange={(event) => setRisk(event.target.value)}><option>standard</option><option>elevated</option><option>high-impact</option><option>critical</option></select></label><label>Required control<select value={control} onChange={(event) => setControl(event.target.value)}><option>Human review recommended</option><option>Human gate required</option><option>Independent review required</option><option>Mandatory authorization</option></select></label><div className="builder-callout"><span>PROHIBITED ACTIONS</span><p>No autonomous investment, diagnosis, prescription, legal judgment, lethal action or unrestricted capital deployment.</p></div></div>}
        {step === 6 && <div className="builder-review"><span>DEMO DRAFT · NOT PERSISTED</span><h2>{decision || "Complete the decision step before creating this draft."}</h2><dl><div><dt>OWNER</dt><dd>{owner || "Missing"}</dd></div><div><dt>DOMAINS</dt><dd>{domain || "Missing"}</dd></div><div><dt>HORIZON</dt><dd>{horizon}</dd></div><div><dt>CONSTRAINTS</dt><dd>{constraints || "Missing"}</dd></div><div><dt>EVIDENCE</dt><dd>{evidence || "Missing"}</dd></div><div><dt>AGENTS</dt><dd>{agents.join(" · ") || "None selected"}</dd></div><div><dt>MODELS</dt><dd>{models.join(" · ") || "None selected"}</dd></div><div><dt>RISK</dt><dd>{risk}</dd></div><div><dt>CONTROL</dt><dd>{control}</dd></div></dl>{!validSteps.every(Boolean) && <p role="status">Complete every required configuration step before creating the page-local demo record.</p>}{created && <p role="status">Demo configuration created in this page only. Connect D1 and organization authorization before enabling durable missions.</p>}</div>}
        <footer><button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Back</button>{step < STEPS.length - 1 ? <button type="button" onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))} disabled={!canContinue}>Continue</button> : <button type="button" onClick={() => setCreated(true)} disabled={!canContinue}>Create demo configuration</button>}</footer>
      </section>
    </div>
    <IntelligenceGraph variant="mission" compact title="Mission architecture preview" />
  </>;
}
