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
| `components/` | 跨 feature 纯展示组件 | `Button`、`Modal` |
| `pixi/scenes/` | PixiJS 场景（不是 React 组件） | `StorageRoomScene` |

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
