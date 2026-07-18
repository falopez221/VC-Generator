export function PrivateAgentRegistryPanel() {
  return <section className="platform-panel" aria-labelledby="private-registry-title">
    <header><div><span>PRIVATE AGENT REGISTRY</span><h2 id="private-registry-title">Catalog import and execution boundary</h2></div></header>
    <p>The private registry accepts only decoded, sanitized workbook rows. Catalog metadata defines each specialist profile; authenticated execution is supplied separately by the server-side runtime.</p>
    <div className="module-card-grid">
      <article><span>01 · CATALOG</span><h3>Master list</h3><p>Rows with Nombre, Dominio, Subdominio and Descripción receive stable AGT identifiers in source order.</p><small>STATUS · Ready for D1-backed import</small></article>
      <article><span>02 · CONTROL</span><h3>Progress batches</h3><p>The Lote / ID inicial / ID final control file is imported separately to track pending, review and completed batches.</p><small>STATUS · Ready for private validation</small></article>
      <article><span>03 · EXECUTION</span><h3>Human-started runtime</h3><p>Profiles are available on demand after an operator selects a bounded mission team and confirms the human-control gate.</p><small>STATUS · NO AUTONOMOUS BULK RUNS</small></article>
    </div>
    <p className="platform-caveat">Provider credentials remain server-only. The workbook and individual private profiles are never bundled into the public Lab.</p>
  </section>;
}
