import assert from "node:assert/strict";
import test from "node:test";
import { PRIVATE_AGENT_CATALOG } from "../src/private/agent-registry/catalog.generated.ts";
import { executePrivateAgentTeam, normalizePrivateAgentRunRequest, PrivateAgentExecutionError } from "../src/private/agent-execution/index.ts";
import { BoundedJsonRequestError, isSameSiteWrite, readBoundedJson } from "../src/private/request-security.ts";

const selectedAgent = PRIVATE_AGENT_CATALOG[0];
const mission = "Evaluate the principal risks, evidence gaps and reversible next steps for this venture decision.";

test("private execution accepts only known, human-authorized, bounded teams", () => {
  assert.ok(selectedAgent);
  assert.deepEqual(normalizePrivateAgentRunRequest({ agentIds: [selectedAgent.id], mission, context: "Verified context", acknowledged: true }), {
    agentIds: [selectedAgent.id],
    mission,
    context: "Verified context",
    acknowledged: true,
  });
  assert.throws(() => normalizePrivateAgentRunRequest({ agentIds: ["AGT-9999"], mission, context: "", acknowledged: true }), PrivateAgentExecutionError);
  assert.throws(() => normalizePrivateAgentRunRequest({ agentIds: [selectedAgent.id], mission, context: "", acknowledged: false }), /human-control gate/i);
  assert.throws(() => normalizePrivateAgentRunRequest({ agentIds: Array.from({ length: 9 }, (_, index) => `AGT-${String(index + 1).padStart(4, "0")}`), mission, context: "", acknowledged: true }), /between 1 and 8/i);
});

test("private execution calls the fixed Responses endpoint and returns an inspectable specialist result", async () => {
  assert.ok(selectedAgent);
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify({
      output: [{ content: [{ type: "output_text", text: JSON.stringify({
        executiveSummary: "The decision remains conditional on evidence quality.",
        findings: ["The supplied scope is analyzable."],
        assumptions: ["The context is complete."],
        risks: ["Evidence may be incomplete."],
        evidenceNeeded: ["Independent source validation."],
        recommendations: ["Run a reversible validation step."],
        confidence: 64,
        abstained: false,
      }) }] }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const run = await executePrivateAgentTeam({ agentIds: [selectedAgent.id], mission, context: "Verified context", acknowledged: true }, {
    apiKey: "test-key",
    model: "gpt-5.6-sol",
    fetchImpl,
    now: () => new Date("2026-07-18T12:00:00.000Z"),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "https://api.openai.com/v1/responses");
  assert.equal(new Headers(calls[0]?.init?.headers).get("authorization"), "Bearer test-key");
  const requestBody = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.model, "gpt-5.6-sol");
  assert.equal("tools" in requestBody, false);
  assert.equal(run.status, "completed");
  assert.equal(run.results[0]?.agentId, selectedAgent.id);
  assert.equal(run.results[0]?.confidence, 64);
  assert.match(run.synthesis, /Completed 1 specialist analysis/);
});

test("private API parsing bounds streamed JSON and rejects browser cross-site writes", async () => {
  const accepted = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://venturegovernance.com", "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ mission: "bounded" }),
  });
  assert.deepEqual(await readBoundedJson(accepted, 100), { mission: "bounded" });
  assert.equal(isSameSiteWrite(accepted), true);

  const oversized = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mission: "this request is intentionally beyond the tiny test limit" }),
  });
  await assert.rejects(readBoundedJson(oversized, 10), BoundedJsonRequestError);

  const crossSite = new Request("https://venturegovernance.com/api/private/agents/execute", {
    method: "POST",
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
  });
  assert.equal(isSameSiteWrite(crossSite), false);
});
