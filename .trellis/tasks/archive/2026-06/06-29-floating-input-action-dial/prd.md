# 底部输入栏改为浮动动作盘

## Goal

把 app 内容区底部常驻的「+ / 记录一件物品输入框 / 照片 / 扫码 / AI」整条工具栏，改成右下角更轻的小白点式入口。默认只露出一个更小的加号入口，hover / focus / click 后展开为有动效的 1/4 radial menu，减少对内容区底部的长期占用。

## What I already know

* 用户认为当前底部整条常显输入栏存在感过强，不适合一直压在内容区下方。
* 期望默认只有一个更小的加号；hover 后出现圆盘，整个过程有动画。
* 圆盘背景与内容区域一致，不要卡片式 border / box-shadow，边缘用渐变模糊和 mask 融进画布。
* 方向接近 iOS 小白点 / Radial Toolkit，但当前采用更适合 app 角落的 1/4 圆盘：这是一个可扩展的万能入口，当前先承载录入相关动作。
* 完整圆 + 拖动方案试过后显得偏工具插件，当前回到固定右下 1/4 圆。
* 动作按钮要比第一版更靠里，完全处在渐变背景内部，避免压在边缘导致视觉乱。
* 当前 app shell 使用 Warm Matte 视觉系统、lucide 图标、中文文案和 `sonner` toast stub。

## Assumptions

* 本任务只重做入口和交互，不实现真实录入、上传、扫码、AI 识别。
* 桌面端支持 hover 展开；触屏和键盘用户通过点击 / focus 展开。
* 动作盘固定在 app 内容区右下角，避开侧边栏与主内容滚动。

## Requirements

* 移除底部常驻横向输入栏的视觉形态，不再整条占据内容区底边。
* 新增右下角浮动 `+` 主按钮，尺寸比上一版更轻。
* hover / focus-within / 点击展开动作盘，包含：
  * 记录一件物品
  * 拍照
  * 扫码
  * AI 辅助
* 展开过程要有安静、顺滑的动画：主按钮旋转或状态变化，动作按钮错位/错时出现。
* 动作盘背景与内容区 `bg-canvas` 协调，像从右下角裁出的 1/4 圆；边缘使用渐隐 mask / blur，避免像一个硬弹窗或卡片。
* 动作布局参考 radial menu：主入口像小白点，动作围绕入口沿弧线展开，动作按钮内收在渐变背景里；文字说明只显示当前 hover / focus 的单一 label，不让多枚文字胶囊破坏圆形结构。
* 保留当前 stub 行为：点击动作给出 toast，不引入真实业务流程。
* 遵守设计系统：不用 emoji，不用强烈玻璃感，不用大面积冷色/紫色，不写装饰性工程文字。

## Acceptance Criteria

* [ ] App 内容区底部不再显示原来的整条输入栏。
* [ ] 右下角显示浮动加号按钮。
* [ ] 鼠标 hover、键盘 focus、点击后动作盘可展开并保持可操作。
* [ ] 动作盘的四个动作都可点击，并触发对应 toast stub。
* [ ] 展开/收起有动画且不会遮挡布局或造成页面跳动。
* [ ] lint、typecheck、build 通过。

## Definition of Done

* 代码实现完成并提交。
* 前端检查通过，并验证 Vite dev module graph 可加载变更模块。
* 临时文件清理，行尾保持 CRLF，编码 UTF-8 无 BOM。

## Technical Approach

* 优先改造 `apps/web/src/components/InputBar.tsx`，让 Shell 继续引用同一个组件名，降低影响面。
* 使用 React state 控制触屏/点击展开，CSS `group-hover` / `focus-within` 处理桌面 hover 和键盘。
* 使用 lucide icons 表示动作，保持 `sonner` toast stub。
* 如需要 bespoke mask / animation，集中写在 `apps/web/src/index.css` 的 app 工具类块中，避免 route 内散写复杂样式。

## Out of Scope

* 不做真实物品录入表单。
* 不接照片上传、扫码、AI API。
* 不在本任务实现真实多级菜单或拖动入口；只保留 radial menu 的结构方向。
* 不改 Header 搜索入口、侧边栏或页面信息架构。

## Technical Notes

* Likely files: `apps/web/src/components/InputBar.tsx`, `apps/web/src/routes/_app.tsx`, `apps/web/src/index.css`, `apps/web/src/i18n/locales/zh.ts`.
* Relevant specs: `.trellis/spec/frontend/index.md`, `architecture.md`, `design-system.md`, `blueprint-aesthetic.md`, `component-guidelines.md`, `quality-guidelines.md`.
