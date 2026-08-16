<p align="center">
  <img src="./docs/assets/copyweave-social.svg" alt="CopyWeave — Edit the words. Keep the design." width="100%" />
</p>

<p align="center">
  <strong>A local-first copy editor for websites that are already designed.</strong><br />
  Edit visible words in place. Save portable JSON. Keep the framework, typography, layout, and code ownership.
</p>

<p align="center">
  <a href="#three-minute-start-after-npm-publication">Quick start</a> ·
  <a href="https://ya-way.github.io/copyweave/?copyweave">Live demo</a> ·
  <a href="./demo">Demo</a> ·
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="./skill/copyweave-integrator">Agent Skill</a> ·
  <a href="./docs/SECURITY-MODEL.md">Security model</a>
</p>

> [!IMPORTANT]
> CopyWeave is a tested `0.1.0` release candidate, not a claim that npm publication has happened. Until the first release, `npm install copyweave` may return 404. Evaluate this source tree with `npm ci && npm run check`; the npm quick start below becomes the primary path only after the [release checklist](./docs/RELEASE.md) is complete. Names checked on 2026-08-11 are not reserved until publication.

## The missing human layer

Vibe coding can finish a layout before the words are ready. The usual next step is surprisingly hostile: ask the writer to edit components, paste every revision back into a prompt, or install a hosted CMS that now owns the workflow.

CopyWeave adds a removable editing layer instead:

- **Writers edit the real composition.** No detached spreadsheet or miniature form preview.
- **Developers keep durable IDs and reviewable JSON.** No opaque DOM-index database.
- **The site keeps its design.** Normal mode has no editor chrome and automatic fields use `display: contents`.
- **Nobody needs an account.** Drafts live in the browser; committed copy lives in your project.

## Three-minute start (after npm publication)

**Prerequisite:** Node.js 20 or newer.

Install the package:

```bash
npm install copyweave
```

Give important copy stable, human-readable IDs:

```html
<body data-copy-page="home">
  <h1 data-copy-id="hero.title">A title worth revising.</h1>
  <p data-copy-id="hero.summary">The current copy remains the source default.</p>
</body>
```

Mount the editor in your existing client entry:

```ts
import {createCopyWeave} from "copyweave";

const editor = createCopyWeave({
  siteId: "my-site", // always set this; it namespaces drafts and must match the JSON file
  pageId: document.body.dataset.copyPage,
  activation: "query", // the launcher appears only with ?copyweave
});
```

Create a project content file and open the built site:

```bash
npx copyweave init dist --site-id my-site
npx copyweave serve dist
```

The CLI opens `http://127.0.0.1:4176/index.html?copyweave`. Edit a field and press **Ctrl/⌘ + S**. The save is accepted only after the browser presents the local session token and the current ETag.

Run the editing server only against a trusted build. JavaScript already executing on that same local origin can request the session token; CopyWeave's token prevents cross-site writes, not malicious same-origin code.

For a Vite-style project, keep the committed file in `public/` while serving `dist/`:

```bash
npx copyweave init public --site-id my-site
npx copyweave serve dist --content ../public/copyweave.content.json
```

## What the user sees

| State | What happens |
|---|---|
| Normal page | No outlines, panel, rewritten font, or link interception. |
| `?copyweave` | A small editor launcher appears. |
| Edit mode | Plain-text fields receive clear outlines; links and buttons pause. |
| Browser draft | Debounced to `localStorage`; safe across refreshes on the same origin. |
| Project save | Written atomically to JSON by the loopback CLI; UI confirms disk success only after HTTP 200. |
| Production apply | `copyweave apply` writes explicit leaf-field values into static HTML, with a backup. |

## Stable fields first, automatic discovery second

`data-copy-id` is the production contract. Use semantic IDs that survive visual refactors:

```html
<nav>
  <a data-copy-id="nav.products" href="/products">Products</a>
</nav>
```

CopyWeave can also discover visible text automatically. Those IDs begin with `auto:` and are ideal for trying the editor or migrating an existing site, but DOM changes can move them. `copyweave doctor --strict` makes that risk visible instead of silently promising stability.

```ts
createCopyWeave({
  mode: "hybrid",   // explicit IDs + automatic fallback (default)
  // mode: "explicit" for production-only semantic fields
});
```

Use `data-copyweave-ignore` to exclude a subtree. Scripts, styles, SVG, media, form controls, code blocks, hidden content, and existing editors are excluded by default.

## The saving model

CopyWeave keeps three layers separate:

```text
HTML source defaults  ←  project baseline + browser draft  →  committed project JSON
```

- HTML remains the fallback and is never destroyed by an invalid import.
- JSON contains only values that differ from source copy.
- Browser drafts retain the project baseline and ETag they were based on.
- Independent browser/project changes merge field by field; a same-field conflict keeps the draft exportable and blocks disk save.
- Disk writes require a random session token and `If-Match` ETag.
- A stale tab gets `412 content-conflict`, not a false “saved” message.
- Import is plain text only, site-scoped, size-limited, and schema-validated before replacement.
- If browser storage is unavailable or full, the panel stops claiming draft safety, keeps Export available, and records a `browser-storage-unavailable` diagnostic.
- Missing, malformed, unreachable, and wrong-`siteId` project files produce different recovery instructions and all block disk save.

See the [JSON Schema](./schema/copyweave.schema.json) and [security model](./docs/SECURITY-MODEL.md).

## CLI

```text
copyweave init [root]     Create a versioned content file.
copyweave serve [root]    Serve locally and enable safe project-file saves.
copyweave doctor [root]   Audit IDs, nested fields, SVG/CSS copy, and integration.
copyweave apply [root]    Bake explicit leaf copy into static HTML with backups.
```

Every command is non-interactive and supports `--json` where an agent or CI needs structured output.
Unknown, duplicated, misspelled, or valueless options fail closed. `apply` plans every target before writing; an unmatched or duplicate field leaves all HTML untouched.
If an HTML document declares `<html data-copyweave-site="…">`, `apply` also requires that value to match the content store's `siteId`; cross-project copy is never baked silently.
`serve` prints its trust boundary at startup: same-origin scripts and service workers can use the local editing session, so edit only a build you trust.

```bash
npx copyweave doctor dist --strict --json
npx copyweave apply dist --content ../public/copyweave.content.json --dry-run --json
```

## Browser API

```ts
const editor = createCopyWeave(options);

editor.open();
editor.close();
editor.refresh();       // call after an SPA renders a new route
await editor.save();
editor.export();
editor.import(json);
editor.resetPage();
editor.getStore();
editor.getDiagnostics();
editor.destroy();
```

TypeScript definitions ship with the package. The browser runtime has **zero runtime dependencies** and the compressed IIFE bundle is held below an 18 kB gzip budget.

## Framework fit

| Stack | Recommended integration |
|---|---|
| Static HTML / multi-page site | IIFE or ESM entry; `data-copy-page` per document. |
| Vite / Astro | Import in the client entry; keep JSON in `public/`; serve the build with an external content path. |
| React / Vue / Svelte SPA | Mount after hydration and call `refresh()` after route content settles. Prefer explicit leaf IDs. |
| SSR / static export | Use explicit IDs. Run `apply` when the output is plain HTML; otherwise keep JSON as a runtime layer. |

Detailed recipes live in [Integration patterns](./docs/INTEGRATION.md).

## For AI coding agents

The repository is intentionally legible to agents:

- [`AGENTS.md`](./AGENTS.md) states invariants, architecture, commands, and unsafe changes.
- [`llms.txt`](./llms.txt) is a compact documentation map.
- CLI errors have stable codes and JSON output.
- Content has a published schema and semantic field IDs.
- The bundled [`copyweave-integrator` Skill](./skill/copyweave-integrator) encodes the full screenshot → integrate → save → two-pass review workflow.

From a clone or downloaded source tree, install the Skill without an owner-specific URL:

```bash
npx skills add ./skill/copyweave-integrator
```

After installing the npm package, the same Skill is available at `node_modules/copyweave/skill/copyweave-integrator`.

## Security and privacy

- No telemetry, cloud account, cookies, or remote service.
- The save server binds to `127.0.0.1` only.
- Host, Origin, content type, token, ETag, body size, schema, path, and realpath are checked.
- User copy is written with `textContent`, never `innerHTML`.
- Atomic writes use exclusively created, unique temporary files; the previous project and HTML files receive `.backup` copies by default.
- `.backup` files are local recovery material and can contain removed copy. The CLI refuses to serve them; keep them out of Git and every deployment artifact.
- Serving an obvious project root is refused by default; dotfiles, repository metadata, dependency trees, source maps, lockfiles, and common secret/key formats are never served as static assets.
- The editor is hidden by default unless the activation query is present.

Please report vulnerabilities through the private path in [`SECURITY.md`](./SECURITY.md), not a public issue.

## Remove it without losing the final words

`editor.destroy()` only tears down the controller on the current page. It is not an uninstall or a content migration. To remove CopyWeave cleanly:

1. Put every approved override back into the real source of truth: update components/templates during the framework build, or run `copyweave apply` only when the shipped source is leaf-only static HTML.
2. Rebuild and verify the normal URL without `?copyweave`; final copy must remain with no CopyWeave runtime, panel, or JSON request.
3. Remove the `createCopyWeave()` mount, IIFE/ESM script, and any development-only server command.
4. Run `npm uninstall copyweave` (or remove the vendored bundle).
5. Delete `copyweave.content.json`, browser drafts, and local `.backup` recovery files only after the source-only build has passed review.

This order makes “removable” a testable property rather than a promise. See the longer [integration removal checklist](./docs/INTEGRATION.md#safe-removal).

## Honest limitations

- Automatic IDs are not a substitute for semantic IDs across a DOM refactor.
- An omitted `siteId` raises an `implicit-site-id` diagnostic. Always set a stable project-specific value; projects sharing an origin must not share a draft namespace accidentally.
- Explicit fields containing nested markup are split and warned about; durable fields should be text leaves.
- `apply` intentionally handles conservative, leaf-only static HTML. It does not rewrite JSX, Vue SFCs, or arbitrary templates.
- Runtime JSON is applied after JavaScript starts. If SEO/no-JS must contain final copy, bake it during your framework build or use `apply` on static output.
- CopyWeave is local single-writer tooling, not a hosted collaborative CMS.
- A same-field browser/project conflict requires a human reconciliation through export/import; CopyWeave will not guess which sentence wins.
- Rich text, image metadata, `aria-label`, placeholders, and translation workflows are not 0.1 features.

## Development

These commands are for a source checkout or an extracted npm tarball after installing its development dependencies; they are not expected to run from `node_modules/copyweave` inside another project.

```bash
npm install
npm run check
npm run dev
```

`npm run check` type-checks, runs unit/integration/security tests, builds both bundles, enforces the size budget, audits the demo, and dry-runs the npm package contents.

Read [Contributing](./CONTRIBUTING.md), the [roadmap](./ROADMAP.md), and the [architecture](./docs/ARCHITECTURE.md) before proposing a large change.

## License

[MIT](./LICENSE) — use it, adapt it, and keep the human in the loop.
