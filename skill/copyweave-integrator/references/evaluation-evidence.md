# Evaluation evidence

This note travels with the standalone Skill. It prevents the evaluation summary from depending on repository-relative links that disappear when the Skill directory is installed by itself.

On 2026-08-11, two context-isolated agents received only this Skill, an unfamiliar fixture, and the integration request. Maintainers scored eight dimensions from 0–2: preservation, ID durability, save truthfulness, security boundaries, accessibility, framework fit, verification evidence, and limitation honesty.

| Fixture | Dimension scores | Total |
|---|---|---:|
| Static portfolio | 2 / 2 / 2 / 2 / 1 / 2 / 2 / 2 | 15/16 |
| Flawed SPA | 2 / 2 / 2 / 2 / 1 / 2 / 2 / 2 | 15/16 |

One accessibility point was withheld in each run because neither independently certified native IME plus NVDA/VoiceOver behavior. No preservation, save-truthfulness, or security dimension scored zero.

Evaluated IIFE SHA-256 values:

```text
static portfolio  B411D013F46F4833C5AD22037FE92FE40636C58366CB1E23425CE0D95DE36224
flawed SPA       CA6B7E64FF1E3E25EC6039367C8827787CF62231AAB425717982AE56296085D5
```

These results evaluate the Skill's instructions and the integrations produced at that time. They are not independent certification and do not certify a later CopyWeave binary: release code changed after both runs. A release still needs its current tests, clean-tarball install, browser QA, security review, and immutable CI/commit evidence.
