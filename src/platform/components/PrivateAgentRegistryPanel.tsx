export function PrivateAgentRegistryPanel() {
  return <section className="platform-panel" aria-labelledby="private-registry-title">
    <header><div><span>PRIVATE PRODUCT BOUNDARY</span><h2 id="private-registry-title">Aggregate documentation only</h2></div></header>
    <p>The public repository records an aggregate claim of 1,970 profiles across 51 domains, but embeds zero individual profiles and no import, routing, prompt or execution logic.</p>
    <div className="module-card-grid">
      <article><span>01 · PUBLIC RECORD</span><h3>Aggregate counts</h3><p>Counts explain the conceptual boundary and do not prove implementation, availability, testing or performance.</p><small>STATUS · DOCUMENTATION ONLY</small></article>
      <article><span>02 · PROFILE DATA</span><h3>External</h3><p>Individual metadata, source workbooks and progress records remain outside this repository.</p><small>STATUS · NOT EMBEDDED</small></article>
      <article><span>03 · EXECUTION</span><h3>Fail closed</h3><p>This build collects no private mission payload and makes no private provider call.</p><small>STATUS · EXTERNAL RUNTIME REQUIRED</small></article>
    </div>
    <p className="platform-caveat">The four public Lab agents are transparent demonstrative roles and are not aliases for the external private catalog.</p>
  </section>;
}
