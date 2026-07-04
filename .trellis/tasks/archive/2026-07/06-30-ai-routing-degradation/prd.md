# AI 调用路由与优雅降级

## Goal

实现 AI Gateway 的第一条真实 invoke 调用链路：业务方按 use case 发起请求，Gateway 根据模型分配选择 primary/fallback，调用真实供应商，记录 usage，并把失败归类为可降级或不可降级错误。这个切片先做非流式文本调用闭环，为后续可用性矩阵、周期探测、熔断、队列和业务 AI 功能提供真实数据源。

## Research References

* [`research/lobehub-model-runtime-routing.md`](research/lobehub-model-runtime-routing.md) — LobeHub runtime/route/fallback/error-taxonomy patterns; MVP 采用轻量 fetch adapter，不整包搬运 runtime。

## Requirements

* 业务方按 `useCase` 请求 AI 能力，不直接依赖供应商。
* `packages/shared` 新增 invoke contract，web/api/ai-gateway 共享请求、响应、错误分类和 attempt 类型。
* `apps/api` 新增 authenticated BFF handler，复用 Better Auth session 并转发 `x-dicha-user-id`。
* `apps/api` 新增当前用户 profile BFF：通过 `DICHA_SUPER_ADMIN_EMAILS` 在服务端派生 `isSuperAdmin`，供内部工具页 gate 使用。
* `apps/ai-gateway` 新增 invoke module/service/controller，读取当前用户 catalog、assignment、provider secret 和 model metadata。
* Gateway 根据 assignment 构造调用顺序：显式 `modelId`（测试/内部覆盖）优先，否则 `primaryModelId`，再接 `fallbackModelIds`。
* Provider adapter 至少支持 OpenAI-compatible Chat Completions。
* Provider adapter 还要支持 Anthropic Messages API 和 OpenAI Responses API 的请求形态，避免继续把所有供应商强塞为 OpenAI-compatible。
* Fallback 规则：对超时、网络错误、429、5xx、provider unavailable 等可重试错误继续尝试后备模型；对缺凭证、鉴权失败、权限拒绝、模型不存在、上下文/请求格式错误、内容安全拒绝等不可重试错误停止或跳过同类错误。
* 每次 invoke 必须记录 `kind: invoke` usage event，包含 provider/model/useCase、成功/失败/降级、prompt/completion token、估算费用、latency 和 error category。
* 对业务侧返回可解释的降级结果，不暴露内部密钥、Authorization header、原始上游 stack 或完整错误对象。
* 新增超级管理员内部 AI 调用测试页，只对 `isSuperAdmin` 用户显示并允许直接测试非流式 invoke。
* 使用 LobeHub 作为架构参考；本切片只迁移必要的模式和小型分类逻辑，不引入完整 LobeHub runtime 包。

## Acceptance Criteria

* [ ] `POST /api/ai/invoke` 可通过 `apps/api` 调到 `apps/ai-gateway` 并返回真实模型文本。
* [ ] OpenAI-compatible provider 可以完成非流式 Chat Completions 调用。
* [ ] Anthropic provider 可以完成非流式 Messages API 调用。
* [ ] OpenAI provider 可按 request format 使用 Responses API 调用并解析输出文本。
* [ ] 超时/5xx/429/network error 可触发 fallback，并在 response attempts 中体现。
* [ ] 鉴权失败、缺少 credential、模型不存在、invalid request 不会无限 fallback。
* [ ] 成功、失败、降级调用都会进入 usage store；usage 页面默认统计真实 invoke。
* [ ] 错误分类可用于后续状态监控，且响应不泄漏密钥或堆栈。
* [ ] `DICHA_SUPER_ADMIN_EMAILS` 可配置超级管理员邮箱；匹配用户登录后获得 `isSuperAdmin: true`，普通用户不可见内部测试页且直接访问会被拦截。
* [ ] 超级管理员可在 `/settings/ai-invoke-demo` 发起真实非流式 invoke，查看文本、attempts、token、费用和降级状态。
* [ ] shared、api、ai-gateway typecheck 通过；关键分类/attempt 构造逻辑有 focused tests 或等价验证。

## Technical Approach

* Contract:
  * Extend `AiProviderRequestFormatSchema` to include `openai_responses` and `anthropic_messages`.
  * Add `AiInvokeRequestSchema`, `AiInvokeResponseSchema`, `AiInvokeAttemptSchema`, `AiInvokeErrorCategorySchema`.
  * Add `aiContract.invoke` as `POST /ai/invoke`.
* Gateway:
  * Add `InvokeModule` with controller guarded by `InternalTokenGuard`.
  * `InvokeService` resolves catalog + attempt list, dispatches to format-specific adapters, classifies errors, records usage through `UsageStore`.
  * Use `AbortController` timeout per attempt; default can be conservative for MVP.
  * Estimate cost from `AiModel.pricing.inputPerMillionTokens/outputPerMillionTokens` when present, otherwise record `0`.
* API:
  * Add ts-rest handler in `AiGatewayController` and forwarding method in `AiGatewayService`.
  * Add app-owned current user endpoint at `GET /api/account/me`; do not use `/api/auth/me` because Better Auth owns `/api/auth/*`.
* Web:
  * Change `authQueryOptions()` to consume `contract.account.getMe` so route context includes server-derived `isSuperAdmin`.
  * Add admin-only `/settings/ai-invoke-demo` page guarded by route `beforeLoad`.
* Provider formats:
  * `openai_compatible`: `POST /chat/completions`, parse `choices[0].message.content`, `usage.prompt_tokens`, `usage.completion_tokens`.
  * `openai_responses`: `POST /responses`, parse `output_text` or text output content blocks, `usage.input_tokens`, `usage.output_tokens`.
  * `anthropic_messages`: normalize base URL, `POST /messages`, parse `content[].text`, `usage.input_tokens`, `usage.output_tokens`.

## Decision (ADR-lite)

**Context**: LobeHub has a mature runtime abstraction with provider-specific factories, router fallback and structured runtime error taxonomy. Dicha currently has catalog/config/usage but no real invoke path.

**Decision**: Implement a Dicha-native lightweight invoke runtime using LobeHub's architecture as reference: thin BFF route, gateway-owned runtime/adapters, ordered attempts, retryability classification, and usage lifecycle recording. Do not port the full LobeHub runtime package in this slice.

**Consequences**: We get a small real call path quickly while keeping the API shape open for later full runtime extraction. Advanced features such as streaming, tool calling, media payloads, queueing, circuit breaker windows, and complete LobeHub error taxonomy remain deferred.

## Definition Of Done

* Trellis implement/check context files reference the relevant backend/frontend/shared specs and LobeHub research artifact.
* Shared contract, API BFF, and AI Gateway invoke path implemented.
* Typecheck passes for `@dicha/shared`, `@dicha/api`, and `@dicha/ai-gateway`.
* Usage recording is verified by code path or focused test.
* Any copied/adapted LobeHub logic has source attribution when non-trivial.

## Out Of Scope

* Streaming SSE/chunk protocol.
* Tool calls/function calling.
* Vision/audio/video payloads.
* Periodic probes and 90m/24h/7d availability matrix.
* Circuit breaker state persistence.
* Queue/async long tasks.
* Official Dicha AI credits billing and platform credential injection.
* Full LobeHub model-runtime package port.
