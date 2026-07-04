# AI Gateway 可观测性与诊断增强

## Goal

Enhance AI Gateway observability and diagnostics so super admins can quickly answer: which official Dicha AI requests failed or degraded, which upstream/internal channel was involved, what error category happened, how long each request took, and what trace/request ids can be used to correlate logs. The goal is production debugging confidence after the new streaming invoke rollout, without storing raw prompts or response bodies.

## What I already know

- The previous streaming task added end-to-end `POST + text/event-stream` invoke through web, admin, API BFF, and AI Gateway.
- Existing usage storage already records `requestId`, `upstreamRequestId`, `internalProviderId`, `internalProviderModelId`, `latencyMs`, `errorCategory`, usage tokens, credit amount, billing/cost snapshot, and status.
- `AiUsageEvent` in Prisma has indexes for owner/time, provider/time, model/time, status/time, billing/time, provider status, cost currency, and `requestId`.
- Admin Dicha AI analytics already shows summary, time series, breakdowns, and recent logs for official Dicha provider only.
- The current admin usage report can include up to 1000 recent events, but it is still mostly a usage/cost analytics page rather than a diagnostic console.
- Normal users should not see official upstream CNY/USD costs or internal routing details; admin pages can show internal diagnostic metadata.
- Persistent logs must not store raw prompts or response bodies.

## Assumptions (temporary)

- MVP should improve diagnosis using the existing `AiUsageEvent` table first, rather than introducing a full external tracing stack.
- If DB schema changes are useful, we can change schema freely because the project is still early-stage and historical data compatibility is not required.
- Observability should focus on official Dicha AI/internal channel path first; user-owned BYOK channels can remain at usage/token/latency visibility.
- Brand display copy should use `Dicha`, with only the first letter capitalized. Existing `Dicha`/`Dicha` user-facing text is a speech-input artifact and should be corrected in this task. Internal all-caps env vars such as `DICHA_SUPER_ADMIN_EMAILS` and TypeScript identifiers such as `AdminDicha*` can remain as implementation identifiers.

## Open Questions

- None for MVP.

## Requirements (evolving)

- Build the MVP as a DB-backed admin diagnostic console using persisted `AiUsageEvent` data, not an external tracing stack.
- Add a separate admin menu/page for AI diagnostics instead of overloading the existing analytics dashboard. The analytics page remains trend/summary focused; the diagnostic page is optimized for request investigation.
- Add an admin diagnostic view for official Dicha AI calls with the first-page filter set:
  - time window;
  - status;
  - error category;
  - request id;
  - user email/name;
  - model;
  - internal channel id.
- Expose request-level diagnostic fields already persisted in `AiUsageEvent`: request id, upstream request id, internal provider/channel id, status, latency, estimated/real usage, credits, error category, timestamps, and user identity.
- Provide a dense diagnostic table and a request detail panel/drawer that shows copied ids and safe metadata needed for troubleshooting.
- Preserve privacy boundaries: no raw prompt or response body persistence.
- Keep user-facing AI usage pages focused on credits/tokens/latency and continue hiding official real costs/internal routing details.
- Correct user-visible brand capitalization from `Dicha`/`Dicha` to `Dicha` across admin/web/backend messages and shared seed display metadata.

## Acceptance Criteria (evolving)

- [ ] Super admin can search a specific request id and see its diagnostic record.
- [ ] Super admin can filter failed/degraded official Dicha calls by status and error category.
- [ ] Super admin can narrow diagnostics by user, model, and internal channel id.
- [ ] Super admin can identify which internal provider/model channel handled a call.
- [ ] Super admin can open a request detail panel/drawer and copy request/upstream/internal ids.
- [ ] Diagnostic data does not expose prompts, responses, secrets, Authorization headers, or raw upstream error objects.
- [ ] Existing user-facing usage reporting remains masked for official real costs/internal details.
- [ ] User-facing/admin-visible copy consistently displays `Dicha` instead of `Dicha` or `Dicha`, while env vars/code identifiers remain stable.
- [ ] Relevant typecheck/lint/build/tests pass using local pnpm.

## Definition of Done

- Shared/admin contracts updated for diagnostic fields and filters.
- Backend admin endpoint/service implemented with appropriate query indexes or efficient query patterns.
- Admin UI added or extended with diagnostic filters and a request detail panel/table.
- Gateway usage recording remains single-source and avoids duplicated credit debit.
- Tests added/updated for diagnostic filtering and privacy boundaries where practical.
- Specs updated if new observability contracts or conventions are established.

## Out of Scope (explicit)

- Structured application logging and external tracing are not part of this MVP.
- Storing raw prompt/response bodies.
- Payment/recharge observability.
- Automatic channel health scoring/auto-disable unless explicitly pulled into MVP.

## Future Direction

- Next likely evolution: add structured application logs in API and AI Gateway with `requestId`, `ownerId`, `providerId`, `modelId`, `internalProviderId`, `internalProviderModelId`, `status`, `errorCategory`, and latency. This is the recommended long-term step before introducing a full tracing stack, because it gives production log search and incident correlation with low operational cost.
- Later evolution: adopt OpenTelemetry-style spans only after the system has enough service boundaries, background workers, queues, or external observability infrastructure to justify the added deployment complexity.

## Decision (ADR-lite)

**Context**: Streaming invoke is now live enough to test online, and the immediate operational pain is request-level diagnosis rather than distributed tracing.

**Decision**: Build a DB-backed admin diagnostic console first. Defer structured server logs and OpenTelemetry/tracing to future tasks.

**Consequences**: This keeps the MVP quick and grounded in persisted usage events. It will not replace server log search for runtime exceptions, so a follow-up structured logging task remains useful once online traffic grows.

## UI Placement Decision

**Context**: The current admin analytics page is already a rich statistical dashboard. Request diagnosis has different workflows: search a request, narrow failed/degraded calls, inspect internal routing, and copy ids for follow-up.

**Decision**: Add a separate admin menu/page named `AI 诊断`.

**Consequences**: The analytics page stays readable, while the diagnostic page can use denser filters and a request-detail layout without competing with charts.

## Filter Scope Decision

**Context**: The first diagnostic page should be useful for real production incidents without becoming a full query builder.

**Decision**: MVP filters are time window, status, error category, request id, user email/name, model, and internal channel id.

**Consequences**: This covers the most common troubleshooting paths. Latency/token/credit ranges, upstream request id search, and usage-estimated filters can be added later if real incidents need them.

## Technical Approach

- Extend shared admin contracts with a Dicha AI diagnostics query/report shape separate from analytics.
- Add a super-admin API endpoint that queries `AiUsageEvent` for provider `dicha`, applies the MVP filters, includes user identity, and returns paginated/sorted diagnostic rows plus compact filter options.
- Add a separate admin route/menu `AI 诊断` with dense controls, high-performance React Table, and a detail panel for one selected request.
- Keep normal user usage APIs unchanged and cost/internal-route masking intact.
- Apply Dicha capitalization correction to user-visible strings and seed display metadata while preserving stable env var/code identifiers.

## Implementation Plan

1. Shared/API: add diagnostic query/report schemas, backend query service, and tests or focused type coverage.
2. Admin UI: add menu, route, filters, table, detail panel, and copy actions.
3. Brand copy cleanup: replace user-visible `Dicha`/`Dicha` with `Dicha`, leaving env vars/code identifiers intact.
4. Verification: shared build, API/admin typecheck/lint/build, and relevant gateway/web checks if touched.

## Technical Notes

- Existing usage persistence: `apps/ai-gateway/src/modules/usage/usage.store.ts`.
- Existing usage analytics: `apps/ai-gateway/src/modules/usage/usage.analytics.ts`.
- Existing admin report: `apps/api/src/modules/admin/admin.service.ts#getDichaAiUsage` and `apps/admin/src/routes/_admin.analytics.tsx`.
- Shared contracts: `packages/shared/src/contracts/ai.contract.ts`, `packages/shared/src/contracts/admin.contract.ts`.
- Prisma model: `apps/api/prisma/schema.prisma` model `AiUsageEvent`.
- Relevant spec: `.trellis/spec/backend/ai-catalog.md` includes AI invoke streaming settlement and privacy rules.
- Brand correction candidates discovered with `rg "Dicha|DICHA|Dicha|Dicha"`; implementation should update user-visible strings while preserving env var names and code identifiers.
