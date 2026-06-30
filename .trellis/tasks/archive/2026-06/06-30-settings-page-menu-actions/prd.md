# Settings page menu actions

## Goal

完善 `/settings` 设置首页的菜单结构，让它不仅是功能目录，也能承载账号动作和未来能力入口。本次优先加入底部“退出登录”真实动作，同时补充适合当前产品阶段的设置入口，保持 iOS 风格分组和暖白哑光视觉一致。

## What I already know

* 用户明确希望“最下面添加一项新的菜单，退出登录”。
* 用户希望顺便看看还可以添加哪些其它菜单。
* 当前 `/settings` 已有账户、应用、数据、关于四组，入口包括个人资料、登录与安全、隐私、外观、昼夜模式、通知、语言、存储空间、导出数据、关于滴茶。
* 已有真实 `logout()` 封装在 `apps/web/src/api/auth.ts`，会通过 Better Auth 退出登录。
* 设置二级页可以先展示真实当前状态或“稍后/未接入”，不能做假功能。

## Decisions

* 退出登录作为设置页最底部独立 action section，不放进“账户”分组里，避免和二级页面入口混在一起。
* 退出登录点击后确认，成功后跳转 `/login`。
* 新增菜单推荐：帮助与反馈、实验室、开发者诊断。
* 新增入口先使用设置二级页展示当前能力边界，不接入不存在的工单/诊断后端。

## Requirements

* `/settings` 底部新增“退出登录”菜单项。
* 退出登录有确认、loading/disabled 状态，成功后跳转登录页，失败有 toast。
* `/settings` 新增帮助与反馈、实验室、开发者诊断入口。
* 新增入口拥有对应二级页面，使用现有 settings detail scaffold 和 iOS 风格分组行。
* 文案中文优先，不使用 emoji，不伪造未实现能力。

## Acceptance Criteria

* [x] `/settings` 最底部可看到“退出登录”。
* [x] 点击退出登录会确认并调用真实 Better Auth logout，成功跳转 `/login`。
* [x] 新增菜单项可点击进入对应二级页面。
* [x] 新页面状态文案明确“稍后/未接入/本地状态”等真实状态。
* [x] Typecheck、lint、build、tests、diff check 通过。

## Definition of Done

* Trellis task active and committed with code changes.
* UTF-8 no BOM + CRLF for changed/new files.
* Frontend checks pass.

## Out of Scope

* 不接入真实反馈系统、诊断上报、实验功能开关后端。
* 不新增推送、支付、订阅、删除账号等高风险能力。
* 不改变设置页整体视觉语言。

## Technical Notes

* Settings root: `apps/web/src/routes/_app/settings.tsx`.
* Secondary pages: likely `apps/web/src/routes/_app/settings.*.tsx` and shared helpers.
* Logout helper: `apps/web/src/api/auth.ts`.
