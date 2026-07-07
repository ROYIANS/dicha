# Frontend Directory Structure

> React 19 + Vite + TanStack Router(loader-first) + TanStack Query + ts-rest + Zustand + Lobe UI / Ant Design + Tailwind v4。PixiJS M2 才上。
> Monorepo 中 `apps/web/`。完整架构见 [architecture.md](./architecture.md)。

---

## `apps/web/` 骨架

```
apps/web/
├── src/
│   ├── main.tsx
│   ├── routes/              # TanStack Router file-based routes
│   ├── features/            # 按"房间 / 业务域"分目录
│   │   ├── storage-room/    # 杂物间（M1）
│   │   ├── wardrobe/        # 衣橱（M3）
│   │   ├── library/         # 书房（M3）
│   │   ├── onboarding/      # 5 步 + ceremony（M3）
│   │   └── input/           # 录入流程（M1）
│   ├── pixi/                # PixiJS 场景 / sprite / shader
│   │   ├── scenes/          # 全景 / 房间细览
│   │   ├── sprites/         # sprite 加载器 / atlas
│   │   └── shaders/         # palette swap fragment shader
│   ├── stores/              # Zustand store（按 slice 拆）
│   ├── api/                 # ts-rest client + xxxQueryOptions 工厂（loader+组件共用）
│   ├── components/          # 跨 feature 复用的纯展示组件
│   ├── lib/                 # 工具函数
│   └── styles/
├── public/
│   └── assets/              # palette.json / sticker atlas / 角色 sprite
├── index.html
└── vite.config.ts
```

---

## 组织原则

- **feature 优先**：同一业务域的 component / hook / store slice / api 调用放同一 `features/<name>/` 下
- **PixiJS 独立目录**：`pixi/` 与 React 组件树解耦，通过 `@pixi/react` 桥接
- **`components/` 仅放跨 feature 的纯展示组件**（按钮、卡片框等），有业务逻辑的留在 feature 内

---

## 命名约定

- 文件夹：kebab-case
- React 组件文件：PascalCase.tsx（`ItemCard.tsx`）
- hooks：camelCase + `use` 前缀（`useItemDraft.ts`）
- store slice：camelCase + `Store` 后缀（`itemDraftStore.ts`）

---

## TODO（M1 Week 3 杂物间页面落地后回填）

- [ ] feature 内部子目录约定（components/ hooks/ api/ 等是否强制）
- [ ] PixiJS 场景与 React 组件的生命周期边界（M2）

> loader / queryOptions 约定已定，见 [architecture.md §2](./architecture.md) 与 hook-guidelines。
