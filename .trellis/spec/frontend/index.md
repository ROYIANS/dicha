# Frontend Development Guidelines

> dicha-life 前端开发约定。栈：React 19 + Vite + TanStack Router/Query + ts-rest + Zustand + HeroUI（Tailwind v4）。
> 语言：**中文优先**（与各 spec 文件一致）。

---

## 总览

`apps/web/` 单页应用。架构决策的单一出处是 [Architecture（M1 决策记录）](./architecture.md) —— 跨切面契约（API / 路由 / auth / 样式 / 工具链）都在那；本目录其余文件放各自领域的细则并回链它。

PixiJS 2.5D 引擎按铁律 #2 推迟到 M2，M1 是"简陋 UI"（列表 + 文字 + tag，无 sprite）。

---

## 指南索引

| 指南 | 内容 | 状态 |
|---|---|---|
| [Architecture](./architecture.md) | M1 十条架构决策 + 依赖前置（keystone） | ✅ M1 骨架 |
| [**Structural Aesthetic**](./blueprint-aesthetic.md) | **结构层**——zed 式工程纸结构规则（五段框架、骑线节点、标尺、条码、斜纹、物理感按钮；禁止装饰性工程文字）。**调色板以落地页为准**，与 design-system.md 成对 | ✅ |
| [Design System](./design-system.md) | 材质层——暖白柔面哑光 token / 色彩 / Surface 契约（结构规则见 Structural Aesthetic） | ✅ |
| [Directory Structure](./directory-structure.md) | 目录与文件布局 | ✅ M1 骨架 |
| [Admin App](./admin-app.md) | 独立超级管理员前端 `apps/admin` 的 auth gate、路由、API 与部署约定 | ✅ Admin 骨架 |
| [Component Guidelines](./component-guidelines.md) | 组件模式、HeroUI、Pixi 边界 | ✅ M1 骨架 |
| [Hook Guidelines](./hook-guidelines.md) | ts-rest hooks、queryOptions 工厂 | ✅ M1 骨架 |
| [State Management](./state-management.md) | Zustand / Query / loader 分工 | ✅ M1 骨架 |
| [Type Safety](./type-safety.md) | TS 约定、zod、共享合约 | ✅ M1 骨架 |
| [Quality Guidelines](./quality-guidelines.md) | 代码规范、禁用模式、工具链 | ✅ M1 骨架 |

> **设计文档分工**：[design-system.md](./design-system.md) 管「用什么材料」（暖哑光 token / 色彩 / Surface 材质），[blueprint-aesthetic.md](./blueprint-aesthetic.md) 管「结构怎么长出来」（zed 式工程纸结构规则）。落地页 `apps/web/src/routes/index.tsx` 是两者的最佳范本。

> 各文件底部 TODO 标着"M1 真代码出现后回填"的项——例子与样板等 Week 3+ 真组件落地再补（见 bootstrap 任务 prd）。

---

**Language**: 文档用**中文**（与现有 spec 一致；index 模板原写 English 已按实际改正）。
