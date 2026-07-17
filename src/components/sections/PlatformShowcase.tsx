"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";

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
    { id: "evidence", label: "Evidence Graph", kind: "evidence", status: "Traceable inputs", detail: "Keeps sources, assumptions, inferences and evidence gaps visibly separated.", summaryKey: "evidence", x: 9.5, y: 50 },
    { id: "mission", label: "Mission VG-021", kind: "mission", status: "Human mandate", detail: "Defines the decision, scope, owner, constraints and authority boundary.", summaryKey: "governance", x: 27.5, y: 50 },
    { id: "mathematics", label: "Mathematics", kind: "agent", status: "Public agent", detail: "Models uncertainty, sensitivity, robustness and trade-offs.", summaryKey: "outputs", x: 45, y: 17 },
    { id: "finance", label: "Finance", kind: "agent", status: "Public agent", detail: "Evaluates economics, capital exposure and staged commitment.", summaryKey: "outputs", x: 45, y: 39 },
    { id: "strategy", label: "Strategy", kind: "agent", status: "Public agent", detail: "Frames alternatives, timing, differentiation and strategic constraints.", summaryKey: "outputs", x: 45, y: 61 },
    { id: "marketing", label: "Marketing", kind: "agent", status: "Public agent", detail: "Evaluates adoption, accessible demand and evidence gaps.", summaryKey: "outputs", x: 45, y: 83 },
    { id: "monte-carlo", label: "Monte Carlo", kind: "model", status: "Demonstrative model", detail: "Explores bounded distributions under visible assumptions and a reproducible seed.", summaryKey: "models", x: 61, y: 33 },
    { id: "sensitivity", label: "Sensitivity", kind: "model", status: "Demonstrative model", detail: "Identifies which assumptions most strongly influence the comparison.", summaryKey: "models", x: 61, y: 67 },
    { id: "human-gate", label: "Human Gate", kind: "gate", status: "Named authority", detail: "Requires a named person to review evidence, objections and limitations.", summaryKey: "governance", x: 76, y: 50 },
    { id: "decision-record", label: "Decision Record", kind: "result", status: "Review package", detail: "Preserves alternatives, rationale, conditions, dissent and the next review point.", summaryKey: "governance", x: 91, y: 50 },
  ] satisfies ShowcaseNode[],
  edges: [
    { id: "evidence-mission", from: "evidence", to: "mission", x1: 14.5, y1: 50, x2: 21.8, y2: 50, label: "Evidence grounds the mission" },
    { id: "mission-mathematics", from: "mission", to: "mathematics", x1: 32.5, y1: 48, x2: 38.7, y2: 19, label: "Mission routes work to Mathematics" },
    { id: "mission-finance", from: "mission", to: "finance", x1: 32.5, y1: 49, x2: 38.7, y2: 39, label: "Mission routes work to Finance" },
    { id: "mission-strategy", from: "mission", to: "strategy", x1: 32.5, y1: 51, x2: 38.7, y2: 61, label: "Mission routes work to Strategy" },
    { id: "mission-marketing", from: "mission", to: "marketing", x1: 32.5, y1: 52, x2: 38.7, y2: 81, label: "Mission routes work to Marketing" },
    { id: "mathematics-monte-carlo", from: "mathematics", to: "monte-carlo", x1: 50.5, y1: 18, x2: 54.7, y2: 31, label: "Mathematics configures Monte Carlo" },
    { id: "finance-monte-carlo", from: "finance", to: "monte-carlo", x1: 50.5, y1: 39, x2: 54.7, y2: 34, label: "Finance contributes economic ranges" },
    { id: "strategy-sensitivity", from: "strategy", to: "sensitivity", x1: 50.5, y1: 61, x2: 54.7, y2: 66, label: "Strategy contributes decision assumptions" },
    { id: "marketing-sensitivity", from: "marketing", to: "sensitivity", x1: 50.5, y1: 82, x2: 54.7, y2: 69, label: "Marketing contributes adoption assumptions" },
    { id: "mathematics-finance", from: "mathematics", to: "finance", x1: 45, y1: 26, x2: 45, y2: 30, label: "Mathematics shares uncertainty ranges with Finance", kind: "collaboration" },
    { id: "finance-strategy", from: "finance", to: "strategy", x1: 45, y1: 48, x2: 45, y2: 52, label: "Finance and Strategy reconcile economics with positioning", kind: "collaboration" },
    { id: "strategy-marketing", from: "strategy", to: "marketing", x1: 45, y1: 70, x2: 45, y2: 74, label: "Strategy sends positioning assumptions to Marketing", kind: "collaboration" },
    { id: "monte-carlo-human-gate", from: "monte-carlo", to: "human-gate", x1: 66.5, y1: 34, x2: 69.7, y2: 48, label: "Scenario ranges enter human review" },
    { id: "sensitivity-human-gate", from: "sensitivity", to: "human-gate", x1: 66.5, y1: 66, x2: 69.7, y2: 52, label: "Sensitivity findings enter human review" },
    { id: "human-gate-decision-record", from: "human-gate", to: "decision-record", x1: 81.5, y1: 50, x2: 84.7, y2: 50, label: "Named authority creates a decision record" },
  ] satisfies ShowcaseEdge[],
  summary: [
    { id: "evidence", label: "Evidence", value: "18 items", detail: "12 observed · 4 inferred · 2 gaps" },
    { id: "outputs", label: "Agent outputs", value: "4 briefs", detail: "One per visible public agent" },
    { id: "models", label: "Model runs", value: "2 models", detail: "1,200 bounded scenarios" },
    { id: "governance", label: "Governance", value: "Human review", detail: "Decision not authorized" },
  ] satisfies Array<{ id: ShowcaseSummaryKey; label: string; value: string; detail: string }>,
} as const;

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
            <p>Select any component to trace its upstream evidence, downstream effects and path to human authority. The interface changes as one connected system—not as isolated dashboard cards.</p>
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
                  <b>DEPENDENCY VIEW · SYNTHETIC</b>
                </header>

                <ol className="ps-activity-stream" aria-label="Synthetic mission activity">
                  <li><i aria-hidden="true" /><span>evidence.received</span><strong>18 traceable items</strong></li>
                  <li><i aria-hidden="true" /><span>agent.output</span><strong>4 briefs reconciled</strong></li>
                  <li><i aria-hidden="true" /><span>model.completed</span><strong>1,200 bounded scenarios</strong></li>
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
                    <div className="ps-map-lanes" aria-hidden="true">
                      <span>Evidence</span><span>Mandate</span><span>Agents</span><span>Models</span><span>Authority</span><span>Record</span>
                    </div>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <defs><marker id="ps-showcase-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" /></marker></defs>
                      {SYNTHETIC_MISSION.edges.map((edge) => {
                        const isDirect = edge.from === selectedId || edge.to === selectedId;
                        const isOnPath = graphState.pathEdgeIds.has(edge.id);
                        const edgeClassName = [
                          edge.kind === "collaboration" ? "is-collaboration" : "",
                          isDirect ? "is-direct" : isOnPath ? "is-path" : "",
                          !isDirect && !isOnPath ? "is-muted" : "",
                        ].filter(Boolean).join(" ");
                        return (
                        <line
                          key={edge.id}
                          x1={edge.x1}
                          y1={edge.y1}
                          x2={edge.x2}
                          y2={edge.y2}
                          className={edgeClassName || undefined}
                          markerEnd="url(#ps-showcase-arrow)"
                        />
                        );
                      })}
                    </svg>
                    <ol className="ps-mobile-flow" aria-label="Decision flow stages">
                      {[
                        "Evidence",
                        "Mission",
                        "Four agents",
                        "Two models",
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
                    <p id="ps-map-summary" className="sr-only">Evidence grounds a human-defined mission. Mathematics, Finance, Strategy and Marketing contribute in parallel, exchange assumptions and challenge adjacent specialist outputs. Monte Carlo and sensitivity models evaluate uncertainty. A named Human Gate returns an inspectable decision record. Select a component, then review its visible inputs and outputs below.</p>
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
            <figcaption id="ps-demo-caption" className="ps-demo-note">Interactive mission command surface · bounded synthetic structure · no live organizational data</figcaption>
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
