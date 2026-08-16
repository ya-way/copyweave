# CopyWeave 第一轮使用者审视

审视日期：2026-08-11  
审视对象：当前稳定检查点的源码、README、文档、CLI、demo 与自动化测试  
审视角色：普通内容编辑者、网站开发者、AI 编码代理

## 结论先行

CopyWeave 的产品方向、视觉表达和“只改文字，不拆设计”的边界已经相当清楚；语义字段、纯文本写入、本地草稿、项目 JSON、可移除运行时和面向代理的说明，也组成了一个值得开源的最小系统。

第一轮发现的发布阻塞项已经全部在当前检查点落地修复：初始化前编辑不会覆盖未加载页面；浏览器稿与项目稿改为逐字段三方合并；项目基线加载失败会阻止 PUT；CLI 未知/缺值参数 fail closed；strict doctor 能发现显式与未标记文案混用；SPA 页面与源默认值均按当前路由解析；静态服务器同时检查 Windows 分隔符和 realpath 后的 canonical 目标；demo 的 `OWNER` 链接已移除。公开架构与安全文档也已同步到这一实现。

因此，**当前剩余 P0 为 0**。这不等于第二轮验收完成：真实浏览器可访问性、草稿存储失败、错误可恢复性、npm tarball 链接、CLI 结构化错误与跨平台/框架验证仍有 P1/P2，应在正式公告前完成。

本报告中的优先级定义如下：

- **P0**：发布阻塞；可能造成数据损失、敏感信息暴露，或让安全/校验门禁给出具有实质后果的错误结论。
- **P1**：核心旅程明显不可靠或不易恢复；应在邀请普通使用者前修复。
- **P2**：不阻塞主要任务，但会降低完成度、可理解性或开源信任感。

“24 个测试通过”是当前实现的正向证据，不是对未覆盖分支的安全证明。也无法保证项目获得高星；能保证的是发布承诺与实际行为一致、关键旅程可复现、失败方式可恢复。

## 范围与证据边界

本轮是静态源码审查加自动化测试审查，未进行浏览器截图、真实屏幕阅读器、移动端触摸、跨浏览器或真实框架集成测试。因此，本报告不会声称视觉验收完成，也不会声称符合 WCAG。

本轮实际验证：

- `npm run check`：完整通过，包含 typecheck、24/24 tests、build、size、doctor 与 pack check。
- `npm run doctor:demo`：当前 demo 报告 39 个显式字段、0 个警告。
- `npm run size`：ESM gzip 14,049 bytes、IIFE gzip 11,809 bytes，均低于 18 KiB 预算。
- `npm run pack:check`：58 个文件、unpacked 511,874 bytes，要求的 docs/demo/Skill/中文 README 均在包内。
- `node bin/copyweave.mjs doctor demo --strcit --json`：现在非零退出并报告未知参数。
- `node bin/copyweave.mjs --version`：输出 `0.1.0`。
- `npm pack --dry-run --json --ignore-scripts`：开源材料现已进入发布包；当前 `package.json` 仍等待正式 `repository`、`homepage`、`bugs` 元数据。

## 已确认的优点

### 对内容编辑者

- 页面中的文字直接继承现有字体、颜色和布局，没有另造一个与页面脱节的表单后台。
- 保存到浏览器草稿与保存到项目文件有不同状态；保存端点不可用时不会伪报“已写入磁盘”。
- 导入内容经过站点范围和结构校验，持久化内容通过 `textContent` 写入，不执行导入 HTML。
- 重置采用二次确认，IME 组合输入中的 Enter 已有回归测试。
- 面板由原生按钮构成，打开后聚焦“完成”，关闭后把焦点还给启动按钮，并提供礼貌状态区。

### 对网站开发者

- 语义 `data-copy-id`、纯文本 JSON、HTML 源文案回退和零运行时依赖构成了小而清晰的集成面。
- CLI 服务仅绑定回环地址；Host、Origin、随机 token、ETag、体积、结构、真实路径和原子替换均有防护。
- 默认备份、唯一临时文件、同进程写入串行化与静态路径 realpath 限制，明显优于“直接覆盖一个 JSON 文件”的脚本。
- README 对富文本、属性、占位符、图片元数据、SVG/CSS 文案、JSX/模板改写等非目标已有明确限制，没有把工具包装成完整 CMS。

### 对 AI 编码代理

- `AGENTS.md`、`llms.txt`、JSON Schema、集成文档、字段 ID 规范和 Skill 给出了可搜索的机器入口。
- `doctor --json` 的诊断项已有稳定 `code`；语义字段和可移除初始化片段适合代理做小范围、可审阅的变更。
- 项目有类型检查、单元/集成/安全测试、体积预算、demo 审计与打包检查，且 `npm run check` 能串起主要门禁。

## 第一轮发现、当前检查点已修复

以下项目应保留在审计记录中，而不是从历史中删掉；它们解释了当前约束和新增测试为何存在。

| 编号 | 原风险 | 当前修复与证据 | 状态 |
|---|---|---|---|
| R1-F01 | 用户在项目 JSON 尚未加载完时输入或保存，浏览器的空白初始 store 可能覆盖项目中其他页面。 | 编辑器现在等待初始化，并把加载期间的字段修改/页面重置叠加到项目 store；`tests/editor.test.ts` 覆盖慢加载时输入与保存，并确认未编辑页面仍在。 | 已修复 |
| R1-F02 | 浏览器草稿与项目文件仅按整库 `updatedAt` 二选一，独立字段修改也可能互相吞掉。 | 浏览器草稿现在持久化项目基线与 ETag；加载时进行逐字段三方合并，同字段冲突保留浏览器稿并拒绝磁盘保存；`tests/schema.test.ts` 覆盖独立变更和同字段冲突。 | 已修复 |
| R1-F03 | 函数形式的 SPA `pageId` 只在初始化时求值，路由变化后编辑/保存到错误页面。 | `refresh()` 会重新解析页面 ID；`tests/editor.test.ts` 覆盖路由切换。 | 已修复 |
| R1-F04 | `serve` 若误指向项目根，同源页面脚本可读取 `.env`、`.git`、key、map、数据库等文件。 | CLI 会拒绝明显的项目根，除非显式 `--allow-project-root`；静态读取增加敏感路径 deny；`tests/cli.test.ts` 覆盖拒绝和阻断。 | 已修复 |
| R1-F05 | 项目 GET 失败、会话却成功时，客户端曾可用有效 session ETag 把空白/局部 store 写回真实项目。 | 保存现在要求 `projectBaseLoaded`；失败时显示专属、可恢复状态并保留导出，且测试断言不会发出 PUT。 | 已修复 |
| R1-F06 | CLI 静默接受未知/缺值参数；`apply --dryrun` 拼错后可能执行真实写入；`--version` 打印帮助。 | 每个命令现在校验允许的 flag 与类型；未知参数非零退出；回归测试确认 `--dryrun` 不写文件；`--version` 输出 `0.1.0`。 | 已修复 |
| R1-F07 | strict doctor 只在整页零显式字段时告警，显式与未标记文本混用会假绿。 | doctor 新增 `unmarked-visible-text`；混合 fixture 在 strict 下非零退出；demo 当前 39 个显式字段、0 警告。 | 已修复 |
| R1-F08 | SPA 两个路由复用 `hero.title` 时，`sourceDefaults` 只按字段 ID 缓存，可能串用源文案。 | 默认值现在按 `pageId + fieldId` 存储，编辑器测试覆盖跨页同 key。 | 已修复 |
| R1-F09 | Windows 编码反斜杠可能绕过路径分段检查；realpath 后的同根敏感目标也需重检。 | denylist 同时按 `/` 与 `\\` 分段，并在 realpath 后对 canonical 相对路径再次执行；CLI 测试覆盖 `%5c`。 | 已修复 |
| R1-F10 | README/架构/安全文档曾保留旧整库仲裁和旧静态风险；demo 曾链接 `github.com/OWNER/copyweave`。 | 公开文档已同步基线/三方合并、动态 pageId、保存门禁和 canonical deny；demo 将占位链接改为本页 “How it works”。 | 已修复 |
| R1-F11 | 导入曾在读取整个文件后才靠逐字段限制拒绝，README 的 “size-limited” 不够真实。 | 文件选择在 `file.text()` 前检查 2 MB；字符串/API 导入也按总字节拒绝；编辑器测试覆盖超限且不替换当前文案。 | 已修复 |
| R1-F12 | `apply` 曾边扫描边写文件、可能半应用；数字后缀语义 ID 被误判；重复目标不明确。 | 现在先为所有文件生成计划，任何 unmatched/duplicate 都不写；数字后缀可用；写入失败尝试回滚并报告状态；CLI 测试覆盖预检与数字后缀。 | 已修复 |
| R1-F13 | 客户端曾保留隐式 `If-Match: *`，且忽略 session 返回的 siteId。 | 普通保存只发送已加载项目的 ETag；无基线/ETag不写；session siteId 不匹配会禁用会话并给诊断。 | 已修复 |
| R1-F14 | 字段导航首步不稳定，并强制 smooth scroll。 | 未激活时 Previous/Next 选择可预测端点；`prefers-reduced-motion` 时使用 auto；实现已有单元覆盖/静态证据，真实浏览器仍列第二轮。 | 已修复 |
| R1-F15 | 顶层 CLI 错误难以被代理解析。 | 参数类错误改为 `CliError`，JSON 包含 `unknown-option`、`duplicate-option`、`invalid-option-value` 等 code/details；未知命令也有稳定 code。 | 部分修复 |
| R1-F16 | npm tarball 曾排除 README 引用的 docs、demo、Skill、中文 README 和社交图。 | `package.json#files` 现在包含这些开源材料；实际仓库元数据和干净 tarball 链接验证仍留第二轮。 | 部分修复 |

## 当前 P0 状态

**剩余 P0：0。** 第一轮修复有源码、自动化测试和公开文档三类证据。第二轮仍应从干净环境复测，避免把“实现已改”误当成“所有平台已验证”。

## 仍待修复的 P1

### 普通内容编辑者视角

| 编号 | 发现 | 影响与建议 |
|---|---|---|
| R1-P1-02 | “项目基线未加载”和 412 已有专属恢复文案，但其余加载/保存失败仍被粗略归并：404、无效 JSON、siteId 不匹配、权限/写盘失败对用户不够可区分。 | 面板应保留“不写盘 + 可导出”的安全默认，同时给出稳定错误类别和下一步；不能要求普通编辑者从网络面板猜原因。 |
| R1-P1-04 | localStorage 写入失败时只返回布尔值；浏览器禁用存储、配额满，或移动端切走/进程被杀导致 `beforeunload` 未触发时，草稿可能没有可靠落点。 | 首次失败即提供持续可见而非瞬时的“此浏览器无法保存草稿”提示，并突出一键导出；用禁用 localStorage/QuotaExceeded fixture 验证。 |
| R1-P1-05 | `siteId` 默认来自 hostname，storage key 只含 siteId；同一 origin/端口下两个未显式配置的项目可能共用草稿。CLI init 的默认 siteId 又来自目录名。 | 开发者应被要求显式设置 siteId，或默认命名空间加入稳定的项目/路径标识；检测内容、会话和客户端 siteId 不一致并阻止保存。 |
| R1-P1-06 | reduced-motion 和首步导航已修，但可访问性仍只有 happy-dom/静态证据。每次 debounce 的“draft saved”可能频繁播报；自定义颜色无对比度校验。 | 在真实浏览器中验证 NVDA/VoiceOver、200% 缩放、360px、仅键盘、中文 IME、paste/undo 和 prefers-reduced-motion；把高频保存状态降噪。 |
| R1-P1-07 | 手工 paste 处理与 contenteditable 的撤销栈没有真实浏览器测试。 | “可以粘贴并撤销”已写入可用性要求，应在 Chromium/Firefox/Safari 验证 Ctrl/Cmd+Z 不丢历史；失败时改用浏览器支持的纯文本插入路径。 |

### 网站开发者视角

| 编号 | 发现 | 影响与建议 |
|---|---|---|
| R1-P1-08 | tarball 已纳入 docs、demo、Skill、中文 README 和社交图，但 `package.json` 仍没有真实 `repository`/`homepage`/`bugs`，README 的 Skill 命令仍等待实际 owner。 | npm 页面和相对链接必须以正式仓库元数据验证；发布前从 `npm pack` 的干净目录安装并逐个打开 README/Skill/安全入口。 |
| R1-P1-13 | 安全模型正确指出同源第三方脚本/XSS 能取 token 并保存，但快速开始没有在运行 `serve` 前突出这一限制。 | 在 CLI 启动输出和 README 快速开始附近提示：编辑会话中不要加载不受信任的第三方脚本；这是 CSRF token，不是站内权限系统。 |

### AI 编码代理视角

| 编号 | 发现 | 影响与建议 |
|---|---|---|
| R1-P1-15 | JSON Schema 允许任意非空 240 字符字段名，显式 DOM ID 发现器只接受 `[a-zA-Z0-9][a-zA-Z0-9._:-]*`；自动 ID 又使用另一种语法。 | 代理按 schema 生成的“合法”显式 ID 可能永远匹配不到 DOM。用 schema 的 `oneOf` 或文档清楚区分 semantic ID 与 `auto:` ID，并在 doctor/CLI 统一验证。 |

## P2 完成度问题

- 面板部分辅助文字只有约 10–12px；最小化按钮会变更标签但没有自身展开状态语义。应结合 200% 缩放和触摸目标一起校正。
- README 的 Demo 链接仍只是仓库目录而非可立即操作的部署地址；在没有托管 demo 时，应把“打开 demo”和“查看源码”分成两个准确动作。
- public schema、CLI、浏览器的限制值虽大体一致，但常量散落在多处；应从单一契约生成或加入 parity 测试，防止后续漂移。
- 参数/命令类 CLI JSON 错误已有稳定 code，但部分文件/端口/内容异常仍会落到宽泛的 `unexpected-error`；第二轮可补齐而无需阻塞本轮。
- 服务端仍接受调用者显式发送的 `If-Match: *`；内置客户端不再使用它。若保留，应持续作为受信本地调用者的明确越权边界记录，而非普通恢复建议。

## 文案诚实性检查

| 当前说法 | 判断 | 建议 |
|---|---|---|
| “UI 只在 HTTP 200 后确认磁盘成功” | 基本真实 | 保留；同时补充“HTTP 200 只证明本地服务接受写入，不代表已提交版本控制”。 |
| “HTML 是回退，非法导入不会破坏它” | 与当前实现一致 | 保留，并继续以 plain-text/textContent 测试守住。 |
| “Import is … size-limited” | 当前真实 | 文件选择在读取前按 2 MB 拒绝，字符串/API 导入在解析/替换前检查总字节；保留回归测试。 |
| “doctor --strict 会显露自动 ID 风险” | 当前实现与承诺一致 | 已覆盖零显式字段和显式/未标记混合页；继续用 fixture 防止静态启发式与浏览器发现规则漂移。 |
| “浏览器/项目逐字段三方合并” | 当前实现与文档一致 | 保留基线、独立字段合并、同字段保留浏览器稿并阻止写盘的准确边界。 |
| “ETag 阻止一个写者静默覆盖另一个” | 有条件成立 | 写清单进程/同一服务实例、有效基线 ETag、未使用 `*` 的边界。 |
| “framework-agnostic” | README 后文已有合理限定 | 保留限定：DOM 必须稳定，框架重渲染后 refresh，Shadow DOM/属性/富文本不在 0.1 范围。 |
| “tested 0.1.0 release candidate” | 作为 pre-release 描述基本成立 | P0 已清零；正式发布公告前仍需完成干净 tarball、真实浏览器与跨平台第二轮验收。 |

## 三种使用者的当前旅程判断

### 1. 普通内容编辑者

理想旅程是“打开真实页面 → 改字 → 看见草稿已保存 → 明确选择保存项目/导出 → 可撤销或重置”。项目基线失败现在会安全阻止写盘，412 也有专属恢复提示；正常与关键失败路径已具备可信基础。剩余风险集中在 localStorage 失败、其他错误分类和真实浏览器 paste/undo/屏幕阅读器验证。因此当前结论是：**可进入受控试用，第二轮前不应把未验证的无障碍与草稿耐久性当成已完成。**

### 2. 网站开发者

理想旅程是“安装 → 标字段 → strict doctor → 本地 serve → 审查 JSON diff → 构建/应用 → 移除运行时”。strict 混合页门禁、文档同步、敏感路径检查和 `apply` 全量预检/回滚已经补齐；主要剩余问题是正式仓库元数据、npm 页面链接与跨平台干净安装。因此当前结论是：**源码与本地 demo 已可评估，npm 分发体验仍需第二轮。**

### 3. AI 编码代理

理想旅程是“读取 AGENTS/Skill/schema → 生成最小标记 → dry-run → 解析 JSON 诊断 → 只在门禁通过后写入”。未知/缺值 flag 现在 fail closed，`--dryrun` 回归也证明拼写错误不会写盘；剩余缺口是顶层 CLI 稳定错误码、schema/显式 ID 语法一致性和 tarball 中的代理材料。因此当前结论是：**关键写入协议已转为 fail closed，完整机器契约仍待第二轮收口。**

## 必须补齐的测试矩阵

| 层级 | 必测场景 | 通过条件 |
|---|---|---|
| 初始化/合并 | 项目慢加载前输入与 Save；content 404/无效/site 不匹配但 session 成功；旧版草稿迁移；浏览器/项目不同字段；同字段冲突；删除字段与删除页面 | 不丢未加载字段；无项目基线时不 PUT；冲突可导出且不覆盖磁盘；基线和 ETag 持久化正确 |
| SPA | 两路由不同 pageId；同一 fieldId 但不同源默认值；路由切换后 edit/reset/save；路由 DOM 被框架重建 | 写入正确页面；reset 恢复当前路由源文案；无旧元素监听器泄漏 |
| 本地草稿 | localStorage 禁用、QuotaExceeded、损坏 JSON、多个项目同 origin、关闭前 debounce | 给出持久且可恢复提示；项目间不串稿；导出始终可用 |
| 输入与可访问性 | 键盘全流程、IME Enter、纯文本 paste、Undo/Redo、Ctrl/Cmd+S、屏幕阅读器状态、reduced motion、200% 缩放、360px、浅/深/自定义颜色 | 无键盘陷阱；状态不刷屏；撤销可靠；焦点可见；无强制动画；文字/控件不遮挡且对比可读 |
| CLI 参数 | 每个命令的未知 flag、拼写错误、缺值、重复冲突 flag、`--version`/`version`、JSON/文本错误 | 全部 fail closed；危险命令无写入；退出码和稳定 code 可预测 |
| doctor | 零显式字段；显式+未标记混合；duplicate；nested；SVG text；CSS content；无 HTML；runtime 缺失 | strict 覆盖浏览器真实发现风险；诊断带文件/字段/code；假绿 fixture 不再通过 |
| serve 安全 | 项目根/`.env`/`.git`/key/map/db、编码路径、dot segment、symlink、traversal、Host、Origin、token、body、schema、siteId、stale ETag、`*`、并发写、备份 | 不越界、不泄露、不接受无基线覆盖；错误不含堆栈；成功写有可恢复备份和正确 ETag |
| apply | 真 dry-run、`--dryrun` 拼错、unmatched、重复 ID、数字后缀 ID、HTML 转义、多文件中途失败、备份失败 | dry-run/错误绝不写盘；要么全部成功，要么明确回滚；结果可机器解析 |
| 安装包 | `npm pack` 后在空目录安装；ESM、types、IIFE、bin、schema；README 图片/链接；Skill 安装；卸载 | 不依赖仓库工作树；所有承诺入口可达；删除初始化和包后网站恢复原状 |
| 平台/浏览器 | Node 20/22/24；Windows/macOS/Linux；Chrome/Edge/Firefox/Safari；至少 NVDA + VoiceOver | 核心旅程和错误恢复一致；差异被文档记录而非静默失败 |
| 框架 | 静态 HTML、Vite、React、Vue、Svelte 的构建产物；hydrate、route refresh、生产排除 | 不与框架重渲染争夺状态；集成/移除步骤可复制；生产暴露符合文档 |

## 两轮用户验收清单

### 第一轮：核心任务与风险清零

本轮由维护者使用当前仓库完成，重点不是视觉润色，而是行为正确。以下勾选反映当前检查点，不代表第二轮项目已完成。

- [x] 第一轮发现的全部 P0 已关闭，并有对应自动化或静态证据。
- [x] 初始化/三方合并、无项目基线不 PUT、路由默认值、CLI fail-closed、doctor 混合页检测已完成。
- [x] README、架构与安全模型已同步基线、三方合并、保存门禁、动态 pageId 和路径控制。
- [ ] 任意加载/保存失败都告诉编辑者“草稿在哪里、磁盘是否写入、下一步是什么”。
- [x] `npm run check` 在当前工作树完整通过，日志无未解释警告；干净 checkout 仍属于第二轮。
- [x] demo 不含真实可点击的 `OWNER` 占位链接，strict doctor 为 39 个显式字段、0 警告。
- [ ] 普通编辑者能完成编辑、保存、导出、冲突恢复、重置，不需要读源码。
- [ ] 开发者能完成 init、strict doctor、serve、审查 diff、apply dry-run 与移除。
- [x] 已覆盖 `apply --dryrun` 拼错时非零退出且 HTML 不变；未知 CLI flag fail closed。

### 第二轮：从陌生使用者的干净环境重新审视

第二轮必须使用新目录/新浏览器配置，不沿用维护者缓存、全局链接或仓库知识；最好由未参与实现的人执行。

- [ ] 内容编辑者只看页面提示，在 10 分钟内改 5 个字段、刷新确认、导出、保存项目，并能说清“草稿”和“项目文件”的区别。
- [ ] 人为让 content GET 失败、localStorage 失败、ETag 冲突；使用者都能恢复文案，磁盘文件没有被空白/局部数据覆盖。
- [ ] 网站开发者只看 npm 页面和 README，在空项目完成安装、语义标记、demo/serve、版本控制 diff 和完整卸载；所有链接可打开。
- [ ] AI 代理只获得仓库 URL（再单独以 tarball 测一次），能找到 AGENTS/Skill/schema，输出 dry-run 与结构化诊断，不越过明确的人工确认点。
- [ ] 在 360px、200% 缩放、键盘、NVDA/VoiceOver、reduced-motion 下完成同一核心旅程。
- [ ] 在至少一个 React/Vue/Svelte 路由样例中切换页面、重置同名字段并保存，未出现跨页文案。
- [ ] 在 Windows、macOS、Linux 的受支持 Node 版本中完成 pack/install/bin 测试。
- [ ] 最后从收到开发信、点击工作室/项目署名链接的潜在客户视角复读：首页和 README 不夸大、不制造权限或云同步错觉，仓库链接、作者身份、许可证、安全边界和维护入口都真实可达。

## 第一轮最终判断

第一轮已经完成：剩余 P0 为 0，公开承诺与关键状态机已同步，CLI/doctor 对已知危险输入 fail closed，`npm run check` 全绿。项目已具备上传 GitHub 供审阅的 release-candidate 基础。

下一步不应继续扩张功能，而应把第二轮集中在陌生使用者的干净安装、真实浏览器无障碍、草稿存储失败、正式仓库元数据和跨平台/框架验证。完成这些门禁后，再把 CopyWeave 作为“有人味、可复用、对人和 AI 都诚实”的稳定开源包对外公告。
