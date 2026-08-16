# CopyWeave security model

This model applies to CopyWeave `0.1.x` as implemented. CopyWeave is a local
editing tool, not an authentication system or remotely deployable CMS. Its
security controls are designed to prevent a drive-by website from writing a
chosen local content file and to keep imported copy as plain text.

## Protected assets

- the configured `copyweave.content.json` project file;
- its immediately previous `.backup` copy;
- static HTML files explicitly passed to `copyweave apply`;
- browser drafts stored under the configured localStorage key;
- the integrity of the host page while copy is imported and rendered;
- local file paths and file contents outside the explicitly selected serve root
  and content target.

CopyWeave content is normally public website copy. The content endpoint serves
the JSON to the local browser and is not a secret store. Do not put credentials,
private customer data or other secrets in CopyWeave JSON.

## Trust boundaries and actors

| Actor | Trust assumption |
|---|---|
| Local operator | Trusted to choose the site root, content path and CLI flags. |
| CopyWeave browser runtime | Trusted package code executing in the served page. |
| Other JavaScript in the served page | Same-origin and therefore able to request the session token; not isolated from the content file. This includes a controlling service worker. |
| Remote web page | Untrusted. It must not be able to drive a write merely by causing requests to loopback. |
| Imported/project JSON | Untrusted data. It must be size- and schema-validated and rendered only as text. |
| Files below the served root | Operator-selected but potentially containing links or malformed paths. Static requests must remain inside the real root. |
| Other local processes running as the user | Outside the security boundary; they can usually read or modify the same files without CopyWeave. |

The random session token is a CSRF-style capability, not user authentication.
The ETag is optimistic concurrency control, not authorization. Any JavaScript
already executing with the local site's origin can fetch the session endpoint
and is effectively trusted to edit the designated content file.

Browser origins are keyed by scheme, host and port rather than project path. A
service worker registered by one project on a reused loopback port can therefore
control a later project served on the same origin. CopyWeave does not unregister
workers or establish per-project browser-origin isolation.

## Local server boundary

`copyweave serve` binds the HTTP server to the IPv4 loopback address
`127.0.0.1`. It does not bind to all interfaces and has no option to become a
LAN or Internet server.

For every request, the server accepts only `127.0.0.1:<active-port>` and
`localhost:<active-port>` Host values. This is the primary DNS-rebinding
defense. Static file requests are lexically resolved below the canonical serve
root and then checked again with `realpath`, so a symlink cannot escape the
root. Directory listings are not provided.

Before listening, the server scans the root for top-level version-control
metadata, environment files and credential markers. It refuses a hazardous
root unless the operator explicitly passes `--allow-project-root`. Request-time
checks continue even under that override: dot-path segments, version-control
directories, `node_modules`, package/lock files, common credential names, key
and database extensions, source maps, recovery extensions (`.backup`, `.bak`,
`.old`, `.orig`), and any segment containing `:` return
`403 sensitive-path`. The colon rule also denies Windows alternate data stream
syntax.

The request denylist tokenizes decoded paths on both `/` and `\`, covering
Windows separators including percent-decoded backslashes. After `realpath`
confirms containment, the canonical target is converted to a root-relative
forward-slash path and checked against the same denylist again. An innocently
named in-root symlink or junction therefore cannot alias a blocked in-root
target. `realpath` confinement and name filtering still do not make every file
inside a broad root public-safe; a minimal, secret-free build directory remains
part of the security boundary.

The `--content` option is a deliberate exception to the static-root boundary.
It may designate a file outside the served directory, for example a source
file in `public/` while serving `dist/`. The operator grants that exact path;
HTTP input cannot select a different project file. The special content URL
serves only that validated JSON file.

HTTP is acceptable only because the server is loopback-only. CopyWeave makes no
claim of confidentiality or integrity if the server is reverse-proxied,
port-forwarded, rebound to a network interface or exposed through a tunnel.

## Save authorization and concurrency

At process start the server generates a 192-bit random token. A same-origin
`GET /__copyweave/session` response returns that token and the SHA-256 ETag of
the current content bytes with `Cache-Control: no-store`.

A project write must use `PUT /__copyweave/save` and pass:

- an allowed Host;
- an Origin equal to `http://<Host>` when an Origin header is present;
- the process token in `X-CopyWeave-Token`;
- an `application/json` content type;
- a body no larger than 2 MiB;
- a valid, matching-site content store;
- an `If-Match` value equal to the current ETag, unless the caller explicitly
  supplies `*`.

Writes are serialized in one process. The ETag is recomputed immediately before
each queued write. A stale ETag returns `412 content-conflict` and the current
ETag without changing disk. Successful writes return the new ETag and
`diskSaved: true`.

The built-in browser obtains an ETag from the content or session response and
normally submits that exact value. The server's support for `If-Match: *` is an
explicit concurrency bypass available to any caller that already holds the
session token. It must not be described as a security or conflict-safe path.

ETag protection detects a file change after the client's base ETag was read.
Browser drafts also persist `baseStore` and `baseEtag`; initialization uses the
base snapshot for a per-field three-way merge. Independent browser/project
changes are combined. If both changed one field differently, the browser value
is retained for export, a conflict diagnostic is recorded, and disk save is
blocked. Edits made before project loading completes are recorded as deltas and
replayed on the loaded project snapshot before save.

Disk save also requires a successfully loaded project base. A wrong
`contentUrl`, invalid content response or transient project fetch failure leaves
`projectBaseLoaded` false; the browser reports that project copy was unavailable
and does not issue PUT even if session loading succeeded. The draft remains
available for export.

## Input validation and browser rendering

Browser imports and server saves require the versioned `copyweave/content`
shape and matching `siteId`. localStorage additionally wraps the active store,
project base snapshot and base ETag in a validated `copyweave/draft` envelope.
Enforcement is aligned across browser options/discovery, browser store
normalization, CLI validation and the public schema, and includes:

- at most 100 pages and 5,000 total fields;
- keys no longer than 240 characters;
- copy values no longer than 100,000 Unicode code points, matching JSON Schema
  `maxLength` semantics;
- valid parseable ISO-style timestamps at browser and CLI boundaries;
- rejection of `__proto__`, `prototype` and `constructor` keys by runtime/CLI
  validators;
- the semantic/automatic field-ID grammar for stored and discovered fields;
- null-prototype page maps after browser normalization and own-property lookup
  for field/page access.

The schema carries `x-copyweave-maxTotalFields: 5000` because standard JSON
Schema keywords cannot express an aggregate property count across all page
objects. The browser and CLI enforce the aggregate directly. `cloneStore()`
normalizes and validates the serialized store and throws on failure; it does
not convert invalid content into an empty store. Ordinary names inherited from
`Object.prototype`, such as `toString`, are handled as explicit own fields;
only the three mutation-sensitive key names above are blocked.

Imported data is normalized before it replaces the active browser store. Copy
is written to fields with `textContent`, not `innerHTML`, and paste handling
requests `text/plain`. Panel messages interpolated into its template are HTML
escaped; dynamic status and page values use text nodes.

An over-limit field edit is rejected before store mutation and the edited DOM
field is restored to its previous override or source default. Other overrides
remain intact. Imports larger than 2 MiB are rejected before parsing or
replacement.

If the configured browser-draft value is malformed or fails validation, the
raw localStorage string stays at the original key and automatic draft replacement
pauses. The persistent Storage state reports the damaged draft, and Export
requests a download containing that unparsed value. Save, import and reset are
explicit replacement
actions: each must first write the original bytes to a timestamped recovery
key. If that archive fails, replacement remains blocked.

CLI arguments are also untrusted input. Each command has an allowlist of option
names and expected types; validation rejects unknown flags, missing values for
string options, invalid boolean assignments and excess positional arguments
before command execution. `doctor --strict` additionally reports eligible
visible body text left outside `data-copy-id` on an otherwise marked page and
returns non-zero when that or another warning exists.

The CLI's static HTML tooling uses one context-aware scanner for `doctor` and
`apply`. It skips comments and excluded/raw-text subtrees including `script`,
`style` and `template`, tracks quoted tag attributes and nesting, and exposes
only real explicit leaf-text spans for replacement. Markup-looking strings in
JavaScript, CSS, comments or templates are therefore neither counted as fields
nor rewritten. This is a conservative scanner, not a general HTML parser.

The published JSON Schema is not itself executed by the zero-dependency
runtime. Security-sensitive validation lives in `src/schema.ts` and the CLI.
The schema, browser validator, field-ID grammar and CLI validator must be kept
in parity. A schema-valid file should not be assumed accepted until that parity
is covered by tests.

CopyWeave does not sanitize or safely render rich HTML because rich HTML is not
a supported content type.

## File-system writes

For content saves and `apply` output, CopyWeave exclusively creates a unique temporary file
in the target directory and renames it over the target. Same-directory rename
provides atomic visibility on supported filesystems. Before replacement it
reads the current target, writes that snapshot to another exclusively created same-directory
temporary file, and renames the temporary file over `<target>.backup` unless
backups are disabled.

Temporary files are opened with exclusive creation. If writing or the final rename fails,
the owned temporary copy is removed before the error is returned so old page or
content bytes are not left in a hidden recovery artifact.

Neither backup nor target replacement opens an existing destination for
writing. The rename replaces its directory entry, so a pre-existing backup
hard link or symlink cannot redirect backup bytes into its linked target, and a
target symlink is replaced rather than followed during the final write. This
protects these CopyWeave writes; it does not make a broad static root safe from
ordinary-looking hard links, or defend against another local process racing
filesystem entries.

This mechanism has explicit limits:

- there is no file or directory `fsync`, so acknowledged writes are not a
  power-loss durability guarantee;
- multiple CopyWeave server processes do not share a lock or queue;
- the `.backup` file is one generation, not a backup history;
- backup files may retain deleted or sensitive copy, are denied by the static server, and must be excluded from source control and deployment artifacts;
- a failed write may leave an inert `.copyweave-*.tmp` file;
- version control or another backup system remains necessary.

The static server applies `realpath` confinement to served website files. The
configured content target is operator-authorized separately and is not required
to be inside the website root.

## Threat analysis

| Threat | Implemented control | Residual risk |
|---|---|---|
| Drive-by cross-site save/CSRF | Loopback binding, Host allowlist, same-origin policy, Origin check, random token and JSON-only PUT. | Browser or extension flaws are outside scope; a token holder can write valid copy. |
| DNS rebinding | Host must be literal `localhost` or `127.0.0.1` with the active port. | Do not add arbitrary hostnames or network binding without a new design review. |
| Same-origin malicious script or XSS | No isolation is claimed. | It can fetch the token and alter the designated content file. Avoid third-party/untrusted scripts during editing. |
| Persisted service worker from another local project | No isolation is currently implemented between projects that reuse one loopback origin. | Use a fresh port for an untrusted project and inspect/unregister existing workers before editing sensitive project copy. |
| Sensitive file exposure inside serve root | Startup refuses recognized hazardous roots by default; request-time checks cover both separator forms and deny dotfiles, dependency/VCS directories, package/lock files, common secrets, keys, databases, maps, recovery extensions and colon/ADS paths; canonical path must remain inside root and is checked again after `realpath`. | `--allow-project-root` expands operator risk, deny patterns are finite, and path policy cannot identify every ordinary-looking secret or hard link. Serve only a minimal secret-free build directory. |
| Path traversal | Lexical root check plus `realpath` confinement. | The operator-selected external content target is intentionally outside this check. |
| Symlink escape | Static target's canonical path must remain within the canonical root. | A time-of-check/time-of-use race by another local process is outside the local threat boundary. |
| Stale concurrent save | Draft base snapshot, per-field three-way merge, required loaded project base, SHA-256 ETag, `If-Match`, serialized in-process writes and 412 response. | `If-Match: *` for a token holder and multiple server processes bypass or fall outside the normal browser guarantee. |
| JSON/parser resource abuse | 2 MiB HTTP body cap plus object/count/string limits. | `doctor`/`apply` operate on operator-selected local files and do not impose an equivalent whole-file cap. |
| Prototype-key confusion or silent invalid clone | Unified safe-key validation, null-prototype normalized maps, own-property lookup, and fail-closed cloning. | New code that bypasses normalization still requires review and tests. |
| Stored XSS through copy | Plain-text schema and `textContent` writes. | Unsupported browser rich-content insertion can temporarily affect the live editable DOM; persisted/reapplied copy is text. |
| Error disclosure | HTTP responses use stable error codes rather than stack traces. | Top-level CLI errors include local paths for operator diagnostics. |
| Frame-based UI deception | `X-Frame-Options: DENY` on the local server. | Sites served by another server need their own headers. |
| Content loss or backup link write-through | Backup snapshots and targets are each installed by unique same-directory temporary file plus rename, so existing destination links are replaced rather than opened for writing. | No fsync, multi-process lock or historical backup; local filesystem races remain outside scope. |
| Local malware/process | None; it already has the user's file authority. | Explicitly out of scope. |

## Control evidence

These previously reviewed edges are closed in the current implementation:

| Control | Source boundary | Regression evidence |
|---|---|---|
| No disk save without a loaded project base | `src/editor.ts` tracks `projectBaseLoaded` separately from session/ETag state and checks it before PUT. | `tests/editor.test.ts`: “blocks disk save when the project content base could not be loaded”. |
| Initialization-safe and base-aware drafts | The local draft envelope persists `baseStore` and `baseEtag`; pending deltas are replayed and per-field three-way merge blocks divergent same-field saves. | Editor tests cover delayed project load, independent-field merge, same-field conflict and failed content load. |
| Page-scoped source defaults | `src/editor.ts` keys defaults with `pageId + NUL + fieldId` and re-evaluates a functional page ID on refresh. | Editor tests cover route re-resolution and different defaults for the same field ID on two SPA pages. |
| Windows and canonical static-path enforcement | `blockedStaticPath()` tokenizes on `/` and `\`; static serving checks the canonical root-relative target again after `realpath`. | The CLI sensitive-file test includes a percent-encoded backslash (`%5c`) traversal attempt; canonical alias coverage remains a required regression below. |
| Fail-closed CLI options | Command schemas reject unknown options and missing or wrong-typed values before handler execution. | CLI tests cover an unknown `--strcit` and a misspelled write-related `--dryrun`. |
| Strict mixed-page diagnosis | `doctor` emits `unmarked-visible-text` for eligible copy outside explicit fields; strict mode treats warnings as failure. | `tests/cli.test.ts`: “fails closed on unknown options and mixed marked/unmarked copy”. |

| Unified ID/capacity and clone validation | Store normalization and CLI validation share the key grammar and limits; normalized maps have null prototypes; `cloneStore()` throws on invalid data. | Schema, field, editor and CLI tests cover unsafe IDs, prototype names, timestamps and limits. |
| Oversized input preserves existing copy | Per-field checks restore the previous field before store mutation; imports over 2 MiB stop before parse/replacement. | Editor tests preserve a second override while rejecting an oversized field and preserve the store on oversized import. |
| Corrupt draft recovery | The raw localStorage string is retained, autosave pauses, Export requests a download of that value, and explicit replacement archives before overwriting. | The unreadable browser-draft editor test verifies the original and recovery keys. |
| Context-aware static HTML edits | `doctor` and `apply` share a scanner that ignores pseudo fields in raw/excluded contexts and applies only unique leaf spans. | CLI tests cover script, comment, style and template pseudo markup, including a `</script>` copy payload. |
| Backup links cannot redirect writes | Backup bytes are written to a unique temporary file and renamed over the backup path. | Save and apply CLI tests create an external hard-link victim and verify it is unchanged. |

## Known residual risks

The base-aware merge removes whole-store timestamp arbitration, protects edits
made before a successful project load, and blocks save when no project base was
loaded. Static checks cover both path separator forms and re-check the canonical
target after `realpath`. Remaining risks are:

- **Same-origin code authority.** Page scripts and persisted service workers can
  fetch the session token and submit a valid replacement. Root filtering reduces
  collateral file exposure but does not sandbox the website.
- **Conflict recovery is manual.** A same-field conflict safely blocks disk
  save and preserves the browser value, but resolution requires export/import
  or reload; CopyWeave provides no authenticated multi-user workflow.
- **Explicit concurrency bypass.** The server accepts `If-Match: *` from a
  caller that already has the session token. The built-in browser does not need
  this in its normal loaded-base path, but the server contract permits it.
- **Filesystem policy is defense in depth.** The denylist is finite and cannot
  identify an ordinary-looking secret or a hard link to one. The selected root
  must still be a purpose-built public output directory. Atomic replacement
  prevents backup destinations from redirecting CopyWeave writes, but it does
  not determine whether an ordinary static file is itself a hard link to
  sensitive bytes.
- **Write durability and process scope.** Same-directory rename gives atomic
  visibility on supported filesystems, but there is no file/directory `fsync`
  and independent server processes do not share a lock. Version control remains
  the durable recovery and coordination mechanism.

## Security non-goals

CopyWeave does not provide:

- accounts, roles, authentication, authorization or multi-user collaboration;
- protection from JavaScript already trusted to run on the local site origin;
- protection from another process running with the local user's permissions;
- a hardened public/LAN HTTP server, TLS termination or reverse-proxy support;
- encrypted content, secret storage, regulated-data controls or audit logs;
- rich-text sanitization;
- arbitrary template/JSX/SFC rewriting;
- sandboxing of the website being edited;
- transactional durability across power loss or coordinated multi-process
  locking;
- a guarantee that automatic field IDs survive a DOM refactor.

## Safe operating guidance

1. Run `copyweave serve` only for a trusted local project and leave it bound to
   loopback. Pass a minimal, secret-free build directory such as `dist/`. Treat
   `--allow-project-root` as an expert override, not a normal setup step. Never
   expose the port through a tunnel or proxy.
2. Avoid loading untrusted third-party scripts while the local editing server is
   active; same-origin page code can obtain the session token. When switching
   between projects of different trust levels, use a fresh port and clear any
   service worker registered for the previous loopback origin.
3. Use explicit semantic `data-copy-id` leaves and run `doctor --strict` before
   committing content.
4. Keep the content file and static HTML in version control. Do not rely on the
   single `.backup` generation as the only recovery path. Treat `.backup`,
   `.bak`, `.old` and `.orig` as private recovery artifacts even though the
   built-in server denies them; exclude them from deployment and source control.
5. Editing before a successful project load is replayed safely. If the content
   endpoint fails, disk save is blocked and the browser draft remains
   exportable. Independent-field drafts merge; same-field conflicts still
   require a human decision.
6. Review `apply --dry-run --json` before writing HTML, especially when input
   files were generated by another tool.
7. Treat exported/imported JSON as untrusted even though CopyWeave renders it as
   text; inspect changes before committing.
8. Do not store secrets or private data in content JSON.

## Verification requirements

Security-sensitive changes should retain tests for:

- unknown CLI options, missing string-option values and misspelled write flags;
- `doctor --strict` on pages containing both marked and unmarked visible copy;
- invalid Host, cross-origin PUT, missing/wrong token and wrong content type;
- stale ETag rejection and two concurrent writes with one winner;
- `If-Match: *` behavior if it remains supported;
- malformed/oversized JSON, key/count/length limits and dangerous keys;
- browser option/discovery IDs, `Object.prototype`-named own fields,
  null-prototype maps and fail-closed invalid cloning;
- oversized field/import rejection without mutation of other overrides;
- invalid browser-draft preservation, raw export, paused autosave and
  archive-before-replacement failure handling;
- lexical traversal, encoded traversal, malformed URLs and symlink escape;
- denial of dotfiles, repository metadata, environment files and key material
  within an otherwise valid static root;
- encoded `/` and `\` separator variants on Windows;
- benign symlink/junction aliases to blocked paths that remain inside root;
- external content-path behavior as explicit operator authority;
- backup/target replacement with pre-existing symlink and hard-link entries;
- denial of recovery extensions and Windows alternate data stream syntax;
- plain-text import/paste/rendering and malicious markup strings;
- script, comment, style and template pseudo fields in both `doctor` and
  `apply`;
- write failure, backup behavior and preservation of the previous target;
- edits and page resets made before a delayed successful project load;
- independent-field three-way merge, same-field conflict blocking, legacy
  drafts without a base and content-load failure with a valid session;
- clean shutdown and read failures after the content file is removed.

Report security issues through the private process in
[`SECURITY.md`](../SECURITY.md), not a public issue.
