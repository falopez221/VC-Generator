/**
 * Private registry types. A catalog record is intentionally descriptive: it
 * never contains prompts, credentials, executable code, or a provider config.
 */
export const CATALOG_STATUS = ["documented"] as const;
export const EXECUTION_STATUS = ["not_executable"] as const;
export const PROGRESS_STATUS = ["not_started", "in_progress", "needs_review", "blocked", "completed"] as const;

export type CatalogStatus = (typeof CATALOG_STATUS)[number];
export type ExecutionStatus = (typeof EXECUTION_STATUS)[number];
export type ProgressStatus = (typeof PROGRESS_STATUS)[number];
export type TextRow = Readonly<Record<string, unknown>>;

export type PrivateCatalogAgent = Readonly<{
  id: string;
  sourceKey: string;
  sourceRow: number;
  displayName: string;
  domain: string;
  specialization: string;
  capabilitySummary: string;
  tags: readonly string[];
  catalogStatus: CatalogStatus;
  executionStatus: ExecutionStatus;
}>;

export type PrivateAgentProgress = Readonly<{
  id: string;
  agentId: string;
  sourceRow: number;
  batch: string;
  status: ProgressStatus;
  completionPercent: number;
  notes: string;
  reviewedAt: string | null;
}>;

/** Batch-level status from the master progress control file. */
export type PrivateProgressBatch = Readonly<{
  id: string;
  sourceRow: number;
  batch: string;
  startAgentKey: string;
  endAgentKey: string;
  expectedCount: number;
  status: ProgressStatus;
  validated: boolean;
  notes: string;
  startedAt: string | null;
  closedAt: string | null;
}>;

export type ImportIssue = Readonly<{
  sourceRow: number;
  code: "missing_name" | "missing_domain" | "missing_specialization" | "duplicate_agent" | "unmatched_progress" | "invalid_progress" | "invalid_batch";
  message: string;
}>;

export type CatalogImportPreview = Readonly<{
  agents: readonly PrivateCatalogAgent[];
  issues: readonly ImportIssue[];
  acceptedCount: number;
  rejectedCount: number;
}>;

export type ProgressImportPreview = Readonly<{
  progress: readonly PrivateAgentProgress[];
  issues: readonly ImportIssue[];
  acceptedCount: number;
  rejectedCount: number;
}>;

export type BatchProgressImportPreview = Readonly<{
  batches: readonly PrivateProgressBatch[];
  issues: readonly ImportIssue[];
  acceptedCount: number;
  rejectedCount: number;
}>;
