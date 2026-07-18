/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const xlsx = require("xlsx");

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error("Usage: node scripts/generate-private-catalog.cjs <source.xlsx> <output.ts>");

const workbook = xlsx.readFile(source, { cellFormula: false, cellHTML: false, bookVBA: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "", raw: false });
const text = (value) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

const agents = rows.map((row, index) => {
  const domain = text(row.Dominio);
  const specialization = text(row.Subdominio);
  const id = `AGT-${String(index + 1).padStart(4, "0")}`;
  return {
    id,
    sourceKey: id,
    sourceRow: index + 2,
    displayName: text(row.Nombre),
    domain,
    specialization,
    capabilitySummary: text(row.Descripción),
    tags: [domain, specialization, "research-web-authorized"],
    catalogStatus: "documented",
    executionStatus: "available_on_demand",
  };
});

const domains = [...new Set(agents.map((agent) => agent.domain))].sort((left, right) => left.localeCompare(right, "es"));
const outputSource = `// Generated locally from the administrator-provided master catalog.\n// This module is imported only by authenticated server routes.\nimport type { PrivateCatalogAgent } from "./types.ts";\n\nexport const PRIVATE_AGENT_CATALOG = ${JSON.stringify(agents, null, 2)} as const satisfies readonly PrivateCatalogAgent[];\n\nexport const PRIVATE_AGENT_DOMAINS = ${JSON.stringify(domains, null, 2)} as const;\n`;
fs.writeFileSync(output, outputSource, "utf8");
console.log(JSON.stringify({ agents: agents.length, domains: domains.length, output }));
