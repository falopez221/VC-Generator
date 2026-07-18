import {
  previewBatchProgressImport,
  previewCatalogImport,
  previewProgressImport,
  privateImportSummary,
} from "./import.ts";
import type {
  BatchProgressImportPreview,
  CatalogImportPreview,
  ProgressImportPreview,
} from "./types.ts";

const MAX_CATALOG_ROWS = 2_500;
const MAX_PROGRESS_ROWS = 10_000;
const MAX_ROW_FIELDS = 32;
const FORBIDDEN_FIELD = /url|uri|path|file|macro|script|binary|workbook/i;

export class PrivateRegistryImportError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type PrivateRegistryImportPlan = Readonly<{
  dryRun: boolean;
  catalog: CatalogImportPreview;
  progress: ProgressImportPreview;
  batches: BatchProgressImportPreview;
  summary: ReturnType<typeof privateImportSummary> & {
    batches: { accepted: number; rejected: number };
  };
}>;

type ImportPayload = Readonly<{
  catalogRows: readonly unknown[];
  progressRows: readonly unknown[];
  dryRun: boolean;
}>;

/**
 * This accepts decoded spreadsheet cells only.  Parsing files, following URLs,
 * and processing macro/workbook data intentionally happen nowhere in the web
 * application: an administrator must decode a reviewed export first.
 */
export function createPrivateRegistryImportPlan(value: unknown): PrivateRegistryImportPlan {
  const payload = normalizeImportPayload(value);
  const catalog = previewCatalogImport(payload.catalogRows);
  const progress = previewProgressImport(payload.progressRows, catalog.agents);
  const batches = previewBatchProgressImport(payload.progressRows, catalog.agents);
  const baseSummary = privateImportSummary(catalog, progress);

  return {
    dryRun: payload.dryRun,
    catalog,
    progress,
    batches,
    summary: {
      ...baseSummary,
      batches: { accepted: batches.acceptedCount, rejected: batches.rejectedCount },
    },
  };
}

function normalizeImportPayload(value: unknown): ImportPayload {
  if (!isPlainObject(value)) {
    throw new PrivateRegistryImportError("The import body must be a JSON object.");
  }
  const keys = Object.keys(value);
  if (keys.some((key) => !["catalogRows", "progressRows", "dryRun"].includes(key))) {
    throw new PrivateRegistryImportError("Only catalogRows, progressRows and dryRun are accepted.");
  }
  const catalogRows = value.catalogRows;
  const progressRows = value.progressRows ?? [];
  if (!Array.isArray(catalogRows) || catalogRows.length === 0 || catalogRows.length > MAX_CATALOG_ROWS) {
    throw new PrivateRegistryImportError(`catalogRows must contain between 1 and ${MAX_CATALOG_ROWS} decoded rows.`);
  }
  if (!Array.isArray(progressRows) || progressRows.length > MAX_PROGRESS_ROWS) {
    throw new PrivateRegistryImportError(`progressRows may contain at most ${MAX_PROGRESS_ROWS} decoded rows.`);
  }
  validateRows(catalogRows, "catalogRows");
  validateRows(progressRows, "progressRows");
  if (value.dryRun !== undefined && typeof value.dryRun !== "boolean") {
    throw new PrivateRegistryImportError("dryRun must be a boolean when supplied.");
  }
  return { catalogRows, progressRows, dryRun: value.dryRun === true };
}

function validateRows(rows: readonly unknown[], label: string) {
  rows.forEach((row, index) => {
    if (!isPlainObject(row)) {
      throw new PrivateRegistryImportError(`${label}[${index}] must be a decoded object row.`);
    }
    const fields = Object.entries(row);
    if (fields.length > MAX_ROW_FIELDS) {
      throw new PrivateRegistryImportError(`${label}[${index}] has too many fields.`);
    }
    for (const [key, cell] of fields) {
      if (FORBIDDEN_FIELD.test(key)) {
        throw new PrivateRegistryImportError(`${label}[${index}] contains a forbidden file, URL, or macro field.`);
      }
      if (cell !== null && !["string", "number", "boolean"].includes(typeof cell)) {
        throw new PrivateRegistryImportError(`${label}[${index}] contains non-cell data.`);
      }
    }
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
