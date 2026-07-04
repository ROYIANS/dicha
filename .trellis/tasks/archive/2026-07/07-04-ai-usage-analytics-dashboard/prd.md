# 完善 AI 消费统计页面

## Goal

把现有 AI 消费统计页从“基础列表报表”升级为更全面的运营型分析页，帮助超级管理员或未来的高级用户快速判断 AI 调用量、token 消耗、费用、性能、供应商/模型分布和近期趋势。

## What I Already Know

* 用户希望新增近 24 小时消耗、历史使用、费用消耗、请求次数等折线图/小图，并采用“卡片 + 统计小条/小图”的形式。
* 现有 token 指标应明确命名为“总 token 数”。
* 需要新增平均 RPM（每分钟请求数）和平均 TPM（每分钟 token 数）。
* 需要新增“消耗分布”图表，支持柱状图或面积图切换。
* 分布维度需要支持按小时、按日或沿用已有分组；图例应能按具体模型或供应商展示。
* 当前使用数据由 `apps/ai-gateway/src/modules/usage/usage.store.ts` 从每次 invoke 事件聚合产生，API 和 Web 通过 `packages/shared/src/contracts/ai.contract.ts` 的 `AiUsageReportSchema` 共享结构。
* 当前页面位于 `apps/web/src/features/settings/ai-usage-page.tsx`，已有窗口切换、调用次数、估算费用、Token、平均延迟、供应商/模型/用途分布和最近调用列表。
* `apps/web` 当前没有图表库依赖；已有视觉系统是设置页里的紧凑卡片、hairline 边框、温暖哑光色系和 `settingsTintClass`。
* `recharts@3.9.1` 支持 React 19 peer dependency，适合本页需要的 LineChart、AreaChart、BarChart、Tooltip、Legend、ResponsiveContainer 等交互。
* 当前 AI Gateway usage store 还以用户维度 JSON 文件持久化；迁移到数据库可以作为后续任务，不阻塞本次基于事件聚合的展示增强。

## Requirements

* 扩展 AI usage report contract，提供趋势、性能和分布所需的结构化字段，避免前端自行猜测时间窗口或重复复杂聚合。
* 后端 usage 聚合需要从已记录的 invoke events 计算：
  * 总览 summary：调用次数、成功/失败/降级、prompt/completion/total tokens、估算费用、平均延迟。
  * 性能 metrics：平均 RPM、平均 TPM，并预留峰值 RPM/TPM 或高分位延迟的扩展空间。
  * 时间序列：按窗口生成小时或日 bucket，至少包含 calls、totalTokens、estimatedCostUsd、averageLatencyMs。
  * 分布数据：支持按模型或供应商聚合，并支持按小时/按日 bucket 展示。
* 前端需要展示：
  * 指标卡片区：调用次数、估算费用、总 token 数、平均延迟、平均 RPM、平均 TPM。
  * 小型趋势卡片：近 24 小时消耗、历史 token、费用、请求次数，使用 sparkline/小面积图呈现。
  * 消耗分布图：支持柱状图/面积图切换，支持按小时/按日，支持按模型/供应商图例。
  * 保留现有供应商消费、模型消费、用途分布、最近调用。
* UI 保持设置/运营后台风格：密度高、可扫描、安静克制；不做营销式 hero 或说明型空内容。
* 空数据、低数据量、全零费用、全部 latency 未记录时，图表和指标需要有稳定的空态/零值表现。
* i18n 文案需要同步更新，尤其是“Token”改为“总 token 数”。

## Acceptance Criteria

* [x] `/ai/usage` 返回的 `AiUsageReportSchema` 包含 summary、performance、trend series 和 distribution series，旧字段继续可用。
* [x] AI Gateway 对 `24h`、`7d`、`30d`、`all` 窗口都能生成稳定的 bucket；无事件时返回空数组或零值摘要，不抛错。
* [x] 平均 RPM/TPM 基于当前窗口跨度计算，避免除以零，并对 `all` 使用实际事件跨度或合理 fallback。
* [x] Web 页面展示“总 token 数”、平均 RPM、平均 TPM，以及至少四个趋势小图。
* [x] 消耗分布图使用 Recharts 实现，并支持“柱状图 / 面积图”和“模型 / 供应商”切换；按小时/按日维度可用。
* [x] 现有 breakdown 和 recent events 仍正常展示，已有窗口切换行为不回退。
* [x] 新增或更新聚合测试，覆盖 bucket、RPM/TPM、空数据、费用精度、模型/供应商分布。
* [x] 使用本机 pnpm 跑相关 typecheck/lint/test，不能使用 Codex Runtime 的 pnpm。

## Definition of Done

* Tests added/updated where aggregation logic is non-trivial.
* Lint/typecheck pass for touched packages.
* Shared contract, gateway aggregation, BFF/Web consumption stay aligned.
* UI verified in realistic empty and non-empty states.
* Trellis task notes updated before completion.

## Technical Approach

### Backend and Contract

Extend `packages/shared/src/contracts/ai.contract.ts` with small, explicit usage analytics schemas:

* `AiUsagePerformanceSchema`: averageRpm, averageTpm, optional peakRpm/peakTpm later.
* `AiUsageTimeBucketSchema`: bucketStart, bucketEnd, calls, totalTokens, promptTokens, completionTokens, estimatedCostUsd, averageLatencyMs.
* `AiUsageSeriesSchema`: primary trend arrays for requests, tokens, cost, latency.
* `AiUsageDistributionSchema`: grouped bucket rows keyed by provider or model.

Then update `apps/ai-gateway/src/modules/usage/usage.store.ts` to compute these values from persisted invoke events inside `getReport`. Keep persisted event shape unchanged for now so this is a read-model enhancement rather than a migration.

### Frontend

Add `recharts` to `@dicha/web`, then update `apps/web/src/features/settings/ai-usage-page.tsx` to add compact analytics panels:

* Metric tiles with optional sub-metric strips.
* Recharts-powered sparkline/area/line cards with hover tooltip and responsive sizing.
* A distribution panel with segmented controls for chart type, bucket granularity and legend grouping.
* Existing breakdown panels remain below the trend/distribution section.

Recommended implementation: use Recharts for all meaningful charts instead of hand-rolled SVG. This better matches the product goal of a comprehensive analytics page with hover readouts, legends, responsive behavior and future room for richer interaction.

## Decision (ADR-lite)

**Context**: The page is evolving from static summary cards into a richer analytics dashboard. Hand-rolled SVG would be enough for static sparklines, but it would push tooltip, legend, responsive layout and chart switching complexity into app code.

**Decision**: Add `recharts` to `@dicha/web` and build the trend and distribution charts on top of Recharts components.

**Consequences**: This adds one frontend dependency, but avoids underbuilding the analytics UX and keeps future chart interactions easier to extend. We still keep the visual styling restrained and aligned with the settings UI rather than using default chart-library aesthetics.

## Expansion Sweep

### Future Evolution

* Persist usage to database later for better querying, retention, cross-user admin analytics and billing reconciliation.
* Add export, anomaly detection, budget alerts, per-use-case limits and org-level rollups after the report model stabilizes.

### Related Scenarios

* AI invoke demo and future business AI calls should continue recording the same event shape so analytics remain unified.
* Future streaming invoke support should record final usage and latency into the same store/report pipeline.

### Failure and Edge Cases

* `all` window can span very short or very long periods; bucket generation must avoid huge arrays and avoid divide-by-zero RPM/TPM.
* Model names may collide across providers, so chart legends should use stable keys and display provider context where needed.
* Some providers may not return token/cost/latency; charts should show zero or “未统计” consistently.

## Out of Scope

* Migrating AI usage persistence from JSON files to database.
* Real billing reconciliation with provider invoices.
* Cross-user/global admin analytics unless already exposed by current auth/owner model.
* Streaming invoke implementation.
* Budget alerts, quotas and notification workflows.
* Custom hand-rolled SVG chart primitives for this dashboard.

## Technical Notes

* Shared contract: `packages/shared/src/contracts/ai.contract.ts`
* Gateway usage aggregation: `apps/ai-gateway/src/modules/usage/usage.store.ts`
* Invoke event recording: `apps/ai-gateway/src/modules/invoke/invoke.service.ts`
* API BFF forwarding: `apps/api/src/modules/ai-gateway/ai-gateway.service.ts`
* Web query wrapper: `apps/web/src/api/ai.ts`
* Usage page: `apps/web/src/features/settings/ai-usage-page.tsx`
* Route preload: `apps/web/src/routes/_app/settings.ai-usage.tsx`
* Chinese i18n: `apps/web/src/i18n/locales/zh.ts`
* Package manager constraint: use `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm`, never Codex Runtime pnpm.
* Dependency research: `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm view recharts version peerDependencies --json` returned `3.9.1` with React 19 support.

## Implementation Notes

* Added `recharts` to `@dicha/web` for interactive analytics charts.
* Extracted AI usage report aggregation into `apps/ai-gateway/src/modules/usage/usage.analytics.ts` so bucket/performance/distribution logic is testable without Nest runtime wiring.
* Added `@dicha/ai-gateway` Vitest setup and focused usage analytics tests.
* Verified shared, gateway, api and web typecheck; shared/gateway/web lint; gateway and web tests; shared and web build; and Vite dev module transform.
