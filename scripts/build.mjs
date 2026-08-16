import {copyFile, rm, mkdir} from "node:fs/promises";
import {resolve} from "node:path";
import {build} from "esbuild";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
if (dist === root || !dist.startsWith(root)) throw new Error("refusing to clean an unsafe dist path");
await rm(dist, {recursive: true, force: true});
await mkdir(dist, {recursive: true});

const shared = {
  entryPoints: [resolve(root, "src/index.ts")],
  bundle: true,
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  legalComments: "linked",
};

await Promise.all([
  build({...shared, format: "esm", outfile: resolve(dist, "index.js")}),
  build({...shared, format: "iife", globalName: "CopyWeave", minify: true, outfile: resolve(dist, "copyweave.iife.js")}),
]);

await mkdir(resolve(root, "demo/assets"), {recursive: true});
await copyFile(resolve(dist, "copyweave.iife.js"), resolve(root, "demo/assets/copyweave.iife.js"));

console.log("Built ESM and IIFE browser bundles.");
