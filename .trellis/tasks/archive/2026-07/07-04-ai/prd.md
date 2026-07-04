# AI 供应商持久化与后台渠道

## Goal

把个人 AI 供应商配置从网关本地 JSON 文件迁移到 PostgreSQL，并搭建超级管理员后台的 AI 供应商管理渠道；让前台官方 DicHA AI 供应商具备默认可用的系统托管通道基础，为后续降级策略、计费和积分体系铺路。

## What I Already Know

- 前台 AI 设置页面已经存在，用户可配置供应商、模型、用途分配，并可进行 demo invoke。
- `apps/api` 负责鉴权，并把 AI 请求代理到 `apps/ai-gateway`。
- `apps/ai-gateway` 当前用 JSON 文件保存 per-user catalog 和 usage event。
- `InvokeService` 已经支持非流式 OpenAI-compatible、OpenAI Responses、Anthropic Messages 调用。
- DicHA 官方供应商已在共享 catalog seed 中存在，`billingMode` 是 `platform_credits`，`credentialMode` 是 `platform_managed`，但当前 invoke 会拦截 platform-managed provider。
- `apps/admin` 已有独立前端、超级管理员鉴权和占位 AI 菜单。
- PostgreSQL/Prisma schema 当前位于 `apps/api/prisma/schema.prisma`。

## Requirements

- 个人 AI 配置入库：
  - Provider、Model、Assignment 按用户维度持久化到 PostgreSQL。
  - API 返回仍不得暴露明文 credential。
  - 继续支持内置 seed 合并、废弃 seed 清理、自定义 provider/model、模型同步、连接检测。
  - 凭证继续加密保存，兼容现有 AES-GCM payload 结构。
- AI 用量入库：
  - Invoke/probe usage event 按用户维度写入 PostgreSQL。
  - 前台 AI 消费统计页面继续读取当前用户自己的统计数据。
  - 不再向 JSON 文件写入 catalog 或 usage 数据。
  - AI usage event 表需要为当前用户时间窗口统计优化索引，优先覆盖 `ownerId + createdAt` 以及 provider/model/useCase 分组统计。
- 后台 AI 供应商管理：
  - 在 `apps/admin` 补一个 AI 供应商管理入口和页面。
  - 后端通过 super-admin-only API 暴露系统供应商/模型管理能力。
  - 第一版聚焦系统内置渠道的查看、启用状态、基础配置和模型列表，不做复杂权限或运营流程。
- DicHA 官方渠道：
  - 前台 DicHA provider 默认可见并可启用。
  - DicHA 调用时使用系统托管 credential/channel，不要求用户填写 API key。
  - 支持基本 fallback/降级数据结构，第一版至少能按配置选择一个系统托管上游。
- 计费/积分基础：
  - 保留平台积分结算所需字段或事件记录基础。
  - 本轮不实现完整充值、定价套餐、余额扣减和支付。

## Open Questions

- 已确认：本轮把能迁移的 AI 持久化全部迁入 PostgreSQL，包括个人 provider/model/assignment 配置和 usage event；不考虑历史 JSON 数据兼容或迁移脚本。

## Acceptance Criteria

- [ ] 新用户读取 AI catalog 时，从 PostgreSQL 初始化并合并 seed，而不是写入 JSON 配置文件。
- [ ] 现有 provider/model/assignment 更新、同步模型、连接检测行为保持可用。
- [ ] AI usage 页面仍按当前用户维度返回统计，统计来自 PostgreSQL usage events。
- [ ] AI usage event 查询具备面向统计页的基础索引，避免按用户时间窗口统计时退化为全表扫描。
- [ ] DicHA 官方供应商不再因为 `platform_managed` 直接无法调用；具备系统托管渠道配置路径。
- [ ] Admin 后台出现 AI 供应商管理页面，并通过超级管理员后端 API 获取真实数据。
- [ ] 普通用户无法访问 admin AI 管理 API。
- [ ] lint、typecheck、相关测试通过。

## Definition of Done

- Tests added/updated where behavior changes.
- Lint / typecheck green for touched packages.
- Deployment env/docs updated if new variables or DB tables are introduced.
- Trellis specs updated if the persistence/channel contract changes.
- Rollout/rollback documented; historical JSON migration explicitly not required during current early-development stage.

## Technical Approach

Recommended direction:

- Extend `apps/api/prisma/schema.prisma` with AI catalog and usage tables.
- Add Prisma access to `apps/ai-gateway` because gateway owns catalog mutation, invoke routing, and usage recording.
- Replace `CatalogStore` and `UsageStore` JSON implementations with DB-backed persistence while keeping service/controller/shared-contract shapes stable.
- Store encrypted provider credentials as JSON payloads or equivalent string columns and preserve redaction behavior.
- Add system/admin-managed provider channel tables for DicHA official routing.
- Add super-admin contract endpoints in `packages/shared/src/contracts/admin.contract.ts`, implement in `apps/api`, and consume in `apps/admin`.

## Decision (ADR-lite)

**Context**: AI state currently lives in gateway JSON files, but future billing, credits, admin operations, and migration all need queryable shared persistence.

**Decision**: Use database-backed AI state for all gateway-owned persistence in this task, including provider catalog config and usage events. Historical JSON data does not need migration or backward compatibility.

**Consequences**: The gateway needs database connectivity and deployment env updates. Existing local JSON data can be discarded in this early development phase. Provider config, usage statistics, and future credit accounting share a durable foundation.

## Expansion Sweep

1. Future evolution:
   - Credits/ledger/pricing should build on usage events and platform-managed provider costs.
   - System provider channels may later need weights, health checks, quotas, and circuit breaking.
2. Related scenarios:
   - User-facing provider settings and admin provider management must not leak secrets.
   - Admin UI should follow the existing admin design system and remain read/operate focused.
3. Failure/edge cases:
   - Missing system credential should make DicHA unavailable with a clear config error.
- Failed upstream attempts should remain recorded without exposing raw provider secrets.
- Seed/catalog updates must merge without deleting user customizations.
- Usage event 可能快速增长；第一版先通过组合索引优化当前用户时间窗口和常见分组查询，归档/分区/汇总表留到真实数据量出现后再设计。

## Out of Scope

- Payment, recharge, invoices, and complete credit balance ledger.
- Full circuit breaker / weighted routing engine.
- Streaming invoke support.
- Multi-admin roles beyond the existing super-admin email gate.
- Exposing user private content in admin.

## Technical Notes

- Research reference: `research/repo-ai-persistence.md`.
- Relevant specs to load before implementation:
  - `.trellis/spec/backend/ai-catalog.md`
  - `.trellis/spec/backend/database-guidelines.md`
  - `.trellis/spec/backend/auth-admin.md`
  - `.trellis/spec/backend/quality-guidelines.md`
  - `.trellis/spec/frontend/admin-app.md`
  - `.trellis/spec/frontend/design-system.md`
  - `.trellis/spec/frontend/blueprint-aesthetic.md`
  - `.trellis/spec/frontend/hook-guidelines.md`
  - `.trellis/spec/frontend/type-safety.md`
