# CopyWeave architecture

This document describes the implementation shipped in the `0.1.x` line. It is
an implementation map and an honest statement of its boundaries, not a design
for a hosted CMS.

## Goals

CopyWeave adds a removable, plain-text editing layer to a website whose visual
design already exists. The primary design goals are:

- preserve the site's HTML, typography and layout in normal browsing mode;
- give important copy stable, semantic `data-copy-id` identifiers;
- keep source HTML as a usable fallback;
- keep browser drafts local and project copy in reviewable JSON;
- save the project file without an account or remote service;
- work on rendered DOM rather than requiring a particular UI framework;
- keep the browser bundle and local server free of runtime dependencies.

The primary deployment target is a static or multi-page site. A hydrated page
is supported when the owning framework does not continually replace edited
nodes. See [Framework boundaries](#framework-boundaries).

## System overview

```text
                            Browser document
                                  |
                  +---------------+----------------+
                  |                                |
           field discovery                   editor panel
     explicit IDs + auto fallback             Shadow DOM
                  |                                |
                  +-------- editor controller -----+
                                  |
           +----------------------+----------------------+
           |                      |                      |
       HTML defaults      localStorage envelope     project store
     (per field binding)   (draft + base + ETag)     (JSON + ETag)
                                                        |
                                           PUT /__copyweave/save
                                                        |
                                        loopback CLI save server
                                  atomic backup snapshot + atomic replace
```

The browser runtime is built as ESM and IIFE bundles. The CLI is a Node.js 20+
executable implemented with Node standard-library modules. The package has no
runtime dependencies.

## Module boundaries

| Area | Source | Responsibility |
|---|---|---|
| Public API | `src/index.ts`, `src/types.ts` | Export the controller, options and versioned content types. |
| Configuration | `src/options.ts`, `src/messages.ts` | Resolve defaults, activation, page/site identity, theme and locale. |
| Content contract | `src/schema.ts`, `schema/copyweave.schema.json` | Validate, normalize, clone and count version 1 content stores. |
| Field binding | `src/fields.ts` | Discover explicit and automatic fields, read/write plain text, and restore DOM attributes. |
| Browser storage | `src/storage.ts` | Read/write draft envelopes and fetch project JSON/session state. |
| Orchestration | `src/editor.ts` | Own edit state, field events, imports/exports, save flow, refresh and teardown. |
| Editor UI | `src/panel.ts`, `src/styles.ts` | Isolated controls plus edit-state field styling. |
| Local tooling | `bin/copyweave.mjs` | `init`, `serve`, `doctor`, and conservative static-HTML `apply`. |

The panel uses Shadow DOM to isolate its controls. Field styling is global
because editable fields live in the host document. User copy is applied with
`textContent`; CopyWeave does not persist rich HTML.

## Field model

### Explicit fields

An explicit leaf is the durable production contract:

```html
<body data-copy-page="home">
  <h1 data-copy-id="hero.title">Source title</h1>
</body>
```

Explicit IDs must be unique within a page. Leaf elements are edited directly,
so CopyWeave does not insert an extra layout box. An explicit element with
nested markup is diagnosed and split into derived text bindings; those derived
bindings are intentionally not supported by the static `apply` command.

### Automatic fields

In `auto` and `hybrid` modes, eligible text nodes without an explicit ancestor
are wrapped in `copyweave-field`. The wrapper uses `display: contents` outside
edit mode and `display: inline` while editing. Its key is derived from element
IDs, element positions and text-node position, and starts with `auto:`.

Automatic fields are a migration and trial mechanism. They are not stable
across arbitrary DOM refactors. `doctor --strict` is intended to make that
trade-off visible.

Scripts, styles, templates, media, form controls, code blocks, existing
`contenteditable` regions, hidden/inert/`aria-hidden` subtrees and explicitly
ignored subtrees are excluded by default.

## Content contract

Committed files, imports and exports use the public versioned content structure:

```json
{
  "format": "copyweave/content",
  "version": 1,
  "siteId": "example",
  "updatedAt": "2026-08-11T00:00:00.000Z",
  "pages": {
    "home": {
      "hero.title": "Edited title"
    }
  }
}
```

Only values that differ from the HTML source default are stored. Imports are
normalized before replacing the active store. Browser options and discovery,
the browser store validator, the CLI and the published schema share the same
identifier and capacity contract:

- site and page IDs are 1–240 characters, contain no control characters, and
  cannot be `__proto__`, `prototype` or `constructor`;
- field IDs follow the semantic/automatic field grammar, have the same
  240-character ceiling, and reject those three prototype-mutation names;
- a store contains at most 100 pages, 5,000 fields in total, and 100,000 Unicode
  code points in one copy value, matching JSON Schema `maxLength` semantics;
- `updatedAt` must be a parseable ISO-style date-time.

The standard JSON Schema can express the per-object limits but not the 5,000
field aggregate across every page. The `x-copyweave-maxTotalFields` annotation
documents that extra invariant; the browser and CLI enforce it directly.
Normalized page and page-map objects have null prototypes, and value lookup
uses own-property checks. This lets an ordinary field such as `toString` work
without inheriting `Object.prototype`, while the three mutation-sensitive names
remain invalid. `cloneStore()` revalidates its serialized input and throws if
the input is invalid; it never substitutes a blank store for a failed clone.

localStorage uses an internal `copyweave/draft` envelope rather than storing
only the public content object:

```json
{
  "format": "copyweave/draft",
  "version": 1,
  "siteId": "example",
  "updatedAt": "2026-08-11T00:00:00.000Z",
  "baseEtag": "\"sha256-...\"",
  "baseStore": {"format": "copyweave/content", "version": 1, "siteId": "example", "updatedAt": "...", "pages": {}},
  "store": {"format": "copyweave/content", "version": 1, "siteId": "example", "updatedAt": "...", "pages": {}}
}
```

`baseStore` is the last project snapshot on which the browser draft was based;
`baseEtag` identifies that project's bytes; `store` is the current browser
result. A plain legacy `copyweave/content` value in localStorage is still read,
but has no safe merge base. If the configured localStorage value cannot be
parsed or validated, CopyWeave keeps the original raw string at its existing
key,
pauses automatic browser-draft replacement, and marks the persistent storage
state as unreadable. Export requests a download containing that unparsed
value. An explicit
save/import/reset first copies them to a timestamped recovery key; only after
that archive succeeds may a valid draft replace the active key.

The published JSON Schema is a portability aid. The TypeScript/browser and CLI
validators remain the enforcement points. These validators and the published
schema must be kept in parity by tests whenever the format changes.

## The three content layers

CopyWeave has three distinct layers:

1. **HTML source defaults** — captured when each field is first bound and used
   whenever no override exists.
2. **Project JSON** — committed overrides loaded from `contentUrl` and written
   by the local server.
3. **Browser draft envelope** — current overrides plus the project base snapshot
   and ETag, debounced to `localStorage` while the user types.

The effective value for a bound field is the reconciled store's override, or
its HTML default when no override exists. The panel labels the ratio as
**Overrides / Editable** and separately keeps a persistent **Storage state**
(`source`, browser draft, project-synced, unavailable, invalid, or conflict).
Transient action messages do not replace that provenance indicator.

Field edits are checked before mutation. If an input exceeds the per-field
limit, only that DOM field is restored to its previous override or source
default; the store and all other browser-draft fields remain unchanged. A
whole-file import over 2 MiB is rejected before JSON parsing or store
replacement.

### Initialization and reconciliation

The browser draft is read synchronously while project JSON and session state
load in parallel. Edits made before project loading completes are recorded as
page/field deltas, including deletions and page resets. Disk save awaits this
initialization. Once the project arrives, pending deltas are applied on top of
that project snapshot rather than replacing it. An import before initialization
is treated as an explicit whole-store replacement, but still records the loaded
project as its base.

When a persisted draft has a `baseStore`, CopyWeave performs a per-field
three-way merge:

- only the browser changed: use the browser value;
- only the project changed: use the project value;
- both changed to the same value: use that value;
- both changed differently: retain the browser value for recovery, record a
  `project-draft-conflict`, and block disk save.

Independent edits therefore compose without relying on client clock order.
Same-field conflicts require a human decision through export/edit/import; the
runtime does not guess. A legacy draft without a base is accepted only when one
side is empty or both stores already match; otherwise save is blocked.

Project save additionally requires `projectBaseLoaded`. A failed or invalid
content response leaves that flag false even if the session endpoint returned a
token and ETag; disk save is blocked with a project-unavailable status while
the browser draft remains exportable. An ETag alone is not treated as proof that
the client constructed its replacement from project content.

## Save protocol

`copyweave serve` exposes three same-origin resources:

1. `GET /__copyweave/session` returns a process-random token, the current
   content ETag and the `siteId`.
2. `GET /copyweave.content.json` (or the configured root-relative URL) returns
   the project bytes with a strong SHA-256 ETag and `Cache-Control: no-store`.
3. `PUT /__copyweave/save` validates Host, Origin when present, token, content
   type, body size, schema and `If-Match` before queuing a write.

The browser waits for project/session requests before a disk save. A stale
ETag receives `412 content-conflict`; a successful response returns the new
ETag. The built-in browser client normally uses the ETag received from the
content or session endpoint. The server also accepts `If-Match: *`, so a caller
that has the session token can deliberately opt out of stale-write detection.

Writes are serialized inside one CLI process. Before replacement, the existing
target is read and that snapshot is written to an exclusively created, unique same-directory
temporary file, which is renamed over `<content>.backup` unless backups are
disabled. New JSON is likewise written to an exclusively created temporary file and renamed
over the target. Replacing the directory entry rather than opening an existing
backup for writing prevents a pre-existing backup symlink or hard link from
being used as a write-through path. The same replacement behavior avoids
following a target symlink during the final write. This gives atomic visibility
on supported filesystems; it is not a power-loss durability guarantee because
the implementation does not `fsync` the file/directory and does not coordinate
multiple CLI processes.

The content target may intentionally live outside the served root via
`--content`; this is how `public/` content can be edited while serving `dist/`.
That path is explicit operator authority, not a path inferred from HTTP input.

## CLI architecture

- `init` creates a blank versioned content file and does not modify HTML.
- `serve` resolves the site root, validates or creates the content file, binds
  only to `127.0.0.1`, and serves static files plus the save protocol.
- `doctor` performs a context-aware source scan for explicit IDs, duplicates,
  nested fields, generated CSS copy, SVG text and integration markers. On a
  page that already has explicit fields, it also reports eligible visible body
  text outside `data-copy-id`; `--strict` turns that warning into a non-zero
  result so a partially marked page cannot look fully migrated.
- `apply` replaces only explicit leaf-text spans returned by the same scanner.
  It escapes text, preflights every requested field, creates atomic backup
  snapshots by default and reports unmatched fields. When `<html>` declares a
  `data-copyweave-site`, it must match the store `siteId` before any write. It does not parse or
  rewrite framework source files.

Each command has an explicit option schema. Argument validation runs before the
command handler and rejects unknown options, missing values for string options,
wrong flag types and excess positional arguments. A misspelled safety option
therefore fails closed instead of being ignored.

`doctor` and `apply` use a deliberately small context-aware HTML scanner rather
than a full HTML parser. It tracks comments, quoted tag attributes, raw-text
elements and element nesting, and excludes `script`, `style`, `template` and
other non-copy subtrees. Markup-looking strings inside those contexts are not
diagnosed or replaced. `apply` accepts only one real explicit leaf match and
uses the scanner's byte span; it does not run a whole-file field regex. These
commands remain diagnostics/build helpers, not general-purpose HTML
transformation APIs, and unusual malformed HTML should be fixed before use.

Before listening, `serve` inspects the root for top-level repository metadata,
environment files and credential markers. A hazardous root is refused unless
the operator passes `--allow-project-root`. The override does not disable the
request denylist: dot-path segments, version-control directories,
`node_modules`, package/lock files, common credential names, keys, databases
and source maps return `403 sensitive-path`.

The denylist splits on both `/` and `\`, so percent-decoded Windows separators
cannot turn a previously unchecked segment into a filesystem path. Any path
segment containing `:` is denied to cover Windows alternate data stream syntax;
recovery extensions including `.backup`, `.bak`, `.old` and `.orig` are also
denied. After
`realpath`, the server converts the canonical target back to a root-relative
forward-slash path and applies the denylist a second time. This prevents a
benignly named in-root symlink or junction from aliasing an in-root blocked
target. A minimal output directory remains the durable control; filename
filtering is defense in depth and cannot identify every secret or hard link.

## Framework boundaries

“Framework agnostic” means CopyWeave operates on rendered DOM; it does not mean
it participates in every framework's state model.

| Environment | Current fit and limits |
|---|---|
| Static HTML / MPA | Primary target. Use a stable `data-copy-page` on every document. |
| Vite / Astro static output | Good fit when JSON is copied to `public/` and the built output is served by the CLI. |
| React / Vue / Svelte SPA | Mount after hydration. Framework rerenders can overwrite direct DOM changes. Call `refresh()` after route content settles. |
| Client-side routing | `refresh()` re-evaluates a functional `pageId`, updates the panel and applies that page's store. Source defaults are scoped by page and field. |
| SSR | Runtime overrides arrive after JavaScript and are not part of the initial HTML response. Use framework-native build integration for SEO/no-JS output. |
| Static export | `apply` can bake explicit leaf fields into emitted HTML, but not JSX, Vue SFCs, templates or nested rich markup. |
| Shadow-root content | Not supported as a complete integration: global field styles do not cross shadow boundaries and the panel is attached to the main document. |
| Cross-origin iframe | Not supported by the DOM and same-origin security model. |

Other current constraints:

- use one CopyWeave controller per document; global edit state and styles are
  not designed for independent concurrent instances;
- only text-node content is edited, not attributes, placeholders, alt text,
  ARIA labels, CSS-generated content or SVG text;
- strict CSP that forbids inline styles and Trusted Types policies that reject
  `innerHTML` require host integration not provided in 0.1.x;
- the default root-relative content URL must be overridden for subpath hosting;
- `display: contents` and browser `contenteditable` behavior should be visually
  tested on the site's supported browser matrix.

`sourceDefaults` is indexed by a tuple serialized as
`pageId + NUL + fieldId`. An SPA may therefore reuse a semantic key such as
`hero.title` on routes with different source text without cross-applying the
first route's default when `refresh()` runs.

## Regression-locked controls

The following behaviors are implemented controls, not open release risks:

| Invariant | Implementation | Regression evidence |
|---|---|---|
| A browser cannot replace the project after its content load failed. | `save()` requires `projectBaseLoaded`; a session token or ETag alone is insufficient, and the draft remains exportable. | `tests/editor.test.ts`: “blocks disk save when the project content base could not be loaded”. |
| Edits made during initialization do not replace unrelated project pages. | Field changes, deletions and page resets are replayed on the successfully loaded project base before save. | `tests/editor.test.ts`: “preserves project pages when copy changes before the project finishes loading”. |
| SPA routes do not share source defaults accidentally. | A functional `pageId` is re-evaluated by `refresh()`, and defaults are keyed by the page/field tuple. | `tests/editor.test.ts`: “re-resolves a functional page ID…” and “keeps source defaults scoped to the current SPA page”. |
| Decoded Windows separators cannot evade static-path policy. | The denylist splits on both `/` and `\`; after `realpath`, the canonical root-relative path is checked again. | `tests/cli.test.ts`: “refuses accidental project roots and never serves sensitive files”, including a `%5c` request. |
| CLI safety options fail closed. | Command-specific schemas reject unknown options and missing or wrong-typed values before any handler action. | `tests/cli.test.ts`: “fails closed on unknown options…” and the misspelled `--dryrun` assertion in the apply test. |
| Strict diagnostics expose partially annotated pages. | Eligible visible text outside explicit fields emits `unmarked-visible-text`; warnings fail `doctor --strict`. | `tests/cli.test.ts`: “…mixed marked/unmarked copy”. |
| Invalid stores cannot silently become empty clones. | `cloneStore()` normalizes the serialized value and throws when validation fails. Normalized maps use null prototypes and reads use `Object.hasOwn`. | `tests/schema.test.ts` and the browser prototype-name test. |
| Oversized editing cannot erase unrelated draft fields. | The active field is restored before store mutation; oversized imports are rejected before parsing or replacement. | Oversized field and import cases in `tests/editor.test.ts`. |
| A damaged browser draft is recovery-first. | Autosave pauses while the raw value remains at the original key; raw export is available; explicit replacement archives it to a recovery key first. | The unreadable browser-draft recovery case in `tests/editor.test.ts`. |
| Pseudo markup is not treated as copy. | One context-aware scanner excludes comments and script/style/template/raw-text contexts and returns only real leaf spans to `apply`. | Pseudo-field diagnosis/apply cases in `tests/cli.test.ts`. |
| Existing backup links are not write-through destinations. | Backups are materialized through a unique temporary file and atomic rename over the backup directory entry. | CLI save/apply tests protect an external hard-link victim. |

## Failure modes

| Failure | Observable behavior | Mitigation |
|---|---|---|
| `localStorage` unavailable or full | Current DOM remains editable; draft persistence reports unavailable. | Export JSON before closing. |
| Existing browser-draft value is unreadable | The raw string remains at the active storage key and autosave pauses. | Export the raw recovery file; an explicit replacement archives the original under a timestamped recovery key first. |
| Project content is missing, malformed, unreachable, or has the wrong `siteId` | Disk save remains blocked and a specific `project-load-*` diagnostic plus recovery message is shown. | Fix/init the project file or local server, then reload; export the browser draft first if needed. |
| Project/session server unavailable | Browser draft remains; disk save returns `false`. | Start `copyweave serve` or export JSON. |
| Invalid project/import JSON | Invalid store is not applied. | Repair against the schema; preserve source defaults. |
| Field/import exceeds a capacity limit | The over-limit field reverts to its previous value, or the import is rejected before replacement; other overrides remain. | Shorten the value or split content deliberately, then retry. |
| Project changes after load | Save returns 412. | Reload and reconcile deliberately. |
| Browser/project changed the same field differently | Browser value stays exportable; disk save is blocked. | Export, resolve deliberately, and import the resolved store. |
| HTML refactor moves automatic keys | Overrides become orphaned or bind differently. | Use semantic explicit IDs and run `doctor --strict`. |
| Owning framework rerenders | Framework DOM replaces edited text/bindings. | Recreate/refresh after the render or use framework-owned content state. |
| Process/power loss during write | Rename normally preserves old or new target; unsynced bytes are not guaranteed across power loss. | Backups and version control; do not claim transactional durability. |

## Non-functional targets

- Browser and CLI runtime dependencies: zero.
- Browser IIFE gzip budget: 18 kB, enforced by `npm run size`.
- Network behavior: no telemetry or remote service; only configured content and
  session/save URLs are fetched.
- Accessibility: keyboard editing, focus indication, status announcements and
  IME-safe Enter handling are required invariants.
- Compatibility: evergreen browsers with `contenteditable`, Shadow DOM,
  `AbortController`, `fetch` and `localStorage`; Node.js 20+ for the CLI.
- Draft namespace: callers should provide a stable project-specific `siteId`.
  The hostname fallback exists for exploration only and emits an
  `implicit-site-id` warning because two projects on the same origin could
  otherwise share a storage key.
- Recovery: browser export, project backup and source control are the recovery
  mechanisms. CopyWeave is not itself a backup system.

## Architectural decisions

1. **Rendered DOM over framework adapters.** Small integration surface and zero
   runtime dependencies, in exchange for rerender limitations.
2. **Semantic IDs over DOM indexes.** Explicit fields are durable; automatic
   discovery remains an intentionally unstable migration aid.
3. **Plain text over rich text.** `textContent` keeps the XSS and serialization
   model understandable and preserves visual ownership in site code.
4. **Local loopback server over a hosted backend.** No account or cloud service,
   in exchange for single-machine/single-writer operation.
5. **Versioned delta JSON over rewriting source while typing.** Reviewable and
   portable edits; static `apply` is a separate, explicit build action.
6. **Base-aware merge plus optimistic ETag writes.** Independent browser and
   project fields merge; same-field conflicts and post-load revisions block
   disk save instead of silently selecting a winner.

The detailed threat boundaries and residual risks are documented in
[SECURITY-MODEL.md](./SECURITY-MODEL.md).
