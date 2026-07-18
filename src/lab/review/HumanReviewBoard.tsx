"use client";

import { useEffect, useMemo, useState } from "react";
import { loadLastRun } from "../storage";
import { buildReviewOpportunities } from "./data";
import { loadReviewRecords, mergeReviewRecords, saveReviewRecords } from "./storage";
import { REVIEW_DECISIONS, REVIEW_STATES, type ReviewDecision, type ReviewDraft, type ReviewOpportunity, type ReviewPriority, type ReviewState } from "./types";

const OWNERS = ["Unassigned", "Maya Chen", "Elena Ruiz", "Noah Williams", "Owen Brooks"];
const PRIORITIES: ReviewPriority[] = ["Low", "Medium", "High", "Critical"];

const decisionState: Record<ReviewDecision, ReviewState> = {
  Discard: "Rejected",
  Investigate: "Investigating",
  Prioritize: "Prioritized",
  Reformulate: "Reformulation",
};

function emptyDraft(opportunity?: ReviewOpportunity): ReviewDraft {
  return {
    decision: "",
    comment: "",
    justification: "",
    tags: opportunity?.tags.join(", ") ?? "",
    priority: opportunity?.priority ?? "Medium",
    owner: opportunity?.owner ?? "Unassigned",
    nextReview: opportunity?.nextReview ?? "",
  };
}

function formatDate(value: string, withTime = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(date);
}

function riskLabel(risk: number) {
  if (risk >= 70) return "High";
  if (risk >= 45) return "Moderate";
  return "Low";
}

function scoreTone(score: number) {
  if (score >= 82) return "is-strong";
  if (score >= 72) return "is-medium";
  return "is-weak";
}

export function HumanReviewBoard() {
  const [opportunities, setOpportunities] = useState<ReviewOpportunity[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<ReviewState | "All">("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [minimumScore, setMinimumScore] = useState(0);
  const [sortBy, setSortBy] = useState("score-desc");
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft());
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const source = buildReviewOpportunities(loadLastRun());
      const merged = mergeReviewRecords(source, loadReviewRecords());
      setOpportunities(merged);
      setSelectedId(merged[0]?.id ?? "");
      setDraft(emptyDraft(merged[0]));
    });
  }, []);

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];

  const industries = useMemo(() => [...new Set(opportunities.map((item) => item.industry))].sort(), [opportunities]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = opportunities.filter((item) => {
      const matchesText = !normalizedQuery || [item.name, item.industry, item.description, item.tags.join(" ")].join(" ").toLowerCase().includes(normalizedQuery);
      const matchesRisk = riskFilter === "All" || riskLabel(item.risk) === riskFilter;
      return matchesText && (stateFilter === "All" || item.state === stateFilter)
        && (industryFilter === "All" || item.industry === industryFilter)
        && (ownerFilter === "All" || item.owner === ownerFilter)
        && matchesRisk && item.score >= minimumScore;
    });
    return filtered.sort((a, b) => {
      if (sortBy === "score-asc") return a.score - b.score;
      if (sortBy === "risk-desc") return b.risk - a.risk;
      if (sortBy === "confidence-desc") return b.confidence - a.confidence;
      if (sortBy === "date-desc") return Date.parse(b.generatedAt) - Date.parse(a.generatedAt);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b.score - a.score;
    });
  }, [industryFilter, minimumScore, opportunities, ownerFilter, query, riskFilter, sortBy, stateFilter]);

  const metrics = useMemo(() => {
    const count = (state: ReviewState) => opportunities.filter((item) => item.state === state).length;
    const reviewTimes = opportunities.flatMap((item) => item.audit[0]
      ? [(Date.parse(item.audit[0].timestamp) - Date.parse(item.generatedAt)) / 3_600_000]
      : []).filter((hours) => Number.isFinite(hours) && hours >= 0);
    const average = reviewTimes.length ? Math.round(reviewTimes.reduce((sum, hours) => sum + hours, 0) / reviewTimes.length) : 0;
    return { pending: count("Pending"), investigating: count("Investigating"), prioritized: count("Prioritized"), rejected: count("Rejected"), reformulation: count("Reformulation"), average };
  }, [opportunities]);

  const industryDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    opportunities.forEach((item) => counts.set(item.industry, (counts.get(item.industry) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [opportunities]);

  const chooseDecision = (decision: ReviewDecision) => {
    setDraft((current) => ({ ...current, decision }));
    setConfirming(false);
    setMessage("");
  };

  const selectOpportunity = (opportunity: ReviewOpportunity) => {
    setSelectedId(opportunity.id);
    setDraft(emptyDraft(opportunity));
    setConfirming(false);
    setMessage("");
  };

  const saveDecision = () => {
    if (!selected || !draft.decision) {
      setMessage("Select one human decision before saving.");
      return;
    }
    if (draft.owner === "Unassigned" || draft.justification.trim().length < 12) {
      setMessage("Assign an owner and add a justification of at least 12 characters.");
      return;
    }
    const sensitive = draft.decision === "Discard" || draft.decision === "Prioritize";
    if (sensitive && !confirming) {
      setConfirming(true);
      setMessage("This material classification requires a second explicit confirmation.");
      return;
    }

    const timestamp = new Date().toISOString();
    const newState = decisionState[draft.decision];
    const next = opportunities.map((item) => item.id !== selected.id ? item : {
      ...item,
      state: newState,
      owner: draft.owner,
      priority: draft.priority,
      nextReview: draft.nextReview,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
      audit: [{
        id: `${item.id}-${Date.now().toString(36)}`,
        decision: draft.decision as ReviewDecision,
        responsible: draft.owner,
        timestamp,
        comment: draft.comment.trim(),
        justification: draft.justification.trim(),
        previousState: item.state,
        newState,
        opportunityVersion: item.version,
      }, ...item.audit],
    });
    setOpportunities(next);
    saveReviewRecords(next);
    setDraft((current) => ({ ...current, decision: "", comment: "", justification: "" }));
    setConfirming(false);
    setMessage(`${selected.name} updated to ${newState}. No execution or investment action was triggered.`);
  };

  const resetFilters = () => {
    setQuery("");
    setStateFilter("All");
    setIndustryFilter("All");
    setRiskFilter("All");
    setOwnerFilter("All");
    setMinimumScore(0);
    setSortBy("score-desc");
  };

  if (!opportunities.length) {
    return <main id="lab-content" className="lab-page hrb-page"><div className="hrb-loading" role="status">Preparing the human review environment...</div></main>;
  }

  return (
    <main id="lab-content" className="lab-page hrb-page">
      <header className="hrb-header">
        <div>
          <p className="lab-kicker">Venture Governance / Human-in-Command</p>
          <h1>Human Review Board</h1>
          <p>Evaluate generated opportunities, record accountable judgments and preserve an auditable decision history.</p>
        </div>
        <div className="hrb-environment" role="note">
          <span>Review environment - simulated data</span>
          <strong>Decision support only</strong>
          <p>Venture Governance provides analytical decision support. All material decisions require explicit human authorization.</p>
        </div>
      </header>

      <section className="hrb-metrics" aria-label="Review metrics">
        <article><span>Pending</span><strong>{metrics.pending}</strong><small>Awaiting human classification</small></article>
        <article><span>Prioritized</span><strong>{metrics.prioritized}</strong><small>Selected for validation</small></article>
        <article><span>In investigation</span><strong>{metrics.investigating}</strong><small>Evidence work in progress</small></article>
        <article><span>Rejected</span><strong>{metrics.rejected}</strong><small>Closed by human review</small></article>
        <article><span>Reformulation</span><strong>{metrics.reformulation}</strong><small>Thesis requires revision</small></article>
        <article><span>Average review time</span><strong>{metrics.average || "-"}<i>{metrics.average ? "h" : ""}</i></strong><small>Generation to first decision</small></article>
      </section>

      <section className="hrb-distribution" aria-label="Portfolio distribution">
        <div>
          <header><span>Portfolio mix</span><strong>By industry</strong></header>
          <div className="hrb-bars">
            {industryDistribution.map(([industry, count]) => <div key={industry}><span>{industry}</span><i><b style={{ width: `${count / opportunities.length * 100}%` }} /></i><strong>{count}</strong></div>)}
          </div>
        </div>
        <div>
          <header><span>Human outcomes</span><strong>By current decision</strong></header>
          <div className="hrb-decision-mix">
            {REVIEW_STATES.map((state) => {
              const count = opportunities.filter((item) => item.state === state).length;
              return <div key={state}><i className={`hrb-dot state-${state.toLowerCase()}`} /><span>{state}</span><strong>{count}</strong></div>;
            })}
          </div>
        </div>
      </section>

      <section className="hrb-workspace">
        <aside className="hrb-queue" aria-label="Opportunity review queue">
          <header>
            <div><p className="lab-kicker">Review queue</p><h2>Opportunities</h2></div>
            <strong>{visible.length}<span> / {opportunities.length}</span></strong>
          </header>
          <div className="hrb-filters">
            <label className="hrb-search"><span>Search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, industry or tag" /></label>
            <div className="hrb-filter-grid">
              <label><span>Status</span><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as ReviewState | "All")}><option>All</option>{REVIEW_STATES.map((state) => <option key={state}>{state}</option>)}</select></label>
              <label><span>Industry</span><select value={industryFilter} onChange={(event) => setIndustryFilter(event.target.value)}><option>All</option>{industries.map((industry) => <option key={industry}>{industry}</option>)}</select></label>
              <label><span>Risk</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}><option>All</option><option>Low</option><option>Moderate</option><option>High</option></select></label>
              <label><span>Owner</span><select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option>All</option>{OWNERS.map((owner) => <option key={owner}>{owner}</option>)}</select></label>
              <label><span>Minimum score: {minimumScore}</span><input type="range" min="0" max="90" step="10" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} /></label>
              <label><span>Sort</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="score-desc">Score: high first</option><option value="score-asc">Score: low first</option><option value="risk-desc">Risk: high first</option><option value="confidence-desc">Confidence</option><option value="date-desc">Newest</option><option value="name">Name</option></select></label>
            </div>
            <button type="button" className="hrb-reset" onClick={resetFilters}>Reset filters</button>
          </div>
          <div className="hrb-list" aria-label={`${visible.length} visible opportunities`}>
            {visible.map((item) => <button type="button" className={item.id === selected?.id ? "hrb-row is-selected" : "hrb-row"} key={item.id} onClick={() => selectOpportunity(item)} aria-pressed={item.id === selected?.id}>
              <span className="hrb-row-main"><strong>{item.name}</strong><small>{item.industry} / {formatDate(item.generatedAt)}</small></span>
              <span className={`hrb-state state-${item.state.toLowerCase()}`}>{item.state}</span>
              <span className="hrb-row-score"><strong className={scoreTone(item.score)}>{item.score}</strong><small>score</small></span>
              <span className="hrb-row-risk"><strong>{riskLabel(item.risk)}</strong><small>{item.risk}% risk</small></span>
            </button>)}
            {!visible.length && <div className="hrb-empty"><strong>No opportunities match these filters.</strong><button type="button" onClick={resetFilters}>Clear filters</button></div>}
          </div>
        </aside>

        {selected && <article className="hrb-detail" aria-label={`Review details for ${selected.name}`}>
          <header className="hrb-detail-head">
            <div><span>{selected.source} / {selected.version}</span><h2>{selected.name}</h2><p>{selected.description}</p></div>
            <div className="hrb-score"><strong className={scoreTone(selected.score)}>{selected.score}</strong><span>composite score</span><small>{selected.confidence}% confidence</small></div>
          </header>

          <div className="hrb-facts">
            <div><span>Industry</span><strong>{selected.industry}</strong></div><div><span>Risk</span><strong>{riskLabel(selected.risk)} / {selected.risk}%</strong></div><div><span>Market potential</span><strong>{selected.marketPotential}/100</strong></div><div><span>Horizon</span><strong>{selected.horizon}</strong></div><div><span>Current state</span><strong>{selected.state}</strong></div><div><span>Generated</span><strong>{formatDate(selected.generatedAt)}</strong></div>
          </div>

          <div className="hrb-detail-grid">
            <section><span>Problem</span><p>{selected.problem}</p></section>
            <section><span>Proposed solution</span><p>{selected.solution}</p></section>
            <section><span>Critical hypotheses</span><ul>{selected.hypotheses.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><span>Mathematical evaluation</span><p>{selected.mathematicalEvaluation}</p></section>
            <section><span>Available evidence</span><ul>{selected.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><span>Risks and uncertainty</span><ul>{[...selected.risks, ...selected.uncertainties].slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>

          <section className="hrb-recommendation"><span>System recommendation</span><p>{selected.recommendation}</p><small>Analytical output, not an approval or operational instruction.</small></section>

          <div className="hrb-argument-grid">
            <section><header><span>Arguments for</span><strong>{selected.proArguments.length}</strong></header><ul>{selected.proArguments.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><header><span>Arguments against</span><strong>{selected.contraArguments.length}</strong></header><ul>{selected.contraArguments.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section className="hrb-red-team"><header><span>Red Team observations</span><strong>{selected.redTeam.length}</strong></header><ul>{selected.redTeam.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>

          <section className="hrb-decision-panel">
            <header><div><p className="lab-kicker">Human decision</p><h3>Record accountable judgment</h3></div><span>No action below triggers execution, funding or approval.</span></header>
            <div className="hrb-decision-actions" role="group" aria-label="Human decision classification">
              {REVIEW_DECISIONS.map((decision) => <button type="button" key={decision} aria-pressed={draft.decision === decision} className={draft.decision === decision ? "is-active" : ""} onClick={() => chooseDecision(decision)}>{decision}</button>)}
            </div>
            <div className="hrb-review-form">
              <label><span>Responsible owner</span><select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })}>{OWNERS.map((owner) => <option key={owner}>{owner}</option>)}</select></label>
              <label><span>Priority</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as ReviewPriority })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label><span>Next review date</span><input type="date" value={draft.nextReview} onChange={(event) => setDraft({ ...draft, nextReview: event.target.value })} /></label>
              <label><span>Tags</span><input value={draft.tags} maxLength={160} onChange={(event) => setDraft({ ...draft, tags: event.target.value })} placeholder="climate, enterprise" /></label>
              <label className="is-wide"><span>Decision justification</span><textarea value={draft.justification} maxLength={800} onChange={(event) => setDraft({ ...draft, justification: event.target.value })} placeholder="Why is this the appropriate human classification?" /></label>
              <label className="is-wide"><span>Review comment</span><textarea value={draft.comment} maxLength={800} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} placeholder="Evidence requested, conditions or context" /></label>
            </div>
            {confirming && <div className="hrb-confirm" role="alert"><strong>Explicit confirmation required</strong><p>You are about to mark this opportunity as <b>{draft.decision}</b>. This updates review state only.</p></div>}
            <div className="hrb-save-row"><button type="button" className="lab-button lab-button--primary" onClick={saveDecision}>{confirming ? "Confirm human decision" : "Save human decision"}</button><p aria-live="polite">{message}</p></div>
          </section>

          <section className="hrb-audit">
            <header><div><p className="lab-kicker">Immutable review history</p><h3>Audit trail</h3></div><span>{selected.audit.length} recorded {selected.audit.length === 1 ? "event" : "events"}</span></header>
            {selected.audit.length ? <ol>{selected.audit.map((entry) => <li key={entry.id}><div className="hrb-audit-line"><span>{entry.decision}</span><strong>{entry.previousState} to {entry.newState}</strong><time dateTime={entry.timestamp}>{formatDate(entry.timestamp, true)}</time></div><p>{entry.justification}</p>{entry.comment && <blockquote>{entry.comment}</blockquote>}<small>{entry.responsible} / opportunity {entry.opportunityVersion}</small></li>)}</ol> : <div className="hrb-audit-empty">No human decisions recorded for this opportunity.</div>}
          </section>
        </article>}
      </section>
    </main>
  );
}
