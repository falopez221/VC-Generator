export type PlatformStatus = "Demo" | "Prototype" | "Preview" | "Planned";
export type MissionStatus = "Scoping" | "Evidence Collection" | "Modeling" | "Human Review";

export type PlatformMission = {
  id: string;
  title: string;
  domain: string;
  owner: string;
  stage: MissionStatus;
  risk: "Controlled" | "Elevated" | "High";
  progress: number;
  evidenceCoverage: number;
  unresolvedAssumptions: number;
  governance: string;
  updated: string;
};

export type ExecutionQueueItem = {
  id: string;
  missionId: string;
  process: string;
  operator: string;
  duration: string;
  resources: string;
  state: "Recorded" | "Awaiting review" | "Blocked";
  checkpoint: string;
};

export type CapabilityStatus = {
  id: string;
  label: string;
  value: string;
  state: "ready" | "limited" | "unavailable";
  detail: string;
};

export type GraphNodeKind = "agent" | "domain" | "model" | "mission" | "evidence" | "gate" | "result";

export type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
  cluster: string;
  x: number;
  y: number;
  z: number;
  detail: string;
  status?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  label: string;
};

export type GraphVariant = "overview" | "knowledge" | "mission" | "applications" | "simulation" | "agents" | "access";
