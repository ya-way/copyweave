# CopyWeave 第二轮修改记录

日期：2026-08-12（Asia/Shanghai）  
用户视角审计：[round-2-user-audit.md](./round-2-user-audit.md)  
发布视角审计：[round-2-release-audit.md](./round-2-release-audit.md)

## 目标

第二轮不再以“功能能运行”为验收，而是分别站在第一次收到编辑链接的写作者、第一次安装包的开发者，以及只读公开 Skill 的编码代理视角，确认每个成功、失败、保存和恢复状态都可以被准确理解。修改优先级依次为：不丢文案、不谎报写盘、不暴露恢复材料、不开启隐蔽写入路径，最后才是包装和传播。

## 用户视角修改

| 发现 | 已完成修改 | 证据 |
|---|---|---|
| 普通移动页面仍可能显示编辑入口 | 新增 `:host([hidden])` 强制隐藏规则；无 query 时不出现 launcher 或可编辑状态。 | 当前候选在桌面与 390px 的内置 Browser 复验；面板无横向溢出。 |
| `Changed` 容易被理解为“尚未保存” | 改为 **Overrides / Editable**，只表达相对源码的覆盖数量。 | 面板单元测试与真实编辑复验。 |
| 浏览器草稿与项目写盘刷新后看起来相同 | 增加持续可见的 **Storage state**：source、browser draft、project synced、unavailable、invalid draft、conflict。瞬时提示不再覆盖来源状态。 | source 状态自动测试；browser/project/conflict 真实复验。 |
| 相同 page 内容因 JSON 键插入顺序不同被误判为不同 | 页面/字段改为 own-key/value 语义比较，不再依赖 `JSON.stringify` 顺序。 | 反序 page/field 回归同时覆盖相同与真实差异。 |
| ETag 冲突发生后持久状态更新不够及时 | `setProjectConflict()` 现在立即刷新持久状态，不必关掉再重开面板才看到 Conflict。 | stale ETag 回归直接检查 `data-persistence`。 |
| Export 没有可观察反馈 | 文案只声明“已请求下载”，并提示检查下载目录与权限，不再暗示浏览器一定完成文件写入。 | 单元测试与真实 UI 复验；下载文件本体仍明确列为未在内置 Browser 后端证实。 |
| 360px 面板曾左侧溢出、触控目标偏小 | 面板固定安全边距，移动控件最小 44px；隐藏规则独立于媒体查询。 | 早期 360px 修复复验、最终候选 390px 边界复验；最终 bundle 的 360px 仍列发布前补测项。 |
| 损坏的 localStorage 草稿会被新项目内容静默覆盖 | 保留原始字符串、暂停自动保存、提供 raw recovery 导出；显式 Save/import/reset 先归档到时间戳 recovery key 后才替换。 | invalid draft 回归覆盖原 key、recovery key 和新内容。 |
| 超长输入可能让整份草稿被无效克隆清空 | 单字段在写入 store 前执行 100,000 字符上限；失败时恢复前值并保留其他覆盖。`cloneStore()` 对无效输入抛错而不是回退空 store。 | 超长字段保留另一字段的回归。 |

## 数据完整性与安全修改

| 发现 | 已完成修改 | 证据 |
|---|---|---|
| `constructor`、`__proto__` 等可被字段/site/page ID 接受，随后在规范化时丢失 | site/page/field 使用统一安全键规则；危险键 fail closed。容器改为 null-prototype，并用 own-property 读取，`toString` 等普通原型同名字段仍安全可用。 | schema、field、editor 与 doctor 回归。 |
| 显式字段绕过默认/custom exclude，nested synthetic ID 可覆盖同名显式叶子 | 显式与自动发现现在共用 exclude 规则；synthetic key 预先避让全部声明 ID，并报告 duplicate，而不是由 DOM 顺序决定绑定。 | code/SVG/custom exclude 与两种 DOM 顺序回归。 |
| runtime、CLI 与 JSON Schema 对时间戳、字段总量和危险键描述不同 | 三处统一 100 页、5,000 总字段、240 字符键、100,000 字符值、有效时间戳和危险键规则；Schema 以扩展注释公开跨页总量约束。 | schema 测试、clean install schema 读取、架构/Skill 同步。 |
| `Date.parse` 接受不存在日期，JS 与 Schema 对 emoji 长度计数不同 | 增加日历级 RFC 3339 组件校验；键和值统一以 Unicode code point 计数，与 JSON Schema `maxLength` 一致。 | 非闰年 2 月 29 日与 100,000/100,001 emoji 边界回归。 |
| 项目 JSON 未成功读取时仍可能拿 session ETag 覆盖磁盘 | 项目 base 未成功加载时禁止 PUT；项目文件缺失、损坏、网络错误和 site mismatch 分别提示恢复动作。 | failed-content-load 与错误分支回归。 |
| HTML 全文件正则可把 script/comment/style/template 中的伪标签当字段并注入脚本 | `doctor` 与 `apply` 共用上下文扫描器，只返回真实、唯一、叶子纯文本 span；排除 raw/excluded context，替换值进行 HTML 文本转义。 | 伪标签、引号、反引号和 `</script>` payload 的 CLI 回归。 |
| `apply` 不核对 HTML 明示站点与内容文件，可能跨项目烘焙 | 当 `<html data-copyweave-site>` 存在时，必须唯一且与 store `siteId` 相同；不符加入 preflight unmatched，保证零 HTML 写入。 | cross-site dry-run 回归。 |
| 既有 `.backup` symlink/hardlink 可把备份写出目标 | 先读取源，再把快照写到同目录独占创建的随机临时文件，最后 rename 覆盖备份目录项；目标写入采用同一策略。 | `serve` 与 `apply` 都以外部 hard-link victim 验证未被修改。 |
| 恢复文件、Windows 反斜杠/ADS 或 canonical alias 可能绕过静态 denylist | 静态服务拒绝 recovery 扩展、冒号路径段、编码反斜杠；realpath 后对 canonical 相对路径再次检查。 | 真实 HTTP 403 回归。 |
| 临时写入文件只依赖随机名 | 随机同目录临时文件现在以 `wx` 独占创建，再原子替换，避免意外复用已存在目录项。 | CLI 全套写入与 hard-link 回归。 |
| 原子写入或 rename 失败会遗留含旧文案的隐藏 temp | 先取得独占 file handle；写入或 rename 任一失败都关闭 handle、删除 owned temp 再返回错误；原 HTML 保持不变。 | 把 backup 预建为目录的失败回归。 |

## 开发者与 AI 使用修改

| 发现 | 已完成修改 | 证据 |
|---|---|---|
| SPA 的函数式 `pageId` 只在构造时求值，且同名字段默认值跨页串用 | `refresh()` 每次重算 pageId；源码默认值按 `pageId + fieldId` 隔离。 | 两路由同名字段回归。 |
| CLI 拼错 flag 会 fail open | 每个命令使用显式 option schema；未知、重复、缺值与错类型参数在处理前失败。 | `--strcit`、重复 flag 与 `--dryrun` 回归。 |
| `INDEX.HTML` 被 walker 找到却又被 doctor 当作没有 HTML，根 pageId 也会漂移 | doctor 分支/统计与 `pageIdForHtml()` 都使用大小写不敏感判断；根页继续映射 `/`。 | uppercase HTML strict doctor + apply dry-run 回归。 |
| `.bak/.old/.orig` 的公开禁入承诺没有进入门禁 | Git ignore、npm pack 检查与 Pages artifact gate 统一拒绝全部 recovery 扩展和日志。 | 最终 pack/Pages workflow 静态检查。 |
| npm tarball 曾包含忽略的评测运行、backup，安装包内链接与 NodeNext 类型不完整 | `files` 精确 allowlist；pack/install 检查验证 ESM、CLI、IIFE、Schema、Skill 与 NodeNext declarations；backup/log/eval runs 均禁止进入包。 | `pack:check` 与 clean tarball `install:check`。 |
| 继承的 npm dry-run/pack-destination 会破坏嵌套检查，Windows shell 还产生 DEP0190 | 检查脚本清理这两个环境变量，直接由 Node 调用 npm CLI，不使用 `shell:true`。 | 带两项污染环境变量的 direct-node pack/install 回归，无警告。 |
| 未确定 owner 时仍可能误发 npm | `prepublishOnly` 强制 `release:check`；repository/homepage/bugs 缺失时 fail closed。GitHub release workflow 固定 Node 24、npm 11.5.1+、tag/version 与 OIDC provenance。 | 本地 `release:check` 预期以 `release-metadata-incomplete` 非零退出。 |
| README 的第一条安装路径在 npm 未发布时不可执行 | 首屏明确 0.1.0 RC 与 npm 可能 404；公开安装标为“发布后”，源码评估入口为 `npm ci && npm run check`，并把 Node 20+ 放在命令前。 | 文档链接检查与陌生用户审计。 |
| “可移除”没有安全步骤 | README 与 Integration 增加顺序化移除：先把最终文字写回 source、验证无 runtime，再卸载代码，最后才删除 JSON/draft/backup；明确 `destroy()` 不是 uninstall。 | 文档链接检查与用户审计。 |
| Skill 证据无法证明当前二进制 | Skill 增加独立 evaluation-evidence；AI eval 明确给出 15/16 分项、旧产物哈希和“不得认证当前 release”的边界；发布前要求重新绑定不可变 commit。 | Skill 本地检查与官方 quick validator。 |

## 包装与传播修改

- README 使用单一、可辨识的 Kinetic Editorial 社交预览，移动到不遮挡副标的位置；英文/中文版本都先说问题、三分钟路径、保存模型和诚实限制。
- `AGENTS.md`、`llms.txt`、稳定 JSON Schema、结构化 CLI code 与 `--json` 让代理不必猜 UI 文案。
- GitHub Actions 覆盖 Node 20/22/24 与 Windows/macOS/Linux；另有 package contract、Pages recovery-artifact gate、release provenance 工作流。
- `LAUNCH.md` 提供 D-7/D0/D+7 节奏、Show HN / Product Hunt / 中文社区 / Skill 模板、指标和响应手册；明确禁止协调 star、投票交换和把热度当质量证据。
- 不承诺 star 数量。可交付的保证是：可运行路径、透明限制、可复现测试、可追溯发布准备和真实问题响应。

## 最终证据与仍需 owner 完成的门禁

冻结后的最终命令、包文件数、哈希和结论已记录在 [round-2-release-audit.md](./round-2-release-audit.md)：

- `npm run check` 退出码为 0：46/46 自动化测试与类型检查通过。
- ESM/IIFE build、gzip size、strict demo doctor、52 个文档链接与 Skill 检查通过。
- npm 候选包含 99 个文件、unpacked size 855,509 bytes；clean tarball 安装能消费 ESM、CLI、IIFE、Schema、Skill 和 NodeNext 类型。
- 开发依赖与运行依赖审计均为 0 个已知漏洞；运行时依赖为 0。
- 官方 Skill quick validator 返回 `Skill is valid!`。
- 当前 IIFE SHA-256 为 `E66F23621C5B3EDDDC50F8816E176A186D67AB2F68980B3BA294FD5FF808F284`，demo 副本与 dist 完全一致。
- `release:check` 按设计阻止缺少真实 repository/homepage/bugs 的发布。

仍需仓库 owner 才能完成、因此没有伪造的项目：

1. 选择并创建真实 GitHub owner/repository，初始化 Git，生成可引用 commit。
2. 再次检查并实际取得 npm 名称；填入 repository/homepage/bugs 与所有发布模板 URL。
3. 在该 commit 上重跑 CI、当前 bundle 的 360px、source-only、实体键盘与下载文件检查。
4. 配置 npm Trusted Publishing、签署 release record，再发布 npm/GitHub/Skill。

没有这些外部身份与不可变 commit，当前成果是**可上传、可复验的发布候选包**，不是已经公开发布或已经获得社区采用的项目。
