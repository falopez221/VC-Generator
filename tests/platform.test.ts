import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_GOVERNANCE_QUEUE, DEMO_MISSIONS, PLATFORM_CAPABILITY_STATUS, PLATFORM_MODULES, graphFor } from "../src/platform/data.ts";
import { VG_DESIGN_TOKENS } from "../src/platform/design-tokens.ts";

test("platform graph exposes only the four bounded public agents", () => {
  for (const variant of ["overview", "access", "knowledge", "mission", "applications", "simulation", "agents"] as const) {
    const graph = graphFor(variant);
    const ids = new Set(graph.nodes.map((node) => node.id));
    assert.equal(ids.size, graph.nodes.length);
    assert.deepEqual(graph.nodes.filter((node) => node.kind === "agent").map((node) => node.label).sort(), ["Finance", "Marketing", "Mathematics", "Strategy"]);
    assert.equal(graph.nodes.filter((node) => node.kind === "gate").length, 1);
    assert.equal(graph.nodes.filter((node) => node.kind === "result").length, 1);
    for (const edge of graph.edges) {
      assert.ok(ids.has(edge.from), `${variant}: missing edge source ${edge.from}`);
      assert.ok(ids.has(edge.to), `${variant}: missing edge target ${edge.to}`);
      assert.ok(edge.label.length > 0);
    }
    const reaches = (from: string, to: string) => {
      const visited = new Set<string>();
      const queue = [from];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === to) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        for (const edge of graph.edges) if (edge.from === current) queue.push(edge.to);
      }
      return false;
    };
    for (const node of graph.nodes.filter((node) => node.kind === "agent" || node.kind === "model")) {
      assert.ok(reaches(node.id, "gate"), `${variant}: ${node.id} must reach the Human Gate`);
    }
    assert.ok(reaches("evidence", "result"), `${variant}: evidence must reach the Decision Record`);
  }
});

test("platform module and fixture metadata remain honest and internally consistent", () => {
  const hrefs = PLATFORM_MODULES.map((module) => module.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.ok(PLATFORM_MODULES.every((module) => ["Demo", "Prototype", "Preview", "Planned", "Private"].includes(module.status)));
  assert.equal(DEMO_GOVERNANCE_QUEUE.length, 3);
  assert.ok(DEMO_MISSIONS.every((mission) => mission.evidenceCoverage >= 0 && mission.evidenceCoverage <= 100));
  assert.ok(DEMO_MISSIONS.every((mission) => mission.progress >= 0 && mission.progress <= 100));
  assert.ok(DEMO_MISSIONS.every((mission) => mission.unresolvedAssumptions >= 0));
  assert.equal(PLATFORM_CAPABILITY_STATUS.find((item) => item.id === "provider")?.state, "unavailable");
  assert.equal(PLATFORM_CAPABILITY_STATUS.find((item) => item.id === "agents")?.value, "4 available");
  assert.equal(Object.keys(VG_DESIGN_TOKENS).length, 12);
});

test("platform public data does not expose private agent roles or guarantees", () => {
  const serialized = JSON.stringify({ graph: graphFor("overview"), missions: DEMO_MISSIONS, modules: PLATFORM_MODULES });
  assert.doesNotMatch(serialized, /private prompt|chain of thought|investment approved|future unicorn confirmed|tokenomics agent|red team agent/i);
});
