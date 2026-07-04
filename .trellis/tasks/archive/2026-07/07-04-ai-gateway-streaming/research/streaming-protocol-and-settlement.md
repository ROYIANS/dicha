# AI Gateway Streaming Protocol And Settlement Research

## Scope

Reviewed the current DicHA AI Gateway non-streaming invoke path, API BFF forwarding layer, frontend demo page, admin analytics pages, plus local reference implementations in New API and LobeHub.

## Current DicHA State

- `packages/shared/src/contracts/ai.contract.ts` exposes only `contract.ai.invoke` as `POST /ai/invoke` with a JSON response.
- `apps/api/src/modules/ai-gateway/ai-gateway.service.ts` forwards authenticated calls to the internal gateway with `fetch()` and validates JSON with zod.
- `apps/ai-gateway/src/modules/invoke/` now has non-streaming invoke adapters for:
  - `openai_compatible`
  - `openai_responses`
  - `anthropic_messages`
- `InvokeService` already owns orchestration, official DicHA channel degradation, credit precheck/settlement, usage event recording, and user-facing cost masking.
- `apps/web/src/features/settings/ai-invoke-demo-page.tsx` is non-streaming and renders the final `AiInvokeResponse`.
- Admin currently has DicHA usage analytics and logs, but no admin invoke demo page.

## Reference Findings

### New API

- Streaming responses are served as `text/event-stream` with no-cache, keep-alive, chunked transfer, and `X-Accel-Buffering: no`.
- Stream handlers read upstream SSE line-by-line, forward chunks, track first-response timing, collect response text, and compute usage from upstream stream usage or fallback text estimation.
- Stream status is explicit: normal `done`/`eof`, timeout, client disconnect, scanner error, panic, ping failure, etc.
- Billing settlement happens after stream completion. Failed/interrupted streams are not blindly treated as successful full calls; stream end reason is part of operational metadata.
- OpenAI-compatible channels request stream usage when supported (`stream_options.include_usage`) and otherwise estimate from collected output text.

### LobeHub

- Client streaming uses a fetch-based SSE helper rather than native `EventSource`.
- This is important because native `EventSource` cannot send a POST body or arbitrary auth headers; fetch-based SSE supports `POST`, headers, abort signals, and custom response validation.
- Client code parses event-stream bytes into messages and updates transient streaming state incrementally.

## Recommended DicHA Direction

Use `POST + text/event-stream` for both web and admin consumers:

- API public endpoint: `POST /ai/invoke/stream`
- API forwards to AI Gateway internal endpoint: `POST /invoke/stream`
- Gateway returns SSE frames with JSON payloads.
- Web/admin call the API endpoint with `fetch`, parse SSE frames from `ReadableStream`, and use `AbortController` for cancellation.
- Do not use native `EventSource` for this task because the invoke request needs JSON body and authenticated session credentials.

## Proposed Event Shape

Use Dicha-owned event names instead of directly exposing upstream raw provider events:

- `start`: request id, target provider/model, request format, attempt metadata that is safe for the user.
- `delta`: text chunk.
- `attempt`: attempt failure/degradation metadata when a retryable channel fails before the successful stream begins.
- `final`: final `AiInvokeResponse`-compatible summary, usage, credit amount, attempts, degraded status, and generated text.
- `error`: sanitized failure payload with category/message and attempts.

This keeps upstream-specific SSE formats behind adapters and gives frontend/admin one stable streaming contract.

## Settlement Notes

- Official DicHA calls must still precheck credits before opening an upstream stream.
- Credit debit and `AiUsageEvent` insertion should happen only after stream completion and final usage calculation.
- If upstream stream includes usage, use it.
- If upstream stream omits usage, estimate prompt/completion tokens from request text and accumulated streamed text, mark `usageEstimated: true`, and settle through the same `CreditStore` path used by non-streaming calls.
- If the client aborts after partial text, MVP should record a failure/interrupted usage diagnostic without charging credits unless the stream reached a final successful frame. This avoids surprising charges while the settlement semantics are still young.
- Future policy can add partial-stream settlement after explicit product decision.

## Implementation Notes For DicHA

- Add `InvokeAdapter.stream(context)` alongside `invoke(context)`.
- Keep non-streaming behavior unchanged.
- Add a small gateway SSE writer/encoder utility with headers and JSON event frames.
- Add a shared `AiInvokeStreamEventSchema` in `packages/shared` so web/admin parse the same contract.
- API BFF streaming endpoint should not use ts-rest response validation for the stream body; validate request body at entry, then pipe frames from gateway to the Express response.
- User-facing stream events must not expose upstream secrets, raw headers, prompt body, raw upstream error objects, or official cost amounts.
- Admin can inspect final usage logs through the existing analytics/log pages after the stream completes.

