import {readFile, stat} from "node:fs/promises";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const skillRoot = resolve(root, "skill/copyweave-integrator");
const skill = await readFile(resolve(skillRoot, "SKILL.md"), "utf8");
const manifest = await readFile(resolve(skillRoot, "agents/openai.yaml"), "utf8");
const lines = skill.split(/\r?\n/);
const frontmatterEnd = lines.indexOf("---", 1);

if (lines[0] !== "---" || frontmatterEnd < 2) throw new Error("SKILL.md must start with YAML frontmatter");
const frontmatter = Object.fromEntries(lines.slice(1, frontmatterEnd).map((line) => {
  const separator = line.indexOf(":");
  return separator < 1 ? [line, ""] : [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
}));

const failures = [];
if (frontmatter.name !== "copyweave-integrator") failures.push("frontmatter name must match the skill directory");
if (!frontmatter.description || frontmatter.description.length > 1024) failures.push("description must be present and at most 1024 characters");
if (/[<>]/.test(frontmatter.description ?? "")) failures.push("description may not contain angle brackets");
if (lines.length > 500) failures.push("SKILL.md exceeds the 500-line progressive-disclosure budget");
if (!/display_name:\s*["']CopyWeave Integrator["']/.test(manifest)) failures.push("openai.yaml display_name is missing");
if (!/default_prompt:[^\n]*\$copyweave-integrator/.test(manifest)) failures.push("default_prompt must invoke $copyweave-integrator");

for (const file of ["README.md", "LICENSE", "references/invariants.md", "references/integration-patterns.md", "references/field-ids.md", "references/qa-checklist.md", "references/security.md", "references/evaluation-evidence.md"]) {
  try {
    await stat(resolve(skillRoot, file));
  } catch {
    failures.push(`missing ${file}`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ok: false, failures}, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ok: true, name: frontmatter.name, lines: lines.length, references: 6}, null, 2));
