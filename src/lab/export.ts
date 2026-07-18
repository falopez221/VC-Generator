const FORMULA_PREFIX = /^[\s\uFEFF]*[=+\-@]/u;
const CONTROL_PREFIX = /^[\u0009\u000a\u000d]/;

/**
 * Quotes a CSV cell and prevents spreadsheet software from interpreting
 * user-controlled text as a formula when the exported file is opened.
 */
export function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const neutralized = FORMULA_PREFIX.test(raw) || CONTROL_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function buildCsv(rows: readonly (readonly unknown[])[]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
