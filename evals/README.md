# CopyWeave Skill forward evaluations

These fixtures are deliberately unlike the demo. Give an agent only the fixture path, the user request, and `skill/copyweave-integrator/SKILL.md`; do not give it the expected patch.

- `fixtures/static-portfolio`: unintegrated static HTML with nested typography, generated CSS copy, SVG text, an attribute string, repeated work items, and existing behavior.
- `fixtures/flawed-spa`: a tiny client-routed site whose intentionally flawed CopyWeave seam uses a fixed page ID, automatic fields, and public always-on activation.

Score with [docs/AI-EVALS.md](../docs/AI-EVALS.md). Evaluation runs belong under `evals/runs/` and should not be committed.

## 2026-08-11 blind forward run

Two context-isolated agents read the published Skill and worked only in copied run directories. Maintainer scoring used the eight 0–2 dimensions in the rubric:

| Fixture | Score | Key evidence | Skill change prompted |
|---|---:|---|---|
| Static portfolio | 15/16 | 16 semantic fields; normal-mode screenshots had identical SHA-256; honest SVG/CSS warnings; browser/project/conflict/mobile checks | Clarified accepted strict warnings, unsupported-copy decisions, IIFE provenance, manual IME/Undo evidence, and 360px scrollbar QA. |
| Flawed SPA | 15/16 | explicit fields; functional route page ID; post-render refresh; direct `/products` reload; distinct save states | Added direct-route/history-fallback requirement and corrected the Vite external content path. |

Both lost one point for accessibility because neither run constitutes independent NVDA/VoiceOver plus native IME/Undo certification. No preservation, save-truthfulness, or security dimension scored zero. Run directories and screenshots remain ignored test artifacts; this table records the durable result without presenting the generated integrations as curated examples.

The run bundles predate later hardening changes and have different hashes from the release candidate. Treat the scores as Skill-instruction evidence, not current-binary certification; [the rubric and provenance note](../docs/AI-EVALS.md#2026-08-11-blind-run-evidence) define the separate release gates.
