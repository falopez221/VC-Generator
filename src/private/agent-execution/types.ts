export type PrivateAgentRunRequest = Readonly<{
  agentIds: readonly string[];
  mission: string;
  context: string;
  acknowledged: boolean;
}>;

export type PrivateAgentAnalysis = Readonly<{
  agentId: string;
  agentName: string;
  domain: string;
  specialization: string;
  executiveSummary: string;
  findings: readonly string[];
  assumptions: readonly string[];
  risks: readonly string[];
  evidenceNeeded: readonly string[];
  recommendations: readonly string[];
  confidence: number;
  abstained: boolean;
}>;

export type PrivateAgentTeamRun = Readonly<{
  id: string;
  status: "completed" | "partial";
  model: string;
  startedAt: string;
  completedAt: string;
  mission: string;
  agentIds: readonly string[];
  results: readonly PrivateAgentAnalysis[];
  synthesis: string;
  warnings: readonly string[];
}>;
