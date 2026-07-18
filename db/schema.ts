import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Private-only catalog metadata. Rows describe an approved inventory; they do
 * not grant an agent permission to execute work. This schema is deliberately
 * not imported by public routes or the public Lab.
 */
export const privateCatalogAgents = sqliteTable("private_catalog_agents", {
  id: text("id").primaryKey(),
  sourceKey: text("source_key").notNull().unique(),
  sourceRow: integer("source_row").notNull(),
  displayName: text("display_name").notNull(),
  domain: text("domain").notNull(),
  specialization: text("specialization").notNull(),
  capabilitySummary: text("capability_summary").notNull().default(""),
  tagsJson: text("tags_json").notNull().default("[]"),
  catalogStatus: text("catalog_status").notNull().default("documented"),
  executionStatus: text("execution_status").notNull().default("not_executable"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Operational tracking imported from the private progress workbook/CSV. */
export const privateAgentProgress = sqliteTable("private_agent_progress", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().references(() => privateCatalogAgents.id),
  sourceRow: integer("source_row").notNull(),
  batch: text("batch").notNull().default(""),
  status: text("status").notNull().default("not_started"),
  completionPercent: integer("completion_percent").notNull().default(0),
  notes: text("notes").notNull().default(""),
  reviewedAt: text("reviewed_at"),
  updatedAt: text("updated_at").notNull(),
});

/** Batch control rows imported from progreso.csv; these are audit metadata, not executions. */
export const privateProgressBatches = sqliteTable("private_progress_batches", {
  id: text("id").primaryKey(),
  sourceRow: integer("source_row").notNull(),
  batch: text("batch").notNull().unique(),
  startAgentKey: text("start_agent_key").notNull(),
  endAgentKey: text("end_agent_key").notNull(),
  expectedCount: integer("expected_count").notNull(),
  status: text("status").notNull().default("not_started"),
  validated: integer("validated", { mode: "boolean" }).notNull().default(false),
  notes: text("notes").notNull().default(""),
  startedAt: text("started_at"),
  closedAt: text("closed_at"),
  updatedAt: text("updated_at").notNull(),
});
