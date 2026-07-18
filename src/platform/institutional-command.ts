export type InstitutionalAppId = "opportunities" | "portfolio" | "research" | "scenarios" | "review";

export type InstitutionalMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "ready" | "watch" | "limited";
};

export type InstitutionalApp = {
  id: InstitutionalAppId;
  code: string;
  name: string;
  category: string;
  description: string;
  question: string;
  route: string;
  status: string;
  metrics: InstitutionalMetric[];
};

export type InstitutionalOpportunity = {
  id: string;
  name: string;
  sector: string;
  score: number;
  evidence: number;
  uncertainty: number;
  classification: "Promising" | "Investigate" | "Evidence needed";
  rationale: string;
};

export type InstitutionalAgentContribution = {
  name: "Mathematics" | "Finance" | "Strategy" | "Marketing";
  contribution: string;
};

export type InstitutionalAnalysis = {
  prompt: string;
  seed: number;
  sector: string;
  summary: string;
  agents: InstitutionalAgentContribution[];
  opportunities: InstitutionalOpportunity[];
};

export const INSTITUTIONAL_APPS: InstitutionalApp[] = [
  { id: "opportunities", code: "OI", name: "Opportunity Intelligence", category: "DISCOVERY", description: "Convert a decision question into bounded, comparable opportunity hypotheses.", question: "Where could institutional capacity create defensible value?", route: "/app/applications", status: "READY · SYNTHETIC", metrics: [
    { label: "VISIBLE CONFIGURATIONS", value: "150", detail: "Public bilingual catalogue", tone: "ready" },
    { label: "CROSS-DOMAIN MISSIONS", value: "25", detail: "Deterministic configurations", tone: "ready" },
    { label: "EVIDENCE GAPS", value: "11", detail: "Synthetic open requests", tone: "watch" },
    { label: "AUTONOMOUS ACTION", value: "0", detail: "Human gate required", tone: "limited" },
  ] },
  { id: "portfolio", code: "PI", name: "Portfolio Intelligence", category: "CAPITAL", description: "Compare exposure, concentration and staged commitments without authorizing capital deployment.", question: "Which portfolio trade-offs remain robust under adverse conditions?", route: "/app/portfolio", status: "MODELING · DEMO", metrics: [
    { label: "PORTFOLIO CASES", value: "04", detail: "Synthetic mission fixtures", tone: "ready" },
    { label: "CONCENTRATION FLAGS", value: "03", detail: "Need human interpretation", tone: "watch" },
    { label: "MODEL COVERAGE", value: "12/12", detail: "Documented public models", tone: "ready" },
    { label: "LIVE CAPITAL", value: "$0", detail: "No account connection", tone: "limited" },
  ] },
  { id: "research", code: "RI", name: "Research Intelligence", category: "EVIDENCE", description: "Separate observed evidence, assumptions, inference and unresolved contradictions.", question: "What would we need to know before this decision becomes reviewable?", route: "/app/research", status: "TRACEABLE · BOUNDED", metrics: [
    { label: "SOURCE CLASSES", value: "04", detail: "Evidence · estimate · inference · synthetic", tone: "ready" },
    { label: "OPEN REQUESTS", value: "11", detail: "Synthetic evidence queue", tone: "watch" },
    { label: "CONTRADICTIONS", value: "04", detail: "Awaiting disposition", tone: "watch" },
    { label: "PRIVATE DATASETS", value: "0", detail: "Not embedded", tone: "limited" },
  ] },
  { id: "scenarios", code: "SI", name: "Scenario Intelligence", category: "MODELING", description: "Stress a proposal with visible assumptions, seeded simulations and sensitivity ranges.", question: "Which assumptions dominate the decision and where does it break?", route: "/app/scenarios", status: "DETERMINISTIC · READY", metrics: [
    { label: "SCENARIO STATES", value: "03", detail: "Base · upside · adverse", tone: "ready" },
    { label: "REPRODUCIBLE SEED", value: "YES", detail: "Identical input, identical run", tone: "ready" },
    { label: "LIVE PROCESSES", value: "00", detail: "Runs only on request", tone: "limited" },
    { label: "ASSUMPTIONS OPEN", value: "07", detail: "Require validation", tone: "watch" },
  ] },
  { id: "review", code: "HR", name: "Human Review", category: "GOVERNANCE", description: "Inspect evidence, objections and conditions before a named person records judgment.", question: "Is the package strong enough for accountable human review?", route: "/app/human-review", status: "HUMAN GATE · REQUIRED", metrics: [
    { label: "PENDING GATES", value: "03", detail: "Synthetic review queue", tone: "watch" },
    { label: "OPEN OBJECTIONS", value: "04", detail: "No silent resolution", tone: "watch" },
    { label: "NAMED AUTHORITY", value: "100%", detail: "Required for material decisions", tone: "ready" },
    { label: "MODEL APPROVALS", value: "0", detail: "Models cannot approve", tone: "limited" },
  ] },
];

const SECTOR_RULES = [
  { pattern: /energy|energ[ií]a|climate|clima|carbon|grid|red el[eé]ctrica/iu, sector: "Energy & Climate", nouns: ["Grid Flexibility", "Industrial Heat", "Carbon Evidence", "Storage Reliability"] },
  { pattern: /health|salud|clinic|hospital|biotech|paciente/iu, sector: "Health & Life Sciences", nouns: ["Clinical Capacity", "Preventive Access", "Research Operations", "Care Navigation"] },
  { pattern: /ai|inteligencia artificial|software|data|datos|automation|automatizaci[oó]n/iu, sector: "Technology & AI", nouns: ["Decision Copilot", "Data Assurance", "Workflow Intelligence", "Model Governance"] },
  { pattern: /finance|finanzas|capital|portfolio|portafolio|investment|inversi[oó]n/iu, sector: "Capital & Finance", nouns: ["Liquidity Intelligence", "Risk Translation", "Capital Staging", "Portfolio Evidence"] },
  { pattern: /industry|industria|manufactur|factory|f[aá]brica|logistics|log[ií]stica/iu, sector: "Industry & Infrastructure", nouns: ["Maintenance Reliability", "Supplier Resilience", "Asset Efficiency", "Industrial Evidence"] },
] as const;

const DEFAULT_SECTOR = { sector: "Cross-domain", nouns: ["Decision Infrastructure", "Evidence Exchange", "Capability Network", "Resilience Platform"] } as const;
const OPPORTUNITY_ENDINGS = ["Network", "Observatory", "Exchange", "Control Layer", "Studio", "Operating System", "Navigator", "Workbench"] as const;

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function analyzeInstitutionalPrompt(rawPrompt: string): InstitutionalAnalysis | null {
  const prompt = rawPrompt.replace(/[<>]/gu, " ").replace(/\s+/gu, " ").trim().slice(0, 1200);
  if (prompt.length < 12) return null;
  const seed = hashText(prompt.toLocaleLowerCase());
  const rule = SECTOR_RULES.find((candidate) => candidate.pattern.test(prompt)) ?? DEFAULT_SECTOR;
  const opportunities = Array.from({ length: 6 }, (_, index): InstitutionalOpportunity => {
    const local = hashText(`${prompt}|${index}|${seed}`);
    const score = clamp(58 + (local % 31), 0, 100);
    const evidence = clamp(42 + ((local >>> 6) % 45), 0, 100);
    const uncertainty = clamp(20 + ((local >>> 12) % 50), 0, 100);
    const classification = score >= 78 && evidence >= 68 && uncertainty <= 42 ? "Promising" : score >= 65 && evidence >= 52 ? "Investigate" : "Evidence needed";
    const noun = rule.nouns[(seed + index) % rule.nouns.length];
    const ending = OPPORTUNITY_ENDINGS[(local + index) % OPPORTUNITY_ENDINGS.length];
    return {
      id: `OP-${String(index + 1).padStart(2, "0")}`,
      name: `${noun} ${ending}`,
      sector: rule.sector,
      score,
      evidence,
      uncertainty,
      classification,
      rationale: classification === "Promising" ? "Strong relative fit under the visible demo thresholds; primary validation is still required." : classification === "Investigate" ? "Potential fit with material evidence or uncertainty gaps to resolve." : "The question exposes a possible need, but current support is too weak for prioritization.",
    };
  }).sort((left, right) => right.score - left.score || right.evidence - left.evidence);

  return {
    prompt,
    seed,
    sector: rule.sector,
    summary: `Six synthetic opportunities were generated for ${rule.sector}. Ranking combines visible fit, evidence and uncertainty gates; it is not an approval or financial recommendation.`,
    agents: [
      { name: "Mathematics", contribution: "Tests robustness, bounded scores and uncertainty sensitivity." },
      { name: "Finance", contribution: "Frames capital exposure, unit economics and downside questions." },
      { name: "Strategy", contribution: "Compares timing, differentiation and institutional fit." },
      { name: "Marketing", contribution: "Examines adoption, accessible demand and validation paths." },
    ],
    opportunities,
  };
}
