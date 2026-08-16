#!/usr/bin/env node

import {createHash, randomBytes} from "node:crypto";
import {createReadStream} from "node:fs";
import {
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import {createServer} from "node:http";
import {dirname, extname, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {spawn} from "node:child_process";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
const VERSION = packageJson.version;
const MAX_BODY = 2 * 1024 * 1024;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const unicodeLength = (value) => Array.from(value).length;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

const help = `
CopyWeave ${VERSION} — Edit the words. Keep the design.

Usage
  copyweave init [root] [--site-id name] [--content file] [--json]
  copyweave serve [root] [--port 4176] [--content file] [--content-url /copyweave.content.json] [--no-open] [--no-backup] [--allow-project-root] [--json]
  copyweave doctor [root] [--strict] [--json]
  copyweave apply [root] [--content file] [--dry-run] [--no-backup] [--json]

Commands
  init     Create a versioned content file without touching the website.
  serve    Serve a site on 127.0.0.1 and save copy with token + ETag protection.
  doctor   Report duplicate IDs, unstable fields, CSS/SVG copy, and integration gaps.
  apply    Write explicit data-copy-id values into leaf HTML fields for production.

Examples
  npx copyweave init dist --site-id my-site
  npx copyweave serve dist --open
  npx copyweave doctor dist --strict
  npx copyweave apply dist --dry-run --json
`;

class CliError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const parseArgs = (argv) => {
  const flags = Object.create(null);
  const positionals = [];
  const duplicates = [];
  const setFlag = (name, value) => {
    if (Object.hasOwn(flags, name)) duplicates.push(name);
    flags[name] = value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positionals.push(item);
      continue;
    }
    const [rawKey, inlineValue] = item.slice(2).split("=", 2);
    if (rawKey.startsWith("no-")) {
      setFlag(rawKey.slice(3), false);
      continue;
    }
    if (inlineValue !== undefined) {
      setFlag(rawKey, inlineValue);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      setFlag(rawKey, next);
      index += 1;
    } else setFlag(rawKey, true);
  }
  return {flags, positionals, duplicates};
};

const COMMAND_FLAGS = {
  init: {"site-id": "string", content: "string", json: "boolean"},
  serve: {port: "string", content: "string", "content-url": "string", open: "boolean", backup: "boolean", "allow-project-root": "boolean", json: "boolean"},
  doctor: {strict: "boolean", json: "boolean"},
  apply: {content: "string", "dry-run": "boolean", backup: "boolean", json: "boolean"},
};

const validateCommandArgs = (command, positionals, flags, duplicates) => {
  const specification = COMMAND_FLAGS[command];
  if (!specification) return;
  if (positionals.length > 2) throw new CliError("unexpected-argument", `unexpected positional argument: ${positionals[2]}`, {argument: positionals[2]});
  if (duplicates.length) throw new CliError("duplicate-option", `option supplied more than once: --${duplicates[0]}`, {option: duplicates[0]});
  for (const [name, value] of Object.entries(flags)) {
    const expected = specification[name];
    if (!expected) throw new CliError("unknown-option", `unknown option for ${command}: --${name}`, {command, option: name});
    if (typeof value !== expected) throw new CliError("invalid-option-value", `--${name} requires a ${expected === "string" ? "value" : "boolean flag"}`, {command, option: name, expected});
  }
};

const output = (value, json = false) => {
  if (json) process.stdout.write(`${JSON.stringify(value)}\n`);
  else if (typeof value === "string") process.stdout.write(`${value}\n`);
  else process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const fail = (message, code = 1, json = false, details = {}) => {
  const payload = {ok: false, error: message, ...details};
  if (json) process.stderr.write(`${JSON.stringify(payload)}\n`);
  else process.stderr.write(`CopyWeave: ${message}\n`);
  process.exitCode = code;
};

const safeName = (value) =>
  typeof value === "string" && value.length > 0 && unicodeLength(value) <= 240 && !BLOCKED_KEYS.has(value) && !/[\u0000-\u001f\u007f]/.test(value);
const safeFieldName = (value) =>
  safeName(value) && (/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,239}$/.test(value) || (value.startsWith("auto:") && !/[\u0000-\u001f\u007f]/.test(value)));
const safeTimestamp = (value) => {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-](\d{2}):(\d{2}))$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = Number(match[7] ?? "0");
  const offsetMinute = Number(match[8] ?? "0");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12
    && day >= 1 && day <= days[month - 1]
    && hour <= 23 && minute <= 59 && second <= 59
    && offsetHour <= 23 && offsetMinute <= 59;
};

const validateStore = (value, expectedSiteId) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.format !== "copyweave/content" || value.version !== 1 || !safeName(value.siteId)) return false;
  if (expectedSiteId && value.siteId !== expectedSiteId) return false;
  if (!safeTimestamp(value.updatedAt)) return false;
  if (!value.pages || typeof value.pages !== "object" || Array.isArray(value.pages)) return false;
  const pages = Object.entries(value.pages);
  if (pages.length > 100) return false;
  let fields = 0;
  for (const [pageId, page] of pages) {
    if (!safeName(pageId) || !page || typeof page !== "object" || Array.isArray(page)) return false;
    for (const [fieldId, copy] of Object.entries(page)) {
      fields += 1;
      if (fields > 5000 || !safeFieldName(fieldId) || typeof copy !== "string" || unicodeLength(copy) > 100_000) return false;
    }
  }
  return true;
};

const createStore = (siteId) => ({
  format: "copyweave/content",
  version: 1,
  siteId,
  updatedAt: new Date(0).toISOString(),
  pages: {},
});

const inside = (root, candidate) => candidate === root || candidate.startsWith(`${root}${sep}`);
const hash = (bytes) => `"sha256-${createHash("sha256").update(bytes).digest("base64url")}"`;
const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const atomicWrite = async (target, content) => {
  const temp = resolve(dirname(target), `.copyweave-${process.pid}-${randomBytes(6).toString("hex")}.tmp`);
  let handle = null;
  let ownsTemp = false;
  try {
    handle = await open(temp, "wx");
    ownsTemp = true;
    await handle.writeFile(content, {encoding: "utf8"});
    await handle.close();
    handle = null;
    await rename(temp, target);
  } catch (error) {
    await handle?.close().catch(() => {});
    if (ownsTemp) await rm(temp, {force: true}).catch(() => {});
    throw error;
  }
};

const backupFile = async (target) => {
  try {
    const content = await readFile(target);
    await atomicWrite(`${target}.backup`, content);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

const walk = async (root, extensions) => {
  const files = [];
  const visit = async (directory) => {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (extensions.has(extname(entry.name).toLowerCase())) files.push(path);
    }
  };
  await visit(root);
  return files;
};

const resolveRoot = async (input) => {
  const root = resolve(input ?? ".");
  const details = await stat(root);
  if (!details.isDirectory()) throw new Error(`not a directory: ${root}`);
  return realpath(root);
};

const resolveContent = (root, name) => resolve(root, name ?? "copyweave.content.json");

const SENSITIVE_ROOT_NAMES = new Set([".git", ".hg", ".svn", ".env", ".npmrc", ".yarnrc", ".pypirc", "credentials", "secrets"]);
const BLOCKED_STATIC_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "deno.lock",
  "credentials",
  "secrets",
]);
const BLOCKED_STATIC_DIRECTORIES = new Set(["node_modules", ".git", ".hg", ".svn"]);
const BLOCKED_STATIC_EXTENSIONS = new Set([".backup", ".bak", ".db", ".key", ".map", ".old", ".orig", ".p12", ".pem", ".pfx", ".sqlite", ".sqlite3"]);

const rootHazards = async (root) => {
  const hazards = [];
  for (const entry of await readdir(root, {withFileTypes: true})) {
    const name = entry.name.toLowerCase();
    if (SENSITIVE_ROOT_NAMES.has(name) || name.startsWith(".env.")) hazards.push(entry.name);
  }
  return hazards;
};

const blockedStaticPath = (pathname) => {
  const segments = pathname.split(/[\\/]+/).filter(Boolean).map((segment) => segment.toLowerCase());
  if (segments.some((segment) => segment.includes(":") || segment.startsWith(".") || BLOCKED_STATIC_DIRECTORIES.has(segment))) return true;
  const name = segments.at(-1) ?? "";
  if (BLOCKED_STATIC_NAMES.has(name) || name.startsWith(".env.")) return true;
  return BLOCKED_STATIC_EXTENSIONS.has(extname(name));
};

const initCommand = async (rootArg, flags) => {
  const json = flags.json === true;
  const root = await resolveRoot(rootArg);
  const siteId = typeof flags["site-id"] === "string" ? flags["site-id"] : root.split(/[\\/]/).at(-1) || "site";
  if (!safeName(siteId)) throw new Error("site ID must be 1–240 safe characters");
  const content = resolveContent(root, typeof flags.content === "string" ? flags.content : undefined);
  try {
    await stat(content);
    fail(`content file already exists: ${content}`, 2, json);
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(content), {recursive: true});
  await atomicWrite(content, `${JSON.stringify(createStore(siteId), null, 2)}\n`);
  output({
    ok: true,
    command: "init",
    root,
    content,
    siteId,
    next: `npx copyweave serve ${JSON.stringify(root)}`,
  }, json);
};

const NON_COPY_TAGS = new Set([
  "script", "style", "noscript", "svg", "template", "code", "pre", "video", "audio", "source", "picture",
  "canvas", "iframe", "input", "textarea", "select", "option", "xmp", "noembed", "noframes", "plaintext",
]);
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT_TAGS = new Set(["script", "style", "textarea", "title", "xmp", "iframe", "noembed", "noframes", "plaintext"]);

const htmlAttribute = (attributes, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attributes.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\\x60]+))`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "").trim() : null;
};

const hasHtmlAttribute = (attributes, name) =>
  new RegExp(`(?:^|\\s)${name}(?:\\s|=|$)`, "i").test(attributes);

const htmlTagEnd = (html, start) => {
  let quote = null;
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === ">") return index + 1;
  }
  return -1;
};

const scanHtmlDocument = (html) => {
  const stack = [];
  const fields = [];
  const explicitIds = [];
  const pageIds = [];
  const siteIds = [];
  const unmarked = [];
  const seenText = new Set();
  let svgText = false;
  let runtimeMarker = false;
  let cursor = 0;

  const recordText = (value) => {
    const context = stack.at(-1);
    if (!context?.inBody || context.excluded || context.marked || unmarked.length >= 8) return;
    const normalized = value.replace(/&(nbsp|thinsp|ensp|emsp|#160|#xa0);/gi, " ").replace(/\s+/g, " ").trim();
    if (!normalized || seenText.has(normalized)) return;
    seenText.add(normalized);
    unmarked.push(normalized.slice(0, 80));
  };

  while (cursor < html.length) {
    const rawContext = stack.at(-1);
    if (rawContext && RAW_TEXT_TAGS.has(rawContext.tag)) {
      if (rawContext.tag === "plaintext") break;
      const closing = new RegExp(`<\\/\\s*${rawContext.tag}\\s*>`, "ig");
      closing.lastIndex = cursor;
      const match = closing.exec(html);
      if (!match) break;
      cursor = match.index;
    }

    const start = html.indexOf("<", cursor);
    if (start < 0) {
      recordText(html.slice(cursor));
      break;
    }
    if (start > cursor) recordText(html.slice(cursor, start));

    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      cursor = end < 0 ? html.length : end + 3;
      continue;
    }
    const end = htmlTagEnd(html, start);
    if (end < 0) break;
    const token = html.slice(start, end);
    if (/^<!|^<\?/i.test(token)) {
      cursor = end;
      continue;
    }

    const closingMatch = token.match(/^<\/\s*([a-z][\w:-]*)[^>]*>$/i);
    if (closingMatch) {
      const tag = closingMatch[1].toLowerCase();
      let matchIndex = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tag === tag) {
          matchIndex = index;
          break;
        }
      }
      if (matchIndex >= 0) {
        for (let index = stack.length - 1; index >= matchIndex; index -= 1) {
          const entry = stack[index];
          if (entry.fieldId !== null) {
            const content = html.slice(entry.contentStart, start);
            fields.push({
              id: entry.fieldId,
              tag: entry.tag,
              contentStart: entry.contentStart,
              contentEnd: start,
              leaf: index === matchIndex && !entry.hasChildElement && !content.includes("<"),
            });
          }
          if (entry.insideSvg && entry.tag === "text" && html.slice(entry.contentStart, start).replace(/<[^>]*>/g, "").trim()) svgText = true;
          if (entry.tag === "script" && /copyweave/i.test(html.slice(entry.contentStart, start))) runtimeMarker = true;
        }
        stack.length = matchIndex;
      }
      cursor = end;
      continue;
    }

    const openingMatch = token.match(/^<\s*([a-z][\w:-]*)([\s\S]*?)(\/?)>$/i);
    if (!openingMatch) {
      cursor = end;
      continue;
    }
    const tag = openingMatch[1].toLowerCase();
    const attributes = openingMatch[2];
    const parent = stack.at(-1);
    if (parent) parent.hasChildElement = true;
    const hidden = hasHtmlAttribute(attributes, "hidden")
      || /(?:^|\s)aria-hidden\s*=\s*["']true["']/i.test(attributes)
      || /(?:^|\s)style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(attributes);
    const excluded = Boolean(parent?.excluded) || NON_COPY_TAGS.has(tag) || hidden || hasHtmlAttribute(attributes, "data-copyweave-ignore");
    const fieldId = excluded ? null : htmlAttribute(attributes, "data-copy-id");
    if (fieldId !== null) explicitIds.push(fieldId);
    if (tag === "body" && !excluded) {
      const pageId = htmlAttribute(attributes, "data-copy-page");
      if (pageId !== null) pageIds.push(pageId);
    }
    const siteId = tag === "html" && !excluded ? htmlAttribute(attributes, "data-copyweave-site") : null;
    if (siteId !== null) siteIds.push(siteId);
    if (tag === "script" && /copyweave/i.test(attributes)) runtimeMarker = true;
    const entry = {
      tag,
      fieldId,
      contentStart: end,
      hasChildElement: false,
      inBody: tag === "body" || Boolean(parent?.inBody),
      excluded,
      marked: Boolean(parent?.marked) || fieldId !== null,
      insideSvg: tag === "svg" || Boolean(parent?.insideSvg),
    };
    const selfClosing = VOID_TAGS.has(tag) || openingMatch[3] === "/";
    if (selfClosing) {
      if (fieldId !== null) fields.push({id: fieldId, tag, contentStart: end, contentEnd: end, leaf: false});
    } else {
      stack.push(entry);
    }
    cursor = end;
  }

  return {fields, explicitIds, pageIds, siteIds, unmarked, svgText, runtimeMarker};
};

const doctorCommand = async (rootArg, flags) => {
  const root = await resolveRoot(rootArg);
  const files = await walk(root, new Set([".html", ".css"]));
  const diagnostics = [];
  let explicitFields = 0;
  let automaticPages = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const fileName = relative(root, file).replaceAll("\\", "/");
    if (extname(file).toLowerCase() === ".html") {
      const document = scanHtmlDocument(source);
      const ids = document.explicitIds;
      explicitFields += ids.length;
      const seen = new Set();
      for (const id of ids) {
        if (!safeFieldName(id)) diagnostics.push({level: "error", code: "invalid-field-id", file: fileName, field: id, message: `Invalid data-copy-id: ${id || "(empty)"}`});
        if (seen.has(id)) diagnostics.push({level: "error", code: "duplicate-field-id", file: fileName, field: id, message: `Duplicate data-copy-id: ${id}`});
        seen.add(id);
      }
      for (const pageId of document.pageIds) {
        if (!safeName(pageId)) diagnostics.push({level: "error", code: "invalid-page-id", file: fileName, field: pageId, message: `Invalid data-copy-page: ${pageId || "(empty)"}`});
      }
      for (const siteId of document.siteIds) {
        if (!safeName(siteId)) diagnostics.push({level: "error", code: "invalid-site-id", file: fileName, field: siteId, message: `Invalid data-copyweave-site: ${siteId || "(empty)"}`});
      }
      if (!ids.length) {
        automaticPages += 1;
        diagnostics.push({level: "warning", code: "automatic-only", file: fileName, message: "No data-copy-id fields; automatic IDs can move after DOM refactors."});
      } else {
        const unmarked = document.unmarked;
        if (unmarked.length) diagnostics.push({
          level: "warning",
          code: "unmarked-visible-text",
          file: fileName,
          message: `Visible text is missing data-copy-id: ${unmarked.join(" | ")}`,
        });
      }
      if (!document.runtimeMarker) diagnostics.push({level: "warning", code: "runtime-not-found", file: fileName, message: "No CopyWeave integration marker found."});
      if (document.svgText) diagnostics.push({level: "warning", code: "svg-text", file: fileName, message: "SVG <text> copy is not editable by the browser scanner; move it to HTML or bind it explicitly."});
      for (const field of document.fields) {
        if (!field.leaf) diagnostics.push({level: "warning", code: "nested-field", file: fileName, field: field.id, message: "Explicit field contains nested or non-text markup; split it into a leaf text field."});
      }
    } else {
      for (const match of source.matchAll(/\bcontent\s*:\s*["']([^"']+)["']/gi)) {
        if (match[1].trim()) diagnostics.push({level: "warning", code: "css-generated-copy", file: fileName, message: `CSS-generated copy is not editable: ${match[1].slice(0, 80)}`});
      }
    }
  }

  if (!files.some((file) => extname(file).toLowerCase() === ".html")) diagnostics.push({level: "error", code: "no-html", file: ".", message: "No HTML files found."});
  const errors = diagnostics.filter((item) => item.level === "error").length;
  const warnings = diagnostics.filter((item) => item.level === "warning").length;
  const result = {
    ok: errors === 0 && (flags.strict !== true || warnings === 0),
    command: "doctor",
    root,
    summary: {htmlFiles: files.filter((file) => extname(file).toLowerCase() === ".html").length, explicitFields, automaticPages, errors, warnings},
    diagnostics,
  };
  output(result, flags.json === true);
  if (!result.ok) process.exitCode = 1;
};

const pageIdForHtml = (root, file, document) => {
  const explicit = document.pageIds[0];
  if (explicit) {
    if (!safeName(explicit)) throw new CliError("invalid-page-id", `invalid data-copy-page in ${relative(root, file)}`, {pageId: explicit});
    return explicit;
  }
  const path = relative(root, file).replaceAll("\\", "/");
  if (path.toLowerCase() === "index.html") return "/";
  return `/${path.replace(/\/index\.html$/i, "/")}`;
};

const applyCommand = async (rootArg, flags) => {
  const root = await resolveRoot(rootArg);
  const contentPath = resolveContent(root, typeof flags.content === "string" ? flags.content : undefined);
  const store = JSON.parse(await readFile(contentPath, "utf8"));
  if (!validateStore(store)) throw new Error("content file failed CopyWeave schema validation");
  const htmlFiles = await walk(root, new Set([".html"]));
  const changes = [];
  const unmatched = [];
  const plans = [];

  for (const file of htmlFiles) {
    const original = await readFile(file, "utf8");
    const document = scanHtmlDocument(original);
    const declaredSiteIds = [...new Set(document.siteIds)];
    if (declaredSiteIds.length > 1 || (declaredSiteIds[0] && declaredSiteIds[0] !== store.siteId)) {
      unmatched.push({
        file: relative(root, file).replaceAll("\\", "/"),
        reason: "site-id-mismatch",
        expectedSiteId: store.siteId,
        declaredSiteIds,
      });
      continue;
    }
    const pageId = pageIdForHtml(root, file, document);
    const page = Object.hasOwn(store.pages, pageId) ? store.pages[pageId] : {};
    const replacements = [];
    for (const [fieldId, copy] of Object.entries(page)) {
      if (fieldId.startsWith("auto:")) {
        unmatched.push({file: relative(root, file), pageId, fieldId, reason: "automatic-field"});
        continue;
      }
      const matches = document.fields.filter((field) => field.id === fieldId);
      if (matches.length === 0) {
        unmatched.push({file: relative(root, file), pageId, fieldId, reason: "leaf-field-not-found"});
        continue;
      }
      if (matches.length > 1) {
        unmatched.push({file: relative(root, file), pageId, fieldId, reason: "duplicate-leaf-field"});
        continue;
      }
      const match = matches[0];
      if (!match.leaf) {
        unmatched.push({file: relative(root, file), pageId, fieldId, reason: "leaf-field-not-found"});
        continue;
      }
      replacements.push({start: match.contentStart, end: match.contentEnd, copy: escapeHtml(copy)});
    }
    let next = original;
    for (const replacement of replacements.sort((left, right) => right.start - left.start)) {
      next = `${next.slice(0, replacement.start)}${replacement.copy}${next.slice(replacement.end)}`;
    }
    if (next !== original) {
      changes.push({file: relative(root, file).replaceAll("\\", "/"), pageId});
      plans.push({file, original, next});
    }
  }

  const dryRun = flags["dry-run"] === true;
  if (unmatched.length) {
    output({ok: false, command: "apply", root, dryRun, changes: [], plannedChanges: changes, unmatched}, flags.json === true);
    process.exitCode = 1;
    return;
  }

  if (!dryRun) {
    if (flags.backup !== false) {
      for (const plan of plans) await backupFile(plan.file);
    }
    const written = [];
    try {
      for (const plan of plans) {
        await atomicWrite(plan.file, plan.next);
        written.push(plan);
      }
    } catch (error) {
      let rolledBack = true;
      for (const plan of written.reverse()) {
        try {
          await atomicWrite(plan.file, plan.original);
        } catch {
          rolledBack = false;
        }
      }
      throw new CliError("apply-write-failed", `apply failed while writing files${rolledBack ? "; completed writes were rolled back" : "; rollback was incomplete"}`, {rolledBack});
    }
  }

  output({ok: true, command: "apply", root, dryRun, changes, unmatched: []}, flags.json === true);
};

const openBrowser = (url) => {
  const command = process.platform === "win32" ? "cmd.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(command, args, {detached: true, stdio: "ignore", windowsHide: true}).unref();
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const sendJson = (response, statusCode, value, headers = {}) => {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {"Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store", ...securityHeaders, ...headers});
  response.end(body);
};

const serveCommand = async (rootArg, flags) => {
  const root = await resolveRoot(rootArg);
  const hazards = await rootHazards(root);
  if (hazards.length && flags["allow-project-root"] !== true) {
    throw new Error(`refusing to serve a root containing ${hazards.join(", ")}; serve the built output directory, or pass --allow-project-root after reviewing the risk`);
  }
  const content = resolveContent(root, typeof flags.content === "string" ? flags.content : undefined);
  const contentUrl = typeof flags["content-url"] === "string" ? flags["content-url"] : "/copyweave.content.json";
  if (!contentUrl.startsWith("/") || contentUrl.includes("..") || contentUrl.includes("\\")) throw new Error("content URL must be a root-relative URL without '..'");
  const port = Number.parseInt(typeof flags.port === "string" ? flags.port : "4176", 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("port must be an integer from 0 to 65535");
  try {
    await stat(content);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWrite(content, `${JSON.stringify(createStore(root.split(/[\\/]/).at(-1) || "site"), null, 2)}\n`);
  }
  const initialStore = JSON.parse(await readFile(content, "utf8"));
  if (!validateStore(initialStore)) throw new Error("content file failed CopyWeave schema validation");
  const siteId = initialStore.siteId;
  const token = randomBytes(24).toString("base64url");
  let saveQueue = Promise.resolve();
  let activePort = port;

  const contentState = async () => {
    const bytes = await readFile(content);
    return {bytes, etag: hash(bytes)};
  };

  const server = createServer(async (request, response) => {
    const host = request.headers.host ?? "";
    const allowedHosts = new Set([`127.0.0.1:${activePort}`, `localhost:${activePort}`]);
    if (!allowedHosts.has(host)) {
      sendJson(response, 421, {ok: false, code: "invalid-host"});
      return;
    }
    if (request.method === "GET" && request.url === "/__copyweave/session") {
      const state = await contentState();
      sendJson(response, 200, {ok: true, token, etag: state.etag, siteId});
      return;
    }
    if ((request.method === "GET" || request.method === "HEAD") && request.url?.split("?", 1)[0] === contentUrl) {
      const state = await contentState();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": state.bytes.byteLength,
        "Cache-Control": "no-store",
        ETag: state.etag,
        ...securityHeaders,
      });
      if (request.method === "HEAD") response.end();
      else response.end(state.bytes);
      return;
    }
    if (request.url === "/__copyweave/save") {
      if (request.method !== "PUT") {
        response.writeHead(405, {Allow: "PUT", ...securityHeaders});
        response.end();
        return;
      }
      if (request.headers.origin && request.headers.origin !== `http://${host}`) {
        sendJson(response, 403, {ok: false, code: "cross-origin"});
        return;
      }
      if (request.headers["x-copyweave-token"] !== token) {
        sendJson(response, 401, {ok: false, code: "invalid-token"});
        return;
      }
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        sendJson(response, 415, {ok: false, code: "content-type"});
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY) {
          sendJson(response, 413, {ok: false, code: "too-large"});
          return;
        }
        chunks.push(chunk);
      }
      let next;
      try {
        next = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        sendJson(response, 400, {ok: false, code: "invalid-json"});
        return;
      }
      if (!validateStore(next, siteId)) {
        sendJson(response, 400, {ok: false, code: "invalid-content"});
        return;
      }
      saveQueue = saveQueue.then(async () => {
        const current = await contentState();
        if (request.headers["if-match"] !== "*" && request.headers["if-match"] !== current.etag) {
          sendJson(response, 412, {ok: false, code: "content-conflict"}, {ETag: current.etag});
          return;
        }
        if (flags.backup !== false) await backupFile(content);
        const serialized = `${JSON.stringify(next, null, 2)}\n`;
        await atomicWrite(content, serialized);
        const etag = hash(Buffer.from(serialized));
        sendJson(response, 200, {ok: true, diskSaved: true, etag}, {ETag: etag});
      }).catch(() => {
        if (!response.headersSent) sendJson(response, 500, {ok: false, code: "write-failed"});
      });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, {Allow: "GET, HEAD, PUT", ...securityHeaders});
      response.end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    } catch {
      sendJson(response, 400, {ok: false, code: "invalid-url"});
      return;
    }
    if (blockedStaticPath(pathname)) {
      sendJson(response, 403, {ok: false, code: "sensitive-path"});
      return;
    }
    const candidate = resolve(root, pathname.replace(/^[/\\]+/, "") || "index.html");
    if (!inside(root, candidate)) {
      sendJson(response, 403, {ok: false, code: "path-traversal"});
      return;
    }
    let file = candidate;
    try {
      const details = await stat(file);
      if (details.isDirectory()) file = resolve(file, "index.html");
      const realFile = await realpath(file);
      if (!inside(root, realFile)) {
        sendJson(response, 403, {ok: false, code: "symlink-escape"});
        return;
      }
      const canonicalRequestPath = `/${relative(root, realFile).replaceAll("\\", "/")}`;
      if (blockedStaticPath(canonicalRequestPath)) {
        sendJson(response, 403, {ok: false, code: "sensitive-path"});
        return;
      }
      const fileDetails = await stat(realFile);
      const headers = {
        "Content-Type": MIME_TYPES[extname(realFile).toLowerCase()] ?? "application/octet-stream",
        "Content-Length": fileDetails.size,
        "Cache-Control": realFile === content ? "no-store" : "no-cache",
        ...securityHeaders,
      };
      if (realFile === content) headers.ETag = (await contentState()).etag;
      response.writeHead(200, headers);
      if (request.method === "HEAD") response.end();
      else createReadStream(realFile).pipe(response);
    } catch (error) {
      if (!response.headersSent) sendJson(response, error?.code === "ENOENT" ? 404 : 500, {ok: false, code: error?.code === "ENOENT" ? "not-found" : "read-failed"});
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", () => resolveListen());
  }).catch((error) => {
    if (error?.code === "EADDRINUSE") throw new Error(`port ${port} is in use; choose another with --port (browser drafts are isolated by port)`);
    throw error;
  });

  const address = server.address();
  activePort = typeof address === "object" && address ? address.port : port;
  const url = `http://127.0.0.1:${activePort}/index.html?copyweave`;
  output({
    ok: true,
    command: "serve",
    root,
    content,
    contentUrl,
    siteId,
    url,
    pid: process.pid,
    securityNotice: "Serve only a trusted build. Same-origin scripts and service workers can use this local editing session.",
  }, flags.json === true);
  if (flags.open !== false && process.env.COPYWEAVE_NO_OPEN !== "1") openBrowser(url);
};

const {positionals, flags, duplicates} = parseArgs(process.argv.slice(2));
const command = positionals[0];
const rootArg = positionals[1];

try {
  if (command === "--version" || command === "version" || flags.version === true) output(VERSION);
  else if (!command || command === "help" || flags.help === true) output(help.trim());
  else if (command === "init") {
    validateCommandArgs(command, positionals, flags, duplicates);
    await initCommand(rootArg, flags);
  } else if (command === "serve") {
    validateCommandArgs(command, positionals, flags, duplicates);
    await serveCommand(rootArg, flags);
  } else if (command === "doctor") {
    validateCommandArgs(command, positionals, flags, duplicates);
    await doctorCommand(rootArg, flags);
  } else if (command === "apply") {
    validateCommandArgs(command, positionals, flags, duplicates);
    await applyCommand(rootArg, flags);
  } else fail(`unknown command: ${command}\n\n${help}`, 2, flags.json === true, {code: "unknown-command", command});
} catch (error) {
  if (error instanceof CliError) fail(error.message, 1, flags.json === true, {code: error.code, ...error.details});
  else fail(error instanceof Error ? error.message : "unexpected failure", 1, flags.json === true, {code: "unexpected-error"});
}
