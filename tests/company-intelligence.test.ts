import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCompany, COMPANY_AGENT_WEIGHTS, parseFinancialStatement, screenNegativeBetas } from "../src/lab/company-intelligence.ts";

const statement = `Revenue: 1280
EBITDA: 230
Free cash flow: 145
Cash: 320
Debt: 120
Shares outstanding: 100
Share price: 24.50
Beta: -0.18`;

test("company agent weights normalize to one hundred percent", () => {
  assert.equal(Object.values(COMPANY_AGENT_WEIGHTS).reduce((sum, value) => sum + value, 0), 100);
});

test("financial statement parser extracts the eight bounded public fields", () => {
  const parsed = parseFinancialStatement(statement);
  assert.equal(parsed.foundMetrics.length, 8);
  assert.equal(parsed.snapshot.freeCashFlowM, 145);
  assert.equal(parsed.snapshot.beta, -0.18);
});

test("company analysis is finite, deterministic and evidence bounded", () => {
  const request = { companyName: "Test Company", ticker: "TEST", financialStatement: statement, earningsCall: "Raised guidance after strong demand, but limited visibility remains.", growthPct: 6, discountRatePct: 10, terminalGrowthPct: 2.5, ebitdaMultiple: 10 };
  const first = analyzeCompany(request);
  const second = analyzeCompany(request);
  assert.deepEqual(first, second);
  assert.ok(Number.isFinite(first.blendedFairValuePerShare));
  assert.equal(first.negativeBeta, true);
  assert.ok(first.evidenceQuality <= 100);
  assert.ok(first.uncertainty >= 0);
});

test("negative beta screen returns only sorted synthetic negative betas", () => {
  const results = screenNegativeBetas();
  assert.ok(results.length > 0);
  assert.ok(results.every((company) => company.beta < 0));
  assert.deepEqual(results.map((company) => company.beta), [...results.map((company) => company.beta)].sort((a, b) => a - b));
});
