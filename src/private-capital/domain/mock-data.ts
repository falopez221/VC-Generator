import { SIMULATED_DATA_NOTICE, type FinancialAsset, type MockDataProvenance } from "./types.ts";

const timestamp = "2026-01-15T15:00:00.000Z";

function provenance(currency: MockDataProvenance["currency"], market: string, confidence: number): MockDataProvenance {
  return {
    kind: "mock",
    source: "Venture Governance deterministic simulated fixture",
    timestamp,
    currency,
    market,
    latencyMs: 900_000,
    confidence,
    confidenceLabel: "simulated",
    validated: true,
    notice: SIMULATED_DATA_NOTICE,
  };
}

export const SIMULATED_FINANCIAL_ASSETS: readonly FinancialAsset[] = [
  {
    id: "sim-cedear-alpha",
    ticker: "SIM-CED-A",
    name: "Simulated International Equity CEDEAR",
    assetClass: "cedear",
    currency: "ARS",
    market: "SIMULATED-LOCAL",
    sector: "technology",
    geography: "international",
    referenceValue: 100,
    riskScore: 68,
    liquidityScore: 72,
    provenance: provenance("ARS", "SIMULATED-LOCAL", 0.82),
  },
  {
    id: "sim-cedear-fund",
    ticker: "SIM-CED-F",
    name: "Simulated Broad Market Fund CEDEAR",
    assetClass: "cedear",
    currency: "ARS",
    market: "SIMULATED-LOCAL",
    sector: "diversified",
    geography: "global",
    referenceValue: 100,
    riskScore: 52,
    liquidityScore: 78,
    provenance: provenance("ARS", "SIMULATED-LOCAL", 0.82),
  },
  {
    id: "sim-bond-sovereign",
    ticker: "SIM-BOND-S",
    name: "Simulated Argentine Sovereign Bond",
    assetClass: "bond",
    currency: "USD",
    market: "SIMULATED-BOND",
    sector: "sovereign",
    geography: "argentina",
    referenceValue: 100,
    riskScore: 76,
    liquidityScore: 51,
    provenance: provenance("USD", "SIMULATED-BOND", 0.74),
  },
  {
    id: "sim-bitcoin",
    ticker: "SIM-BTC",
    name: "Simulated Bitcoin Exposure",
    assetClass: "bitcoin",
    currency: "USD",
    market: "SIMULATED-DIGITAL-ASSET",
    sector: "digital-asset",
    geography: "global",
    referenceValue: 100,
    riskScore: 92,
    liquidityScore: 80,
    provenance: provenance("USD", "SIMULATED-DIGITAL-ASSET", 0.7),
  },
  {
    id: "sim-cash-usd",
    ticker: "SIM-CASH-USD",
    name: "Simulated USD Cash",
    assetClass: "cash",
    currency: "USD",
    market: "SIMULATED-CASH",
    sector: "cash",
    geography: "global",
    referenceValue: 1,
    riskScore: 8,
    liquidityScore: 100,
    provenance: provenance("USD", "SIMULATED-CASH", 0.95),
  },
  {
    id: "sim-cash-ars",
    ticker: "SIM-CASH-ARS",
    name: "Simulated ARS Cash",
    assetClass: "cash",
    currency: "ARS",
    market: "SIMULATED-CASH",
    sector: "cash",
    geography: "argentina",
    referenceValue: 1,
    riskScore: 42,
    liquidityScore: 100,
    provenance: provenance("ARS", "SIMULATED-CASH", 0.95),
  },
] as const;

export function getSimulatedAsset(assetId: string): FinancialAsset | undefined {
  return SIMULATED_FINANCIAL_ASSETS.find((asset) => asset.id === assetId);
}
