# Component Guidelines

---

## 原则

1. **function component only**，无 class component
2. **不写未使用的 props 占位**（铁律：避免半成品）
3. **不写防御性 prop 校验**（TS 类型已经在 system boundary 保证）
4. **默认不写 PropTypes** —— TS 已是 source of truth

---

## 组件分类

| 位置 | 性质 | 例子 |
|---|---|---|
| `features/<x>/components/` | 业务组件，可直连 store / query | `ItemDraftCard` |
| `components/` | 跨 feature 复用件：**优先用 HeroUI**，必要时在此薄封装 | `Button`(HeroUI)、`Modal` |
| `pixi/scenes/` | PixiJS 场景（不是 React 组件，M2） | `StorageRoomScene` |

---

## 组件库：HeroUI v3

- **基建优先用 HeroUI**（按钮 / 输入 / 弹窗 / 表格等），底层 React Aria（可访问性）+ Tailwind v4。不重复造轮子。
- `components/` 只在需要统一封装时薄包 HeroUI；有业务逻辑的留 feature 内。
- 表单：HeroUI 输入是受控组件，用 RHF `<Controller>` 接（详见 [architecture.md §5](./architecture.md)）。
- 美学：M1 接受 HeroUI 现代观感，像素皮 = M2 soul 层。

---

## PixiJS 与 React 边界

- 用 `@pixi/react` 把 Pixi 场景嵌进 React 组件树
- **React 管 UI 层**（HUD、对话框、按钮、卡片）
- **PixiJS 管 sprite 层**（房间、物品 sprite、动画、palette swap）
- 数据流：Zustand store → React 触发 → 通过 Pixi 场景 ref 调用

---

## 不该做

- 不在组件里直接调 AI（走 `api/` 封装）
- 不在 React 组件里写 PixiJS 渲染循环（在 `pixi/scenes/` 里管）
- 不为"以后可能用到"添加 prop

---

## TODO（M1 Week 3 第一个真实组件后回填）

- [ ] 卡片 / Modal / 列表的设计 token
- [ ] loading / error 状态约定
- [ ] 动画封装（飞行动画 0.8s 复用）
