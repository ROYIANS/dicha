# 设置页与侧边栏固定入口

## Goal

为 app shell 补齐一个正式的设置入口和设置页面，让用户能从侧边栏底部稳定进入设置，同时把「进入世界」banner 固定在设置入口上方，形成清晰的底部工具区。

## Requirements

* 桌面侧边栏底部 sticky / fixed 区域包含两部分：上方是「进入世界」banner，下方是设置入口。
* 设置入口包含设置图标和「设置」label，点击进入 `/settings`。
* 移动端导航抽屉复用同样的信息架构：底部保留世界 banner 与设置入口。
* 新增 `/settings` 受 `_app` 认证布局保护。
* 设置页 header 与 account 页面 header 保持一致的页面框架、标题层级和 summary 区域风格。
* 设置页内容参考 iOS Settings 的分组列表模式：搜索/分组/图标色块/右侧状态/chevron，但使用 dicha 暖白哑光设计系统，不复刻 iOS 视觉皮肤。
* 当前设置项以可导航/可预览的静态条目为主，不接入新的后端能力。

## Acceptance Criteria

* [ ] 侧边栏底部世界 banner 与设置入口在桌面高度内固定在底部，不随主导航列表滚走。
* [ ] 设置入口 active 状态能在 `/settings` 高亮。
* [ ] 移动端抽屉里也能看到世界 banner 和设置入口，并能关闭抽屉后导航。
* [ ] `/settings` 页面可访问，页面 header 与 account 页面结构一致。
* [ ] 设置内容呈现为分组列表，包含账号/外观/通知/数据/关于等 MVP 级条目。
* [ ] 文案走 i18n，不新增 emoji。
* [ ] `pnpm --filter @dicha/web lint`、`typecheck`、`build` 通过。

## Definition of Done

* 前端实现符合 `.trellis/spec/frontend` 设计系统、组件、质量规范。
* 没有新增后端、数据库或 shared contract 变更。
* 新增/修改文件使用 UTF-8 无 BOM 与 CRLF 行尾。
* 完成后记录结果，等待用户确认是否提交。

## Out of Scope

* 不实现真实通知设置、导出数据、隐私权限后端逻辑。
* 不重做 account 页面。
* 不引入新的 UI 组件库。
* 不改变整体 app shell 信息架构，除底部世界/设置区外保持现有导航分区。

## Technical Approach

* 扩展 `apps/web/src/components/Sidebar.tsx`：将主导航与底部 actions 分离，world banner 和 settings link 放入底部 `shrink-0` 区域。
* 新增 `apps/web/src/routes/_app/settings.tsx`，复用 account 页面的 header/网格/斜纹语汇，内容采用设置分组列表。
* 更新 `apps/web/src/i18n/locales/zh.ts` 增加 nav/settings 文案。
* 更新 TanStack Router 生成文件，使 `/settings` 路由参与类型系统。

## Technical Notes

* Apple Support 的 iPhone Settings 文档展示了 Settings app 顶部搜索与下方设置项列表的基础形态；本任务只借布局模式。
* 现有 `SidebarNav` 已被桌面侧栏和移动 `AppNavDrawer` 共用，底部固定区应保持复用。
* `account` 页面已有适合复用的 header/grid/slash 结构，但暂不抽公共组件，避免为第二个页面过早抽象。
