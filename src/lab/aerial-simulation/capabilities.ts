import { PUBLIC_AGENT_NAMES, type AgentCapability } from "./types.ts";

/**
 * Deliberately small public registry. It describes only the four specialists
 * allowed on the public surface and does not mirror the private capability
 * library.
 */
export const PUBLIC_AGENT_CAPABILITIES: readonly AgentCapability[] = [
  {
    agentId: "public-mathematics-v1",
    name: "Mathematics",
    domains: ["probability", "numerical methods", "state estimation"],
    specializations: ["Kalman covariance", "Monte Carlo", "integration error"],
    supportedTasks: ["propagation", "estimation", "association", "uncertainty", "validation"],
    requiredInputs: ["bounded scenario", "normalized states", "reproducible seed"],
    generatedOutputs: ["tracks", "covariance ellipses", "integrator comparison", "validation checks"],
    dependencies: [],
    estimatedCost: 4,
    estimatedLatency: 3,
    confidenceLevel: 0.9,
    validationCapabilities: ["finite-range checks", "positive covariance checks", "seed replay"],
  },
  {
    agentId: "public-finance-v1",
    name: "Finance",
    domains: ["capacity planning", "cost interpretation"],
    specializations: ["scarcity", "bounded allocation", "residual exposure"],
    supportedTasks: ["allocation", "saturation", "executive-summary"],
    requiredInputs: ["synthetic risk ranking", "abstract review capacity"],
    generatedOutputs: ["capacity utilization", "unassigned demand", "abstract cost interpretation"],
    dependencies: ["public-mathematics-v1"],
    estimatedCost: 2,
    estimatedLatency: 2,
    confidenceLevel: 0.78,
    validationCapabilities: ["capacity reconciliation", "allocation bound checks"],
  },
  {
    agentId: "public-strategy-v1",
    name: "Strategy",
    domains: ["scenario analysis", "resilience", "decision governance"],
    specializations: ["trade-offs", "assumption review", "stress comparison"],
    supportedTasks: ["scenario", "risk", "saturation", "audit", "research"],
    requiredInputs: ["scenario assumptions", "model outputs", "warnings"],
    generatedOutputs: ["risk ordering", "scenario interpretation", "human-review priorities"],
    dependencies: ["public-mathematics-v1"],
    estimatedCost: 3,
    estimatedLatency: 2,
    confidenceLevel: 0.82,
    validationCapabilities: ["assumption coverage", "conflict disclosure", "limit review"],
  },
  {
    agentId: "public-marketing-v1",
    name: "Marketing",
    domains: ["public explanation", "adoption", "accessibility"],
    specializations: ["plain language", "uncertainty communication", "interface clarity"],
    supportedTasks: ["executive-summary", "explanation", "export"],
    requiredInputs: ["validated model outputs", "limitations", "audit status"],
    generatedOutputs: ["plain-language explanation", "public limitation summary"],
    dependencies: ["public-mathematics-v1", "public-strategy-v1"],
    estimatedCost: 1,
    estimatedLatency: 1,
    confidenceLevel: 0.8,
    validationCapabilities: ["synthetic-data labeling", "non-operational language review"],
  },
] as const;

export function selectPublicAgentCapabilities(tasks: readonly string[]): AgentCapability[] {
  const requested = new Set(tasks.map((task) => task.trim().toLowerCase()).filter(Boolean));
  const selected = PUBLIC_AGENT_CAPABILITIES.filter((agent) =>
    agent.supportedTasks.some((task) => requested.has(task)),
  );
  const selectedIds = new Set(selected.map((agent) => agent.agentId));
  const withDependencies = PUBLIC_AGENT_CAPABILITIES.filter((agent) =>
    selectedIds.has(agent.agentId) || selected.some((candidate) => candidate.dependencies.includes(agent.agentId)),
  );
  return withDependencies.map((agent) => ({ ...agent, domains: [...agent.domains], specializations: [...agent.specializations], supportedTasks: [...agent.supportedTasks], requiredInputs: [...agent.requiredInputs], generatedOutputs: [...agent.generatedOutputs], dependencies: [...agent.dependencies], validationCapabilities: [...agent.validationCapabilities] }));
}

if (PUBLIC_AGENT_CAPABILITIES.map((agent) => agent.name).join("|") !== PUBLIC_AGENT_NAMES.join("|")) {
  throw new Error("Public capability registry must contain exactly the four allowed agents in canonical order.");
}
