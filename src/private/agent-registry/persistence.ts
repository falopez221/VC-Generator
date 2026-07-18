import type { PrivateRegistryImportPlan } from "./request.ts";

const CATALOG_SQL = `INSERT INTO private_catalog_agents
  (id, source_key, source_row, display_name, domain, specialization, capability_summary, tags_json, catalog_status, execution_status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_key) DO UPDATE SET
    id = excluded.id, source_row = excluded.source_row, display_name = excluded.display_name,
    domain = excluded.domain, specialization = excluded.specialization,
    capability_summary = excluded.capability_summary, tags_json = excluded.tags_json,
    catalog_status = excluded.catalog_status, execution_status = excluded.execution_status,
    updated_at = excluded.updated_at`;

const PROGRESS_SQL = `INSERT INTO private_agent_progress
  (id, agent_id, source_row, batch, status, completion_percent, notes, reviewed_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    agent_id = excluded.agent_id, source_row = excluded.source_row, batch = excluded.batch,
    status = excluded.status, completion_percent = excluded.completion_percent,
    notes = excluded.notes, reviewed_at = excluded.reviewed_at, updated_at = excluded.updated_at`;

const BATCH_SQL = `INSERT INTO private_progress_batches
  (id, source_row, batch, start_agent_key, end_agent_key, expected_count, status, validated, notes, started_at, closed_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(batch) DO UPDATE SET
    id = excluded.id, source_row = excluded.source_row, start_agent_key = excluded.start_agent_key,
    end_agent_key = excluded.end_agent_key, expected_count = excluded.expected_count,
    status = excluded.status, validated = excluded.validated, notes = excluded.notes,
    started_at = excluded.started_at, closed_at = excluded.closed_at, updated_at = excluded.updated_at`;

const D1_BATCH_SIZE = 90;
type BoundStatement = { bind: (...values: unknown[]) => BoundStatement };
type PrivateRegistryDatabase = {
  $client: {
    prepare: (query: string) => BoundStatement;
    batch: (statements: BoundStatement[]) => Promise<unknown>;
  };
};

/** Persists only the normalized preview; raw spreadsheet cells are never stored. */
export async function persistPrivateRegistryImport(db: PrivateRegistryDatabase, plan: PrivateRegistryImportPlan, now = new Date().toISOString()) {
  const statements = [
    ...plan.catalog.agents.map((agent) => db.$client.prepare(CATALOG_SQL).bind(
      agent.id, agent.sourceKey, agent.sourceRow, agent.displayName, agent.domain,
      agent.specialization, agent.capabilitySummary, JSON.stringify(agent.tags),
      agent.catalogStatus, agent.executionStatus, now, now,
    )),
    ...plan.progress.progress.map((progress) => db.$client.prepare(PROGRESS_SQL).bind(
      progress.id, progress.agentId, progress.sourceRow, progress.batch, progress.status,
      progress.completionPercent, progress.notes, progress.reviewedAt, now,
    )),
    ...plan.batches.batches.map((batch) => db.$client.prepare(BATCH_SQL).bind(
      batch.id, batch.sourceRow, batch.batch, batch.startAgentKey, batch.endAgentKey,
      batch.expectedCount, batch.status, batch.validated ? 1 : 0, batch.notes,
      batch.startedAt, batch.closedAt, now,
    )),
  ];
  for (const chunk of chunks(statements, D1_BATCH_SIZE)) {
    await db.$client.batch(chunk);
  }
  return { catalog: plan.catalog.acceptedCount, progress: plan.progress.acceptedCount, batches: plan.batches.acceptedCount };
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
