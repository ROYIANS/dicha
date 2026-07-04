# Design and Implement AI Credit System

## Goal

Build the first complete DicHA credit system across admin, web, API, and AI Gateway. The system should let admins define credit rules, issue credits, inspect balances/ledgers, and let frontend users see credit balance, redeem credit codes, and understand official DicHA AI credit consumption without exposing the official channel's real upstream cost.

## What I Already Know

- Backend/admin should add credit-related menus and real management pages for:
  - credit rules;
  - credit issuance;
  - account balances;
  - credit ledger / transaction history.
- Frontend should update the current AI usage statistics page:
  - introduce credits as the user-facing consumption unit;
  - remove existing "estimated cost" displays;
  - show official DicHA AI credit consumption;
  - show credit consumption trends.
- Frontend should add a new credits page for the user:
  - display current credit balance;
  - provide a redemption-code entry point for future recharge / promotion flows.
- Two explicit non-goals from the user:
  - do not expose official AI channel real prices to normal users;
  - do not calculate cost for custom/user-owned providers. For BYOK/custom providers, record tokens, latency, model/provider and status only; users check cost on their own provider platforms.
- Existing spec already defines the product direction:
  - cost price (`CNY`/`USD`) -> credits -> user paid price;
  - credits are not a settlement currency and must not replace real cost fields;
  - official-channel admin analytics can see real CNY/USD cost, but user-facing views should not expose it.
- Existing admin sidebar already has a `积分与计费` section with planned items for `积分规则`, `积分发放`, `账户余额`, and `积分流水`.
- Existing frontend AI usage page currently uses `AiUsageReport` and displays calls, estimated USD cost, tokens, latency, RPM/TPM, trends, distributions, breakdowns, and recent events.
- Existing AI usage records are stored in PostgreSQL in `AiUsageEvent`.
- Existing `AiUsageEvent` records include token counts, latency, provider/model/useCase/status, `estimatedCostAmount`, `estimatedCostCurrency`, and `estimatedCostUsd`, but no credit consumption field yet.
- Existing database schema has no credit account, credit ledger, redemption code, credit rule, or credit issuance table.
- User initially considered mapping credits directly to tokens (`1 credit = 1 token` or `1 credit = 100 tokens`), then correctly identified the flaw: model prices differ, so credit consumption must be derived from model pricing/cost rules rather than raw token count alone.
- New API uses internal integer quota as the accounting primitive and converts real model prices into quota through `QuotaPerUnit`, model billing rules, group ratios, and settlement snapshots.
- User confirmed the current task should focus on the credit system first. New API's full relay/gateway capabilities should be deferred to later gateway-refactor tasks as long as this task preserves the right billing/routing snapshots so future changes are incremental.

## Assumptions

- This task can change schemas and contracts without historical migration compatibility because the project is still in early development.
- Credit values should be stored as integers in the smallest credit unit to avoid floating point balance drift. Display can convert to human-friendly decimal credits if needed.
- MVP should not define credits as a fixed number of tokens. Tokens are input variables to the billing formula; credits are the resulting accounting unit after applying model price, currency conversion, and optional platform markup.
- Official DicHA AI calls should create ledger records for credit debit. User-owned providers should not debit credits.
- In MVP, payment/recharge integration is out of scope; redemption codes and admin issuance are enough to create balance.
- In MVP, if a user has insufficient credits for an official DicHA AI call, the gateway should fail the official attempt with a sanitized credit/billing error rather than silently exposing upstream cost or falling through to paid official usage.

## Requirements

### Product Rules

- Normal users only see credit-based consumption for official DicHA AI.
- Normal users never see official upstream CNY/USD costs.
- Custom/user-owned providers are not billed by DicHA:
  - no cost calculation;
  - no credit consumption;
  - still record tokens, latency, calls, status, use case, provider/model for usage diagnostics.
- Admins can see real official-channel cost analytics separately from credit consumption analytics.
- The credit chain remains:
  - upstream cost price (`CNY`/`USD`) is an internal cost accounting field;
  - credit conversion is the user-facing consumption accounting field;
  - paid price / recharge packages are a product pricing layer.
- Recommended MVP accounting formula:
  - model billing price: configured per model as CNY/USD per 1M input/output tokens, plus later structured tier support;
  - raw charge amount: `(inputTokens * inputRate + outputTokens * outputRate) / 1_000_000`;
  - credit conversion: raw charge amount -> integer credits through active credit rule;
  - optional platform factor: markup/risk buffer/minimum charge can be added as explicit rule fields, not hidden constants.
- Historical usage/debit rows must preserve a billing snapshot so later rule edits do not rewrite old credit consumption.
- Keep future New API-style gateway migration low-cost by snapshotting enough invocation context now:
  - stable `requestId`;
  - public DicHA provider/model id;
  - selected internal provider/channel/model id when official DicHA is used;
  - request format;
  - pricing snapshot;
  - active credit rule snapshot;
  - usage/ledger linkage.

### Backend / Data Model

- Add database-backed credit tables, likely:
  - `CreditAccount`: one row per user, current balance.
  - `CreditLedgerEntry`: append-only credit transactions for grant, debit, redeem, adjustment, refund, expiry, etc.
  - `CreditRule`: platform credit conversion rules and active status.
  - `CreditRedemptionCode`: redeemable code, amount, status, expiry, max redemptions.
- Optional join/usage reference fields linking a debit ledger row to an AI usage event.
- Credit account balance must be derivable from ledger, but stored current balance is acceptable for fast reads if updates are transactional.
- Ledger writes and account balance changes must be atomic.
- Usage events and/or credit ledger rows must keep immutable billing/routing snapshots so later gateway work can add dynamic channels, adapter extraction, streaming, and advanced billing without rewriting historical accounting.
- AI official invocation should record:
  - real cost in `AiUsageEvent` for admin/internal analytics;
  - credit charge in the credit ledger / usage report for user-facing analytics.
- BYOK/custom provider invocation should record usage metadata with zero/no credit and no estimated user-facing cost.

### Admin

- Implement credit management pages under the existing `积分与计费` section.
- Minimum admin pages:
  - `积分规则`: define/edit/enable credit conversion rules.
  - `积分发放`: grant credits to users, with reason and optional expiry.
  - `账户余额`: list/search users and balances.
  - `积分流水`: inspect credit ledger entries, filter by user, type, date, source.
- Admin APIs must be super-admin only.
- Admin pages should use existing admin layout/style.

### Frontend User

- Update `AI 消费统计`:
  - rename/remove `估算费用`;
  - show `积分消耗` for official DicHA AI;
  - show credit consumption trend;
  - keep token, latency, RPM/TPM, status and recent event diagnostics.
  - for custom providers, show token/latency/calls but not money or credits.
- Add user-facing `积分` page:
  - show current balance;
  - show recent credit ledger;
  - include redemption code input.
- Add navigation entry for the credits page in the frontend settings/app navigation, following current UI conventions.

### API / Contract

- Add shared contracts for:
  - user credit balance/report;
  - redeem code;
  - user credit ledger;
  - admin credit rules;
  - admin credit issuance;
  - admin balance/ledger queries.
- Extend AI usage report contracts to support credit usage fields without exposing cost fields to normal users.
- Keep admin official usage contract able to show real CNY/USD cost.

## Acceptance Criteria

- [ ] Admin sidebar credit menus route to implemented pages rather than planned placeholders.
- [ ] Super admin can create/update/enable credit rules.
- [ ] Super admin can grant credits to a user and see the balance update.
- [ ] Super admin can inspect user balances and credit ledger entries.
- [ ] User can view credit balance and recent ledger entries.
- [ ] User can submit a redemption code and receive credits if valid.
- [ ] User AI usage statistics no longer display `估算费用`.
- [ ] User AI usage statistics show official DicHA AI credit consumption and trends.
- [ ] User-owned provider usage shows tokens/latency/calls but no DicHA cost/credit charge.
- [ ] Official DicHA AI invoke creates a usage event plus a corresponding credit debit ledger entry.
- [ ] Insufficient official AI credits are handled with a sanitized failure and no upstream call.
- [ ] Relevant Prisma generation, typecheck, lint, and focused tests pass.

## Definition of Done

- Prisma schema and generated clients updated.
- Shared contracts updated with zod/ts-rest schemas.
- API, AI Gateway, admin, and web build/typecheck.
- Focused unit/integration tests cover credit ledger balance updates, redemption validation, official usage debit, BYOK non-billing, and user/admin report separation.
- Specs updated for credit accounting contracts.
- No raw official upstream prices are exposed in user-facing web contracts or UI.

## Out Of Scope

- Real payment provider integration.
- Subscription packages.
- Invoices, tax, or legal payment records.
- Historical migration compatibility for old dev data.
- Charging user-owned/custom providers.
- Showing official upstream costs to normal users.
- Complex promotion engines beyond basic redemption code and admin issuance.
- New API-style full gateway rewrite in this task:
  - public OpenAI/Claude/Gemini-compatible relay endpoints;
  - streaming settlement;
  - media/audio/embedding/task billing;
  - full dynamic channel scheduler;
  - auto-ban, affinity, and policy-driven retry;
  - billing expression engine.

## Open Questions

- What should be the MVP credit unit and initial conversion rule?

## Research References

- [`research/new-api-billing.md`](research/new-api-billing.md) — New API stores integer quota and converts model prices to quota via `QuotaPerUnit`, billing expressions, group ratios, and frozen settlement snapshots.
- [`research/new-api-ai-gateway-design.md`](research/new-api-ai-gateway-design.md) — New API full AI relay design: request formats, channel routing, provider adaptors, streaming, token estimation, billing session, logs, and gap analysis against DicHA.

## New API Gateway Research Takeaways

- New API is more than a billing reference; it is a full AI relay architecture with route-mode detection, request conversion, channel selection, retry/degradation, streaming settlement, token estimation, quota pre-consume, and rich operational logs.
- DicHA's current gateway is a narrower internal invoke service. This is acceptable for the first credit-system MVP, but the credit ledger must snapshot enough routing and billing data so future multi-channel degradation does not break historical accounting.
- This task should absorb New API's billing lifecycle pattern:
  - pre-check or reserve credits before official upstream calls;
  - call upstream only when the user has enough credits;
  - settle against actual usage after the response;
  - refund/release on failure;
  - store immutable billing snapshots.
- This task should not absorb New API's entire relay surface:
  - public OpenAI/Claude/Gemini-compatible endpoints;
  - media/audio/embedding/task routes;
  - full channel scheduler;
  - auto-ban/affinity/policy retry;
  - stream settlement;
  - expression billing engine.
- Follow-up gateway tasks should extract an invoke adapter layer, add official streaming with final settlement, add channel degradation, and later add advanced tiered/media billing.

## Feasible Accounting Approaches

### Approach A: Price-Derived Integer Credits (Recommended)

- How it works:
  - Configure each DicHA model with billing price in CNY/USD per 1M input/output tokens.
  - Configure a global credit conversion rule such as `1 CNY = N credits` and `1 USD = M credits`, plus optional markup/minimum charge.
  - Runtime computes credits from actual token usage and model price.
- Pros:
  - Correctly handles different model prices.
  - Keeps credits detached from raw token count.
  - Easy to reconcile with real upstream cost and future paid packages.
  - Similar to New API's quota model, but simpler for MVP.
- Cons:
  - Requires clear rule naming so admins do not confuse cost price, credit price, and sale price.

### Approach B: Per-Model Credits Per Token

- How it works:
  - Each model directly stores input/output credits per token or per 1K tokens.
- Pros:
  - Easy to explain inside model config.
  - No currency conversion step during runtime.
- Cons:
  - Duplicates model price data and drifts from cost accounting.
  - Harder to reason about margin, recharge packages, CNY/USD costs, and tiered prices.
  - Requires reconfiguring every model if global credit valuation changes.

### Approach C: New API-Style Billing Expression Engine

- How it works:
  - Store model billing as expressions that can include tier conditions, cache/image/audio variables, request params, and versioning.
- Pros:
  - Most flexible and future-proof for complex AI gateway billing.
- Cons:
  - Too heavy for first MVP unless we already need tiered/cache/audio billing now.
  - Higher implementation and admin UX cost.

## Scope Decision Recommendation

Decision: keep this task focused on the credit/accounting MVP and official DicHA debit path. Add New API-inspired snapshots and extension points now, but defer broad gateway refactoring and streaming to follow-up tasks.

Reason:

- The current urgent product need is credit visibility, balance management, and official-channel charging.
- A full New API-style relay rewrite would touch routing, providers, streaming, request conversion, logging, billing, and admin operations at once.
- Billing snapshots and ledger design can be made compatible with future channel routing without implementing the full scheduler now.
- Streaming and media billing are easy to undercharge if added before settlement is designed; they deserve separate tasks.

Consequence:

- Future New API-style work should be additive if this task stores immutable request/billing/channel snapshots and links credit ledger entries to usage events.
- The likely future refactor path is:
  1. extract provider invoke adapters from `InvokeService`;
  2. add official streaming with pre-reserve/final-settle;
  3. add dynamic internal channel routing and health/degradation;
  4. add advanced tiered/media billing.

## Technical Notes

- Existing admin sidebar: `apps/admin/src/components/AdminShell.tsx`.
- Existing frontend AI usage page: `apps/web/src/features/settings/ai-usage-page.tsx`.
- Existing frontend AI usage i18n: `apps/web/src/i18n/locales/zh.ts`.
- Existing AI usage shared schemas: `packages/shared/src/contracts/ai.contract.ts`.
- Existing AI usage analytics: `apps/ai-gateway/src/modules/usage/usage.analytics.ts`.
- Existing AI usage storage: `apps/ai-gateway/src/modules/usage/usage.store.ts`.
- Existing Prisma usage model: `apps/api/prisma/schema.prisma` `AiUsageEvent`.
- Existing spec with cost/credit chain: `.trellis/spec/backend/ai-catalog.md`.

## Complexity

Complex. This spans database schema, shared API contracts, API/admin, AI Gateway invoke/usage, frontend user settings, frontend admin pages, and product billing semantics.
