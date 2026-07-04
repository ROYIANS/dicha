# 超级管理员首个功能模块

## Goal

在已经完成的独立 `apps/admin` 骨架上，实现第一个真实可用的管理功能模块。目标不是继续堆占位页面，而是让超级管理员进入后台后能看到真实平台数据，并验证 admin 前端、shared contract、API、数据库查询和服务端超级管理员授权的完整闭环。

## What I Already Know

* 上一个任务已经完成并归档：独立 admin 前端、登录/无权限页、后台 shell、`/api/admin/overview`、`SuperAdminGuard`、Docker/CI 部署入口。
* 现有 admin 路由包括：Dashboard、基础管理、系统功能、统计看板。
* 后端 admin API 必须走 `contract.admin.*`，并使用 `AuthGuard + SuperAdminGuard`。
* 前端只能消费 `UserDto.isSuperAdmin` 或 admin API 返回的安全数据，不能读取 `DICHA_SUPER_ADMIN_EMAILS`。
* Prisma schema 已有真实可管理数据：
  * `User`：基础用户资料、coins、createdAt/updatedAt。
  * `Session`：用户会话、过期时间、IP、UA。
  * `Account`：第三方账号/provider 信息。
  * `Passkey`：WebAuthn 凭证信息。
  * `Item/Event`：可用于后续用户活跃/内容统计。
* 当前最适合作为第一刀的推荐模块是“用户管理”：能在不新增 schema 的情况下形成真实列表、详情、搜索、基础统计。

## Recommended MVP

实现 `基础管理 -> 用户管理` 作为首个真实功能。

### Scope

* 后端 admin contract/API：
  * `GET /api/admin/users`：分页用户列表，支持关键词搜索。
  * `GET /api/admin/users/:id`：用户详情，包含基础资料、会话、账号绑定、Passkey 等登录/认证摘要。
  * `GET /api/admin/stats` 或扩展 overview：平台基础统计，如总用户数、已验证邮箱用户数、最近注册用户数。
* Admin 前端：
  * 基础管理页从占位改成真实用户管理入口。
  * 用户列表：搜索、分页/加载更多、状态摘要、注册时间。
  * 用户详情：右侧/页面内详情面板，展示账户基础资料和登录信息，不提供破坏性操作，不展示用户内容动态。
  * Dashboard 可展示少量平台统计卡片。
* 安全边界：
  * 所有接口仍由 `SuperAdminGuard` 保护。
  * 不返回 token、accessToken、refreshToken、idToken、passkey publicKey 等敏感字段。

## Alternatives

1. **用户管理（推荐）**：最快形成真实管理价值，也能验证 admin 全链路。
2. **系统健康/配置摘要**：实现风险低，但更像状态页，管理价值较弱，且容易碰到 secret 过滤边界。
3. **平台统计看板**：价值高，但统计口径会牵涉 AI Gateway、用户维度/平台维度、时间窗口，范围更大。

## Open Questions

* None. User confirmed starting with the recommended “用户管理” slice.

## Requirements

* 独立 admin 前端继续保持现有 shell 和超级管理员准入。
* 首个真实功能采用“用户管理”。
* 新功能必须使用 shared ts-rest contract，不手写裸 fetch。
* 新后端接口必须只返回安全字段。
* UI 需要是可实际操作的管理界面，不再只是占位卡片。
* Dashboard 显示真实平台基础统计。
* 用户管理页显示用户列表、搜索、分页、账户基础资料和登录信息。

## Acceptance Criteria

* [x] 超级管理员可以在 admin 的基础管理页面看到真实用户列表。
* [x] 用户列表支持关键词搜索。
* [x] 超级管理员可以查看单个用户的安全摘要详情。
* [x] 普通登录用户不能调用用户管理 API。
* [x] API 不返回 Better Auth token、OAuth token、passkey publicKey 等敏感字段。
* [x] `@dicha/shared`、`@dicha/api`、`@dicha/admin` 的 typecheck/lint/build 按影响范围通过。

## Definition of Done

* PRD 范围经用户确认。
* 代码实现通过 lint/typecheck/build。
* 后端 admin API 具备服务端超级管理员保护。
* 前端页面能真实调用 API 并展示数据。
* 如产生新的 admin 用户管理约定，更新 `.trellis/spec/`。
* 完成后提交代码、归档任务、记录 journal。

## Out of Scope

* 首版不做封号、删除用户、修改用户资料、重置 MFA 等破坏性/高风险操作。
* 首版不做完整 RBAC。
* 首版不展示任何 secret、token、passkey publicKey。
* 首版不做复杂审计日志系统。
* 用户详情不展示用户的内容动态，例如物品、事件、绘画等业务数据。

## Technical Notes

* Existing admin app spec: `.trellis/spec/frontend/admin-app.md`
* Existing admin API spec: `.trellis/spec/backend/auth-admin.md`
* Admin shared contract: `packages/shared/src/contracts/admin.contract.ts`
* Admin API module: `apps/api/src/modules/admin/`
* Admin frontend shell/routes: `apps/admin/src/routes/_admin.*.tsx`
* Prisma schema: `apps/api/prisma/schema.prisma`
* Use local pnpm: `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm`
* Implemented endpoints:
  * `GET /api/admin/overview`
  * `GET /api/admin/users`
  * `GET /api/admin/users/:id`
