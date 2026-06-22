# PRD: 落地页 header/footer 打磨与装饰线对齐修复

## 背景

落地页（`apps/web/src/routes/index.tsx` + `apps/web/src/index.css`）模仿 zed.dev 的"工业图纸"视觉语言。用户对照 zed.html 标准代码提出三个问题（截图见任务上下文）：

1. 左右两侧的双竖线间距太窄（对比 zed 应明显更宽）
2. header nav 与 hero 之间的菱形节点应正好骑在水平分界线上，现在对不齐（被 nav 盖住上半截）
3. header 和 footer 整体需对照 zed 标准打磨补齐

## 研究产物（必读）

- `research/zed-section-reference.md` — 用户提供的 zed 标准 section 代码 + 结构解读
- `research/zed-header-footer.md` — zed 的精确 CSS 变量值、header/footer 完整结构、骑线数学
- `research/current-gap-analysis.md` — 当前实现逐项差距 + 带行号的修改建议
- `research/zed-header.html` / `research/zed-footer.html` — zed 原始 HTML 切片

## 需求（按执行顺序）

### R1. node-offset 变量体系（index.css）

- `--node-vertical-offset: 3.5px`、`--node-horizontal-offset: 4.5px` 默认值
- `.lp-outer-node-offset` 按断点覆盖水平 offset（base 12.5px / sm 19.5px / md 43.5px / lg 45.5px）

### R2. Frame 重写为全幅五段结构（修复问题 1）

- 去掉 `mx-auto max-w-[1240px]`，改全幅：`[窄 rail w-4 sm:w-6 md:w-12] [flex-1 弹性 rail，hidden lg:block] [container（max-w 1080，xl 1120）] [弹性 rail] [窄 rail]`
- 分段标尺（Ruler）贴边：贴在窄 rail 内边界与 container 边界（±0.5px 居中于 1px 线），不再浮在 rail 正中
- Barcode 刻线（32px）放进弹性 rail、贴 container 边缘
- 保留 vidorra 既有配色变量（LINE 等），不引入 zed 的配色

### R3. 菱形节点骑线（修复问题 2）

- Node 改为 zed 式：6px（size-1.5）、去 translate、显式 `bottom:calc(-1*var(--node-vertical-offset))` + `left/right:var(--node-horizontal-offset)`，z-index 高于 nav
- header/hero 分界的节点对移进 Nav 自身（骑 nav 的 border-b），跟随 sticky；外侧对 `hidden lg:block`，container 内侧对（`-3.5px`）常显
- Slash 等其他骑线节点统一走变量方案

### R4. Header 打磨（对照差距表）

- Nav 内部改为与 Frame 同款五段 rail 框架（header 区 rail 用实线）
- 补 `border-t sm:border-t-0`（移动端顶边线）
- nav link 改块状 hover（h-8 px-2.5 rounded hover 底色 + active 下压）
- 搜索徽标与登录之间补竖分隔线（`h-5 w-px border-l`）
- 补移动端汉堡按钮（lg:hidden size-8 border，可先占位无抽屉）
- Announce 底线改 200vw 全幅贯穿 + 骑一对节点

### R5. Footer 打磨（对照差距表）

- footer 套五段 rail 框架，标尺颜色用深底白低透明（`rgba(243,239,232,0.14)` 量级）
- footer 上边界加 hairline，一对节点 `top:-3.5px` 骑线
- 列布局改 `md:grid-cols-4 lg:grid-cols-6 lg:divide-x`（第 1 列 sm:col-span-2 + 短 hr）
- 链接改下划线渐显样式（`underline decoration-*/20 hover:decoration-*`），外链 `↗` 拆成半透明 span
- 底部装饰带：`border-t` + 斜纹/渐隐刻线 + 描边 wordmark（描边字效果，靠负 margin + overflow-clip 裁切）

## 验收标准

- [ ] lg+ 视口下：每侧两条竖线间距明显变宽（≈ 弹性 rail 宽），与 zed 比例一致
- [ ] 菱形节点正好骑在 nav 底线上（上下各半，不被 nav 背景遮挡），左右压在竖线中心
- [ ] header 具备：实线 rail、竖分隔线、块状 hover、汉堡按钮
- [ ] footer 具备：rail 框架、骑线节点、divide-x 列、下划线链接、装饰带
- [ ] 移动端（< lg）不破版：弹性 rail 隐藏、外侧节点隐藏
- [ ] lint + type-check 通过

## 非目标

- 不改 hero 及其他 section 的内容/文案
- 不实现汉堡按钮的抽屉交互（仅占位）
- 不接入暗色模式切换
