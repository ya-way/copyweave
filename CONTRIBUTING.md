# Contributing to CopyWeave

Thank you for helping people edit words without dismantling design.

## Before opening a change

1. Search existing issues and discussions.
2. Use a focused issue for behavior or API changes.
3. Keep runtime dependencies at zero unless an RFC proves the trade-off.
4. Preserve the invariants in [`AGENTS.md`](./AGENTS.md).

## Local workflow

```bash
npm install
npm run check
npm run dev
```

`npm run check` is the merge gate. Add tests that fail before the fix and pass after it. UI changes also need desktop and mobile screenshots with the editor both closed and open.

## Pull requests

- Keep one coherent change per PR.
- Explain the user problem before the implementation.
- Include actual command output and visual evidence where relevant.
- Update public types, schema, README, Skill references, and changelog when their contract changes.
- Never claim disk persistence until the save endpoint has confirmed it.

## Commit style

Use short imperative subjects, for example:

```text
fix: preserve IME composition on Enter
docs: clarify browser draft versus project save
feat: report duplicate semantic field IDs
```

## Good first contributions

Documentation fixes, new static-site fixtures, accessibility improvements, and new `doctor` diagnostics are especially welcome. Security reports follow [`SECURITY.md`](./SECURITY.md).
