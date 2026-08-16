# CopyWeave 第一轮修改记录

日期：2026-08-11  
对应审计：[round-1-audit.md](./round-1-audit.md)

## 目标

第一轮把“页面文字可编辑”从演示功能收紧为不会谎报保存、不会因初始化或并发覆盖文案、不会把本机项目根误当公共静态目录的可审查工具。修改坚持三个约束：现有设计不变、失败时保留可恢复副本、机器诊断与人类提示表达同一事实。

## 已完成修改

| 范围 | 修改 | 验证证据 |
|---|---|---|
| 初始化与并发 | 浏览器草稿保存项目基线与 ETag；逐字段三方合并；同字段冲突阻止写盘；项目加载前的输入作为增量重放。 | schema/editor 回归覆盖独立字段、同字段、慢加载、无基线不 PUT。 |
| SPA | `pageId` 函数在 `refresh()` 时重算；源默认值以页面与字段二元组隔离。 | 两条路由及同名字段测试。 |
| 保存真实性 | 浏览器不发送 `If-Match: *`；项目基线未成功载入时禁止 PUT；HTTP 200 后才声称项目写盘成功。 | 真实 HTTP token/ETag/412 测试与双标签浏览器验证。 |
| 浏览器存储 | localStorage 失败成为持续 `browser-storage-unavailable` 诊断；此后不再显示“草稿安全”；项目写盘成功但浏览器写入失败时显示独立状态。 | QuotaExceeded 回归与“仅项目成功”回归。 |
| 错误恢复 | 项目文件缺失、JSON 损坏、`siteId` 不符、网络失败、会话拒绝、内容拒绝和服务端写盘失败具有不同下一步。 | 404/无效 JSON/错误响应测试；所有分支保留 Export。 |
| 命名空间 | 省略稳定 `siteId` 时产生 `implicit-site-id` 警告；README 与 Skill 要求项目专属值。 | editor 诊断测试。 |
| CLI 参数 | 未知、重复、拼错、缺值或错类型参数 fail closed；危险命令不会因 `--dryrun` 拼错而写文件；错误有稳定 code。 | CLI 回归。 |
| doctor | 严格模式识别显式字段与未标记可见文案混用，不再只检查“零字段页面”。 | 混合页面 fixture；demo 为 39 个显式字段、0 警告。 |
| apply | 先为全部文件预检；unmatched/duplicate 时零写入；写入失败尽力回滚；数字后缀语义 ID 可用。 | 多文件预检、备份、数字后缀测试。 |
| 本机静态服务 | 默认拒绝明显项目根；阻止 dotfile、仓库、依赖、锁文件、source map、常见密钥；同时检查 Windows 分隔符与 realpath 后 canonical 目标。 | 编码反斜杠、敏感文件与越界 HTTP 测试。 |
| 信任边界 | `serve` 启动结果明确提示：同源脚本和 service worker 可以使用本机编辑会话。 | CLI 启动输出断言；README 快速开始同处提示。 |
| 面板可用性 | 最小触控尺寸提升到 44px；核心小字提升；收起按钮具有 `aria-controls`/`aria-expanded`；状态区 `aria-atomic`。 | 类型/单元检查与真实桌面、390px 浏览器检查。 |
| 文档与分发 | README/中文 README、架构、安全、集成与可用性文档同步；npm 包包含 demo/docs/Skill；增加相对链接检查与干净 tarball 安装检查。 | `docs:check`、`pack:check`、`install:check`。 |

## 第一轮稳定检查点

在新增恢复状态后，当前检查点为：

- TypeScript 类型检查通过。
- 28/28 自动化测试通过。
- ESM 与 IIFE 构建成功。
- strict doctor：39 个显式字段、0 错误、0 警告。
- README/Skill 本地链接检查通过。
- npm tarball 可在空临时目录安装；ESM、类型、IIFE、CLI、schema 与 Skill 均存在，安装后的 CLI doctor 通过。

## 留给第二轮的真实边界

- 尚未取得正式 GitHub owner、仓库 URL、安全联系人或 npm 发布身份，因此不伪造 `repository`、`homepage`、`bugs` 元数据，也不执行公开发布。
- NVDA、VoiceOver、Safari 与真实 React/Vue/Svelte 工程仍需社区/发布前矩阵补充；当前不宣称 WCAG 或全框架认证。
- CopyWeave 仍是本机单写者工具，不是远程协作 CMS；同源脚本与既存 service worker 属于信任边界。

