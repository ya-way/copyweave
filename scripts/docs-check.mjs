import {readFile, readdir, stat} from "node:fs/promises";
import {dirname, extname, resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const skipped = new Set(["node_modules", "dist", ".skill-validator-deps", "runs"]);

const markdownFiles = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (skipped.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") files.push(path);
  }
  return files;
};

const missing = [];
const brokenFragments = [];
let links = 0;
const files = await markdownFiles(root);
const markdownByFile = new Map();
const anchorsByFile = new Map();

const githubSlug = (value) => value
  .toLowerCase()
  .replace(/<[^>]*>/g, "")
  .replace(/[`*_~]/g, "")
  .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "")
  .trim()
  .replace(/\s+/g, "-");

for (const file of files) {
  const markdown = await readFile(file, "utf8");
  markdownByFile.set(file, markdown);
  const anchors = new Set();
  const seen = new Map();
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = githubSlug(match[1]);
    if (!base) continue;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  for (const match of markdown.matchAll(/<(?:a|span)\b[^>]*(?:id|name)=["']([^"']+)["']/gi)) anchors.add(match[1]);
  anchorsByFile.set(file, anchors);
}

for (const file of files) {
  const markdown = markdownByFile.get(file);
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*)?\)/g)) {
    const rawTarget = match[1].replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:)/i.test(rawTarget) || rawTarget.includes("<") || rawTarget.includes(">")) continue;
    const [pathAndQuery, rawFragment] = rawTarget.split("#", 2);
    const target = pathAndQuery.split("?", 1)[0];
    const candidate = target ? resolve(dirname(file), decodeURIComponent(target)) : file;
    links += 1;
    try {
      await stat(candidate);
    } catch {
      missing.push({file: file.slice(root.length + 1).replaceAll("\\", "/"), target: target || rawTarget});
      continue;
    }
    if (rawFragment && extname(candidate).toLowerCase() === ".md") {
      const fragment = decodeURIComponent(rawFragment);
      if (!anchorsByFile.get(candidate)?.has(fragment)) {
        brokenFragments.push({file: file.slice(root.length + 1).replaceAll("\\", "/"), target: rawTarget, fragment});
      }
    }
  }
}

if (missing.length || brokenFragments.length) {
  console.error(JSON.stringify({ok: false, links, missing, brokenFragments}, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ok: true, links}, null, 2));
