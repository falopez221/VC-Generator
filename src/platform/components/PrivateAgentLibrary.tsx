"use client";

import { useEffect, useState } from "react";

type Agent = { id: string; name: string; domain: string; specialization: string; description: string; researchAccess: string; status: string; execution: string };
type CatalogPage = { total: number; page: number; pages: number; pageSize: number; domains: string[]; specializations: string[]; items: Agent[]; error?: string };
const initial: CatalogPage = { total: 0, page: 1, pages: 1, pageSize: 24, domains: [], specializations: [], items: [] };

export function PrivateAgentLibrary() {
  const [catalog, setCatalog] = useState<CatalogPage>(initial);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page) });
      if (query.trim()) params.set("q", query.trim());
      if (domain) params.set("domain", domain);
      if (specialization) params.set("specialization", specialization);
      try {
        const response = await fetch(`/api/private/agents?${params}`, { signal: controller.signal, cache: "no-store" });
        const body = await response.json() as CatalogPage;
        if (!response.ok) throw new Error(body.error ?? "The private catalog could not be read.");
        setCatalog(body);
        setError("");
      } catch (reason) {
        if ((reason as Error).name !== "AbortError") setError(reason instanceof Error ? reason.message : "The private catalog could not be read.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [domain, page, query, specialization]);

  function resetFilters() { setQuery(""); setDomain(""); setSpecialization(""); setPage(1); }
  function changeDomain(value: string) { setDomain(value); setSpecialization(""); setPage(1); }

  return <section className="private-agent-library" aria-labelledby="private-agent-library-title">
    <header className="platform-page-heading"><div><p>AGENT LIBRARY · AUTHENTICATED CATALOG</p><h1 id="private-agent-library-title">{loading && !catalog.total ? "Loading private catalog…" : `${catalog.total.toLocaleString("es-AR")} agents available for human-selected missions.`}</h1></div><p>Each record is a documented capability. Web research is available through the protected Research Lab; no agent browses or executes autonomously.</p></header>
    <div className="private-agent-filters" aria-label="Private agent library filters">
      <label>Search name, specialty or capability<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="e.g. optimization, energy, epidemiology" /></label>
      <label>Domain<select value={domain} onChange={(event) => changeDomain(event.target.value)}><option value="">All 51 domains</option>{catalog.domains.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Subdomain<select value={specialization} onChange={(event) => { setSpecialization(event.target.value); setPage(1); }}><option value="">All subdomains</option>{catalog.specializations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="button" className="platform-secondary-button" onClick={resetFilters}>Clear filters</button>
    </div>
    <p className="private-agent-result" role="status" aria-live="polite">{error || (loading ? "Refreshing results…" : `${catalog.total.toLocaleString("es-AR")} matching documented capabilities · page ${catalog.page} of ${catalog.pages}`)}</p>
    {!error && <div className="private-agent-grid">{catalog.items.map((agent) => <article key={agent.id} className="platform-panel"><header><span>{agent.id}</span><small>{agent.status}</small></header><h2>{agent.name}</h2><p className="private-agent-taxonomy">{agent.domain} <b>›</b> {agent.specialization}</p><p>{agent.description || "Capability description documented in the authenticated catalog."}</p><dl><div><dt>WEB RESEARCH</dt><dd>{agent.researchAccess}</dd></div><div><dt>EXECUTION</dt><dd>{agent.execution}</dd></div></dl></article>)}</div>}
    {!error && <nav className="private-agent-pagination" aria-label="Agent catalog pages"><button className="platform-secondary-button" type="button" disabled={loading || catalog.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {catalog.page} / {catalog.pages}</span><button className="platform-secondary-button" type="button" disabled={loading || catalog.page >= catalog.pages} onClick={() => setPage((value) => Math.min(catalog.pages, value + 1))}>Next</button></nav>}
  </section>;
}
