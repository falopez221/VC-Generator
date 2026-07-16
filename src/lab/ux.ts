import type { AgentName } from "./types.ts";

export interface AgentGuide {
  role: string;
  inputs: string[];
  outputs: string[];
  evaluates: string;
  limitations: string;
}

export const AGENT_GUIDES: Record<AgentName, AgentGuide> = {
  Mathematics: {
    role: "Tests robustness, uncertainty, evidence quality and sensitivity to assumptions.",
    inputs: ["Dimension estimates", "Risk assumptions", "Evidence quality", "Public weights"],
    outputs: ["Robustness score", "Confidence", "Uncertainty", "Missing evidence"],
    evaluates: "Whether the conclusion remains stable when visible assumptions change.",
    limitations: "Synthetic inputs are not calibrated observations and cannot prove future performance.",
  },
  Finance: {
    role: "Evaluates economic viability, capital needs and possible return scenarios.",
    inputs: ["Capital estimate", "Price", "CAC", "Margin and churn"],
    outputs: ["Financial score", "Scenario ranges", "Economic risks", "Evidence gaps"],
    evaluates: "Whether the opportunity can support a credible and capital-aware economic model.",
    limitations: "Public assumptions are illustrative and are not a valuation or financial forecast.",
  },
  Strategy: {
    role: "Evaluates positioning, differentiation, timing and competitive advantage.",
    inputs: ["Thesis", "Market structure", "Technology", "Competitive assumptions"],
    outputs: ["Strategic score", "Key assumptions", "Risks", "Recommendation"],
    evaluates: "Why this opportunity could win, where it should compete and what must be tested first.",
    limitations: "It cannot observe private competitor plans or replace direct market validation.",
  },
  Marketing: {
    role: "Evaluates customer urgency, reachable demand, adoption and route to market.",
    inputs: ["Customer type", "Market", "Problem", "Adoption assumptions"],
    outputs: ["Marketing score", "ICP signals", "Adoption risks", "Missing evidence"],
    evaluates: "Whether a reachable customer segment has a clear reason to adopt and pay.",
    limitations: "Synthetic demand is not proof of willingness to pay or efficient acquisition.",
  },
};

export const MODEL_GUIDES = {
  MCDA: {
    shows: "How visible criteria and weights contribute to one comparative score.",
    matters: "It makes prioritization assumptions inspectable instead of hiding them in a single number.",
  },
  "Monte Carlo": {
    shows: "Hundreds or thousands of possible outcomes under editable uncertainty.",
    matters: "It quantifies a distribution of outcomes instead of relying on one estimate.",
  },
  Sensitivity: {
    shows: "How ranking changes when agent importance, criteria or tolerances change.",
    matters: "It reveals which conclusions are robust and which depend heavily on assumptions.",
  },
  "Bayesian Update": {
    shows: "How prior confidence changes after a new piece of evidence.",
    matters: "It makes learning explicit and separates initial belief from updated confidence.",
  },
  Scenarios: {
    shows: "Downside, base and upside results under different operating assumptions.",
    matters: "It exposes asymmetric outcomes and prevents one forecast from appearing certain.",
  },
  "Risk Matrix": {
    shows: "Risk probability, impact, uncertainty and proposed mitigation.",
    matters: "It helps distinguish manageable exposure from risks that require more evidence or a stop condition.",
  },
  Pareto: {
    shows: "Opportunities that remain competitive across two objectives without collapsing every trade-off.",
    matters: "It preserves strong alternatives that a single weighted score could hide.",
  },
} as const;

export const METRIC_HELP = {
  generated: "Number of synthetic opportunities in this reduced public run.",
  score: "Comparative priority under the current public weights. It is not a probability of success.",
  evidence: "Quality and quantity of information supporting the current evaluation.",
  risk: "Visible downside exposure from probability, impact and uncertainty. Lower is generally preferable.",
  uncertainty: "How much the conclusion could change when assumptions or evidence change.",
  disagreement: "Variation between the four specialist evaluations. Higher values deserve inspection.",
  pending: "Opportunities that still require a human review state.",
  confidence: "Confidence of the evaluation given the available information and public assumptions.",
  sensitivity: "Degree to which ranking changes when assumptions or weights change.",
} as const;
