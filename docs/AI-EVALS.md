# AI integration evaluations

The bundled Skill should help an agent make a real site editable without redesigning it. These evaluations are prompts and acceptance criteria, not marketing examples.

## Eval A: static portfolio

Prompt: “Make every piece of public-facing copy editable and saved locally. Preserve the exact design and existing words.”

Pass conditions:

- Agent inventories HTML, CSS-generated content, SVG text, and scripts before editing.
- Adds semantic explicit IDs to text leaves.
- Preserves source copy byte-for-byte except required attributes/runtime entry.
- Uses query/manual activation.
- Runs strict doctor and reports uncovered non-DOM text.
- Verifies normal mode separately from edit mode.

## Eval B: hydrated SPA

Prompt: “Integrate CopyWeave into this React/Vue/Svelte site across routes.”

Pass conditions:

- Detects framework/router instead of applying static-HTML instructions blindly.
- Mounts one controller after hydration.
- Uses a stable route-to-page mapping and refreshes after route rendering.
- Does not make automatic node paths the durable store.
- States runtime SEO limitations.

## Eval C: hostile edge cases

Fixture includes nested markup, duplicated IDs, SVG text, `::before` content, a form placeholder, and generated item order.

Pass conditions:

- Does not claim all copy is covered.
- Splits or excludes nested fields deliberately.
- Reports unsupported attribute/SVG/CSS content.
- Repairs duplicate IDs with semantic names.
- Uses stable item domain keys rather than indices.

## Eval D: removal

Prompt: “Remove CopyWeave while keeping the final committed text.”

Pass conditions:

- Chooses build integration or conservative static `apply` based on framework.
- Produces backups before static writes.
- Removes runtime/activation without deleting source defaults.
- Verifies the site without JavaScript from CopyWeave.

## Scoring

Score each dimension 0–2: preservation, ID durability, save truthfulness, security boundaries, accessibility, framework fit, verification evidence, and limitation honesty. A publishable Skill must score at least 14/16 on two unseen fixtures and may not score 0 on preservation, save truthfulness, or security.

## 2026-08-11 blind-run evidence

Two context-isolated agents received only a copied fixture, the integration request, and the Skill. Maintainer scoring was:

| Fixture | Preservation | IDs | Save truth | Security | Accessibility | Framework | Evidence | Limit honesty | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Static portfolio | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15/16 |
| Flawed SPA | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | 15/16 |

The accessibility point was withheld because neither isolated run independently certified a native IME plus NVDA/VoiceOver pass. This is a deliberate evidence gap, not a rounded-up score.

Run bundle SHA-256 values:

```text
static portfolio  B411D013F46F4833C5AD22037FE92FE40636C58366CB1E23425CE0D95DE36224
flawed SPA       CA6B7E64FF1E3E25EC6039367C8827787CF62231AAB425717982AE56296085D5
```

These runs evaluate the Skill's instructions and the integrations those instructions produced. They do **not** certify a later CopyWeave release binary: the repository bundle changed after the isolated runs. The final candidate must separately pass `npm run check`, clean-tarball installation, current-bundle browser QA, and the release review. This workspace had no Git commit to cite; the first public tag must rerun or link the checks to an immutable commit and replace workspace-only hashes with CI artifacts.

Generated run directories, screenshots, installed packages, and browser drafts are ignored artifacts under `evals/runs/`; only the fixtures, rubric, score table, and honest limitation record belong in the public package.
