import { PRIVATE_PRODUCT_BOUNDARY } from "../private-product-boundary";

export function PrivateAgentLibrary() {
  return <section className="private-agent-library" aria-labelledby="private-agent-library-title">
    <header className="platform-page-heading">
      <div>
        <p>PRIVATE PRODUCT BOUNDARY &middot; AUTHORIZED WORKSPACE</p>
        <h1 id="private-agent-library-title">Mathematical capability expansion</h1>
      </div>
      <p>
        The governed source inventory covers {PRIVATE_PRODUCT_BOUNDARY.documentedProfiles.toLocaleString("en-US")} baseline profiles across {PRIVATE_PRODUCT_BOUNDARY.documentedDomains} domains.
        The external private runtime expands that blueprint to {PRIVATE_PRODUCT_BOUNDARY.expandedProfiles.toLocaleString("en-US")} profiles without bundling identities, prompts or orchestration logic in this site.
      </p>
    </header>

    <section className="private-agent-executor platform-panel" aria-labelledby="private-agent-runtime-title">
      <header>
        <div><span>EXPANSION MANIFEST</span><h2 id="private-agent-runtime-title">Governed aggregate is ready</h2></div>
        <small className="is-unavailable">EXTERNAL RUNTIME</small>
      </header>
      <div className="private-agent-metrics private-agent-metrics--expanded">
        <Metric label="Expanded profiles" value={PRIVATE_PRODUCT_BOUNDARY.expandedProfiles.toLocaleString("en-US")} />
        <Metric label="Transversal additions" value={`+${PRIVATE_PRODUCT_BOUNDARY.transversalProfilesAdded}`} />
        <Metric label="Mathematical models" value={PRIVATE_PRODUCT_BOUNDARY.mathematicalModels.toLocaleString("en-US")} />
        <Metric label="Mapped relations" value={PRIVATE_PRODUCT_BOUNDARY.mappedRelations.toLocaleString("en-US")} />
        <Metric label="Domains" value={PRIVATE_PRODUCT_BOUNDARY.documentedDomains.toLocaleString("en-US")} />
        <Metric label="Domain/subdomain pairs" value={PRIVATE_PRODUCT_BOUNDARY.documentedDomainSubdomainPairs.toLocaleString("en-US")} />
      </div>
      <p className="private-agent-boundary-note">
        Status: prototype requiring specialist validation. Counts describe the private expansion manifest; they are not performance claims, investment approval or evidence that every profile is production-validated.
      </p>
    </section>

    <section className="platform-panel" aria-labelledby="private-agent-capabilities-title">
      <header><div><span>CAPABILITY ARCHITECTURE</span><h2 id="private-agent-capabilities-title">Four mathematical layers per profile</h2></div><small>DETERMINISTIC MANIFEST</small></header>
      <div className="private-agent-capability-grid">
        <Capability index="01" title="Decision model" detail="Objectives, constraints, feasible regions and explicit decision variables." />
        <Capability index="02" title="Uncertainty model" detail="Scenario ranges, probability assumptions, sensitivity and confidence limits." />
        <Capability index="03" title="Evidence model" detail="Observable inputs, provenance requirements, update rules and missing-data flags." />
        <Capability index="04" title="Review model" detail="Human gates, falsification tests, limitations and escalation conditions." />
      </div>
    </section>

    <section className="platform-panel" aria-labelledby="private-agent-topology-title">
      <header><div><span>RELATIONSHIP GRAPH</span><h2 id="private-agent-topology-title">Collaboration is mapped, not autonomously executed</h2></div><small>{PRIVATE_PRODUCT_BOUNDARY.mappedRelations.toLocaleString("en-US")} EDGES</small></header>
      <div className="private-agent-topology">
        <div><strong>Domain peers</strong><span>Shared evidence and terminology</span></div>
        <div><strong>Cross-domain reviewers</strong><span>Assumption and method challenges</span></div>
        <div><strong>Transversal specialists</strong><span>Optimization, uncertainty and validation</span></div>
        <div><strong>Human authority</strong><span>Named review retains final control</span></div>
      </div>
      <p className="private-agent-boundary-note">The relation count is a generated design artifact. It does not imply that agents communicate, learn or act without a separately governed private runtime.</p>
    </section>

    <section className="platform-panel" aria-labelledby="private-agent-external-title">
      <header><div><span>SEPARATION CONTROL</span><h2 id="private-agent-external-title">Private product remains outside this repository</h2></div></header>
      <ul className="platform-rule-list">
        <li>Individual profiles, relations, prompts, datasets and source workbooks are not bundled.</li>
        <li>Selection, orchestration, learning and execution require a separately governed private system.</li>
        <li>The public Lab exposes only Mathematics, Finance, Strategy and Marketing using synthetic data.</li>
        <li>No result authorizes investment, deployment, funding or action without accountable human review.</li>
      </ul>
    </section>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function Capability({ index, title, detail }: { index: string; title: string; detail: string }) {
  return <article><span>{index}</span><h3>{title}</h3><p>{detail}</p></article>;
}
