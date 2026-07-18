"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PROJECT_NAME } from "@/src/config/site";
import { SoundController } from "@/src/components/ui/SoundController";
import { ActiveMissionProvider, PRIVATE_STORAGE_TTL_HOURS, useActiveMission } from "../active-mission";
import { DEMO_GOVERNANCE_QUEUE, DEMO_MISSIONS, PLATFORM_CAPABILITY_STATUS, PLATFORM_MODULES } from "../data";

type Props = { user: { displayName: string; email: string; role?: string }; privateCapitalAccess?: boolean; children: React.ReactNode };
const STORAGE_KEYS = { sidebar: "vg-platform-sidebar-collapsed", context: "vg-platform-context-open", contextWidth: "vg-platform-context-width" } as const;
const CONTEXT_BY_ROUTE = [
  { match: "/app/missions/new", title: "Mission configuration", items: [["Human gate", "Independent review"], ["Catalog", "Authenticated library"], ["Persistence", "Page-local draft"]] },
  { match: "/app/execution-feasibility", title: "Execution feasibility", items: [["Schedule", "PERT · CPM · Monte Carlo"], ["Cost model", "CAPEX · OPEX · TCO"], ["Authority", "Human planning gate"]] },
  { match: "/app/applications/", title: "Industry workspace", items: [["Surface", "Domain-specific mini-app"], ["Data", "Synthetic and bounded"], ["Authority", "Human review only"]] },
  { match: "/app/applications", title: "Industry workspace library", items: [["Domains", "30 distinct workspaces"], ["Runtime", "Read-only demonstration"], ["Private logic", "Not embedded"]] },
  { match: "/app/models", title: "Model context", items: [["Catalog", "Public demo models"], ["Execution", "Deterministic"], ["Validation", "Per-model status"]] },
  { match: "/app/agents", title: "Agent context", items: [["Embedded private profiles", "0"], ["Aggregate documentation", "1,970 external"], ["Authority", "Human review only"]] },
  { match: "/app/human-review", title: "Human review context", items: [["Opportunity queue", "8 simulated"], ["Industry filters", "Available"], ["Material decisions", "Explicit human confirmation"]] },
  { match: "/app/governance", title: "Governance context", items: [["Pending gates", "3 synthetic"], ["Named authority", "Required"], ["Autonomous action", "Prohibited"]] },
  { match: "/app/system-health", title: "Runtime context", items: [["Private workspace", "Authenticated"], ["Durable database", "Not connected"], ["Local AI", "Not enabled"]] },
  { match: "/app", title: "Operational context", items: [["Workspace", "Authenticated"], ["Human gates", "Required"], ["Live processes", "0"]] },
] as const;

export function AppShell({ user, privateCapitalAccess = false, children }: Props) {
  return <ActiveMissionProvider key={user.email.trim().toLowerCase()} identity={user.email}><AppShellWorkspace user={user} privateCapitalAccess={privateCapitalAccess}>{children}</AppShellWorkspace></ActiveMissionProvider>;
}

function AppShellWorkspace({ user, privateCapitalAccess = false, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mission, ready: missionReady, clearSessionData } = useActiveMission();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextWidth, setContextWidth] = useState(296);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const activeModule = [...PLATFORM_MODULES].filter((item) => item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href)).sort((left, right) => right.href.length - left.href.length)[0] ?? PLATFORM_MODULES[0];
  const selectedMission = DEMO_MISSIONS.find((mission) => mission.id === searchParams.get("mission")) ?? DEMO_MISSIONS[0];
  const isMissionDetail = pathname === "/app/missions";
  const context = useMemo(() => isMissionDetail ? { title: "Mission context", items: [["Selected mission", `${selectedMission.id} - sample context`], ["Evidence coverage", `${selectedMission.evidenceCoverage}%`], ["Open assumptions", String(selectedMission.unresolvedAssumptions)]] } : CONTEXT_BY_ROUTE.find((item) => pathname.startsWith(item.match)) ?? CONTEXT_BY_ROUTE.at(-1)!, [isMissionDetail, pathname, selectedMission]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        setSidebarCollapsed(window.localStorage.getItem(STORAGE_KEYS.sidebar) === "true");
        const storedContext = window.localStorage.getItem(STORAGE_KEYS.context);
        if (storedContext !== null) setContextOpen(storedContext === "true" && window.matchMedia("(min-width: 1321px)").matches);
        const storedWidth = Number(window.localStorage.getItem(STORAGE_KEYS.contextWidth));
        if (Number.isFinite(storedWidth) && storedWidth >= 260 && storedWidth <= 380) setContextWidth(storedWidth);
      } catch { /* Non-sensitive layout preferences can safely fall back to defaults. */ }
      setPreferencesReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.sidebar, String(sidebarCollapsed));
      window.localStorage.setItem(STORAGE_KEYS.context, String(contextOpen));
      window.localStorage.setItem(STORAGE_KEYS.contextWidth, String(contextWidth));
    } catch { /* The shell remains usable without persisted layout preferences. */ }
  }, [contextOpen, contextWidth, preferencesReady, sidebarCollapsed]);

  const shellStyle = { "--context-width": `${contextWidth}px` } as CSSProperties;
  return <div className={`platform-shell${sidebarCollapsed ? " is-sidebar-collapsed" : ""}${contextOpen ? " has-context" : ""}`} style={shellStyle} lang="en">
    <a className="skip-link" href="#platform-main">Skip to workspace</a>
    <aside className="platform-sidebar"><div className="platform-sidebar-head"><Link className="platform-brand" href="/" title={PROJECT_NAME}><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>{PROJECT_NAME}<small>DECISION INTELLIGENCE</small></span></Link><button className="platform-sidebar-toggle" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expand module navigation" : "Collapse module navigation"} aria-pressed={sidebarCollapsed}><span aria-hidden="true">{sidebarCollapsed ? "->" : "<-"}</span></button></div>
      <nav aria-label="Platform modules">{PLATFORM_MODULES.map((item) => { const active = item.href === activeModule.href; return <Link href={item.href} key={item.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} title={sidebarCollapsed ? `${item.label} - ${item.status}` : undefined}><span className="platform-module-code" aria-hidden="true">{item.shortLabel}</span><span className="platform-module-copy"><b>{item.label}</b><small>{item.status}</small></span></Link>; })}{privateCapitalAccess && <Link href="/app/private-capital-intelligence" className="platform-owner-module" title={sidebarCollapsed ? "Private Capital Intelligence - Owner only" : undefined}><span className="platform-module-code" aria-hidden="true">PC</span><span className="platform-module-copy"><b>Private Capital</b><small>Owner only</small></span></Link>}</nav>
      <div className="platform-sidebar-foot"><span>HUMAN-IN-COMMAND</span><p>Authenticated workspace. No interface action authorizes a real-world decision.</p><Link href="/">Public site</Link></div>
    </aside>
    <div className="platform-workspace"><header className="platform-topbar"><details className="platform-mobile-modules"><summary>Modules</summary><nav>{PLATFORM_MODULES.map((item) => <Link href={item.href} key={item.href}>{item.label}<small>{item.status}</small></Link>)}{privateCapitalAccess && <Link href="/app/private-capital-intelligence" className="platform-owner-module">Private Capital<small>Owner only</small></Link>}</nav></details>
      <div className="platform-workspace-name"><span>INSTITUTIONAL WORKSPACE / {activeModule.shortLabel}</span><strong>{activeModule.label}</strong><small>AUTHENTICATED WORKSPACE - {isMissionDetail ? selectedMission.id : "MISSION CONTEXT"}</small></div>
      <label className="platform-search"><span className="sr-only">Search workspace</span><input type="search" placeholder="Private catalog search is not embedded" disabled aria-describedby="workspace-search-status" /><span id="workspace-search-status" className="sr-only">Individual private profiles and catalog search are not embedded in this repository.</span></label>
      <div className="platform-topbar-actions"><details className="platform-status-menu"><summary><i className="is-limited" /> SYSTEM <b>PARTIAL</b></summary><div>{PLATFORM_CAPABILITY_STATUS.slice(0, 4).map((capability) => <p key={capability.id}><span className={`status-dot is-${capability.state}`} />{capability.label}<strong>{capability.value}</strong></p>)}</div></details><details className="platform-status-menu"><summary>PROCESSES <b>0 LIVE</b></summary><div><p><span className="status-dot is-ready" />Deterministic runs<strong>On demand</strong></p><p><span className="status-dot is-unavailable" />Background executor<strong>Not connected</strong></p></div></details><details className="platform-status-menu platform-notifications"><summary>REVIEWS <b>{String(DEMO_GOVERNANCE_QUEUE.length).padStart(2, "0")}</b></summary><div>{DEMO_GOVERNANCE_QUEUE.map((item) => <p key={item.id}>{item.id}<strong>{item.issue}</strong></p>)}</div></details><button className="platform-context-toggle" type="button" onClick={() => setContextOpen((value) => !value)} aria-controls="platform-context" aria-expanded={contextOpen}>{contextOpen ? "Hide context" : "Show context"}</button><SoundController theme="workspace" /></div>
      <details className="platform-user"><summary>{user.displayName}</summary><div><span>{user.email}</span>{user.role && <small>{user.role}</small>}<small>Private drafts are scoped to the signed-in identity in this browser tab and expire after {PRIVATE_STORAGE_TTL_HOURS} hours.</small>{privateCapitalAccess && <Link href="/app/private-capital-intelligence">Open Private Capital</Link>}<button type="button" onClick={clearSessionData}>Clear tab-local data</button><Link href="/app/documentation">Help and documentation</Link><a href="/signout-with-chatgpt?return_to=%2Fapp%2Flogin" onClick={clearSessionData}>Lock session</a><a href="/signout-with-chatgpt?return_to=%2F" onClick={clearSessionData}>Sign out</a></div></details>
    </header><main id="platform-main" className="platform-main"><ActiveMissionFlow pathname={pathname} missionTitle={mission?.core.title || mission?.core.decision.slice(0, 80) || ""} ready={missionReady} source={mission?.lastSource} />{children}</main></div>
    <aside id="platform-context" className="platform-context" aria-label="Context panel" hidden={!contextOpen}><header><div><span>CONTEXT PANEL</span><strong>{context.title}</strong></div><button type="button" onClick={() => setContextOpen(false)} aria-label="Hide context panel">x</button></header><section><span>ACTIVE MODULE</span><h2>{activeModule.label}</h2><p>{activeModule.status} capability. State is explicit throughout this workspace.</p></section><dl>{context.items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><section className="platform-context-control"><label htmlFor="context-width">Panel width <output>{contextWidth}px</output></label><input id="context-width" type="range" min="260" max="380" step="10" value={contextWidth} onChange={(event) => setContextWidth(Number(event.target.value))} /></section><section className="platform-context-boundary"><span>CAPABILITY BOUNDARY</span><p>The authenticated catalog and research workspace retain human control; no interface action grants autonomous real-world authority.</p></section></aside>
  </div>;
}

const MISSION_FLOW = [
  ["/app/missions/new", "01", "Mission"],
  ["/app/simulation", "02", "Simulation"],
  ["/app/scenarios", "03", "Scenarios"],
  ["/app/execution-feasibility", "04", "Feasibility"],
  ["/app/decision-lab", "05", "Decision"],
] as const;

function ActiveMissionFlow({ pathname, missionTitle, ready, source }: { pathname: string; missionTitle: string; ready: boolean; source?: string }) {
  return <section className={`active-mission-flow${missionTitle ? " has-mission" : ""}`} aria-label="Active mission flow">
    <div><span>ACTIVE MISSION · SESSION-LOCAL</span><strong>{ready ? missionTitle || "No active mission yet" : "Loading mission context…"}</strong><small>{missionTitle ? `Last updated from ${source?.replaceAll("-", " ") ?? "workspace"}. Inputs continue across the planning modules in this tab.` : "Start a mission to carry its context through this tab."}</small></div>
    <nav aria-label="Mission workflow">{MISSION_FLOW.map(([href, index, label]) => <Link key={href} href={href} className={pathname.startsWith(href) ? "is-active" : undefined} aria-current={pathname.startsWith(href) ? "step" : undefined}><span>{index}</span>{label}</Link>)}</nav>
  </section>;
}
