import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vinextCli = path.join(projectRoot, "node_modules", "vinext", "dist", "cli.js");
const loopbackHost = "127.0.0.1";

if (!fs.existsSync(vinextCli)) {
  throw new Error("The local vinext CLI is missing. Install the locked dependencies first.");
}

const child = spawn(process.execPath, [vinextCli, "dev", "--hostname", loopbackHost], {
  cwd: projectRoot,
  env: {
    ...process.env,
    VG_LOCAL_BIND_ADDRESS: loopbackHost,
  },
  stdio: "inherit",
  windowsHide: true,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
