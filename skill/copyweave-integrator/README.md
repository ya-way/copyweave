# CopyWeave Integrator Skill

An Agent Skill for adding or repairing CopyWeave on an existing website while treating the current words, typography, layout, motion, navigation, and save semantics as invariants.

## Install from this repository

```bash
npx skills add ./skill/copyweave-integrator
```

After the package is published, `npm install copyweave` makes the same directory available at:

```text
node_modules/copyweave/skill/copyweave-integrator
```

## Good prompts

```text
Use $copyweave-integrator to make every supported text field editable without changing the design. Keep unsupported SVG, CSS, attribute, and rich-text copy explicit in the handoff.
```

```text
Use $copyweave-integrator to audit this SPA's page IDs, route refresh behavior, save truthfulness, and normal-mode rendering, then repair only the integration seam.
```

## What it protects

- Existing source copy remains the default.
- Production integrations use semantic field IDs, not DOM indexes.
- Browser drafts are never described as project-file saves.
- Query activation is never described as authentication.
- Unsupported copy surfaces are preserved and reported instead of flattened silently.
- The integration is reviewed once as a writer and again from a clean developer/agent context.

## Forward-evaluation evidence

Two blind agents received only the Skill plus an unfamiliar fixture:

| Fixture | Result | Maintainer score |
|---|---|---:|
| Static portfolio with SVG/CSS/placeholder/nested copy | 16 semantic fields; normal-mode screenshots byte-identical; unsupported surfaces reported; save/conflict/mobile checked | 15/16 |
| Flawed routed SPA | dynamic page ownership repaired; explicit fields; query activation; direct-route refresh; browser/project save states checked | 15/16 |

The only deducted dimension was full accessibility evidence: the runs did not constitute independent NVDA/VoiceOver plus native IME/Undo certification. These are maintainer-scored forward evaluations, not a third-party guarantee. The standalone-safe [evaluation evidence note](./references/evaluation-evidence.md) records the rubric, hashes, and why those runs do not certify a later release binary.

## Boundaries

This Skill does not turn CopyWeave into remote authentication, a hosted CMS, rich text, localization, or collaborative editing. Its local save instructions trust JavaScript already running on the served origin; read [`references/security.md`](./references/security.md) before enabling project writes.

MIT licensed as part of CopyWeave.
