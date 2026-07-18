import { clampFinite, createSeededRandom, percentile, round } from "../demo-models/math.ts";
import { COST_CATEGORIES, type CapabilityGap, type CostCategory, type DeliveryOption, type FeasibilityInput, type FeasibilityResult, type FeasibilityTask, type ReadinessComponent } from "./types.ts";

type TaskTemplate = Omit<FeasibilityTask, "expectedWeeks" | "critical" | "earliestStartWeek" | "earliestFinishWeek" | "latestStartWeek" | "floatWeeks" | "sourcing">;

const TASKS: TaskTemplate[] = [
  { id: "DSC-01", phase: "1. Discovery", title: "Confirm scope and decision boundary", owner: "Program lead", dependencies: [], deliverable: "Approved scope brief", acceptance: "Owner, exclusions, evidence classes and success metrics named", optimisticWeeks: 1, likelyWeeks: 2, pessimisticWeeks: 4, resource: "Program", costCategory: "Consulting", baseCost: 18000, reworkProbability: .08 },
  { id: "DSC-02", phase: "1. Discovery", title: "Map users and operating process", owner: "Product lead", dependencies: ["DSC-01"], deliverable: "Service blueprint", acceptance: "Primary workflows and human gates reviewed by users", optimisticWeeks: 1, likelyWeeks: 2, pessimisticWeeks: 3, resource: "Product", costCategory: "Personnel", baseCost: 22000, reworkProbability: .1 },
  { id: "ARC-01", phase: "2. Architecture", title: "Define target architecture", owner: "Solution architect", dependencies: ["DSC-01"], deliverable: "Architecture decision record", acceptance: "Boundaries, interfaces, failure modes and owners documented", optimisticWeeks: 2, likelyWeeks: 3, pessimisticWeeks: 6, resource: "Architecture", costCategory: "Development", baseCost: 42000, reworkProbability: .14 },
  { id: "DAT-01", phase: "3. Data and integrations", title: "Profile data and provenance", owner: "Data lead", dependencies: ["DSC-02"], deliverable: "Data readiness report", acceptance: "Sources, quality, rights and gaps are explicit", optimisticWeeks: 2, likelyWeeks: 4, pessimisticWeeks: 8, resource: "Data", costCategory: "Data", baseCost: 52000, reworkProbability: .18 },
  { id: "DAT-02", phase: "3. Data and integrations", title: "Build governed integration layer", owner: "Integration lead", dependencies: ["ARC-01", "DAT-01"], deliverable: "Tested integration contracts", acceptance: "Timeouts, validation, lineage and safe fallbacks pass", optimisticWeeks: 3, likelyWeeks: 6, pessimisticWeeks: 12, resource: "Data", costCategory: "APIs and models", baseCost: 76000, reworkProbability: .22 },
  { id: "MVP-01", phase: "4. MVP development", title: "Implement core workflow", owner: "Engineering lead", dependencies: ["ARC-01", "DSC-02"], deliverable: "End-to-end MVP", acceptance: "Happy path and bounded failure paths demonstrated", optimisticWeeks: 4, likelyWeeks: 7, pessimisticWeeks: 13, resource: "Engineering", costCategory: "Development", baseCost: 112000, reworkProbability: .2 },
  { id: "MVP-02", phase: "4. MVP development", title: "Implement governance and audit controls", owner: "Governance lead", dependencies: ["MVP-01", "DAT-02"], deliverable: "Review and audit controls", acceptance: "Named authority, dissent and traceability are testable", optimisticWeeks: 2, likelyWeeks: 4, pessimisticWeeks: 8, resource: "Engineering", costCategory: "Development", baseCost: 61000, reworkProbability: .16 },
  { id: "VAL-01", phase: "5. Validation", title: "Validate models and acceptance metrics", owner: "Model validation lead", dependencies: ["MVP-01", "DAT-02"], deliverable: "Validation report", acceptance: "Assumptions, reproducibility and failure thresholds signed off", optimisticWeeks: 2, likelyWeeks: 4, pessimisticWeeks: 7, resource: "Validation", costCategory: "Personnel", baseCost: 48000, reworkProbability: .16 },
  { id: "SEC-01", phase: "6. Security and compliance", title: "Threat model and security testing", owner: "Security lead", dependencies: ["ARC-01", "MVP-02"], deliverable: "Security assessment", acceptance: "Critical findings closed or explicitly accepted", optimisticWeeks: 2, likelyWeeks: 4, pessimisticWeeks: 9, resource: "Security", costCategory: "Cybersecurity", baseCost: 57000, reworkProbability: .15 },
  { id: "CMP-01", phase: "6. Security and compliance", title: "Complete regulatory and policy review", owner: "Compliance lead", dependencies: ["DSC-01", "DAT-01"], deliverable: "Compliance decision record", acceptance: "Obligations, controls and accountable reviewer recorded", optimisticWeeks: 2, likelyWeeks: 5, pessimisticWeeks: 13, resource: "Compliance", costCategory: "Compliance", baseCost: 46000, reworkProbability: .19 },
  { id: "PIL-01", phase: "7. Pilot", title: "Prepare pilot environment and cohort", owner: "Program lead", dependencies: ["MVP-02", "VAL-01", "SEC-01", "CMP-01"], deliverable: "Pilot readiness package", acceptance: "Cohort, rollback, support and measures approved", optimisticWeeks: 2, likelyWeeks: 3, pessimisticWeeks: 6, resource: "Program", costCategory: "Infrastructure", baseCost: 39000, reworkProbability: .1 },
  { id: "PIL-02", phase: "7. Pilot", title: "Run measured pilot", owner: "Adoption lead", dependencies: ["PIL-01"], deliverable: "Pilot evidence pack", acceptance: "Quality, adoption, safety and operating measures collected", optimisticWeeks: 4, likelyWeeks: 6, pessimisticWeeks: 10, resource: "Adoption", costCategory: "Training", baseCost: 44000, reworkProbability: .15 },
  { id: "DEP-01", phase: "8. Deployment", title: "Production hardening and cutover", owner: "Platform lead", dependencies: ["PIL-02"], deliverable: "Production release", acceptance: "SLOs, rollback, access controls and support accepted", optimisticWeeks: 2, likelyWeeks: 4, pessimisticWeeks: 8, resource: "Engineering", costCategory: "Infrastructure", baseCost: 69000, reworkProbability: .13 },
  { id: "OPS-01", phase: "9. Operations and monitoring", title: "Establish monitoring and support", owner: "Service owner", dependencies: ["PIL-01", "DEP-01"], deliverable: "Operating model", acceptance: "SLOs, incident paths, ownership and review cadence active", optimisticWeeks: 2, likelyWeeks: 3, pessimisticWeeks: 5, resource: "Operations", costCategory: "Support", baseCost: 38000, reworkProbability: .08 },
  { id: "LRN-01", phase: "10. Estimate learning", title: "Baseline estimated versus actual", owner: "Portfolio analyst", dependencies: ["OPS-01"], deliverable: "Estimation baseline", acceptance: "Cost, duration, risk and productivity variances are comparable", optimisticWeeks: 1, likelyWeeks: 2, pessimisticWeeks: 4, resource: "Program", costCategory: "Maintenance", baseCost: 19000, reworkProbability: .05 },
];

const STRATEGY = {
  internal: { duration: 1.18, cost: .92, internalShare: .84 },
  vendor: { duration: .78, cost: 1.32, internalShare: .28 },
  hybrid: { duration: .92, cost: 1.04, internalShare: .58 },
} as const;

function safeInput(input: FeasibilityInput): FeasibilityInput {
  const score = (value: number) => clampFinite(value, 0, 100);
  return {
    ...input,
    proposalName: input.proposalName.trim().slice(0, 80) || "Untitled implementation",
    proposalSummary: input.proposalSummary.trim().slice(0, 1200),
    complexity: score(input.complexity), dataReadiness: score(input.dataReadiness), internalCapacity: score(input.internalCapacity),
    regulatoryIntensity: score(input.regulatoryIntensity), securityReadiness: score(input.securityReadiness), adoptionReadiness: score(input.adoptionReadiness), budgetReadiness: score(input.budgetReadiness),
    users: Math.round(clampFinite(input.users, 1, 1_000_000)), annualMissions: Math.round(clampFinite(input.annualMissions, 1, 100_000)),
    annualSimulations: Math.round(clampFinite(input.annualSimulations, 1, 10_000_000)), annualAgentRuns: Math.round(clampFinite(input.annualAgentRuns, 1, 100_000_000)),
    samples: Math.round(clampFinite(input.samples, 500, 20_000)), seed: Math.round(clampFinite(input.seed, 1, 2_147_483_646)),
  };
}

function taskModifier(input: FeasibilityInput, task: TaskTemplate) {
  const complexity = .72 + input.complexity / 180;
  const data = task.resource === "Data" ? 1 + (100 - input.dataReadiness) / 115 : 1;
  const regulation = ["Compliance", "Security"].includes(task.resource) ? 1 + input.regulatoryIntensity / 150 : 1;
  const security = task.resource === "Security" ? 1 + (100 - input.securityReadiness) / 180 : 1;
  const adoption = task.resource === "Adoption" ? 1 + (100 - input.adoptionReadiness) / 180 : 1;
  return complexity * data * regulation * security * adoption * STRATEGY[input.strategy].duration;
}

function triangular(random: () => number, minimum: number, mode: number, maximum: number) {
  const u = random();
  const split = (mode - minimum) / Math.max(.0001, maximum - minimum);
  return u < split
    ? minimum + Math.sqrt(u * (maximum - minimum) * (mode - minimum))
    : maximum - Math.sqrt((1 - u) * (maximum - minimum) * (maximum - mode));
}

function schedule(durations: Map<string, number>, input: FeasibilityInput) {
  const finish = new Map<string, number>();
  const starts = new Map<string, number>();
  const pools = new Map<string, number[]>();
  const slots = input.internalCapacity >= 70 ? 2 : 1;
  for (const task of TASKS) {
    const dependencyFinish = Math.max(0, ...task.dependencies.map((id) => finish.get(id) ?? 0));
    const external = input.strategy === "vendor" || (input.strategy === "hybrid" && ["Security", "Compliance", "Data"].includes(task.resource));
    const capacity = external ? 2 : slots;
    const pool = pools.get(task.resource) ?? Array.from({ length: capacity }, () => 0);
    const slot = pool.reduce((best, value, index) => value < pool[best] ? index : best, 0);
    const start = Math.max(dependencyFinish, pool[slot]);
    const end = start + (durations.get(task.id) ?? 0);
    pool[slot] = end;
    pools.set(task.resource, pool);
    starts.set(task.id, start);
    finish.set(task.id, end);
  }
  return { starts, finish, total: Math.max(0, ...finish.values()) };
}

function expectedTasks(input: FeasibilityInput) {
  const durations = new Map(TASKS.map((task) => [task.id, ((task.optimisticWeeks + 4 * task.likelyWeeks + task.pessimisticWeeks) / 6) * taskModifier(input, task)]));
  const forward = schedule(durations, input);
  const projectFinish = forward.total;
  const latestStart = new Map<string, number>();
  for (const task of [...TASKS].reverse()) {
    const successors = TASKS.filter((candidate) => candidate.dependencies.includes(task.id));
    const latestFinish = successors.length ? Math.min(...successors.map((candidate) => latestStart.get(candidate.id) ?? projectFinish)) : projectFinish;
    latestStart.set(task.id, latestFinish - (durations.get(task.id) ?? 0));
  }
  return TASKS.map((task) => {
    const expectedWeeks = durations.get(task.id) ?? 0;
    const start = forward.starts.get(task.id) ?? 0;
    const floatWeeks = Math.max(0, (latestStart.get(task.id) ?? start) - start);
    const external = input.strategy === "vendor" || (input.strategy === "hybrid" && ["Security", "Compliance", "Data"].includes(task.resource));
    return { ...task, optimisticWeeks: round(task.optimisticWeeks * taskModifier(input, task), 1), likelyWeeks: round(task.likelyWeeks * taskModifier(input, task), 1), pessimisticWeeks: round(task.pessimisticWeeks * taskModifier(input, task), 1), expectedWeeks: round(expectedWeeks, 1), earliestStartWeek: round(start, 1), earliestFinishWeek: round(forward.finish.get(task.id) ?? 0, 1), latestStartWeek: round(latestStart.get(task.id) ?? start, 1), floatWeeks: round(floatWeeks, 1), critical: floatWeeks < .15, sourcing: external ? "External" as const : input.strategy === "hybrid" ? "Hybrid" as const : "Internal" as const };
  });
}

function readiness(input: FeasibilityInput): ReadinessComponent[] {
  const items: Array<[string, string, number, number, string]> = [
    ["technical", "Technical maturity", 100 - input.complexity * .48, 14, "Derived from declared solution complexity"],
    ["data", "Data readiness", input.dataReadiness, 13, "Declared source access, quality and provenance readiness"],
    ["talent", "Available talent", input.internalCapacity, 12, "Declared internal delivery capacity"],
    ["budget", "Budget", input.budgetReadiness, 10, "Declared funding confidence; no capital is authorized"],
    ["regulation", "Regulation", 100 - input.regulatoryIntensity * .62, 10, "Inverse of declared regulatory intensity"],
    ["security", "Security", input.securityReadiness, 10, "Declared security control readiness"],
    ["governance", "Governance", 72, 9, "Named gates are included in the generated roadmap"],
    ["infrastructure", "Infrastructure", input.strategy === "vendor" ? 76 : input.internalCapacity * .72 + 18, 8, "Strategy-adjusted delivery infrastructure"],
    ["adoption", "Organizational adoption", input.adoptionReadiness, 8, "Declared operating and change readiness"],
    ["dependencies", "External dependencies", input.strategy === "internal" ? 67 : input.strategy === "hybrid" ? 55 : 38, 6, "Lower score reflects vendor and partner dependency"],
  ];
  return items.map(([id, label, rawScore, weight, evidence]) => { const score = round(clampFinite(rawScore, 0, 100), 0); return { id, label, score, weight, evidence, status: score >= 70 ? "Ready" : score >= 45 ? "Conditional" : "Gap" }; });
}

function capabilityGaps(input: FeasibilityInput): CapabilityGap[] {
  const dataStatus = input.dataReadiness >= 70 ? "Partially available" : "Must hire";
  const securityStatus = input.securityReadiness >= 70 ? "Available internally" : "Must outsource";
  const regulationStatus = input.regulatoryIntensity < 35 ? "Partially available" : "Must outsource";
  const integrationStatus = input.strategy === "vendor" ? "Partner dependent" : input.internalCapacity >= 70 ? "Partially available" : "Must hire";
  return [
    { capability: "Data engineering", required: input.dataReadiness < 55 ? "2 data engineers and access to 3 governed sources" : "1 data engineer and source stewardship", status: dataStatus, action: input.dataReadiness < 70 ? "Staff the data workstream before integration starts" : "Confirm named source stewards", scheduleImpactWeeks: input.dataReadiness < 55 ? 6 : 2 },
    { capability: "Regulatory interpretation", required: "1 accountable regulatory specialist", status: regulationStatus, action: "Obtain a written obligations and approval map", scheduleImpactWeeks: input.regulatoryIntensity > 65 ? 7 : 3 },
    { capability: "Security assurance", required: "Threat modeling and independent testing", status: securityStatus, action: "Reserve an assessment window before pilot approval", scheduleImpactWeeks: input.securityReadiness < 55 ? 5 : 2 },
    { capability: "Integration delivery", required: "API, identity, lineage and fallback ownership", status: integrationStatus, action: "Name an integration owner and dependency SLAs", scheduleImpactWeeks: input.internalCapacity < 50 ? 5 : 2 },
    { capability: "Change and adoption", required: "Pilot lead, training and operating owner", status: input.adoptionReadiness >= 70 ? "Available internally" : "Partially available", action: "Assign the pilot cohort and service owner before build completion", scheduleImpactWeeks: input.adoptionReadiness < 45 ? 4 : 1 },
  ];
}

function options(input: FeasibilityInput, baseMonths: number, baseCost: number): DeliveryOption[] {
  const rows: Array<[string, string, number, number, string, string, string, string, string, string, string]> = [
    ["internal", "Build internally", 1.2, .94, "High", "Medium", "Talent availability", "Low", "Organization-owned", "High after capability build", "Slow start"],
    ["buy", "Buy software", .62, 1.15, "Low", "Medium", "Vendor roadmap", "High", "Vendor-owned core", "High within product limits", "Fast"],
    ["outsource", "Outsource delivery", .76, 1.28, "Medium-low", "Medium-high", "Provider capacity", "High", "Contract-dependent", "Medium", "Fast"],
    ["partner", "Strategic partnership", .88, 1.08, "Shared", "Medium", "Partner alignment", "Medium-high", "Shared by agreement", "High if incentives align", "Medium"],
    ["acquire", "Acquire capability", .95, 2.35, "High after integration", "High", "Transaction and integration", "Medium", "Acquired subject to diligence", "Potentially high", "Slow transaction"],
    ["hybrid", "Hybrid delivery", .86, .98, "Medium-high", "Medium-low", "Managed interfaces", "Medium", "Core retained internally", "High", "Balanced"],
  ];
  return rows.map(([id, label, timeFactor, costFactor, control, risk, dependency, lockIn, intellectualProperty, scalability, speed]) => ({ id, label, timeP50Months: round(baseMonths * Number(timeFactor), 1), expectedCost: round(baseCost * Number(costFactor), 0), control, risk, dependency, lockIn, intellectualProperty, scalability, speed }));
}

export function estimateExecutionFeasibility(rawInput: FeasibilityInput): FeasibilityResult {
  const input = safeInput(rawInput);
  const tasks = expectedTasks(input);
  const random = createSeededRandom(input.seed);
  const durations: number[] = [];
  const costs: number[] = [];
  const taskImpact = new Map(TASKS.map((task) => [task.id, 0]));
  const expectedDurationByTask = new Map(tasks.map((task) => [task.id, task.expectedWeeks]));
  for (let sample = 0; sample < input.samples; sample += 1) {
    const sampled = new Map<string, number>();
    const resourceCounts = new Map<string, number>();
    for (const task of TASKS) {
      const modifier = taskModifier(input, task);
      const seen = resourceCounts.get(task.resource) ?? 0;
      resourceCounts.set(task.resource, seen + 1);
      const learning = Math.max(.84, 1 - seen * .025);
      let value = triangular(random, task.optimisticWeeks, task.likelyWeeks, task.pessimisticWeeks) * modifier * learning;
      const reworkChance = Math.min(.55, task.reworkProbability + input.complexity / 500 + (100 - input.dataReadiness) / 650);
      if (random() < reworkChance) value *= 1.22 + random() * .38;
      sampled.set(task.id, value);
      taskImpact.set(task.id, (taskImpact.get(task.id) ?? 0) + Math.abs(value - (expectedDurationByTask.get(task.id) ?? 0)));
    }
    const totalWeeks = schedule(sampled, input).total;
    const durationRatio = totalWeeks / Math.max(1, tasks.at(-1)?.earliestFinishWeek ?? totalWeeks);
    const base = TASKS.reduce((sum, task) => sum + task.baseCost * taskModifier(input, task) * STRATEGY[input.strategy].cost, 0);
    const operating = 98000 + input.users * 340 + input.annualAgentRuns * 1.6;
    durations.push(totalWeeks);
    costs.push(base * (.76 + durationRatio * .24) + operating + random() * base * .12);
  }
  durations.sort((a, b) => a - b); costs.sort((a, b) => a - b);
  const durationWeeks = { optimistic: round(percentile(durations, 10), 1), p50: round(percentile(durations, 50), 1), p90: round(percentile(durations, 90), 1), conservative: round(percentile(durations, 95), 1), mean: round(durations.reduce((sum, value) => sum + value, 0) / durations.length, 1) };
  const month = (weeks: number) => round(weeks / 4.345, 1);
  const durationMonths = { optimistic: month(durationWeeks.optimistic), p50: month(durationWeeks.p50), p90: month(durationWeeks.p90), conservative: month(durationWeeks.conservative), mean: month(durationWeeks.mean) };
  const expectedCost = costs.reduce((sum, value) => sum + value, 0) / costs.length;
  const baseCategory = new Map<CostCategory, number>(COST_CATEGORIES.map((category) => [category, 0]));
  for (const task of TASKS) baseCategory.set(task.costCategory, (baseCategory.get(task.costCategory) ?? 0) + task.baseCost * taskModifier(input, task) * STRATEGY[input.strategy].cost);
  const additions: Partial<Record<CostCategory, number>> = { Licenses: expectedCost * (input.strategy === "internal" ? .025 : .07), "APIs and models": expectedCost * .035, Maintenance: expectedCost * .08, Contingency: expectedCost * .1, "Opportunity cost": expectedCost * .065, Support: expectedCost * .045, Training: expectedCost * .025 };
  for (const [category, value] of Object.entries(additions) as Array<[CostCategory, number]>) baseCategory.set(category, (baseCategory.get(category) ?? 0) + value);
  const categoryTotal = [...baseCategory.values()].reduce((sum, value) => sum + value, 0);
  const scale = expectedCost / Math.max(1, categoryTotal);
  const categories = COST_CATEGORIES.map((category) => ({ category, amount: round((baseCategory.get(category) ?? 0) * scale, 0), kind: category === "Opportunity cost" ? "Economic" as const : ["Infrastructure", "Licenses", "APIs and models", "Support", "Maintenance"].includes(category) ? "OPEX" as const : "CAPEX" as const }));
  const capex = categories.filter((item) => item.kind === "CAPEX").reduce((sum, item) => sum + item.amount, 0);
  const annualRunRate = categories.filter((item) => item.kind === "OPEX").reduce((sum, item) => sum + item.amount, 0);
  const cost = { expected: round(expectedCost, 0), probableLow: round(percentile(costs, 10), 0), probableHigh: round(percentile(costs, 90), 0), capex: round(capex, 0), firstYearOpex: round(annualRunRate, 0), monthlyRunRate: round(annualRunRate / 12, 0), annualRunRate: round(annualRunRate, 0), threeYearTco: round(capex + annualRunRate * 3, 0), perUser: round((capex + annualRunRate * 3) / input.users, 0), perMission: round(annualRunRate / input.annualMissions, 0), perSimulation: round(annualRunRate / input.annualSimulations, 2), perAgentRun: round(annualRunRate / input.annualAgentRuns, 2), categories };
  const readinessComponents = readiness(input);
  const readinessScore = round(readinessComponents.reduce((sum, component) => sum + component.score * component.weight, 0) / 100, 0);
  const criticalPath = tasks.filter((task) => task.critical).map((task) => task.id);
  const scheduleDrivers = tasks.map((task) => ({ taskId: task.id, title: task.title, impact: round((taskImpact.get(task.id) ?? 0) / input.samples, 1) })).sort((a, b) => b.impact - a.impact).slice(0, 5);
  const phases = [...new Set(tasks.map((task) => task.phase))].map((name) => { const phaseTasks = tasks.filter((task) => task.phase === name); return { name, taskIds: phaseTasks.map((task) => task.id), expectedWeeks: round(phaseTasks.reduce((sum, task) => sum + task.expectedWeeks, 0), 1) }; });
  const probabilityByMonth = Array.from(new Set([Math.ceil(durationMonths.optimistic), Math.ceil(durationMonths.p50), Math.ceil(durationMonths.p90), Math.ceil(durationMonths.conservative)])).sort((a, b) => a - b).map((target) => ({ month: target, probability: round(durations.filter((weeks) => weeks <= target * 4.345).length / durations.length * 100, 0) }));
  const roadmapMultipliers = [.12, .45, .7, 1];
  const roadmap = [
    ["MVP", "Core governed workflow proves the bounded use case", "Product lead", "MVP acceptance", "Critical workflow completion"],
    ["Pilot", "Measured cohort tests quality, safety and adoption", "Program lead", "Pilot authorization", "Adoption and error thresholds"],
    ["Production", "Supported release meets security and service controls", "Service owner", "Production approval", "SLO and control readiness"],
    ["Expansion", "Approved use expands after predicted-versus-actual review", "Portfolio committee", "Expansion decision", "Value, risk and variance review"],
  ].map((item, index) => ({ id: `RM-${index + 1}`, label: item[0], outcome: item[1], owner: item[2], gate: item[3], metric: item[4], p50Month: round(durationMonths.p50 * roadmapMultipliers[index], 1), p90Month: round(durationMonths.p90 * roadmapMultipliers[index], 1) }));
  const topFactors = [
    { label: "Data and integration readiness", score: 100 - input.dataReadiness }, { label: "Regulatory review intensity", score: input.regulatoryIntensity },
    { label: "Availability of specialist capacity", score: 100 - input.internalCapacity }, { label: "Security control readiness", score: 100 - input.securityReadiness },
    { label: "Organizational adoption", score: 100 - input.adoptionReadiness }, { label: "Solution complexity", score: input.complexity },
  ].sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.label);
  return {
    modelVersion: "execution-feasibility-demo-1.0", generatedFrom: { proposalName: input.proposalName, strategy: input.strategy, seed: input.seed, samples: input.samples },
    durationWeeks, durationMonths, probabilityByMonth, cost, tasks, phases, criticalPath, scheduleDrivers, topFactors,
    capabilities: capabilityGaps(input), readiness: { score: readinessScore, components: readinessComponents }, options: options(input, durationMonths.p50, cost.expected), roadmap,
    assumptions: ["Task durations use visible three-point estimates and PERT means.", "Monte Carlo samples triangular task durations, bounded rework, learning effects and resource availability.", "Dependencies form a fixed public demonstration WBS; the proposal text is treated as data and is never executed.", "Cost categories are synthetic planning assumptions in USD, not supplier quotes.", "Readiness weights are visible fictitious weights normalized to 100%.", "Identical bounded inputs and seed produce identical results."],
    limitations: ["This is an early planning estimate, not a calibrated forecast, procurement decision, financial advice or deployment authorization.", "Historical organizational calibration and predicted-versus-actual learning require governed private records and are not implemented in this repository.", "The critical path is calculated from declared dependencies; resource-contention effects are included in sampling but do not replace a detailed delivery plan.", "Human approval is required at every roadmap gate; no result triggers funding, contracting or execution."],
  };
}

export const DEFAULT_FEASIBILITY_INPUT: FeasibilityInput = {
  proposalName: "Governed decision intelligence pilot", proposalSummary: "Deploy a controlled decision-intelligence workflow with governed data integrations, human approval gates and measurable pilot outcomes.", strategy: "hybrid",
  complexity: 68, dataReadiness: 52, internalCapacity: 58, regulatoryIntensity: 61, securityReadiness: 64, adoptionReadiness: 55, budgetReadiness: 72,
  users: 120, annualMissions: 24, annualSimulations: 720, annualAgentRuns: 2880, samples: 4000, seed: 240719,
};
