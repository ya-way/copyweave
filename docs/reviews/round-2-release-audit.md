# CopyWeave 第二轮发布就绪审阅

日期：2026-08-12（Asia/Shanghai）  
角色：第一次拿到源码与发布清单的开源维护者  
范围：软件包、文档、Skill、CI 与 GitHub 上传卫生；不把旧 Browser 截图重新解释为当前 bundle 的证据

## 结论

最终软件快照没有发现新的 P0/P1 实现缺陷。类型、46 项测试、构建、大小预算、严格 demo doctor、文档链接、Skill 本地契约、npm tarball allowlist、NodeNext 干净安装和两种依赖审计均通过。最终 npm tarball 为 **99 个文件**，浏览器运行时依赖为 **0**。

当前状态是**可以上传 GitHub 并由陌生维护者复验的 release candidate**，不是已经发布的 npm/GitHub/Skill 版本。公开发布仍被外部身份与不可变来源证据主动阻止：工作区没有 `.git`，没有 GitHub owner/repository 或 commit；`package.json` 没有真实 `repository`、`homepage`、`bugs`；npm registry 当前返回 E404；发布模板中的 URL 仍是有意保留的待填值。`npm run release:check` 因此以 `release-metadata-incomplete` 非零退出，这是正确的 fail-closed 结果，不是需要绕过的测试失败。

本报告不承诺 GitHub star 数量。可验证的是包可运行、边界诚实、检查可复现；采用与传播结果必须由真实用户行为证明。

## 已修并通过的发布面

| 发布面 | 最终证据 | 结论 |
|---|---|---|
| 类型与测试 | `npm run check`；Vitest `4` 个文件、`46/46` tests | 通过 |
| 构建与大小 | ESM `72,604` bytes / `18,285` gzip；IIFE `47,813` bytes / `15,263` gzip；两者低于 `18,432` gzip 门限 | 通过 |
| Demo 契约 | strict doctor：`1` 个 HTML、`38` 个显式字段、`0` error、`0` warning | 通过 |
| 文档入口 | `npm run docs:check` 检查本地 Markdown 路径与 fragment；本报告生成后整套门禁通过 | 通过 |
| Skill 目录 | `npm run skill:check`：`copyweave-integrator`、`110` 行、`6` 个引用；README、LICENSE、metadata 与独立 evidence note 均在 tarball | 通过 |
| 官方 Skill 规范 | 冻结时主审在最终 Skill 文档上执行官方 `quick_validate.py`，结果为 `Skill is valid!`；本审重跑当前内置 `skill:check` | 通过；官方结果为继承证据 |
| npm allowlist | `npm run pack:check`：`99` 个文件、unpacked size `855509` bytes；required surfaces 全部存在；`node_modules`、`evals/runs`、backup/log 被拒；runtime dependencies `0` | 通过 |
| 干净消费者安装 | `npm run install:check`：版本 `0.1.0`；ESM exports、CLI、IIFE、Schema、Skill 与 NodeNext declarations 均从 tarball 消费 | 通过 |
| 依赖审计 | `npm audit --audit-level=high` 与 `npm audit --omit=dev --audit-level=high` 均为 `found 0 vulnerabilities` | 通过 |
| CI | Node `20/22/24` × Ubuntu/Windows/macOS；另有 package contract、CodeQL、Pages recovery-artifact gate | 配置完整；须在真实 commit 上执行 |
| npm 发布流 | Node 24、npm 11.5.1、OIDC、provenance、tag/version assertion，并在安装/发布前执行 metadata gate | fail closed 设计正确 |

## 发布阻塞：外部人工门禁

这些项目不是当前实现缺陷，但在完成前不得宣称“已发布”或关闭发布清单。

1. **没有 Git 仓库与不可变 commit。** `work/copyweave/.git` 不存在，因而当前 hash、评测、CI 和 provenance 不能绑定到公开 commit。创建真实仓库后，先检查首个 staged manifest，再提交、推送并在该 SHA 上重跑全部门禁。
2. **owner 元数据未确定。** `npm run release:check` 正确返回 `release-metadata-incomplete`，缺少 `repository`、`homepage`、`bugs`。只有真实 owner/repository 存在后才能填写，不能用示例 URL 欺骗门禁。
3. **npm 尚未公开。** 2026-08-12 03:43 +08:00 执行 `npm view copyweave name version repository --json` 返回 registry `E404`。README 已把安装标为“发布后”并提供源码检查路径，因此文档诚实；registry 安装仍是正式首发门禁。
4. **发布模板仍待填。** `<OWNER>`、`<REPO>`、`<DEMO_URL>` 等只出现在 `docs/RELEASE.md` 与 `docs/LAUNCH.md` 的明确 worksheet/传播模板中；它们不是死链接，但发布 owner 必须用真实值生成 release record，并扫描所有对外文案。
5. **当前 bundle 的浏览器证据要单独闭环。** [陌生用户审计](./round-2-user-audit.md) 明确没有把旧 bundle 的截图升级为当前 hash 的证据。360px、source-only、下载文件实体和真实键盘顺序属于发布证据门禁，不是本次软件包审阅发现的代码缺陷。
6. **Trusted Publishing 尚未配置。** 真实公开仓库、npm publisher、environment 与 workflow filename 确定后，按 `docs/RELEASE.md` 配置 OIDC，并验证 npm provenance 指向预期 commit。

## GitHub 上传卫生

- 工作树外观扫描未发现仓库内本机绝对路径、个人目录标识或 recovery/log/tarball 残留文件。
- `evals/runs/` 与 `.skill-validator-deps/` 在最终快照中不存在；本地 `node_modules/` 存在，但被 `.gitignore` 和 npm allowlist 排除。
- `.gitignore` 同时排除 `dist/` 与 `demo/assets/copyweave.iife.js`；CI 会从源码重建它们，npm tarball 则由 `files` allowlist 明确纳入已构建发布物。
- 因当前没有 `.git`，**不要把工作目录直接拖拽上传**：那会绕过 `.gitignore`。应初始化 Git、执行受控 `git add`、审查 staged 文件，再推送；或使用最终交付的已清洁 source archive。
- package 检查不是名称/所有权证明。首发当天仍要重查 npm、GitHub owner、商标与第三方资产权限。

## 可复核哈希

以下 SHA-256 对应本次最终构建后的文件；它们用于识别工作区快照，不替代 Git commit 或 npm provenance。

```text
dist/index.js                       4C580F355708E0BD0C6DCC50789F81326070CDF434C4BDFFF06D892D3D42B8B2
dist/copyweave.iife.js              E66F23621C5B3EDDDC50F8816E176A186D67AB2F68980B3BA294FD5FF808F284
demo/assets/copyweave.iife.js       E66F23621C5B3EDDDC50F8816E176A186D67AB2F68980B3BA294FD5FF808F284
package-lock.json                   45A1C70EC56A3152AE4DAA28B72D11A1944DB4E1789E3FE193B3F624BD4B58F7
skill/copyweave-integrator/SKILL.md 6EFC79D3CE5FE5E8166FB515452C174BFEBAE476226A3714C504AF102F29399B
```

IIFE 的 dist 与 demo 副本 hash 相同，说明 demo 使用的是当前发布 bundle。

## 命令证据

```text
npm run check
  PASS: typecheck, 46/46 tests, build, size, doctor, docs, Skill,
        99-file pack contract, clean tarball install

npm audit --audit-level=high
  PASS: found 0 vulnerabilities

npm audit --omit=dev --audit-level=high
  PASS: found 0 vulnerabilities

npm run release:check
  EXPECTED BLOCK: release-metadata-incomplete
  missing: repository, homepage, bugs

npm view copyweave name version repository --json
  EXPECTED PRE-RELEASE RESULT: E404 (not published / not visible)
```

第一次 `npm run check` 在本报告尚不存在时停于 `docs:check`，因为 [第二轮修改记录](./round-2-changes.md) 已预先链接本文件；测试、构建、大小与 doctor 在该次运行已通过。创建本报告后再次执行整套命令通过。这个顺序依赖不构成产品失败。

## 发布决定

- **GitHub 候选源码包：通过。** 可交给 owner 初始化仓库并运行 CI。
- **npm 立即发布：阻止。** 必须先取得 owner/repository、填写真实 metadata、闭环当前 bundle 的人工证据、配置 Trusted Publishing，并在不可变 commit 上再次通过整套检查。
- **Skill 立即独立发布：阻止。** 目录与规范检查通过，但 source URL、版本归属和公开 commit 仍待真实仓库；发布后应从公开位置进行一次全新安装验证。
