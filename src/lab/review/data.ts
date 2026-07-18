import type { LabRun, Opportunity } from "../types";
import type { ReviewAuditEntry, ReviewOpportunity, ReviewState } from "./types";

const DEMO_NOW = "2026-07-18T13:30:00.000Z";
const ALL_AGENTS = ["Mathematics", "Finance", "Strategy", "Marketing"] as const;

function audit(
  id: string,
  decision: ReviewAuditEntry["decision"],
  previousState: ReviewState,
  newState: ReviewState,
  responsible: string,
  comment: string,
  hoursAgo: number,
): ReviewAuditEntry {
  return {
    id,
    decision,
    responsible,
    timestamp: new Date(Date.parse(DEMO_NOW) - hoursAgo * 3_600_000).toISOString(),
    comment,
    justification: "Human assessment based on the evidence and uncertainty visible in this review environment.",
    previousState,
    newState,
    opportunityVersion: "review-v1",
  };
}

const samples: ReviewOpportunity[] = [
  {
    id: "hrb-adaptive-grid", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-17T09:10:00.000Z",
    name: "Adaptive Grid Orchestrator", industry: "Climate infrastructure", description: "Decision software for coordinating flexible industrial energy demand against grid constraints.",
    problem: "Industrial operators lack a clear way to shift flexible loads without increasing operational risk.", solution: "A constraint-aware planning layer that recommends auditable demand-shifting windows for human approval.",
    score: 86, risk: 44, marketPotential: 91, confidence: 78, horizon: "24-36 months", state: "Prioritized", agents: [...ALL_AGENTS],
    evidence: ["Three public grid-flexibility programs", "Synthetic unit economics benchmark", "Operator interview assumptions, unverified"],
    hypotheses: ["Plants can shift at least 8% of non-critical load", "Savings exceed integration and change-management cost"], mathematicalEvaluation: "MCDA 86/100. Downside scenario remains positive only above 6% controllable load. Sensitivity is highest to integration time.",
    risks: ["Long enterprise integration cycles", "Operational liability if recommendations are misunderstood"], uncertainties: ["Actual willingness to delegate scheduling", "Regional tariff variability"],
    recommendation: "Prioritize a narrow validation sprint with one industrial load profile. No deployment recommendation is made.",
    proArguments: ["Clear economic buyer", "Measurable value hypothesis", "Growing grid congestion"], contraArguments: ["Integration-heavy motion", "Benefits vary materially by tariff"], redTeam: ["The product may be a consulting workflow disguised as software", "Savings claims need interval-meter evidence"],
    owner: "Maya Chen", tags: ["climate", "enterprise"], priority: "High", nextReview: "2026-07-25", audit: [audit("a-1", "Prioritize", "Pending", "Prioritized", "Maya Chen", "Strong validation candidate; keep scope to decision support.", 27)],
  },
  {
    id: "hrb-clinical-capacity", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-16T14:40:00.000Z",
    name: "Clinical Capacity Navigator", industry: "Healthcare operations", description: "Scenario planning for outpatient capacity, staffing and referral bottlenecks.",
    problem: "Clinic managers make capacity decisions from fragmented schedules and delayed utilization data.", solution: "A human-controlled scenario workspace comparing staffing and appointment templates.",
    score: 79, risk: 63, marketPotential: 82, confidence: 69, horizon: "18-30 months", state: "Investigating", agents: [...ALL_AGENTS],
    evidence: ["Public wait-time datasets", "Two simulated clinic schedules", "Workflow assumptions require validation"], hypotheses: ["Managers will use weekly scenarios", "Scheduling exports can be normalized without patient data"],
    mathematicalEvaluation: "Scenario spread is 31 points. Expected utilization improvement is sensitive to no-show assumptions and should not be treated as a forecast.", risks: ["Health-data governance", "Procurement and workflow adoption"], uncertainties: ["Data availability by provider", "Decision ownership across clinical teams"],
    recommendation: "Investigate with privacy-preserving workflow interviews before any prototype integration.", proArguments: ["Persistent operational pain", "Decision-support framing limits automation risk"], contraArguments: ["Fragmented buying process", "High implementation variance"], redTeam: ["Avoid implying clinical recommendations", "The ROI case may collapse without reliable scheduling data"],
    owner: "Elena Ruiz", tags: ["health", "operations"], priority: "High", nextReview: "2026-07-23", audit: [audit("a-2", "Investigate", "Pending", "Investigating", "Elena Ruiz", "Needs privacy and workflow evidence before prioritization.", 52)],
  },
  {
    id: "hrb-regenerative-sourcing", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-15T11:20:00.000Z",
    name: "Regenerative Sourcing Ledger", industry: "Food systems", description: "Evidence workspace for traceable regenerative sourcing claims across small supplier networks.",
    problem: "Buyers cannot compare supplier claims consistently without expensive bespoke audits.", solution: "Structured evidence collection and confidence scoring with explicit human sign-off.",
    score: 74, risk: 57, marketPotential: 77, confidence: 64, horizon: "30-48 months", state: "Reformulation", agents: [...ALL_AGENTS],
    evidence: ["Public certification schemas", "Synthetic supplier cohort", "No verified buyer interviews"], hypotheses: ["Buyers pay for evidence quality", "Suppliers can maintain source records"], mathematicalEvaluation: "Evidence-quality penalty reduces the score from 82 to 74. Buyer willingness-to-pay is the dominant unknown.",
    risks: ["Claims liability", "Supplier onboarding burden"], uncertainties: ["Which standard becomes dominant", "Who funds verification"], recommendation: "Reformulate around buyer audit preparation rather than universal claims verification.",
    proArguments: ["Regulatory pressure is increasing", "Clear evidence provenance need"], contraArguments: ["Multi-sided adoption", "Standards remain fragmented"], redTeam: ["A ledger does not create trustworthy evidence", "The initial wedge is too broad"],
    owner: "Noah Williams", tags: ["food", "evidence"], priority: "Medium", nextReview: "2026-07-29", audit: [audit("a-3", "Reformulate", "Pending", "Reformulation", "Noah Williams", "Narrow the buyer and the evidence claim.", 73)],
  },
  {
    id: "hrb-circular-parts", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-18T08:30:00.000Z",
    name: "Circular Parts Exchange", industry: "Industrial marketplaces", description: "A verified secondary market concept for idle maintenance inventory.", problem: "Industrial firms hold expensive spare parts that remain unused while peers face shortages.", solution: "A market network with compatibility evidence and human-approved transactions.",
    score: 81, risk: 58, marketPotential: 88, confidence: 71, horizon: "24-42 months", state: "Pending", agents: [...ALL_AGENTS], evidence: ["Public inventory benchmarks", "Synthetic market liquidity model"],
    hypotheses: ["Inventory owners can share normalized part metadata", "Trust services unlock cross-company transactions"], mathematicalEvaluation: "Potential is high, but simulated liquidity falls sharply below 18 active suppliers per category.", risks: ["Cold-start liquidity", "Warranty and provenance disputes"], uncertainties: ["Inventory data quality", "Buyer tolerance for secondary parts"],
    recommendation: "Human review should test one constrained category before assigning priority.", proArguments: ["Large trapped working capital", "Urgent buyer pain"], contraArguments: ["Marketplace cold start", "Complex liability"], redTeam: ["A broker may solve the problem more efficiently", "Compatibility errors could erase trust"],
    owner: "Unassigned", tags: ["industry", "marketplace"], priority: "Medium", nextReview: "", audit: [],
  },
  {
    id: "hrb-water-risk", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-14T10:00:00.000Z",
    name: "Supplier Water Risk Map", industry: "Supply chain", description: "Portfolio-level water exposure screening for procurement teams.", problem: "Procurement teams lack comparable water-risk evidence across tier-two suppliers.", solution: "A source-linked screening workflow with confidence ranges and escalation queues.",
    score: 83, risk: 49, marketPotential: 84, confidence: 75, horizon: "18-30 months", state: "Investigating", agents: [...ALL_AGENTS], evidence: ["Public basin stress indices", "Corporate disclosure samples", "Synthetic supplier mapping"], hypotheses: ["Procurement owns a recurring review process", "Public data is sufficient for initial screening"],
    mathematicalEvaluation: "Bayesian confidence improves from 0.52 to 0.75 with corroborated basin and facility evidence; supplier location remains a major error source.", risks: ["False precision in geospatial matching", "Low supplier disclosure quality"], uncertainties: ["Budget ownership", "Required update frequency"], recommendation: "Investigate buyer workflow and define a conservative evidence threshold.",
    proArguments: ["Regulatory and resilience drivers", "Public data supports a low-cost wedge"], contraArguments: ["Data matching is difficult", "Crowded ESG tooling category"], redTeam: ["Do not convert screening into a compliance claim", "Existing providers may bundle this feature"],
    owner: "Maya Chen", tags: ["supply-chain", "climate"], priority: "High", nextReview: "2026-07-24", audit: [audit("a-4", "Investigate", "Pending", "Investigating", "Maya Chen", "Validate procurement ownership and location quality.", 88)],
  },
  {
    id: "hrb-creator-finance", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-13T16:10:00.000Z",
    name: "Creator Revenue Underwriting", industry: "Financial services", description: "Revenue-based financing concept for independent digital creators.", problem: "Creators face volatile income and limited access to conventional credit.", solution: "An underwriting model using consented revenue history.",
    score: 67, risk: 82, marketPotential: 73, confidence: 51, horizon: "24-36 months", state: "Rejected", agents: [...ALL_AGENTS], evidence: ["Public creator economy estimates", "Synthetic default model", "No regulated underwriting review"], hypotheses: ["Revenue history predicts repayment", "Acquisition costs remain below 12% of principal"],
    mathematicalEvaluation: "Loss probability exceeds the public demo threshold in the base case. Confidence is insufficient for a material recommendation.", risks: ["Credit regulation", "Adverse selection", "Collection practices"], uncertainties: ["Default behavior", "Licensing requirements"], recommendation: "Discard this formulation. No financial approval or lending action is supported.",
    proArguments: ["Visible financing gap"], contraArguments: ["Regulatory complexity", "Weak evidence", "Potential consumer harm"], redTeam: ["The proposed data may encode unstable income rather than creditworthiness", "Do not test with real lending"],
    owner: "Owen Brooks", tags: ["fintech", "high-risk"], priority: "Low", nextReview: "", audit: [audit("a-5", "Discard", "Pending", "Rejected", "Owen Brooks", "Risk and evidence quality are outside the review threshold.", 110)],
  },
  {
    id: "hrb-maintenance-knowledge", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-18T07:45:00.000Z",
    name: "Maintenance Knowledge Relay", industry: "Industrial software", description: "Structured capture of technician troubleshooting evidence for human-reviewed reuse.", problem: "Critical maintenance knowledge is trapped in informal conversations and retirement risk.", solution: "An evidence-linked case library that retrieves similar incidents without issuing operational commands.",
    score: 84, risk: 46, marketPotential: 86, confidence: 76, horizon: "12-24 months", state: "Pending", agents: [...ALL_AGENTS], evidence: ["Public workforce demographics", "Synthetic incident taxonomy", "Comparable knowledge-management products"], hypotheses: ["Technicians contribute concise case notes", "Review gates prevent unsafe reuse"],
    mathematicalEvaluation: "MCDA 84/100 with low capital sensitivity. Adoption is the dominant driver and remains unverified.", risks: ["Unsafe interpretation of historical fixes", "Low contribution rates"], uncertainties: ["Union and workforce acceptance", "Who reviews cases"], recommendation: "Consider prioritization only with explicit safety ownership and contribution evidence.",
    proArguments: ["Urgent demographic driver", "Narrow initial workflow"], contraArguments: ["Knowledge capture fatigue", "Safety governance burden"], redTeam: ["Retrieval can amplify outdated practices", "The system must never issue maintenance instructions"],
    owner: "Unassigned", tags: ["industry", "knowledge"], priority: "Medium", nextReview: "", audit: [],
  },
  {
    id: "hrb-local-procurement", version: "review-v1", source: "Simulated review sample", generatedAt: "2026-07-12T12:00:00.000Z",
    name: "Local Procurement Signals", industry: "Public sector", description: "Early demand-signal aggregation for small businesses evaluating public tenders.", problem: "Small suppliers discover relevant tenders too late to prepare credible bids.", solution: "A public-data signal board that highlights likely categories without promising awards.",
    score: 71, risk: 54, marketPotential: 69, confidence: 67, horizon: "12-20 months", state: "Reformulation", agents: [...ALL_AGENTS], evidence: ["Public procurement calendars", "Synthetic supplier cohort"], hypotheses: ["Earlier signals improve bid readiness", "SMBs pay for category monitoring"],
    mathematicalEvaluation: "Value depends more on workflow adoption than prediction accuracy. The original forecasting claim is not evidence-supported.", risks: ["Misleading forecast language", "Low willingness to pay"], uncertainties: ["Procurement data consistency", "Distribution channel"], recommendation: "Reformulate as monitoring and readiness support, not tender prediction.",
    proArguments: ["Accessible public inputs", "Low technical risk"], contraArguments: ["Weak monetization", "Many free alert tools"], redTeam: ["Prediction language creates false confidence", "Differentiation is not yet visible"],
    owner: "Elena Ruiz", tags: ["govtech", "signals"], priority: "Low", nextReview: "2026-08-02", audit: [audit("a-6", "Reformulate", "Pending", "Reformulation", "Elena Ruiz", "Remove forecasting claim and test readiness workflow.", 141)],
  },
];

function fromLabOpportunity(opportunity: Opportunity, run: LabRun): ReviewOpportunity {
  const risk = Math.round(opportunity.risks.reduce((sum, item) => sum + item.probability * item.impact / 100, 0) / Math.max(1, opportunity.risks.length));
  return {
    id: `run-${run.id}-${opportunity.id}`,
    version: run.modelVersion,
    source: "Lab run",
    generatedAt: run.createdAt,
    name: opportunity.name,
    industry: opportunity.industry,
    description: opportunity.proposedSolution,
    problem: opportunity.problem,
    solution: opportunity.proposedSolution,
    score: Math.round(opportunity.totalScore),
    risk,
    marketPotential: Math.round(opportunity.dimensions.marketPotential),
    confidence: Math.round(opportunity.confidence),
    horizon: `${run.input.horizonYears} year horizon`,
    state: "Pending",
    agents: [...ALL_AGENTS],
    evidence: opportunity.availableEvidence,
    hypotheses: opportunity.criticalHypotheses,
    mathematicalEvaluation: `Public Lab score ${Math.round(opportunity.totalScore)}/100 with ${Math.round(opportunity.confidence)}% confidence and ${Math.round(opportunity.uncertainty)}% uncertainty. Demonstrative model only.`,
    risks: opportunity.risks.map((item) => `${item.name}: ${item.evidence}`),
    uncertainties: Object.values(opportunity.agents).flatMap((agent) => agent.uncertainties).slice(0, 5),
    recommendation: Object.values(opportunity.agents).map((agent) => agent.recommendation).join(" "),
    proArguments: Object.values(opportunity.agents).flatMap((agent) => agent.findings).slice(0, 4),
    contraArguments: Object.values(opportunity.agents).flatMap((agent) => agent.risks).slice(0, 4),
    redTeam: Object.values(opportunity.agents).map((agent) => agent.criticism).filter(Boolean),
    owner: "Unassigned",
    tags: [opportunity.industry.toLowerCase()],
    priority: "Medium",
    nextReview: "",
    audit: [],
  };
}

export function buildReviewOpportunities(run: LabRun | null): ReviewOpportunity[] {
  return run ? run.opportunities.map((opportunity) => fromLabOpportunity(opportunity, run)) : samples;
}
