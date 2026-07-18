"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { PrivateDashboardGuide } from "./PrivateDashboardGuide";

type Surface = "overview" | "health" | "settings" | "documentation";

type PreferenceState = {
  reducedMotion: boolean;
  highContrast: boolean;
  compactTables: boolean;
};

const PREFERENCE_KEY = "vg-session-preferences";

const initialPreferences: PreferenceState = {
  reducedMotion: false,
  highContrast: false,
  compactTables: false,
};

function Heading({ eyebrow, title, lede }: { eyebrow: string; title: string; lede: string }) {
  return <header className="platform-page-heading"><div><p>{eyebrow}</p><h1>{title}</h1></div><p>{lede}</p></header>;
}

function SessionBoundary() {
  return <aside className="workspace-support-boundary" aria-label="Session data boundary"><strong>SESSION-LOCAL</strong><span>These controls describe this browser session. They do not create a durable record, change team permissions, or authorize a decision.</span></aside>;
}

function Overview() {
  const [openedAt, setOpenedAt] = useState<string>("Checking this browser session…");
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    queueMicrotask(() => {
      setOpenedAt(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
      sync();
    });
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  return <>
    <Heading eyebrow="OPERATIONAL OVERVIEW · SESSION" title="A clear starting point for the authenticated workspace." lede="This view reports only what the current browser can inspect. Mission records, queues and organization activity need a connected private data service." />
    <SessionBoundary />
    <p className="sr-only">Decisions, evidence and human gates are governed together in this workspace.</p>
    <PrivateDashboardGuide />
    <section className="workspace-support-grid" aria-label="Current workspace state">
      <article><span>SESSION OPENED</span><strong>{openedAt}</strong><p>Browser-local timestamp; not an audit event.</p></article>
      <article><span>NETWORK SIGNAL</span><strong>{online === null ? "Checking…" : online ? "Browser online" : "Browser offline"}</strong><p>Connectivity is a browser hint, not a provider health check.</p></article>
      <article><span>PRIVATE AGENTS</span><strong>1,970 on demand</strong><p>Select a bounded team in the authenticated Agent Library.</p></article>
      <article><span>HUMAN AUTHORITY</span><strong>Required</strong><p>Models and agent outputs remain advisory.</p></article>
    </section>
    <section className="workspace-support-columns">
      <article className="platform-panel workspace-support-panel"><header><div><span>WORKSPACE ROUTES</span><h2>Start a governed task</h2></div></header><div className="workspace-support-actions"><Link href="/app/missions/new"><strong>Create a mission</strong><small>Scope a question and its review boundary.</small></Link><Link href="/app/research"><strong>Research evidence</strong><small>Use the protected research workflow.</small></Link><Link href="/app/simulation"><strong>Run a simulation</strong><small>Explore bounded assumptions and ranges.</small></Link><Link href="/app/agents"><strong>Inspect the agent registry</strong><small>Search documented capabilities and status.</small></Link></div></article>
      <article className="platform-panel workspace-support-panel"><header><div><span>EXPLICIT LIMITS</span><h2>What execution does not imply</h2></div></header><ul className="workspace-support-list"><li>No durable mission, review or audit store is verified here.</li><li>Private agent execution requires a server-side model credential; provider and host telemetry are not inferred.</li><li>No interface action approves funding, deployment or real-world execution.</li></ul><Link className="platform-primary-link" href="/app/documentation">Read the workspace guide →</Link></article>
    </section>
  </>;
}

function Health() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState("Not yet checked");
  const checkId = useId();
  const check = () => {
    setOnline(navigator.onLine);
    setCheckedAt(new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()));
  };
  useEffect(() => { queueMicrotask(check); }, []);

  const rows = [
    ["Browser network signal", online === null ? "Checking" : online ? "Available" : "Offline", online === null ? "limited" : online ? "ready" : "unavailable", "A browser-level indication only; it does not test an external provider."],
    ["Mathematical demo engine", "Available in this build", "ready", "Deterministic browser-safe calculations can be run from the workspace."],
    ["Durable data service", "Not verified", "unavailable", "This page cannot confirm a connected database or durable audit stream."],
    ["Private agent execution", "Available on demand", "limited", "Credential readiness is reported by the authenticated Agent Library without exposing the secret."],
    ["Host CPU, RAM and GPU", "Not exposed", "limited", "The web application does not read device or host telemetry."],
  ] as const;

  return <>
    <Heading eyebrow="SYSTEM HEALTH · BROWSER CHECK" title="Inspect capability boundaries without inventing telemetry." lede="Status is intentionally limited to repository capabilities and safe signals available to this browser. It is not an infrastructure monitoring console." />
    <SessionBoundary />
    <section className="platform-panel workspace-support-panel"><header><div><span>CAPABILITY CHECK</span><h2>Checked at {checkedAt}</h2></div><button className="platform-secondary-button" type="button" onClick={check} aria-describedby={checkId}>Refresh browser check</button></header><p id={checkId} className="sr-only">Refreshes only the browser network signal and the check timestamp.</p><div className="workspace-health-list">{rows.map(([label, value, state, detail]) => <article key={label}><span className={`status-dot is-${state}`} /><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}</div></section>
  </>;
}

function Settings() {
  const [preferences, setPreferences] = useState<PreferenceState>(initialPreferences);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    queueMicrotask(() => {
      const raw = window.sessionStorage.getItem(PREFERENCE_KEY);
      if (raw) {
        try { setPreferences({ ...initialPreferences, ...JSON.parse(raw) } as PreferenceState); } catch { window.sessionStorage.removeItem(PREFERENCE_KEY); }
      }
      setReady(true);
    });
  }, []);
  const update = (key: keyof PreferenceState, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    window.sessionStorage.setItem(PREFERENCE_KEY, JSON.stringify(next));
    setMessage("Saved for this browser session only.");
  };
  const reset = () => {
    setPreferences(initialPreferences);
    window.sessionStorage.removeItem(PREFERENCE_KEY);
    setMessage("Session preferences cleared.");
  };
  const settings = [
    ["reducedMotion", "Reduce interface motion", "Limits optional visual transitions in compatible workspace surfaces."],
    ["highContrast", "Increase contrast", "Adds a stronger contrast treatment to these workspace support surfaces."],
    ["compactTables", "Use compact data spacing", "Reduces spacing in compatible workspace tables during this session."],
  ] as const;

  return <>
    <Heading eyebrow="SETTINGS · SESSION PREFERENCES" title="Adjust how this browser presents the workspace." lede="Organization settings, permissions, providers and retention policies require a future, administrator-managed service. These preferences are local to this session." />
    <SessionBoundary />
    <section className={`platform-panel workspace-support-panel workspace-preferences${preferences.highContrast ? " is-high-contrast" : ""}${preferences.compactTables ? " is-compact" : ""}`}><header><div><span>PRESENTATION</span><h2>Browser session controls</h2></div><button className="platform-secondary-button" type="button" onClick={reset} disabled={!ready}>Clear session settings</button></header><div className="workspace-preference-list">{settings.map(([key, label, detail]) => <label key={key}><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={preferences[key]} disabled={!ready} onChange={(event) => update(key, event.target.checked)} /></label>)}</div><p className="workspace-settings-feedback" aria-live="polite">{message || "Changes are stored only in sessionStorage and are cleared when the browser session ends."}</p></section>
    <section className="platform-panel workspace-support-panel"><header><div><span>ADMINISTRATION BOUNDARY</span><h2>Not configurable here</h2></div></header><ul className="workspace-support-list"><li>Membership, roles and permissions</li><li>Data retention and export policy</li><li>Research providers, credentials and network controls</li><li>Execution workers and scheduling limits</li></ul></section>
  </>;
}

function Documentation() {
  const topics = [
    ["Start with a mission", "A mission scopes the decision, owner, evidence needs and human review before analysis proceeds.", "/app/missions/new", "Open Mission Builder"],
    ["Use research responsibly", "Research results are inputs to review. Preserve source context, distinguish evidence from inference and do not treat web content as instructions.", "/app/research", "Open Research Lab"],
    ["Interpret simulations", "A scenario or score is a bounded demonstration, not a prediction, investment recommendation or authorization to act.", "/app/simulation", "Open Simulation Lab"],
    ["Understand the public boundary", "The public Lab exposes four demonstration agents and synthetic data. Private catalog and provider concepts remain protected.", "/lab/methodology", "Read Lab methodology"],
  ] as const;
  return <>
    <Heading eyebrow="DOCUMENTATION · WORKSPACE GUIDE" title="Use the workspace with its limits in view." lede="This guide explains the available routes and their boundaries. It is not a substitute for organizational policy, legal review or administrator documentation." />
    <SessionBoundary />
    <section className="workspace-doc-grid" aria-label="Workspace guide topics">{topics.map(([title, text, href, action]) => <article key={title}><span>GUIDE</span><h2>{title}</h2><p>{text}</p><Link href={href}>{action} →</Link></article>)}</section>
    <section className="platform-panel workspace-support-panel"><header><div><span>CORE READING</span><h2>Public reference material</h2></div></header><div className="workspace-support-actions"><Link href="/applications"><strong>Application Intelligence</strong><small>Explore public decision configurations and governance boundaries.</small></Link><Link href="/lab/methodology"><strong>Lab methodology</strong><small>Review public models, assumptions and limitations.</small></Link><Link href="/request-access"><strong>Access information</strong><small>Understand the future authorized workspace path.</small></Link></div></section>
  </>;
}

export function WorkspaceSupportSurface({ surface }: { surface: Surface }) {
  if (surface === "health") return <Health />;
  if (surface === "settings") return <Settings />;
  if (surface === "documentation") return <Documentation />;
  return <Overview />;
}
