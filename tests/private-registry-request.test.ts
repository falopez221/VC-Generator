import assert from "node:assert/strict";
import test from "node:test";
import { createPrivateRegistryImportPlan, PrivateRegistryImportError } from "../src/private/agent-registry/request.ts";

const catalogRows = [
  { Codigo: "AGT-0001", Nombre: "Evidence Mapper", Dominio: "Strategy", Especialidad: "Market mapping" },
  { Codigo: "AGT-0002", Nombre: "Unit Economics", Dominio: "Finance", Especialidad: "Scenarios" },
];

test("private registry request creates a safe dry-run plan from decoded rows", () => {
  const plan = createPrivateRegistryImportPlan({
    catalogRows,
    progressRows: [{ Lote: "A", "ID inicial": "AGT-0001", "ID final": "AGT-0002", Cantidad: 2, Estado: "Pendiente" }],
    dryRun: true,
  });
  assert.equal(plan.dryRun, true);
  assert.deepEqual(plan.summary, {
    catalog: { accepted: 2, rejected: 0 },
    progress: { accepted: 0, rejected: 1 },
    batches: { accepted: 1, rejected: 0 },
    executableAgents: 2,
  });
});

test("private registry request rejects file, URL, and macro-shaped payloads", () => {
  for (const payload of [
    { catalogRows, sourcePath: "C:/secret.xlsx" },
    { catalogRows: [{ ...catalogRows[0], URL: "https://example.invalid" }] },
    { catalogRows: [{ ...catalogRows[0], macroData: "anything" }] },
    { catalogRows: [{ ...catalogRows[0], data: { nested: true } }] },
  ]) {
    assert.throws(() => createPrivateRegistryImportPlan(payload), PrivateRegistryImportError);
  }
});
