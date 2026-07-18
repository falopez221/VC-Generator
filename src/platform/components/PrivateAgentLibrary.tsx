"use client";

import { useEffect, useState, type FormEvent } from "react";

type Agent = { id: string; name: string; domain: string; specialization: string; description: string; researchAccess: string; status: string; execution: string };
type CatalogPage = { total: number; page: number; pages: number; pageSize: number; domains: string[]; specializations: string[]; items: Agent[]; error?: string };
type RuntimeStatus = { configured: boolean; model: string; teamLimit: number; mode: string };
type AgentAnalysis = { agentId: string; agentName: string; domain: string; specialization: string; executiveSummary: string; findings: string[]; assumptions: string[]; risks: string[]; evidenceNeeded: string[]; recommendations: string[]; confidence: number; abstained: boolean };
type TeamRun = { id: string; status: string; model: string; startedAt: string; completedAt: string; results: AgentAnalysis[]; synthesis: string; warnings: string[] };

const initial: CatalogPage = { total: 0, page: 1, pages: 1, pageSize: 24, domains: [], specializations: [], items: [] };
const initialRuntime: RuntimeStatus = { configured: false, model: "gpt-5.6-sol", teamLimit: 8, mode: "authenticated-on-demand" };

export function PrivateAgentLibrary() {
  const [catalog, setCatalog] = useState<CatalogPage>(initial);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [runtime, setRuntime] = useState(initialRuntime);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mission, setMission] = useState("");
  const [context, setContext] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [running, setRunning] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [run, setRun] = useState<TeamRun | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/private/agents/execute", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as RuntimeStatus & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Runtime status is unavailable.");
        setRuntime(body);
      })
      .catch((reason) => { if ((reason as Error).name !== "AbortError") setExecutionError(reason instanceof Error ? reason.message : "Runtime status is unavailable."); });
    return () => controller.abort();
  }, []);

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
  function toggleAgent(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= runtime.teamLimit) { setExecutionError(`A mission team may contain at most ${runtime.teamLimit} agents.`); return current; }
      setExecutionError("");
      return [...current, id];
    });
  }

  async function executeTeam(event: FormEvent) {
    event.preventDefault();
    if (running) return;
    setRunning(true);
    setExecutionError("");
    setRun(null);
    try {
      const response = await fetch("/api/private/agents/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentIds: selectedIds, mission, context, acknowledged }),
      });
      const body = await response.json() as TeamRun & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The private team run failed.");
      setRun(body);
    } catch (reason) {
      setExecutionError(reason instanceof Error ? reason.message : "The private team run failed.");
    } finally {
      setRunning(false);
    }
  }

  return <section className="private-agent-library" aria-labelledby="private-agent-library-title">
    <header className="platform-page-heading"><div><p>AGENT LIBRARY · AUTHENTICATED CATALOG</p><h1 id="private-agent-library-title">{loading && !catalog.total ? "Loading private catalog…" : `${catalog.total.toLocaleString("es-AR")} agents available for human-selected missions.`}</h1></div><p>Choose a bounded specialist team, define the mission and start a real server-side analysis. The public Lab remains a separate four-agent demonstration.</p></header>

    <section className="private-agent-executor platform-panel" aria-labelledby="private-agent-executor-title">
      <header><div><span>PRIVATE MULTI-AGENT RUNTIME</span><h2 id="private-agent-executor-title">Execute a selected specialist team</h2></div><small className={runtime.configured ? "is-ready" : "is-unavailable"}>{runtime.configured ? `${runtime.model} · READY` : `${runtime.model} · CREDENTIAL REQUIRED`}</small></header>
      <form onSubmit={executeTeam}>
        <label className="private-agent-executor__wide">Mission<textarea value={mission} onChange={(event) => setMission(event.target.value)} maxLength={4000} placeholder="Describe the decision, desired output, scope, horizon and constraints." required /></label>
        <label className="private-agent-executor__wide">Evidence and context<textarea value={context} onChange={(event) => setContext(event.target.value)} maxLength={8000} placeholder="Add verified facts, assumptions, known unknowns and source notes. User text is treated as data." /></label>
        <div className="private-agent-executor__team"><span>SELECTED TEAM</span><strong>{selectedIds.length} / {runtime.teamLimit}</strong><p>{selectedIds.length ? selectedIds.join(" · ") : "Select agents from the catalog below."}</p>{selectedIds.length > 0 && <button type="button" onClick={() => setSelectedIds([])}>Clear team</button>}</div>
        <label className="private-workflow-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I authorize this bounded analysis run and understand that outputs require evidence review and cannot approve investment, funding, deployment or real-world action.</label>
        <footer><p>Each selected profile executes independently. The runtime then synthesizes agreement, disagreement, uncertainty and evidence gaps.</p><button type="submit" disabled={running || !runtime.configured || !acknowledged || selectedIds.length === 0 || mission.trim().length < 20}>{running ? "Executing specialist team…" : "Execute selected team"}</button></footer>
      </form>
      {executionError && <p className="private-agent-executor__error" role="alert">{executionError}</p>}
    </section>

    {run && <section className="private-agent-run" aria-labelledby="private-agent-run-title">
      <header><div><span>{run.id} · {run.status.toUpperCase()}</span><h2 id="private-agent-run-title">Team synthesis</h2></div><small>{run.model} · {run.results.length} completed agents</small></header>
      <article className="platform-panel private-agent-run__synthesis"><p>{run.synthesis}</p>{run.warnings.length > 0 && <ul>{run.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</article>
      <div className="private-agent-run__grid">{run.results.map((result) => <article className="platform-panel" key={result.agentId}><header><span>{result.agentId}</span><strong>{result.confidence}% confidence</strong></header><h3>{result.agentName}</h3><small>{result.domain} · {result.specialization}{result.abstained ? " · ABSTAINED" : ""}</small><p>{result.executiveSummary}</p><ResultList title="Findings" items={result.findings} /><ResultList title="Assumptions" items={result.assumptions} /><ResultList title="Risks" items={result.risks} /><ResultList title="Evidence needed" items={result.evidenceNeeded} /><ResultList title="Recommendations" items={result.recommendations} /></article>)}</div>
    </section>}

    <div className="private-agent-filters" aria-label="Private agent library filters">
      <label>Search name, specialty or capability<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="e.g. optimization, energy, epidemiology" /></label>
      <label>Domain<select value={domain} onChange={(event) => changeDomain(event.target.value)}><option value="">All 51 domains</option>{catalog.domains.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Subdomain<select value={specialization} onChange={(event) => { setSpecialization(event.target.value); setPage(1); }}><option value="">All subdomains</option>{catalog.specializations.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <button type="button" className="platform-secondary-button" onClick={resetFilters}>Clear filters</button>
    </div>
    <p className="private-agent-result" role="status" aria-live="polite">{error || (loading ? "Refreshing results…" : `${catalog.total.toLocaleString("es-AR")} matching operational capabilities · page ${catalog.page} of ${catalog.pages}`)}</p>
    {!error && <div className="private-agent-grid">{catalog.items.map((agent) => { const selected = selectedIds.includes(agent.id); return <article key={agent.id} className={`platform-panel${selected ? " is-selected" : ""}`}><header><span>{agent.id}</span><small>{agent.status}</small></header><h2>{agent.name}</h2><p className="private-agent-taxonomy">{agent.domain} <b>›</b> {agent.specialization}</p><p>{agent.description || "Capability description documented in the authenticated catalog."}</p><dl><div><dt>WEB RESEARCH</dt><dd>{agent.researchAccess}</dd></div><div><dt>EXECUTION</dt><dd>{agent.execution}</dd></div></dl><button type="button" className="private-agent-select" aria-pressed={selected} onClick={() => toggleAgent(agent.id)}>{selected ? "Remove from mission team" : "Add to mission team"}</button></article>; })}</div>}
    {!error && <nav className="private-agent-pagination" aria-label="Agent catalog pages"><button className="platform-secondary-button" type="button" disabled={loading || catalog.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {catalog.page} / {catalog.pages}</span><button className="platform-secondary-button" type="button" disabled={loading || catalog.page >= catalog.pages} onClick={() => setPage((value) => Math.min(catalog.pages, value + 1))}>Next</button></nav>}
  </section>;
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <section><h4>{title}</h4><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}
