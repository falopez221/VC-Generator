import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PUBLIC_AGENT_NAMES } from "../src/lab/aerial-simulation/index.ts";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE_ROUTE = path.join(
  REPOSITORY_ROOT,
  "app",
  "app",
  "(protected)",
  "aerial-simulation",
  "page.tsx",
);
const PRIVATE_COMPONENT = path.join(
  REPOSITORY_ROOT,
  "src",
  "platform",
  "components",
  "PrivateAerialSimulation.tsx",
);
const PROTECTED_LAYOUT = path.join(REPOSITORY_ROOT, "app", "app", "(protected)", "layout.tsx");
const DEDICATED_LAYOUT = path.join(
  REPOSITORY_ROOT,
  "app",
  "app",
  "(protected)",
  "aerial-simulation",
  "layout.tsx",
);
const PLATFORM_LAYOUT = path.join(REPOSITORY_ROOT, "app", "app", "layout.tsx");

function readSource(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function sourceFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(entryPath);
    return /\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) ? [entryPath] : [];
  });
}

test("aerial simulation route is covered by the shared and dedicated server gates", () => {
  const unprotectedRoute = path.join(REPOSITORY_ROOT, "app", "app", "aerial-simulation", "page.tsx");

  assert.equal(existsSync(PRIVATE_ROUTE), true, "the private route must exist inside app/app/(protected)");
  assert.equal(existsSync(PRIVATE_COMPONENT), true, "the route must use a private presentation component");
  assert.equal(existsSync(unprotectedRoute), false, "the route must not bypass the protected route group");

  const routeSource = readSource(PRIVATE_ROUTE);
  const layoutSource = readSource(PROTECTED_LAYOUT);
  const dedicatedLayoutSource = readSource(DEDICATED_LAYOUT);
  const platformLayoutSource = readSource(PLATFORM_LAYOUT);
  assert.match(routeSource, /PrivateAerialSimulation/);
  assert.match(routeSource, /robots:\s*\{[^}]*index:\s*false[^}]*follow:\s*false/s);
  assert.match(layoutSource, /export const dynamic\s*=\s*["']force-dynamic["']/);
  assert.match(layoutSource, /requireAuthorizedChatGPTUser\(\s*["']\/app["']\s*\)/);
  assert.match(layoutSource, /evaluateAerialPrivateAuthorization\(user\)\.authorized/);
  assert.match(dedicatedLayoutSource, /requireAuthorizedChatGPTUser\(AERIAL_SIMULATION_ROOT\)/);
  assert.match(dedicatedLayoutSource, /evaluateAerialPrivateAuthorization\(user\)/);
  assert.match(dedicatedLayoutSource, /hasValidAerialLabSession\(authorization\.email\)/);
  assert.match(dedicatedLayoutSource, /AERIAL_SIMULATION_ACCESS_PATH/);
  assert.match(platformLayoutSource, /export const dynamic\s*=\s*["']force-dynamic["']/);
  assert.match(platformLayoutSource, /export const fetchCache\s*=\s*["']force-no-store["']/);
  assert.match(platformLayoutSource, /export const revalidate\s*=\s*0/);
});

test("authorized identities alone receive private navigation and catalog discovery", () => {
  const appShell = readSource(path.join(REPOSITORY_ROOT, "src", "platform", "components", "AppShell.tsx"));
  const data = readSource(path.join(REPOSITORY_ROOT, "src", "platform", "data.ts"));
  const applicationsPage = readSource(path.join(REPOSITORY_ROOT, "app", "app", "(protected)", "applications", "page.tsx"));
  const domainHub = readSource(path.join(REPOSITORY_ROOT, "src", "platform", "components", "PrivateDomainHub.tsx"));

  assert.match(data, /AERIAL_SIMULATION_MODULE\s*=\s*\{[\s\S]*?href:\s*["']\/app\/aerial-simulation["']/);
  assert.match(appShell, /aerialSimulationAccess\s*\?\s*\[\.\.\.PLATFORM_MODULES,\s*AERIAL_SIMULATION_MODULE\]\s*:\s*PLATFORM_MODULES/);
  assert.match(applicationsPage, /evaluateAerialPrivateAuthorization\(workspaceIdentity\)\.authorized/);
  assert.match(applicationsPage, /aerialSimulationAvailable=\{aerialSimulationAvailable\}/);
  assert.match(domainHub, /aerialSimulationAvailable[\s\S]*aerialSimulationVisible/);
  assert.match(domainHub, /\{aerialSimulationVisible\s*&&[\s\S]*href=["']\/app\/aerial-simulation["']/);
  assert.match(domainHub, /SECOND GATE/);
});

test("public surfaces do not link directly to the private aerial simulation", () => {
  const publicSources = [
    path.join(REPOSITORY_ROOT, "app", "page.tsx"),
    path.join(REPOSITORY_ROOT, "app", "layout.tsx"),
    path.join(REPOSITORY_ROOT, "app", "sitemap.ts"),
    path.join(REPOSITORY_ROOT, "src", "config", "site.ts"),
    ...sourceFilesUnder(path.join(REPOSITORY_ROOT, "app", "lab")),
    ...sourceFilesUnder(path.join(REPOSITORY_ROOT, "app", "applications")),
    ...sourceFilesUnder(path.join(REPOSITORY_ROOT, "src", "components")),
    ...sourceFilesUnder(path.join(REPOSITORY_ROOT, "src", "lab")),
  ];
  const leakingFiles = publicSources.filter((filePath) =>
    readSource(filePath).includes("/app/aerial-simulation"),
  );

  assert.deepEqual(
    leakingFiles.map((filePath) => path.relative(REPOSITORY_ROOT, filePath)),
    [],
    "the public site may expose /lab/simulation, but must not advertise the private route",
  );
});

test("private surface exposes exactly the four allowed specialist perspectives", () => {
  assert.deepEqual(
    [...PUBLIC_AGENT_NAMES],
    ["Mathematics", "Finance", "Strategy", "Marketing"],
  );

  const componentSource = readSource(PRIVATE_COMPONENT);
  assert.match(componentSource, /Mathematics,\s*Finance,\s*Strategy and Marketing/);
  assert.match(componentSource, /<AerialSimulationLab\s+surface=["']private["']\s*\/>/);
});

test("private surface remains synthetic after the dedicated credential gate", () => {
  const privateSource = `${readSource(PRIVATE_ROUTE)}\n${readSource(PRIVATE_COMPONENT)}`;

  assert.match(privateSource, /PRIVATE\s*\/\s*DEDICATED LAB/);
  assert.match(privateSource, /SYNTHETIC\s*·\s*NON-OPERATIONAL/i);
  assert.match(privateSource, /separate lab credential and authorization scope/i);
  assert.match(privateSource, /LAB SESSION VERIFIED/);
  assert.doesNotMatch(privateSource, /type\s*=\s*["']password["']/i);
  assert.doesNotMatch(privateSource, /\b(?:bcrypt|argon2|passwordHash|verifyPassword|CredentialsProvider)\b/i);
  assert.doesNotMatch(privateSource, /\b(?:get|require|authorize)ChatGPTUser\b/);
  assert.doesNotMatch(privateSource, /from\s+["'][^"']*(?:next-auth|authjs|oauth|chatgpt-auth)[^"']*["']/i);
  assert.doesNotMatch(privateSource, /\b(?:headers|cookies|redirect)\s*\(/);
});
