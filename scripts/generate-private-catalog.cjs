/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const ExcelJS = require("exceljs");

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Usage: node scripts/generate-private-catalog.cjs <source.xlsx> <output.ts>");

const text = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
const headerKey = (value) => text(value).normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_CATALOG_ROWS = 5_000;

async function readCatalogRows() {
  if (path.extname(source).toLowerCase() !== ".xlsx") throw new Error("Only .xlsx catalog files are accepted.");
  const sourceStats = fs.statSync(source);
  if (!sourceStats.isFile() || sourceStats.size > MAX_SOURCE_BYTES) throw new Error("The catalog must be a regular .xlsx file no larger than 25 MB.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(source);
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2 || sheet.rowCount > MAX_CATALOG_ROWS + 1) throw new Error(`The catalog must contain between 1 and ${MAX_CATALOG_ROWS} data rows.`);

  const headers = new Map();
  sheet.getRow(1).eachCell((cell, column) => headers.set(headerKey(cell.text), column));
  const valueAt = (row, header) => {
    const column = headers.get(headerKey(header));
    return column ? text(row.getCell(column).text) : "";
  };
  const rows = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = valueAt(row, "Nombre");
    if (!name) continue;
    rows.push({ sourceRow: rowNumber, name, domain: valueAt(row, "Dominio"), specialization: valueAt(row, "Subdominio"), description: valueAt(row, "Descripcion") });
  }
  if (!rows.length) throw new Error("The catalog has no readable agent rows.");
  return rows;
}

async function main() {
  const rows = await readCatalogRows();
  const agents = rows.map((row, index) => {
    const id = `AGT-${String(index + 1).padStart(4, "0")}`;
    return {
      id,
      sourceKey: id,
      sourceRow: row.sourceRow,
      displayName: row.name,
      domain: row.domain,
      specialization: row.specialization,
      capabilitySummary: row.description,
      tags: [row.domain, row.specialization, "research-web-authorized"],
      catalogStatus: "documented",
      executionStatus: "available_on_demand",
    };
  });

  const domains = [...new Set(agents.map((agent) => agent.domain))].sort((left, right) => left.localeCompare(right, "es"));
  const outputSource = `// Generated locally from the administrator-provided master catalog.\n// This module is imported only by authenticated server routes.\nimport type { PrivateCatalogAgent } from "./types.ts";\n\nexport const PRIVATE_AGENT_CATALOG = ${JSON.stringify(agents, null, 2)} as const satisfies readonly PrivateCatalogAgent[];\n\nexport const PRIVATE_AGENT_DOMAINS = ${JSON.stringify(domains, null, 2)} as const;\n`;
  fs.writeFileSync(output, outputSource, "utf8");
  console.log(JSON.stringify({ agents: agents.length, domains: domains.length, output }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Catalog generation failed safely.");
  process.exitCode = 1;
});
