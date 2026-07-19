import { AGENT_NAMES, type AgentName, type Opportunity } from "./types.ts";
import { clamp, hashString, round } from "./random.ts";
import { sanitizeText } from "./schema.ts";

export const MVP_MODEL_VERSION = "public-mvp-draft-1.0";

export interface MvpApproval {
  id: string;
  sourceRunId: string;
  sourceOpportunityId: string;
  reviewer: string;
  approvedAt: string;
  acknowledgement: "local-validation-only";
}

export interface MvpAgentHandoff {
  agentName: AgentName;
  receivesFrom: AgentName;
  passesTo: AgentName;
  contribution: string;
  decisionUse: string;
}

export interface MvpPrototypeScreen {
  id: string;
  name: string;
  purpose: string;
  primaryAction: string;
}

export interface MvpDraft {
  id: string;
  modelVersion: string;
  sourceRunId: string;
  sourceOpportunityId: string;
  opportunityName: string;
  targetCustomer: string;
  objective: string;
  valueProposition: string;
  successMetric: string;
  validationBudgetUsd: number;
  validationWindowDays: number;
  scope: string[];
  outOfScope: string[];
  assumptions: string[];
  risksToTest: string[];
  agentHandoffs: MvpAgentHandoff[];
  prototypeScreens: MvpPrototypeScreen[];
  disclosures: string[];
}

export interface MvpRecord {
  approval: MvpApproval;
  draft?: MvpDraft;
  generatedAt?: string;
}

const LIMITATIONS = [
  "Synthetic public planning artifact. It is not a deployed product, startup, funding decision or investment recommendation.",
  "The generated preview is a local static validation prototype. It has no sign-in, payments, external integrations, data ingestion or autonomous actions.",
  "All assumptions, targets and budget ranges require further human validation with appropriate specialists and real users.",
];

export const MVP_AGENT_HANDOFFS: MvpAgentHandoff[] = [
  {
    agentName: "Strategy",
    receivesFrom: "Marketing",
    passesTo: "Mathematics",
    contribution: "Defines the narrow user problem, first workflow and explicit non-goals.",
    decisionUse: "Prevents the draft from expanding into a complete startup plan.",
  },
  {
    agentName: "Mathematics",
    receivesFrom: "Strategy",
    passesTo: "Finance",
    contribution: "Turns the workflow into an observable success threshold and bounded uncertainty checks.",
    decisionUse: "Makes the validation signal measurable rather than persuasive.",
  },
  {
    agentName: "Finance",
    receivesFrom: "Mathematics",
    passesTo: "Marketing",
    contribution: "Bounds the validation budget, effort and downside exposure for the proposed test.",
    decisionUse: "Keeps the draft proportionate to early evidence.",
  },
  {
    agentName: "Marketing",
    receivesFrom: "Finance",
    passesTo: "Strategy",
    contribution: "Frames the test invitation, customer promise and adoption signal to observe.",
    decisionUse: "Returns a real-world demand question to the product scope.",
  },
];

function stableId(value: string) {
  return hashString(value).toString(36);
}

function toTitle(value: string) {
  return sanitizeText(value, "Validation workspace", 90) || "Validation workspace";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function createMvpApproval(input: {
  sourceRunId: string;
  sourceOpportunityId: string;
  reviewer: string;
  acknowledgement: boolean;
  approvedAt?: string;
}): MvpApproval {
  const sourceRunId = sanitizeText(input.sourceRunId, "", 180);
  const sourceOpportunityId = sanitizeText(input.sourceOpportunityId, "", 180);
  const reviewer = sanitizeText(input.reviewer, "", 80);
  if (!sourceRunId || !sourceOpportunityId || reviewer.length < 2 || !input.acknowledgement) {
    throw new Error("A named reviewer and the local-validation acknowledgement are required before an MVP draft can be generated.");
  }
  const approvedAt = input.approvedAt && Number.isFinite(Date.parse(input.approvedAt)) ? new Date(input.approvedAt).toISOString() : new Date().toISOString();
  return {
    id: `approval-${stableId(`${sourceRunId}:${sourceOpportunityId}:${reviewer}:${approvedAt}`)}`,
    sourceRunId,
    sourceOpportunityId,
    reviewer,
    approvedAt,
    acknowledgement: "local-validation-only",
  };
}

export function isApprovalForOpportunity(approval: MvpApproval | null | undefined, sourceRunId: string, sourceOpportunityId: string) {
  return Boolean(
    approval
      && approval.acknowledgement === "local-validation-only"
      && approval.sourceRunId === sourceRunId
      && approval.sourceOpportunityId === sourceOpportunityId
      && approval.reviewer.trim().length >= 2,
  );
}

export function generateMvpDraft(opportunity: Opportunity, approval: MvpApproval): MvpDraft {
  if (!isApprovalForOpportunity(approval, approval.sourceRunId, opportunity.id)) {
    throw new Error("Human approval for this exact opportunity is required before generating an MVP draft.");
  }

  const evidence = clamp(opportunity.dimensions.evidenceQuality);
  const risk = clamp(opportunity.dimensions.risk);
  const uncertainty = clamp(opportunity.uncertainty);
  const validationBudgetUsd = Math.round(clamp(opportunity.estimatedCapital * (risk > 65 ? 0.02 : 0.035), 15_000, 120_000) / 1_000) * 1_000;
  const validationWindowDays = Math.round(clamp(14 + uncertainty * 0.28, 14, 42));
  const interviewTarget = Math.round(clamp(5 + (100 - evidence) / 15, 5, 12));
  const activationTarget = Math.round(clamp(20 + evidence * 0.35 - risk * 0.12, 20, 55));
  const highestRisk = [...opportunity.risks].sort((left, right) => right.probability * right.impact - left.probability * left.impact)[0];
  const name = toTitle(opportunity.name);
  const customer = toTitle(opportunity.targetCustomer);
  const objective = `Validate whether ${customer} will complete one bounded ${toTitle(opportunity.industry).toLowerCase()} workflow using ${name}.`;
  const valueProposition = `${name} gives ${customer} a traceable first-step workflow for ${sanitizeText(opportunity.problem, "the stated problem", 260).toLowerCase()}`;

  return {
    id: `mvp-${stableId(`${MVP_MODEL_VERSION}:${approval.sourceRunId}:${opportunity.id}:${opportunity.totalScore}`)}`,
    modelVersion: MVP_MODEL_VERSION,
    sourceRunId: approval.sourceRunId,
    sourceOpportunityId: opportunity.id,
    opportunityName: name,
    targetCustomer: customer,
    objective,
    valueProposition,
    successMetric: `Observe ${interviewTarget} qualified conversations and at least ${activationTarget}% completion of the single prototype workflow before changing scope.`,
    validationBudgetUsd,
    validationWindowDays,
    scope: [
      "One customer-facing intake and qualification flow.",
      "One guided workspace that makes the proposed value visible.",
      "One human review checkpoint that records a decision and next evidence request.",
    ],
    outOfScope: [
      "No production deployment, payments, identity system or external integrations.",
      "No customer data ingestion, automated decisions, legal commitments or autonomous execution.",
      "No claim of validated product-market fit, investment approval or company formation.",
    ],
    assumptions: [
      `The target user is ${customer}.`,
      `A ${validationWindowDays}-day window is enough to observe an initial behavioral signal.`,
      `A bounded validation budget of ${formatUsd(validationBudgetUsd)} is proportionate to the current public evidence state.`,
    ],
    risksToTest: [
      highestRisk ? `${highestRisk.name}: ${highestRisk.mitigation}` : "Demand, usability and implementation risk remain unverified.",
      `Evidence quality is ${round(evidence, 0)}/100 and uncertainty is ${round(uncertainty, 0)}/100; do not generalize early observations.`,
      "The static preview demonstrates a workflow only. It cannot prove technical feasibility, demand or unit economics.",
    ],
    agentHandoffs: MVP_AGENT_HANDOFFS.map((handoff) => ({ ...handoff })),
    prototypeScreens: [
      { id: "intake", name: "Problem qualifier", purpose: `Let ${customer} state the constrained problem in a single, comparable format.`, primaryAction: "Define validation case" },
      { id: "workspace", name: "Guided value workflow", purpose: "Show the smallest useful sequence and make the key output inspectable.", primaryAction: "Review proposed output" },
      { id: "review", name: "Human checkpoint", purpose: "Record the observed signal, caveat and next test without automating a decision.", primaryAction: "Record review" },
    ],
    disclosures: [...LIMITATIONS],
  };
}

export function buildMvpPrototypeHtml(draft: MvpDraft) {
  const title = escapeHtml(draft.opportunityName);
  const customer = escapeHtml(draft.targetCustomer);
  const value = escapeHtml(draft.valueProposition);
  const metric = escapeHtml(draft.successMetric);
  const screens = draft.prototypeScreens.map((screen, index) => `<article><span>0${index + 1}</span><h3>${escapeHtml(screen.name)}</h3><p>${escapeHtml(screen.purpose)}</p><button type="button" disabled>${escapeHtml(screen.primaryAction)}</button></article>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — validation prototype</title><style>body{margin:0;background:#061526;color:#e8f2f7;font:15px/1.5 Arial,sans-serif}.shell{max-width:920px;margin:auto;padding:30px}.eyebrow{color:#53d8ee;font-size:11px;font-weight:700;letter-spacing:.14em}.hero{padding:34px;border:1px solid #275172;background:linear-gradient(135deg,#0a2947,#071629)}h1{max-width:620px;margin:14px 0;font-size:clamp(30px,6vw,58px);line-height:.95}p{color:#b8cbd7}.metric{margin-top:22px;padding:14px;border-left:3px solid #e3ae59;background:#112b41}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}article{padding:18px;border:1px solid #294b65;background:#081b2e}article span{color:#53d8ee;font-size:11px;font-weight:700}h3{margin:24px 0 8px;font-size:18px}button{width:100%;margin-top:12px;padding:10px;color:#94aab9;background:#0d2437;border:1px solid #3b5a70;border-radius:4px}footer{margin-top:18px;color:#86a0b0;font-size:12px}@media(max-width:640px){.grid{grid-template-columns:1fr}.shell{padding:15px}}</style></head><body><main class="shell"><section class="hero"><div class="eyebrow">LOCAL STATIC VALIDATION PROTOTYPE</div><h1>${title}</h1><p>${value}</p><div class="metric"><strong>Signal to observe</strong><br>${metric}</div></section><section class="grid" aria-label="Prototype screens">${screens}</section><footer>For ${customer}. This preview is non-operational: no login, data, payment, integration or autonomous action.</footer></main></body></html>`;
}

export function buildMvpBriefMarkdown(draft: MvpDraft, approval: MvpApproval) {
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
  return `# ${draft.opportunityName} — MVP validation brief\n\n## Human gate\n\n- Approved by: ${approval.reviewer}\n- Approved at: ${approval.approvedAt}\n- Permission: local validation draft only\n\n## Objective\n\n${draft.objective}\n\n## Value proposition\n\n${draft.valueProposition}\n\n## Signal to observe\n\n${draft.successMetric}\n\n## Validation constraints\n\n- Window: ${draft.validationWindowDays} days\n- Illustrative budget cap: ${formatUsd(draft.validationBudgetUsd)}\n\n## In scope\n\n${list(draft.scope)}\n\n## Explicitly out of scope\n\n${list(draft.outOfScope)}\n\n## Connected public-agent handoffs\n\n${draft.agentHandoffs.map((handoff) => `- ${handoff.agentName} receives from ${handoff.receivesFrom}, passes to ${handoff.passesTo}: ${handoff.contribution}`).join("\n")}\n\n## Risks to test\n\n${list(draft.risksToTest)}\n\n## Limitations\n\n${list(draft.disclosures)}\n`;
}

export function hasOnlyPublicMvpAgents(draft: MvpDraft) {
  return draft.agentHandoffs.length === AGENT_NAMES.length
    && draft.agentHandoffs.every((handoff) => AGENT_NAMES.includes(handoff.agentName) && AGENT_NAMES.includes(handoff.receivesFrom) && AGENT_NAMES.includes(handoff.passesTo));
}
