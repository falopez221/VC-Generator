import type {
  Currency,
  ManualHolding,
  PortfolioSnapshot,
  PortfolioTransaction,
  ValidationResult,
} from "./types.ts";

const CURRENCIES: Currency[] = ["ARS", "USD", "BTC"];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function clampFinite(value: number, minimum: number, maximum: number, fallback = minimum): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

export function roundTo(value: number, digits = 6): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function sanitizeText(value: unknown, maximumLength = 240): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

export function isIsoTimestamp(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function validCurrency(value: unknown): value is Currency {
  return CURRENCIES.includes(value as Currency);
}

export function validateManualHolding(input: ManualHolding): ValidationResult<ManualHolding> {
  const issues: string[] = [];
  const acquiredAt = sanitizeText(input.acquiredAt, 40);
  if (!sanitizeText(input.id, 80)) issues.push("Holding id is required.");
  if (!sanitizeText(input.assetId, 80)) issues.push("Asset id is required.");
  if (!sanitizeText(input.ticker, 24)) issues.push("Ticker is required.");
  if (!sanitizeText(input.market, 80)) issues.push("Market is required.");
  if (!(input.quantity > 0) || !Number.isFinite(input.quantity)) issues.push("Quantity must be finite and greater than zero.");
  if (!(input.averagePrice >= 0) || !Number.isFinite(input.averagePrice)) issues.push("Average price must be finite and non-negative.");
  if (!(input.fees >= 0) || !Number.isFinite(input.fees)) issues.push("Fees must be finite and non-negative.");
  if (!validCurrency(input.currency)) issues.push("Currency is not supported.");
  if (input.horizonMonths !== undefined && (!Number.isFinite(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 1_200)) issues.push("Holding horizon must be between 1 and 1,200 months.");
  if (!isIsoTimestamp(acquiredAt)) issues.push("Acquisition timestamp must be ISO-8601 UTC.");

  if (issues.length > 0) return { value: null, issues };
  return {
    value: {
      ...input,
      id: sanitizeText(input.id, 80),
      assetId: sanitizeText(input.assetId, 80),
      ticker: sanitizeText(input.ticker, 24).toUpperCase(),
      market: sanitizeText(input.market, 80),
      accountReference: input.accountReference ? sanitizeText(input.accountReference, 80) : undefined,
      thesis: input.thesis ? sanitizeText(input.thesis, 1_000) : undefined,
      reviewCondition: input.reviewCondition ? sanitizeText(input.reviewCondition, 500) : undefined,
      notes: input.notes ? sanitizeText(input.notes, 1_000) : undefined,
      quantity: clampFinite(input.quantity, 0.00000001, 1_000_000_000),
      averagePrice: clampFinite(input.averagePrice, 0, 1_000_000_000_000),
      fees: clampFinite(input.fees, 0, 1_000_000_000),
      horizonMonths: input.horizonMonths === undefined ? undefined : clampFinite(input.horizonMonths, 1, 1_200),
      acquiredAt,
    },
    issues,
  };
}

export function validatePortfolioTransaction(input: PortfolioTransaction): ValidationResult<PortfolioTransaction> {
  const issues: string[] = [];
  const occurredAt = sanitizeText(input.occurredAt, 40);
  if (!sanitizeText(input.id, 80)) issues.push("Transaction id is required.");
  if (!(["buy", "sell", "deposit", "withdrawal"] as const).includes(input.side)) issues.push("Transaction side is not supported.");
  if (!(input.quantity > 0) || !Number.isFinite(input.quantity)) issues.push("Quantity must be finite and greater than zero.");
  if (!(input.unitPrice >= 0) || !Number.isFinite(input.unitPrice)) issues.push("Unit price must be finite and non-negative.");
  if (!(input.fees >= 0) || !Number.isFinite(input.fees)) issues.push("Fees must be finite and non-negative.");
  if (!validCurrency(input.currency)) issues.push("Currency is not supported.");
  if (!isIsoTimestamp(occurredAt)) issues.push("Transaction timestamp must be ISO-8601 UTC.");
  if (["buy", "sell"].includes(input.side) && !sanitizeText(input.assetId, 80)) issues.push("Asset id is required for buys and sells.");
  if (issues.length > 0) return { value: null, issues };

  return {
    value: {
      ...input,
      id: sanitizeText(input.id, 80),
      holdingId: input.holdingId ? sanitizeText(input.holdingId, 80) : undefined,
      assetId: input.assetId ? sanitizeText(input.assetId, 80) : undefined,
      note: input.note ? sanitizeText(input.note, 500) : undefined,
      quantity: clampFinite(input.quantity, 0.00000001, 1_000_000_000),
      unitPrice: clampFinite(input.unitPrice, 0, 1_000_000_000_000),
      fees: clampFinite(input.fees, 0, 1_000_000_000),
      occurredAt,
    },
    issues,
  };
}

export function validatePortfolioSnapshot(snapshot: PortfolioSnapshot): ValidationResult<PortfolioSnapshot> {
  const issues: string[] = [];
  if (!sanitizeText(snapshot.id, 80)) issues.push("Snapshot id is required.");
  if (!isIsoTimestamp(snapshot.capturedAt)) issues.push("Snapshot timestamp must be ISO-8601 UTC.");
  if (!(snapshot.totalReferenceValue >= 0) || !Number.isFinite(snapshot.totalReferenceValue)) {
    issues.push("Snapshot total must be finite and non-negative.");
  }
  const assetIds = new Set<string>();
  let weightTotal = 0;
  let positionValueTotal = 0;
  for (const position of snapshot.positions) {
    if (!sanitizeText(position.assetId, 80)) issues.push("Every snapshot position requires an asset id.");
    if (assetIds.has(position.assetId)) issues.push(`Duplicate snapshot asset: ${position.assetId}.`);
    assetIds.add(position.assetId);
    if (!(position.quantity >= 0) || !Number.isFinite(position.quantity)) issues.push(`Invalid quantity for ${position.assetId}.`);
    if (!(position.referenceValue >= 0) || !Number.isFinite(position.referenceValue)) issues.push(`Invalid value for ${position.assetId}.`);
    if (!(position.weight >= 0) || !Number.isFinite(position.weight)) issues.push(`Invalid weight for ${position.assetId}.`);
    if (!validCurrency(position.currency)) issues.push(`Invalid currency for ${position.assetId}.`);
    weightTotal += position.weight;
    positionValueTotal += position.referenceValue;
  }
  const valueTolerance = Math.max(0.01, Math.abs(snapshot.totalReferenceValue) * 0.000001);
  if (Number.isFinite(positionValueTotal) && Math.abs(positionValueTotal - snapshot.totalReferenceValue) > valueTolerance) issues.push("Snapshot total must equal the sum of position values.");
  if (snapshot.totalReferenceValue > 0 && snapshot.positions.length > 0 && Math.abs(weightTotal - 1) > 0.0001) issues.push("Snapshot weights must normalize to 100%.");
  if (snapshot.totalReferenceValue === 0 && Math.abs(weightTotal) > 0.0001) issues.push("A zero-value snapshot must have zero position weights.");
  if (snapshot.positions.length !== snapshot.provenance.length) issues.push("Every snapshot position requires exactly one provenance record.");
  if (snapshot.provenance.some((item) => item.kind !== "mock" || item.notice === undefined || item.confidenceLabel !== "simulated" || !item.validated || !isIsoTimestamp(item.timestamp) || !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1)) {
    issues.push("Every snapshot datum must carry branded mock provenance.");
  }
  return { value: issues.length === 0 ? snapshot : null, issues };
}
