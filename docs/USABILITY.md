# Usability acceptance gates

CopyWeave is finished only when a non-developer can revise words without wondering whether the design or their work is safe.

## Writer journey

1. Open the URL supplied by a developer.
2. Select **Edit copy**.
3. Click a visible text field and type, paste plain text, undo, and use an IME.
4. Move to the previous or next field with the panel controls.
5. Read **Storage state** before saving, then save. The persistent state must
   distinguish source copy, **browser draft**, project-file sync, unavailable
   storage, unreadable draft, and conflict even while transient action messages
   change.
6. Refresh and see the same content.
7. Close editing and see the untouched site composition.

The count is labeled **Overrides / Editable**: it does not call every editable
field “changed.” Fail the release if any step needs source-code knowledge or
implies a disk save that did not happen.

## Developer journey

1. Install with no runtime dependency tree.
2. Add stable IDs without restructuring layout.
3. Run `copyweave doctor --strict` and receive actionable file/field diagnostics.
4. Serve a build with loopback-only saves.
5. Review one portable JSON diff.
6. Rebuild, apply, or remove CopyWeave without losing source copy.

For static HTML, `doctor` and `apply` must agree on the same real leaf fields.
Text that merely looks like markup inside a script, comment, style or template
must not be counted or changed. Review `apply --dry-run --json` before the
atomic backup-and-replace write.

## Agent journey

1. Read `AGENTS.md` and the Skill.
2. Discover the framework and content surfaces without guessing.
3. Produce semantic IDs and preserve existing words.
4. Run commands non-interactively and prefer `--json` output.
5. Validate normal and edit modes separately.
6. Report automatic IDs, nested markup, SVG/CSS text, and production exposure as limitations rather than hiding them.

## Accessibility

- All panel controls are native buttons with visible focus.
- Every editable field has a distinct accessible label containing its key.
- Editing works without a pointer.
- Escape closes edit mode; Ctrl/Command+S saves.
- Enter during IME composition never advances unexpectedly.
- Status changes are announced politely, not as interrupting alerts.
- At 360 CSS pixels the panel cannot cover the active line without a way to minimize it.
- Reduced motion removes decorative transitions without removing state feedback.

## Data-safety scenarios

- Browser storage unavailable.
- An unreadable browser draft remains unchanged at its original storage
  key, pauses autosave, exposes a raw recovery download request, and is archived
  to a timestamped recovery key before an explicit save/import/reset replaces
  it.
- A field over 100,000 characters returns to its previous value without
  clearing any other override; an import over 2 MiB leaves the active store
  unchanged.
- Unsafe site/page/field IDs and stores over 100 pages or 5,000 total fields
  fail before persistence; ordinary own field names such as `toString` remain
  usable.
- Browser storage unavailable never falls through to a “draft is safe” message; Export remains available and `browser-storage-unavailable` stays in diagnostics.
- Missing, malformed, unreachable, and wrong-site project files each name a next step while preventing PUT.
- Project endpoint unavailable.
- Invalid or wrong-site import.
- Two tabs save the same project version.
- Port already occupied.
- Page route changes while editing.
- Content file or HTML target is a symlink outside the allowed root.
- An existing backup path is a hard link or symlink to an unrelated file.
- A static request targets a recovery extension or Windows alternate data
  stream syntax.
- Process exits during a write.

Each must fail explicitly and retain a recoverable copy. A green status is reserved for a confirmed operation.

## Visual regression

Capture the same viewport in normal mode before and after integration. Fonts, wrapping, dimensions, stacking, animation, links, and pointer behavior must match. Editor outlines and the panel are judged only in edit mode.

## Two-pass review protocol

Pass one is task completion: can the writer, developer, and agent finish their primary job? Fix all P0/P1 findings.

Pass two starts from a clean install and assumes no contributor knowledge: are setup promises true, errors useful, files discoverable, and removal possible? Record both passes in `docs/reviews/` so later contributors can see why a constraint exists.
