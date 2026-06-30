# AI Gateway 与模型配置路线图

## Goal

把 AI 能力建设拆成长期路线图：独立 `apps/ai-gateway` 服务负责供应商、模型、调用路由、降级、监控、日志、成本和队列；设置页提供 AI 配置与状态控制台。父任务只承载方向、边界和子任务拆分，不直接作为单次实现任务。

## Strategic Decision

AI 能力是接下来产品主线，不能作为 `apps/api` 的边角模块处理。采用独立 `apps/ai-gateway` 服务，从第一阶段就隔离第三方 AI 调用、网络波动、长请求、熔断、周期探测、调用日志、成本统计、队列和状态大盘。

## Service Boundary

`apps/ai-gateway` owns:

* 供应商配置、模型目录、用途路由、备用模型策略。
* API Key / Secret 的安全读取与调用时注入。
* 调用代理、重试、超时、熔断、降级。
* 周期性探测、状态快照、可用率窗口、状态矩阵。
* 调用日志、Token/费用估算、供应商错误分类。
* 异步队列和长任务调度。

`apps/ai-gateway` does not own:

* 用户物品、房间、事件等业务领域数据。
* 业务页面最终持久化决策。
* 前端会话鉴权的主身份源。

Integration:

* `apps/api` 保持业务 API，可通过内部服务 token 调用 `apps/ai-gateway`。
* `apps/web` 的设置页作为 AI Gateway 配置与状态控制台入口。
* `packages/shared` 承载 AI DTO、能力枚举、状态枚举，避免 web/api/ai-gateway 三边重复类型。

## Roadmap Subtasks

1. `06-30-ai-gateway-scaffold`
   * 目标：建立独立 NestJS `apps/ai-gateway` 骨架、共享 AI contract、health/catalog mock、provider adapter interface、Dockerfile 与 docker-compose 服务位。
   * 当前状态：第一批代码已开始落在该范围。

2. `06-30-ai-settings-console-model-select`
   * 目标：设置页新增 AI 供应商、服务模型两个入口和页面，开发可复用 `ModelSelect` 组件，以 mock catalog 展示配置与状态。

3. `06-30-ai-config-persistence-secrets`
   * 目标：AI Gateway 配置持久化、密钥加密存储、供应商和模型 CRUD，并让设置页接入真实 API。

4. `06-30-ai-routing-degradation`
   * 目标：AI Gateway 调用代理、供应商 adapter、用途路由、重试、超时、熔断和优雅降级。

5. `06-30-ai-availability-dashboard`
   * 目标：周期探测、调用日志、成本统计、队列、可用性矩阵、状态大盘和告警入口。

## Graceful Degradation Strategy

* Level 0: 首选模型正常，直接使用用途默认模型。
* Level 1: 当前模型失败或超时，切到同供应商同能力备用模型。
* Level 2: 同供应商不可用，切到其它已启用供应商同能力模型。
* Level 3: AI 不可用，返回可解释的非阻塞结果，如手动输入、模板默认值、稍后重试或跳过智能生成。

## Monitoring Roadmap

* Phase 1: 手动检测和最近一次状态。
* Phase 2: 周期探测、最近成功时间、延迟、错误分类、可用率窗口。
* Phase 3: 类似参考截图的状态矩阵和状态大盘。
* Phase 4: 自动熔断、手动禁用、优先级调整、告警订阅、成本/Token 统计。

## Parent Acceptance Criteria

* [ ] 长期服务边界和路线图明确。
* [ ] 子任务全部建立并关联到父任务。
* [ ] 每个子任务有可独立交付的 PRD。
* [ ] 当前代码改动归属到第一个可交付子任务，不继续扩大父任务范围。

## Out of Scope

* 父任务不直接实现功能。
* 父任务不直接承诺一次完成真实模型调用、密钥管理、状态大盘或告警。

