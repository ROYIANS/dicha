# Repo Research: AI Provider Persistence and Admin Channel

## Current Architecture

- `apps/web` owns the user-facing AI settings pages and calls `contract.ai` through `apps/api`.
- `apps/api` authenticates the user, then proxies AI catalog/config/sync/usage/invoke requests to `apps/ai-gateway` with `x-dicha-user-id`.
- `apps/ai-gateway` owns provider/model catalog state, provider credential encryption, invoke routing, fallback attempts, and usage event recording.
- The only Prisma schema currently lives at `apps/api/prisma/schema.prisma`; generated client output is `apps/api/src/generated/prisma`.

## Current Persistence

- `CatalogStore` persists per-user provider/model/assignment config as JSON under `AI_GATEWAY_DATA_DIR/users/<hash>.json`.
- Provider credentials are encrypted with AES-256-GCM using `AI_GATEWAY_SECRET_KEY`.
- `UsageStore` persists per-user usage events as JSON under `AI_GATEWAY_DATA_DIR/users/<hash>.usage.json`.
- The frontend usage page reads user-scoped reports from gateway usage events.

## Existing AI Capabilities

- `InvokeService` already supports non-streaming calls for:
  - OpenAI-compatible Chat Completions
  - OpenAI Responses API
  - Anthropic Messages API
- Invoke fallback tries request model, assigned primary model, request fallbacks, then assignment fallbacks.
- Platform-managed providers currently fail validation with `Platform-managed AI provider is not connected yet`.

## Admin State

- `apps/admin` has a grouped sidebar with placeholder AI provider/model entries.
- `apps/api` has super-admin-only endpoints for overview and user management.
- Admin routes are server-enforced by `AuthGuard + SuperAdminGuard`.

## Deployment Constraints

- `docker-compose.yml` already runs `postgres`, `api`, `ai-gateway`, `web`, and `admin`.
- `ai-gateway` currently does not receive `DATABASE_URL` and does not depend on `postgres`.
- `ai-gateway` currently uses a persistent volume for JSON data.

## Recommended Implementation Direction

- Add AI catalog and usage tables to the shared PostgreSQL schema.
- Add Prisma access to `apps/ai-gateway` so gateway-owned AI state stays close to invoke and usage logic.
- Keep the existing JSON shape at the service boundary and replace the store implementation underneath.
- Keep AES-GCM credential payload format compatible by storing `{iv, tag, value}` as JSON in the DB.
- Add a minimal admin AI provider management surface through `apps/api` super-admin endpoints and `apps/admin`.
- Enable DicHA official provider by resolving `platform_managed` credentials from system/admin-managed channel config, rather than requiring per-user API keys.

## Risk Notes

- A full JSON-to-DB migration command is useful but may be out of scope for first MVP unless existing production JSON must be migrated immediately.
- Usage events should likely move with catalog config because billing, credits, and admin statistics depend on queryable event records.
- Credit pricing should reserve fields/contracts now, but complete balance ledger and paid plans can remain a later task.
