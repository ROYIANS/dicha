# 侧边栏菜单信息架构约定

## Goal

先约定 app 侧边栏长期会有哪些菜单，即使部分功能还没有实现，也先把信息架构和入口秩序搭好；同时实现移动端底部 tabbar，把移动端从 header + drawer 模式切换到更自然的底部导航。目标是让后续业务开发有稳定导航骨架，不再每做一个功能才临时追加入口。

## What I Already Know

* 用户希望“哪怕功能没做，也先弄上去”。
* 用户确认「收纳」作为物品级分组名，而不是更工具化的「物品」。
* 当前侧边栏已有：仪表盘、房间（衣橱 / 书房 / 杂物间）、底部像素世界 banner、设置入口。
* 当前实际路由已有：`/home`、`/storage-room`、`/wardrobe`、`/library`、`/world`、`/settings`、`/account` 和多个 `/settings/*` 二级页面。
* 当前 `SidebarNav` 已支持 disabled 菜单和“即将”标记，可复用这个模式先放未实现功能。
* 业务首个切片 PRD 当前聚焦储物间物品录入 + 列表，不适合混入 app shell 信息架构重做。
* 后续移动端方向：不要 header 和侧边栏，改成底部 tabbar；中间放 PC 端右下角的 `+` 录入入口，左右各放 2 个主要导航 tab。
* 用户确认移动端 tabbar 为 5 槽：`仪表盘` · `收纳` · `+` · `房间` · `我的`。
* 移动端点击 `+` 后，不使用 PC 端右下角 1/4 圆盘；改用类似当前移动端汉堡菜单的浮层，内容以 grid 呈现：上图标、下 label，并带打开动画。

## Assumptions

* 侧边栏应保持“内容是主角，世界是奖励层”的产品方向。
* 侧边栏不应该变成后台 admin 式大而全菜单；先放长期高频入口，低频项放设置或未来二级页。
* 未实现功能可以出现，但需要清楚标记为“即将”，不要链接到假页面。
* 世界入口继续固定在底部设置入口上方，保持当前视觉策略。
* 桌面侧边栏的信息架构应能映射到未来移动端 tabbar；移动端 tabbar 只承载最高频入口，其余入口留在二级页或设置。

## Recommended Menu Tree (Draft)

### 仪表盘

* 仪表盘 `/home`

### 收纳

* 全部物品（即将）
* 最近添加（即将）
* 标签（即将）

### 房间

* 衣橱 `/wardrobe`（即将，直到真实功能完成）
* 书房 `/library`（即将，直到真实功能完成）
* 杂物间 `/storage-room`
* 厨房 / 冰箱（即将）
* 药箱（即将）

### 洞察

* 整理日历（即将）
* 月度报告（即将）

### 底部固定区

* 像素世界 banner `/world`
* 设置 `/settings`

## Requirements (Evolving)

* 先达成侧边栏菜单命名、分组和排序共识。
* 侧边栏分组名使用「收纳」。
* 已有路由的菜单保持可跳转；未实现能力显示 disabled / 即将。
* 不在本阶段实现每个菜单对应的真实业务页面，除非用户随后明确要求。
* 菜单结构需要适配桌面侧边栏；移动端不再使用 header + drawer，而是使用底部 tabbar。
* 移动端 tabbar 中间是 `+` 录入入口，左右分别是 `仪表盘`、`收纳`、`房间`、`我的`。
* 移动端点击 `+` 打开 action sheet / 浮层，使用 grid 展示 `记录一件物品`、`拍照`、`扫码`、`AI 辅助` 等动作；每个格子上图标、下 label。
* 移动端 action sheet 打开/关闭需要有安静、顺滑的动画，复用 Warm Matte 视觉系统，不做硬弹窗感。

## Acceptance Criteria (Evolving)

* [x] PRD 明确侧边栏菜单树。
* [x] 用户确认分组方向：使用「收纳」。
* [x] 用户确认未来移动端 tabbar 的 4 个主导航入口：`仪表盘`、`收纳`、`房间`、`我的`。
* [x] 明确哪些入口本阶段可点击、哪些入口 disabled。
* [x] 桌面侧边栏展示约定菜单，未实现入口 disabled。
* [x] 移动端隐藏 header / drawer 入口，展示底部 tabbar。
* [x] 移动端 `+` 打开 action grid 浮层，动作点击沿用 toast stub。

## Out of Scope (Draft)

* 不实现所有菜单对应的完整业务功能。
* 不重做侧边栏视觉语言。
* 不改变设置二级页结构。
* 不改变世界入口固定在底部的策略，除非用户明确推翻。
* 不实现移动端 tab 对应的所有二级页面；`收纳` / `房间` / `我的` 可先跳已有可用入口或禁用未完成细项。

## Technical Notes

* Existing sidebar file: `apps/web/src/components/Sidebar.tsx`.
* Existing i18n file: `apps/web/src/i18n/locales/zh.ts`.
* Existing route files under `apps/web/src/routes/_app/`.
* Current `NavItem` has `disabled?: boolean`; disabled items show “即将” badge.
