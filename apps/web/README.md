# apps/web

`@dicha/web` — React 19 + Vite SPA。前端架构单一出处见
[`.trellis/spec/frontend/architecture.md`](../../.trellis/spec/frontend/architecture.md)。

技术栈：TanStack Router(file-based, loader-first) + TanStack Query · ts-rest + zod 合约（住
`packages/shared`）· HeroUI v3 + Tailwind v4 · react-i18next（zh）· Zustand · sonner ·
ESLint flat + Prettier（root 共享）。PixiJS 按铁律 #2 推迟到 M2。

## 开发

```bash
pnpm dev          # 在仓库根：turbo 同时起 web(:5173) + api(:3000)
```

dev 下 Vite `server.proxy` 把 `/api` 转 `http://localhost:3000`（同源，为 BFF cookie 预留）。

本地 `pnpm dev` 默认跳过 `_app` 鉴权（与 docker-compose `VITE_DEV_BYPASS_AUTH=true` 一致）；若要本地测守卫，在 `apps/web/.env.local` 设 `VITE_DEV_BYPASS_AUTH=false`。

**Umami 统计（可选）**：在 `apps/web/.env.local` 或部署用 `.env` 中同时设置 `VITE_UMAMI_SCRIPT_URL` 与 `VITE_UMAMI_WEBSITE_ID`；缺任一则不加载 tracker。自定义事件可 `import { trackUmamiEvent } from '@/lib/analytics/umami'`。

- 数据层：`src/api/client.ts`（ts-rest `initClient`）+ `src/api/<x>.ts` 的 `xxxQueryOptions` 工厂
  （loader 与组件共用同一份 query 定义）。**不用** `@ts-rest/react-query`。
- 路由：`src/routes/`（file-based）；`src/routeTree.gen.ts` 由 router 插件生成，勿手改。
- 首页 `routes/index.tsx` 是 health ts-rest 竖切样板：loader `ensureQueryData(healthQueryOptions())`
  → 组件 `useQuery` → HeroUI 渲染 DB up/down。后续 feature 复用此样板。
