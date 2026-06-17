# 第三方库集成约定（apps/api）

> 接入 npm 第三方库时反复踩到的坑与定型模式。首个范例：ALTCHA 邮箱发码防滥用
> （`modules/auth/altcha.ts` + `auth.ts` 的 `altchaGuard`）。

---

## 1. Legacy 模块解析：只 import 主入口，别碰 `exports` 子路径

**背景**：`apps/api` 的 `tsconfig.app.json` 用 `moduleResolution: "Node"`（NestJS CLI 默认，
legacy 算法）。它**不读** package.json 的 `exports` 映射 —— 只认 `main` / 物理路径。

**坑**：现代 ESM-first 库（如 `altcha-lib@2`）的类型只在 `exports` 映射里可达
（`./dist/esm/v2/index.d.ts`），且 `main` / `types` 字段可能指向**不存在**的 legacy 路径。
于是：

- `import { x } from 'lib/frameworks/nestjs'`（子路径）→ TS2307 找不到模块
- 连主入口 `import { x } from 'lib'` 都可能报「types could not be resolved under your
  current moduleResolution」

**运行期 vs 编译期分离**：运行期 Node 经 `exports` 的 `require` 条件能正确解析到 CJS
产物（与 `better-auth` 在本项目的工作方式一致）；**只有 TS 编译期类型解析失败**。

**定型做法**（按优先级）：

1. **只从主入口 import**，不用 `lib/sub/path` 子路径。子路径里的小工具（如 altcha-lib
   的 SHA `deriveKey`，~12 行）**内联复刻**到自己的模块，保持与源码逐位一致并注释来源。
2. 主入口类型仍解析不了时 → 在 `apps/api/src/types/<lib>.d.ts` 写**最小 ambient 声明**，
   只声明实际用到的子集（见 `types/altcha-lib.d.ts`）。**不要**为了一个库去改全局
   `moduleResolution`（牵动整个 app 的解析行为，风险大）。
3. 装库后**第一件事**就是 `pnpm --filter @dicha/api typecheck`，立刻暴露解析问题，
   别等写完一大坨再发现。

**验证运行期**：编译期搞定后，写个一次性 `*.cjs` 脚本 `require('<lib>')` 跑一遍真实
round-trip（create → 用 → verify），确认 CJS 产物真的能 `require`、行为正确。用完即删。

---

## 2. Better Auth：用插件 `onRequest` + header 做端点守卫，别碰 body 流

**背景**：Better Auth handler 在 `main.ts` 直挂 Express 层，且**全局 body parser 已关**
（handler 自己读原始请求流；见 `main.ts` 注释）。想在某个 auth 端点前加校验时——

**坑**：若写中间件去**读 body**（如从 body 取 captcha token），会与 Better Auth 读原始流
冲突，导致 client API 卡 pending。

**定型做法**：仿 Better Auth 内置 captcha 插件——写一个**自定义 BetterAuthPlugin，用
插件级 `onRequest`**，token 走 **header**（只读 header 不消费 body 流）：

```ts
const xxxGuard: BetterAuthPlugin = {
  id: 'xxx-guard',
  onRequest: async (request, ctx) => {
    const basePath = ctx.options.basePath ?? '/api/auth';
    const pathname = new URL(request.url).pathname.replace(basePath, '');
    if (!pathname.includes('/目标端点')) return;        // 只 gate 目标端点，其余放行
    const ok = await verifyXxx(request.headers.get('x-xxx-response'));
    if (ok) return;                                      // 通过 → 交还 Better Auth
    return {                                             // 失败 → 短路返回
      response: new Response(JSON.stringify({ message, code }),
        { status: 400, headers: { 'content-type': 'application/json' } }),
    };
  },
};
// 注册：betterAuth({ plugins: [..., xxxGuard] })
```

**端点路径要核实**：从源码确认真实 path（如 emailOTP 发码是
`/email-otp/send-verification-otp`，**不是** `/sign-in/email`）。内置 captcha 插件的默认
端点列表也常常不含你要保护的端点 —— 别假设。

**前端透传**：Better Auth client action 第二参 `fetchOptions` 注入自定义 header：

```ts
authClient.emailOtp.sendVerificationOtp(
  { email, type: 'sign-in' },
  { headers: { 'x-xxx-response': payload } },
);
```

---

## 3. 自挂的非 auth 端点放在 `/api/auth/*` 通配之外

ALTCHA 挑战端点 `GET /api/altcha/challenge` 直接 `expressApp.get(...)` 挂在 Better Auth
通配 handler **之前**，路径不带 `/api/auth/` 前缀 → 不会被 `'/api/auth/*splat'` 吞掉。
前端走同源相对路径（dev 经 Vite 代理、prod 经 nginx 反代），origin 推导复用
auth-client 的逻辑（`VITE_API_BASE_URL` 绝对则取 origin，否则相对）。

---

## 4. 防滥用：短时效 + 内存一次性，回放保护别只靠签名

`verifySolution` / 同类校验通常**只验签名+解+过期**，不保证跨请求一次性。最小成本的回放
保护：**短 `expiresAt`（5min，与 OTP 一致）+ 内存 capped Map 记已用 salt**（满则淘汰最旧，
顺手清过期项）。够 MVP；要严格分布式一次性再上 Redis 之类共享 store。
