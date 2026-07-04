# Research: LobeHub model runtime and routing patterns

## Source

- Local reference repo: `/Users/xiaomengdao/WebstormProjects/lobehub`
- Branch inspected: `canary`
- License / authorization: LobeHub is MIT and ROYIANS confirmed direct reuse is authorized. Keep source attribution when copying substantial logic.

## Files Inspected

- `src/app/(backend)/webapi/chat/[provider]/route.ts`
- `src/app/(backend)/webapi/models/[provider]/route.ts`
- `src/app/(backend)/webapi/models/[provider]/pull/route.ts`
- `packages/model-runtime/src/core/ModelRuntime.ts`
- `packages/model-runtime/src/core/RouterRuntime/createRuntime.ts`
- `packages/model-runtime/src/runtimeMap.ts`
- `packages/model-runtime/src/core/openaiCompatibleFactory/index.ts`
- `packages/model-runtime/src/providers/openai/index.ts`
- `packages/model-runtime/src/core/anthropicCompatibleFactory/index.ts`
- `packages/model-runtime/src/core/anthropicCompatibleFactory/handleAnthropicError.ts`
- `packages/model-runtime/src/errors/specs.ts`
- `packages/model-runtime/src/errors/classifier.ts`
- `packages/model-runtime/src/utils/isNonRetryableRequestError.ts`
- `src/routes/(main)/settings/provider/features/customProviderSdkOptions.ts`
- `src/routes/(main)/settings/provider/features/ProviderConfig/UpdateProviderInfo/normalizeProviderSettings.test.ts`

## Key Observations

### Thin HTTP routes

LobeHub keeps route handlers thin. `webapi/chat/[provider]` authenticates, resolves workspace, initializes a model runtime from DB, parses the request body, then calls `modelRuntime.chat(data, { user, signal, trace... })`. It catches runtime errors and maps them through a shared error response helper. The route does not know provider payload details.

For Dicha, this maps to:

- `apps/api` remains a thin authenticated BFF.
- `apps/ai-gateway` owns provider runtime construction, invoke attempts, fallback, error classification, and usage recording.
- Shared ts-rest contracts define request/response shapes.

### Runtime wrapper plus provider-specific factories

LobeHub has a `ModelRuntime` wrapper around concrete provider runtimes. The wrapper supports hooks such as `beforeChat`, `onChatError`, and `onChatFinal`. Concrete providers come from a `providerRuntimeMap`.

For Dicha MVP, copying the full runtime package would be too large for the first invoke slice. The useful pattern is the shape:

- An invoke service builds an ordered attempt list from use-case assignment.
- Each attempt is dispatched to a provider adapter selected by provider request format.
- Lifecycle data is captured once around the attempt, then recorded as usage.

### Router runtime fallback

LobeHub's router runtime accepts an ordered list of router options. It tries candidates in order, records route-attempt metadata, and supports `shouldStopFallback`. It also has `isNonRetryableRequestError` to stop fallback for request-shape problems.

For Dicha MVP:

- Try primary model first, then fallback model ids in assignment order.
- Stop fallback for user/config/request errors: missing credential, invalid API key, permission denied, model not found, context/request invalid, content safety rejection.
- Continue fallback for transient/provider errors: timeout, 408, 409, 423, 425, 429, 5xx, network unavailable.
- Return attempt summaries without secrets or raw upstream stack traces.

### OpenAI-compatible and Responses API

LobeHub routes OpenAI-compatible providers through `createOpenAICompatibleRuntime`. OpenAI's own provider can switch to Responses API based on model or explicit setting. Provider settings expose `supportResponsesApi`; tests show it is allowed for `openai` and router-like sdk types, not for `anthropic`.

For Dicha MVP:

- Add a request-format discriminator beyond the current `openai_compatible`.
- Use `openai_compatible` for `/chat/completions`.
- Use `openai_responses` for `/responses`.
- Keep Responses API opt-in per provider/config; do not infer it for Anthropic.

### Anthropic Messages API

LobeHub uses a separate `anthropicCompatibleFactory`, not an OpenAI-compatible shim. It converts OpenAI-like internal messages into Anthropic Messages payloads, handles system messages separately, normalizes base URLs by stripping `/v1/messages`, sends Anthropic beta/default headers, and converts Anthropic stream/usage back to internal shape.

For Dicha MVP:

- Add `anthropic_messages` request format.
- Convert a simple internal message list into `{ system?, messages, max_tokens, model }`.
- Use `/messages` under an Anthropic base URL normalized to avoid duplicate `/v1/messages`.
- Extract text from Anthropic `content[].text` and usage from `usage.input_tokens/output_tokens`.

### Error taxonomy

LobeHub maintains a structured runtime error spec with categories, severity, retryability, attribution, and stable numeric identifiers. It distinguishes auth, quota, capacity, request/model, safety, network, and fallback catch-all buckets.

For Dicha MVP, a smaller enum is enough:

- `auth`
- `config`
- `quota`
- `rate_limit`
- `provider_unavailable`
- `timeout`
- `network`
- `model_not_found`
- `context_limit`
- `content_safety`
- `invalid_request`
- `unknown`

The category controls fallback and usage reporting. The response should include categories and high-level messages, never secrets or stack traces.

## Recommended Dicha MVP

Implement a non-streaming invoke endpoint first:

- Shared contract: `POST /ai/invoke`
- Request: `{ useCase, messages, modelId?, fallbackModelIds?, responseFormat?, maxTokens?, temperature? }`
- Response: selected model/provider, output text, usage, estimated cost, latency, and sanitized attempt summaries.
- Gateway service: build attempt list from catalog assignment; optionally allow explicit `modelId` for tests/internal callers.
- Adapters:
  - OpenAI-compatible Chat Completions via `POST {baseUrl}/chat/completions`
  - OpenAI Responses via `POST {baseUrl}/responses`
  - Anthropic Messages via `POST {baseUrl}/messages`
- API BFF: authenticated ts-rest handler forwards user id to AI Gateway.
- Usage: record only real `invoke` events; probe remains out of scope.

## Out Of Scope For This Slice

- Streaming SSE.
- Tool calls / function calling.
- Vision/media payloads.
- Automatic periodic probes.
- Circuit breaker state windows.
- Queue / async long tasks.
- Official Dicha AI platform credits billing.
- Full LobeHub runtime package port.

## Implementation Notes

- Keep gateway implementation dependency-light by using `fetch` for the first slice. Full SDK packages can be introduced later if runtime complexity grows.
- Add source comments if copying any non-trivial LobeHub function body. For this MVP, prefer adapting the architecture and small error-classification patterns instead of copying large runtime code.
- Use current `UsageStore.recordEvent()` for call logging and current model `pricing` metadata for estimated cost when available.
