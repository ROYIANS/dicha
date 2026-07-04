# AI Gateway 官方渠道能力强化

## Goal

Strengthen the DicHA AI Gateway so official DicHA AI can become a stable, reliable core capability rather than a thin invoke wrapper. The first phase should absorb the most valuable architectural lessons from New API and LobeHub without attempting a full relay rewrite: split provider invocation into adapters, formalize invoke context and routing policy, improve official channel degradation, and preserve billing/usage snapshots that keep the credit system correct.

## What I Already Know

- The credit-system MVP is complete and committed in `2eed811`.
- Payment is intentionally out of scope for now; credits are enough for internal testing and early official AI usage.
- The user wants the next priority to be AI core reliability, with New API and LobeHub as design references.
- Current DicHA gateway supports:
  - internal `ai.invoke` contract;
  - text-only non-streaming calls;
  - `openai_compatible`, `openai_responses`, and `anthropic_messages`;
  - official DicHA channels through `AiInternalProvider` / `AiInternalProviderModel`;
  - user BYOK/custom providers through persisted per-user catalog config;
  - credit precheck/debit for `billingMode: platform_credits`.
- Current `InvokeService` still owns too much:
  - attempt target construction;
  - credential/channel resolution;
  - request format selection;
  - OpenAI/Responses/Anthropic payload construction;
  - upstream HTTP execution;
  - response parsing;
  - error classification;
  - credit reserve/settlement;
  - usage event writing.
- Existing `ProviderAdapter` only covers model list/probe, not real invocation.
- Existing spec already captures several invoke contracts in `.trellis/spec/backend/ai-catalog.md`.

## Assumptions

- We should keep the public product surface small for this task: internal invoke first, not public OpenAI-compatible relay endpoints.
- We should not add payment, subscriptions, recharge packages, or invoices in this task.
- Streaming is important but should be either prepared carefully or implemented only after final settlement semantics are clear.
- No historical-data compatibility is required beyond preserving the integrity of the schema just committed.

## Requirements

### Phase 1 MVP

- Introduce an invocation boundary that is small enough to land safely:
  - `InvokeContext` or equivalent request-scoped object;
  - `InvokeAdapter` interface for upstream request execution and response parsing;
  - adapters for current text formats: OpenAI Chat Completions, OpenAI Responses, Anthropic Messages.
- Move provider-specific request/response logic out of `InvokeService`.
- Keep `InvokeService` responsible for orchestration only:
  - build attempt candidates;
  - resolve credentials/channels;
  - precheck credits;
  - call adapter;
  - classify retry/degradation;
  - settle usage and record logs.
- Strengthen official DicHA channel routing:
  - multiple internal providers/models for the same public DX model should be candidates;
  - retryable upstream failures should try another compatible enabled channel when available;
  - non-retryable failures such as invalid request/context limit/auth should stop or skip safely according to existing spec.
- Preserve and enrich usage/billing snapshots:
  - request id;
  - public provider/model id;
  - internal provider/model/channel id;
  - request format;
  - upstream model name;
  - token usage or estimate flag;
  - error category;
  - latency;
  - credit and real cost snapshots.
- Add focused gateway tests for routing, adapter parsing, retry/degradation, and credit non-regression.

### Strongly Consider

- Add first-response/phase timing fields if the structure is lightweight.
- Add admin-safe operational fields for upstream request tracking, but do not store prompt or response body in admin logs.
- Add a local `InvokeError` / `UpstreamError` type instead of using ad hoc thrown plain objects.

## Acceptance Criteria

- [ ] `InvokeService` no longer contains provider-specific HTTP payload builders for OpenAI Chat, OpenAI Responses, or Anthropic Messages.
- [ ] A shared adapter interface handles `invoke()` for current text request formats.
- [ ] Existing non-streaming AI invoke behavior remains compatible at the shared contract level.
- [ ] Official DicHA calls can retry another enabled internal channel/model for retryable failures.
- [ ] Official retry/degradation records attempts with clear status/error categories.
- [ ] BYOK/custom provider calls remain non-billed by DicHA credits.
- [ ] Official DicHA credit reserve/debit behavior remains correct after adapter extraction.
- [ ] Usage snapshots retain enough channel and billing data for future dynamic routing and streaming.
- [ ] Gateway tests cover adapter success parsing and at least one retry/degradation path.
- [ ] Typecheck, lint, tests, and builds pass for touched packages.

## Definition Of Done

- PRD and research references are updated.
- Gateway adapter/routing refactor is implemented.
- Shared contracts/specs updated if response or stored metadata changes.
- Focused tests cover routing, adapter parsing, retry categories, and credit preservation.
- `pnpm --filter @dicha/ai-gateway typecheck && pnpm --filter @dicha/ai-gateway lint && pnpm --filter @dicha/ai-gateway test && pnpm --filter @dicha/ai-gateway build`.
- `pnpm --filter @dicha/shared build` if contracts change.
- API/web/admin checks run if their contracts or UI are touched.

## Out Of Scope

- Payment integration.
- Full New API-style public OpenAI/Claude/Gemini relay endpoints.
- Images, audio, embeddings, rerank, realtime, async task relay.
- Full billing expression engine.
- Streaming response exposure unless the task explicitly narrows and completes final settlement semantics.
- Admin prompt/response body log viewer.

## Research References

- [`../archive/2026-07/07-04-ai-credit-system/research/new-api-ai-gateway-design.md`](../archive/2026-07/07-04-ai-credit-system/research/new-api-ai-gateway-design.md) — New API's relay lifecycle, adapter model, channel routing, streaming settlement, token estimation, and logging patterns.
- [`../archive/2026-07/07-04-ai-credit-system/research/new-api-billing.md`](../archive/2026-07/07-04-ai-credit-system/research/new-api-billing.md) — integer quota/credit accounting, model-price-derived settlement, and frozen billing snapshots.

## Technical Notes

- Current orchestration file: `apps/ai-gateway/src/modules/invoke/invoke.service.ts`.
- Current adapter skeleton: `apps/ai-gateway/src/modules/providers/provider-adapter.ts`.
- Current official channel resolver: `CatalogStore.getSystemProviderChannel()`.
- Current credit layer: `apps/ai-gateway/src/modules/credits/credit.store.ts`.
- Current usage persistence: `apps/ai-gateway/src/modules/usage/usage.store.ts`.
- Owning spec: `.trellis/spec/backend/ai-catalog.md`.

## Open Questions

- Should the first hardening slice include actual streaming support, or only prepare the adapter/context shape for streaming while keeping runtime non-streaming?

## Recommended Next Decision

Recommendation: keep this first hardening slice non-streaming, but design the adapter and context so `stream()` can be added next without rewriting settlement. Streaming is valuable, but the first win is lowering orchestration complexity and making official channel degradation reliable.
