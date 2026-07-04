# New API AI Gateway Design Research

## Scope

Reviewed `/Users/xiaomengdao/WebstormProjects/new-api` for its AI invocation architecture, especially the full request lifecycle around routing, provider/channel abstraction, request conversion, streaming, token accounting, billing settlement, usage logs, and operational degradation.

This research complements `new-api-billing.md`, which focuses only on quota and pricing.

## High-Level Architecture

New API is a mature AI relay/gateway. Its core flow is:

```text
incoming OpenAI/Claude/Gemini-compatible request
  -> route format detection
  -> request validation and body reuse
  -> relay info generation
  -> optional sensitive-word check
  -> prompt/token estimation
  -> model price / quota pre-estimation
  -> quota pre-consume
  -> channel selection / retry loop
  -> provider adaptor request conversion
  -> upstream request
  -> stream or non-stream response handling
  -> actual token extraction or fallback token estimation
  -> quota settlement/refund
  -> consume/error log
```

Relevant files:

- `controller/relay.go`
- `middleware/distributor.go`
- `relay/common/relay_info.go`
- `relay/relay_adaptor.go`
- `relay/channel/adapter.go`
- `relay/channel/api_request.go`
- `relay/responses_handler.go`
- `relay/channel/openai/*`
- `relay/channel/claude/*`
- `relay/channel/gemini/*`
- `relay/helper/price.go`
- `service/billing_session.go`
- `service/quota.go`
- `service/tiered_settle.go`
- `service/log_info_generate.go`
- `model/log.go`
- `service/token_counter.go`
- `service/relayconvert/*`

## Request Entry And Format Support

New API exposes and normalizes many public API shapes:

- OpenAI Chat Completions
- OpenAI Responses and Responses Compact
- OpenAI Realtime over WebSocket
- Anthropic Claude Messages
- Google Gemini
- Images, image edits, audio, embeddings, rerank
- Async task-style routes such as video/music/Midjourney/Suno

The route handler maps the incoming route to a relay mode, then dispatches to mode-specific helpers. Text requests go through `TextHelper`; Responses uses `ResponsesHelper`; media and async tasks have their own paths.

### Takeaway For DicHA

Our current AI Gateway is intentionally smaller. It supports the internal invoke contract and three text request formats:

- `openai_compatible`
- `openai_responses`
- `anthropic_messages`

For the credit-system MVP, this is enough. However, if DicHA wants to become a public or semi-public AI gateway later, we should add a first-class `requestKind` / `relayMode` dimension rather than forcing every invocation through a single text-only shape.

## RelayInfo As Request Context

New API centralizes runtime request state in `RelayInfo`. It contains:

- user/token/group context
- original model name and upstream model name
- chosen channel metadata
- request format and conversion chain
- stream state
- token estimates
- pricing data
- billing session fields
- request id
- response timing including first-response latency
- admin/debug metadata

This object is the connective tissue between routing, billing, conversion, streaming, and logging.

### Takeaway For DicHA

Our equivalent state is currently scattered across `InvokeService`, `CatalogStore`, `UsageStore`, and shared response DTOs. For MVP, we do not need to introduce a massive `RelayInfo` object, but we should introduce a smaller `InvokeContext` / `BillingContext` when adding credits. It should freeze:

- owner/user id
- use case
- public DicHA provider/model id
- chosen upstream internal provider/model/channel id
- request format
- token estimate
- pricing snapshot
- active credit rule snapshot
- request id
- stream flag once streaming exists

This snapshot should be stored with `AiUsageEvent` and/or credit ledger entries so later model-price edits do not mutate historical accounting.

## Channel Selection And Degradation

New API has a dynamic channel selector. Channel selection considers:

- requested model
- user group / auto group
- request path
- channel priority
- specific channel affinity
- retry index
- channel status
- channel auto-ban behavior
- multi-key channels

On failures, New API decides whether to retry based on:

- explicit skip-retry errors
- status code retry policy
- remaining retry count
- specific-channel pinning
- channel-affinity failure rules
- auto-disable policies

### Current DicHA State

DicHA currently builds an ordered list of attempts from:

- explicit `modelId`
- assignment primary model
- request fallback ids
- assignment fallback ids

For `platform_managed` DicHA official calls, `CatalogStore.getSystemProviderChannel()` resolves an enabled internal model/channel. The internal-provider path already supports multiple internal providers and multiple mapped DX models, but routing is still simple:

- `AiInternalProviderModel` is selected by `dxModelId`
- enabled internal provider/model only
- ordered by `dxSortOrder`, provider `priority`, then `updatedAt`

### Takeaway For DicHA

For this credit task, implement credit charging around the existing routing model. Do not rebuild New API's full dynamic scheduler yet.

But the credit ledger must snapshot the chosen internal channel because future degradation will mean:

- the same public DX model can be served by different upstream providers;
- each upstream provider may have a different cost;
- the user's credit debit should be reproducible from the snapshot, not from current admin config.

## Provider Adaptor Model

New API defines a broad adaptor interface:

- initialize request context
- construct request URL
- set headers
- convert OpenAI, Claude, Gemini, image, audio, embedding, rerank, and Responses requests
- execute upstream request
- parse upstream response
- provide model list and channel name

Examples:

- OpenAI adaptor handles OpenAI-compatible, Azure URL rules, OpenRouter headers, Realtime, Responses, image, audio, and reasoning/thinking variants.
- Claude adaptor converts OpenAI requests to Claude Messages and handles Anthropic headers.
- Gemini adaptor converts OpenAI/Claude-style requests to Gemini, including image and embedding endpoint differences.

### Current DicHA State

DicHA has a much narrower adapter concept:

- `ProviderAdapter` only defines `listModels()` and `probe()`.
- `InvokeService` itself contains the actual upstream invocation logic for OpenAI Chat, OpenAI Responses, and Anthropic Messages.

### Takeaway For DicHA

For MVP, keep the current `InvokeService` if we only implement text invoke charging. But we should avoid expanding `InvokeService` indefinitely. A near-term follow-up should introduce a real `InvokeAdapter` interface:

```text
adapter.invoke(context) -> text/usage/headers/errors
adapter.stream(context) -> stream events + final usage
adapter.listModels(context)
adapter.probe(context)
```

This would align DicHA with New API and LobeHub-style provider abstraction without copying the whole relay surface.

## Request Conversion

New API invests heavily in request conversion:

- OpenAI Chat -> OpenAI Responses
- OpenAI Responses -> Chat
- OpenAI -> Claude
- Claude -> OpenAI
- OpenAI/Claude -> Gemini

It records the request conversion chain for logs/admin diagnostics. Conversion is policy-controlled, so only specific channels/models are rewritten.

### Current DicHA State

DicHA's internal request is already simpler: `AiInvokeRequest.messages` is converted directly into the selected provider's request format. There is no public API compatibility layer and no conversion-chain logging.

### Takeaway For DicHA

Credit-system MVP does not need a full conversion layer. But usage logs should record `requestFormat` and chosen upstream channel. If/when conversion is introduced, a `conversionChain` field should be added to usage metadata, mirroring New API's diagnostics.

## Streaming Design

New API supports streaming for OpenAI-style SSE, OpenAI Responses streams, Claude streams, Gemini streams, and Realtime WebSocket.

Important details:

- stream handlers forward data while also collecting enough text/usage for settlement;
- if upstream returns usage in stream events, it uses that;
- if usage is missing, it estimates completion tokens from accumulated output text;
- stream status and errors are included in admin-only log metadata;
- SSE ping keepalive is supported for long streams;
- streaming request lifecycle still settles billing at the end.

### Current DicHA State

DicHA currently invokes non-streaming upstream calls:

- OpenAI Chat uses `stream: false`
- OpenAI Responses uses `stream: false`
- Anthropic uses non-streaming Messages

### Takeaway For DicHA

Streaming is desirable, but it is a separate slice from credit MVP. To avoid incorrect billing:

- do not expose official DicHA streaming until settlement can happen after final usage;
- when streaming is added, use a billing session with pre-reserve + final settle/refund;
- store stream status in admin-only metadata, not normal user-facing reports.

## Token Estimation And Actual Usage

New API estimates prompt tokens before upstream invocation for pre-consume. It supports:

- text token counting
- image token estimation
- audio token estimation
- cache tokens
- provider-specific usage semantics
- fallback completion-token estimation from response text

Then it reconciles estimated usage against actual upstream usage during settlement.

### Current DicHA State

DicHA currently records only upstream-reported usage fields:

- OpenAI Chat: `usage.prompt_tokens` and `usage.completion_tokens`
- Responses: `usage.input_tokens` and `usage.output_tokens`
- Anthropic: `usage.input_tokens` and `usage.output_tokens`

If upstream omits usage, DicHA records zero tokens and zero cost.

### Takeaway For DicHA

For credit MVP, we should not block on building full tokenizer/media estimation. However, official DicHA billing must handle missing usage deliberately:

- either reject/mark the channel as misbehaving when official upstream returns no usage;
- or use a conservative token estimate and mark `usageEstimated: true`;
- never silently debit zero credits for paid official calls unless the model/rule is configured as free.

Recommended MVP behavior:

- pre-check balance using a configurable minimum reserve or estimated max charge;
- settle with actual upstream usage when present;
- if usage is missing, record a warning and apply a configured minimum charge or fail the official call before release.

## Billing Lifecycle

New API has a formal billing session:

- pre-consume quota before upstream call;
- refund when the request fails before settlement;
- settle actual quota after usage is known;
- support wallet vs subscription funding source;
- freeze tiered billing snapshot before call;
- record log metadata with billing source, pre-consumed amount, post-settlement delta, model price, group ratio, and conversion information.

### Current DicHA State

DicHA currently calculates estimated CNY/USD cost in `InvokeService` and writes it to `AiUsageEvent`. It does not yet have:

- credit account
- credit ledger
- pre-consume
- final settle/refund
- insufficient-credit failure
- billing snapshots

### Takeaway For DicHA

This is the main part that should be included in the credit-system task. DicHA should implement a simpler New API-inspired lifecycle:

```text
official DicHA call
  -> resolve selected DX model and internal upstream channel
  -> build billing snapshot from DX pricing, internal cost, and active credit rule
  -> reserve/debit estimated credits or check minimum required balance
  -> call upstream
  -> compute actual credits from actual token usage
  -> atomically settle credit ledger and usage event
  -> refund/release if upstream fails
```

For BYOK/user providers:

```text
user provider call
  -> call upstream with user credential
  -> record tokens/latency/status
  -> no credit debit
  -> no DicHA cost shown to the user
```

## Logging And Privacy

New API logs rich operational metadata:

- request id
- upstream request id
- user id and token id
- model and channel id
- quota
- prompt/completion tokens
- latency
- stream flag
- group
- admin-only debug info

User-facing log formatting strips admin-only fields such as channel debug data, audit info, and stream internals.

### Current DicHA State

DicHA `AiUsageEvent` stores:

- owner id
- provider/model/use case/status
- tokens
- cost fields
- latency
- error category
- created at

It does not yet store:

- request id
- upstream request id
- upstream/internal channel id
- billing snapshot
- credit debit id
- stream status
- admin-only metadata

### Takeaway For DicHA

For this task, add request/ledger linking and minimal billing metadata. Prompt/response content should not be logged by default.

Recommended additions:

- `requestId`
- `upstreamRequestId` nullable
- `billingMode`: `platform_credits | user_provider`
- `creditLedgerEntryId` nullable
- `creditAmount` integer nullable/zero
- `usageEstimated` boolean
- `internalProviderId` nullable
- `internalProviderModelId` nullable
- `billingSnapshot` JSON
- indexes on `(ownerId, createdAt)`, `(providerId, createdAt)`, `(modelId, createdAt)`, `(requestId)`, and official-channel analytics dimensions

## Operational Controls

New API supports:

- auto-disabling bad channels;
- retry by status-code policy;
- header and parameter override;
- channel-specific proxy;
- request path compatibility checks;
- channel affinity;
- sensitive-word checks;
- quota notifications.

### Takeaway For DicHA

These are important but mostly future work. For the credit MVP, only include:

- sanitized upstream errors;
- insufficient-credit errors;
- channel selection snapshot;
- admin visibility into failed official calls.

Auto-ban, affinity, proxy, parameter override expansion, and policy-driven retry should be follow-up tasks.

## Gap Analysis Against Current DicHA System

### Already Reasonably Covered

- Database-backed AI catalog and usage events.
- User-owned provider config and system-managed DicHA provider split.
- Admin-managed internal providers and DX model mapping.
- Basic request formats: OpenAI Chat, OpenAI Responses, Anthropic Messages.
- Basic fallback/degraded status.
- CNY/USD internal cost fields.
- User-facing and admin-facing statistics can already diverge by contract.

### Missing For Credit MVP

- Credit account table and append-only ledger.
- Credit rule table and active rule snapshot.
- Admin issuance and redemption flows.
- Official DicHA invocation credit debit.
- Insufficient-credit handling before upstream call.
- Ledger/usage atomicity.
- Billing snapshot on usage/ledger rows.
- User-facing AI usage changed from estimated cost to credit consumption.
- BYOK calls excluded from credit/money accounting.
- Handling for missing upstream usage in official paid calls.

### Missing But Better As Follow-Up

- Full New API-style channel scheduler.
- Streamed official invoke with final settlement.
- Public OpenAI/Claude/Gemini-compatible gateway endpoints.
- Images/audio/embeddings/rerank/task billing.
- Token estimation for media and missing-usage responses.
- Tiered expression billing engine.
- Auto-ban and channel health degradation.
- Header/parameter override system.
- Subscription/payment integration.

## Recommended Task Scope

For `07-04-ai-credit-system`, keep implementation focused on:

- credit data model;
- admin credit pages and APIs;
- user credit page;
- user AI usage conversion to credits;
- official DicHA invoke credit debit;
- billing snapshots;
- BYOK no-charge behavior;
- minimal official usage logging improvements.

Do not include a full New API gateway rewrite in this task. Instead, document the future gateway direction and leave schema/contracts extensible enough for it.

## Proposed Future Gateway Tasks

1. `AI Gateway Adapter Layer`
   - Extract upstream invocation from `InvokeService` into provider invoke adapters.
   - Add conversion-chain and request-format metadata.

2. `Official Streaming Invoke`
   - Add SSE streaming for official DicHA calls.
   - Add pre-reserve and final settle/refund.
   - Add stream status admin logs.

3. `Channel Degradation Engine`
   - Add internal channel health, retry policy, auto-disable, and channel selection rules.

4. `Advanced Billing Rules`
   - Add tiered/cache/media billing rules inspired by New API billing expressions.

5. `Public Gateway Compatibility`
   - Add optional OpenAI/Claude/Gemini-compatible external API endpoints if DicHA becomes a relay service.
