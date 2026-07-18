import type { BatchProgressImportPreview, CatalogImportPreview, ImportIssue, PrivateAgentProgress, PrivateCatalogAgent, PrivateProgressBatch, ProgressImportPreview, ProgressStatus, TextRow } from "./types.ts";
import { boundedInteger, deterministicId, isIsoDate, readFirst, splitTags, textRow } from "./validation.ts";

const NAME = ["agent", "agente", "agent_name", "nombre", "nombre_agente", "name"];
const DOMAIN = ["domain", "dominio", "area", "categoria", "discipline", "disciplina"];
const SPECIALIZATION = ["specialization", "specialty", "especialidad", "subdomain", "subdominio", "role", "rol", "focus", "foco"];
const DESCRIPTION = ["description", "descripcion", "summary", "resumen", "capability", "capacidad"];
const TAGS = ["tags", "tag", "keywords", "palabras_clave", "etiquetas"];
const SOURCE_KEY = ["agent_id", "source_id", "codigo", "code", "id"];
const BATCH = ["batch", "lote", "grupo"];
const PROGRESS = ["progress", "progreso", "completion", "completion_percent", "avance", "porcentaje"];
const STATUS = ["status", "estado"];
const NOTES = ["notes", "note", "observaciones", "observation", "notas"];
const REVIEWED_AT = ["reviewed_at", "fecha_revision", "review_date", "fecha"];
const START_AGENT = ["id_inicial", "start_id", "start_agent", "agent_start"];
const END_AGENT = ["id_final", "end_id", "end_agent", "agent_end"];
const EXPECTED_COUNT = ["cantidad", "expected_count", "count", "pdfs_esperados"];
const VALIDATED = ["validado", "validated"];
const STARTED_AT = ["fecha_de_inicio", "started_at", "start_date"];
const CLOSED_AT = ["fecha_de_cierre", "closed_at", "close_date"];

function issue(sourceRow: number, code: ImportIssue["code"], message: string): ImportIssue {
  return { sourceRow, code, message };
}

function sourceKeyFrom(row: TextRow, sourceRow: number) {
  return readFirst(row, SOURCE_KEY, 120) || `AGT-${String(sourceRow).padStart(4, "0")}`;
}

/**
 * Builds a reviewable preview from already-decoded CSV/XLSX rows. File parsing,
 * formula execution, macros and arbitrary input execution are intentionally out
 * of scope: callers must pass plain object rows only.
 */
export function previewCatalogImport(rows: readonly unknown[]): CatalogImportPreview {
  const agents: PrivateCatalogAgent[] = [];
  const issues: ImportIssue[] = [];
  const seenSourceKeys = new Set<string>();

  rows.forEach((rawRow, index) => {
    const sourceRow = index + 1;
    const row = textRow(rawRow);
    const displayName = readFirst(row, NAME, 140);
    const domain = readFirst(row, DOMAIN, 120);
    const specialization = readFirst(row, SPECIALIZATION, 180);
    if (!displayName) return void issues.push(issue(sourceRow, "missing_name", "The catalog row needs an agent name."));
    if (!domain) return void issues.push(issue(sourceRow, "missing_domain", "The catalog row needs a domain."));
    if (!specialization) return void issues.push(issue(sourceRow, "missing_specialization", "The catalog row needs a specialization."));
    const sourceKey = sourceKeyFrom(row, sourceRow);
    const normalizedSourceKey = sourceKey.toLocaleLowerCase("en-US");
    if (seenSourceKeys.has(normalizedSourceKey)) {
      issues.push(issue(sourceRow, "duplicate_agent", "The catalog row duplicates an earlier source key."));
      return;
    }
    seenSourceKeys.add(normalizedSourceKey);
    agents.push({
      id: deterministicId("agent", [sourceKey]),
      sourceKey,
      sourceRow,
      displayName,
      domain,
      specialization,
      capabilitySummary: readFirst(row, DESCRIPTION, 600),
      tags: splitTags(readFirst(row, TAGS, 600)),
      catalogStatus: "documented",
      executionStatus: "available_on_demand",
    });
  });
  return { agents, issues, acceptedCount: agents.length, rejectedCount: issues.length };
}

function normalizeProgressStatus(value: string): ProgressStatus | null {
  const candidate = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "_");
  if (["complete", "completed", "completo", "completado", "hecho", "done"].includes(candidate)) return "completed";
  if (["in_progress", "progress", "en_progreso", "activo", "active"].includes(candidate)) return "in_progress";
  if (["needs_review", "review", "requiere_revision", "pendiente_revision"].includes(candidate)) return "needs_review";
  if (["blocked", "bloqueado", "block"].includes(candidate)) return "blocked";
  if (["not_started", "pending", "pendiente", "no_iniciado", ""].includes(candidate)) return "not_started";
  return null;
}

/** Maps a progress CSV preview to existing catalog records without changing runtime availability. */
export function previewProgressImport(rows: readonly unknown[], catalog: readonly PrivateCatalogAgent[]): ProgressImportPreview {
  const progress: PrivateAgentProgress[] = [];
  const issues: ImportIssue[] = [];
  const agentsBySourceKey = new Map(catalog.map((agent) => [agent.sourceKey.toLocaleLowerCase("en-US"), agent]));
  const agentsByName = new Map(catalog.map((agent) => [agent.displayName.toLocaleLowerCase("en-US"), agent]));
  const seenAgentIds = new Set<string>();

  rows.forEach((rawRow, index) => {
    const sourceRow = index + 1;
    const row = textRow(rawRow);
    const key = readFirst(row, SOURCE_KEY, 120);
    const name = readFirst(row, NAME, 140);
    const agent = (key && agentsBySourceKey.get(key.toLocaleLowerCase("en-US"))) || (name && agentsByName.get(name.toLocaleLowerCase("en-US")));
    if (!agent) {
      issues.push(issue(sourceRow, "unmatched_progress", "The progress row does not match a catalog agent."));
      return;
    }
    if (seenAgentIds.has(agent.id)) {
      issues.push(issue(sourceRow, "invalid_progress", "Only one progress row per catalog agent is accepted."));
      return;
    }
    const rawStatus = readFirst(row, STATUS, 60);
    const status = normalizeProgressStatus(rawStatus);
    if (!status) {
      issues.push(issue(sourceRow, "invalid_progress", "The progress status is not recognized."));
      return;
    }
    const completionPercent = boundedInteger(readFirst(row, PROGRESS, 20), status === "completed" ? 100 : 0, 0, 100);
    const reviewedValue = readFirst(row, REVIEWED_AT, 40);
    const reviewedAt = isIsoDate(reviewedValue) ? new Date(reviewedValue).toISOString() : null;
    seenAgentIds.add(agent.id);
    progress.push({
      id: deterministicId("progress", [agent.id]),
      agentId: agent.id,
      sourceRow,
      batch: readFirst(row, BATCH, 100),
      status,
      completionPercent,
      notes: readFirst(row, NOTES, 600),
      reviewedAt,
    });
  });
  return { progress, issues, acceptedCount: progress.length, rejectedCount: issues.length };
}

/**
 * Reads the batch-oriented progreso.csv control file. It records operational
 * status without starting an execution or changing runtime permissions.
 */
export function previewBatchProgressImport(rows: readonly unknown[], catalog: readonly PrivateCatalogAgent[]): BatchProgressImportPreview {
  const batches: PrivateProgressBatch[] = [];
  const issues: ImportIssue[] = [];
  const knownKeys = new Set(catalog.map((agent) => agent.sourceKey));
  const seenBatches = new Set<string>();

  rows.forEach((rawRow, index) => {
    const sourceRow = index + 1;
    const row = textRow(rawRow);
    const batch = readFirst(row, BATCH, 100);
    const startAgentKey = readFirst(row, START_AGENT, 20).toUpperCase();
    const endAgentKey = readFirst(row, END_AGENT, 20).toUpperCase();
    const expectedCount = boundedInteger(readFirst(row, EXPECTED_COUNT, 20), 0, 1, 10_000);
    const status = normalizeProgressStatus(readFirst(row, STATUS, 60));
    const startNumber = Number(startAgentKey.replace(/^AGT-/, ""));
    const endNumber = Number(endAgentKey.replace(/^AGT-/, ""));
    if (!batch || !/^AGT-\d{4}$/.test(startAgentKey) || !/^AGT-\d{4}$/.test(endAgentKey) || !Number.isInteger(startNumber) || !Number.isInteger(endNumber) || startNumber > endNumber || !status) {
      issues.push(issue(sourceRow, "invalid_batch", "The progress batch requires a valid lot, AGT start/end range and recognized status."));
      return;
    }
    if (seenBatches.has(batch) || !knownKeys.has(startAgentKey) || !knownKeys.has(endAgentKey)) {
      issues.push(issue(sourceRow, "invalid_batch", "The progress batch is duplicated or does not map to catalog agent keys."));
      return;
    }
    const rangeCount = endNumber - startNumber + 1;
    if (expectedCount && expectedCount !== rangeCount) {
      issues.push(issue(sourceRow, "invalid_batch", "The expected count does not match the agent ID range."));
      return;
    }
    seenBatches.add(batch);
    const validated = ["si", "yes", "true", "1"].includes(readFirst(row, VALIDATED, 20).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
    const startedValue = readFirst(row, STARTED_AT, 40);
    const closedValue = readFirst(row, CLOSED_AT, 40);
    batches.push({
      id: deterministicId("batch", [batch, startAgentKey, endAgentKey]),
      sourceRow,
      batch,
      startAgentKey,
      endAgentKey,
      expectedCount: expectedCount || rangeCount,
      status,
      validated,
      notes: readFirst(row, NOTES, 600),
      startedAt: isIsoDate(startedValue) ? new Date(startedValue).toISOString() : null,
      closedAt: isIsoDate(closedValue) ? new Date(closedValue).toISOString() : null,
    });
  });
  return { batches, issues, acceptedCount: batches.length, rejectedCount: issues.length };
}

/** A small serializable summary suitable for a private operator review screen. */
export function privateImportSummary(catalogPreview: CatalogImportPreview, progressPreview: ProgressImportPreview) {
  return {
    catalog: { accepted: catalogPreview.acceptedCount, rejected: catalogPreview.rejectedCount },
    progress: { accepted: progressPreview.acceptedCount, rejected: progressPreview.rejectedCount },
    executableAgents: catalogPreview.agents.filter((agent) => agent.executionStatus === "available_on_demand").length,
  } as const;
}
