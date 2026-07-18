import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const testRoot = isWindows ? fs.mkdtempSync(path.join(os.tmpdir(), "vg-installer-path-security-")) : "";
let packageRoot;

function assertInsideTestRoot(candidate) {
  const rootPrefix = `${path.resolve(testRoot)}${path.sep}`.toLowerCase();
  assert.ok(path.resolve(candidate).toLowerCase().startsWith(rootPrefix), `test path escaped its root: ${candidate}`);
}

function runPowerShell(args, options = {}) {
  return spawnSync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", ...args], {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });
}

function installAt(installRoot, env = process.env) {
  assertInsideTestRoot(installRoot);
  return runPowerShell([
    "-ExecutionPolicy", "Bypass",
    "-File", path.join(packageRoot, "Install.ps1"),
    "-InstallRoot", installRoot,
    "-SkipShortcuts",
    "-SkipRegistry",
    "-NoLaunch",
  ], { env });
}

function waitForPathToDisappear(target, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!fs.existsSync(target)) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  assert.fail(`timed out waiting for cleanup of ${target}`);
}

before(() => {
  if (!isWindows) return;
  packageRoot = path.join(testRoot, "package");
  const payloadRoot = path.join(testRoot, "payload");
  fs.mkdirSync(path.join(payloadRoot, "app", "public"), { recursive: true });
  fs.mkdirSync(path.join(payloadRoot, "runtime"), { recursive: true });
  fs.mkdirSync(packageRoot, { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "installer", "Install.ps1"), path.join(packageRoot, "Install.ps1"));
  fs.copyFileSync(path.join(repoRoot, "installer", "assets", "Uninstall.ps1"), path.join(payloadRoot, "Uninstall.ps1"));
  fs.writeFileSync(path.join(payloadRoot, "app", "fixture.txt"), "fixture", "utf8");
  fs.writeFileSync(path.join(payloadRoot, "runtime", "fixture.txt"), "fixture", "utf8");
  fs.writeFileSync(path.join(payloadRoot, "local-settings.json"), JSON.stringify({
    port: 34731,
    localUserEmail: "local-test@example.invalid",
    localUserName: "Local Test",
    localInstanceToken: "",
  }), "utf8");
  fs.writeFileSync(path.join(packageRoot, "config.psd1"), `@{
  ProductName = "VG Path Security Test"
  ProductVersion = "0.0.0"
  Publisher = "VG Security Tests"
  AppId = "VGPathSecurityTest"
  InstallFolderName = "VG Path Security Test"
  CreateDesktopShortcut = $false
  CreateStartMenuShortcut = $false
  LaunchAfterInstall = $false
}\n`, "utf8");

  execFileSync(powershell, [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
    "Compress-Archive -Path (Join-Path $env:VG_PAYLOAD_ROOT '*') -DestinationPath $env:VG_PAYLOAD_ZIP -Force",
  ], {
    env: {
      ...process.env,
      VG_PAYLOAD_ROOT: payloadRoot,
      VG_PAYLOAD_ZIP: path.join(packageRoot, "payload.zip"),
    },
    windowsHide: true,
    stdio: "pipe",
  });
});

after(() => {
  if (!isWindows || !testRoot) return;
  const resolved = path.resolve(testRoot);
  const tempPrefix = `${path.resolve(os.tmpdir())}${path.sep}`.toLowerCase();
  assert.ok(resolved.toLowerCase().startsWith(tempPrefix));
  fs.rmSync(resolved, { recursive: true, force: true });
});

test("installer rejects a junction in an install-root ancestor", { skip: !isWindows }, () => {
  const outside = path.join(testRoot, "junction-outside");
  const junction = path.join(testRoot, "junction-entry");
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "keep", "utf8");
  const linkResult = runPowerShell(["-Command", "New-Item -ItemType Junction -Path $env:VG_LINK -Target $env:VG_TARGET | Out-Null"], {
    env: { ...process.env, VG_LINK: junction, VG_TARGET: outside },
  });
  assert.equal(linkResult.status, 0, linkResult.stderr);

  const result = installAt(path.join(junction, "product"));
  assert.notEqual(result.status, 0, "installation unexpectedly followed the junction");
  assert.match(`${result.stderr}${result.stdout}`, /reparse point|junction|symbolic link/i);
  assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "keep");
  assert.equal(fs.existsSync(path.join(outside, "product")), false);

  fs.rmdirSync(junction);
});

test("uninstaller treats percent and shell metacharacters as literal path text", { skip: !isWindows }, () => {
  const intendedRoot = path.join(testRoot, "product-%VG_PATH_TOKEN% & semi;");
  const decoyRoot = path.join(testRoot, "product-expanded & semi;");
  const env = { ...process.env, VG_PATH_TOKEN: "expanded" };
  const installResult = installAt(intendedRoot, env);
  assert.equal(installResult.status, 0, `${installResult.stderr}${installResult.stdout}`);
  const installedSettings = JSON.parse(fs.readFileSync(path.join(intendedRoot, "local-settings.json"), "utf8").replace(/^\uFEFF/, ""));
  assert.match(installedSettings.localInstanceToken, /^[a-f0-9]{64}$/);
  fs.mkdirSync(decoyRoot);
  fs.writeFileSync(path.join(decoyRoot, "sentinel.txt"), "keep", "utf8");

  const uninstallResult = runPowerShell([
    "-ExecutionPolicy", "Bypass",
    "-File", path.join(intendedRoot, "Uninstall.ps1"),
    "-Quiet",
  ], { env });
  assert.equal(uninstallResult.status, 0, `${uninstallResult.stderr}${uninstallResult.stdout}`);
  waitForPathToDisappear(intendedRoot);
  assert.equal(fs.readFileSync(path.join(decoyRoot, "sentinel.txt"), "utf8"), "keep");
});

test("uninstaller refuses an installation reached through a junction", { skip: !isWindows }, () => {
  const originalRoot = path.join(testRoot, "junction-uninstall-product");
  const movedRoot = path.join(testRoot, "junction-uninstall-real");
  const installResult = installAt(originalRoot);
  assert.equal(installResult.status, 0, `${installResult.stderr}${installResult.stdout}`);
  fs.renameSync(originalRoot, movedRoot);
  const linkResult = runPowerShell(["-Command", "New-Item -ItemType Junction -Path $env:VG_LINK -Target $env:VG_TARGET | Out-Null"], {
    env: { ...process.env, VG_LINK: originalRoot, VG_TARGET: movedRoot },
  });
  assert.equal(linkResult.status, 0, linkResult.stderr);

  const uninstallResult = runPowerShell([
    "-ExecutionPolicy", "Bypass",
    "-File", path.join(originalRoot, "Uninstall.ps1"),
    "-Quiet",
  ]);
  assert.notEqual(uninstallResult.status, 0, "uninstaller unexpectedly followed the junction");
  assert.match(`${uninstallResult.stderr}${uninstallResult.stdout}`, /reparse point|junction|symbolic link/i);
  assert.equal(fs.existsSync(path.join(movedRoot, ".venture-governance-install.json")), true);

  fs.rmdirSync(originalRoot);
});

test("installer and uninstaller reject a nested junction before recursive removal", { skip: !isWindows }, () => {
  const installRoot = path.join(testRoot, "nested-junction-product");
  const outside = path.join(testRoot, "nested-junction-outside");
  const nestedJunction = path.join(installRoot, "app", "linked-content");
  const installResult = installAt(installRoot);
  assert.equal(installResult.status, 0, `${installResult.stderr}${installResult.stdout}`);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, "sentinel.txt"), "keep", "utf8");
  const linkResult = runPowerShell(["-Command", "New-Item -ItemType Junction -Path $env:VG_LINK -Target $env:VG_TARGET | Out-Null"], {
    env: { ...process.env, VG_LINK: nestedJunction, VG_TARGET: outside },
  });
  assert.equal(linkResult.status, 0, linkResult.stderr);

  const updateResult = installAt(installRoot);
  assert.notEqual(updateResult.status, 0, "installer recursively removed a tree containing a junction");
  assert.match(`${updateResult.stderr}${updateResult.stdout}`, /reparse point|junction|symbolic link/i);

  const uninstallResult = runPowerShell([
    "-ExecutionPolicy", "Bypass",
    "-File", path.join(installRoot, "Uninstall.ps1"),
    "-Quiet",
  ]);
  assert.notEqual(uninstallResult.status, 0, "uninstaller recursively removed a tree containing a junction");
  assert.match(`${uninstallResult.stderr}${uninstallResult.stdout}`, /reparse point|junction|symbolic link/i);
  assert.equal(fs.readFileSync(path.join(outside, "sentinel.txt"), "utf8"), "keep");

  fs.rmdirSync(nestedJunction);
  const safeUninstallResult = runPowerShell([
    "-ExecutionPolicy", "Bypass",
    "-File", path.join(installRoot, "Uninstall.ps1"),
    "-Quiet",
  ]);
  assert.equal(safeUninstallResult.status, 0, `${safeUninstallResult.stderr}${safeUninstallResult.stdout}`);
  waitForPathToDisappear(installRoot);
});

test("installer launch points resolve the system PowerShell executable absolutely", { skip: !isWindows }, () => {
  const bootstrapper = fs.readFileSync(path.join(repoRoot, "installer", "Bootstrapper.cs"), "utf8");
  const installer = fs.readFileSync(path.join(repoRoot, "installer", "Install.ps1"), "utf8");
  const uninstaller = fs.readFileSync(path.join(repoRoot, "installer", "assets", "Uninstall.ps1"), "utf8");

  assert.match(bootstrapper, /Environment\.SpecialFolder\.Windows/);
  assert.match(bootstrapper, /FileName\s*=\s*powershellPath/);
  assert.doesNotMatch(bootstrapper, /FileName\s*=\s*"powershell\.exe"/i);
  assert.match(installer, /System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
  assert.match(installer, /UninstallCommand\s*=\s*"`\"\$powershellPath/i);
  assert.match(uninstaller, /Test-Path -LiteralPath \$powershellPath -PathType Leaf/);
});

test("installer build uses lock-verified dependencies through npm adjacent to signed Node", { skip: !isWindows }, () => {
  const buildScript = fs.readFileSync(path.join(repoRoot, "installer", "Build-Installer.ps1"), "utf8");
  assert.match(buildScript, /Resolve-TrustedNpmCli \$trustedNodePath/);
  assert.match(buildScript, /& \$trustedNodePath \$trustedNpmCliPath ci --ignore-scripts/);
  assert.match(buildScript, /package-lock\.json/);
  assert.match(buildScript, /public\\og-public-v2\.png/);
  assert.doesNotMatch(buildScript, /public\\og\.png/);
  assert.doesNotMatch(buildScript, /&\s*npm(?:\.cmd)?\b/i);
  assert.doesNotMatch(buildScript, /Install\.cmd/i);
  assert.equal(fs.existsSync(path.join(repoRoot, "installer", "Install.cmd")), false);
});
