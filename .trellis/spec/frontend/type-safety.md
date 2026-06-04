# Type Safety

---

## TypeScript 配置

- `strict: true` 全开
- `noUncheckedIndexedAccess: true`
- 无 `any`（特例必须 `// reason:` 注释）
- 无 `// @ts-ignore`（必须 `// @ts-expect-error: <reason>`）

---

## 共享类型

- 前后端共享类型在 `packages/shared/`
- DTO / enum 单 source of truth：后端 Prisma model + NestJS DTO 导出 → `packages/shared/` 再被前端引用
- **避免前后端各定义一份再手工对齐**

---

## API 调用类型

- TanStack Query hook 必须显式标 `<Data, Error, Variables>`
- 不依赖推断（推断在跨包场景会丢）

---

## PixiJS 类型

- `@pixi/react` 的组件直接用，无需 wrap
- 自己写的 Pixi 场景类必须显式标 props 接口

---

## TODO（M1 共享类型出炉后回填）

- [ ] shared 包导出约定
- [ ] zod / valibot 是否引入（runtime 校验）
