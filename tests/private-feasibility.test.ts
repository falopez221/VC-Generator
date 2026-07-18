import assert from "node:assert/strict";
import test from "node:test";
import { COST_CATEGORIES, DEFAULT_FEASIBILITY_INPUT, estimateExecutionFeasibility } from "../src/private/feasibility/index.ts";

test("execution feasibility is deterministic for identical bounded inputs and seed", () => {
  const first = estimateExecutionFeasibility(DEFAULT_FEASIBILITY_INPUT);
  const second = estimateExecutionFeasibility({ ...DEFAULT_FEASIBILITY_INPUT });
  assert.deepEqual(first, second);
  assert.equal(first.generatedFrom.samples, 4000);
  assert.equal(first.tasks.length, 15);
  assert.equal(first.options.length, 6);
});

test("execution feasibility produces coherent probabilistic time and cost ranges", () => {
  const result = estimateExecutionFeasibility(DEFAULT_FEASIBILITY_INPUT);
  assert.ok(result.durationMonths.optimistic <= result.durationMonths.p50);
  assert.ok(result.durationMonths.p50 <= result.durationMonths.p90);
  assert.ok(result.durationMonths.p90 <= result.durationMonths.conservative);
  assert.ok(result.cost.probableLow <= result.cost.expected);
  assert.ok(result.cost.expected <= result.cost.probableHigh);
  assert.ok(result.probabilityByMonth.every((item, index, values) => item.probability >= 0 && item.probability <= 100 && (index === 0 || item.probability >= values[index - 1].probability)));
});

test("WBS dependencies, critical path and acceptance criteria remain inspectable", () => {
  const result = estimateExecutionFeasibility(DEFAULT_FEASIBILITY_INPUT);
  const ids = new Set(result.tasks.map((task) => task.id));
  assert.equal(ids.size, result.tasks.length);
  for (const task of result.tasks) {
    assert.ok(task.dependencies.every((dependency) => ids.has(dependency)));
    assert.ok(task.deliverable.length > 0);
    assert.ok(task.acceptance.length > 0);
    assert.ok(task.optimisticWeeks <= task.likelyWeeks);
    assert.ok(task.likelyWeeks <= task.pessimisticWeeks);
  }
  assert.ok(result.criticalPath.length > 0);
  assert.ok(result.criticalPath.every((id) => result.tasks.find((task) => task.id === id)?.critical));
});

test("cost and readiness decompositions are complete and normalized", () => {
  const result = estimateExecutionFeasibility(DEFAULT_FEASIBILITY_INPUT);
  assert.deepEqual(result.cost.categories.map((item) => item.category), [...COST_CATEGORIES]);
  assert.equal(result.readiness.components.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.ok(result.readiness.components.every((item) => item.score >= 0 && item.score <= 100));
  assert.ok(result.capabilities.every((item) => item.scheduleImpactWeeks >= 0));
  assert.ok(result.cost.threeYearTco >= result.cost.capex);
});

test("input bounds prevent non-finite planning outputs", () => {
  const result = estimateExecutionFeasibility({ ...DEFAULT_FEASIBILITY_INPUT, proposalName: "", complexity: Number.POSITIVE_INFINITY, users: 0, samples: 1, seed: Number.NaN });
  assert.equal(result.generatedFrom.proposalName, "Untitled implementation");
  assert.equal(result.generatedFrom.samples, 500);
  assert.ok(Number.isFinite(result.durationMonths.p90));
  assert.ok(Number.isFinite(result.cost.threeYearTco));
  assert.ok(result.tasks.every((task) => Number.isFinite(task.expectedWeeks)));
});
