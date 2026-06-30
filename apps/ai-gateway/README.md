# dicha AI Gateway

Independent NestJS service boundary for AI provider routing, model catalog, future probes, circuit breaking, call logs, cost accounting, queues, and status dashboards.

The first scaffold intentionally exposes only:

- `GET /ai/health`
- `GET /ai/catalog`
- provider adapter interfaces

Real provider SDK calls, encrypted secrets, persistence, probes, and queues are follow-up work.

