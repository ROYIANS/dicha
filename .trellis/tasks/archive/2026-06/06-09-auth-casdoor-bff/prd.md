# Auth — Casdoor BFF（完整 Session + CSRF）

## Goal

为 vidorra-life 实现生产级用户认证：NestJS 作为 OAuth/OIDC client 与 Casdoor 对话，将 access token 封装在 server 端 session（httpOnly cookie），前端只拿 cookie 和 `/api/auth/me` 的用户信息，永不直接接触 token。dev 用 Casdoor Cloud，prod 用 self-hosted Casdoor。微信登录通过 Casdoor 内置支持实现。

## Requirements

### 后端（NestJS — `apps/api`）

- `GET /api/auth/login` → 生成 PKCE + state，存 session，302 redirect 到 Casdoor
- `GET /api/auth/callback` → 验证 state，换 token，解析 id_token userinfo 存 session，redirect to `/`；callback 携带 `error` 参数时 redirect `/login?error=...`
- `GET /api/auth/me` → 返回 session 中 `{ id, name, avatar, email, phone }`，未登录 401
- `POST /api/auth/logout` → 销毁 session，清 cookie，返回 200；需 CSRF token
- `GET /api/csrf-token`（可选）— 双提交 cookie 模式下无需此端点，框架自动种 cookie
- express-session + connect-pg-simple：Postgres-backed session，表名 `vidorra_sessions`，7 天滚动续期（`rolling: true`，`maxAge: 7 * 24 * 60 * 60 * 1000`）
- csrf-csrf：双提交 cookie 模式，mutation 端点需 `x-csrf-token` header（403 on missing/invalid）
- `AuthGuard`：可复用 NestJS Guard，检查 session 有 user；未来 items 等 API 直接用
- 新增 env vars（`env.validation.ts` 同步校验）：
  - `CASDOOR_ENDPOINT`、`CASDOOR_CLIENT_ID`、`CASDOOR_CLIENT_SECRET`
  - `CASDOOR_ORG`、`CASDOOR_APP`、`CASDOOR_CALLBACK_URL`
  - `SESSION_SECRET`

### 共享合约（`packages/shared`）

- 新增 `auth.contract.ts`：`getMe`（GET /auth/me）→ `UserDto`（`{ id, name, avatar, email, phone }`）
- 导出 `UserDto` zod schema + TypeScript 类型

### 前端（`apps/web`）

- 新增 `/login` 路由（访客可达）：展示登录页，按钮 href=`/api/auth/login`（硬跳，非 SPA 导航）
- `_app.tsx` `beforeLoad`：bypass off → `queryClient.ensureQueryData(authQueryOptions())`；抛 401 / 无 user → `redirect({ to: '/login' })`
- `apps/web/src/api/auth.ts`：`authQueryOptions()` 工厂，loader 与组件共用
- `RouterContext` 加 `user: UserDto | typeof DEV_USER`（bypass 时注入 DEV_USER）
- CSRF：读 `csrf-csrf` 种的非 httpOnly cookie（`cookieUtils.getCookie('csrf-token')`），mutation 前带入 `x-csrf-token` header
- dev bypass 继续可用（`VITE_DEV_BYPASS_AUTH=true` → 注入 DEV_USER，跳过所有网络请求）

## Acceptance Criteria

- [ ] `VITE_DEV_BYPASS_AUTH=true` 时零网络请求，用户身份直通到 RouterContext
- [ ] bypass off，未登录访问 `/_app/*` → 跳 `/login`
- [ ] 点击登录 → Casdoor → 回调 → httpOnly session cookie 种下 → 跳 `/`
- [ ] 登录后 Header 展示真实用户名
- [ ] `/api/auth/me` 登录后 200 + 用户信息，未登录 401
- [ ] 登出后 session 销毁，`/api/auth/me` 返回 401，前端跳 `/login`
- [ ] Casdoor 返回 error 参数时跳 `/login?error=...`，不崩溃
- [ ] mutation 缺 CSRF token 返回 403

## Definition of Done

- TypeScript / ESLint / Prettier 通过
- `pnpm build` 无 error
- 手动走：登录 → 页面展示用户名 → 登出 → 跳 `/login`

## Decision（ADR-lite）

**Context**：需要 OIDC client 库对接 Casdoor。  
**Decision**：`openid-client` v6（标准 OIDC，支持 PKCE S256，CJS 兼容 NestJS）；不用 `casdoor-nodejs-sdk`（admin SDK，无 PKCE，scope 硬编码 'read'）。  
**Consequences**：更标准，可对接任何 OIDC 提供商（Logto / Auth0 迁移成本低）；需手写 login/callback 路由（约 60 行，openid-client 提供所有原语）。

## Out of Scope

- 微信登录的 Casdoor provider 配置（Casdoor 控制台操作）
- Refresh token / token rotation
- 多租户 / RBAC（M2+）
- 注册流程
- e2e 测试（MVP 手动验证）

## Technical Notes

- architecture.md §3 是此任务的权威设计文档
- `packages/shared` web 侧走源码（Vite alias），api 侧走 dist（CJS）
- `openid-client` v6：`import * as client from 'openid-client'`，NestJS CJS build 可用
- Casdoor discovery：`{CASDOOR_ENDPOINT}/.well-known/openid-configuration`（已验证支持 PKCE S256）
- session 表 `vidorra_sessions`，dev 同 Postgres 实例（`106.53.11.181:5432/wabi`）

## Research References

- [`research/casdoor-sdk-options.md`](research/casdoor-sdk-options.md) — openid-client v6 vs casdoor-nodejs-sdk；结论：用 openid-client
