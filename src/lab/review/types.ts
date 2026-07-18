import type { AgentName } from "../types";

export const REVIEW_STATES = ["Pending", "Investigating", "Prioritized", "Rejected", "Reformulation"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];

export const REVIEW_DECISIONS = ["Discard", "Investigate", "Prioritize", "Reformulate"] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];
export type ReviewPriority = "Low" | "Medium" | "High" | "Critical";

export interface ReviewAuditEntry {
  id: string;
  decision: ReviewDecision;
  responsible: string;
  timestamp: string;
  comment: string;
  justification: string;
  previousState: ReviewState;
  newState: ReviewState;
  opportunityVersion: string;
}

export interface ReviewOpportunity {
  id: string;
  version: string;
  source: "Lab run" | "Simulated review sample";
  generatedAt: string;
  name: string;
  industry: string;
  description: string;
  problem: string;
  solution: string;
  score: number;
  risk: number;
  marketPotential: number;
  confidence: number;
  horizon: string;
  state: ReviewState;
  agents: AgentName[];
  evidence: string[];
  hypotheses: string[];
  mathematicalEvaluation: string;
  risks: string[];
  uncertainties: string[];
  recommendation: string;
  proArguments: string[];
  contraArguments: string[];
  redTeam: string[];
  owner: string;
  tags: string[];
  priority: ReviewPriority;
  nextReview: string;
  audit: ReviewAuditEntry[];
}

export interface ReviewDraft {
  decision: ReviewDecision | "";
  comment: string;
  justification: string;
  tags: string;
  priority: ReviewPriority;
  owner: string;
  nextReview: string;
}
