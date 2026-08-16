import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {readFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const runtimeDependencies = Object.keys(packageJson.dependencies ?? {});
if (runtimeDependencies.length) {
  console.error(JSON.stringify({ok: false, reason: "runtime-dependencies", dependencies: runtimeDependencies}, null, 2));
  process.exit(1);
}
const bundledNpmCli = resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const npmCli = process.env.npm_execpath ?? (existsSync(bundledNpmCli) ? bundledNpmCli : null);
if (!npmCli) throw new Error("Cannot locate npm CLI. Run this check through `npm run pack:check`.");
const command = process.execPath;
const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(
  ([key]) => !/^npm_config_(?:dry_run|pack_destination)$/i.test(key),
));
const args = [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"];
const result = spawnSync(command, args, {
  cwd: root,
  encoding: "utf8",
  shell: false,
  env: cleanEnvironment,
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || result.error?.message || "npm pack failed");
  process.exit(1);
}

const report = JSON.parse(result.stdout)[0];
const files = report.files.map((entry) => entry.path.replaceAll("\\", "/"));
const required = [
  "README.md",
  "README.zh-CN.md",
  "LICENSE",
  "bin/copyweave.mjs",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/copyweave.iife.js",
  "schema/copyweave.schema.json",
  "docs/INTEGRATION.md",
  "docs/SECURITY-MODEL.md",
  "demo/index.html",
  "skill/copyweave-integrator/SKILL.md",
  "skill/copyweave-integrator/README.md",
  "skill/copyweave-integrator/LICENSE",
  "skill/copyweave-integrator/references/evaluation-evidence.md",
  "CONTRIBUTING.md",
  "ROADMAP.md",
  "src/editor.ts",
  "tests/editor.test.ts",
  "scripts/install-check.mjs",
  "evals/README.md",
];
const missing = required.filter((file) => !files.includes(file));
const forbidden = files.filter((file) => /(^|\/)(node_modules)(\/|$)|(^|\/)evals\/runs(\/|$)|\.(?:backup|bak|old|orig|log)$/i.test(file));

if (missing.length || forbidden.length) {
  console.error(JSON.stringify({ok: false, missing, forbidden}, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ok: true, filename: report.filename, files: files.length, unpackedSize: report.unpackedSize, runtimeDependencies: 0}, null, 2));
