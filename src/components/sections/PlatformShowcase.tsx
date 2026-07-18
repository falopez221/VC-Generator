"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { RegistryField } from "./RegistryField";

type ShowcaseSummaryKey = "evidence" | "outputs" | "models" | "governance";

type ShowcaseNode = {
  id: string;
  label: string;
  kind: "evidence" | "mission" | "agent" | "model" | "gate" | "result";
  status: string;
  detail: string;
  summaryKey: ShowcaseSummaryKey;
  x: number;
  y: number;
};

type ShowcaseEdge = {
  id: string;
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  kind?: "flow" | "collaboration";
};

const SYNTHETIC_MISSION = {
  id: "VG-021",
  title: "Energy Transition Portfolio",
  nodes: [
    { id: "evidence", label: "Evidence Graph", kind: "evidence", status: "Traceable inputs", detail: "Keeps sources, assumptions, inferences and evidence gaps visibly separated.", summaryKey: "evidence", x: 7, y: 50 },
    { id: "mission", label: "Mission VG-021", kind: "mission", status: "Human mandate", detail: "Defines the decision, scope, owner, constraints and authority boundary.", summaryKey: "governance", x: 20, y: 50 },
    { id: "mathematics", label: "Mathematics", kind: "agent", status: "Public agent", detail: "Models uncertainty, sensitivity, robustness and trade-offs.", summaryKey: "outputs", x: 39, y: 23 },
    { id: "finance", label: "Finance", kind: "agent", status: "Public agent", detail: "Evaluates economics, capital exposure and staged commitment.", summaryKey: "outputs", x: 39, y: 41 },
    { id: "strategy", label: "Strategy", kind: "agent", status: "Public agent", detail: "Frames alternatives, timing, differentiation and strategic constraints.", summaryKey: "outputs", x: 39, y: 59 },
    { id: "marketing", label: "Marketing", kind: "agent", status: "Public agent", detail: "Evaluates adoption, accessible demand and evidence gaps.", summaryKey: "outputs", x: 39, y: 77 },
    { id: "monte-carlo", label: "Monte Carlo", kind: "model", status: "Demonstrative model", detail: "Explores bounded distributions under visible assumptions and a reproducible seed.", summaryKey: "models", x: 58, y: 20 },
    { id: "bayesian", label: "Bayesian update", kind: "model", status: "Demonstrative model", detail: "Shows how declared evidence can update a bounded prior without claiming certainty.", summaryKey: "models", x: 66, y: 34 },
    { id: "mcda", label: "MCDA", kind: "model", status: "Visible weights", detail: "Compares alternatives using fictitious, normalized and inspectable public weights.", summaryKey: "models", x: 58, y: 47 },
    { id: "scenario", label: "Scenario analysis", kind: "model", status: "Bounded cases", detail: "Compares declared downside, base and upside cases without forecasting outcomes.", summaryKey: "models", x: 66, y: 60 },
    { id: "sensitivity", label: "Sensitivity", kind: "model", status: "Demonstrative model", detail: "Identifies which assumptions most strongly influence the comparison.", summaryKey: "models", x: 58, y: 73 },
    { id: "pareto", label: "Pareto frontier", kind: "model", status: "Trade-off view", detail: "Surfaces non-dominated alternatives without converting trade-offs into approval.", summaryKey: "models", x: 66, y: 86 },
    { id: "human-gate", label: "Human Gate", kind: "gate", status: "Named authority", detail: "Requires a named person to review evidence, objections and limitations.", summaryKey: "governance", x: 81, y: 50 },
    { id: "decision-record", label: "Decision Record", kind: "result", status: "Review package", detail: "Preserves alternatives, rationale, conditions, dissent and the next review point.", summaryKey: "governance", x: 94, y: 50 },
  ] satisfies ShowcaseNode[],
  edges: [
    { id: "evidence-mission", from: "evidence", to: "mission", x1: 11.5, y1: 50, x2: 15.2, y2: 50, label: "Evidence grounds the mission" },
    { id: "mission-mathematics", from: "mission", to: "mathematics", x1: 25, y1: 48, x2: 33.8, y2: 24, label: "Mission routes work to Mathematics" },
    { id: "mission-finance", from: "mission", to: "finance", x1: 25, y1: 49, x2: 33.8, y2: 41, label: "Mission routes work to Finance" },
    { id: "mission-strategy", from: "mission", to: "strategy", x1: 25, y1: 51, x2: 33.8, y2: 59, label: "Mission routes work to Strategy" },
    { id: "mission-marketing", from: "mission", to: "marketing", x1: 25, y1: 52, x2: 33.8, y2: 76, label: "Mission routes work to Marketing" },
    { id: "mathematics-monte-carlo", from: "mathematics", to: "monte-carlo", x1: 44, y1: 23, x2: 52.8, y2: 20, label: "Mathematics configures Monte Carlo" },
    { id: "mathematics-bayesian", from: "mathematics", to: "bayesian", x1: 44, y1: 25, x2: 60.8, y2: 34, label: "Mathematics bounds the Bayesian update" },
    { id: "finance-mcda", from: "finance", to: "mcda", x1: 44, y1: 41, x2: 52.8, y2: 47, label: "Finance contributes normalized comparison criteria" },
    { id: "finance-scenario", from: "finance", to: "scenario", x1: 44, y1: 43, x2: 60.8, y2: 59, label: "Finance contributes bounded economic cases" },
    { id: "strategy-scenario", from: "strategy", to: "scenario", x1: 44, y1: 59, x2: 60.8, y2: 60, label: "Strategy frames alternative cases" },
    { id: "strategy-sensitivity", from: "strategy", to: "sensitivity", x1: 44, y1: 61, x2: 52.8, y2: 72, label: "Strategy contributes decision assumptions" },
    { id: "marketing-sensitivity", from: "marketing", to: "sensitivity", x1: 44, y1: 76, x2: 52.8, y2: 73, label: "Marketing contributes adoption assumptions" },
    { id: "marketing-pareto", from: "marketing", to: "pareto", x1: 44, y1: 78, x2: 60.8, y2: 85, label: "Marketing contributes demand trade-offs" },
    { id: "mathematics-finance", from: "mathematics", to: "finance", x1: 39, y1: 28, x2: 39, y2: 35, label: "Mathematics shares uncertainty ranges with Finance", kind: "collaboration" },
    { id: "finance-strategy", from: "finance", to: "strategy", x1: 39, y1: 46, x2: 39, y2: 53, label: "Finance and Strategy reconcile economics with positioning", kind: "collaboration" },
    { id: "strategy-marketing", from: "strategy", to: "marketing", x1: 39, y1: 64, x2: 39, y2: 71, label: "Strategy sends positioning assumptions to Marketing", kind: "collaboration" },
    { id: "monte-carlo-human-gate", from: "monte-carlo", to: "human-gate", x1: 63, y1: 20, x2: 75.7, y2: 47, label: "Scenario distributions enter human review" },
    { id: "bayesian-human-gate", from: "bayesian", to: "human-gate", x1: 71, y1: 34, x2: 75.7, y2: 48, label: "Evidence updates enter human review" },
    { id: "mcda-human-gate", from: "mcda", to: "human-gate", x1: 63, y1: 47, x2: 75.7, y2: 49, label: "Weighted comparisons enter human review" },
    { id: "scenario-human-gate", from: "scenario", to: "human-gate", x1: 71, y1: 60, x2: 75.7, y2: 51, label: "Scenario cases enter human review" },
    { id: "sensitivity-human-gate", from: "sensitivity", to: "human-gate", x1: 63, y1: 73, x2: 75.7, y2: 52, label: "Sensitivity findings enter human review" },
    { id: "pareto-human-gate", from: "pareto", to: "human-gate", x1: 71, y1: 86, x2: 75.7, y2: 53, label: "Trade-off frontiers enter human review" },
    { id: "human-gate-decision-record", from: "human-gate", to: "decision-record", x1: 86.2, y1: 50, x2: 89.2, y2: 50, label: "Named authority creates a decision record" },
  ] satisfies ShowcaseEdge[],
  summary: [
    { id: "evidence", label: "Evidence", value: "18 items", detail: "12 observed · 4 inferred · 2 gaps" },
    { id: "outputs", label: "Synthetic agent field", value: "1,920 profiles", detail: "Aggregate signals · 4 public specialists" },
    { id: "models", label: "Model runs", value: "6 models", detail: "1,200 bounded scenarios" },
    { id: "governance", label: "Governance", value: "Human review", detail: "Decision not authorized" },
  ] satisfies Array<{ id: ShowcaseSummaryKey; label: string; value: string; detail: string }>,
} as const;

const CAPABILITY_CLUSTERS = [
  ["Data & evidence", 8, 18], ["Engineering", 22, 10], ["Science", 39, 10],
  ["Economics", 57, 11], ["Capital", 75, 12], ["Operations", 91, 20],
  ["Risk", 94, 72], ["Policy", 79, 86], ["Product", 61, 90],
  ["Markets", 42, 89], ["Organizations", 24, 86], ["Delivery", 7, 70],
] as const;

function collectGraphPath(startId: string, edges: readonly ShowcaseEdge[], direction: "upstream" | "downstream") {
  const nodeIds = new Set<string>([startId]);
  const edgeIds = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;

    edges.forEach((edge) => {
      const matches = direction === "upstream" ? edge.to === currentId : edge.from === currentId;
      if (!matches) return;

      const nextId = direction === "upstream" ? edge.from : edge.to;
      edgeIds.add(edge.id);
      if (!nodeIds.has(nextId)) {
        nodeIds.add(nextId);
        queue.push(nextId);
      }
    });
  }

  return { nodeIds, edgeIds };
}

const ARCHITECTURE_LAYERS = [
  ["01", "Human authority", "Mandate, ownership and final review"],
  ["02", "Mission architecture", "Scope, constraints and decision state"],
  ["03", "Evidence boundary", "Sources, assumptions and provenance"],
  ["04", "Agents + models", "Inspectable specialist contributions"],
  ["05", "Decision record", "Conditions, dissent and next review"],
] as const;

const NODE_KIND_LABELS: Record<ShowcaseNode["kind"], string> = {
  evidence: "Evidence layer",
  mission: "Human mission",
  agent: "Public specialist agent",
  model: "Demonstrative model",
  gate: "Human control gate",
  result: "Decision output",
};

export function PlatformShowcase() {
  const [selectedId, setSelectedId] = useState("mission");
  const selected = SYNTHETIC_MISSION.nodes.find((node) => node.id === selectedId) ?? SYNTHETIC_MISSION.nodes[1];
  const graphState = useMemo(() => {
    const upstream = collectGraphPath(selectedId, SYNTHETIC_MISSION.edges, "upstream");
    const downstream = collectGraphPath(selectedId, SYNTHETIC_MISSION.edges, "downstream");
    const incomingEdges = SYNTHETIC_MISSION.edges.filter((edge) => edge.to === selectedId);
    const outgoingEdges = SYNTHETIC_MISSION.edges.filter((edge) => edge.from === selectedId);

    return {
      pathNodeIds: new Set([...upstream.nodeIds, ...downstream.nodeIds]),
      pathEdgeIds: new Set([...upstream.edgeIds, ...downstream.edgeIds]),
      directNodeIds: new Set([...incomingEdges.map((edge) => edge.from), ...outgoingEdges.map((edge) => edge.to)]),
      incomingEdges,
      outgoingEdges,
    };
  }, [selectedId]);

  return (
    <section className="platform-showcase" id="platform" aria-labelledby="platform-showcase-title" lang="en">
      <div className="container platform-showcase-inner">
        <header className="platform-showcase-heading">
          <div>
            <p>MISSION COMMAND SURFACE</p>
            <h2 id="platform-showcase-title">One mission. Every dependency visible.</h2>
          </div>
          <div>
            <p>This enlarged deterministic field renders 1,920 synthetic profile signals around the most important decision path. Only Mathematics, Finance, Strategy and Marketing expand into public agents; the surrounding clusters stay aggregated and illustrative.</p>
            <nav aria-label="Platform showcase actions">
              <Link href="/lab/demo">Run the Public Lab <span aria-hidden="true">→</span></Link>
              <Link href="/app/login">Workspace sign-in</Link>
            </nav>
          </div>
        </header>

        <div className="platform-showcase-layout">
          <figure className="ps-product-view" aria-labelledby="platform-showcase-title ps-demo-caption">
            <div className="ps-command-surface">
              <div className="ps-screen">
                <header className="ps-screen-topbar">
                  <div className="ps-screen-brand"><i aria-hidden="true" /><span>VENTURE GOVERNANCE<small>MISSION WORKSPACE</small></span></div>
                  <div><span>{SYNTHETIC_MISSION.id}</span><strong>{SYNTHETIC_MISSION.title}</strong></div>
                  <b>1,920-NODE FIELD · SYNTHETIC</b>
                </header>

                <ol className="ps-activity-stream" aria-label="Synthetic mission activity">
                  <li><i aria-hidden="true" /><span>evidence.received</span><strong>18 traceable items</strong></li>
                  <li><i aria-hidden="true" /><span>field.routed</span><strong>1,920 synthetic profiles</strong></li>
                  <li><i aria-hidden="true" /><span>model.completed</span><strong>6 models · 1,200 scenarios</strong></li>
                  <li className="is-review"><i aria-hidden="true" /><span>human.review_required</span><strong>Decision not authorized</strong></li>
                </ol>

                <div className="ps-screen-workspace">
                  <aside className="ps-screen-rail" aria-label="Workspace preview modules">
                    <span>WORKSPACE</span>
                    <strong>Overview</strong>
                    <span>Missions</span>
                    <span>Evidence</span>
                    <span>Models</span>
                    <span>Governance</span>
                    <small>UI PREVIEW</small>
                  </aside>

                  <dl className="ps-screen-summary" aria-label="Synthetic mission status">
                    {SYNTHETIC_MISSION.summary.map((item) => {
                      const isActive = item.id === selected.summaryKey;
                      return (
                        <div key={item.id} className={isActive ? "is-active" : undefined}>
                          <dt>{isActive ? <span className="sr-only">Related to selected component. </span> : null}{item.label}</dt>
                          <dd><strong>{item.value}</strong><small>{item.detail}</small></dd>
                        </div>
                      );
                    })}
                  </dl>

                  <div className="ps-system-map" role="group" aria-labelledby="ps-map-title" aria-describedby="ps-map-summary">
                    <h3 id="ps-map-title" className="sr-only">Interactive synthetic mission dependency map</h3>
                    <RegistryField />
                    <div className="ps-map-lanes" aria-hidden="true">
                      <span>Evidence</span><span>Mandate</span><span>Public agents</span><span>Models</span><span>Authority</span><span>Record</span>
                    </div>
                    <div className="ps-capability-clusters" aria-hidden="true">
                      {CAPABILITY_CLUSTERS.map(([label, x, y]) => (
                        <span key={label} style={{ "--ps-cluster-x": `${x}%`, "--ps-cluster-y": `${y}%` } as CSSProperties}>{label}</span>
                      ))}
                    </div>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <marker id="ps-showcase-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker>
                        <filter id="ps-blue-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      {SYNTHETIC_MISSION.edges.map((edge, index) => {
                        const isDirect = edge.from === selectedId || edge.to === selectedId;
                        const isOnPath = graphState.pathEdgeIds.has(edge.id);
                        const edgeClassName = [
                          edge.kind === "collaboration" ? "is-collaboration" : "",
                          isDirect ? "is-direct" : isOnPath ? "is-path" : "",
                          !isDirect && !isOnPath ? "is-muted" : "",
                        ].filter(Boolean).join(" ");
                        return (
                        <g key={edge.id}>
                          <line
                            x1={edge.x1}
                            y1={edge.y1}
                            x2={edge.x2}
                            y2={edge.y2}
                            className={edgeClassName || undefined}
                            markerEnd="url(#ps-showcase-arrow)"
                          />
                          <line
                            x1={edge.x1}
                            y1={edge.y1}
                            x2={edge.x2}
                            y2={edge.y2}
                            pathLength="100"
                            className={`ps-light-route ${edge.kind === "collaboration" ? "is-collaboration" : ""} ${isDirect ? "is-direct" : isOnPath ? "is-path" : "is-muted"}`}
                            style={{ "--ps-delay": `${-(index % 7) * .24}s` } as CSSProperties}
                          />
                        </g>
                        );
                      })}
                    </svg>
                    <ol className="ps-mobile-flow" aria-label="Decision flow stages">
                      {[
                        "Evidence",
                        "Mission",
                        "Four agents",
                        "Six models",
                        "Human Gate",
                        "Decision record",
                      ].map((stage) => <li key={stage}>{stage}</li>)}
                    </ol>
                    <div className="ps-map-legend" aria-label="Connection legend">
                      <span><i aria-hidden="true" />Decision flow</span>
                      <span><i aria-hidden="true" />Agent exchange</span>
                    </div>
                    <div className="ps-trace-status"><span>TRACE ACTIVE</span><strong>{selected.label}</strong></div>
                    {SYNTHETIC_MISSION.nodes.map((node) => {
                      const isSelected = selectedId === node.id;
                      const isDirect = graphState.directNodeIds.has(node.id);
                      const isOnPath = graphState.pathNodeIds.has(node.id) && !isSelected;
                      const className = [
                        "ps-node",
                        `ps-node--${node.kind}`,
                        isDirect ? "is-direct" : "",
                        isOnPath ? "is-on-path" : "",
                        !isSelected && !isDirect && !isOnPath ? "is-muted" : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <button
                          type="button"
                          key={node.id}
                          className={className}
                          style={{ "--ps-x": `${node.x}%`, "--ps-y": `${node.y}%` } as CSSProperties}
                          aria-pressed={isSelected}
                          aria-controls="ps-component-inspector"
                          aria-label={`${node.label}. ${NODE_KIND_LABELS[node.kind]}. ${node.status}. ${isSelected ? "Selected component." : isDirect ? "Directly connected to the selected component." : isOnPath ? "On the selected dependency path." : "Select to inspect its connections."}`}
                          onClick={() => setSelectedId(node.id)}
                        >
                          <i aria-hidden="true" />
                          <span>{node.label}</span>
                          <small>{node.status}</small>
                        </button>
                      );
                    })}
                    <p id="ps-map-summary" className="sr-only">An illustrative field of 1,920 synthetic profile signals is grouped into twelve capability clusters. Only Mathematics, Finance, Strategy and Marketing appear as public specialist agents. They contribute in parallel to six demonstrative quantitative models. A named Human Gate returns an inspectable decision record. The field is deterministic, aggregated and does not expose private profiles or orchestration.</p>
                  </div>

                  <aside id="ps-component-inspector" className="ps-inspector" aria-labelledby="ps-inspector-title" aria-live="polite" aria-atomic="true">
                    <div className="ps-inspector-summary">
                      <span>SELECTED COMPONENT</span>
                      <h4 id="ps-inspector-title">{selected.label}</h4>
                      <p>{selected.detail}</p>
                    </div>
                    <div className="ps-inspector-relations">
                      <section aria-labelledby="ps-inputs-title">
                        <h5 id="ps-inputs-title">INPUTS</h5>
                        <ul>
                          {graphState.incomingEdges.length > 0
                            ? graphState.incomingEdges.map((edge) => <li key={edge.id}>{edge.label}</li>)
                            : <li>No upstream component in this bounded public view.</li>}
                        </ul>
                      </section>
                      <section aria-labelledby="ps-outputs-title">
                        <h5 id="ps-outputs-title">OUTPUTS</h5>
                        <ul>
                          {graphState.outgoingEdges.length > 0
                            ? graphState.outgoingEdges.map((edge) => <li key={edge.id}>{edge.label}</li>)
                            : <li>No downstream component in this bounded public view.</li>}
                        </ul>
                      </section>
                    </div>
                    <dl><div><dt>TYPE</dt><dd>{NODE_KIND_LABELS[selected.kind]}</dd></div><div><dt>CONTROL</dt><dd>{selected.status}</dd></div></dl>
                  </aside>
                </div>
              </div>
            </div>
            <figcaption id="ps-demo-caption" className="ps-demo-note">1,920 deterministic synthetic signals · 4 visible public agents · no live organizational data</figcaption>
          </figure>

          <aside className="ps-architecture" aria-labelledby="ps-architecture-title">
            <p>CONTROL PLANE</p>
            <h3 id="ps-architecture-title">One mission. Five inspectable layers.</h3>
            <p>Every layer has a distinct purpose. None replaces human authority.</p>
            <ol>
              {ARCHITECTURE_LAYERS.map(([number, title, detail], index) => (
                <li key={number} style={{ "--ps-layer": index } as CSSProperties}>
                  <i aria-hidden="true" />
                  <span>{number}</span>
                  <div><strong>{title}</strong><small>{detail}</small></div>
                </li>
              ))}
            </ol>
            <div className="ps-architecture-principle"><span>OPERATING PRINCIPLE</span><strong>AI explores. Models evaluate. Humans decide.</strong></div>
          </aside>
        </div>
      </div>
    </section>
  );
}
