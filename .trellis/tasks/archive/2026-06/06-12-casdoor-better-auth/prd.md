# 从 Casdoor 迁移到 Better Auth

## Goal

把 vidorra-life 的认证体系从「Casdoor（外部 OIDC IdP）+ openid-client + express-session + csrf-csrf」**整体替换**为 **Better Auth**（自托管 TS 认证库，自带 user/session/account/verification 表与 cookie/CSRF/origin 校验）。破坏性变更，**不保留任何旧数据/旧逻辑兼容**。

## 形态澄清（重要）
Better Auth 是**跑在 NestJS 后端进程里的库**，不是 Casdoor/Clerk 那种独立服务或托管 SaaS——无独立服务、无控制台、无 MAU 计费。认证流程（注册/登录/会话/OAuth/重置/验证 token）全内置；开发者只提供：配置对象 + 发邮件回调（nodemailer 约 10 行，用自有 SMTP）+ 挂载 handler。邮件「发送」这一步用用户自己的 SMTP，Better Auth 只生成链接与逻辑。

## Decisions（已确认）

0. **方向确认**：继续 Better Auth（已澄清其为自托管库，非托管服务）。
1. **认证方式**：Email + 密码（基线）+ GitHub OAuth。不上 Google / 微信。
2. **User 表合并**：Better Auth `user` 表即领域 User。应用字段（displayName/city/gender/personalityArchetype/homeName/coins）作为 `additionalFields`；`Item.ownerId`/`Event.ownerId` 继续引用同一张表。需适配 Better Auth 必需列（name/emailVerified/image/createdAt/updatedAt）。
3. **前端 client**：采用 `better-auth/react`（`createAuthClient` + `useSession/signIn/signOut`）；应用数据接口仍走 ts-rest。
4. **邮件**：纳入 **邮箱验证 + 找回密码**，用 `nodemailer` 走用户自有 SMTP（Google/QQ 等），新增 `SMTP_*` env。
5. **NestJS 集成**：`NestFactory.create(AppModule, { bodyParser: false })` + main.ts 直接挂 `app.all('/api/auth/*', toNodeHandler(auth))`（不走 Nest 控制器，避开 setGlobalPrefix double-prefix）。详见 research。
6. **用户 id**：保留现有 `@default(cuid())`，通过 `advanced.database.generateId: false` 让 Prisma DB 侧默认接管 id 生成（Better Auth 不自生成）。
7. **邮箱验证**：`requireEmailVerification: true` —— 未验证邮箱不可登录；注册即发验证邮件。

## Requirements

### 后端 `apps/api`
- 安装 `better-auth`、`nodemailer`；移除 `openid-client`、`express-session`、`connect-pg-simple`、`csrf-csrf`。
- 新建 `auth.ts`（Better Auth 实例）：
  - `database: prismaAdapter(prisma, { provider: 'postgresql' })`（用项目自定义生成目录的 PrismaClient）
  - `emailAndPassword: { enabled: true, requireEmailVerification: true, sendResetPassword }`
  - `emailVerification: { sendOnSignUp: true, sendVerificationEmail }`
  - `socialProviders: { github: { clientId, clientSecret } }`
  - `user.additionalFields`：displayName/city/gender/personalityArchetype/homeName/coins
  - `trustedOrigins`：dev + prod 域名
  - 邮件发送：nodemailer SMTP transport（`sendVerificationEmail` / `sendResetPassword` 回调）
- `main.ts`：`bodyParser: false`；挂 `toNodeHandler`；保留 `trust proxy`；移除 session/csrf 中间件。
- `auth.guard.ts`：改用 `auth.api.getSession({ headers: fromNodeHeaders(req.headers) })`，未登录 401，注入 `req.user`。
- Prisma schema：合并 user 表 + 新增 session/account/verification 模型；删除对 `vidorra_sessions` 的依赖；`prisma migrate`（破坏性，dev 库可清空）。
- `env.validation.ts`：移除 `CASDOOR_*`、`SESSION_SECRET`；新增 `BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`、`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`SMTP_HOST/PORT/USER/PASS/FROM`。
- `.env.example` 同步。

### 共享 `packages/shared`
- 移除 ts-rest `auth.contract.ts` 的 `getMe`（改由 Better Auth session 端点 + 前端 client 提供）。
- `UserDto` 类型：改由 Better Auth `typeof auth.$Infer.Session.user` 推导，或在 shared 保留一个对齐的 zod 类型供 app 用（实现期定）。

### 前端 `apps/web`
- 安装 `better-auth`（client）；新建 `lib/auth-client.ts`：`createAuthClient({ baseURL })`。
- `routes/login.tsx`：改为 Email+密码 表单 + 「使用 GitHub 登录」按钮 + 注册入口（沿用现有 Zed 风格视觉）；文案去掉「Casdoor」。
- `routes/_app.tsx` `beforeLoad`：改用 `authClient.getSession()`（或 React Query 包装），401/无 session 跳 `/login`。
- `api/auth.ts`：`logout()` 改 `authClient.signOut()`；移除手动 CSRF 注入（Better Auth client 自管）。
- `api/client.ts`：移除 auth 相关 CSRF 注入逻辑（应用 mutation 端点依赖 SameSite=lax session cookie + origin 防护，MVP 可接受）。
- `lib/auth.ts` dev bypass：保留 `VITE_DEV_BYPASS_AUTH` + `DEV_USER`（本地无需真实登录）。
- `lib/csrf.ts`：若仅服务于旧 csrf-csrf，移除。

## Acceptance Criteria
- [ ] `npx @better-auth/cli generate` 产出的 schema 合并进 `schema.prisma` 且 `prisma migrate` 成功
- [~] Email 注册 → 收到验证邮件 → 验证后可登录；未验证按配置拦截 — 代码就位，待填 SMTP 凭据后运行时验证
- [~] GitHub OAuth 登录成功，首次登录建 user 行（含 additionalFields 默认值）— 代码就位，待建 GitHub OAuth App 后运行时验证
- [~] 找回密码邮件可发出并完成重置 — 代码就位，待填 SMTP 凭据后运行时验证
- [x] 登录后 `/_app/*` 可达，Header 展示真实用户名（来自 session.user.displayName/name）— Header 接 RouterContext.user，优先 displayName 回退 name
- [x] 未登录访问 `/_app/*` → 跳 `/login` — `_app` beforeLoad 基于 authClient.getSession，throw → redirect
- [x] 登出后 session 失效，前端跳 `/login` — logout() 调 authClient.signOut
- [x] `VITE_DEV_BYPASS_AUTH=true` 时零网络请求，DEV_USER 直通 — DEV_USER 形状已对齐 UserDto
- [x] 旧 Casdoor/express-session/csrf-csrf/openid-client 代码与 env 全部移除，无残留引用 — 三包 grep 零命中；docker-compose/postgres-init/README.casdoor 一并清理

## Definition of Done
- TypeScript / ESLint / Prettier 通过
- `pnpm build` 无 error
- 手动走通：注册 → 验证邮件 → 登录 → Header 用户名 → 登出 → 跳 `/login`；GitHub 登录单独走通

## Out of Scope
- Google / 微信登录
- 2FA、passkey、organization 等 Better Auth 插件
- 旧 Casdoor 用户数据迁移（破坏性，dev 库清空）
- Refresh token rotation 细节调优
- 应用业务端点的独立 CSRF token 机制（MVP 依赖 SameSite cookie）

## Technical Approach
- 后端 main.ts Express 层直接挂 Better Auth handler，避开 Nest 全局前缀；`bodyParser: false` 解决原始流冲突。
- User 表单一身份源：Better Auth 管必需列，应用字段走 additionalFields；id 策略（cuid vs Better Auth 默认）实现期定。
- 前端纯 better-auth/react client 驱动 auth，数据接口保持 ts-rest。
- 邮件走 nodemailer 通用 SMTP，凭 env 配置，dev/prod 同一套回调。

## Decision (ADR-lite)
**Context**：Casdoor 作为外部 IdP 引入额外部署/运维与微信耦合；项目实际需求是自托管、可控、与领域 User 打通的认证。
**Decision**：迁移到 Better Auth，合并 user 表，email+password + GitHub，邮件走自有 SMTP，前端用官方 react client。
**Consequences**：去掉 Casdoor/openid-client/express-session/csrf-csrf 四个依赖与一套外部服务；认证身份首次真正落到领域 User；失去 Casdoor 内置微信登录（后续如需用 genericOAuth 自建）。

## Technical Notes
- dev Postgres：`106.53.11.181:5432/wabi`（可清空）
- `packages/shared` web 侧走源码（Vite alias），api 侧走 dist（CJS）
- Prisma generator 自定义：`output=../src/generated/prisma`、`provider=prisma-client`、cjs；CLI generate 与之兼容性需核对，可能需手工合并 schema。
- NestJS 底层 Express 版本决定通配符写法（`/*` vs `/*splat`），实现期确认。

## Research References
- [`research/better-auth-nestjs-integration.md`](research/better-auth-nestjs-integration.md) — 挂载/ body parser / 全局前缀 / Prisma adapter / Guard getSession 全套要点
