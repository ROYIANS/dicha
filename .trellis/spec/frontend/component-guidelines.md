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

## Web Component（自定义元素）集成

接入非 React 的 Web Component（如 ALTCHA `<altcha-widget>`）时：

- **JSX 类型**：库的 React 类型常未通过 `exports` 暴露子路径 → 在
  `apps/web/src/types/<x>.d.ts` 写最小 `declare module 'react/jsx-runtime'` +
  `declare module 'react'` 的 `IntrinsicElements` 声明（见 `types/altcha.d.ts`）。
- **副作用注册**：`import 'altcha'` 注册自定义元素，不是默认导出组件。
- **命令式驱动优先**：能用 `ref` 调元素方法（如 `widget.verify()` 拿结果）就别依赖它
  往 form 里塞隐藏 input —— 取到值后自己走 fetch/header，控制流更清晰。
- **⚠️ 含 `required` 控件的 widget 必须放 `<form>` 外**：很多 captcha/PoW widget 内部渲染
  `<input required>`。若把它（即便 `display:none`）放在 `<form>` 里，提交时浏览器原生校验
  会因「不可聚焦的必填项」抛 `An invalid form control... is not focusable` 并**拦截提交**。
  做法：widget 作为 form 的**兄弟节点**，用元素自带的 `display="invisible"` 隐身
  （而非手动 `style={{display:'none'}}`），命令式 `verify()` 触发。

---

## 头像组件与持久化

- 生成头像统一使用 `boring-avatars` 本地 React SVG 组件，不调用远程头像 API。
- 生成头像写入 `user.image` 时使用 marker：`boring:beam:<encodeURIComponent(seed)>`。
- 渲染头像时先用 `parseGeneratedAvatarMarker(image)` 判断：
  - 返回 seed → 用 `<Avatar name={seed} variant="beam" colors={...} square />` 渲染。
  - 返回 `null` 且 `image` 有值 → 当作上传图片 URL 渲染。
- seed 优先来自稳定身份字段：`email`、`displayName`、`homeName`，候选生成规则集中在 `apps/web/src/lib/account-settings.ts`。
- Header、账户页、未来其它用户入口必须复用同一 marker 解析规则，避免一处显示上传图、一处误把 marker 当 URL。

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
