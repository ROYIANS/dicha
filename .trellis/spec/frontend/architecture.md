# Frontend Architecture（M1 决策记录）

> 来源：2026-06-04 grill-me「前端架构详细设计」会话，10 条 branch 全闭环。
> 本文是**跨切面架构契约**的单一出处；各 topical spec（hook / state / type 等）只放本领域细则并回链这里。
> 设计视野（branch 1）：**建到哪建到哪**——目标结构先文档化、落地时遵循，不预建空脚手架；依赖一次性前置进 `package.json`。

---

## 技术栈一览（M1）

| 层 | 选型 | 备注 |
|---|---|---|
| 框架 | React 19 + Vite | StrictMode 开 |
| 路由 | TanStack Router（file-based） | **loader-first** |
| server state | TanStack Query | 经 ts-rest/react-query |
| client state | Zustand（按 slice） | server data 永不进 store |
| API 契约 | **ts-rest + zod** | 合约住 `packages/shared` |
| 组件库 | **HeroUI v3**（Tailwind v4 + React Aria） | M1 基建主力 |
| 样式 | Tailwind v4 + HeroUI oklch theme = token 层 | CSS Modules 仅 bespoke 逃生口 |
| 表单 | React Hook Form + `@hookform/resolvers/zod` | 复用合约 schema |
| i18n | **react-i18next**（**不是** next-intl） | 中文优先 |
| 反馈 | 路由级 pending/error + `sonner` | 角色化反馈留 M2 |
| auth | **BFF**（NestJS 握 Casdoor token，httpOnly cookie） | 详见下「§3 Auth」|
| lint/format | ESLint flat + Prettier（root 共享） | react-hooks 严格 |
| 2.5D | PixiJS v8 + `@pixi/react` | **M2 才上**（铁律 #2） |

> ⚠️ plan.md L217 写的 `next-intl` 在 Vite 跑不起来（它绑 Next.js），已纠正为 react-i18next。

---

## §1 API 契约：ts-rest + zod（branch 2）

- **合约中心 = `packages/shared`**：用 zod 定义请求/响应 schema + ts-rest `contract`，前后端各 import 同一份。**不**前后端各写一份再手工对齐。
- **后端**：`@ts-rest/nest` 实现合约，zod 负责入参校验 → `apps/api/src/main.ts` 的全局 `ValidationPipe` 对合约路由是冗余的，仅在出现非合约端点时才需要。
- **前端**：`@ts-rest/core` `initClient`（`baseUrl:'/api'`、`credentials:'include'`）+ 原生 `@tanstack/react-query` `queryOptions()` 工厂；类型从合约推断（不再手工标 `<Data,Error,Variables>`）。**不用 `@ts-rest/react-query`** —— 其 v5 无 `queryOptions`，无法让 loader 与组件共用同一工厂（research 验证 2026-06-04）。
- **runtime 校验统一用 zod**（解决 type-safety 里 "zod / valibot?" 的悬案）；表单客户端校验复用同一 schema。

## §2 路由 + 数据加载：loader-first（branch 3）

- 路由树是**数据编排层**。每个 route 的 `loader` 预取：`queryClient.ensureQueryData(xxxQueryOptions(...))`，渲染前数据就绪、切换无瀑布。
- `createRouter({ context: { queryClient } })` 把 queryClient 注入 router context，loader 从 context 取。
- `defaultPreload: 'intent'`（hover 预取）。
- **`api/` 必须导出 `xxxQueryOptions` 工厂**（不只是 hook），loader 和组件共用同一份 query 定义——这是 loader-first 的核心约定。
- 加载/错误：路由级 `pendingComponent` / `errorComponent`；app-root 一个 error boundary 兜底。

## §3 Auth：BFF（branch 4）

M1 **真建**（与 plan W1-2 对齐），不是桩。

- **NestJS 当 OAuth client**：握 Casdoor 的 token（server 端 session，推荐 Postgres-backed），web 只拿 **httpOnly + Secure + SameSite cookie**，token 不落 JS。
- 登录：web → `GET /api/auth/login`（NestJS）→ 302 Casdoor → 回调 `/api/auth/callback` → 种 cookie → 回前端。
- 前端：ts-rest client 全程 `credentials: 'include'`；`/api/auth/me` 用 Query 缓存当 auth-state 源。
- **路由守卫**：未登录在 route 的 `beforeLoad`（loader 之前）`redirect` 到登录。
- mutation 要 **CSRF** 防护（cookie 模式必须，`csrf-csrf`；`csurf` 已弃）。
- dev：Vite `server.proxy` 把 `/api` 转 `:3000` 做**同源**（cookie SameSite 才生效、免 CORS）。
- 后端 AuthModule + Casdoor 部署多半拆**独立 task**。

## §4 三模式 IA（2026-06-05 grill-me 定稿）

> 替代原 plan.md「打开即见房子 / 全景首页」方案。**内容是主角，像素世界是奖励层，不是操作层。**

### 三种模式

| 模式 | 路由 | 定位 | M1 状态 |
|---|---|---|---|
| **Dashboard**（默认） | `/` | Apple Health 风格，问候 + widget + 房间卡片 | ✅ 骨架 |
| **Collection** | `/wardrobe` `/library` `/storage-room` | 专业整理，三栏（筛选/grid/详情） | 杂物间 M1，其余 M3 |
| **World** | `/world` | 全屏像素沉浸，角色/sprite/飞行动画 | M1 stub，M2 真做 |

### 侧边栏分区（分区式，Mock 定稿）

```
仪表盘
─── 房间 ───────────────
衣橱 / 书房 / 杂物间   ← 一级直达各 Collection 路由
─── 工具 ───────────────
搜索
─── 世界 ───────────────
世界                   ← World 路由，单独分区
────────────────────────
设置 / 用户区
```

M1 只有「杂物间」亮起；衣橱/书房 `disabled`（`coming soon`），避免半成品体验（铁律 #9）。

### 设计系统：暖白柔面哑光（Warm Matte）

> ⚠️ 原 Liquid Glass + 紫色方案已**废弃**（2026-06-05 基于确认 mock 改定）。基调单一出处 = **[design-system.md](./design-system.md)**，本节只给摘要。

- **材质**：柔面哑光（**非**玻璃模糊）。靠 surface/canvas 微差 + 暖描边 + 极轻暖阴影制造层次，不用 `backdrop-blur`。
- **主色**：暖中性（暖奶油画布 + 暖炭黑文字），**无单一鲜艳品牌主色**；一组功能性柔彩（lavender/peach/sage/pink/mist）**仅**用于图标圆片/数据点/进度条/分类。
- **`Surface` 薄封装**：`src/components/Surface.tsx`（variant: `card`/`raised`/`flat`），全站卡片/侧边栏/顶栏统一复用。
- **昼夜两套**：token 放 `:root` / `:root[data-theme='dark']`，`@theme inline` 让工具类跟随；切换只换变量值、组件零改动（自动切换逻辑独立 task）。
- **像素 ≠ chrome**：像素仅限 World 视口内和物品 sprite 缩略图；chrome（侧边栏/顶栏/卡片）永远暖白哑光。

### Auth：真实 session 策略

- `_app` route guard 始终通过 `authQueryOptions()` 读取 Better Auth session；没有 session 时重定向 `/login`。
- 前端不再保留 dev bypass / 假用户分支，账户页和安全页展示的身份、session 与登录设备都必须来自真实认证状态。

---

## §5 样式 + token：Tailwind v4 + HeroUI（branch 6 / 10）

- **HeroUI v3** 是 M1 基建主力，底层 React Aria（可访问性）+ Tailwind v4 + oklch CSS 变量主题。
- **语义 token 层**：`index.css` 用 `@theme inline` 把暖白哑光语义变量（`--surface`/`--ink`/`--hairline`/`--accent-*` 等）注册为 Tailwind 工具类；昼夜按 `data-theme` 换变量值。HeroUI oklch theme 仍是底座，被语义 token 覆盖表现。详见 [design-system.md](./design-system.md)。
- **CSS Modules 降级为 bespoke 逃生口**（utility 难表达的像素效果，如 dithering / hard-edge）。
- 分层不变：**HeroUI/React 管 DOM 的 HUD/表单/弹窗，PixiJS 管 canvas sprite**（M2）。两者共存。
- 美学：M1 暖白柔面哑光（见 §4 / design-system.md），像素 soul 在 M2。图标 M1 用 `lucide-react`/`iconify`，像素图标 M2 随 BRAND 定。

## §6 表单：RHF + zod（branch 7）

- `react-hook-form` + `@hookform/resolvers/zod`，resolver 直接吃 `packages/shared` 的合约 schema → 前后端校验同源。
- HeroUI 输入是受控组件，用 RHF `<Controller>` 接。
- M1 只有录入卡一个表单；onboarding（M3）多步表单复用此 seam。

## §7 反馈 / i18n / 工具链（branch 5 / 8 / 9）

- **反馈**：路由级 pending/error + `sonner`（mutation toast，可后期皮成像素/角色风）。角色化反馈（"让我看看…"/+1 气泡）= M2 soul 层，M1 不做。
- **i18n**：`react-i18next` + `i18next`；`CustomTypeOptions` 声明合并补 key 级类型。中文优先，单 locale 起步但 seam 留好。
- **工具链**：ESLint flat config（`typescript-eslint` + `eslint-plugin-react-hooks` 严格 + `eslint-plugin-react-refresh`）+ Prettier，root 共享、前后端 extend。
- **env**：Vite `import.meta.env` + 一个 zod 校验的小 env 模块（镜像后端 `env.validation.ts`）。
- **test**：MVP 不强制单测；关键路径 e2e（登录 / 录入 / onboarding），工具实现时选（倾向 Playwright）。

---

## 依赖前置清单（branch 1：一次性进 package.json；版本/包名实现时按最新文档核）

- **apps/web**：`react@19` `react-dom` · `@tanstack/react-router@^1.170` `@tanstack/router-plugin` `@tanstack/react-query@^5` `@tanstack/react-query-devtools` · `@ts-rest/core@^3.52` · `zod@^3`（ts-rest 锁 v3）`zustand` · `react-hook-form` `@hookform/resolvers` · `i18next` `react-i18next` · `@heroui/react@^3` `@heroui/styles@^3` `tailwindcss@^4` `@tailwindcss/vite` · `sonner` · `lucide-react` · `vite@^8` `@vitejs/plugin-react@^6` · *(dev)* `eslint` `typescript-eslint` `eslint-plugin-react-hooks` `eslint-plugin-react-refresh` `prettier`
- **packages/shared**：`@ts-rest/core@^3.52` `zod@^3`
- **apps/api**（后端反噬，多半独立 task）：`@ts-rest/nest` · OIDC（`openid-client` 或 `@nestjs/passport`）· `express-session` + `connect-pg-simple` · `csrf-csrf`

---

## 实现约束（research 验证 · 2026-06-04）

- **数据层**：用 `@ts-rest/core` `initClient` + 原生 `@tanstack/react-query` `queryOptions`，**不用 `@ts-rest/react-query`**；zod 全仓 pin `^3`（ts-rest 3.52 锁 zod v3）。
- **ts-rest/nest**：用 `@TsRestHandler` / `tsRestHandler` 实现合约；全局 `ValidationPipe` 对合约路由是无害 no-op，不必禁用。
- **后端前缀**：`apps/api` 当前无 `setGlobalPrefix`（serve `/health` 而非 `/api/health`）→ 加 `app.setGlobalPrefix('api')`（更干净，对齐 BFF cookie 路径）。
- **HeroUI v3 无 `HeroUIProvider`**（那是 v2）：纯 `@import "@heroui/styles"` + 直接用组件；oklch theme 变量在 `:root`/`[data-theme]`，昼夜 swap 在 `:root` 覆盖。
- **web tsconfig**：override base 的 NodeNext → `moduleResolution: 'Bundler'`。
- **Node floor**：Vite 8 要求 `^20.19 || >=22.12`。开发机已是 Node 24（满足），但 `.nvmrc`(=20) + root `engines`(>=20) 是过时文本 → 抬到 `.nvmrc`=24 / `engines`>=22.12。
- **Vite 8** + `@vitejs/plugin-react@^6` + `tanstackRouter()` 插件（camelCase，放 `react()` 前）。
- **shared 跨包消费**：web 对 `@dicha/shared` 解析到**源码**（Vite `resolve.alias` + tsconfig `paths` → `packages/shared/src/index.ts`），`apps/api`(CJS) 走 `dist`。shared 是 CJS（`module: CommonJS`），Vite **dev**（esbuild/原生 ESM）看不穿 tslib `__exportStar(require(...))` 的转导出 → **`vite build` 绿但 `vite dev` 炸**；web 解析到源彻底消除该 desync。

## 待回填 TODO（M1 真代码出现后）

- [ ] `features/<x>/` 内部子目录是否强制 `components/ hooks/ api/`
- [x] queryOptions 工厂 + ts-rest client 的实际封装样板 —— 见 health 竖切：`apps/web/src/api/client.ts`（`initClient`）+ `apps/web/src/api/health.ts`（`healthQueryOptions()` 工厂，loader 与组件共用）；后续 feature 照此 `api/` 样板复用。
- [ ] BFF session/CSRF 后端落地细节（随 AuthModule task）
- [ ] HeroUI theme ↔ 昼夜 palette 变量映射（M3）
- [ ] e2e 工具最终选型
