# AI Gateway 流式调用能力

## Goal

Add first-class streaming AI invocation so official DicHA AI and user-owned providers can return tokens incrementally through the gateway, while preserving channel degradation, usage logging, and credit settlement semantics. The stream should be consumable by both the foreground web app and the admin app.

## What I Already Know

- The previous gateway hardening task introduced invoke adapters, official DicHA multi-channel degradation, `upstreamRequestId`, and usage/billing snapshots.
- Current runtime is non-streaming only:
  - Web calls `invokeAi()` -> ts-rest `POST /ai/invoke`.
  - API forwards JSON to AI Gateway `POST /invoke`.
  - AI Gateway adapters call upstream with `stream: false`.
- Current supported request formats are:
  - `openai_compatible`
  - `openai_responses`
  - `anthropic_messages`
- Credit accounting already requires:
  - official DicHA calls use `platform_credits`;
  - BYOK/custom provider calls do not debit DicHA credits;
  - normal users do not see official real CNY/USD costs;
  - usage logs retain internal provider/channel snapshots.
- Frontend has an existing super-admin AI invoke demo page at `apps/web/src/features/settings/ai-invoke-demo-page.tsx`.
- Admin currently has DicHA service and usage analytics pages, but no admin invoke demo page.

## Assumptions

- Streaming should be added as a parallel API path, not by replacing the existing non-streaming `invoke`.
- The first streaming MVP should focus on text-only chat-style output for the same three request formats already supported.
- Native browser `EventSource` is not suitable because we need POST body, authenticated cookies/headers, abort, and request validation.
- The stable product contract should use DicHA-owned stream event names instead of leaking raw OpenAI/Anthropic stream event formats.

## Research References

- [`research/streaming-protocol-and-settlement.md`](research/streaming-protocol-and-settlement.md) — recommends `POST + text/event-stream`, fetch-based SSE parsing, gateway-side text/usage accumulation, and final settlement after stream completion.
- [`../archive/2026-07/07-04-ai-gateway-hardening/prd.md`](../archive/2026-07/07-04-ai-gateway-hardening/prd.md) — previous adapter/routing hardening baseline.
- [`../archive/2026-07/07-04-ai-credit-system/research/new-api-ai-gateway-design.md`](../archive/2026-07/07-04-ai-credit-system/research/new-api-ai-gateway-design.md) — New API relay lifecycle, streaming settlement, token estimation, and logging takeaways.

## Recommended MVP Direction

Use `POST + text/event-stream` end to end:

- Web/admin public endpoint: `POST /api/ai/invoke/stream` or contract-equivalent API route.
- API BFF validates session and request body, then forwards to AI Gateway `POST /invoke/stream`.
- AI Gateway performs the same orchestration as non-streaming:
  - build attempts;
  - validate model/provider/credential/channel;
  - precheck credits for official DicHA;
  - call adapter stream;
  - retry/degrade before a stream has started when a retryable channel fails;
  - settle and record usage only after final successful stream completion.
- Frontends consume a shared `invokeAiStream()` helper that parses SSE frames and exposes callbacks/state for token updates, final summary, errors, and abort.
- User-facing and admin test UI should default to streaming only. The existing non-streaming endpoint stays available at the API/code level for compatibility and regression comparison, but does not need a visible UI toggle in this MVP.

## Requirements

### Backend / Shared Contract

- Add shared stream event schemas and types:
  - `start`
  - `attempt`
  - `delta`
  - `final`
  - `error`
- Add `stream?: boolean` or a separate stream body schema only if needed; the preferred transport is a separate route so existing JSON invoke remains unchanged.
- Add API BFF endpoint for streaming invoke.
- Add AI Gateway internal streaming endpoint protected by the same internal token/user-scope headers.
- Use `text/event-stream` headers:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- Never expose secrets, Authorization headers, raw upstream stack traces, prompt bodies, or raw upstream error objects in stream events.

### Gateway Adapter Layer

- Extend `InvokeAdapter` with `stream(context)` for current text formats.
- Implement streaming adapters for:
  - OpenAI-compatible Chat Completions SSE;
  - OpenAI Responses SSE;
  - Anthropic Messages SSE.
- Each adapter should:
  - construct upstream stream payload;
  - parse upstream event frames;
  - yield normalized DicHA stream deltas;
  - accumulate response text;
  - return final token usage and upstream request id when available;
  - estimate usage if upstream omits usage and mark `usageEstimated: true` through the existing service logic.

### Gateway Orchestration / Settlement

- Keep existing non-streaming invoke behavior compatible.
- Official DicHA streaming calls must precheck credits before upstream.
- Debit credits and record `AiUsageEvent` only after a successful final stream.
- If a retryable channel fails before any user-visible stream chunk, try the next compatible channel and emit safe `attempt` metadata.
- Once user-visible streaming has begun, do not switch channels mid-answer in MVP; surface a sanitized `error` event if the stream fails.
- Client abort in MVP should stop upstream work and record a sanitized failure/interruption diagnostic without debiting credits unless a final success was reached.
- Final stream event should include an `AiInvokeResponse`-compatible summary for callers that need the same data as non-streaming invoke.

### Frontend Web

- Add `invokeAiStream()` helper in `apps/web/src/api/ai.ts` or nearby utility.
- Update the existing AI invoke demo page to support streaming mode:
  - show tokens as they arrive;
  - show running/cancel state;
  - show final attempts/usage/credits when complete;
  - use streaming as the default UI behavior without a visible non-streaming toggle.
- Preserve current design rules: compact dashboard/tool UI, restrained rounded corners, no large decorative hero sections.

### Admin

- Add admin-facing streaming test surface or reuse a small panel in an AI admin page.
- Admin stream test should call official DicHA path and display:
  - live text;
  - final status;
  - attempts/degradation;
  - request id/upstream request id when available;
  - usage/credits.
- Do not show raw prompts or response body in admin logs beyond the current active test output; persistent admin logs remain metadata-only.

## Acceptance Criteria

- [ ] Existing `POST /ai/invoke` non-streaming behavior still works.
- [ ] Web can start a streaming AI invoke and render incremental text.
- [ ] Web can cancel a running stream.
- [ ] Admin can start a streaming AI invoke and render incremental text.
- [ ] OpenAI-compatible streaming works against an SSE response.
- [ ] OpenAI Responses streaming works against an SSE response.
- [ ] Anthropic Messages streaming works against an SSE response.
- [ ] Official DicHA streaming succeeds through an enabled internal channel.
- [ ] Retryable pre-stream channel failure can degrade to a second channel.
- [ ] Successful official streaming records one usage event and one credit debit.
- [ ] BYOK/custom streaming records usage diagnostics without DicHA credit debit.
- [ ] Stream final event includes a response summary compatible with non-streaming usage/attempt display.
- [ ] Client abort does not create a misleading successful/debited usage event.
- [ ] Typecheck, lint, focused tests, and relevant builds pass.

## Definition Of Done

- Shared stream event contract added and covered by typecheck/tests where appropriate.
- Gateway stream adapters implemented and unit-tested with representative SSE fixtures.
- Gateway orchestration tests cover success, pre-stream degradation, usage settlement, and abort/failure semantics.
- API BFF streaming endpoint implemented and verified.
- Web demo updated with streaming UI and cancel support.
- Admin streaming test surface implemented.
- Usage/credit behavior remains aligned with `.trellis/spec/backend/ai-catalog.md`.
- Run local pnpm checks with `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm`.

## Out Of Scope

- Public OpenAI-compatible relay API for third-party clients.
- WebSocket/realtime API.
- Tool calls, multimodal streaming, image/audio/video streams.
- Partial-stream credit settlement after client abort.
- Automatic channel health scoring or auto-ban based on stream failures.
- Persisting prompt/response bodies in admin logs.

## Technical Notes

- Gateway files likely touched:
  - `apps/ai-gateway/src/modules/invoke/invoke.controller.ts`
  - `apps/ai-gateway/src/modules/invoke/invoke.service.ts`
  - `apps/ai-gateway/src/modules/invoke/adapters/*`
  - `apps/ai-gateway/src/modules/usage/usage.store.ts` only if metadata needs expansion.
- API files likely touched:
  - `apps/api/src/modules/ai-gateway/ai-gateway.controller.ts`
  - `apps/api/src/modules/ai-gateway/ai-gateway.service.ts`
- Shared files likely touched:
  - `packages/shared/src/contracts/ai.contract.ts`
- Web files likely touched:
  - `apps/web/src/api/ai.ts`
  - `apps/web/src/features/settings/ai-invoke-demo-page.tsx`
- Admin files likely touched:
  - `apps/admin/src/api/admin.ts` or shared API client setup
  - a new or existing admin AI test route.

## Decisions

- Streaming is the default UI behavior for both web and admin test surfaces.
- Non-streaming invoke remains available as a backend/API compatibility path, but the MVP UI does not need a streaming/non-streaming toggle.
