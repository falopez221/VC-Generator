import type { AgentName } from "./types.ts";
import { PUBLIC_MODEL_CATALOG, type PublicModelName } from "./model-catalog.ts";

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

export const MODEL_GUIDES = Object.fromEntries(PUBLIC_MODEL_CATALOG.map((model) => [
  model.name,
  { shows: model.shows, matters: model.matters },
])) as Record<PublicModelName, { shows: string; matters: string }>;

export const METRIC_HELP = {
  generated: "Count of synthetic opportunities created in this run. More opportunities broaden the comparison set; they do not improve its quality by themselves.",
  score: "Comparative priority on a 0–100 public scale under the current weights. Read it only against other opportunities in this run; it is not a probability of success.",
  evidence: "Support available for the current evaluation on a 0–100 public scale. Higher means the assumptions have more stated backing, not that they are proven.",
  risk: "Visible downside exposure on a 0–100 scale, combining probability, impact and uncertainty. Lower is generally preferable; open the matrix to inspect the causes.",
  uncertainty: "Instability of the conclusion on a 0–100 scale. Higher means reasonable changes in inputs or evidence could materially change the score or rank.",
  disagreement: "Spread between the four specialist scores. Higher means the agents see materially different strengths or weaknesses and human inspection matters more.",
  pending: "Count of opportunities without a recorded human review state. It measures review workload, not model quality.",
  confidence: "How supported the current evaluation is under the visible inputs and assumptions. It is conditional confidence, not certainty about the future.",
  sensitivity: "Degree to which ranking changes when public assumptions or weights change. Higher sensitivity means the prioritization is less robust.",
} as const;

export const METRIC_READ = {
  generated: "Use it to understand search breadth and expected review workload.",
  score: "Compare score together with evidence, risk and uncertainty; never use it alone.",
  evidence: "Low evidence should trigger a validation experiment even when score is high.",
  risk: "A high value asks for mitigation, more evidence or rejection—not automatic pessimism.",
  uncertainty: "High uncertainty means the ranking should be treated as provisional.",
  disagreement: "Open the agent inspector to locate the source of the disagreement.",
  pending: "Reduce it only through explicit human review; the system cannot approve an investment.",
} as const;
