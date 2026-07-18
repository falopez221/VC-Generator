import assert from "node:assert/strict";
import test from "node:test";
import { previewBatchProgressImport, previewCatalogImport, previewProgressImport, privateImportSummary, safeCellText } from "../src/private/agent-registry/index.ts";
import { PRIVATE_AGENT_CATALOG, PRIVATE_AGENT_DOMAINS } from "../src/private/agent-registry/catalog.generated.ts";
import { recommendPrivateAgents } from "../src/private/agent-registry/recommend.ts";

test("private authenticated catalog preserves 1,970 on-demand specialists and category facets", () => {
  assert.equal(PRIVATE_AGENT_CATALOG.length, 1970);
  assert.equal(PRIVATE_AGENT_DOMAINS.length, 51);
  assert.ok(PRIVATE_AGENT_CATALOG.every((agent) => agent.executionStatus === "available_on_demand"));
  assert.ok(PRIVATE_AGENT_CATALOG.every((agent) => agent.tags.includes("research-web-authorized")));
});

test("mission prompt and sensitivity lenses route documented agents deterministically", () => {
  const first = recommendPrivateAgents(PRIVATE_AGENT_CATALOG, "Evaluate energy demand uncertainty and capital needs", ["uncertainty", "capital"]);
  const second = recommendPrivateAgents(PRIVATE_AGENT_CATALOG, "Evaluate energy demand uncertainty and capital needs", ["uncertainty", "capital"]);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.ok(first.every((agent) => agent.reasons.length > 0));
});

test("private catalog preview is deterministic and enables only authenticated on-demand execution", () => {
  const rows = [
    { "Código": "M-001", "Nombre agente": "Market Mapper", "Área": "Strategy", "Especialidad": "Market mapping", Etiquetas: "research; market" },
    { "Código": "F-001", "Nombre agente": "=Funding Scout", "Área": "Finance", "Especialidad": "Capital signals", Descripción: "<script>ignore()</script>Public sources" },
    { "Código": "M-001", "Nombre agente": "Duplicate", "Área": "Strategy", "Especialidad": "Other" },
    { "Nombre agente": "Missing domain", "Especialidad": "Review" },
  ];
  const first = previewCatalogImport(rows);
  const second = previewCatalogImport(structuredClone(rows));

  assert.deepEqual(first, second);
  assert.equal(first.acceptedCount, 2);
  assert.equal(first.rejectedCount, 2);
  assert.deepEqual(first.agents.map((agent) => agent.executionStatus), ["available_on_demand", "available_on_demand"]);
  assert.equal(first.agents[1].displayName, "'=Funding Scout");
  assert.equal(first.agents[1].capabilitySummary, "Public sources");
  assert.ok(first.agents.every((agent) => agent.catalogStatus === "documented"));
});

test("progress preview matches only documented catalog records and preserves bounds", () => {
  const catalog = previewCatalogImport([
    { Código: "M-001", Agente: "Market Mapper", Dominio: "Strategy", Especialidad: "Mapping" },
    { Código: "F-001", Agente: "Funding Scout", Dominio: "Finance", Especialidad: "Signals" },
  ]).agents;
  const progress = previewProgressImport([
    { Código: "M-001", Estado: "En progreso", Avance: "125%", Lote: "A", Fecha: "2026-07-18" },
    { Código: "F-001", Estado: "Completado", Notas: "Validated" },
    { Código: "ZZ-404", Estado: "Activo" },
    { Código: "M-001", Estado: "Bloqueado" },
  ], catalog);

  assert.equal(progress.acceptedCount, 2);
  assert.equal(progress.rejectedCount, 2);
  assert.deepEqual(progress.progress.map(({ status, completionPercent }) => ({ status, completionPercent })), [
    { status: "in_progress", completionPercent: 100 },
    { status: "completed", completionPercent: 100 },
  ]);
  assert.match(progress.progress[0].reviewedAt ?? "", /^2026-07-18T00:00:00.000Z$/);
  assert.equal(privateImportSummary({ agents: catalog, issues: [], acceptedCount: 2, rejectedCount: 0 }, progress).executableAgents, 2);
});

test("cell sanitation does not evaluate objects or preserve spreadsheet formulas", () => {
  assert.equal(safeCellText({ run: "anything" }), "");
  assert.equal(safeCellText("@SUM(A1:A2)"), "'@SUM(A1:A2)");
});

test("batch control rows map deterministic AGT identifiers without starting catalog entries", () => {
  const catalog = previewCatalogImport([
    { Nombre: "Agente uno", Dominio: "Energía", Subdominio: "Redes" },
    { Nombre: "Agente dos", Dominio: "Energía", Subdominio: "Redes" },
  ]).agents;
  const result = previewBatchProgressImport([
    { Lote: 1, "ID inicial": "AGT-0001", "ID final": "AGT-0002", Cantidad: 2, Estado: "Pendiente", Validado: "No" },
  ], catalog);

  assert.equal(result.acceptedCount, 1);
  assert.equal(result.rejectedCount, 0);
  assert.deepEqual(result.batches[0], {
    id: result.batches[0].id,
    sourceRow: 1,
    batch: "1",
    startAgentKey: "AGT-0001",
    endAgentKey: "AGT-0002",
    expectedCount: 2,
    status: "not_started",
    validated: false,
    notes: "",
    startedAt: null,
    closedAt: null,
  });
  assert.equal(catalog[0].executionStatus, "available_on_demand");
});
