// @vitest-environment node

import {spawn, spawnSync, type ChildProcess} from "node:child_process";
import {link, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {afterEach, describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "..");
const cli = resolve(root, "bin/copyweave.mjs");
const temporary: string[] = [];
const children: ChildProcess[] = [];

const tempSite = async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "copyweave-test-"));
  temporary.push(directory);
  await writeFile(resolve(directory, "index.html"), '<!doctype html><body data-copy-page="home"><h1 data-copy-id="hero.title">Source</h1><script>copyweave</script></body>', "utf8");
  return directory;
};

const run = (args: string[]) => spawnSync(process.execPath, [cli, ...args], {encoding: "utf8"});

const startServer = async (directory: string, extraArgs: string[] = []) => {
  const child = spawn(process.execPath, [cli, "serve", directory, "--port", "0", "--no-open", "--json", ...extraArgs], {stdio: ["ignore", "pipe", "pipe"]});
  children.push(child);
  const line = await new Promise<string>((resolveLine, rejectLine) => {
    let buffer = "";
    const timeout = setTimeout(() => rejectLine(new Error("server startup timed out")), 8000);
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline >= 0) {
        clearTimeout(timeout);
        resolveLine(buffer.slice(0, newline));
      }
    });
    child.once("error", rejectLine);
    child.once("exit", (code) => rejectLine(new Error(`server exited early: ${code}`)));
  });
  return {child, info: JSON.parse(line) as {url: string; content: string; securityNotice: string}};
};

afterEach(async () => {
  for (const child of children.splice(0)) child.kill();
  for (const directory of temporary.splice(0)) await rm(directory, {recursive: true, force: true});
});

describe("CopyWeave CLI", () => {
  it("initializes and diagnoses a semantic HTML site", async () => {
    const directory = await tempSite();
    const initialized = run(["init", directory, "--site-id", "fixture", "--json"]);
    expect(initialized.status).toBe(0);
    const store = JSON.parse(await readFile(resolve(directory, "copyweave.content.json"), "utf8"));
    expect(store.siteId).toBe("fixture");

    const doctor = run(["doctor", directory, "--strict", "--json"]);
    expect(doctor.status).toBe(0);
    expect(JSON.parse(doctor.stdout).summary.explicitFields).toBe(1);
  });

  it("fails closed on unknown options and mixed marked/unmarked copy", async () => {
    const directory = await tempSite();
    const typo = run(["doctor", directory, "--strcit", "--json"]);
    expect(typo.status).not.toBe(0);
    expect(typo.stderr).toMatch(/unknown option/i);
    expect(JSON.parse(typo.stderr)).toMatchObject({code: "unknown-option", option: "strcit"});
    const duplicate = run(["doctor", directory, "--strict", "--no-strict", "--json"]);
    expect(duplicate.status).not.toBe(0);
    expect(JSON.parse(duplicate.stderr)).toMatchObject({code: "duplicate-option", option: "strict"});

    await writeFile(resolve(directory, "index.html"), '<!doctype html><body><h1 data-copy-id="hero.title">Marked</h1><p>Unmarked sentence</p><script>copyweave</script></body>', "utf8");
    const mixed = run(["doctor", directory, "--strict", "--json"]);
    expect(mixed.status).not.toBe(0);
    expect(JSON.parse(mixed.stdout).diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "unmarked-visible-text"}),
    ]));
  });

  it("diagnoses dangerous and malformed field and page IDs", async () => {
    const directory = await tempSite();
    await writeFile(resolve(directory, "index.html"), '<!doctype html><body data-copy-page="constructor"><h1 data-copy-id="constructor">One</h1><p data-copy-id="bad field">Two</p><script>copyweave</script></body>', "utf8");
    const doctor = run(["doctor", directory, "--strict", "--json"]);
    expect(doctor.status).not.toBe(0);
    const report = JSON.parse(doctor.stdout);
    expect(report.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({code: "invalid-field-id", field: "constructor"}),
      expect.objectContaining({code: "invalid-field-id", field: "bad field"}),
      expect.objectContaining({code: "invalid-page-id", field: "constructor"}),
    ]));
  });

  it("saves with a session token and ETag, then rejects stale and cross-origin writes", async () => {
    const directory = await tempSite();
    expect(run(["init", directory, "--site-id", "fixture"]).status).toBe(0);
    const victimDirectory = await mkdtemp(resolve(tmpdir(), "copyweave-victim-"));
    temporary.push(victimDirectory);
    const victim = resolve(victimDirectory, "outside.txt");
    await writeFile(victim, "DO NOT CHANGE", "utf8");
    await link(victim, resolve(directory, "copyweave.content.json.backup"));
    const {info} = await startServer(directory);
    expect(info.securityNotice).toMatch(/trusted build|same-origin/i);
    const base = new URL(info.url);
    const sessionResponse = await fetch(new URL("/__copyweave/session", base));
    const session = await sessionResponse.json() as {token: string; etag: string};
    const contentResponse = await fetch(new URL("/copyweave.content.json", base));
    const store = await contentResponse.json() as Record<string, unknown> & {pages: Record<string, Record<string, string>>};
    store.updatedAt = new Date().toISOString();
    store.pages.home = {"hero.title": "Saved"};
    const headers = {"Content-Type": "application/json", "X-CopyWeave-Token": session.token, "If-Match": session.etag};

    const saved = await fetch(new URL("/__copyweave/save", base), {method: "PUT", headers, body: JSON.stringify(store)});
    expect(saved.status).toBe(200);
    expect((await saved.json() as {diskSaved: boolean}).diskSaved).toBe(true);
    expect(await readFile(victim, "utf8")).toBe("DO NOT CHANGE");
    expect(await readFile(resolve(directory, "copyweave.content.json.backup"), "utf8")).toMatch(/copyweave\/content/);

    const stale = await fetch(new URL("/__copyweave/save", base), {method: "PUT", headers, body: JSON.stringify(store)});
    expect(stale.status).toBe(412);

    const crossOrigin = await fetch(new URL("/__copyweave/save", base), {
      method: "PUT",
      headers: {...headers, Origin: "https://example.invalid", "If-Match": saved.headers.get("etag") ?? "*"},
      body: JSON.stringify(store),
    });
    expect(crossOrigin.status).toBe(403);
  }, 15_000);

  it("applies explicit content to leaf HTML and creates a backup", async () => {
    const directory = await tempSite();
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": "Committed & human"}},
    }), "utf8");
    const misspelledDryRun = run(["apply", directory, "--dryrun", "--json"]);
    expect(misspelledDryRun.status).not.toBe(0);
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toContain("Source");
    const victimDirectory = await mkdtemp(resolve(tmpdir(), "copyweave-victim-"));
    temporary.push(victimDirectory);
    const victim = resolve(victimDirectory, "outside.txt");
    await writeFile(victim, "DO NOT CHANGE", "utf8");
    await link(victim, resolve(directory, "index.html.backup"));
    const applied = run(["apply", directory, "--json"]);
    expect(applied.status).toBe(0);
    expect(await readFile(victim, "utf8")).toBe("DO NOT CHANGE");
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toContain("Committed &amp; human");
    expect(await readFile(resolve(directory, "index.html.backup"), "utf8")).toContain("Source");
  });

  it("preflights every field before apply and accepts semantic numeric suffixes", async () => {
    const directory = await tempSite();
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": "Would change", "missing.field": "Missing"}},
    }), "utf8");
    const blocked = run(["apply", directory, "--json"]);
    expect(blocked.status).not.toBe(0);
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toContain("Source");

    await writeFile(resolve(directory, "index.html"), '<!doctype html><body data-copy-page="home"><p data-copy-id="stat.1">One</p></body>', "utf8");
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {home: {"stat.1": "First"}},
    }), "utf8");
    expect(run(["apply", directory, "--json"]).status).toBe(0);
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toContain(">First</p>");
  });

  it("refuses to apply content across an explicitly different site", async () => {
    const directory = await tempSite();
    const source = '<!doctype html><html data-copyweave-site="site-b"><body data-copy-page="home"><h1 data-copy-id="hero.title">Source</h1></body></html>';
    await writeFile(resolve(directory, "index.html"), source, "utf8");
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "site-a",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": "Wrong project"}},
    }), "utf8");

    const applied = run(["apply", directory, "--dry-run", "--json"]);
    expect(applied.status).not.toBe(0);
    expect(JSON.parse(applied.stdout).unmatched).toEqual(expect.arrayContaining([
      expect.objectContaining({reason: "site-id-mismatch", expectedSiteId: "site-a", declaredSiteIds: ["site-b"]}),
    ]));
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toBe(source);
  });

  it("rejects impossible calendar timestamps and counts copy in Unicode code points", async () => {
    const directory = await tempSite();
    const store = {
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: "2021-02-29T00:00:00Z",
      pages: {home: {"hero.title": "Invalid date"}},
    };
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify(store), "utf8");
    expect(run(["apply", directory, "--dry-run", "--json"]).status).not.toBe(0);

    store.updatedAt = "2020-02-29T00:00:00Z";
    store.pages.home["hero.title"] = "😀".repeat(100_000);
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify(store), "utf8");
    expect(run(["apply", directory, "--dry-run", "--json"]).status).toBe(0);

    store.pages.home["hero.title"] = "😀".repeat(100_001);
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify(store), "utf8");
    expect(run(["apply", directory, "--dry-run", "--json"]).status).not.toBe(0);
  });

  it("recognizes uppercase HTML extensions", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "copyweave-uppercase-"));
    temporary.push(directory);
    await writeFile(resolve(directory, "INDEX.HTML"), '<!doctype html><body data-copy-page="home"><h1 data-copy-id="hero.title">Source</h1><script>copyweave</script></body>', "utf8");
    const doctor = run(["doctor", directory, "--strict", "--json"]);
    expect(doctor.status).toBe(0);
    expect(JSON.parse(doctor.stdout).summary).toMatchObject({htmlFiles: 1, explicitFields: 1, errors: 0, warnings: 0});

    await writeFile(resolve(directory, "INDEX.HTML"), '<!doctype html><body><h1 data-copy-id="hero.title">Source</h1><script>copyweave</script></body>', "utf8");
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {"/": {"hero.title": "Root page"}},
    }), "utf8");
    const applied = run(["apply", directory, "--dry-run", "--json"]);
    expect(applied.status).toBe(0);
    expect(JSON.parse(applied.stdout).changes).toEqual([expect.objectContaining({pageId: "/"})]);
  });

  it("cleans an exclusive temporary file when atomic replacement fails", async () => {
    const directory = await tempSite();
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": "Would change"}},
    }), "utf8");
    await mkdir(resolve(directory, "index.html.backup"));
    const failed = run(["apply", directory, "--json"]);
    expect(failed.status).not.toBe(0);
    expect((await readdir(directory)).filter((name) => /^\.copyweave-.*\.tmp$/.test(name))).toEqual([]);
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toContain("Source");
  });

  it("never diagnoses or applies pseudo fields inside scripts, comments, styles, or templates", async () => {
    const directory = await tempSite();
    const source = `<!doctype html><body data-copy-page="home">
      <h1 data-copy-id="hero.title">Source</h1>
      <script src="./copyweave.iife.js">const fake = '<h1 data-copy-id="hero.title">Script source</h1>';</script>
      <style>.fake::before{content:'<h1 data-copy-id="hero.title">Style source</h1>'}</style>
      <template><h1 data-copy-id="hero.title">Template source</h1></template>
      <!-- <h1 data-copy-id="hero.title">Comment source</h1> -->
    </body>`;
    await writeFile(resolve(directory, "index.html"), source, "utf8");
    const doctor = run(["doctor", directory, "--strict", "--json"]);
    expect(doctor.status).toBe(0);
    expect(JSON.parse(doctor.stdout).summary.explicitFields).toBe(1);

    const payload = "x';globalThis.COPYWEAVE_PWNED=true;`tick`;</script>";
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": payload}},
    }), "utf8");
    const applied = run(["apply", directory, "--json"]);
    expect(applied.status).toBe(0);
    const next = await readFile(resolve(directory, "index.html"), "utf8");
    expect(next).toContain("x';globalThis.COPYWEAVE_PWNED=true;`tick`;&lt;/script&gt;");
    expect(next).toContain("Script source</h1>");
    expect(next).not.toContain("const fake = 'x';globalThis.COPYWEAVE_PWNED");
  });

  it("fails closed when the only apparent field is pseudo markup in an inline script", async () => {
    const directory = await tempSite();
    const source = '<!doctype html><body data-copy-page="home"><script>copyweave; const fake = \'<h1 data-copy-id="hero.title">Source</h1>\';</script></body>';
    await writeFile(resolve(directory, "index.html"), source, "utf8");
    const doctor = run(["doctor", directory, "--strict", "--json"]);
    expect(doctor.status).not.toBe(0);
    expect(JSON.parse(doctor.stdout).summary.explicitFields).toBe(0);
    await writeFile(resolve(directory, "copyweave.content.json"), JSON.stringify({
      format: "copyweave/content",
      version: 1,
      siteId: "fixture",
      updatedAt: new Date().toISOString(),
      pages: {home: {"hero.title": "Injected"}},
    }), "utf8");
    const applied = run(["apply", directory, "--json"]);
    expect(applied.status).not.toBe(0);
    expect(await readFile(resolve(directory, "index.html"), "utf8")).toBe(source);
  });

  it("refuses accidental project roots and never serves sensitive files", async () => {
    const directory = await tempSite();
    await writeFile(resolve(directory, ".env"), "SECRET=do-not-serve\n", "utf8");
    await writeFile(resolve(directory, "index.html.backup"), "REMOVED PRIVATE COPY\n", "utf8");
    const refused = run(["serve", directory, "--no-open", "--json"]);
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toMatch(/refusing to serve/i);

    const {info} = await startServer(directory, ["--allow-project-root"]);
    const blocked = await fetch(new URL("/.env", info.url));
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toMatchObject({code: "sensitive-path"});
    const encodedBackslash = await fetch(new URL("/safe%5c..%5c.env", info.url));
    expect(encodedBackslash.status).toBe(403);
    expect(await encodedBackslash.json()).toMatchObject({code: "sensitive-path"});
    const backup = await fetch(new URL("/index.html.backup", info.url));
    expect(backup.status).toBe(403);
    expect(await backup.json()).toMatchObject({code: "sensitive-path"});
    const ads = await fetch(new URL("/secret.key:payload", info.url));
    expect(ads.status).toBe(403);
    expect(await ads.json()).toMatchObject({code: "sensitive-path"});
  });
});
