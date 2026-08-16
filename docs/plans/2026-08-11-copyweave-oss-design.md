# CopyWeave open-source design

Date: 2026-08-11

## Problem

AI can generate a visually convincing website quickly, but editing its words still sends a human back into components, templates, or prompt loops. CopyWeave adds a local, in-page copy layer to an existing site without replacing its typography, layout, motion, or framework.

The project must serve three people equally well:

- A writer should click visible words, edit plain text, and save without learning the codebase.
- A developer should add a small dependency, keep content in version control, and retain control of deployment.
- An AI coding agent should discover the integration contract, run deterministic checks, and avoid damaging the visual system.

## Considered approaches

### 1. One pasted script

Lowest first-run friction, but weak typing, unclear update paths, and no reliable local save workflow. Good as a generated browser build, not as the source architecture.

### 2. Framework-agnostic package plus local CLI — selected

A zero-runtime-dependency browser package scans or explicitly binds text, while a Node standard-library CLI serves the built site and writes one JSON content file. It works with static HTML, Vite, Astro, React, and other frameworks without owning their render tree. An IIFE build preserves the one-script escape hatch.

### 3. Hosted CMS

Accounts, authentication, databases, collaboration, and deployment adapters would widen scope and weaken the local-first trust proposition. This is deliberately out of scope for 1.0.

## Architecture

`src/` contains small modules for schema normalization, stable field discovery, storage reconciliation, the editor UI, and the public controller. The normal page state uses a custom element with `display: contents`; editing mode creates a box only while a field is active. Shadow DOM isolates the control panel.

Stable IDs have two tiers:

1. `data-copy-id="hero.title"` is the durable production contract.
2. Automatic structural IDs make zero-config onboarding possible and are reported as unstable by `copyweave doctor`.

The content file stores only overrides from the source HTML. It is always plain text and versioned by schema. Browser drafts persist their project baseline and ETag: independent changes are merged field by field, while a same-field conflict preserves the browser draft and blocks disk save until a person reconciles it. Import never executes HTML.

`bin/copyweave.mjs` provides `serve` and `doctor`. `serve` binds to loopback by default, enforces same-origin JSON writes, caps request size, prevents path traversal, and writes atomically. `doctor` scans HTML for integration gaps, duplicate IDs, CSS-generated copy, and inaccessible text-size risks, with both human and JSON output.

## Public API

```ts
const editor = createCopyWeave({
  pageId: location.pathname,
  contentUrl: "/copyweave.content.json",
  saveUrl: "/__copyweave/save",
  mode: "auto",
  locale: "en",
});

editor.open();
editor.close();
editor.refresh();
editor.export();
editor.destroy();
```

Configuration favors explicit, serializable values. Callbacks are available for host applications, but the default workflow works without them.

## Error handling

- Invalid project or import data is rejected without replacing the active store.
- If local storage is unavailable, editing continues in memory and the UI directs the user to export JSON.
- If the save server is unavailable, the browser draft remains intact and the status explains the exact recovery action.
- Duplicate explicit IDs are skipped and surfaced by diagnostics instead of silently overwriting copy.
- A save from another origin is rejected with HTTP 403.

## Verification

Unit tests cover schema validation, source reconciliation, field ID stability, duplicate handling, and plain-text safety. CLI tests use temporary directories and real HTTP requests for serving, saving, traversal, origin, size, and malformed data. A browser demo proves normal-mode visual preservation, editing, reload persistence, project-file save, keyboard use, reduced motion, and mobile layout.

Release gates are `npm test`, `npm run build`, `npm run check`, `npm pack --dry-run`, and a clean install of the produced tarball into a fixture. GitHub Actions repeats the deterministic gates on supported Node versions.

## Open-source and AI contract

The repository includes an MIT license, contribution and security policies, issue forms, release workflow, `AGENTS.md`, `llms.txt`, JSON Schema, compact architecture documentation, copy-paste integrations, and an installable Codex Skill. The Skill follows the same two-pass review used on the Elephas site: first make the workflow trustworthy; then re-enter as the recipient and remove friction discovered in real use.
