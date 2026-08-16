# CopyWeave 第二轮陌生用户审计

日期：2026-08-11；最终证据边界更新：2026-08-12（Asia/Shanghai）  
角色：第一次接触 CopyWeave 的内容编辑者兼前端开发者  
环境：Windows NT 10.0.26200、Node `v24.13.1`、npm `11.8.0`  
目标视口：桌面 `1440 × 900`；移动 `360 × 800` 与 `390 × 844`

## 最终结论

CopyWeave 的核心编辑模型在 **pre-freeze candidate** 的 root browser evidence 中表现可信：浏览器草稿、项目文件与同字段冲突不会互相冒充，保存失败不会被写成成功，390px 面板和正常模式边界清楚。该证据对应 SHA256 `524913BC2EB991496D3694F632D73B8FE9E37E43D8D1106BD2D5E552CDAA8115`，**不属于当前 bundle**。

最终冻结候选于 2026-08-12 重建；本审计实际核对到：

- `dist/copyweave.iife.js` 与 `demo/assets/copyweave.iife.js` 当前 SHA256 均为 `E66F23621C5B3EDDDC50F8816E176A186D67AB2F68980B3BA294FD5FF808F284`。
- 当前 hash 没有新的 Browser 运行、截图或 4186 响应证据；报告不会把 `5249…` 的浏览器结果改写成 `E66F…` 已通过。
- 当前变更包括：`setProjectConflict()` 立即刷新 persistence（新增 stale 回归）；CLI 原子临时文件使用独占创建 `O_EXCL`/`flag: "wx"`，并更新检查脚本与文档。
- 当前继承的冻结证据为 `npm run check` exit 0、`46/46` tests；它支持新的 stale persistence 断言，但不代替当前 hash 的浏览器复验。
- 当前仍保留四个人工缺口：360px、`Source copy only`、实际下载文件、真实 Chrome/Edge 键盘。

本用户审计独立发现的 P0 为 0。当前仍有 2 个 P1：

1. npm registry 尚无公开 `copyweave`，2026-08-11 15:25 的查询仍失败；README 已诚实标为发布后路径，但公开安装仍是发布门禁。
2. 真实 Chrome/Edge 实体键盘的完整 Tab 顺序仍未闭环；已有合成 Tab 工具本身在普通链接上也不前进，不能据此判定产品通过或失败。

当前未关闭的产品 P2 为 0。另有三个**非产品缺陷的发布证据缺口**：当前 hash 的 360px 视口与 `Source copy only` 状态尚未实测；Export 文件本体也仍未被浏览器后端观测到。其余 UI 结果仅能称 pre-freeze candidate evidence。

## 审计顺序与证据边界

第一次审计严格先按 [README](../../README.md) 和页面提示操作，再读文档与源码：

1. 在全新临时目录执行公开安装。
2. 用隔离的临时 content JSON 启动 demo。
3. 访问普通 URL 与 `?copyweave`。
4. 编辑、等待 browser draft、刷新、`Ctrl+S`、项目保存、Export、双标签 stale/same-field conflict。
5. 检查桌面、360px、焦点、键盘与 reduced-motion 可静态或浏览器验证的部分。
6. 最后读取 [USABILITY](../USABILITY.md)、[INTEGRATION](../INTEGRATION.md)、[ARCHITECTURE](../ARCHITECTURE.md)、[SECURITY-MODEL](../SECURITY-MODEL.md)、源码和测试。

14:26 的 `5249…` pre-freeze candidate 跟进复测遵守截图优先规则。根代理实际检查了移动冲突截图，确认排版无溢出；本报告将其记录为 **pre-freeze root browser evidence**。当前 `E66F…` 没有 Browser 复测，旧截图不用于填补当前 hash、360px 或 source-only 缺口。

这不是完整可访问性审计，也不声称符合 WCAG。屏幕阅读器、200%/400% 缩放、真实 IME、Safari/Firefox、实体键盘和系统级 reduced-motion 没有完整执行。

## 当前 `E66F…` 与 pre-freeze `5249…` 证据矩阵

| 步骤 | 当前健康度 | 证据与边界 |
|---|---|---|
| 1. 当前 bundle 身份 | 通过（亲测） | 两份仓库 IIFE 均匹配 `E66F…`；没有当前 hash 的服务响应或 Browser 证据。 |
| 2. 360px 无 query | 缺口 | `E66F…` 与 `5249…` 均未执行最终 360px 矩阵；不能继承 05:41 的早期源码截图。 |
| 3. 390px 无 query | pre-freeze 通过；当前未复测 | `5249…`：host hidden/`display:none`，无 launcher、无 contenteditable、无横向溢出。 |
| 4. 390px query 面板边界 | pre-freeze 通过；当前未复测 | `5249…`：panel 约 `x=8..367.11`，位于 `clientWidth=375` 内；无横向溢出，控件约 44px。 |
| 5. `Overrides / Editable` | pre-freeze 通过；当前未复测 | `5249…`：编辑后显示 `Overrides 1 / 38`。 |
| 6. Storage state：source | 缺口 | 未在 `5249…` 或 `E66F…` 观察 `Source copy only`。 |
| 7. Storage state：browser | pre-freeze 通过；当前未复测 | `5249…`：编辑后为 `Browser draft only` 和 `Draft saved in this browser`。 |
| 8. Storage state：project | pre-freeze 通过；当前未复测 | `5249…`：Save/刷新重开后持续为 `Matches project file`。 |
| 9. Storage state：conflict | pre-freeze Browser 通过；当前仅自动 | `5249…`：stale save 被拒并持久显示冲突；`E66F…`：新增测试断言 `setProjectConflict()` 立即刷新 persistence。 |
| 10. Export | pre-freeze UI 通过；文件未证实 | `5249…`：显示 download requested；未观察到 blob download event。`E66F…` 未浏览器复测。 |
| 11. 正常模式无视觉变化 | pre-freeze 通过；当前未复测 | `5249…`：桌面/390px 无 query 无 chrome/contenteditable/横溢出，Done 后 contenteditable=0。 |
| 12. 删除流程可发现性 | 通过（静态亲测） | README 与 INTEGRATION 均有明确安全移除章节，且说明 `destroy()` 不是卸载。 |

## P1

### P1-01 — registry 快速开始当前不能真实开始

**证据（真实执行）**

- 初次在全新临时目录执行 `npm install copyweave --no-audit --no-fund`，registry 返回 E404。
- 2026-08-11 15:25 再次查询 `copyweave` 仍失败。
- README 顶部已明确这是尚未发布的 `0.1.0` RC，并把标题写成 `Three-minute start (after npm publication)`。因此文档是诚实的，未完成的是公开发布本身。

**建议**

把 registry 发布、名称所有权和从 registry 进行的全新消费者安装设为发布硬门禁。tarball/install-check 证明包结构，不证明公开 registry 已可用。

### P1-02 — 键盘主路径缺少可信的真实浏览器证据

**证据（早期浏览器执行 + 静态核对）**

- `Ctrl+S`、Enter、打开后进入 `Done`、关闭后返回 launcher，以及可见焦点样式，在早期源码 bundle 上通过。
- 合成 Tab/Shift+Tab 没有从 `Done` 或字段前进；但同一工具从普通页面链接发送 Tab 也保持原焦点，说明该现象不能归因于 CopyWeave。
- 源码使用原生按钮且没有显式 Tab trap；现有自动测试没有完整 pointer-free 顺序。

**建议**

用真实 Chrome/Edge 实体键盘验证：
`launcher → Done/minimize → Previous/Next → Save/Export/Import/Reset → Done → launcher`。只有真实浏览器仍停留时，才把它升级为产品焦点 bug。

## 已关闭的问题

### R1（原 P1）— 360px 无 query 泄露 launcher

- 初始真实浏览器证据：`host.hidden === true`，但移动媒体查询使 computed `display:block`，仍显示 launcher。
- 源码加入 `:host([hidden]) { display:none!important; }` 后，05:41 的隔离源码 bundle 在 360px 无 query 重载通过。
- **证据边界：`5249…` 的 390px/桌面无 query 由 pre-freeze root browser evidence 通过；`E66F…` 未浏览器复测，360px 仍是明确缺口。**

### R2（原 P1）— browser/project/conflict 保存来源不持续

- 面板已增加 `Storage state`，区分 `Source copy only`、`Browser draft only`、`Matches project file` 和 `Conflict · export before resolving`；`Changed` 改为 `Overrides / Editable`。
- 早期源码 bundle 实际验证过 browser draft、项目保存、刷新后 project state 与冲突状态。
- **证据边界：`5249…` 已验证 browser/project/conflict 与刷新持久性；`E66F…` 只继承新增 stale persistence 自动断言，未实测 Browser；`Source copy only` 始终未实测。**

### R3（原 P2）— Export 无反馈

- 初始 bundle 点击后状态不变，且两次没有观察到 download event。
- 新文案只诚实声称 `JSON download requested`，不冒充下载完成；早期源码 bundle 已观察到该反馈。
- **证据边界：`5249…` 的 UI 反馈由 pre-freeze root browser evidence 验证；`E66F…` 未浏览器复测。Browser backend 未观察到 blob download event，下载文件本体仍未证实。**

### R4（原 P2）— 冲突视觉层级过弱

- 新状态 `Conflict · export before resolving` 明确表达写盘被阻止和恢复动作。
- pre-freeze root browser evidence 已在 `5249…` 复现双标签同字段冲突；stale save 被拒，重开面板后冲突状态持续存在并建议先 export。移动冲突截图已目视检查，排版无溢出。
- 当前 `E66F…` 的 `setProjectConflict()` 会立即调用 persistence 更新；新增 stale 回归直接检查冲突状态，不必关掉再重开。该项为源码/自动证据，不是当前 hash 的浏览器实测。

### R5（原 P2）— `npm run dev -- --port` 忽略端口

- 初次真实执行时仍尝试硬编码 4176。
- `scripts/dev.mjs` 已静态核对为转发 CLI 参数；最终运行回归继承发布检查，不在本轮浏览器证据内。

### R6（原 P1）— 安全卸载流程不可发现

- README 现在有 `Remove it without losing the final words`，明确 `editor.destroy()` 只是当前页 teardown。
- [INTEGRATION](../INTEGRATION.md#safe-removal) 有 `Safe removal`，顺序包含：把最终文案放回真实 source → 无 query/无 runtime 验证 → 移除 controller/server → `npm uninstall copyweave` → 最后才清理 JSON、draft 和 backup。
- 可恢复副本被要求保留到 source-only 产物通过，状态诚实且路径可发现。静态关闭。

### R7（原 P2）— Node 20+ 前置条件过远

- `Prerequisite: Node.js 20 or newer.` 现在紧邻快速安装命令。静态关闭。

### R8（原 P2）— README Quick start 锚点失效

- 顶部链接已更新为 `#three-minute-start-after-npm-publication`，与标题一致。静态关闭。

## Pre-freeze candidate `5249…` 的 root browser evidence

以下是根代理在当时的 4186 隔离服务、SHA256 `524913BC2EB991496D3694F632D73B8FE9E37E43D8D1106BD2D5E552CDAA8115` 上实际执行并回传的 Browser 证据；不是本子任务继承更早截图作出的推断，也不是当前 `E66F…` 的证据：

1. **正常模式 — 通过。** 桌面与 390px 无 query：host hidden 且 computed `display:none`，无 launcher、无 contenteditable、无横向溢出。
2. **390px query 面板 — 通过。** launcher 可见；panel `x=8..367.11`，位于 `clientWidth=375` 内，`scrollWidth=clientWidth=375`；控件约 44px，移动冲突截图目视无溢出。
3. **编辑与 browser draft — 通过。** 编辑 `hero.title.line1` 后 `Overrides 1 / 38`，Storage state 为 `Browser draft only`，状态为 `Draft saved in this browser`。
4. **项目保存与刷新 — 通过。** Save 后显示 `Matches project file` 与 project+browser 成功反馈；刷新、重开面板后内容和 `Matches project file` 均持续。
5. **双标签冲突 — 通过。** 同字段 stale save 被拒；重开面板后仍为 `Conflict · export before resolving`，说明建议先 export，未把冲突冒充已写盘。
6. **退出编辑 — 通过。** Done 后 contenteditable 数量回到 0。
7. **Export 反馈 — UI 通过、文件未证实。** 点击后只显示 download requested；Browser backend 未观察到 blob download event。
8. **审计文案清理 — 通过。** 测试文案已恢复为 `Edit the words.`，并写回隔离临时 content；没有写入仓库 demo。

根代理随后按 Browser 流程 reset 并 finalize。该候选没有在 finalize 前补跑 360px 或 `Source copy only`；当前重建的 `E66F…` 也没有新的 Browser 运行。

## 早期真实浏览器执行记录（非最终 bundle）

- 普通 URL、`?copyweave`、桌面与 360px。
- 编辑、debounced browser draft、刷新、点击保存、`Ctrl+S`、临时项目 JSON 与 backup。
- 双标签 stale ETag、same-field conflict、刷新、再保存和浏览器句子保留。
- Export 无事件的初始行为与新增请求反馈。
- 打开/返回焦点、Enter、Tab/Shift+Tab 对照。
- 最新源码临时 bundle 的移动隐藏、面板边界、browser/project/conflict 状态和桌面视觉。

这些结果支持实现方向，但时间早于 `5249…`，更不能提升为当前 `E66F…` 发布验收。

## 继承的自动测试

以下结果由发布主审提供，本用户审计没有独立重跑：

- 当前 `E66F…`：`npm run check` exit 0。
- `46/46` tests 通过。
- docs check：52 links。
- Skill check：110 lines、6 refs。
- pack：99 files、855509 bytes。
- install check：pass。
- audits：0。

以上数字明确属于当前 hash，但自动断言不能替代真实浏览器观察，尤其是 360px、`Source copy only`、实际下载文件和真实键盘。

## 当前 `E66F…` 的亲测/静态核对

- dist/demo IIFE 文件 SHA256 均为 `E66F…`；未启动服务或浏览器。
- `setProjectConflict()` 设置冲突后立即更新 persistence；新增 stale test 检查冲突文本。
- CLI 原子临时文件用 `flag: "wx"` 独占创建（对应 `O_EXCL` 语义）；检查脚本与安全文档已同步。未在本用户审计中动态重跑 CLI。
- reduced-motion CSS 与 `matchMedia` 分支。
- `destroy()` 的 teardown 范围。
- README/INTEGRATION 的安全移除、Node 前置条件和导航锚点。
- `scripts/dev.mjs` 参数转发。

## 无法验证

- 当前 `E66F…` 的全部 Browser 旅程；`5249…` 结果只能作为 pre-freeze candidate evidence。
- 当前 hash 的 360px 无 query 与 query 面板。
- 当前 hash 的 `Source copy only` Storage state。
- Export 下载文件的内容、文件名和权限拦截。
- registry 发布后的真实消费者安装与 `npx copyweave`。
- Chrome/Edge 实体键盘 Tab 顺序、Safari、Firefox、屏幕阅读器。
- 真实中文/日文 IME、Undo/Redo、200%/400% zoom。
- 系统级 reduced-motion 运行时效果。
- browser storage quota/private-mode 的真实浏览器体验。
- 完整无障碍符合性；本报告不作此声明。

## 发布前下一步

若要把当前 `E66F…` 称为浏览器验收过，必须在该 hash 上重新跑最小矩阵；至少保存 360px 无 query/query 截图，并用无 overrides 的隔离 content 观察 `Source copy only`。Export 文件本体若要关闭，也需在能观察 blob/download 的浏览器中核对文件名和 JSON 内容；真实键盘 Tab 顺序仍需实体 Chrome/Edge。不要把 pre-freeze UI 或当前自动测试写成当前文件已落盘。
