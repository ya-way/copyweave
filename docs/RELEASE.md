# CopyWeave release checklist

This checklist is the release authority for the repository, npm package, demo, and Agent Skill. A release is blocked by any unchecked item marked **BLOCKER**. Launch messaging and channel templates are in [LAUNCH.md](./LAUNCH.md).

> **Release-candidate state:** angle-bracket values in this maintainer worksheet are intentional fail-closed blanks because no final GitHub owner, repository, or publisher was provided in this workspace. The package is not publishable while they remain. `prepublishOnly` runs `release:check`; the release owner must replace the blanks, rerun the repository-wide scan, and attach the result to the release issue before publishing.

## Release record

Create a copy of this table in the release issue or GitHub Discussion. Do not silently edit the record after publication.

| Field | Value |
|---|---|
| Version | `v0.1.0` |
| Release owner | `<RELEASE_OWNER>` |
| GitHub owner/repository | `<OWNER>/<REPO>` |
| npm package | `copyweave` or `<NPM_PACKAGE>` |
| Commit SHA | `<COMMIT_SHA>` |
| Workflow run | `<WORKFLOW_URL>` |
| Demo URL | `<DEMO_URL>` |
| Release URL | `<RELEASE_URL>` |
| npm provenance verified by | `<VERIFIER>` |
| UTC publication time | `<YYYY-MM-DDTHH:MM:SSZ>` |

## 1. Recheck and reserve the name

Name availability changes continuously. The checks performed on 2026-08-11 found no npm package named `copyweave`, no exact GitHub repository in the search results, and no public account at `github.com/copyweave`; none of those observations reserves the name or establishes trademark rights.

Complete these checks immediately before creating public metadata.

### npm Registry

```bash
npm view copyweave name version repository --json
```

- **BLOCKER:** If this returns package metadata, stop and investigate. Do not publish over or imitate an unrelated package.
- An `E404` means the package was not visible at that moment; it is not a reservation.
- Confirm the intended npm account or organization can publish public packages and has 2FA enabled.
- Check confusingly similar packages through the npm website, not only the exact string.

### GitHub

Check both repository-name noise and the desired owner handle:

```bash
gh api -X GET search/repositories \
  -f q='copyweave in:name' \
  --jq '.items[] | [.full_name, .description, .html_url] | @tsv'

gh api users/copyweave
```

- A GitHub repository name is only unique within an owner. The owner or organization handle is the important global reservation.
- A public 404 does not prove GitHub will permit registration; GitHub may retain or reserve handles.
- Search GitHub code, topics, npm, search engines, app stores, and product directories for `CopyWeave`, `Copy Weave`, and likely misspellings.

### Domain and trademark

- Check the intended domains and major social handles on the same day.
- Search WIPO Global Brand Database, USPTO, EUIPO, and the relevant Chinese trademark database before treating the name as a commercial brand.
- Record the search date and result links in a private release issue.
- **BLOCKER:** A credible conflict in software, publishing, design tools, content management, or developer tools requires legal review or a different name.

### Reservation order

1. Secure the GitHub owner or organization.
2. Create `<OWNER>/<REPO>` privately if final review is unfinished, then make it public at launch.
3. Secure the npm package. If the first publication is required to reserve it, publish only a complete, installable release—not an empty squatting package.
4. Secure the primary domain and social handles.
5. Update every placeholder and re-run the repository-wide scan below.

If the unscoped npm name is no longer available, prefer an honest scope such as `@copyweave/core` after securing the corresponding organization. Do not use a look-alike name intended to capture another project’s traffic.

## 2. Replace owner and launch placeholders

Use one canonical set of values:

| Placeholder | Meaning | Example format |
|---|---|---|
| `<OWNER>` | GitHub user or organization | `copyweave` |
| `<REPO>` | GitHub repository name | `copyweave` |
| `<NPM_PACKAGE>` | Exact install name | `copyweave` or `@copyweave/core` |
| `<REPOSITORY_URL>` | Canonical HTTPS repository URL | `https://github.com/<OWNER>/<REPO>` |
| `<SITE_URL>` | Project home page | `https://copyweave.example` |
| `<DEMO_URL>` | Direct, no-login demo | `<SITE_URL>/demo/` |
| `<DOCS_URL>` | Documentation root | `<SITE_URL>/docs/` |
| `<NPM_URL>` | Exact npm package page | `https://www.npmjs.com/package/<NPM_PACKAGE>` |
| `<SKILL_URL>` | Skill source directory | `<REPOSITORY_URL>/tree/main/skill/copyweave-integrator` |
| `<SECURITY_MODEL_URL>` | Published security model | `<REPOSITORY_URL>/blob/main/docs/SECURITY-MODEL.md` |
| `<SECURITY_EMAIL>` | Private security contact, if used | `security@example.com` |
| `<SOCIAL_HANDLE>` | Maintainer/project account | channel-specific |
| `<PRODUCT_HUNT_URL>` | Product Hunt page after scheduling | full HTTPS URL |

Inspect at least these locations:

- `package.json`: `name`, `repository`, `homepage`, `bugs`, `author`, `funding`, and `publishConfig`.
- `README.md` and `README.zh-CN.md`: badges, demo, docs, npm, Skill, security, and social links.
- `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `llms.txt`, and `AGENTS.md`.
- `.github/`: workflows, issue forms, pull request template, and Dependabot configuration.
- `skill/copyweave-integrator/`: `SKILL.md`, metadata, examples, source URLs, and install command.
- `docs/`, schema identifiers, demo metadata, source maps, generated bundles, and release notes.
- npm tarball metadata and any GitHub Pages/Vercel/Cloudflare configuration.

Run a repository-wide scan before building:

```bash
rg -n --hidden \
  -g '!node_modules/**' -g '!dist/**' -g '!.git/**' \
  '<OWNER>|<REPO>|<NPM_PACKAGE>|<REPOSITORY_URL>|<SITE_URL>|<DEMO_URL>|<DOCS_URL>|<NPM_URL>|<SKILL_URL>|<SECURITY_MODEL_URL>|<SECURITY_EMAIL>|<SOCIAL_HANDLE>|<PRODUCT_HUNT_URL>|OWNER/REPO|YOUR[_-]|example\.com'
```

- **BLOCKER:** No unintended placeholder may remain in a shipped file.
- Some examples legitimately use `example.com`; explicitly document every allowed match in the release issue.
- Search for local absolute paths, personal usernames, temp directories, private client names, and copied credentials.

## 3. Repository and legal readiness

- [ ] **BLOCKER:** The selected open-source license is present and matches `package.json` and Skill metadata.
- [ ] Copyright and third-party asset ownership have been reviewed.
- [ ] The demo contains no private client copy, licensed font, video, logo, analytics ID, or personal data without permission.
- [ ] `README.md` states the value, quick start, saving model, limitations, and support boundary.
- [ ] `README.zh-CN.md` matches material installation, safety, and limitation information.
- [ ] `CHANGELOG.md` contains the exact release version and date.
- [ ] `SECURITY.md` provides private reporting instructions and supported versions.
- [ ] `CONTRIBUTING.md`, code of conduct, issue forms, and pull request template are present.
- [ ] Repository description, homepage, social preview, and topics are set.
- [ ] Default branch protection and tag protection are configured.
- [ ] The release commit is reviewed and the working tree is clean.

Do not publish client-specific assets merely because they were useful during development. Replace them with purpose-built fixtures that the repository can legally redistribute.

## 4. Build, test, and package gates

Run from a clean clone with the supported Node version:

```bash
npm ci
npm run check
npm pack --dry-run --json
```

- [ ] **BLOCKER:** Type checking, unit tests, build, size budget, demo doctor, and pack check pass.
- [ ] The package has zero unintended runtime dependencies.
- [ ] The `files` allowlist contains only the CLI, distributable runtime, schema, license, and intended README.
- [ ] Source maps do not expose credentials, local paths, or private source that should not ship.
- [ ] `npm pack --dry-run --json` has been saved to the release issue and reviewed by another person.
- [ ] The packed size and unpacked size are within the documented budget.

Create the actual tarball and test exactly what will be published:

```bash
npm pack
mkdir ../copyweave-release-smoke
cd ../copyweave-release-smoke
npm init -y
npm install ../copyweave/copyweave-0.1.0.tgz
npx copyweave --help
```

Then run a minimal browser integration using the tarball rather than a workspace import.

### Required functional checks

- [ ] Explicit `data-copy-id` fields edit, save, reload, export, import, and reset.
- [ ] Automatic fields are diagnosed as less stable and do not silently replace explicit IDs.
- [ ] Normal mode shows no editor chrome and does not intercept navigation.
- [ ] Edit mode pauses dangerous navigation without changing unrelated controls.
- [ ] Browser drafts and committed project JSON reconcile as documented.
- [ ] A stale ETag returns a conflict, not a success message.
- [ ] Invalid, oversized, cross-site, and malformed imports are rejected without replacing valid data.
- [ ] Project-file writes are atomic and confined to the configured content path.
- [ ] `copyweave apply --dry-run` does not mutate files.
- [ ] `copyweave apply` creates the documented backup and does not rewrite unselected content.
- [ ] Desktop and mobile layouts have no new overflow in normal mode.
- [ ] Keyboard editing, focus, status messages, and reduced-motion behavior are usable.

### Platform checks

- [ ] Current Windows and PowerShell path behavior.
- [ ] Current macOS shell behavior.
- [ ] Current Linux shell behavior.
- [ ] Supported Chromium, Firefox, and Safari versions are either tested or accurately labeled unverified.

Do not claim a platform is supported solely because TypeScript compiled.

## 5. Skill release gate

The Skill is executable documentation and receives the same review as code. The repository-local check is always available after `npm ci`; `skills-ref` is an additional registry/specification check only when that tool is installed in the release environment.

```bash
npm run skill:check

# Optional release-environment check; this command is not bundled by CopyWeave.
skills-ref validate ./skill/copyweave-integrator
```

- [ ] **BLOCKER:** `SKILL.md` validates against the current Agent Skills specification.
- [ ] The frontmatter name matches its parent directory and the description states both capability and trigger conditions.
- [ ] License, author, version, compatibility, and source URL are correct.
- [ ] Referenced files exist and paths are relative to the Skill root.
- [ ] Instructions scan first, preserve user changes, back up before mutation, and verify after mutation.
- [ ] Scripts are self-contained, deterministic, readable, and disclose every filesystem or network action.
- [ ] No script requests credentials, reads secret locations, phones home, or downloads mutable code.
- [ ] Destructive operations require an explicit target and produce a change manifest.
- [ ] At least one clean agent completes a Vanilla integration using only the public Skill and repository.
- [ ] At least one adversarial fixture tests nested copy, SVG/CSS text, forms, hidden content, duplicate IDs, and dirty worktrees.
- [ ] The Skill’s final report distinguishes verified evidence from inference.

The [Agent Skills specification](https://agentskills.io/specification) recommends keeping the main `SKILL.md` under 500 lines and loading detailed references progressively. The experimental `allowed-tools` field is not a substitute for runtime sandboxing or human review.

## 6. Security review

- [ ] `npm audit --omit=dev` reports no runtime dependency exposure.
- [ ] Development dependency findings have been reviewed and documented rather than hidden.
- [ ] Secret scanning has run across Git history and the release tarball.
- [ ] Loopback server Host and Origin checks reject non-local and unexpected origins.
- [ ] Save endpoints require an unguessable session token and current ETag.
- [ ] Tokens are not placed in URLs, logs, content files, exports, or long-lived browser storage.
- [ ] Request and import size limits are enforced before parsing or writing.
- [ ] Paths are resolved and checked against the configured root; symlink and traversal tests pass.
- [ ] File writes use a temporary file plus atomic replacement where supported.
- [ ] Plain-text editing and import cannot create executable markup.
- [ ] No telemetry, remote service, or data transfer exists beyond what the documentation declares.
- [ ] The private vulnerability-reporting path has been tested by a maintainer.

**BLOCKER:** A confirmed data-loss path, arbitrary file write, remote-origin save, token leak, HTML/script injection, or false disk-success message must be fixed before release.

## 7. npm Trusted Publishing and provenance

Use npm Trusted Publishing with GitHub Actions on a GitHub-hosted runner whenever possible. It uses short-lived OIDC credentials and automatically generates provenance for public packages from public repositories.

Required conditions:

- The repository is public.
- `package.json.repository.url` exactly matches the GitHub repository, including case.
- npm is configured with the exact GitHub owner, repository, and workflow filename.
- The publishing job runs on a GitHub-hosted runner.
- The workflow currently pins Node.js 24 and installs npm 11.5.1 explicitly. Recheck npm's official Trusted Publishing minimum immediately before release; do not assume the runner's bundled npm is new enough.
- The workflow grants only the required permissions:

```yaml
permissions:
  contents: read
  id-token: write
```

- Build and tests complete before `npm publish`.
- The GitHub environment may require maintainer approval for production publishing.
- Release tags are protected and cannot be created by arbitrary workflows.

After Trusted Publishing works:

1. Set npm publishing access to require 2FA and disallow traditional tokens.
2. Revoke legacy automation tokens that are no longer required.
3. Keep provenance enabled.
4. Audit the trusted publisher configuration when the repository or workflow is renamed.

### First-package bootstrap

If npm does not allow configuring a trusted publisher until the package exists:

1. Perform the first publish from a hardened maintainer session with phishing-resistant 2FA.
2. Do not create or store a long-lived automation token.
3. Immediately configure the trusted publisher against the final workflow.
4. Restrict token publishing and verify the next prerelease through OIDC before announcing stable automation.

Do not publish an empty placeholder package merely to occupy the name. The first public version must install, identify its provenance limitations honestly, and be safe to use.

Official references:

- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- [Viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/)

## 8. Publish procedure

### Before pressing publish

- [ ] **BLOCKER:** All earlier blocker items are complete.
- [ ] Version in `package.json`, lockfile, changelog, Skill metadata, and release notes matches.
- [ ] The final commit SHA is recorded and CI is green on that exact SHA.
- [ ] The npm dist-tag is intentional: `next` for prerelease, `latest` for stable.
- [ ] Another maintainer has reviewed the package file list and release notes.

### npm

Publish only from the approved workflow or documented bootstrap session:

```bash
npm publish --access public
```

For a prerelease:

```bash
npm publish --access public --tag next
```

### Verify npm before announcing

```bash
npm view <NPM_PACKAGE> version dist.integrity dist.tarball repository --json
npm install <NPM_PACKAGE>@<VERSION>
npm audit signatures
```

- [ ] The displayed version and repository are correct.
- [ ] The npm page shows a valid provenance indicator linked to the expected source commit and workflow.
- [ ] `npm audit signatures` succeeds in a clean consumer project with a supported npm version.
- [ ] CLI help, ESM import, type declarations, schema export, and advertised CDN URL work from the published artifact.

If provenance is absent or points to the wrong repository, do not claim that the package is provenance-verified. Fix the publishing path and issue a corrected release.

### GitHub Release

- Create the version tag from the verified commit. Sign it if the project has an established signing process; otherwise do not call it signed.
- Publish release notes containing changes, install command, demo, security notes, known limitations, checksums, and upgrade instructions.
- Attach only reproducible, reviewed assets.
- Link the npm package and provenance evidence.
- Keep generated release notes human-reviewed.

GitHub releases package deployable iterations around tags and allow release-asset download tracking; see [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).

### Demo and documentation

- Deploy from the same release commit.
- Ensure the demo does not expose a write endpoint on a public host.
- Confirm every README and social link returns a successful response without authentication.
- Verify the demo at mobile and desktop widths in a fresh browser profile.
- Purge stale CDN content only after the new deploy is healthy.

### Agent Skill

- Tag the Skill with the same source release or document an independent Skill version explicitly.
- Test installation from the public GitHub source:

```bash
npx skills add <OWNER>/<REPO>
```

- Verify the expected Skill, and no unrelated directory, is installed.
- Add the skills.sh badge only after the canonical owner/repository is final.
- Publish the Skill security statement and evaluation results alongside the install command.

## 9. Post-release verification

Complete these checks before posting to Show HN, Product Hunt, or Chinese communities:

- [ ] A clean npm install works without repository checkout or unpublished workspace files.
- [ ] The README quick start works exactly as written.
- [ ] The public demo uses the released version.
- [ ] npm provenance resolves to the recorded commit and workflow.
- [ ] GitHub release assets download and checksums match.
- [ ] The Skill installs from the public repository and passes validation.
- [ ] Security and issue-reporting links work when signed out.
- [ ] No placeholder, private path, or client asset appears in the npm tarball, release archive, demo, or social image.
- [ ] A maintainer is available for launch-day reports.

Record final evidence in the release issue: command output, tarball manifest, workflow URL, npm provenance link, clean-install result, Skill validation result, demo screenshots, and approver names.

## 10. Failure and rollback policy

Do not erase evidence or pretend a failed release did not happen.

- For a documentation-only problem, correct the repository and publish a clear note if users could act unsafely.
- For a broken but non-security package, deprecate the affected version with an explanation and publish a patch. Avoid npm unpublish except where npm policy and a severe incident justify it.
- For a security issue, stop promotion, use the private advisory process, prepare a coordinated fix, rotate any exposed credentials, and publish an advisory.
- If a package was published from the wrong commit or without claimed provenance, withdraw the provenance claim and publish a corrected version; do not rewrite tags.
- If the demo is unsafe, take the demo offline without removing the repository’s security instructions.
- If the name has a credible conflict, stop promotion and assess migration before building more recognition.

## Final approval

The release owner signs this statement in the release issue:

```text
I verified the final commit, package manifest, clean installation, public demo, Skill validation, placeholder scan, security blockers, and npm provenance status recorded above. Known limitations are documented. This approval describes evidence; it does not promise adoption, production fitness for every site, or a GitHub star count.
```
