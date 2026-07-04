# dicha AI Gateway

Independent NestJS service for AI provider catalog persistence, model sync, invoke routing, fallback attempts, encrypted credentials, and usage analytics.

Runtime state is stored in PostgreSQL through Prisma. The gateway no longer writes provider config or usage logs to JSON files.

Required environment:

- `DATABASE_URL` — shared PostgreSQL connection string.
- `AI_GATEWAY_SECRET_KEY` — 32+ character key for encrypted provider credentials and system channel secrets in production.
- `AI_GATEWAY_INTERNAL_TOKEN` — optional shared token for API-to-gateway internal requests.

Local development:

- When running from this package, ConfigModule also checks `../api/.env`, so the gateway can reuse the same `DATABASE_URL` as the API.
- Use `apps/ai-gateway/.env.example` only if you intentionally want a separate package-local env file.

Deployment:

- Docker Compose injects `DATABASE_URL` into both API and AI Gateway, pointing at the bundled PostgreSQL service.
- For non-compose deployments, set the same PostgreSQL connection string on the AI Gateway service environment.

Main internal endpoints:

- `GET /ai/health`
- `GET /ai/catalog`
- `PATCH /ai/config`
- `POST /ai/providers/sync-models`
- `POST /ai/providers/check`
- `GET /ai/usage`
- `POST /ai/invoke`
