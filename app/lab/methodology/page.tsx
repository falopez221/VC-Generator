const models = [
  ["MCDA", "Combines visible public criteria and weights; exposes contribution, risk penalty, evidence adjustment and uncertainty interval."],
  ["Monte Carlo", "Explores many possible outcomes by repeatedly varying uncertain inputs with a reproducible seed."],
  ["Sensitivity", "Shows which assumptions and public weights have the greatest influence on ranking."],
  ["Bayesian Update", "Updates confidence when new evidence becomes available, using visible demonstrative likelihoods."],
  ["Scenarios", "Compares editable downside, base and upside assumptions without treating one forecast as certain."],
  ["Risk Matrix", "Separates probability, impact, uncertainty, mitigation and evidence."],
  ["Pareto", "Highlights opportunities with stronger trade-offs that are not clearly dominated by another option."],
] as const;

export default function MethodologyPage() {
  return (
    <main className="lab-page" id="lab-content">
      <section className="lab-method-hero"><p className="lab-kicker">PUBLIC METHODOLOGY</p><h1>Score is an analytical interface. Decision remains human.</h1><p>This page explains what the public agents and models calculate, what they cannot claim, and why the private architecture is deliberately excluded.</p></section>
      <section className="lab-method-grid">
        <article><span>DATA</span><h2>Observed, synthetic and assumed are different labels.</h2><p>Observed data comes from supplied evidence. Synthetic data is generated for the demo. Assumptions are editable beliefs. Simulations vary those assumptions. Inference interprets outputs; it is not new evidence.</p></article>
        <article><span>AGENTS</span><h2>Four visible public responsibilities.</h2><p>Mathematics tests robustness; Finance models economics; Strategy frames advantage and experiments; Marketing distinguishes theoretical market from accessible demand. They return structured outputs and criticism, never chain of thought.</p></article>
        <article><span>HUMAN GATE</span><h2>Recommendation is not approval.</h2><p>Save, compare, request evidence, mark promising, uncertain or reject. No action invests, funds, deploys or executes a company.</p></article>
        <article><span>EARLY TECHNICAL SUPPORT</span><h2>MCPs are evidence artifacts, not company execution.</h2><p>An MCP specification or limited prototype may help validate technical feasibility. It does not replace product engineering, founders, operations, sales or governance.</p></article>
      </section>
      <section className="lab-section lab-section--dark"><header><p className="lab-kicker">DEMONSTRATIVE MODELS</p><h2>Visible mechanics and explicit limits.</h2></header><div className="lab-model-list">{models.map(([name, copy]) => <article key={name}><h3>{name}</h3><p>{copy}</p><small>Public formula · synthetic or user-provided inputs · no private calibration</small></article>)}</div></section>
      <section className="lab-warning"><strong>Investment limitation</strong><p>This laboratory produces model-based estimates from assumptions and synthetic or user-provided data. It does not constitute investment advice and does not predict startup success.</p></section>
      <section className="lab-warning"><strong>Intellectual-property boundary</strong><p>This public lab demonstrates only a limited part of the broader Venture Governance architecture. The complete local system, extended agent network, proprietary orchestration logic and private quantitative models are not included.</p></section>
    </main>
  );
}

