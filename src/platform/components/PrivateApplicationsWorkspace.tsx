"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { APPLICATION_CATALOG } from "@/src/applications/catalog";
import { filterApplications } from "@/src/applications/engine";
import { EMPTY_FILTERS } from "@/src/applications/engine";
import type { ApplicationDefinition, ApplicationFilters } from "@/src/applications/types";
import { DemoNotice } from "./DemoNotice";
import styles from "./PrivateApplicationsWorkspace.module.css";

const MAX_APPLICATIONS = 3;
const DRAFT_KEY = "vg-private-application-mission-draft";

type LocalDraft = { question: string; selectedSlugs: string[] };

function readableGovernance(level: ApplicationDefinition["governanceLevel"]) {
  return level.replaceAll("-", " ");
}

export function PrivateApplicationsWorkspace() {
  const [filters, setFilters] = useState<ApplicationFilters>(EMPTY_FILTERS);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("Choose up to three configurations to compose a bounded mission draft.");

  const domains = useMemo(() => [...new Set(APPLICATION_CATALOG.map((item) => item.primaryDomain))].sort(), []);
  const decisions = useMemo(() => [...new Set(APPLICATION_CATALOG.flatMap((item) => item.decisionTypes))].sort(), []);
  const visible = useMemo(() => filterApplications(APPLICATION_CATALOG, filters).slice(0, 18), [filters]);
  const selected = useMemo(() => selectedSlugs.map((slug) => APPLICATION_CATALOG.find((item) => item.slug === slug)).filter(Boolean) as ApplicationDefinition[], [selectedSlugs]);
  const governance = selected.some((item) => item.governanceLevel === "mandatory-authorization") ? "mandatory authorization" : selected.some((item) => item.governanceLevel === "independent-review") ? "independent review" : selected.some((item) => item.governanceLevel === "required") ? "required review" : "recommended review";

  const updateFilter = <K extends keyof ApplicationFilters>(key: K, value: ApplicationFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const toggle = (application: ApplicationDefinition) => {
    if (selectedSlugs.includes(application.slug)) {
      setSelectedSlugs((current) => current.filter((slug) => slug !== application.slug));
      setNotice(`${application.title.en} removed from the local mission draft.`);
      return;
    }
    if (selectedSlugs.length >= MAX_APPLICATIONS) {
      setNotice(`A draft is limited to ${MAX_APPLICATIONS} applications so the review remains inspectable.`);
      return;
    }
    setSelectedSlugs((current) => [...current, application.slug]);
    setNotice(`${application.title.en} added to the local mission draft.`);
  };
  const saveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ question: question.trim(), selectedSlugs } satisfies LocalDraft));
    setNotice("Local mission draft saved in this browser. It has not started a mission or authorized any action.");
  };

  return <>
    <DemoNotice />
    <header className="platform-page-heading">
      <div><p>AUTHORIZED APPLICATIONS · PRIVATE WORKSPACE</p><h1>Compose a mission from bounded application configurations.</h1></div>
      <p>Selection prepares context for a human-reviewed mission. It does not launch agents, retrieve data, make a decision, or authorize an action.</p>
    </header>

    <section className={styles.metrics} aria-label="Application catalogue summary">
      <span><b>{APPLICATION_CATALOG.length}</b> documented configurations</span>
      <span><b>{visible.length}</b> matching this view</span>
      <span><b>{selected.length}/{MAX_APPLICATIONS}</b> in local draft</span>
      <span><b>{governance}</b> highest current review level</span>
    </section>

    <section className={styles.workspace} aria-labelledby="applications-workspace-title">
      <div className={styles.explorer}>
        <header><div><span>APPLICATION EXPLORER</span><h2 id="applications-workspace-title">Filter configurations by decision context</h2></div><Link href="/applications">Open public explorer ↗</Link></header>
        <div className={styles.filters}>
          <label>Search configuration<input type="search" value={filters.query} placeholder="Decision, domain, model, output…" onChange={(event) => updateFilter("query", event.target.value)} /></label>
          <label>Domain<select value={filters.domain} onChange={(event) => updateFilter("domain", event.target.value)}><option value="">All domains</option>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
          <label>Decision<select value={filters.decision} onChange={(event) => updateFilter("decision", event.target.value)}><option value="">All decision types</option>{decisions.map((decision) => <option key={decision}>{decision}</option>)}</select></label>
          <label>Risk<select value={filters.risk} onChange={(event) => updateFilter("risk", event.target.value)}><option value="">All risk levels</option>{["standard", "elevated", "high-impact", "critical"].map((risk) => <option key={risk}>{risk}</option>)}</select></label>
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
        </div>
        <div className={styles.cards} aria-live="polite">
          {visible.map((application) => {
            const isSelected = selectedSlugs.includes(application.slug);
            return <article key={application.id} className={isSelected ? styles.selectedCard : undefined}>
              <span>{application.id} · {application.primaryDomain}</span><h3>{application.title.en}</h3><p>{application.centralQuestion.en}</p>
              <dl><div><dt>MODELS</dt><dd>{application.mathematicalModels.slice(0, 2).join(" · ")}</dd></div><div><dt>GOVERNANCE</dt><dd>{readableGovernance(application.governanceLevel)}</dd></div></dl>
              <button type="button" aria-pressed={isSelected} onClick={() => toggle(application)}>{isSelected ? "Remove from draft" : "Add to draft"}</button>
            </article>;
          })}
          {!visible.length && <p className={styles.empty}>No documented configuration matches these filters. Clear a filter or search another decision term.</p>}
        </div>
      </div>

      <aside className={styles.draft} aria-labelledby="local-draft-title">
        <header><div><span>LOCAL MISSION DRAFT</span><h2 id="local-draft-title">Review before handoff</h2></div><small>{selected.length}/{MAX_APPLICATIONS} selected</small></header>
        <label>Mission question<textarea maxLength={1200} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What decision should this mission help a named human review?" /></label>
        <div className={styles.selectionList}>{selected.length ? selected.map((application) => <article key={application.id}><span>{application.primaryDomain}</span><strong>{application.title.en}</strong><small>{application.outputs.slice(0, 2).join(" · ")}</small><button type="button" onClick={() => toggle(application)} aria-label={`Remove ${application.title.en}`}>Remove</button></article>) : <p>Select one to three configurations. The draft will keep their evidence, model and governance constraints visible.</p>}</div>
        <dl className={styles.draftDefinition}><div><dt>Required review</dt><dd>{governance}</dd></div><div><dt>Evidence inputs</dt><dd>{selected.length ? [...new Set(selected.flatMap((item) => item.evidenceInputs))].slice(0, 5).join(" · ") : "Selected configurations will define inputs."}</dd></div><div><dt>Boundaries</dt><dd>Local browser draft only. No automated execution or decision authority.</dd></div></dl>
        <div className={styles.actions}><button type="button" onClick={saveDraft} disabled={!question.trim() && !selected.length}>Save local draft</button><Link href="/app/missions/new" aria-disabled={!question.trim() && !selected.length}>Continue in Mission Builder →</Link></div>
        <p className={styles.notice} role="status" aria-live="polite">{notice}</p>
      </aside>
    </section>
  </>;
}
