# UI 基调：暖白哑光设计系统（替代 Liquid Glass）

## Goal

把 vidorra 的前端视觉基调从原 **Liquid Glass + 紫色** 转向用户确认的 **暖白柔面哑光 + 暖中性主色 + 功能性柔彩（Kinfolk / 无印良品气质）**，并**日夜两套**。
产出 = 设计系统单一出处（spec 文档）+ token 层落地（CSS 变量）+ 现有 App Shell / Dashboard 组件迁移，让运行中的界面与已确认的 mock 一致。**不留"文档说暖白、代码还是玻璃"的割裂。**

## Background

- 用户确认设计基准图（warm cream Dashboard mock，2026-06-05 对话）；三个旋钮已拍板：
  1. **材质** = 暖白柔面哑光（按图），放弃液态玻璃
  2. **强调色** = 暖中性 + 功能性柔彩（界面无单一鲜艳主色）
  3. **昼夜** = 现在就定日 + 夜两套（warm dark，不冷）
- 现状冲突源：
  - `.trellis/spec/frontend/architecture.md §4「Liquid Glass 设计系统」/ §5` 写的是玻璃 + 紫色
  - `apps/web/src/index.css` 的 `--glass-*` token + `.glass-default/strong/subtle` + oklch 蓝紫渐变背景
  - `apps/web/src/components/GlassPanel.tsx` + 全站卡片/侧栏/顶栏复用它
  - `Sidebar.tsx`、`routes/index.tsx` 等硬编码 `violet/purple` 渐变与 `white/20` 玻璃 utility
- 像素层规则不变：像素只在 World + 物品 sprite，chrome 永远柔白哑光。

## Design Foundation v1（本任务要固化的内容）

### 色彩 — 日间（暖奶油）

| 角色 | 值 |
|---|---|
| canvas-outer | `#E8E2D9` |
| canvas-app | `#F7F4EF` |
| surface | `#FFFFFF` / 备用 `#FCFAF6` |
| text-primary | `#2E2A26`（暖炭黑） |
| text-secondary | `#8A8178` |
| text-placeholder | `#B5AEA4` |
| hairline | `#ECE7E0` |

### 色彩 — 夜间（暖暗，不冷）

| 角色 | 值 |
|---|---|
| canvas-outer | `#1A1714` |
| canvas-app | `#24201C` |
| surface | `#2C2723` / 备用 `#322C27` |
| text-primary | `#F0EBE3` |
| text-secondary | `#A89E92` |
| hairline | `#3A332D` |

### 功能性柔彩（日/夜同色相，夜间略提亮去饱和）

薰衣草 `#B7AEE0` · 蜜桃 `#F0C3A3` · 鼠尾草 `#A9C0A0` · 柔粉 `#E9B7BE` · 雾蓝 `#A8C4D6`
> 仅用于图标圆片、数据点、进度条、分类标识。界面无单一鲜艳品牌主色 —— **中性即品牌**。

### 字体
- Wordmark / 大标题：暖人文衬线（品牌人格）
- UI 正文：中文 PingFang SC / 拉丁 Inter，humanist 无衬线
- 层级：亲切大问候 → 中号分区标题 → 小号标签；数据数字加粗突出

### 形状 / 深度
- 圆角刻度：`4 / 8 / 12 / 16 / 20`（卡片 16，按钮胶囊）
- 阴影：极轻、弥散、暖调。日间 `0 1px 2px rgba(40,30,20,.04), 0 8px 24px rgba(40,30,20,.06)`；夜间加深。**无重模糊玻璃**。

### 图标 / 图像
- 线性图标，1.5px 圆头笔触（lucide）
- 真实生活/产品摄影是一等公民：收纳空间用生活照（底部暖色 scrim 压字），物品用中性背景实拍

### 动效 / 声音
- 动效：柔和 ease-out，200–300ms，安静不弹跳
- 文案：温柔、在场、自然意象（齐默默气质）

## What to Build

### 1. 设计系统 spec 文档（单一出处）
- 新建 `.trellis/spec/frontend/design-system.md`，固化上述 Design Foundation v1（日夜色板、字体、圆角、阴影、材质、图标、图像、动效、声音、像素层规则）。
- 作为跨切面设计契约的单一出处；token 命名表 + 用法约定 + Surface 组件契约写这里。

### 2. 更新 architecture.md
- 改写 `§4「Liquid Glass 设计系统」` 小节与 `§5` 中的玻璃/紫色描述 → 改为暖白哑光，并回链 `design-system.md`。
- 删除/纠正"覆写 HeroUI oklch → 透明版""backdrop-blur-glass""shadow-glass"等玻璃断言。
- §4 中「像素 ≠ chrome」规则保留（仍成立）。

### 3. Token 层落地（`apps/web/src/index.css`）
- 用语义化 token 替换 `--glass-*`：
  - `--canvas-outer / --canvas-app / --surface / --surface-alt`
  - `--text-primary / --text-secondary / --text-placeholder / --hairline`
  - `--accent-lavender / -peach / -sage / -pink / -blue`（+ 对应极浅的 icon-chip 底色变体）
  - `--radius-{xs,sm,md,lg,xl} = 4/8/12/16/20`
  - `--shadow-{sm,md,lg}`（暖调）
  - 动效 `--ease-soft / --dur-base`
- 日间放 `:root`，夜间放 `:root[data-theme="dark"]`（seam 留好，M1 默认日间；切换器可后续 task）。
- 全局背景：暖奶油（替换原 oklch 蓝紫渐变）。
- 哑光 surface utility/class 替换 `.glass-default/strong/subtle`（柔面 + 暖描边 + 极轻阴影，无 backdrop-blur 或仅顶栏极弱）。

### 4. 组件迁移（让运行界面对齐 mock）
- `GlassPanel.tsx` → 重构为 `Surface`（哑光卡片；保留 variant 语义但映射到新 class）。命名与 import 全站同步更新。
- `Sidebar.tsx`：去除 `violet/purple`、`white/20` 玻璃 utility → 用新 token（暖中性、选中态柔白 pill、wordmark 衬线）。
- `routes/index.tsx`（Dashboard）：问候/widget/我的空间/右栏的紫色渐变、`bg-white/30` 等 → 新 token；数据图标用功能性柔彩圆片。
- 其余 `_app/*` 占位路由：背景/文字色对齐新 token。
- 侧栏「像素世界」入口卡保持暖灯笼深色（唯一深色传送门），其余 chrome 柔白。

## Acceptance Criteria

- [ ] `.trellis/spec/frontend/design-system.md` 存在，含日夜两套色板 + 全部 foundation 维度 + token 命名表 + Surface 契约
- [ ] `architecture.md §4/§5` 不再出现"液态玻璃/紫色/backdrop-blur-glass"作为现行基调，且回链 design-system.md
- [ ] `index.css` 无 `--glass-*` 残留；语义 token 齐全；`:root[data-theme="dark"]` 夜间一套就位；全局背景为暖奶油
- [ ] `GlassPanel` 已重构为 `Surface`（或等价哑光组件），全站 import 同步、无悬空引用
- [ ] Sidebar / Dashboard / 占位路由肉眼对齐暖白哑光 mock，无 violet/purple 硬编码残留
- [ ] `pnpm typecheck` + `pnpm lint` 通过，无 `any` / 无 `@ts-ignore`
- [ ] `pnpm dev` 访问 `/` 视觉与确认的 mock 基本一致（暖奶油、柔彩图标、柔面卡片）

## Out of Scope

- 昼夜**自动切换**逻辑 / 时段感知 / 切换器 UI（仅留 `data-theme` seam，独立 task）
- 衬线 wordmark 字体的真实 webfont 引入与优化（可先用 fallback serif，字体选型独立跟进）
- 真实摄影素材采集/管线（mock 用占位图）
- 任何 API / 录入 / PixiJS / Collection 功能
- 移动端响应式

## Technical Notes

- **一刀切**：本任务后仓库内不应再有两套并存的视觉语言（无 legacy 兼容，符合「no legacy compat」铁律）。
- **HeroUI v3**：oklch theme 变量仍是 token 底座；我们的语义 token 覆盖其表面/背景变量，避免另起炉灶。
- **哑光 ≠ 纯平**：靠极轻暖阴影 + 暖描边 + surface 与 canvas 的微差制造层次，不靠模糊。
- **昼夜同构**：日夜只换 token 值，组件零改动 —— 验证 `data-theme="dark"` 手动切换时 Shell 不破。
- **i18n / 图标**：沿用 react-i18next + lucide，不在本任务变更。
