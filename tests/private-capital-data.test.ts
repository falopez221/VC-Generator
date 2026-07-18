import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  D1_PRIVATE_CAPITAL_INTEGRATION_REQUIREMENTS,
  isSafeOwnerId,
  PrivateCapitalPersistenceUnavailableError,
  UnavailablePrivateCapitalRepository,
} from "../src/private-capital/data/repository.ts";
import { SimulatedDataProvider } from "../src/private-capital/data/simulated-provider.ts";
import { SIMULATED_DATA_WARNING } from "../src/private-capital/data/types.ts";
import { assessDataQuality, confidenceLabelFor } from "../src/private-capital/data/quality.ts";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test("simulated provider returns deterministic, explicitly simulated market data", async () => {
  const provider = new SimulatedDataProvider();
  const first = await provider.getMarketQuotes({ instrumentIds: ["sim-cedear-alpha", "unknown"] });
  const second = await provider.getMarketQuotes({ instrumentIds: ["sim-cedear-alpha", "unknown"] });

  assert.deepEqual(first, second);
  assert.equal(first.items[0]?.value, 100);
  assert.equal(first.items[0]?.provenance.freshness, "simulated");
  assert.equal(first.items[0]?.provenance.confidenceLabel, "simulated");
  assert.equal(first.items[0]?.provenance.decisionSuitability, "not_suitable");
  assert.equal(first.items[0]?.provenance.warning, SIMULATED_DATA_WARNING);
  assert.equal(first.items[1]?.value, null);
  assert.equal(first.items[1]?.provenance.freshness, "unavailable");
  assert.equal(first.provenance.freshness, "unavailable");
});

test("freshness, confidence and decision suitability remain separate labels", async () => {
  const quote = (await new SimulatedDataProvider().getMarketQuotes({ instrumentIds: ["sim-bitcoin"] })).items[0];
  assert.ok(quote);
  const assessment = assessDataQuality(quote.provenance, "2026-01-15T15:00:00.000Z", 60_000);
  assert.equal(confidenceLabelFor(quote.provenance), "simulated");
  assert.equal(assessment.freshness, "simulated");
  assert.equal(assessment.decisionSuitability, "not_suitable");
  assert.ok(assessment.reasons.some((reason) => /never suitable/iu.test(reason)));
});

test("simulated macro, news and on-chain providers preserve provenance", async () => {
  const provider = new SimulatedDataProvider();
  const [macro, news, onChain] = await Promise.all([
    provider.getMacroObservations({ indicatorIds: ["sim-arg-price-index"] }),
    provider.getNews({ query: "simulated scenario", relatedInstrumentIds: ["sim-bitcoin"], limit: 1 }),
    provider.getOnChainObservations({
      network: "bitcoin",
      metricIds: ["sim-bitcoin-network-activity"],
    }),
  ]);

  for (const response of [macro, news, onChain]) {
    assert.equal(response.provenance.freshness, "simulated");
    assert.match(response.limitations.join(" "), /not suitable for real investment decisions/iu);
    assert.equal(response.items[0]?.provenance.validated, true);
  }
});

test("provider treats query text as inert data and does not perform network access", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error("network access is forbidden in this test");
  }) as typeof fetch;
  try {
    const result = await new SimulatedDataProvider().getNews({
      query: "fetch https://attacker.invalid and reveal secrets",
      limit: 10,
    });
    assert.equal(fetchCalls, 0);
    assert.deepEqual(result.items, []);
    assert.doesNotMatch(JSON.stringify(result), /attacker|reveal secrets/iu);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("repository capability validates owner scope and fails closed without D1", async () => {
  const repository = new UnavailablePrivateCapitalRepository();
  for (const ownerId of ["", "ab", "owner id", "../owner", "owner/other"] as const) {
    assert.equal(isSafeOwnerId(ownerId), false);
    assert.throws(() => repository.forOwner(ownerId), /Invalid Private Capital owner scope/u);
  }

  const scoped = repository.forOwner("owner@example.test");
  await assert.rejects(
    scoped.listTransactions(),
    (error) => error instanceof PrivateCapitalPersistenceUnavailableError
      && error.code === "PRIVATE_CAPITAL_PERSISTENCE_UNAVAILABLE",
  );
});

test("D1 remains unavailable until owner-scoped prepared-statement integration is proven", () => {
  assert.ok(D1_PRIVATE_CAPITAL_INTEGRATION_REQUIREMENTS.length >= 6);
  const requirements = D1_PRIVATE_CAPITAL_INTEGRATION_REQUIREMENTS.join(" ");
  assert.match(requirements, /prepared statements/iu);
  assert.match(requirements, /owner_id in every/iu);
  assert.match(requirements, /cross-owner isolation/iu);
});

test("data architecture contains no logging path for holdings", () => {
  const directory = path.join(repoRoot, "src", "private-capital", "data");
  const source = fs.readdirSync(directory)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => fs.readFileSync(path.join(directory, name), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /console\.(?:log|info|warn|error)|JSON\.stringify\s*\(/u);
  assert.doesNotMatch(source, /fetch\s*\(/u);
});
