# Admin 用户安全与审计日志一期

## Goal

在具体业务功能继续扩展前，先把后台管理系统的基础安全能力补齐：增强用户管理，新增审计日志，并保留轻量权限模型。目标是让超级管理员可以安全地查看账户与登录状态、执行少量必要干预，并且关键后台操作都有可追踪记录。

## What I already know

- 用户希望先把管理功能做完整，再进入具体业务功能。
- AI 与积分相关后台能力已经进入 MVP 收尾阶段。
- 当前 Admin 侧边栏已有：
  - `用户管理`：真实路由 `/basic`，当前是只读用户列表 + 详情。
  - `角色与权限`：占位。
  - `审计日志`：占位。
- 当前超级管理员权限来自服务端环境变量 `DICHA_SUPER_ADMIN_EMAILS`，由 `AuthGuard + SuperAdminGuard` 保护 `/api/admin/*`。
- 当前用户管理 contract 已有：
  - `GET /admin/users`
  - `GET /admin/users/:id`
- 当前用户详情只展示账户基础资料、绑定方式、最近会话、Passkey 摘要；这符合“不展示用户隐私业务数据”的方向。
- Prisma `User` 目前没有禁用/封禁字段；也没有审计日志表。

## Assumptions

- MVP 只有两类用户：普通用户与环境变量配置的超级管理员。
- 轻量权限模型先做成服务端派生能力，不新增复杂 RBAC 配置 UI。
- 用户管理允许做必要安全操作，但不做删除用户。
- 审计日志只记录后台管理操作，不记录普通用户在前台的每一次业务行为。
- 不考虑历史数据兼容，当前仍处于早期开发阶段。

## Requirements

- 增强后台用户管理：
  - 支持按邮箱、名称、显示名搜索。
  - 支持按邮箱验证状态、账户状态筛选。
  - 用户列表展示安全状态、注册时间、最近活跃/最近会话信息。
  - 用户详情只展示账户基础资料和登录/认证信息，不展示物品、事件、绘画等隐私业务数据。
  - 支持禁用/启用用户。
  - 支持强制退出某个用户的所有会话。
  - 禁止超级管理员禁用自己的当前账号。
- 新增审计日志：
  - 新增 `AdminAuditLog` 数据表，记录后台关键操作。
  - 记录字段包括：操作人、动作、资源类型、资源 ID、结果、IP、User-Agent、摘要、结构化 metadata、创建时间。
  - 新增后台审计日志页面和侧边栏入口。
  - 支持按动作、资源类型、结果、操作者/目标搜索、时间窗口分页查看。
  - 审计日志不展示密钥、token、OAuth 凭证、Passkey 公钥、原始请求体或用户隐私内容。
- 轻量权限模型：
  - 继续以 `DICHA_SUPER_ADMIN_EMAILS` 派生超级管理员。
  - Shared/Admin 响应中可展示当前管理员权限摘要。
  - `角色与权限` 页面可以先做只读说明/占位，展示当前模型：普通用户、超级管理员。
  - 不做多角色创建、授权矩阵编辑或组织级权限。
- 为关键后台写操作接入审计：
  - 积分发放、积分规则保存、兑换码保存。
  - AI 供应商目录配置、目录模型更新、目录同步。
  - Dicha AI 内部供应商保存、模型同步、模型配置更新。
  - 用户禁用/启用、强制退出会话。
- 完善超级管理员首页“大势报”：
  - 聚合平台规模、核心服务健康、运行时摘要、维护待办和最近审计。
  - 首屏能快速判断 API、数据库、AI Gateway 是否平稳。
- 完善系统运营工具：
  - 系统功能页展示服务健康、运行时、过期会话、失败审计等信息。
  - 支持安全维护动作：刷新健康检查、清理过期会话、查看审计日志。
  - 重启 API / AI Gateway、清理运行时缓存等危险或暂未接入动作只展示说明，不在 Web 请求中直接执行。

## Acceptance Criteria

- [x] Prisma schema 增加用户安全状态字段和审计日志表/索引。
- [x] Shared admin contract 增加用户状态操作、审计日志查询、轻量权限摘要。
- [x] API admin endpoint 继续由 `AuthGuard + SuperAdminGuard` 保护。
- [x] 用户管理页面支持状态筛选，并展示账户状态。
- [x] 用户详情支持禁用/启用和强制退出会话。
- [x] 禁用用户后，该用户无法继续访问受保护 API 或至少当前会话会被强制失效。
- [x] 超级管理员不能禁用自己。
- [x] 审计日志页面可分页查看关键后台操作。
- [x] 已有积分和 AI 后台写操作会写入审计日志。
- [x] 审计日志不包含 secrets、token、Passkey credential/public key、用户内容数据。
- [x] 角色与权限页面展示轻量权限模型，不提供未实现的可编辑 RBAC。
- [x] 首页“大势报”展示系统健康、运行时、维护待办和最近审计。
- [x] 系统功能页展示服务健康、运行时摘要、维护工具和故障排查建议。
- [x] 系统维护动作只开放安全可执行项，危险操作保留说明/占位。
- [x] `@dicha/shared` build 通过。
- [x] `@dicha/api` typecheck/lint/build 通过。
- [x] `@dicha/admin` typecheck/lint/build 通过。

## Technical Approach

- Prisma:
  - `User` 增加安全状态字段，例如 `status`, `disabledAt`, `disabledReason`, `disabledById`。
  - 新增 `AdminAuditLog` 表，按 `createdAt`、`actorId/createdAt`、`resourceType/resourceId/createdAt`、`action/createdAt` 建索引。
- API:
  - 在 `AdminService` 内实现用户状态操作和会话清理。
  - 增加一个轻量内部 audit helper，避免每个 handler 手写重复记录逻辑。
  - 对成功/失败的关键写操作记录审计日志；失败记录只写安全摘要。
  - 增加系统运营摘要接口，用于聚合 API/DB/AI Gateway 健康、运行时和安全维护动作。
- Admin UI:
  - 继续使用现有 `PageHeader`、`rounded-md`、密集运营页面风格。
  - 用户管理页面在现有 list/detail 结构上增强，不改成隐私敏感的“用户画像”。
  - 新增 `/_admin.audit-logs` 页面。
  - 新增 `/_admin.roles` 或类似路由，作为轻量权限模型说明页。
  - 首页大势报和系统功能页共用系统运营摘要数据。

## Decision (ADR-lite)

**Context**: 后续后台功能会越来越多，必须先有安全干预能力和操作追踪，否则积分、AI、系统配置等操作缺少问责链路。

**Decision**: 本期采用“超级管理员单角色 + 审计日志 + 用户安全操作”的轻量方案。权限仍由服务端环境变量派生，不引入完整 RBAC 数据模型；审计日志作为后续所有管理功能的基础设施。

**Consequences**: MVP 能快速补齐管理系统地基，后续如需多角色/团队权限，可在 `AdminAuditLog` 和现有 guard 基础上扩展，但本期不会增加复杂授权 UI。

## Out of Scope

- 不做删除用户。
- 不展示用户物品、事件、绘画、内容明细或隐私业务数据。
- 不做完整 RBAC、多角色创建、权限矩阵编辑。
- 不做组织/团队权限。
- 不做审计日志导出、归档、清理策略。
- 不记录前台普通用户的所有业务行为。
- 不改变当前 Better Auth 登录体系。
- 不在 Web 管理请求中直接重启 API / AI Gateway 进程。

## Technical Notes

- Existing admin shell: `apps/admin/src/components/AdminShell.tsx`
- Existing user page: `apps/admin/src/routes/_admin.basic.tsx`
- Shared admin contract: `packages/shared/src/contracts/admin.contract.ts`
- Admin API controller/service: `apps/api/src/modules/admin/admin.controller.ts`, `apps/api/src/modules/admin/admin.service.ts`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Auth spec: `.trellis/spec/backend/auth-admin.md`
- Admin frontend spec: `.trellis/spec/frontend/admin-app.md`
