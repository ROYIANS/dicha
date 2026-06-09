# 昼夜主题切换器

## Goal

在 Header 右上角加入日/夜间主题切换按钮，点击即切换，选择持久化到 localStorage，下次访问自动应用。切换时播放从按钮中心扩展的圆形 reveal 动画。

## Background

- `index.css` 已有 `:root`（日间）和 `:root[data-theme='dark']`（夜间）两套完整 token
- 切换机制 = 设置 `document.documentElement.dataset.theme = 'dark' | 'light'`
- 当前没有切换器 UI，也没有持久化逻辑
- 首次访问默认日间模式

## What to Build

### 1. 主题状态管理

- 一个轻量 hook（如 `useTheme`）：
  - 读取 `localStorage.getItem('vidorra-theme')`，无值时默认 `'light'`
  - 挂载时立即设置 `document.documentElement.dataset.theme`
  - 提供 `toggle()` 方法切换 + 写回 localStorage
  - 提供 `theme` 只读值（`'light' | 'dark'`）

### 2. Header 切换按钮

- 位置：Header 右上角区域
- 图标：日间显示月亮（切换到夜间），夜间显示太阳（切换到日间）
- 使用 lucide 图标（`Moon` / `Sun`）
- 样式：圆形按钮，Surface token 风格，hover 微交互

### 3. 圆形扩展 reveal 动画

- 点击按钮时，以按钮中心为圆心，做一个圆形 clip-path 扩展动画覆盖全屏
- 动画期间在覆盖层下方完成 `data-theme` 切换
- 动画完成后移除覆盖层
- 时长 ~500ms，ease-out，安静不弹跳（符合设计系统动效约定）

## Acceptance Criteria

- [ ] Header 右上角有日/月图标按钮
- [ ] 点击切换 `data-theme`，页面色彩立即（经动画后）变为对应主题
- [ ] 切换选择写入 localStorage，刷新后自动恢复
- [ ] 首次访问（无 localStorage）默认日间
- [ ] 圆形扩展动画从按钮中心展开覆盖全屏，过渡自然
- [ ] `pnpm typecheck` + `pnpm lint` 通过
- [ ] 日/夜两套 token 已有，本任务不需要改 token 值

## Out of Scope

- 跟随系统偏好（prefers-color-scheme）—— 可后续扩展
- 设置页面内的主题选项
- 移动端适配
- token 值本身的调整

## Technical Notes

- 动画实现思路：动态创建一个临时 `<div>`，用 `position: fixed` + `border-radius: 50%` + `scale` 动画从按钮位置扩展到覆盖全屏，背景色为目标主题的 canvas 色，`z-index` 最高层；动画结束后移除该 div 并切换 `data-theme`
- 或用 View Transitions API（`document.startViewTransition`）如果浏览器支持，降级为直接切换
- 图标切换可加一个 `rotate` 微动效
