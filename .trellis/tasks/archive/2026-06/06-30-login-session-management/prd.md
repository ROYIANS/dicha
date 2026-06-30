# brainstorm: 登录 session 记录与撤销

## Goal

在账户安全区域展示当前账号的登录 session / 已登录设备记录，并支持撤销其它 session，让用户能理解自己在哪里登录过、必要时主动收回访问权。这个能力要优先服务账户安全感，而不是做复杂的设备管理后台。

## What I already know

* 用户希望实现“登录的 session 记录和展示，以及 revoke 等等”。
* 项目认证基于 Better Auth，现有登录方式包含 email OTP、GitHub、passkey。
* 当前账户安全页已经展示邮箱验证、GitHub 绑定、passkey 管理和退出登录。
* Better Auth 客户端指南里有 `getSession()`、`revokeSession()`、`revokeSessions()` 等 session 管理方法。
* Better Auth `listSessions()` 返回当前用户所有 active sessions；字段包含 `token`、`userId`、`expiresAt`、`createdAt`、`updatedAt`、`ipAddress`、`userAgent` 等。
* Better Auth 单个撤销使用 `revokeSession({ token })`；批量可用 `revokeOtherSessions()` 保留当前会话。

## Decisions

* session 管理入口放在 `/settings/security` 账户安全页，不新建一级菜单。
* MVP 展示当前用户自己的真实 sessions，不做管理员查看他人 session。
* MVP 支持撤销单个其它 session，以及一键撤销所有其它 session；当前 session 不提供 revoke 按钮，继续使用现有“退出登录”。
* 展示设备/浏览器（从 `userAgent` 粗略解析）、IP、最近活跃、创建时间、过期时间；拿不到的字段显示明确空状态，不伪造位置或设备名。
* dev bypass 逻辑整体移除；所有受保护页面和 session 展示都依赖真实 Better Auth session。

## Requirements (evolving)

* 在账户安全页展示 session 记录列表。
* 支持 revoke session。
* 当前 session 需要和其它 session 有清晰区分。
* 未能取得的设备信息不能伪造，必须明确显示“暂无设备信息”等真实状态。
* 支持一键撤销其它设备，且保留当前 session。
* 网络失败或撤销失败给出明确 toast 提示。

## Acceptance Criteria (evolving)

* [ ] `/settings/security` 能看到登录 session 列表。
* [ ] 当前 session 有明确标识，不能误撤销导致用户困惑。
* [ ] 可撤销其它 session，成功后列表刷新并提示。
* [ ] 可批量撤销其它 session。
* [ ] 网络失败或撤销失败有明确错误提示。
* [ ] 前端不再存在 `VITE_DEV_BYPASS_AUTH` / `DEV_USER` / `shouldBypassAuth` 运行分支。

## Definition of Done (team quality bar)

* Tests added/updated where practical.
* Lint / typecheck / build green.
* Docs/notes updated if behavior or conventions change.
* Rollout/rollback considered if DB/schema or auth behavior changes.

## Out of Scope (explicit)

* 不做管理员级 session 管理。
* 不做地理位置解析服务，除非现有 session 数据已经提供。
* 不伪造浏览器/设备信息。
* 不新增后端 session schema 或单独 session API，优先复用 Better Auth 客户端能力。

## Technical Notes

* Existing account/security page: `apps/web/src/routes/_app/account.tsx`.
* Existing auth client wrapper: `apps/web/src/lib/auth-client.ts`.
* Existing auth server config: `apps/api/src/modules/auth/auth.ts`;当前不需要修改 Better Auth server config。
* Better Auth docs reference: `docs/content/docs/concepts/session-management.mdx` via Context7.
