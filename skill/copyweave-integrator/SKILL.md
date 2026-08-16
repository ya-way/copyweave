---
name: copyweave-integrator
description: Add, repair, or review a local-first CopyWeave editing layer on an existing website while preserving its current typography, layout, animation, behavior, and entered copy. Use when a user asks to make all displayed website text editable, give writers an in-page copy workflow, migrate a static/Vite/SPA site to semantic data-copy-id fields, diagnose unstable copy IDs or misleading save states, or verify a CopyWeave integration. Covers static HTML and hydrated frontend frameworks. Do not use as a rich-text CMS, authentication system, or collaborative cloud backend.
---

# CopyWeave Integrator

Make the website's words editable without making the website look edited.

## Non-negotiable outcome

Preserve normal-mode rendering and behavior. Keep every existing word as the source default. Add an editing layer, stable content addresses, a portable project file, and evidence that browser drafts and disk saves behave honestly.

Read [references/invariants.md](references/invariants.md) before changing files. Then read the one integration section that matches the detected stack in [references/integration-patterns.md](references/integration-patterns.md). Read [references/security.md](references/security.md) before enabling project-file saves.

## Workflow

### 1. Inspect before proposing edits

- Find the actual project root, framework, build command, page/route model, and current dirty files.
- Inventory user-visible copy in HTML/components plus SVG text, CSS generated content, attributes, and data-driven collections.
- Identify animation, hydration, content rendering, and navigation that an editor wrapper could disturb.
- Run existing tests/build before changes when practical.
- State which surfaces CopyWeave 0.1 can edit as plain text and which require another model.

Do not redesign, rewrite the user's copy, normalize typography, replace fonts, or silently broaden scope.

### 2. Choose the integration mode

- Use `explicit` for a production integration.
- Use `hybrid` for inventory and migration when uncovered text must remain discoverable.
- Use `auto` only for a disposable proof of concept.

Assign semantic `data-copy-id` values to visible text leaves. Follow [references/field-ids.md](references/field-ids.md). Never commit DOM-index `auto:` keys as the durable contract.

Use CopyWeave's safe-ID contract for site, page, and field IDs; do not invent a
looser parallel grammar. Keep the content store within 100 pages, 5,000 fields
in total, 240 Unicode code points per key, and 100,000 Unicode code points per value.

### 3. Add the smallest runtime seam

Install `copyweave`, mount one controller in the existing client entry, and use `activation: "query"` or `"manual"`. Set a stable project-specific `siteId`; never rely on the hostname fallback for a durable integration. Derive stable page IDs from routes. For hydrated apps, mount after hydration and call `refresh()` only after route content settles.

Keep editable fields as their original elements when possible. Do not add layout wrappers around designed content. Mark subtrees such as code samples or generated functional UI with `data-copyweave-ignore` when they are not authorial copy.

### 4. Configure the three content layers

Maintain this order:

```text
HTML/component defaults -> committed copyweave.content.json -> newer browser draft
```

Initialize the project content file with the same `siteId` used by the browser. Use the loopback CLI for local disk saves. Never report “saved” unless the intended layer succeeded; a browser draft is not a project-file save. If browser storage is unavailable, keep Export reachable and do not call the draft safe.

Treat the panel's **Storage state** as persistent provenance and
**Overrides / Editable** as a delta count, not a save confirmation. If an
unreadable browser draft is detected, do not clear its localStorage key or force
autosave. Request and retain the raw recovery export first; Save/import/reset may replace it
only after CopyWeave archives the original value to a timestamped recovery key.
Over-limit field input or import must leave every previously valid override
intact.

### 5. Verify with evidence

Run:

```bash
npx copyweave doctor <built-root> --strict
npx copyweave doctor <built-root> --strict --json
```

For directly served static HTML, the source directory is the built root. Strict doctor may remain nonzero only for a deliberately preserved unsupported surface; record each diagnostic code, the preservation decision, and the user-visible copy that remains outside the model. Never relabel such a result “clean.”

Build and serve the real output. Exercise the checklist in [references/qa-checklist.md](references/qa-checklist.md), including IME composition, refresh, stale-tab ETag conflict, mobile panel, keyboard-only use, and an unavailable project endpoint.

Compare normal mode before and after at the same viewport. A successful editor that changes wrapping, fonts, animation, links, or pointer behavior is a failed integration.

For static HTML, verify that `doctor` and `apply --dry-run --json` ignore
markup-looking strings in scripts, comments, styles, and templates and select
only real unique leaf fields. If `<html data-copyweave-site>` is present, verify
that `apply` rejects a content file with a different `siteId`. Keep backups enabled for writes, but exclude
`.backup`, `.bak`, `.old`, `.orig`, logs, and QA artifacts from source control
and deployment.

### 6. Review twice

First review as the writer who received the editing link: can they discover, edit, save, refresh, and understand where the work lives?

Fix every P0/P1 finding. Then start from a clean install and review as a developer or AI agent who did not build the integration: can they follow the README, interpret diagnostics, remove the editor, and recover from conflict without private context?

Record both review rounds and the resulting changes. Do not claim coverage for SVG/CSS/attribute/rich text that remains outside the plain-text model.

If preparing a public package release, do not claim the npm install path works
until the package actually exists. Preserve the repository's fail-closed
`prepublishOnly` flow: set real repository/homepage/bugs metadata only after the
owner and repository exist, run `npm run release:check`, then run the complete
verification suite. Never bypass the metadata gate to make a draft publishable.

## Handoff

Report:

- Files changed and the field-ID strategy.
- Supported and unsupported copy surfaces.
- Browser-draft and project-save paths.
- Commands and observed results, not just intended checks.
- Findings and fixes from both review rounds.
- Any production activation, SEO, security, or framework limitation still open.
