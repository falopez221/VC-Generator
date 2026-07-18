import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const mode = process.argv[2] ?? "--tracked";
const forbiddenPaths = [
  ".sites-publish-index",
  "app/api/private/agents/[id]/route.ts",
  "src/platform/private-registry-provider.ts",
  "output/pdf/venture-intelligence-os-whitepaper.pdf",
  "public/og-cognitive.png",
  "public/og.png",
  "public/documents/venture-intelligence-whitepaper.pdf",
  "scripts/generate-private-catalog.cjs",
  "src/private/agent-execution/service.ts",
  "src/private/agent-registry/catalog.generated.ts",
];
const forbiddenPathPrefixes = [
  "app/api/private/registry/",
  "assets/whitepaper-2026/",
  "src/private/agent-registry/",
];
const secretContent = [
  ["private key material", /-----BEGIN (?:EC |OPENSSH |PGP |RSA )?PRIVATE KEY-----/u],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u],
  ["GitHub access token", /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{36,255}\b/u],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{35}\b/u],
  ["OpenAI-style access token", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u],
  ["Slack access token", /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{16,}\b/u],
];
const forbiddenContent = [
  ["embedded private catalog constant", /PRIVATE_AGENT_CATALOG/u],
  ["private registry provider setting", /VG_PRIVATE_REGISTRY_/u],
  ["private registry provider implementation", /PrivateRegistryProviderError/u],
  ["private provider model setting", /VG_PRIVATE_AGENT_MODEL/u],
  ["private provider credential setting", /OPENAI_API_KEY/u],
  ["direct private provider endpoint", /api\.openai\.com\/v1\/responses/u],
  ["private inventory workbook name", /indice_maestro\.xlsx/iu],
  ["private inventory archive name", /Biblioteca_Agentes_inicial/iu],
  ["private catalog terminal identifier", /AGT-1970/u],
  ...secretContent,
];
const artifactRoots = [
  "dist",
  path.join(".next", "server"),
  path.join(".next", "static"),
  path.join(".next", "standalone"),
];
const maximumScanBytes = 50 * 1024 * 1024;
const maximumIgnoredTextBytes = 2 * 1024 * 1024;
const checkerPath = "scripts/security-boundary-check.mjs";
const restrictedBinaryExtensions = new Set([".7z", ".exe", ".gz", ".pdf", ".rar", ".tar", ".tgz", ".xls", ".xlsx", ".zip"]);
const ignoredTextExtensions = new Set([".json", ".log", ".md", ".srt", ".txt"]);
const localWorkstationPath = /(?:[A-Za-z]:\\Users\\[^\\\r\n]+\\|\/Users\/[^/\r\n]+\/|\/home\/[^/\r\n]+\/|codex-runtimes)/iu;

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function candidateSourceFiles() {
  const result = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr || result.error || "unknown error"}`);
  return result.stdout.split("\0").filter(Boolean);
}

function filesUnder(relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files = [];
  const pending = [absoluteRoot];
  while (pending.length > 0) {
    const current = pending.pop();
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Refusing to scan a linked artifact path: ${current}`);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) pending.push(path.join(current, entry));
    } else if (stat.isFile()) {
      files.push(normalize(path.relative(root, current)));
    }
  }
  return files;
}

function assertNoIgnoredRepositoryCopies() {
  const findings = [];
  const workRoot = path.join(root, "work");
  for (const relativePath of [
    ".sites-package-stage",
    ".sites-publish-index",
    "work/agent-library-audit",
    "tmp/pdfs/original",
    "tmp/pdfs/v2",
  ]) {
    if (fs.existsSync(path.join(root, relativePath))) {
      findings.push(`${relativePath}: retired or generated private-document derivatives must not remain in the public repository tree`);
    }
  }
  if (fs.existsSync(workRoot)) {
    for (const entry of fs.readdirSync(workRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativePath = normalize(path.join("work", entry.name));
      const absolutePath = path.join(workRoot, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        findings.push(`${relativePath}: linked work directories are not allowed`);
        continue;
      }
      if (/^sites-release-/iu.test(entry.name) || fs.existsSync(path.join(absolutePath, ".git"))) {
        findings.push(`${relativePath}: ignored repository or release clone is forbidden`);
      }
    }
  }
  for (const ignoredRoot of ["tmp", "work", "output", "outputs", "valuation"]) {
    if (!fs.existsSync(path.join(root, ignoredRoot))) continue;
    for (const relativePath of filesUnder(ignoredRoot)) {
      if (/\.(?:7z|rar|tar|tar\.gz|tgz|zip)$/iu.test(relativePath)) {
        findings.push(`${relativePath}: ignored opaque archive is forbidden`);
      }
      const absolutePath = path.join(root, relativePath);
      const extension = path.extname(relativePath).toLowerCase();
      const stat = fs.statSync(absolutePath);
      if (ignoredTextExtensions.has(extension) && stat.size <= maximumIgnoredTextBytes) {
        const content = fs.readFileSync(absolutePath, "utf8");
        if (localWorkstationPath.test(content)) findings.push(`${relativePath}: local workstation path or runtime location is forbidden`);
        for (const [label, pattern] of secretContent) {
          if (pattern.test(content)) findings.push(`${relativePath}: ${label}`);
        }
      }
    }
  }
  const outputPdfRoot = path.join(root, "output", "pdf");
  if (fs.existsSync(outputPdfRoot)) {
    for (const entry of fs.readdirSync(outputPdfRoot, { withFileTypes: true })) {
      if (entry.isFile() && /whitepaper.*\.pdf$/iu.test(entry.name)) {
        findings.push(`${normalize(path.join("output", "pdf", entry.name))}: retired whitepaper output is forbidden`);
      }
    }
  }
  if (findings.length > 0) throw new Error(`Ignored workspace boundary check failed:\n- ${findings.join("\n- ")}`);
}

function scan(files) {
  const findings = [];
  for (const relativePath of files) {
    const normalizedPath = normalize(relativePath);
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    if (forbiddenPaths.includes(normalizedPath) || forbiddenPathPrefixes.some((prefix) => normalizedPath.startsWith(prefix))) {
      findings.push(`${normalizedPath}: forbidden public path`);
    }
    if (normalizedPath === checkerPath) continue;
    const stat = fs.lstatSync(absolutePath);
    if (stat.isSymbolicLink()) {
      findings.push(`${normalizedPath}: linked source paths are forbidden`);
      continue;
    }
    if (!stat.isFile()) continue;
    const extension = path.extname(normalizedPath).toLowerCase();
    if (restrictedBinaryExtensions.has(extension)) {
      findings.push(`${normalizedPath}: unapproved archive, executable or opaque document`);
      continue;
    }
    if (stat.size > maximumScanBytes) {
      findings.push(`${normalizedPath}: file exceeds the closed-fail scan limit`);
      continue;
    }
    const content = fs.readFileSync(absolutePath).toString("utf8");
    for (const [label, pattern] of forbiddenContent) {
      if (pattern.test(content)) findings.push(`${normalizedPath}: ${label}`);
    }
  }
  if (findings.length > 0) throw new Error(`Public/private boundary check failed:\n- ${findings.join("\n- ")}`);
  return files.length;
}

if (mode === "--tracked") {
  assertNoIgnoredRepositoryCopies();
  console.log(`Security boundary check passed for ${scan(candidateSourceFiles())} tracked and untracked public source paths.`);
} else if (mode === "--artifacts") {
  assertNoIgnoredRepositoryCopies();
  const files = artifactRoots.flatMap(filesUnder);
  if (files.length === 0) throw new Error("No production artifacts were found to inspect.");
  console.log(`Security boundary check passed for ${scan(files)} production artifact paths.`);
} else if (mode === "--package") {
  assertNoIgnoredRepositoryCopies();
  const privateInventory = path.join(root, "work", "agent-library-source");
  if (fs.existsSync(privateInventory)) {
    throw new Error("Packaging is blocked while the private source inventory remains inside the public repository tree. Move it to approved restricted storage first.");
  }
  console.log(`Security package boundary check passed for ${scan(candidateSourceFiles())} tracked and untracked public source paths.`);
} else {
  throw new Error(`Unknown security-boundary mode: ${mode}`);
}
