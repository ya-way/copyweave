import {spawn} from "node:child_process";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const child = spawn(process.execPath, [resolve(root, "bin/copyweave.mjs"), "serve", resolve(root, "demo"), ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
