# Frontend web scaffold (apps/web)

## Goal

把 `apps/web` 从占位 README 变成能跑起来的 React 19 + Vite SPA 骨架，落实 [architecture.md](../../spec/frontend/architecture.md) 定下的 M1 前端架构（TanStack Router loader-first + Query、ts-rest+zod 合约、HeroUI+Tailwind v4、react-i18next、sonner、ESLint flat+Prettier），前置安装全部已知依赖，并用 health 端点做一条 ts-rest 竖切验证架构端到端打通。

## What I already know

设计已在 architecture.md 全部锁定（10 条决策），本任务是**落地骨架**，不重新设计。

- 当前 `apps/web/` 只有占位 README，无 package.json（turbo 不当它构建目标）
- 后端 `apps/api` 已有 NestJS + `GET /health`（探活 DB）+ 全局 ValidationPipe
- `packages/shared` 已有 enums，将升级为 ts-rest 合约中心
- monorepo：pnpm workspaces + Turborepo，Node 20，latest-stable 策略
- dev 需 Vite proxy `/api`→`:3000`（BFF cookie 同源前提）

## Requirements

**Web 骨架**
- `apps/web` 能 `pnpm dev` 启动（Vite + React 19 + StrictMode + TS strict）
- 依赖前置：architecture.md「依赖前置清单」的 apps/web + packages/shared 部分一次性装好
- 工具链：ESLint flat config（typescript-eslint + react-hooks 严格 + react-refresh）+ Prettier，root 共享
- 样式/组件：Tailwind v4 + `@tailwindcss/vite` + HeroUI v3（v3 无 `HeroUIProvider`：CSS `@import` + 直接用组件；含一个 smoke 组件）
- 路由/数据：TanStack Router(file-based) + Query，`createRouter({ context:{ queryClient } })`，`defaultPreload:'intent'`，root 配 `pendingComponent`/`errorComponent` + error boundary
- i18n：react-i18next 起 zh 单 locale + `CustomTypeOptions` 类型
- 反馈：sonner 挂载
- env：`import.meta.env` + zod 校验小模块
- dev proxy：Vite `server.proxy` `/api`→`:3000`

**health ts-rest 竖切（Q1=A）**
- `packages/shared` 放第一份 ts-rest 合约：health（zod 定义 response `{ status, db }`）
- 后端 `HealthController` 改用 `@ts-rest/nest` 实现该合约（确认全局 ValidationPipe 对合约路由的处理）
- web 首页 route `loader` 经 `healthQueryOptions` 预取 `/api/health`，用 HeroUI 组件渲染 DB up/down
- 这是后续 feature 复用的 ts-rest client + `xxxQueryOptions` 工厂样板

## Acceptance Criteria

- [ ] `pnpm dev` 起 web + api（turbo），web 可访问
- [ ] web 首页 loader 经 `healthQueryOptions` 取 `/api/health`，HeroUI 组件渲染 DB up/down
- [ ] `packages/shared` 有 health 的 ts-rest 合约，后端 `HealthController` 经 `@ts-rest/nest` 实现它
- [ ] `pnpm typecheck` + lint 通过（web + shared + api）
- [ ] 无 `any` / 无 `@ts-ignore`；ESLint react-hooks 严格通过

## Definition of Done

- lint / typecheck 绿
- `pnpm dev` 实际能跑、首页显示真实 DB 状态（人工验证）
- 依赖前置到位，版本按最新稳定核过
- 新约定（ts-rest client + queryOptions 封装样板）→ 回填 architecture.md / hook-guidelines

## Decision (ADR-lite)

**Context**：架构已在 architecture.md 锁定；唯一开放点是脚手架完成边界。ts-rest/nest 是这套架构里最新、风险最高的一环。
**Decision**：选 A —— 脚手架包含 health 的 ts-rest 竖切（shared 合约 + `@ts-rest/nest` 实现 + web loader 经 `healthQueryOptions` 用 HeroUI 渲染 DB 状态）。
**Consequences**：多动一个后端 controller + shared 合约，但一刀验证全链路（合约→nest→Vite proxy→loader→typed hook→HeroUI），把最险的集成问题在脚手架阶段暴露；后续 feature 直接复用此竖切样板。

## Out of Scope (explicit)

- BFF auth / Casdoor 接入（architecture.md §3，独立 task）
- 真实业务 feature：杂物间列表、录入流程（Week 3-6）
- AI proxy / budget guard（Week 3-6）
- PixiJS（M2）
- e2e 测试工具落地（architecture.md 待定）
- 昼夜 palette / 像素皮（M2-M3）

## Research References

由 trellis-research 子代理落盘到 `research/`（2026-06-04 验证）：
- [`research/ts-rest-e2e.md`](research/ts-rest-e2e.md) — ts-rest 3.52 锁 zod v3；Nest 用 `@TsRestHandler`（ValidationPipe 无害）；web 用 `@ts-rest/core` initClient + 原生 `queryOptions`（**不用** `@ts-rest/react-query`）
- [`research/tanstack-router-setup.md`](research/tanstack-router-setup.md) — Vite 8 + `tanstackRouter()` 插件；`createRootRouteWithContext` 注入 queryClient；loader `ensureQueryData` + 组件 `useQuery` 同一工厂；后端需 `setGlobalPrefix('api')`
- [`research/heroui-tailwind-setup.md`](research/heroui-tailwind-setup.md) — HeroUI 3.1 + Tailwind 4.3 via `@tailwindcss/vite`；**v3 无 HeroUIProvider**；oklch theme 在 `:root`；Vite 8 需 Node ≥20.19/≥22.12（开发机已 24）

## Technical Notes

- 架构单一出处：[architecture.md](../../spec/frontend/architecture.md)，依赖前置清单 + 实现约束在其末尾
- ts-rest/nest 是最新/风险最高的一环 → health 竖切尽早验证

**research 暴露的实现约束（必须处理）**：
- **数据层**：`@ts-rest/core` initClient + 原生 `@tanstack/react-query` `queryOptions`（不用 `@ts-rest/react-query`）；zod 全仓 pin `^3`
- **后端前缀**：加 `app.setGlobalPrefix('api')`（serve `/api/health`，对齐 BFF cookie 路径）
- **web tsconfig**：override 为 `moduleResolution: 'Bundler'`（不沿用 base NodeNext）
- **Node**：`.nvmrc`(=20) → 24、root `engines` → `>=22.12`（开发机已 Node 24，无需动 shim）
- **HeroUI v3 无 Provider**：CSS `@import` + 直接用组件
