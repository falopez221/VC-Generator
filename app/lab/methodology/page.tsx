import type { Metadata } from "next";
import { SITE_URL } from "@/src/config/site";
import { PUBLIC_MODEL_CATALOG, PUBLIC_MODEL_VERSION } from "@/src/lab/model-catalog";

export const metadata: Metadata = {
  title: "Public Methodology — Venture Governance System™",
  description: "How the public agents, quantitative models, uncertainty metrics and human review controls should be interpreted.",
  alternates: { canonical: `${SITE_URL}/lab/methodology` },
};

export default function MethodologyPage() {
  return (
    <main className="lab-page" id="lab-content">
      <section className="lab-method-hero"><p className="lab-kicker">PUBLIC METHODOLOGY</p><h1>Score is an analytical interface. Decision remains human.</h1><p>This page explains what the public agents and models calculate, what they cannot claim, and why the private architecture is deliberately excluded.</p></section>
      <section className="lab-method-grid">
        <article><span>DATA</span><h2>Observed, synthetic and assumed are different labels.</h2><p>Observed data comes from supplied evidence. Synthetic data is generated for the demo. Assumptions are editable beliefs. Simulations vary those assumptions. Inference interprets outputs; it is not new evidence.</p></article>
        <article><span>AGENTS</span><h2>Four visible public responsibilities.</h2><p>Mathematics tests robustness; Finance models economics; Strategy frames advantage and experiments; Marketing distinguishes theoretical market from accessible demand. They return structured outputs and criticism, never chain of thought.</p></article>
        <article><span>CONTEXT LENSES</span><h2>Defense and macroeconomics without expanding the agent network.</h2><p>Defensibility tests imitation and switching-cost assumptions. Macroeconomics exposes financing, demand, currency and supply-chain sensitivity. Both are deterministic public models, not additional agents, forecasts or approvals.</p></article>
        <article><span>HUMAN GATE</span><h2>Recommendation is not approval.</h2><p>Save, compare, request evidence, mark promising, uncertain or reject. No action invests, funds, deploys or executes a company.</p></article>
        <article><span>EARLY TECHNICAL SUPPORT</span><h2>MCPs are evidence artifacts, not company execution.</h2><p>An MCP specification or limited prototype may help validate technical feasibility. It does not replace product engineering, founders, operations, sales or governance.</p></article>
      </section>
      <section className="lab-section lab-section--reading"><header><p className="lab-kicker">DASHBOARD READING</p><h2>Interpret a pattern of signals, not a single number.</h2><p>Start with the comparative score, then test whether evidence, risk, uncertainty and specialist agreement support the same conclusion.</p></header><div className="lab-reading-grid">
        <article><span>SCORE</span><strong>Relative priority</strong><p>A weighted comparison under current assumptions. It is not a probability of startup success.</p></article>
        <article><span>EVIDENCE</span><strong>Support quality</strong><p>High scores with weak evidence require validation before they deserve confidence.</p></article>
        <article><span>RISK</span><strong>Exposure profile</strong><p>Read probability, impact, uncertainty and mitigation together. Lower is generally preferable.</p></article>
        <article><span>UNCERTAINTY</span><strong>Conclusion stability</strong><p>Higher values mean reasonable assumption changes may materially alter the conclusion.</p></article>
        <article><span>DISAGREEMENT</span><strong>Specialist conflict</strong><p>Inspect each agent when their scores diverge; disagreement is information, not an error.</p></article>
        <article><span>HUMAN REVIEW</span><strong>Final governance gate</strong><p>Compare, request evidence, mark promising, uncertain or reject. No score approves an investment.</p></article>
      </div></section>
      <section className="lab-section lab-section--dark"><header><p className="lab-kicker">DEMONSTRATIVE MODELS · VERSION {PUBLIC_MODEL_VERSION}</p><h2>Visible mechanics and explicit limits.</h2></header><div className="lab-model-list">{PUBLIC_MODEL_CATALOG.map((model) => <article key={model.id}><span>{model.family}</span><h3>{model.name}</h3><p>{model.shows}</p><small>{model.limitation}</small></article>)}</div></section>
      <section className="lab-warning"><strong>Investment limitation</strong><p>This laboratory produces model-based estimates from assumptions and synthetic or user-provided data. It does not constitute investment advice and does not predict startup success.</p></section>
      <section className="lab-warning"><strong>Intellectual-property boundary</strong><p>The private registry aggregates 1,970 profiles across 51 domains, selected by mission. This public Lab demonstrates only four representative specialists; individual private profiles, proprietary selection and orchestration logic, and private quantitative models are not included.</p></section>
    </main>
  );
}
