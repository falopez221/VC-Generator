import { APPLICATION_CATALOG } from "./catalog.ts";
import type { ApplicationDefinition, ApplicationFilters, GovernanceLevel, MissionConfiguration } from "./types.ts";

export const EMPTY_FILTERS: ApplicationFilters = { query: "", domain: "", decision: "", objective: "", horizon: "", organization: "", risk: "", output: "", method: "", governance: "" };

const includes = (values: string[], value: string) => !value || values.some((item) => item.toLowerCase() === value.toLowerCase());

export function filterApplications(catalog: ApplicationDefinition[], filters: ApplicationFilters) {
  const terms = filters.query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return catalog.filter((application) => {
    const searchable = [application.title.es, application.title.en, application.description.es, application.description.en, application.centralQuestion.es, application.centralQuestion.en, application.primaryDomain, ...application.relatedDomains, ...application.subdomains, ...application.decisionTypes, ...application.agentRoles, ...application.mathematicalModels, ...application.outputs, ...application.tags].join(" ").toLowerCase();
    return terms.every((term) => searchable.includes(term))
      && (!filters.domain || application.primaryDomain === filters.domain || application.relatedDomains.includes(filters.domain))
      && includes(application.decisionTypes, filters.decision)
      && includes(application.objectives, filters.objective)
      && includes(application.timeHorizons, filters.horizon)
      && includes(application.organizationLevels, filters.organization)
      && (!filters.risk || application.riskLevel === filters.risk)
      && includes(application.outputs, filters.output)
      && includes(application.mathematicalModels, filters.method)
      && (!filters.governance || application.governanceLevel === filters.governance);
  });
}

export function filtersFromSearchParams(params: URLSearchParams): ApplicationFilters {
  return Object.fromEntries(Object.keys(EMPTY_FILTERS).map((key) => [key, params.get(key) ?? ""])) as ApplicationFilters;
}

export function filtersToSearchParams(filters: ApplicationFilters, extras: Record<string, string> = {}) {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...extras }).forEach(([key, value]) => { if (value) params.set(key, value); });
  return params;
}

export function classifyMissionRisk(domains: string[], question: string): GovernanceLevel {
  const criticalDomains = new Set(["Healthcare", "Defense", "Government", "Law", "Infrastructure", "Climate", "Cybersecurity", "Emergency Response", "Water", "Public Safety"]);
  const sensitive = /diagnos|patient|weapon|military|justice|critical|national|public safety|hospital|defen[sc]e/i.test(question);
  const count = domains.filter((domain) => criticalDomains.has(domain)).length;
  if (sensitive || count >= 2) return "mandatory-authorization";
  if (count === 1) return "independent-review";
  return domains.length >= 3 ? "required" : "recommended";
}

export function recommendAgents(domains: string[], question: string) {
  const base = [
    { name: "Strategy", reason: "Frames alternatives, sequence and reversible choices.", output: "Strategic options", limit: "Does not make the final decision." },
    { name: "Mathematics", reason: "Tests uncertainty, sensitivity and trade-offs.", output: "Ranges and robustness", limit: "Cannot repair weak evidence." },
    { name: "Evidence Steward", reason: "Tracks sources, assumptions and missing evidence.", output: "Evidence graph", limit: "Does not certify source truth." },
    { name: "Red Team", reason: "Searches for failure modes and second-order effects.", output: "Objections and stop conditions", limit: "Challenges; it does not authorize action." },
  ];
  if (/capital|invest|finance|budget|cost/i.test(question) || domains.some((domain) => ["Finance", "Venture Capital", "Infrastructure"].includes(domain))) base.splice(1, 0, { name: "Finance", reason: "Makes capital, downside and economic assumptions explicit.", output: "Financial scenarios", limit: "Not financial advice or autonomous allocation." });
  if (/adopt|customer|market|demand/i.test(question) || domains.some((domain) => ["Venture Capital", "Corporate Strategy", "Culture & Media"].includes(domain))) base.splice(2, 0, { name: "Marketing", reason: "Examines adoption, demand and channel evidence.", output: "Adoption hypotheses", limit: "Synthetic demand is not willingness to pay." });
  return [...base.slice(0, 7), { name: "Human Committee", reason: "Owns mandate, exceptions and final authority.", output: "Decision record", limit: "Must remain accountable for the outcome." }];
}

export function recommendModels(domains: string[], question: string) {
  const models = new Map<string, { purpose: string; tradeoff: string }>();
  const add = (name: string, purpose: string, tradeoff: string) => models.set(name, { purpose, tradeoff });
  add("MCDA", "Compare alternatives under visible criteria and weights.", "Transparency versus simplification of interactions.");
  add("Sensitivity analysis", "Identify assumptions that can change the conclusion.", "Local changes may miss structural uncertainty.");
  if (/uncertain|scenario|risk|forecast|shock/i.test(question)) add("Monte Carlo", "Explore a distribution of outcomes rather than one forecast.", "Model fidelity versus data quality and cost.");
  if (/actor|incentive|competition|geopolit/i.test(question)) add("Game theory", "Expose strategic behavior and incentives.", "Useful abstraction versus behavioral realism.");
  if (/network|supply|dependency|logistic|infrastructure/i.test(question) || domains.includes("Logistics")) add("Network analysis", "Trace dependencies, concentration and propagation paths.", "Graph completeness versus interpretability.");
  if (/resource|capacity|allocate|route|portfolio/i.test(question)) add("Robust optimization", "Find allocations that remain acceptable across scenarios.", "Robustness versus upside in one assumed future.");
  if (/policy|system|climate|health|hospital/i.test(question) || domains.some((domain) => ["Healthcare", "Climate", "Government", "Water"].includes(domain))) add("System dynamics", "Model feedback loops and delayed effects.", "Structural insight versus calibration burden.");
  return [...models.entries()].slice(0, 5).map(([name, detail]) => ({ name, ...detail }));
}

export function buildMission(partial: Omit<MissionConfiguration, "agents" | "models" | "governance">): MissionConfiguration {
  const agents = recommendAgents(partial.domains, partial.question).map((agent) => agent.name);
  const models = recommendModels(partial.domains, partial.question).map((model) => model.name);
  return { ...partial, agents, models, governance: classifyMissionRisk(partial.domains, partial.question) };
}

export function getApplication(slug: string) { return APPLICATION_CATALOG.find((application) => application.slug === slug); }
