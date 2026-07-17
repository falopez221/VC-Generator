export type Language = "es" | "en";
export type LocalizedText = { es: string; en: string };
export type RiskLevel = "standard" | "elevated" | "high-impact" | "critical";
export type GovernanceLevel = "recommended" | "required" | "independent-review" | "mandatory-authorization";
export type Maturity = "conceptual" | "research-ready" | "pilot-ready" | "enterprise-candidate";

export interface ApplicationDefinition {
  id: string;
  slug: string;
  title: LocalizedText;
  primaryDomain: string;
  relatedDomains: string[];
  subdomains: string[];
  decisionTypes: string[];
  objectives: string[];
  description: LocalizedText;
  transformation: { from: LocalizedText; to: LocalizedText };
  centralQuestion: LocalizedText;
  problems: string[];
  agentRoles: string[];
  mathematicalModels: string[];
  strategicFrameworks: string[];
  evidenceInputs: string[];
  outputs: string[];
  workflowStages: string[];
  timeHorizons: string[];
  organizationLevels: string[];
  riskLevel: RiskLevel;
  governanceLevel: GovernanceLevel;
  maturity: Maturity;
  economicValueMechanisms: string[];
  limitations: LocalizedText[];
  exampleQuestions: LocalizedText[];
  relatedApplications: string[];
  tags: string[];
  featured?: boolean;
}

export type ApplicationFilters = {
  query: string;
  domain: string;
  decision: string;
  objective: string;
  horizon: string;
  organization: string;
  risk: string;
  output: string;
  method: string;
  governance: string;
};

export type ApplicationView = "cards" | "map" | "matrix" | "value";

export type MissionConfiguration = {
  question: string;
  organization: string;
  domains: string[];
  agents: string[];
  models: string[];
  horizon: string;
  constraints: string;
  riskTolerance: string;
  output: string;
  governance: GovernanceLevel;
};

