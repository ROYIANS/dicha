# Type Safety

---

## TypeScript 配置

- `strict: true` 全开
- `noUncheckedIndexedAccess: true`
- 无 `any`（特例必须 `// reason:` 注释）
- 无 `// @ts-ignore`（必须 `// @ts-expect-error: <reason>`）

---

## 共享类型 / API 契约

- **合约中心 = `packages/shared/`**：用 zod + ts-rest 定义请求/响应 schema 与 `contract`，前后端各 import 同一份（详见 [architecture.md §1](./architecture.md)）。
- enum 单 source of truth：后端 Prisma model → `packages/shared/` 暴露 → 前端引用。
- **避免前后端各定义一份再手工对齐** —— ts-rest 合约即唯一出处。

---

## API 调用类型

- 走 ts-rest/react-query，类型**从合约推断**，不再手工标 `<Data, Error, Variables>`。
- 合约是跨包单源，所以推断在此场景可靠（与手写 fetch 不同）。

---

## PixiJS 类型

- `@pixi/react` 的组件直接用，无需 wrap
- 自己写的 Pixi 场景类必须显式标 props 接口

---

## runtime 校验

- **定了：zod**（随 ts-rest 合约一起，前后端共用同一 schema 校验）。

## TODO（M1 共享类型出炉后回填）

- [ ] `packages/shared` 的合约文件组织约定（第一个真实端点后）
