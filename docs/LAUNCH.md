# CopyWeave launch playbook

This document turns the first public release into a repeatable, honest launch. It covers the repository, npm package, live demo, and companion Agent Skill. The operational release checklist lives in [RELEASE.md](./RELEASE.md).

## Positioning

**Name:** CopyWeave  
**Tagline:** Edit the words. Keep the design.  
**One sentence:** CopyWeave adds a local-first editing layer to an existing website so people can revise visible copy in place, save portable JSON, and leave the normal typography and layout alone.

The primary audiences are:

1. Developers handing a finished site to a writer or client.
2. Designers who want copy to be revised in the real composition.
3. Small teams that do not need a hosted CMS, account system, or new framework.
4. AI coding agents that need a safe, testable procedure for adding editable copy without redesigning a site.

CopyWeave should be described as a focused editing layer, not as a replacement for every CMS. It is a poor fit when a project needs concurrent cloud editing, editorial approvals, media management, permissions, or a content database. Saying this early makes the useful claim more credible.

## Launch principles

- Make the project runnable before asking anyone to read about it.
- Lead with a real edit-save-reload demonstration, not a feature collage.
- Use concrete, tested language. Do not say “zero visual change” unless the current release has passed visual regression checks.
- Never ask for coordinated upvotes, stars, or comments. Invite use, criticism, and reproducible bug reports.
- Do not add telemetry merely to measure a launch. Use aggregate GitHub, npm, skills.sh, and opt-in survey data.
- Treat every launch comment as product research. Answer limitations directly and turn reproducible problems into issues.
- Keep the repository, npm package, demo, documentation, and Skill on the same versioned source of truth.

## Release gates before D-7

Do not begin public promotion until all of these are true:

- A visitor can open a live demo without an account or email gate.
- A new developer can reach the first editable field from the README in three minutes or less.
- Normal mode, edit mode, browser draft, project save, export, import, and recovery are explained separately.
- `npm run check` passes from a clean install.
- The packed npm tarball has been inspected and contains no private paths, drafts, credentials, or unrelated client assets.
- The Agent Skill validates and its scripts require no credentials or undisclosed network access.
- `SECURITY.md`, the security model, license, contribution guide, code of conduct, issue templates, and release notes are ready.
- The owner, repository, package, demo URL, and security contact placeholders listed in [RELEASE.md](./RELEASE.md) have been replaced.
- The GitHub and npm names have been rechecked and reserved. A previous 404 is evidence from that moment, not a reservation.

## Assets to prepare

Create one coherent set rather than a different identity for every channel:

- 1280×640 social preview with a solid-background fallback.
- 12–18 second silent loop: normal page → enable editor → revise text → save → reload → return to normal mode.
- Static before/edit/after triptych with meaningful alt text.
- 45–90 second narrated walkthrough for Product Hunt and Chinese video channels.
- A public Vanilla HTML example and at least one bundler example.
- One screenshot of the JSON diff and one of the verification output.
- A short limitations card: what CopyWeave deliberately does not do.
- A response sheet containing install, security, compatibility, and local-first answers.

The README demo should remain understandable when animation is disabled. Provide a poster image and written steps.

## D-7: proof and preparation

### Product work

- Freeze the public API except for release-blocking fixes.
- Run the complete release checklist and test the tarball in a clean temporary project.
- Ask 5–10 people outside the implementation team to follow only the README.
- Include at least one writer or designer, one Vanilla HTML user, one Vite user, and one user on a non-Windows platform.
- Record time to first edit, first failed assumption, save comprehension, and whether the user can recover without help.
- Fix unclear labels and documentation before adding more promotional copy.

### Repository work

- Reserve the GitHub owner/repository and npm package in the order described in [RELEASE.md](./RELEASE.md).
- Upload the GitHub social preview and add focused repository topics.
- Enable Discussions with `Showcase`, `Help`, and `Ideas` categories.
- Prepare `good first issue` tasks that are real, bounded improvements.
- Draft the `v0.1.0` GitHub release but do not publish it yet.
- Configure npm Trusted Publishing or document the one-time bootstrap procedure.

### Community work

- Participate normally in the target communities before posting the project.
- Recruit testers through direct, personal invitations; do not recruit a voting group.
- Ask testers for permission before quoting them or displaying their sites.
- Prepare separate messages for technical, design, and Chinese audiences. Do not cross-post identical marketing text everywhere.

## D0: publish and stay present

Recommended order:

1. Run the final name, placeholder, test, pack, and security checks.
2. Publish the npm package and verify its provenance on npm.
3. Install the published package in a clean directory and test the public CDN artifact if advertised.
4. Publish the GitHub release and make the live demo public.
5. Publish the Show HN post while a maintainer can answer for several hours.
6. Post one concise announcement to existing personal channels.
7. Monitor install failures and documentation questions; prioritize fixes over more posts.

Product Hunt is best scheduled on a separate day between D+2 and D+7 unless two maintainers can support both communities. The project must already be live and usable. Product Hunt’s launch guidance emphasizes usefulness, novelty, craft, authentic maker participation, and no paid or coordinated voting.

## D+7: improve, teach, and widen distribution

- Summarize the first week: installs, independent integrations, recurring questions, bugs, and limitations.
- Ship a patch for the most damaging onboarding problem rather than accumulating fixes for a large announcement.
- Publish one technical article explaining the DOM, stable-ID, saving, and visual-preservation trade-offs.
- Publish the companion Skill after its validation and clean-agent evaluation results are visible.
- Add the skills.sh badge only after the GitHub source and installation path are final.
- Turn successful independent integrations into opt-in showcase entries.
- Submit to appropriate curated lists only after the project has documentation, a stable release, and independent use.
- Open roadmap discussions around evidence from users, not launch-day feature requests alone.
- Write a short retrospective stating what did not work. This is part of the project’s trust signal.

## Channel templates

Replace every angle-bracket placeholder before posting. Keep links direct and avoid URL shorteners during the initial launch.

### Show HN

**Title**

```text
Show HN: CopyWeave – edit text on any static site without touching its design
```

**Opening comment**

```text
Hi HN — I built CopyWeave after repeatedly reaching the same awkward handoff: the layout was ready, but the words were not, and the writer either had to edit source code or ask a developer to relay every revision.

CopyWeave adds a removable, local-first editing layer to an existing site. It edits visible text in the real composition, stores browser drafts locally, and can save a small, reviewable JSON file through a loopback CLI. In normal mode it adds no editor UI. It is framework-agnostic and has zero browser runtime dependencies.

Try it without signing up: <DEMO_URL>
Source and three-minute setup: <REPOSITORY_URL>

The deliberate limits: this is not a collaborative cloud CMS, it does not manage media or permissions, and automatically discovered fields are less stable than explicit data-copy-id fields. I would especially value feedback on the stable-ID model, the local save boundary, and sites where the visual-preservation claim fails.

I will be here to answer questions and turn reproducible problems into issues.
```

Follow the official [Show HN guidelines](https://news.ycombinator.com/showhn.html): the project must be usable, the maker must be present, and friends must not be asked to upvote or comment.

### Product Hunt

**Name**

```text
CopyWeave
```

**Tagline**

```text
Edit the words. Keep the design.
```

**Short description**

```text
A local-first editing layer for websites that are already designed. Revise visible copy in place, save portable JSON, and keep your framework, typography, layout, and code ownership.
```

**Maker’s first comment**

```text
Hello Product Hunt — CopyWeave began with a handoff problem rather than a CMS roadmap.

When a small site is visually finished but its copy is still moving, the writer is often pushed into source files, a detached spreadsheet, or a hosted system much larger than the job. CopyWeave lets them edit the real page instead. Browser drafts stay local, project copy remains reviewable JSON, and the editing layer disappears in normal view.

What is in this first release:
• explicit, durable field IDs plus an automatic discovery mode;
• local drafts, JSON import/export, and guarded project-file saves;
• a framework-agnostic browser library and non-interactive CLI;
• an open Agent Skill for safe integration;
• no account, hosted service, or runtime dependency.

What is not in it: real-time collaboration, media management, roles, or editorial workflow. Those teams should use a real CMS.

Please try <DEMO_URL>. I would love to hear where onboarding is unclear or the site’s existing design is not preserved.
```

Use a personal maker account, disclose the open-source license, and do not offer rewards for votes. See the official [Product Hunt Launch Guide](https://www.producthunt.com/launch).

### 中文技术社区：V2EX / 掘金 / 知乎

**标题**

```text
开源了 CopyWeave：让已经设计好的网站可以直接改文案，但不接管设计和代码
```

**正文模板**

```text
我最近反复遇到一种很小、却很伤人的协作问题：网站视觉已经完成，文案还在调整，但写文案的人只能改源码、填一张脱离版面的表，或者把每一次修改再转述给开发者。

所以我做了 CopyWeave。它给现有网站加上一层可移除的本地文案编辑能力：

• 直接在真实页面里编辑可见文字；
• 保留当前文字作为默认内容；
• 草稿保存在浏览器，正式内容可以保存为可审查的 JSON；
• 正常浏览时不显示编辑器界面；
• 不要求账号、云服务或切换框架；
• 提供 CLI、类型、Schema 和 Agent Skill。

在线试玩：<DEMO_URL>
GitHub：<REPOSITORY_URL>
npm：<NPM_URL>

它不是多人协作 CMS，也不负责媒体库、角色权限和审批流。第一版更适合静态官网、作品集、活动页，以及开发者与文案/客户之间的交付阶段。

我最想收集两类反馈：一是哪些页面仍然会发生视觉偏移；二是保存、恢复和字段 ID 的概念哪里不够清楚。欢迎直接给复现，不需要为了支持项目去刷 star。
```

在 V2EX 使用“分享创造”等符合当时站规的节点；在掘金和知乎增加技术细节与失败案例，不要只贴仓库链接。发布前重新核对各社区的自推广规则。

### 中文短帖：即刻 / 微博 / 朋友圈

```text
网站可以 vibe coding，但最后一公里仍然需要人来写字。

我把这一步做成了开源工具 CopyWeave：在已经设计好的页面上直接改文案，本地保存，正常浏览时编辑层完全退场。它不接管框架，也不假装自己是一个万能 CMS。

演示：<DEMO_URL>
源码：<REPOSITORY_URL>

如果你愿意试，最有价值的不是点赞，而是告诉我：哪一步让你不放心，或哪个页面被它改坏了。
```

### Agent Skill announcement

```text
CopyWeave now ships an open Agent Skill.

The skill teaches a coding agent to add editable copy to an existing site while treating typography, layout, navigation, user files, and recovery as invariants. It scans first, backs up before mutation, uses stable IDs, and finishes with desktop/mobile and save/reload verification.

Install from the auditable GitHub source:
npx skills add <OWNER>/<REPO>

Skill source: <SKILL_URL>
Security model: <SECURITY_MODEL_URL>
```

## Honest language about stars and success

Stars are an uncontrolled outcome, not a release acceptance criterion. Do not promise that the project “will get high stars,” and do not imply that polish guarantees adoption.

Use this public wording when expectations need to be set:

```text
We cannot promise a star count. We can promise a runnable demo, a three-minute path to the first edit, transparent limitations, reproducible tests, provenance-linked releases, and responsive handling of real reports. If those make CopyWeave useful, attention can follow honestly.
```

Chinese version:

```text
我们不承诺 star 数量，因为它不是工程团队可以诚实控制的结果。我们承诺的是：无需注册的可运行演示、三分钟内完成第一次编辑、公开的限制说明、可复现测试、可追溯发布，以及对真实问题的持续回应。项目如果因此有用，影响力才有机会自然发生。
```

Acceptable calls to action:

- “Try it on a small site and tell us what breaks.”
- “If this solves a real handoff problem, starring helps others find it.”
- “A minimal reproduction is more useful than an upvote.”

Avoid:

- “Help us reach 1,000 stars.”
- Coordinated launch groups, vote exchanges, giveaways tied to votes, or automated posting.
- Claiming production readiness from stars, downloads, or a Product Hunt rank.

## Metrics

### Primary product signals

| Signal | How to observe it without product telemetry | Why it matters |
|---|---|---|
| Time to first successful edit | Moderated test and opt-in issue template | Measures onboarding friction |
| First save understood correctly | Test whether users can explain browser draft vs project save | Measures trust, not button clicks |
| Independent integrations | Opt-in showcase, Discussions, public dependents | Shows use outside the authors’ demo |
| Successful clean installs | Release smoke tests and actionable install reports | Protects the first impression |
| Visual-preservation failures | Reproduction fixtures and screenshot-diff issues | Tests the central claim |
| Recovery success | User test of import, stale tab, invalid JSON, and restore | Measures safety |

### Distribution signals

- GitHub unique visitors, clones, stars, forks, and external referrers.
- npm weekly downloads and version adoption.
- GitHub Release asset downloads.
- skills.sh installations after the Skill is published.
- Number of independent examples, discussions, and contributors.
- Median first response time for actionable issues.

Interpret numbers carefully. A download can be CI traffic, a star is not an active user, and a successful Product Hunt day is not retention. Report counts as observations, not proof of product quality.

### Suggested 30-day learning goals

These are internal learning targets, not public promises:

- Ten independent people complete the README flow.
- Three public integrations are not maintained by the core team.
- All confirmed data-loss or false-save reports receive immediate triage.
- The top five onboarding questions are answered in the README or CLI output.
- At least one release decision is changed by user evidence.

## Response playbook

- **Install failure:** ask for OS, Node/npm versions, exact command, full error, and whether the published tarball or repository was used.
- **Visual drift:** request the smallest public fixture, viewport, before/after screenshots, computed styles, and the field mode used.
- **Save concern:** explain localStorage, loopback server, token, ETag, atomic write, and content-file path without hand-waving.
- **Security report:** move exploit details to GitHub private security advisories; do not continue in a public issue.
- **Feature request:** first identify the underlying workflow. Decline requests that would turn the package into an account-based CMS without evidence.
- **Comparison question:** describe scope and trade-offs; do not attack CMS, visual builder, or headless-content projects.

## Useful official references

- [Show HN guidelines](https://news.ycombinator.com/showhn.html)
- [Product Hunt Launch Guide](https://www.producthunt.com/launch)
- [GitHub social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
- [GitHub repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
- [GitHub community profile](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories)
- [skills.sh documentation](https://www.skills.sh/docs)

