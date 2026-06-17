# 接入 ALTCHA 防止邮箱登录被滥用

## 背景 / 问题

登录页 `apps/web/src/routes/login.tsx` 的第一步「发送验证码」直接调用
`authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' })`，
经 Better Auth handler（`apps/api/src/main.ts` 直挂 `/api/auth/*splat`）触发
`sendOtpMail`（`apps/api/src/modules/auth/mailer.ts`）发出真实邮件。

该端点**无任何摩擦**：任何人可用脚本对任意邮箱高频发码 →
- 邮件轰炸他人邮箱（被当作垃圾发送方，伤 SMTP 信誉）
- 消耗 SMTP 配额 / 触发服务商限流封禁
- 自动注册（OTP 登录按需建号）刷库

需在「发码」入口加一道人机/算力门槛。

## 目标

- 邮箱发码（`/sign-in/email-otp` 的 send-verification-otp 路径）前必须携带有效
  ALTCHA proof-of-work 解，否则后端拒绝、不发邮件。
- 自托管 PoW 模式：零外部服务、无 cookie、无追踪（契合项目自托管/隐私调性）。
- 前端 `auto=onsubmit`：用户点「发送验证码」时后台静默解题，几乎无感；失败再提示。
- 不破坏现有 passkey / GitHub / OTP 验证流程。

## 非目标

- 不保护 OTP 验证（`signIn.emailOtp`）、passkey、GitHub 登录端点（本期仅发码）。
- 不引入 ALTCHA Sentinel（ML 平台）——MVP 偏重，纯 PoW 足够。
- 不做服务端 IP 级限流 / 滑动窗口（可作后续独立任务；本期只加 PoW 门槛）。
- 不替换或改造 Better Auth captcha 插件（其内置仅支持 Turnstile/reCAPTCHA/
  hCaptcha/CaptchaFox，**不支持 ALTCHA**，且默认端点不含本项目 OTP send 路径 →
  必须自定义集成，不走该插件）。

## 决策（已与作者确认）

1. **部署模式**：自托管 PoW（`altcha-lib` + HMAC 密钥），无外部依赖。
2. **保护范围**：仅「邮箱发码」端点。
3. **前端交互**：`auto=onsubmit`，提交时自动解题。

## 方案概述

### 后端（apps/api）

1. **依赖**：`apps/api` 新增 `altcha-lib`（server 端创建挑战 + 校验解）。

2. **新增 ALTCHA 服务/路由**（建议落在 `apps/api/src/modules/auth/altcha/` 或
   复用 auth 模块）：
   - **挑战端点** `GET /api/auth/altcha/challenge`（或不带 `/auth` 前缀，注意它
     是 ts-rest/Nest 路由还是 Express 直挂——见下「集成位置」）：
     调用 `createChallenge({ algorithm: 'SHA-256'..., hmacSignatureSecret })`
     返回挑战 JSON 给 widget。挑战需带 `expiresAt`（短时效，如 5 分钟）。
   - **校验**：在发码前用 `verifySolution({ challenge, solution,
     hmacSignatureSecret })` 校验前端提交的 `altcha` payload（base64 JSON），
     `result.verified === true` 才放行。

3. **集成位置（关键设计点，实现期需 research 定方案）**：
   发码走的是 Better Auth handler，不是 Nest 控制器。两条可选路径——
   - **(A) Better Auth `emailOTP` 插件层校验**：在 `auth.ts` 的
     `sendVerificationOTP` 回调 / Better Auth `hooks.before` 中拦截 send 路径，
     从请求体读出 `altcha` 字段并 `verifySolution`，失败抛错阻断发码。
     需确认 Better Auth 是否能在 OTP send 前拿到自定义 body 字段
     （`authClient.emailOtp.sendVerificationOtp` 的 `fetchOptions`/扩展参数）。
   - **(B) 前置 Express 中间件**：在 `main.ts` 挂 Better Auth handler **之前**，
     对 `POST /api/auth/email-otp/send-verification-otp` 加一段中间件读 body 校验
     ALTCHA，通过才 `next()`。注意 Better Auth 直接读原始流、全局 parser 已关
     （见 `main.ts` 注释），中间件需自行读流且不能破坏后续 handler 取流。
   → 实现期优先验证 (A) 的可行性（更内聚）；不可行则退 (B)。

4. **环境变量**：`env.validation.ts` 新增 `ALTCHA_HMAC_SECRET`（必填，
   `@IsString()`），`.env.example` 补充说明 + 生成方式（`openssl rand -base64 32`）。

### 前端（apps/web）

1. **依赖**：`apps/web` 新增 `altcha`（web component；React 中用 `altcha-react` 或
   直接挂 `<altcha-widget>` 自定义元素 + `useRef`）。实现期定 React 封装方式。

2. **登录页改造** `apps/web/src/routes/login.tsx`：
   - 在 `step === 'email'` 表单内嵌入 ALTCHA widget，配置
     `challengeurl=<API origin>/api/auth/altcha/challenge`、`auto="onsubmit"`、
     `hidefooter` 等，视觉上保持极简（隐藏徽标/收起，契合 blueprint 登录卡片）。
   - `handleSendOtp`：等 widget 解出 payload（监听 `verified`/`statechange` 或
     提交时读 `altcha` 字段），把 payload 随
     `authClient.emailOtp.sendVerificationOtp` 一并发给后端
     （通过 `fetchOptions` 注入 body/header，需对齐后端读取位置）。
   - widget 未就绪 / 解题失败时禁用按钮并提示，沿用现有 `formError`/`notice` UI。
   - widget 配色尽量套现有 CSS 变量（`--ink`/`--hairline`/`--canvas`），与登录卡
     美学一致。

3. **环境变量**：`apps/web/src/lib/env.ts` 如需可配 challenge URL 则加
   `VITE_ALTCHA_*`；若复用 `VITE_API_BASE_URL` 推导 origin（同 auth-client 逻辑）
   则无需新增。

## 完成标准 (Acceptance Criteria)

- [ ] 后端：缺失 / 无效 / 过期 ALTCHA payload 时，发码请求被拒绝且**不发送邮件**。
- [ ] 后端：合法 payload 时发码流程不变，邮件正常送达。
- [ ] 后端：`ALTCHA_HMAC_SECRET` 缺失时启动期 env 校验报错（fail fast）。
- [ ] 后端：挑战一次性 / 短时效——过期挑战 `verifySolution` 返回 `expired`，被拒。
- [ ] 前端：用户点「发送验证码」时自动解 PoW，正常情况下无额外点击、无可见验证码框。
- [ ] 前端：解题失败 / widget 未就绪有明确提示，不会静默卡死。
- [ ] passkey / GitHub / OTP 验证（第二步）流程不受影响。
- [ ] `pnpm typecheck` + `pnpm lint` 通过。
- [ ] `.env.example` 与 `env.validation.ts` 已补 `ALTCHA_HMAC_SECRET` 并写明用途。

## 风险 / 待实现期 research 确认

1. **集成路径 (A) 可行性**：Better Auth `emailOTP` send 流程能否在校验失败时
   优雅阻断、并读到前端透传的 altcha 字段。这是最大未知数，需先 spike。
2. **原始 body 流冲突**：方案 (B) 下中间件读 body 与 Better Auth 读原始流的冲突
   （`main.ts` 已关全局 parser）。
3. **回放保护**：`verifySolution` 仅校验签名+解+过期，**不含跨请求一次性保证**。
   纯 PoW 下短 `expiresAt` 已足够抬高成本；如需严格一次性，需自存已用 salt
   （`CappedMap`）——本期评估是否必要，倾向「短时效即可，回放纳入非目标」。
4. **altcha-lib v2 算法成本参数**（`cost`/`maxnumber`）调优：平衡用户端解题耗时
   与防刷强度，移动端弱机不能卡太久。
5. **web component 在 TanStack Router + React 19 下的封装**与 SSR/类型声明。

## 关键文件索引

- `apps/web/src/routes/login.tsx` — 登录页，发码入口（`handleSendOtp`）
- `apps/web/src/lib/auth-client.ts` — Better Auth react client（emailOtp 导出）
- `apps/api/src/main.ts` — Better Auth handler 直挂点 + body parser 关闭注释
- `apps/api/src/modules/auth/auth.ts` — `createAuth` / emailOTP 插件配置
- `apps/api/src/modules/auth/mailer.ts` — `sendOtpMail`（最终发邮件处）
- `apps/api/src/config/env.validation.ts` — 后端 env 校验
- `.env.example` — env 模板
