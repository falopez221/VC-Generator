"use client";

import { useState } from "react";
import type { PrivateResearchSnapshot } from "@/src/private/research/types";

const INITIAL_TOPIC = "Energy-transition infrastructure";

export function PrivateResearchConsole() {
  const [topic, setTopic] = useState(INITIAL_TOPIC);
  const [context, setContext] = useState("Compare policy, technology and market signals before a human review.");
  const [result, setResult] = useState<PrivateResearchSnapshot | null>(null);
  const [notice, setNotice] = useState("No private research request has been run in this session.");
  const [loading, setLoading] = useState(false);

  async function research() {
    setLoading(true);
    setNotice("Querying the approved provider through the protected research service.");
    try {
      const response = await fetch("/api/private/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, context, provider: "google-news", maxSources: 6 }),
      });
      const body = await response.json() as PrivateResearchSnapshot | { error?: string };
      if (!response.ok || !("sources" in body)) throw new Error("error" in body ? body.error : "Private research is unavailable.");
      setResult(body);
      setNotice(`${body.sources.length} source${body.sources.length === 1 ? "" : "s"} returned. Treat every snippet as unverified context until a human reviews the original source.`);
    } catch (error) {
      setResult(null);
      setNotice(error instanceof Error ? error.message : "Private research is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="platform-panel" aria-labelledby="private-research-title">
    <header><div><span>PRIVATE RESEARCH SERVICE</span><h2 id="private-research-title">Search approved public sources from the authorized workspace</h2></div></header>
    <p>Queries remain server-side, use the fixed approved provider, and never fetch a URL supplied by the user. Results are context for human review, not proof or an automatic model input.</p>
    <div className="platform-grid">
      <label>Research topic<input value={topic} maxLength={240} onChange={(event) => setTopic(event.target.value)} /></label>
      <label>Mission context<textarea value={context} maxLength={1_200} onChange={(event) => setContext(event.target.value)} /></label>
    </div>
    <div className="platform-topbar-actions"><button className="platform-primary-link" type="button" onClick={() => void research()} disabled={loading || topic.trim().length < 3}>{loading ? "Researching…" : "Research approved sources"}</button></div>
    <p role="status" aria-live="polite">{notice}</p>
    {result && <div className="platform-table-wrap"><table className="platform-data-table"><caption className="sr-only">Private research sources</caption><thead><tr><th scope="col">Source</th><th scope="col">Publisher</th><th scope="col">Published</th><th scope="col">Review note</th></tr></thead><tbody>{result.sources.map((source) => <tr key={source.id}><td><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></td><td>{source.publisher}</td><td>{source.publishedAt ? new Date(source.publishedAt).toLocaleDateString() : "Unknown"}</td><td>{source.snippet}</td></tr>)}</tbody></table></div>}
    {result && <ul className="platform-rule-list">{[...result.warnings, ...result.limitations].map((item) => <li key={item}>{item}</li>)}</ul>}
  </section>;
}
