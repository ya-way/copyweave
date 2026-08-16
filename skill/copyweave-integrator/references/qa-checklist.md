# Two-pass QA checklist

## Pass 1: writer task

- Normal page at the same viewport is visually unchanged before activation.
- Launcher/edit mode is discoverable without source knowledge.
- Every intended text surface is reachable; unsupported surfaces are listed.
- Click, keyboard navigation, paste, undo, multiline copy, empty copy, and IME work.
- Links/buttons pause only while editing and fully recover on close.
- Panel status distinguishes browser draft, project-file success, unavailable endpoint, invalid import, and stale conflict.
- The persistent **Storage state** remains accurate while transient status text
  changes; the count says **Overrides / Editable**, not “changed fields.”
- Refresh restores the newest valid layer without silently replacing newer work.
- A 100,001-character field edit restores that field's previous value without
  clearing another override; an import over 2 MiB leaves the current store
  unchanged.
- A seeded malformed browser draft remains at its active localStorage key,
  pauses autosave, requests a download of the raw value, and is copied to a
  recovery key before an explicit replacement.
- 360 px viewport, zoom, long strings, and reduced motion remain usable.
- At 360 px with classic scrollbars enabled, the fixed panel stays inside `document.documentElement.clientWidth` and creates no horizontal overflow.
- A human OS-browser pass confirms native Undo/Redo and a real IME composition sequence; synthetic key injection or Unicode assignment alone is not proof.

## Pass 2: clean developer/agent task

- Clean install and documented quick start work verbatim.
- `doctor --strict` is clean or every warning has an explicit decision.
- `doctor --json` is machine-readable and exits nonzero on strict failures.
- Second-tab stale save returns a conflict and preserves both recoverable states.
- Occupied port fails explicitly rather than moving browser drafts to a different origin.
- Invalid schema, wrong `siteId`, oversized body, bad token, cross-origin request, traversal, and unsafe symlink fail closed.
- Unsafe IDs, invalid timestamps, prototype-mutation keys, and aggregate
  page/field limits fail consistently in browser, CLI, and schema-facing tests;
  ordinary own field names such as `toString` still work.
- Project write is atomic and recoverable; static apply creates a backup. A
  pre-existing backup hard link or symlink cannot redirect the write into its
  target.
- Static serving denies `.backup`, `.bak`, `.old`, `.orig`, and colon/Windows
  alternate-data-stream paths.
- `doctor` and `apply --dry-run --json` ignore pseudo fields inside scripts,
  comments, styles, and templates and agree on real unique leaf fields.
- Source control, npm/package output, and the deployment artifact contain no `.backup` or editor QA log files.
- Runtime can be removed without losing committed final text.
- README, public types, schema, CLI help, and observed behavior agree.
- For public release, real repository/homepage/bugs metadata is present and
  `npm run release:check` passes; do not treat an unpublished npm URL as an
  install result.
- Every SPA route works by direct address-bar load and refresh, or the required host history fallback is documented and tested.

Record the finding, severity, fix, and verification evidence for both passes.

The site integrator must execute route, edit, storage, save-state, viewport, keyboard, IME, and normal-mode preservation checks. Low-level CLI traversal/symlink/token cases may cite the exact installed version's passing package tests instead of recreating privileged fixtures, but the handoff must distinguish inherited evidence from checks executed against the target site.

If strict doctor is nonzero because an unsupported copy surface was intentionally preserved, report the exact code and decision. A documented expected warning is acceptable evidence; suppressing it or calling the run clean is not.
