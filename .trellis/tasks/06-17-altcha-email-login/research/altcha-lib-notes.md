# ALTCHA 集成调研笔记

## 关键结论

- **Better Auth 内置 captcha 插件不支持 ALTCHA**。`better-auth@1.6.17`
  `dist/plugins/captcha` 仅支持：`cloudflare-turnstile` / `google-recaptcha` /
  `hcaptcha` / `captchafox`（见 `constants.mjs` 的 `Providers`）。且默认端点
  `['/sign-up/email','/sign-in/email','/request-password-reset']` **不含本项目
  emailOTP 的 send-verification-otp 路径** → ALTCHA 必须自定义集成。

## altcha-lib v2（server 端）

- 包名：`altcha-lib`（`npm install altcha-lib`）。默认导出即 v2；v1 在
  `altcha-lib/v1`。Node 20+ 兼容。
- 创建挑战：
  ```ts
  import { createChallenge, randomInt } from 'altcha-lib';
  const challenge = await createChallenge({
    algorithm: 'SHA-256',          // 或 PBKDF2/SHA-256 等
    hmacSignatureSecret: HMAC_SECRET,
    expiresAt: Date.now()/1000 + 300, // 秒级时效，短时效抬高回放成本
    // cost / counter 等控制 PoW 难度
  });
  ```
- 校验解：
  ```ts
  import { verifySolution } from 'altcha-lib';
  const r = await verifySolution({
    challenge: payload.challenge,
    solution: payload.solution,
    hmacSignatureSecret: HMAC_SECRET,
  });
  // r: { verified, expired, invalidSignature, invalidSolution, time }
  ```
- **回放保护**：`verifySolution` 只校验签名 + 解正确 + 是否过期，
  **不保证跨请求一次性**。需严格一次性须自存已用 salt（库提供 `CappedMap`
  固定容量 Map，满则淘汰最旧）。本期倾向短 `expiresAt` 足够。
- 库自带框架插件：Express / Fastify / Hono / **NestJS** / Next 等
  （README 指向 `/docs/nestjs.md`）——实现期可优先看 NestJS 插件简化集成。

## 前端 widget

- 提交的 payload 是 base64 JSON，通常作为表单字段 `altcha` 提交。
- widget 配 `challengeurl` 指向后端挑战端点；`auto="onsubmit"` 提交时静默解题。
- React/TanStack 下用 web component（`<altcha-widget>`）+ ref，或 `altcha-react`
  封装——实现期定。

## 本项目发码链路（已确认）

`login.tsx handleSendOtp`
  → `authClient.emailOtp.sendVerificationOtp({ email, type:'sign-in' })`
  → Better Auth handler（`main.ts` 直挂 `/api/auth/*splat`，全局 body parser 已关）
  → `auth.ts` emailOTP 插件 `sendVerificationOTP` 回调
  → `mailer.ts sendOtpMail` 真正发邮件

→ 校验需插在「到达 mailer 之前」。两条路径见 prd.md「集成位置」。

## 来源

- https://altcha.org/docs/v2/ 、/server-integration/
- https://github.com/altcha-org/altcha-lib README（v2 API 参考）
- 本地 `node_modules/.pnpm/better-auth@1.6.17/.../plugins/captcha/constants.mjs`

---

## SPIKE 结论（已验证 better-auth@1.6.17 源码）

### 拦截方式：mirror 内置 captcha 插件的 `onRequest`（不是 user 给的 `hooks.before({context,path})`）

- `BetterAuthOptions.hooks.before` 真实签名是 `{ matcher, handler }` 数组，
  handler 走 `createAuthMiddleware`。但**更优解是写一个自定义 BA 插件，用插件级
  `onRequest`**——这正是内置 `captcha` 插件的做法（`plugins/captcha/index.mjs`）：
  ```ts
  const altchaGuard = (opts) => ({
    id: 'altcha',
    onRequest: async (request, ctx) => {
      const basePath = ctx.options.basePath ?? '/api/auth';
      let pathname = new URL(request.url).pathname.replace(basePath, '');
      // 仅 gate 发码路径
      if (!pathname.includes('/email-otp/send-verification-otp')) return;
      const payload = request.headers.get('x-altcha-response'); // ← 读 header，不碰 body 流
      if (!payload) return middlewareResponse({ message, code, status: 400 });
      const ok = await verifySolution({ ...decode(payload), hmacSignatureSecret });
      if (!ok.verified) return middlewareResponse({ message, code, status: 400 });
      // return undefined → 放行
    },
  });
  ```
- **关键收益**：token 走 **header（x-altcha-response）**，`onRequest` 只读 header，
  **完全不消费原始 body 流** → 彻底消除 PRD 风险 #2（与 Better Auth 读流冲突）。
- 失败返回形如 `{ response: new Response(JSON.stringify({message,code}), {status:400}) }`
  （`utils/middleware-response.mjs` 的 `middlewareResponse`），Better Auth 据此短路。

### 发码端点真实 path

- emailOTP send 的 path 是 **`/email-otp/send-verification-otp`**
  （源码 `plugins/email-otp/index.mjs:78`），**不是** `/sign-in/email`。
- 内置 captcha 默认端点也不含它 → 再次确认必须自定义。

### 挑战端点

- 不依赖 session/auth context，最简方案：`main.ts` 里在 Better Auth handler 之后、
  `express.json()` 之前（或之后均可，GET 无 body）挂一条
  `expressApp.get('/api/auth/altcha/challenge', ...)` 返回 `createChallenge(...)` JSON。
  也可做成 BA 插件 endpoint，但 Express 直挂更简单、零耦合。

### 前端透传

- `authClient.emailOtp.sendVerificationOtp({ email, type })` 第二参支持
  `fetchOptions`，可注入 `headers: { 'x-altcha-response': payload }`。
- 故 widget 解出的 payload 放进自定义 header 发送，与后端 `onRequest` 读 header 对齐。

### 依赖现状

- `apps/api` 需装 `altcha-lib`（当前未装）。
- `apps/web` 需装 `altcha`（web component，当前未装）。
