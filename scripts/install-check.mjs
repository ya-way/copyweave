import {spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import {copyFile, mkdtemp, mkdir, readFile, rm, stat, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const bundledNpmCli = resolve(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const npmCli = process.env.npm_execpath ?? (existsSync(bundledNpmCli) ? bundledNpmCli : null);
if (!npmCli) throw new Error("Cannot locate npm CLI. Run this check through `npm run install:check`.");
const npmCommand = process.execPath;
const npmArgs = (...args) => [npmCli, ...args];
const cleanEnvironment = Object.fromEntries(Object.entries(process.env).filter(
  ([key]) => !/^npm_config_(?:dry_run|pack_destination)$/i.test(key),
));
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    env: cleanEnvironment,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || result.error?.message || `${command} failed`);
  }
  return result.stdout.trim();
};

const sandbox = await mkdtemp(resolve(tmpdir(), "copyweave-install-"));
let tarball = null;

try {
  const packDirectory = resolve(sandbox, "pack");
  await mkdir(packDirectory);
  const pack = JSON.parse(run(npmCommand, npmArgs("pack", "--ignore-scripts", "--json", "--pack-destination", packDirectory), root))[0];
  tarball = resolve(packDirectory, pack.filename);
  await writeFile(resolve(sandbox, "package.json"), `${JSON.stringify({private: true, type: "module"}, null, 2)}\n`, "utf8");
  run(npmCommand, npmArgs("install", "--ignore-scripts", "--no-audit", "--no-fund", tarball), sandbox);

  const packageRoot = resolve(sandbox, "node_modules/copyweave");
  for (const required of [
    "README.md",
    "README.zh-CN.md",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/copyweave.iife.js",
    "bin/copyweave.mjs",
    "schema/copyweave.schema.json",
    "skill/copyweave-integrator/SKILL.md",
  ]) await stat(resolve(packageRoot, required));

  const exports = run(process.execPath, ["--input-type=module", "-e", "import('copyweave').then((m)=>{if(typeof m.createCopyWeave!=='function')process.exit(2);console.log(Object.keys(m).sort().join(','))})"], sandbox);
  const version = run(process.execPath, [resolve(packageRoot, "bin/copyweave.mjs"), "--version"], sandbox);
  const consumerSource = resolve(sandbox, "consumer.ts");
  const consumerConfig = resolve(sandbox, "tsconfig.json");
  await writeFile(consumerSource, 'import {createCopyWeave, type CopyStore} from "copyweave";\nconst store: CopyStore | null = null;\nvoid createCopyWeave;\nvoid store;\n', "utf8");
  await writeFile(consumerConfig, `${JSON.stringify({
    compilerOptions: {module: "NodeNext", moduleResolution: "NodeNext", target: "ES2022", strict: true, noEmit: true, skipLibCheck: false},
    files: ["consumer.ts"],
  }, null, 2)}\n`, "utf8");
  run(process.execPath, [resolve(root, "node_modules/typescript/bin/tsc"), "-p", consumerConfig], sandbox);

  const site = resolve(sandbox, "site");
  await mkdir(site);
  await writeFile(resolve(site, "index.html"), '<!doctype html><html><body data-copy-page="home"><h1 data-copy-id="home.title">Clean install</h1><script src="./copyweave.iife.js"></script></body></html>', "utf8");
  await copyFile(resolve(packageRoot, "dist/copyweave.iife.js"), resolve(site, "copyweave.iife.js"));
  const doctor = JSON.parse(run(process.execPath, [resolve(packageRoot, "bin/copyweave.mjs"), "doctor", site, "--strict", "--json"], sandbox));
  const schema = JSON.parse(await readFile(resolve(packageRoot, "schema/copyweave.schema.json"), "utf8"));

  console.log(JSON.stringify({
    ok: true,
    version,
    exports: exports.split(","),
    doctor: doctor.summary,
    schema: schema.title,
    nodeNextTypes: true,
    packedFiles: pack.files.length,
  }, null, 2));
} finally {
  await rm(sandbox, {recursive: true, force: true});
  if (tarball) await rm(tarball, {force: true});
}
