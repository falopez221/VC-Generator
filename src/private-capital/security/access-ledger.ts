import {
  createPrivateCapitalAccessAuditRecord,
  type PrivateCapitalAccessAuditInput,
  type PrivateCapitalAccessAuditRecord,
} from "./audit.ts";

const MAX_RUNTIME_ACCESS_EVENTS = 200;
const runtimeAccessEvents: PrivateCapitalAccessAuditRecord[] = [];

/**
 * Records access metadata only. This bounded runtime ledger is intentionally
 * non-durable until an owner-scoped managed repository is connected.
 */
export function recordPrivateCapitalAccess(
  input: Omit<PrivateCapitalAccessAuditInput, "occurredAt"> & { occurredAt?: Date | string },
): PrivateCapitalAccessAuditRecord {
  const record = createPrivateCapitalAccessAuditRecord(input);
  runtimeAccessEvents.push(record);
  if (runtimeAccessEvents.length > MAX_RUNTIME_ACCESS_EVENTS) {
    runtimeAccessEvents.splice(0, runtimeAccessEvents.length - MAX_RUNTIME_ACCESS_EVENTS);
  }
  return record;
}

export function privateCapitalAccessLedgerSnapshot(): readonly PrivateCapitalAccessAuditRecord[] {
  return runtimeAccessEvents.map((record) => ({ ...record }));
}
