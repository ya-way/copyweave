# Integration invariants

## Preserve

- All existing visible words remain the initial source defaults.
- Normal mode keeps the same font files, font metrics, sizes, line breaks, colors, effects, geometry, responsive behavior, animation, stacking, focus order, links, and pointer behavior.
- Existing user changes and unrelated dirty files belong to the user.
- Copy data remains portable, reviewable JSON under project ownership.
- A rejected field/import preserves every previously valid override.
- An unreadable browser draft remains recoverable in raw form until an explicit
  replacement archives it successfully.

## Add only what the workflow needs

- Semantic `data-copy-id` attributes on plain-text leaves.
- A page identity (`data-copy-page` or stable route mapping).
- One browser controller mounted outside render loops.
- Query/manual activation, never a public “security by obscure URL” claim.
- A versioned project file and documented local save command.
- Persistent **Storage state** provenance and an unambiguous
  **Overrides / Editable** count.

## Never imply

- A browser-local draft was saved to disk.
- Automatic DOM-path IDs are stable through a refactor.
- CopyWeave authenticates users or secures a public editing endpoint.
- Plain text covers SVG, CSS generated text, form attributes, image metadata, rich text, localization, or collaboration.
- Runtime-applied JSON is server-rendered or no-JS SEO content.
- A successful transient action message changes the underlying Storage state.
- A backup extension or query-activated editor is safe to deploy publicly.

## Stop conditions

Stop and report rather than guessing when the only integration path would restructure designed markup, fight framework hydration, expose a write endpoint beyond loopback, overwrite user copy, or require access credentials the user did not provide.

## Unsupported-copy decision

| Surface | Default decision |
|---|---|
| SVG `<text>`, CSS `content`, placeholder, `aria-label`, metadata | Preserve verbatim and report as unsupported. |
| Text that can move to an existing plain HTML leaf with byte-identical rendering and semantics | Move only when the user asked for complete coverage and before/after visual plus accessibility evidence proves no regression. |
| Nested rich text, framework-controlled live nodes, translated content, or any move that changes layout/semantics | Stop and report; propose a separate content model rather than flattening it. |

A preservation-first integration may intentionally retain strict-doctor warnings for the first row. The handoff must name them and must not call the diagnosis clean.
