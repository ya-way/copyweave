import {readFile} from "node:fs/promises";
import {resolve} from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const repository = typeof packageJson.repository === "string" ? packageJson.repository : packageJson.repository?.url;
const bugs = typeof packageJson.bugs === "string" ? packageJson.bugs : packageJson.bugs?.url;
const values = {repository, homepage: packageJson.homepage, bugs};
const missing = Object.entries(values)
  .filter(([, value]) => typeof value !== "string" || !/^https:\/\//.test(value) || /(?:OWNER|YOUR|example\.com|<|>)/i.test(value))
  .map(([key]) => key);

if (missing.length) {
  console.error(JSON.stringify({
    ok: false,
    code: "release-metadata-incomplete",
    missing,
    message: "Set the real repository, homepage, and bugs URLs only after the GitHub owner and repository exist.",
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ok: true, repository, homepage: packageJson.homepage, bugs}, null, 2));
