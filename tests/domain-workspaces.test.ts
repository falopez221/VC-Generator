import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { APPLICATION_DOMAINS } from "../src/applications/catalog.ts";
import { DOMAIN_WORKSPACES, getDomainWorkspace, simulateDomainScenario } from "../src/applications/domain-workspaces.ts";
import { DOMAIN_VISUAL_CONTRACTS } from "../src/applications/domain-visual-contracts.ts";

test("private domain library exposes one distinct bounded workspace per catalog domain", () => {
  assert.equal(DOMAIN_WORKSPACES.length, 30);
  assert.equal(new Set(DOMAIN_WORKSPACES.map((workspace) => workspace.slug)).size, 30);
  assert.equal(new Set(DOMAIN_WORKSPACES.map((workspace) => workspace.visualMode)).size, 30);
  assert.deepEqual(
    [...DOMAIN_WORKSPACES.map((workspace) => workspace.domain)].sort(),
    [...APPLICATION_DOMAINS].sort(),
  );
  for (const workspace of DOMAIN_WORKSPACES) {
    assert.equal(workspace.kpis.length, 4, workspace.slug);
    assert.equal(workspace.models.length, 3, workspace.slug);
    assert.equal(workspace.sources.length, 3, workspace.slug);
    assert.equal(workspace.roles.length, 3, workspace.slug);
    assert.equal(workspace.chart.labels.length, workspace.chart.values.length, workspace.slug);
    assert.ok(workspace.vocabulary.length >= 4, workspace.slug);
    assert.ok(workspace.risks.length >= 2 && workspace.opportunities.length >= 2, workspace.slug);
    assert.equal(getDomainWorkspace(workspace.slug), workspace);
  }
});

test("every domain is backed by an explicit sector renderer contract", async () => {
  assert.equal(DOMAIN_VISUAL_CONTRACTS.length, 30);
  assert.equal(new Set(DOMAIN_VISUAL_CONTRACTS.map((contract) => contract.renderer)).size, 30);
  const rendererSource = await readFile(new URL("../src/platform/components/DomainWorkspaceVisuals.tsx", import.meta.url), "utf8");
  for (const workspace of DOMAIN_WORKSPACES) {
    const contract = DOMAIN_VISUAL_CONTRACTS.find((candidate) => candidate.slug === workspace.slug);
    assert.ok(contract, workspace.slug);
    assert.equal(contract.mode, workspace.visualMode, workspace.slug);
    assert.equal(contract.requiredFeatures.length, 3, workspace.slug);
    assert.match(rendererSource, new RegExp(`case ["']${workspace.slug}["']:`), workspace.slug);
  }
  const finance = DOMAIN_VISUAL_CONTRACTS.find((contract) => contract.slug === "finance")!;
  assert.deepEqual(finance.requiredFeatures, ["yield curve", "correlation heatmap", "VaR distribution"]);
  const venture = DOMAIN_VISUAL_CONTRACTS.find((contract) => contract.slug === "venture-capital")!;
  assert.deepEqual(venture.requiredFeatures, ["deal funnel", "opportunity ranking", "Monte Carlo distribution"]);
});

test("domain scenarios are deterministic, finite and clamped", () => {
  for (const workspace of DOMAIN_WORKSPACES) {
    const baselineA = simulateDomainScenario(workspace, workspace.scenario.baseline);
    const baselineB = simulateDomainScenario(workspace, workspace.scenario.baseline);
    assert.deepEqual(baselineA, baselineB, workspace.slug);
    assert.equal(baselineA.primary, workspace.scenario.primaryBase, workspace.slug);
    assert.equal(baselineA.secondary, workspace.scenario.secondaryBase, workspace.slug);
    const below = simulateDomainScenario(workspace, Number.NEGATIVE_INFINITY);
    const above = simulateDomainScenario(workspace, Number.POSITIVE_INFINITY);
    for (const result of [below, above]) {
      assert.ok(Number.isFinite(result.input));
      assert.ok(Number.isFinite(result.primary));
      assert.ok(Number.isFinite(result.secondary));
      assert.ok(result.input >= workspace.scenario.min && result.input <= workspace.scenario.max);
      assert.ok(result.primary >= workspace.scenario.primaryMin && result.primary <= workspace.scenario.primaryMax);
      assert.ok(result.secondary >= workspace.scenario.secondaryMin && result.secondary <= workspace.scenario.secondaryMax);
    }
  }
});

test("high-impact workspaces keep explicit safety boundaries", () => {
  for (const slug of ["defense", "emergency-response", "energy", "finance", "healthcare", "infrastructure", "law", "manufacturing", "mining", "public-safety", "space", "telecommunications", "venture-capital", "water"]) {
    assert.ok(getDomainWorkspace(slug)?.safetyNote, slug);
  }
  const serialized = JSON.stringify(DOMAIN_WORKSPACES);
  assert.doesNotMatch(serialized, /private prompt|chain of thought|guaranteed return|autonomous funding|real patient/i);
  assert.match(getDomainWorkspace("defense")?.safetyNote ?? "", /datos sinteticos/i);
  assert.match(getDomainWorkspace("public-safety")?.safetyNote ?? "", /No incluye reconocimiento facial/i);
});
