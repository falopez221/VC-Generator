export function PrivateAgentRegistryPanel() {
  return <section className="platform-panel" aria-labelledby="private-registry-title">
    <header><div><span>PRIVATE AGENT REGISTRY</span><h2 id="private-registry-title">Catalog import and execution boundary</h2></div></header>
    <p>The private registry accepts only decoded, sanitized workbook rows. A catalog entry is documented metadata, never a prompt, credential, command or executable worker.</p>
    <div className="module-card-grid">
      <article><span>01 · CATALOG</span><h3>Master list</h3><p>Rows with Nombre, Dominio, Subdominio and Descripción receive stable AGT identifiers in source order.</p><small>STATUS · Ready for D1-backed import</small></article>
      <article><span>02 · CONTROL</span><h3>Progress batches</h3><p>The Lote / ID inicial / ID final control file is imported separately to track pending, review and completed batches.</p><small>STATUS · Ready for private validation</small></article>
      <article><span>03 · EXECUTION</span><h3>Human approval required</h3><p>Imported records remain documented and not executable. A future approved implementation and mission selection are separate records.</p><small>STATUS · 0 automatic executions</small></article>
    </div>
    <p className="platform-caveat">A D1 binding and administrator-only import route are required before the master catalog can persist in this deployed workspace. The workbook is intentionally not bundled into the public site.</p>
  </section>;
}
