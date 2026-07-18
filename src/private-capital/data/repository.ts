import type {
  DerivedInvestorProfile,
  HumanReviewRecord,
  InAppAlert,
  PortfolioSnapshot,
  PortfolioTransaction,
} from "../domain/types.ts";

export type PrivateCapitalAuditAction =
  | "access_allowed"
  | "access_denied"
  | "profile_updated"
  | "transaction_recorded"
  | "snapshot_recorded"
  | "alert_updated"
  | "review_updated";

/** Fixed metadata only: financial values and arbitrary payloads are excluded. */
export interface PrivateCapitalRepositoryAuditRecord {
  id: string;
  action: PrivateCapitalAuditAction;
  actorId: string;
  resourceKind: "access" | "profile" | "transaction" | "snapshot" | "alert" | "review";
  resourceId: string;
  outcome: "allowed" | "denied" | "recorded";
  occurredAt: string;
}

export interface OwnerScopedPrivateCapitalRepository {
  getProfile(): Promise<DerivedInvestorProfile | null>;
  saveProfile(profile: DerivedInvestorProfile): Promise<void>;
  listTransactions(): Promise<readonly PortfolioTransaction[]>;
  appendTransaction(transaction: PortfolioTransaction): Promise<void>;
  listSnapshots(): Promise<readonly PortfolioSnapshot[]>;
  appendSnapshot(snapshot: PortfolioSnapshot): Promise<void>;
  listAlerts(): Promise<readonly InAppAlert[]>;
  upsertAlert(alert: InAppAlert): Promise<void>;
  listReviews(): Promise<readonly HumanReviewRecord[]>;
  upsertReview(review: HumanReviewRecord): Promise<void>;
  listAuditRecords(): Promise<readonly PrivateCapitalRepositoryAuditRecord[]>;
  appendAuditRecord(record: PrivateCapitalRepositoryAuditRecord): Promise<void>;
}

export interface PrivateCapitalRepository {
  /** Returns a capability permanently scoped to exactly one authenticated owner. */
  forOwner(ownerId: string): OwnerScopedPrivateCapitalRepository;
}

export const D1_PRIVATE_CAPITAL_INTEGRATION_REQUIREMENTS = Object.freeze([
  "Inject a server-only D1Database binding; no verified binding exists in the current runtime.",
  "Apply reviewed migrations with owner_id NOT NULL on every table and owner-scoped indexes.",
  "Use prepared statements only and include owner_id in every SELECT, INSERT, UPDATE and DELETE predicate.",
  "Use transactions or D1 batch semantics for state changes and their immutable audit record.",
  "Define retention, backup, encryption and deletion policy before storing personal financial data.",
  "Add integration tests against the exact deployed D1 runtime, including cross-owner isolation and rollback.",
] as const);

export class PrivateCapitalPersistenceUnavailableError extends Error {
  readonly code = "PRIVATE_CAPITAL_PERSISTENCE_UNAVAILABLE";

  constructor() {
    super("Private Capital durable persistence is not configured.");
    this.name = "PrivateCapitalPersistenceUnavailableError";
  }
}

/**
 * Safe default until a runtime binding and migrations are verified. Methods do
 * not inspect, serialize or log their financial arguments before rejecting.
 */
export class UnavailablePrivateCapitalRepository implements PrivateCapitalRepository {
  forOwner(ownerId: string): OwnerScopedPrivateCapitalRepository {
    if (!isSafeOwnerId(ownerId)) throw new TypeError("Invalid Private Capital owner scope");
    const unavailable = async (): Promise<never> => {
      throw new PrivateCapitalPersistenceUnavailableError();
    };
    return {
      getProfile: unavailable,
      saveProfile: unavailable,
      listTransactions: unavailable,
      appendTransaction: unavailable,
      listSnapshots: unavailable,
      appendSnapshot: unavailable,
      listAlerts: unavailable,
      upsertAlert: unavailable,
      listReviews: unavailable,
      upsertReview: unavailable,
      listAuditRecords: unavailable,
      appendAuditRecord: unavailable,
    };
  }
}

export function isSafeOwnerId(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 3
    && value.length <= 254
    && /^[a-z0-9][a-z0-9@._+-]*$/u.test(value);
}
