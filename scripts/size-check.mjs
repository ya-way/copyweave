import {readFile} from "node:fs/promises";
import {gzipSync} from "node:zlib";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = ["dist/index.js", "dist/copyweave.iife.js"];
const limit = 18 * 1024;
const results = [];

for (const file of files) {
  const bytes = await readFile(resolve(root, file));
  const gzip = gzipSync(bytes).byteLength;
  results.push({file, raw: bytes.byteLength, gzip, limit});
  if (gzip > limit) {
    console.error(`${file} is ${gzip} bytes gzip; limit is ${limit}.`);
    process.exitCode = 1;
  }
}

console.log(JSON.stringify({ok: process.exitCode !== 1, bundles: results}, null, 2));
