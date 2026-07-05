# 积分运营统计与管理增强

## Goal

把积分系统从“可发放、可兑换、可扣费”的基础能力推进到“可运营、可观察、可干预”的管理能力。当前 AI MVP 已经具备 Dicha 官方通道、积分扣费、用户余额、流水和兑换码；本任务聚焦后台运营视角，补齐积分总览、趋势、分布、用户排行、兑换码效果和基础运营配置，让后续定价、活动发放、成本控制更有依据。

## What I already know

* 用户判断 AI MVP 当前阶段基本够用，后续 AI Gateway 能力可以慢慢完善；当前更希望深度优化“积分使用运营面板”方向。
* 已有积分基础能力：
  * `CreditAccount`：余额、累计获得、累计消耗。
  * `CreditLedgerEntry`：发放、兑换、扣费、退款、调整、过期等流水类型。
  * `CreditRule`：CNY/USD 成本价到积分的换算规则、平台倍率、最低扣费。
  * `CreditRedemptionCode` / `CreditRedemption`：兑换码和用户兑换记录。
* 后台已有页面：
  * `积分规则`
  * `积分发放`
  * `账户余额`
  * `积分流水`
  * `兑换码`
* 前台已有页面：
  * 设置页 `积分`：余额、累计获得/消耗、兑换码入口、近期流水。
  * 设置页 `AI 消费统计`：用户维度展示官方 Dicha AI 的积分消耗趋势，同时不暴露真实 CNY/USD 成本。
* AI 官方调用已经通过 `CreditLedgerEntry` 写入积分扣费流水，来源为 `ai_invoke`。
* Admin 已有 Dicha AI 统计与诊断页面，可显示真实成本与调用日志；本任务不需要重做 AI 调用链路。
* 侧边栏已有 `积分与计费` 分组，适合新增“积分看板/运营看板”入口。

## Assumptions (temporary)

* MVP 阶段不接支付，不做真实充值/订单/发票。
* 本任务优先做后台运营统计；前台积分页只做必要补充，不做商业化充值 UI。
* 积分运营看板主要用于超级管理员，允许展示全局积分余额、发放、消耗、兑换、用户排行与 AI 消耗关联。
* 用户前台继续只看自己的积分，不看 Dicha 官方真实成本。
* 不考虑历史数据兼容，必要时可直接调整 Prisma schema。

## Scope Decision

**Decision**: MVP 只做后台积分运营看板。

**Context**: 前台积分页已经具备余额、兑换码入口和个人流水；用户侧 AI 消费统计也已经展示个人官方 Dicha AI 积分消耗。本阶段更需要超级管理员的运营视角，用来监控全局积分发放、消耗、兑换、用户排行和活动效果。

**Consequence**: 本任务不改造前台积分页，不做充值 UI，不做支付。后续如果需要更细的用户自助统计，可以另开前台积分体验增强任务。

## Analytics Scope Decision

**Decision**: 看板采用“积分账务 + 轻量 AI 消耗排行”。

**Context**: 积分流水 `CreditLedgerEntry` 是积分账务的单一来源，适合统计发放、兑换、扣费、余额和用户排行。Dicha AI 官方调用是当前最主要的积分消耗场景，运营上需要知道哪些模型/用途正在消耗积分，但不应把 AI 诊断页的内部通道、请求详情、调用状态全部搬进积分看板。

**Consequence**: 看板主结构围绕积分账务；AI 只展示模型 / 用途的积分消耗排行和总量。请求级诊断、内部通道和错误排查继续留在 AI 统计与 AI 诊断页面。

## Export Decision

**Decision**: MVP 不做 CSV / 文件导出。

**Context**: 当前阶段运营量还小，优先把页面看板、筛选、排行和图表口径做清楚。导出会引入全量分页、字段口径、权限和文件生成细节，等真实运营对账需求出现后再做更稳。

**Consequence**: 页面可以展示运营指标和列表，但不提供导出按钮或导出接口。

## Visualization Decision

**Decision**: 使用现有 Recharts 做趋势图和分布图，搭配指标卡与排行表。

**Context**: 前台 AI 消费统计已经使用 Recharts；后台积分运营看板应复用同一图表库，保持技术栈和交互风格一致。只做指标卡和表格会过于干瘪，不像运营看板；更重的 dashboard 会扩大本次 MVP。

**Consequence**: 本任务实现指标卡、趋势/分布图和排行表，但不做复杂拖拽、自定义报表或导出。

## Open Questions

* None for MVP.

## Requirements (evolving)

* 新增后台积分运营/统计看板，用于查看全局积分运行情况。
* 本任务只做后台超级管理员视角，不改造前台积分页。
* 看板至少展示：
  * 当前总余额；
  * 累计发放；
  * 累计消耗；
  * 兑换码兑换总量；
  * AI 调用扣费总量；
  * 近 24 小时 / 7 天 / 30 天趋势。
* 支持按时间窗口切换统计：24h、7d、30d、all。
* 支持按流水类型查看分布：grant、redeem、debit、refund、adjustment、expiry。
* 使用 Recharts 展示积分趋势和类型分布。
* 支持用户维度排行：
  * 余额最高用户；
  * 消耗最多用户；
  * 获得最多用户；
  * 最近活跃积分用户。
* 支持兑换码运营视角：
  * 兑换码使用率；
  * 总发放额度；
  * 已兑换额度；
  * 未使用额度；
  * 即将过期/已耗尽/停用状态统计。
* 支持轻量 AI 积分消耗排行：
  * 按模型统计官方 Dicha AI 积分消耗；
  * 按用途统计官方 Dicha AI 积分消耗；
  * 不展示请求级详情、内部通道、错误排查字段。
* 表格/列表需能处理未来较多用户和流水数据，不能只展示固定 20 条。
* 保持后台设计风格：密集、运营化、`rounded-md`、侧边栏 + 内容区，不做 marketing 页面。
* 前台用户仍只看自己的余额、积分流水和官方 AI 积分消耗，不暴露真实成本。

## Acceptance Criteria (evolving)

* [x] PRD 明确后台/前台范围取舍。
* [x] Admin 侧边栏出现积分运营统计入口。
* [x] 后台积分运营看板能展示全局关键指标。
* [x] 看板能按时间窗口切换。
* [x] 看板包含积分发放/消耗/兑换趋势图。
* [x] 看板包含流水类型分布。
* [x] 趋势/分布图使用项目现有 Chart 库 Recharts。
* [x] 看板包含用户排行或高价值运营列表。
* [x] 看板包含兑换码使用概况。
* [x] 看板包含轻量 AI 模型 / 用途积分消耗排行。
* [x] Shared admin contract 定义积分运营统计响应结构。
* [x] API admin endpoint 由 `SuperAdminGuard` 保护。
* [x] 后端查询不暴露用户敏感私有内容，只返回运营所需的安全身份字段。
* [x] 相关 typecheck/lint/build 通过，使用本机 pnpm。

## Definition of Done

* Tests added/updated where behavior is practical within current setup.
* `@dicha/shared` build passes if contracts change.
* `@dicha/api` typecheck/lint/build passes if backend changes.
* `@dicha/admin` typecheck/lint/build passes if admin UI changes.
* `@dicha/web` checks pass if frontend user page changes.
* Specs updated if a new credit operations contract or dashboard convention is established.
* Task is committed, archived, and journaled.

## Out of Scope (explicit)

* 不做支付、充值订单、支付回调、发票或真实商品套餐购买。
* 不把积分作为 `AiModelPricing.currency` 或模型真实结算货币。
* 不向普通用户展示 Dicha 官方真实 CNY/USD 成本。
* 不重写 AI Gateway 调用、流式、降级、诊断链路。
* 不做复杂风控、反作弊、自动封禁或自动授信。
* 不做 CSV / Excel / 文件导出。
* 不做历史数据迁移兼容。

## Technical Notes

* Prisma schema: `apps/api/prisma/schema.prisma`
  * `CreditAccount`
  * `CreditLedgerEntry`
  * `CreditRule`
  * `CreditRedemptionCode`
  * `CreditRedemption`
  * `AiUsageEvent.creditAmount`
* Shared contracts:
  * `packages/shared/src/contracts/credit.contract.ts`
  * `packages/shared/src/contracts/admin.contract.ts`
* Backend:
  * `apps/api/src/modules/credits/credits.service.ts`
  * `apps/api/src/modules/credits/credits.controller.ts`
  * admin methods are proxied through `apps/api/src/modules/admin/admin.service.ts`
* Admin frontend:
  * `apps/admin/src/components/AdminShell.tsx`
  * existing credit routes under `apps/admin/src/routes/_admin.credits.*.tsx`
  * API query factories in `apps/admin/src/api/admin.ts`
* Web frontend:
  * `apps/web/src/routes/_app/settings.credits.tsx`
  * `apps/web/src/features/settings/credits-page.tsx`
  * `apps/web/src/routes/_app/settings.ai-usage.tsx`
  * `apps/web/src/features/settings/ai-usage-page.tsx`
* Relevant spec:
  * `.trellis/spec/backend/ai-catalog.md` contains credit accounting and user-facing cost masking contracts.
  * `.trellis/spec/frontend/admin-app.md` governs admin page style and routing.
