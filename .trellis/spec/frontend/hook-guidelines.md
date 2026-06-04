# Hook Guidelines

---

## 命名

- 自定义 hook 必须 `use` 前缀
- 业务 hook 放在 `features/<x>/hooks/`
- 跨 feature 工具 hook 放 `lib/hooks/`

---

## TanStack Query Hook 约定

- query hook：`useXxxQuery`（如 `useItemsQuery`）
- mutation hook：`useXxxMutation`（如 `useCreateItemMutation`）
- query key：用数组，第一段是 domain（`['items', userId, filters]`）
- 所有 query / mutation 封装在 `features/<x>/api/` 或 `apps/web/src/api/`，组件内不直调 `fetch`

---

## Zustand 取值

- 不要在组件里 `useStore(s => s)` 取整个 state（会引发不必要的 re-render）
- 用选择器：`useStore(s => s.someField)`
- 多字段：用 `useShallow` 或拆多个调用

---

## TODO（M1 实战后回填）

- [ ] 长流程（录入 / onboarding）的 hook 编排模式
- [ ] PixiJS 场景与 React 同步的 hook 模板
