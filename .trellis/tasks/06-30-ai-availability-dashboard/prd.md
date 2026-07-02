# AI 可用性监控与状态大盘

## Goal

实现 AI Gateway 的周期探测、调用日志、成本统计、队列、可用性矩阵和状态大盘。

## Requirements

* 周期探测已启用供应商/模型。
* 记录延迟、成功率、错误分类、最后检测时间。
* 记录调用日志、Token/成本估算和队列状态。
* 经过 AI Gateway 的 AI 调用必须按登录用户隔离统计，便于用户查看自己的消费情况。
* 消费统计至少包含调用次数、成功/失败次数、输入/输出 token、估算费用、供应商/模型/use case 聚合和最近调用记录。
* 调用日志必须区分 `invoke` 与 `probe`，消费页默认只统计真实用户调用，探测日志只进入可用性侧数据。
* 设置页展示类似参考截图的状态矩阵。
* 支持按供应商、模型、用途、时间窗口筛选。
* 设置页新增 AI 消费/用量入口，展示当前用户的消费汇总、模型分布和最近调用。

## Acceptance Criteria

* [ ] 状态矩阵可展示 90 分钟/24 小时/近 7 天窗口。
* [ ] 模型状态包含 healthy、degraded、offline、config_required、unknown。
* [ ] 调用日志和探测日志可区分。
* [ ] 成本统计可按供应商/模型聚合。
* [ ] 用户只能看到自己 owner scope 下的 AI usage 数据。
* [ ] Web 设置页可以查询 24 小时、7 天、30 天、全部窗口的 AI 消费统计。
* [ ] API contract 覆盖 usage 查询响应，不在 web/api/ai-gateway 三处重复定义 DTO。

## Technical Approach

* `packages/shared` 新增 AI usage zod schema 和 ts-rest endpoint。
* `apps/ai-gateway` 新增 user-scoped usage store，MVP 使用 `AI_GATEWAY_DATA_DIR/users/<owner>.usage.json` 持久化统计事件，后续可迁移到数据库或队列消费者。
* `apps/api` 继续作为 BFF 代理，复用 Better Auth session 并转发 `x-dicha-user-id`。
* `apps/web` 在设置页新增 `/settings/ai-usage`，通过 TanStack Query 的 `aiUsageQueryOptions` loader-first 查询当前用户统计。

