import type {
  FinancialAsset,
  ManualHolding,
  MockDataProvenance,
  PortfolioSnapshot,
  PortfolioTransaction,
  ValidationResult,
} from "./types.ts";
import {
  roundTo,
  sanitizeText,
  validateManualHolding,
  validatePortfolioSnapshot,
  validatePortfolioTransaction,
} from "./validation.ts";

export interface ManualPortfolio {
  holdings: ManualHolding[];
  transactions: PortfolioTransaction[];
  snapshots: PortfolioSnapshot[];
}

export function validateManualPortfolio(portfolio: ManualPortfolio): ValidationResult<ManualPortfolio> {
  const issues: string[] = [];
  const holdings: ManualHolding[] = [];
  const transactions: PortfolioTransaction[] = [];
  const ids = new Set<string>();

  for (const holding of portfolio.holdings.slice(0, 500)) {
    const result = validateManualHolding(holding);
    if (result.value) {
      if (ids.has(result.value.id)) issues.push(`Duplicate holding id: ${result.value.id}.`);
      else {
        ids.add(result.value.id);
        holdings.push(result.value);
      }
    } else issues.push(...result.issues.map((issue) => `${holding.id || "holding"}: ${issue}`));
  }
  if (portfolio.holdings.length > 500) issues.push("Portfolio is limited to 500 holdings.");

  const transactionIds = new Set<string>();
  for (const transaction of portfolio.transactions.slice(0, 10_000)) {
    const result = validatePortfolioTransaction(transaction);
    if (result.value) {
      if (transactionIds.has(result.value.id)) issues.push(`Duplicate transaction id: ${result.value.id}.`);
      else {
        transactionIds.add(result.value.id);
        transactions.push(result.value);
      }
    } else issues.push(...result.issues.map((issue) => `${transaction.id || "transaction"}: ${issue}`));
  }
  if (portfolio.transactions.length > 10_000) issues.push("Portfolio is limited to 10,000 transactions.");

  const snapshots: PortfolioSnapshot[] = [];
  const snapshotIds = new Set<string>();
  for (const snapshot of portfolio.snapshots.slice(0, 2_000)) {
    const result = validatePortfolioSnapshot(snapshot);
    if (result.value) {
      if (snapshotIds.has(result.value.id)) issues.push(`Duplicate snapshot id: ${result.value.id}.`);
      else {
        snapshotIds.add(result.value.id);
        snapshots.push(result.value);
      }
    } else issues.push(...result.issues.map((issue) => `${snapshot.id || "snapshot"}: ${issue}`));
  }
  if (portfolio.snapshots.length > 2_000) issues.push("Portfolio is limited to 2,000 snapshots.");

  return {
    value: issues.length === 0 ? { holdings, transactions, snapshots } : null,
    issues,
  };
}

export function holdingsFromTransactions(transactions: PortfolioTransaction[]): Record<string, number> {
  const quantities: Record<string, number> = {};
  const ordered = [...transactions].sort((left, right) =>
    left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id),
  );
  for (const transaction of ordered) {
    if (!transaction.assetId || !["buy", "sell"].includes(transaction.side)) continue;
    const direction = transaction.side === "buy" ? 1 : -1;
    quantities[transaction.assetId] = roundTo(Math.max(0, (quantities[transaction.assetId] ?? 0) + direction * transaction.quantity), 8);
  }
  return quantities;
}

export function createPortfolioSnapshot(args: {
  id: string;
  capturedAt: string;
  referenceCurrency: "ARS" | "USD";
  holdings: Array<{ asset: FinancialAsset; quantity: number; convertedReferenceValue: number }>;
}): PortfolioSnapshot {
  const valid = args.holdings.filter(
    (item) => item.quantity >= 0 && Number.isFinite(item.quantity) && item.convertedReferenceValue >= 0 && Number.isFinite(item.convertedReferenceValue),
  );
  const total = valid.reduce((sum, item) => sum + item.convertedReferenceValue, 0);
  return {
    id: sanitizeText(args.id, 80),
    capturedAt: args.capturedAt,
    referenceCurrency: args.referenceCurrency,
    totalReferenceValue: roundTo(total, 2),
    positions: valid.map((item) => ({
      assetId: item.asset.id,
      quantity: roundTo(item.quantity, 8),
      referenceValue: roundTo(item.convertedReferenceValue, 2),
      currency: item.asset.currency,
      weight: total === 0 ? 0 : roundTo(item.convertedReferenceValue / total, 8),
    })),
    provenance: valid.map((item) => ({ ...item.asset.provenance })) as MockDataProvenance[],
  };
}
