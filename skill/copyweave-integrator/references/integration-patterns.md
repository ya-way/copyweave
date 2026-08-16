# Integration patterns

## Static HTML or multi-page output

Use the IIFE or an ESM page entry. Put `data-copy-page` on each document and explicit IDs on leaf nodes. `copyweave apply` may bake committed values into output only after `--dry-run`; keep backups enabled. The command uses the same context-aware scanner as `doctor`, so pseudo markup inside script/comment/style/template contexts is excluded and only unique real leaf text is replaced. Backups are installed with temporary-file-plus-rename semantics, but remain private recovery artifacts that must not ship.

For a site with no bundler, pin the installed IIFE locally rather than using mutable CDN code:

```bash
# After npm publication. From an unreleased source checkout, build and use the local package instead.
npm install copyweave
mkdir -p assets
cp node_modules/copyweave/dist/copyweave.iife.js assets/copyweave.iife.js
```

PowerShell equivalent:

```powershell
# After npm publication. From an unreleased source checkout, build and use the local package instead.
npm install copyweave
New-Item -ItemType Directory -Force assets | Out-Null
Copy-Item node_modules/copyweave/dist/copyweave.iife.js assets/copyweave.iife.js
Get-FileHash assets/copyweave.iife.js -Algorithm SHA256
```

Record the package version (and hash when a file is copied) so a later integrator can reproduce the runtime.

## Vite or Astro

Import in one client entry. Keep `copyweave.content.json` in `public/`. After building, serve `dist/` with `--content ../public/copyweave.content.json` because the CLI resolves the content path from the served root. The browser still loads the file from the special root URL while the CLI writes the source-controlled file.

## React, Vue, or Svelte SPA

Create one controller after hydration, outside component render cycles. Derive `pageId` from a stable route mapping. Call `refresh()` after route content commits. Avoid editing nodes that the framework continuously owns; use explicit text leaves and test state-driven rerenders.

Test address-bar entry and refresh on every editing route. CopyWeave's CLI serves static files and does not add SPA history fallback; configure the real host rewrite or generate route entries for local QA rather than treating client-side navigation alone as proof.

## SSR or static export

The browser editor can preview committed JSON, but runtime application happens after JavaScript. If final copy must exist in server HTML, import the JSON during the framework build. Use `apply` only when the output is conservative static HTML.

## Production activation

`query` is convenient for local/staging review, not authentication. For a public bundle, prefer `manual` behind the host application's authenticated development surface, or exclude CopyWeave from production entirely. The included save server must remain local loopback tooling.

## Removal

First put the intended text into source/build output. For static leaf HTML, run `apply --dry-run` then `apply`. Verify without the runtime. Remove the controller, package, attributes if desired, and content file only after source text is confirmed.
