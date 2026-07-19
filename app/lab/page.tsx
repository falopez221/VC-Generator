import { CinematicField } from "@/src/components/experience/CinematicField";
import { STAGES } from "@/src/lab/data";
import { PUBLIC_MODEL_COUNT } from "@/src/lab/model-catalog";

const publicAgents = [
  ["Mathematics", "Uncertainty, robustness, sensitivity and data quality."],
  ["Finance", "Economics, capital intensity and downside/base/upside scenarios."],
  ["Strategy", "Problem definition, differentiation, timing and early experiments."],
  ["Marketing", "ICP, accessible demand, positioning, acquisition and adoption."],
] as const;

export default function LabHome() {
  return (
    <main className="lab-page" id="lab-content">
      <section className="lab-cinematic-hero">
        <CinematicField mode="lab" state="idle" />
        <div className="lab-cinematic-copy">
          <p className="lab-kicker">PUBLIC · LIMITED · INTERACTIVE</p>
          <h1>Explore how governed agents turn a thesis into <em>visible possibilities.</em></h1>
          <p>This public Lab uses four simplified agents, synthetic data and demonstrative quantitative models. It is not the complete architecture or the private local product.</p>
          <div className="lab-actions"><a className="lab-button lab-button--primary" href="/lab/demo">Run Lab Simulation</a><a className="lab-button" href="/lab/simulation">Open Synthetic Airspace Lab</a><a className="lab-button" href="/lab/companies">Analyze a company</a><a className="lab-button" href="/lab/methodology">Read methodology</a></div>
        </div>
        <aside className="lab-cinematic-metrics" aria-label="Public Lab scope"><div><strong>6–12</strong><span>SYNTHETIC OPPORTUNITIES</span></div><div><strong>04</strong><span>VISIBLE AGENTS</span></div><div><strong>{PUBLIC_MODEL_COUNT}</strong><span>PUBLIC MODELS</span></div></aside>
      </section>
      <section className="lab-band" aria-label="Public limitation">The private capability registry contains 1,970 profiles across 51 domains and is selected by mission. This public Lab shows only four representative specialists for speed, clarity and intellectual-property protection.</section>
      <section className="lab-section">
        <header><p className="lab-kicker">FOUR PUBLIC AGENTS</p><h2>Structured perspectives, visible disagreement.</h2><p>Only outputs, evidence, assumptions, calculations and criticism are shown. Private prompts and internal reasoning are excluded.</p></header>
        <div className="lab-agent-cards">{publicAgents.map(([name, copy], index) => <article key={name}><span>0{index + 1}</span><h3>{name}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section className="lab-section lab-section--dark">
        <header><p className="lab-kicker">SIMPLIFIED PUBLIC ORCHESTRATION</p><h2>One traceable sequence from input to review.</h2></header>
        <ol className="lab-stage-map">{STAGES.map((stage) => <li key={stage.id}><span>{stage.id}</span><div><strong>{stage.label}</strong><small>{stage.owner}</small></div></li>)}</ol>
      </section>
      <section className="lab-limit-grid">
        <div><p className="lab-kicker">INCLUDED</p><h2>Interactive public evidence.</h2><p>Deterministic opportunities, structured agents, real demo calculations, sensitivity, scenarios, comparison, export and human decisions.</p></div>
        <div><p className="lab-kicker">DELIBERATELY EXCLUDED</p><h2>Private product logic.</h2><p>Extended agents, private prompts, proprietary scoring, historical calibration, local models, datasets and complete startup execution.</p></div>
      </section>
    </main>
  );
}
