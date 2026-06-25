# 清理 app shell mono 误用

## Goal

产品 app shell（Sidebar / Header / InputBar / home / account 等 `_app` 界面）大量用 `app-mono`（IBM Plex Mono 等宽体）渲染操作性 UI 正文——菜单 label、按钮、问候、卡片元信息等——与 `blueprint-aesthetic.md` 铁律「操作性 UI 默认走 Sarasa UI SC；技术性/读数性文字走 mono」冲突。这是早期 serif-first「工程纸」基调遗留，sans-first 改造时 app shell 的 mono 没跟着收。本任务把 app shell 的操作性文字回归 sans，mono 只保留给真读数（数字/百分比/单位/kbd）。

## 第二轮补漏（用户后续指出，本任务追加范围）

第一轮（commit d1acc93）清的是 `app-mono` 工具类。后续发现两处遗漏，本任务追加处理：

1. **/account 页面（`routes/_app/account.tsx`）**：第一轮误判为"无 app-mono"而跳过，实则它用 `style={{ fontFamily: MONO }}` 内联常量（18 处），全是中文操作性内容——保存/上传头像/解绑/登出等按钮、passkey 名输入框、GitHub 用户名、下拉框、空状态提示。按核心规则（中文 sans / 纯数字符号 mono）几乎全降 sans；其中输入框/下拉框文字按上个决定（输入框→sans）一并降 sans。account 内**无真数字读数**，无需保留 mono 处；本地 `Mono` 组件（:869）若清理后无引用则一并删，`MONO` 常量同理。

2. **落地页按钮（`routes/index.tsx`）— 扩边界决定**：用户推翻原 ADR「落地页不动」，**仅限 `lp-btn` 类按钮内的 `<Mono>` 文案**改 sans：Hero「开始入住」(531)、「查看演示」(535)、导航「开始入住」(376)、「看完整演示」(629)、房间卡「进入」(881)、FinalCTA「开始入住」(1014)。**其余 30+ 处 `<Mono>` 全部保留**（`// 功能`、`№001`、拼音注释、读数条、页脚等落地页工程美学）。即：只解除按钮文案的 mono，不碰标签/读数/装饰。

## What I already know

- mono 有两个来源，须区分：
  - **落地页/登录页**：`index.tsx` / `login.tsx` 用本地 `MONO` 常量——zed 式工程蓝图美学的刻意身份（**疑似 out of scope**，待确认）。
  - **产品 app shell**：`Sidebar` / `Header` / `InputBar` / `home` / `account` 用 `.app-mono` 工具类（`index.css:673` 定义为 IBM Plex Mono）——本任务目标。
- 上一任务（serif 收口，commit 27301a7）已确认 app shell 不含 serif；mono 是 app shell 唯一的字体纪律债。
- `.app-mono` 类定义保留（仍服务真读数）；本任务只清理**误用点**，不删类。

## 已对齐的边界规则（用户确认）

**核心规则（一句话）：中文一律 sans，纯数字/符号才 mono。** 按此规则判，不靠逐行清单。

**→ 改 sans（中文操作性文字，移除/不再用 app-mono）：**
- Sidebar.tsx:61/78/87 菜单项 label；:62「即将」状态徽标；:144 分区标题（NAVIGATION，uppercase tracking-wider，保留样式只换字体）；:150/151/164/165 「像素世界」标题+描述；:155/169 进入世界按钮；:219 app tagline
- Header.tsx:94 用户名 displayName；:45 搜索框 placeholder（输入框文字→sans）
- InputBar.tsx:28 聊天输入框文字（→sans）
- home.tsx:171「Dashboard」label（英文但是分区标签，按操作 UI 归 sans）；:176 问候正文；:177 日期描述句；:196 widget label；:201 widget unit「件/天」（中文量词→sans）；:203 widget sub；:234/235 空间卡片 label+count；:289 添加空间 label；:313/314/354 卡片 tag/time/due；:327 记录新物品 label；:378 作者名；:385「继续阅读」按钮；:418「件物品」单位词；:425 storage item label

**→ 保留 mono（纯数字/符号读数 + 技术快捷键）：**
- home.tsx:382「68%」进度百分比、:426 `{u.pct}%`（纯数字+%符号→mono）
- Header.tsx:52 kbd `/`（键盘快捷键符号）
- 其余纯数字/编号/温度数字等读数（如 widget value「12」「23」本就非 app-mono，无需动）

> 注：`w.unit`（件/天）经核实为中文量词，按核心规则归 sans——纠正早期把它列入 mono 的判断。同理「68%」是纯数字+符号读数，保留 mono。数字与单位可不同字体（数字 mono、中文单位 sans 是常见排版）。

## Open Questions

（已全部解决：scope 边界=只清 app shell；输入框=sans；单位/状态词=sans。见 Decision。）

## Decision (ADR-lite)

**Context**: mono 在项目里有两个身份——落地页/登录页的工程蓝图美学 vs 产品 app shell 的正文误用；且 sans/mono 边界在单位词、状态词、输入框上有判断分歧。
**Decision**:
1. 本任务只清产品 app shell（`app-mono` + `.app-sidebar-link`）；落地页/登录页的 `MONO` 常量保留不动。
2. 采用极简边界规则：**中文一律 sans，纯数字/符号才 mono**。输入框文字、单位词、状态词全归 sans。
**Consequences**: 范围聚焦、规则简单可执行；不触碰对外门面设计语言；mono 收敛为纯读数/技术符号用途，app shell 回归可扫描的 sans-first。

## Open Questions

- **[Preference] 输入框文字**（Header.tsx:45 搜索框、InputBar.tsx:28 聊天输入框，现为 `app-input-field app-mono`）：改 sans 还是保留 mono「命令行/终端」质感？
- **[Preference] 微型状态/单位词**：Sidebar.tsx:62「即将」徽标、home.tsx:418「件物品」单位词——算操作 UI（sans）还是技术标签/读数（mono）？

## Requirements (evolving)

- 全量排查 `apps/web/src` 内所有 `app-mono` 使用点，按「操作性→sans / 读数性→mono」逐一分类处理。
- uppercase / tracking 等非字体样式保留，只移除字体归属。
- 同步更新 spec：`blueprint-aesthetic.md` / `design-system.md` 把「导航」等操作性用途从 mono 描述里移除，明确导航/按钮/标题/正文走 sans。

## Acceptance Criteria (evolving)

- [ ] app shell 操作性文字（菜单/按钮/问候/标题/卡片 label）渲染为 Sarasa UI SC
- [ ] 真读数（数字/百分比/单位/kbd）仍为 IBM Plex Mono
- [ ] `.app-mono` 类定义保留；无操作性文字仍挂 `app-mono`
- [ ] spec mono 用途措辞已对齐
- [ ] `pnpm --filter @dicha/web lint` 与 typecheck 通过
- [ ] UTF-8 无 BOM + CRLF

## Definition of Done

- 前端 lint/typecheck 绿
- 纯字体类调整，不改功能逻辑/文案/布局
- spec 同步更新

## Out of Scope (explicit)

- 不删除 `.app-mono` 类（真读数仍需要）
- 不改任何文案、i18n key、布局、配色
- （待确认）落地页/登录页 `MONO` 常量的工程美学，默认不动

## Technical Notes

- mono 类定义：`apps/web/src/index.css:673` `.app-mono { font-family: 'IBM Plex Mono', ... }` — 保留类，只清误用点。
- `.app-sidebar-link`（index.css:677）也硬编码 IBM Plex Mono，挂在桌面侧栏导航项（Sidebar.tsx:28）——**须删除该类的 `font-family` 行**让其继承 body sans，否则菜单 label 仍 mono。
- 相关文件（经核实）：`components/{Sidebar,Header,InputBar}.tsx`、`routes/_app/home.tsx`、`index.css`。
- `account.tsx` 经核实**无 `app-mono`**，不在范围。
- specs：`.trellis/spec/frontend/{blueprint-aesthetic,design-system}.md`
