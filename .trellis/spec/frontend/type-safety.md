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

---

## 场景：账户资料字段扩展

### 1. Scope / Trigger

- Trigger：新增或调整 Better Auth `user.additionalFields` 中的账户资料字段（如 `bio`、`city`、`gender`）。
- 这类字段不走 ts-rest endpoint，但会跨 Prisma schema、Better Auth server/client、shared `UserDto`、账户页表单一起流动。

### 2. Signatures

- DB：`apps/api/prisma/schema.prisma` 的 `model User` 必须有同名字段。
- Server auth：`apps/api/src/modules/auth/auth.ts` 的 `additionalFields` 必须声明同名字段与类型。
- Web auth client：`apps/web/src/lib/auth-client.ts` 的 `inferAdditionalFields({ user })` 必须同步。
- Shared contract：`packages/shared/src/contracts/auth.contract.ts` 的 `UserDto` 必须同步，用于 route context / Header 类型。

### 3. Contracts

- 字符串资料字段统一用 nullable string：DB `String?`，shared `z.string().nullable()`，UI 表单用受控 `string`。
- 保存时空字符串写回 `null`：`value.trim() || null`。
### 4. Validation & Error Matrix

- UI 必填字段在组件层校验（例如昵称不能为空）。
- 可选资料字段为空 -> 传 `null`。
- Better Auth `updateUser` 返回 error -> toast 错误并保留当前表单状态。
- 静态资料字典加载失败 -> 表单降级为空选项，不阻断其它资料保存。

### 5. Good/Base/Bad Cases

- Good：新增 `bio` 时同时更新 Prisma、Better Auth additionalFields、client infer、shared `UserDto`、`accountFormFromUser` 和测试。
- Base：只改账户页展示顺序或标签，不改字段契约。
- Bad：把新 UI 语义复用到旧字段（例如把 Bio 写进 `personalityArchetype`），会让数据语义漂移。

### 6. Tests Required

- `apps/web/src/lib/account-settings.test.ts` 覆盖新增字段从 `UserDto` 到表单的初始化与空值兜底。
- 变更后至少跑：
  - `pnpm --filter @dicha/web typecheck`
  - `pnpm --filter @dicha/web lint`
  - `pnpm --filter @dicha/web test -- src/lib/account-settings.test.ts`
  - `pnpm --filter @dicha/api typecheck`

### 7. Wrong vs Correct

#### Wrong

```typescript
await updateUser({
  personalityArchetype: form.bio.trim() || null,
});
```

#### Correct

```typescript
await updateUser({
  bio: form.bio.trim() || null,
});
```

## TODO（M1 共享类型出炉后回填）

- [ ] `packages/shared` 的合约文件组织约定（第一个真实端点后）
