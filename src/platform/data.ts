import type { CapabilityStatus, ExecutionQueueItem, GraphEdge, GraphNode, GraphVariant, PlatformMission } from "./types";

export const DEMO_METADATA = {
  isDemo: true,
  datasetName: "Institutional Decision Workspace · Synthetic Demonstration",
  generatedAt: "2026-07-17",
  limitations: [
    "No private organizational data is connected.",
    "Mission activity and metrics are synthetic fixtures.",
    "No agent, model or interface authorizes a real-world action.",
  ],
} as const;

export const DEMO_MISSIONS: PlatformMission[] = [
  { id: "MIS-014", title: "Energy Transition Portfolio", domain: "Energy · Infrastructure", owner: "Decision Owner", stage: "Modeling", risk: "Elevated", progress: 64, evidenceCoverage: 68, unresolvedAssumptions: 7, governance: "Independent review", updated: "12 min ago" },
  { id: "MIS-009", title: "Critical Minerals Strategy", domain: "Mining · Manufacturing", owner: "Strategy Lead", stage: "Evidence Collection", risk: "High", progress: 42, evidenceCoverage: 54, unresolvedAssumptions: 11, governance: "Mandatory authorization", updated: "46 min ago" },
  { id: "MIS-021", title: "AI Investment Portfolio", domain: "Corporate Strategy · AI", owner: "Portfolio Committee", stage: "Human Review", risk: "Elevated", progress: 82, evidenceCoverage: 81, unresolvedAssumptions: 4, governance: "Named human gate", updated: "2 h ago" },
  { id: "MIS-006", title: "Regional Water Resilience", domain: "Water · Climate · Cities", owner: "Program Director", stage: "Scoping", risk: "Controlled", progress: 21, evidenceCoverage: 31, unresolvedAssumptions: 15, governance: "Independent review", updated: "Yesterday" },
];

export const DEMO_EXECUTION_QUEUE: ExecutionQueueItem[] = [
  { id: "RUN-118", missionId: "MIS-014", process: "Sensitivity sweep", operator: "Mathematics · public demo", duration: "00:00:41", resources: "Deterministic engine", state: "Recorded", checkpoint: "Interpretation" },
  { id: "RUN-119", missionId: "MIS-021", process: "Portfolio comparison", operator: "Finance · public demo", duration: "00:00:18", resources: "MCDA · Pareto", state: "Awaiting review", checkpoint: "Human gate" },
  { id: "RUN-120", missionId: "MIS-009", process: "Evidence coverage review", operator: "Strategy · public demo", duration: "—", resources: "No live process", state: "Blocked", checkpoint: "4 objections" },
];

export const PLATFORM_CAPABILITY_STATUS: CapabilityStatus[] = [
  { id: "engine", label: "Mathematical engine", value: "Ready", state: "ready", detail: "Deterministic public models execute in this repository." },
  { id: "agents", label: "Public agent index", value: "4 available", state: "ready", detail: "Mathematics, Finance, Strategy and Marketing only." },
  { id: "models", label: "Model catalog", value: "12 documented", state: "ready", detail: "All public models expose assumptions and limitations." },
  { id: "database", label: "Durable database", value: "Not connected", state: "unavailable", detail: "Mission and audit fixtures are not persisted server-side." },
  { id: "provider", label: "Local AI provider", value: "Not enabled", state: "unavailable", detail: "Only the future server-side provider contract exists." },
  { id: "resources", label: "CPU · RAM · GPU", value: "Not exposed", state: "limited", detail: "The web runtime does not read host telemetry." },
];

export const DEMO_GOVERNANCE_QUEUE = [
  { id: "GATE-019", mission: "Energy portfolio scenarios", authority: "Decision Owner", issue: "Review scenario conditions" },
  { id: "GATE-024", mission: "Critical-mineral evidence package", authority: "Independent Reviewer", issue: "Resolve four open objections" },
  { id: "GATE-031", mission: "AI portfolio conditions", authority: "Portfolio Committee", issue: "Authorize or return package" },
] as const;

export const DEMO_ACTIVITY = [
  { type: "EVIDENCE", action: "Grid-cost evidence labeled as external source", context: "MIS-014 · 12 min" },
  { type: "MODEL", action: "Sensitivity run recorded with public model v2.0", context: "MIS-021 · 38 min" },
  { type: "REVIEW", action: "Independent review requested", context: "MIS-009 · 1 h" },
  { type: "HUMAN GATE", action: "Scenario package returned with conditions", context: "MIS-021 · 2 h" },
] as const;

export const DEMO_AUDIT_EVENTS = [
  { timestamp: "2026-07-17 14:18", actor: "demo.reviewer", action: "review.requested", resource: "MIS-009", correlation: "COR-8F21" },
  { timestamp: "2026-07-17 13:52", actor: "public.model", action: "simulation.recorded", resource: "MIS-021", correlation: "COR-7A04" },
  { timestamp: "2026-07-17 13:31", actor: "demo.analyst", action: "evidence.labeled", resource: "MIS-014", correlation: "COR-39D1" },
] as const;

const BASE_NODES: GraphNode[] = [
  { id: "mission", label: "Active Mission", kind: "mission", cluster: "Mission", x: 50, y: 46, z: 46, detail: "The governed question, scope, owner and decision boundary.", status: "ACTIVE" },
  { id: "strategy", label: "Strategy", kind: "agent", cluster: "Agents", x: 25, y: 24, z: 18, detail: "Frames alternatives, timing, differentiation and strategic constraints.", status: "DOCUMENTED" },
  { id: "finance", label: "Finance", kind: "agent", cluster: "Agents", x: 74, y: 25, z: 8, detail: "Evaluates economics, capital exposure and staged commitments.", status: "DOCUMENTED" },
  { id: "mathematics", label: "Mathematics", kind: "agent", cluster: "Agents", x: 20, y: 68, z: 32, detail: "Models uncertainty, sensitivity, robustness and trade-offs.", status: "VALIDATED DEMO" },
  { id: "marketing", label: "Marketing", kind: "agent", cluster: "Agents", x: 80, y: 69, z: 20, detail: "Evaluates adoption, accessible demand and evidence gaps.", status: "DOCUMENTED" },
  { id: "evidence", label: "Evidence Graph", kind: "evidence", cluster: "Evidence", x: 50, y: 15, z: -6, detail: "Separates sources, assumptions, inferences and missing evidence.", status: "TRACEABLE" },
  { id: "monte-carlo", label: "Monte Carlo", kind: "model", cluster: "Models", x: 10, y: 45, z: -18, detail: "Explores distributions under visible assumptions and a reproducible seed.", status: "MODEL 2.0" },
  { id: "sensitivity", label: "Sensitivity", kind: "model", cluster: "Models", x: 90, y: 45, z: -12, detail: "Identifies the assumptions that dominate the conclusion.", status: "MODEL 2.0" },
  { id: "gate", label: "Human Gate", kind: "gate", cluster: "Governance", x: 50, y: 80, z: 54, detail: "A named person reviews evidence, dissent and authority before continuation.", status: "REQUIRED" },
  { id: "result", label: "Decision Record", kind: "result", cluster: "Outcome", x: 50, y: 95, z: 10, detail: "Preserves alternatives, rationale, conditions, objections and next review.", status: "OUTPUT" },
];

const BASE_EDGES: GraphEdge[] = [
  { from: "evidence", to: "mission", label: "grounds" },
  { from: "mission", to: "strategy", label: "routes" },
  { from: "mission", to: "finance", label: "routes" },
  { from: "mission", to: "mathematics", label: "routes" },
  { from: "mission", to: "marketing", label: "routes" },
  { from: "mathematics", to: "monte-carlo", label: "models" },
  { from: "finance", to: "monte-carlo", label: "contributes ranges" },
  { from: "strategy", to: "sensitivity", label: "contributes assumptions" },
  { from: "marketing", to: "sensitivity", label: "contributes adoption signals" },
  { from: "monte-carlo", to: "gate", label: "submits scenarios" },
  { from: "sensitivity", to: "gate", label: "submits drivers" },
  { from: "gate", to: "result", label: "authorizes record" },
];

const VARIANT_COPY: Record<GraphVariant, Partial<Record<string, string>>> = {
  overview: {},
  access: { mission: "Protected Workspace", result: "Authorized Session" },
  knowledge: { mission: "Knowledge Graph", evidence: "Source Provenance", result: "Traceable Claim" },
  mission: { mission: "Mission Architecture", evidence: "Evidence Plan", result: "Review Package" },
  applications: { mission: "Cross-domain Mission", evidence: "Domain Signals", result: "Application Configuration" },
  simulation: { mission: "Scenario Model", evidence: "Inputs & Assumptions", result: "Scenario Distribution" },
  agents: { mission: "Orchestration", evidence: "Bounded Inputs", result: "Inspectable Outputs" },
};

export function graphFor(variant: GraphVariant): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const labels = VARIANT_COPY[variant];
  return {
    nodes: BASE_NODES.map((node) => ({ ...node, label: labels[node.id] ?? node.label })),
    edges: BASE_EDGES,
  };
}

export const PLATFORM_MODULES = [
  { href: "/app", label: "Operational Overview", shortLabel: "OV", status: "Demo" },
  { href: "/app/missions", label: "Missions", shortLabel: "MS", status: "Demo" },
  { href: "/app/applications", label: "Applications", shortLabel: "AP", status: "Prototype" },
  { href: "/app/decision-lab", label: "Decision Lab", shortLabel: "DL", status: "Prototype" },
  { href: "/app/missions/new", label: "Mission Builder", shortLabel: "MB", status: "Demo" },
  { href: "/app/simulation", label: "Simulation Lab", shortLabel: "SM", status: "Preview" },
  { href: "/app/scenarios", label: "Scenario Lab", shortLabel: "SC", status: "Preview" },
  { href: "/app/research", label: "Research Lab", shortLabel: "RS", status: "Preview" },
  { href: "/app/portfolio", label: "Portfolio Lab", shortLabel: "PF", status: "Preview" },
  { href: "/app/red-team", label: "Red Team", shortLabel: "RT", status: "Preview" },
  { href: "/app/knowledge", label: "Knowledge Graph", shortLabel: "KG", status: "Prototype" },
  { href: "/app/agents", label: "Agent Library", shortLabel: "AG", status: "Demo" },
  { href: "/app/models", label: "Model Library", shortLabel: "MD", status: "Demo" },
  { href: "/app/evidence", label: "Evidence Library", shortLabel: "EV", status: "Preview" },
  { href: "/app/governance", label: "Governance", shortLabel: "GV", status: "Prototype" },
  { href: "/app/audit", label: "Audit", shortLabel: "AU", status: "Preview" },
  { href: "/app/system-health", label: "System Health", shortLabel: "SH", status: "Demo" },
  { href: "/app/documentation", label: "Documentation", shortLabel: "DC", status: "Demo" },
  { href: "/app/settings", label: "Settings", shortLabel: "ST", status: "Planned" },
] as const;
