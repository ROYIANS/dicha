# 设置其它选项二级页面

## Goal

补齐设置页里除个人资料、账户安全之外的其它选项，让每个设置入口都能进入 iOS Settings 风格的二级页面，并在已有前端能力范围内提供真实可操作的设置体验。没有后端或系统能力支撑的项目要明确呈现当前状态，不伪装成已完成的线上功能。

## What I already know

* `/settings` 已是一级设置列表，`/settings/profile` 与 `/settings/security` 已拆为二级页面。
* 用户希望交互和内容布局都更贴近 iOS 设置：一级列表入口，二级页面带返回按钮，分组列表和紧凑说明。
* 用户不喜欢强烈、整段截断式分割线；设置相关页面应使用更轻的 hairline、留白和分组背景来建立层级。
* 侧边栏入口、Header 用户入口、Settings 父路由 `Outlet` 渲染问题已经在前序任务中完成。

## Assumptions

* 本任务先完成前端页面与本地可交互设置，不新增后端 API、数据库表或真实导出服务。
* 已有主题切换能力可以在外观相关页面中复用；暂无持久化能力的偏好设置可以作为本地演示状态或禁用状态呈现。
* 中文为唯一可用语言，但语言页需要保留未来多语言扩展的 UI 位置。

## Requirements

* 设置一级页的所有可点击选项都应导航到对应二级路由。
* 新增二级路由至少覆盖：隐私、外观、主题、通知、语言、存储、数据导出、关于。
* 二级页使用和个人资料 / 账户安全一致的设置页 header 结构：返回 `/settings`、短标题、轻说明。
* 二级页内容采用 iOS Settings 风格的分组列表：浅 surface 分组、行内图标或状态值、低存在感分隔、必要的补充说明。
* 已有真实能力的设置要可操作：
  * 外观 / 主题复用现有主题切换。
  * 通知等前端偏好可以用页面内 state 呈现开关反馈。
* 暂无真实后端能力的操作要清晰表达状态，不制造已完成错觉。
* 新增文案走中文 i18n 或项目现有中文文案模式，避免 emoji 和装饰性工程文字。

## Acceptance Criteria

* [ ] `/settings/privacy`、`/settings/appearance`、`/settings/theme`、`/settings/notifications`、`/settings/language`、`/settings/storage`、`/settings/export`、`/settings/about` 均能直接访问并渲染对应页面。
* [ ] `/settings` 列表中对应选项点击后能进入正确二级页，浏览器地址变化正确。
* [ ] 所有二级页都能通过返回按钮回到 `/settings`。
* [ ] 二级页视觉与现有 profile/security 设置页一致，不出现强 full-width 截断线。
* [ ] lint、typecheck、build 通过。

## Definition of Done

* 前端实现完成并验证路由可用。
* Lint / typecheck / build 通过，已清理构建产生的临时文件。
* 如发现新的长期约定或坑，更新 `.trellis/spec/`；否则记录无需更新。
* 工作提交到 git，未纳入无关未跟踪目录。

## Technical Approach

* 复用现有 `/settings` 父路由和 `Outlet` 机制。
* 抽取或就地复用设置二级页的 header、分组列表、开关行等轻量 UI 模式，避免 profile/security 与新页面割裂。
* 新增 TanStack file routes，并让 route tree 由插件/构建生成。
* 优先使用 lucide-react 图标、项目 token class、已有 `ThemeToggle` / theme hook 相关能力。

## Out of Scope

* 不新增真实通知推送、数据导出后端、存储清理后端、账号隐私后端 API。
* 不改侧边栏信息架构，除非为设置入口导航状态做必要调整。
* 不做多语言切换完整落地；语言页仅展示当前中文和未来选项状态。

## Technical Notes

* Relevant code: `apps/web/src/routes/_app/settings.tsx`, `apps/web/src/routes/_app/settings.profile.tsx`, `apps/web/src/routes/_app/settings.security.tsx`, `apps/web/src/components/ThemeToggle.tsx`, `apps/web/src/i18n/locales/zh.ts`.
* Relevant specs: `.trellis/spec/frontend/index.md`, `architecture.md`, `design-system.md`, `blueprint-aesthetic.md`, `component-guidelines.md`, `quality-guidelines.md`, `.trellis/spec/guides/index.md`.
