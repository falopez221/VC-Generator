import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path: string) {
  return readFile(new URL(path, root), "utf8");
}

test("private capital page is guarded by its dedicated owner role", async () => {
  const [layout, api] = await Promise.all([
    source("app/app/private-capital-intelligence/layout.tsx"),
    source("app/api/private-capital/status/route.ts"),
  ]);
  assert.match(layout, /requirePrivateCapitalOwner/u);
  assert.match(layout, /robots:\s*\{\s*index:\s*false/u);
  assert.match(api, /from "@\/src\/private-capital\/security\/authorization"/u);
  assert.match(api, /if \(!decision\.authorized\)/u);
  assert.match(api, /response\([^;]+,\s*403\)/u);
  assert.match(api, /x-robots-tag/u);
});

test("private capital route is absent from public discovery surfaces", async () => {
  const [sitemap, modules] = await Promise.all([
    source("app/sitemap.ts"),
    source("src/platform/data.ts"),
  ]);
  assert.doesNotMatch(sitemap, /private-capital|Private Capital/u);
  assert.doesNotMatch(modules, /private-capital|Private Capital/u);
});

test("private capital appears in Apps only after the dedicated owner check", async () => {
  const [page, hub] = await Promise.all([
    source("app/app/(protected)/applications/page.tsx"),
    source("src/platform/components/PrivateDomainHub.tsx"),
  ]);
  assert.match(page, /authorizePrivateCapitalOwner\(workspaceIdentity\)/u);
  assert.match(page, /privateCapitalAvailable=\{privateCapitalAvailable\}/u);
  assert.match(hub, /privateCapitalAvailable \? "30 MINI-APPS \+ 1 OWNER APP"/u);
  assert.match(hub, /Private Capital Intelligence/u);
  assert.match(hub, /href="\/app\/private-capital-intelligence"/u);
  assert.match(hub, /privateCapitalVisible &&/u);
});

test("the authenticated shell exposes an owner-only route after server authorization", async () => {
  const [protectedLayout, shell] = await Promise.all([
    source("app/app/(protected)/layout.tsx"),
    source("src/platform/components/AppShell.tsx"),
  ]);
  assert.match(protectedLayout, /authorizePrivateCapitalOwner\(user\)/u);
  assert.match(protectedLayout, /privateCapitalAccess=\{privateCapitalAccess\}/u);
  assert.match(shell, /privateCapitalAccess\s*&&\s*<Link href="\/app\/private-capital-intelligence"/u);
  assert.match(shell, /Owner only/u);
});

test("private capital UI permanently states simulation and human authority boundaries", async () => {
  const dashboard = await source("src/private-capital/components/PrivateCapitalDashboard.tsx");
  assert.match(dashboard, /Decision-support environment/u);
  assert.match(dashboard, /No trades are executed automatically/u);
  assert.match(dashboard, /Simulated data — not suitable for real investment decisions/u);
  assert.match(dashboard, /NO REAL ORDERS ARE BEING PLACED/u);
});

test("private capital UI exposes every required internal workspace without public links", async () => {
  const dashboard = await source("src/private-capital/components/PrivateCapitalDashboard.tsx");
  for (const label of [
    "Overview", "Thesis Lab", "My Portfolio", "Portfolio Builder", "Market Intelligence", "Argentina",
    "CEDEARs", "Bonds", "Bitcoin", "Signals", "Rebalancing", "Alerts", "Simulations",
    "Risk Center", "Human Review", "Settings",
  ]) {
    assert.match(dashboard, new RegExp(`label: "${label}"`, "u"));
  }
  assert.match(dashboard, /aria-label="Private Capital sections"/u);
  assert.match(dashboard, /pc-mobile-nav/u);
});

test("thesis lab connects idea intake, specialists, opportunities, scenarios and human review", async () => {
  const [dashboard, engine] = await Promise.all([
    source("src/private-capital/components/PrivateCapitalDashboard.tsx"),
    source("src/private-capital/domain/thesis.ts"),
  ]);
  for (const expected of [
    "Describe thesis", "Select specialists", "Generate hypotheses", "Stress scenarios", "Human review",
    "Convene specialists", "Generated investment hypotheses", "WHERE AGENTS DISAGREE",
    "Send to Human Review", "Execution unavailable",
  ]) assert.match(dashboard, new RegExp(expected, "u"));
  assert.match(engine, /opportunities\.length|slice\(0, 8\)/u);
  assert.match(engine, /executionAuthorized:\s*false/u);
  assert.match(engine, /No live prices/u);
});

test("private capital controls preserve privacy and human authorization framing", async () => {
  const dashboard = await source("src/private-capital/components/PrivateCapitalDashboard.tsx");
  assert.match(dashboard, /aria-pressed=\{privacyMode\}/u);
  assert.match(dashboard, /Show sensitive amounts/u);
  assert.match(dashboard, /Manual metadata only/u);
  assert.match(dashboard, /Track hypothesis/u);
  assert.match(dashboard, /Mark read/u);
  assert.match(dashboard, /Accept for monitoring/u);
  assert.match(dashboard, /Stage in simulation/u);
  assert.match(dashboard, /Execution unavailable/u);
  assert.match(dashboard, /role="status"/u);
});

test("private capital offers an accessible, repeatable guided tour", async () => {
  const [dashboard, styles] = await Promise.all([
    source("src/private-capital/components/PrivateCapitalDashboard.tsx"),
    source("src/styles/private-capital.css"),
  ]);
  assert.match(dashboard, /TOUR_STORAGE_KEY/u);
  assert.match(dashboard, /aria-haspopup="dialog"/u);
  assert.match(dashboard, /role="dialog" aria-modal="true"/u);
  assert.match(dashboard, /Paso \{tourStep \+ 1\} de \{TOUR_STEPS\.length\}/u);
  assert.match(dashboard, /Saltar tour/u);
  assert.match(dashboard, /Finalizar/u);
  assert.match(dashboard, /event\.key !== "Escape"/u);
  assert.match(dashboard, /trapTourFocus/u);
  assert.match(styles, /\.pc-tour-backdrop/u);
  assert.match(styles, /@media \(max-width: 540px\)/u);
});

test("private capital manual entry and risk profile inputs are bounded and explicit", async () => {
  const dashboard = await source("src/private-capital/components/PrivateCapitalDashboard.tsx");
  for (const field of [
    "Investable capital", "Liquidity need", "Maximum tolerable loss", "Argentina ceiling",
    "Bitcoin ceiling", "Single-asset ceiling", "Sector ceiling", "Rebalance horizon",
    "Purchase date", "Fees", "Review price or condition", "Investment thesis",
  ]) {
    assert.match(dashboard, new RegExp(field, "u"));
  }
  assert.match(dashboard, /max="1000000000000"/u);
  assert.match(dashboard, /Never enter API keys, seed phrases, recovery codes or private keys/u);
});

test("asset research distinguishes mock provenance and unavailable metrics", async () => {
  const dashboard = await source("src/private-capital/components/PrivateCapitalDashboard.tsx");
  assert.match(dashboard, /Source \{field\.provenance\.source\}/u);
  assert.match(dashboard, /Latency \{field\.provenance\.latency\}/u);
  assert.match(dashboard, /Confidence \{field\.provenance\.confidence\}/u);
  assert.match(dashboard, /Not calculated — insufficient validated data/u);
  assert.match(dashboard, /Market \/ on-chain/u);
  assert.match(dashboard, /Unavailable means unavailable/u);
});

test("private capital styles support keyboard, mobile and reduced-motion use", async () => {
  const styles = await source("src/styles/private-capital.css");
  assert.match(styles, /:focus-visible/u);
  assert.match(styles, /@media \(max-width: 820px\)/u);
  assert.match(styles, /@media \(max-width: 540px\)/u);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/u);
  assert.match(styles, /@media \(forced-colors: active\)/u);
});
