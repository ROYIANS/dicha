# Hook Guidelines

---

## 命名

- 自定义 hook 必须 `use` 前缀
- 业务 hook 放在 `features/<x>/hooks/`
- 跨 feature 工具 hook 放 `lib/hooks/`

---

## 数据请求 Hook 约定（ts-rest + loader-first）

- 走 **ts-rest**（`@ts-rest/core` client + 原生 `@tanstack/react-query` `queryOptions`），不手写 `fetch`。不用 `@ts-rest/react-query`（v5 无 `queryOptions`）。
- **`api/` 必须导出 `xxxQueryOptions` 工厂**（如 `itemsQueryOptions(filters)`），返回可两处共用的 query 定义：
  - route `loader`：`queryClient.ensureQueryData(itemsQueryOptions(...))`（loader-first 预取）
  - 组件：`useQuery(itemsQueryOptions(...))`

  这是 loader-first 的核心约定（详见 [architecture.md §2](./architecture.md)）。
- query key 由合约 + 工厂统一生成，第一段是 domain（`['items', filters]`）。
- mutation hook：`useXxxMutation`；成功/失败反馈走 `sonner`。
- 封装在 `features/<x>/api/` 或 `apps/web/src/api/`，组件内不直调 `fetch`。

---

## Zustand 取值

- 不要在组件里 `useStore(s => s)` 取整个 state（会引发不必要的 re-render）
- 用选择器：`useStore(s => s.someField)`
- 多字段：用 `useShallow` 或拆多个调用

---

## TODO（M1 实战后回填）

- [ ] 长流程（录入 / onboarding）的 hook 编排模式
- [ ] PixiJS 场景与 React 同步的 hook 模板
