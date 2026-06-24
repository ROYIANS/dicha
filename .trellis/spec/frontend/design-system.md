# Design System — 暖白柔面哑光（Warm Matte）

> dicha 视觉基调的**单一出处（材质 / token / 色彩层）**。来源：2026-06-05 与 ROYIANS 基于确认 mock 的定调会话。
> 取代原 Liquid Glass + 紫色方案（见 [architecture.md §4/§5](./architecture.md)，已回链本文）。
> 落地实现：`apps/web/src/index.css`（token 层）+ `apps/web/src/components/Surface.tsx`（卡片底座）。
>
> **本文管「用什么材料」**（暖哑光 token / 色彩 / Surface 材质）。**结构规则**（zed 式工程纸结构——五段轨道框架、骑线节点、分段标尺、条码刻线、斜线舱壁、物理感按钮；禁止无业务含义的装饰文字）见对篇 **[blueprint-aesthetic.md](./blueprint-aesthetic.md)**。落地页 `apps/web/src/routes/index.tsx` 是两者的最佳范本。

---

## 0. 一句话基调

**暖白柔面哑光，Apple 级克制与舒适。** 材质是柔面哑光（**不是**玻璃模糊）；主色是暖中性（**没有**单一鲜艳品牌主色，中性即品牌）；强调色是一组功能性柔彩，**只**出现在图标圆片 / 数据点 / 进度条 / 分类标识；**日夜两套**，切换只换变量值、组件零改动。

气质是**活泼 / 轻松 / 文艺**——不是后台 admin 的冷峻效率感，而是一本翻得起来的随身手帐。靠衬线字体 + 深色侧栏托起的浮起内容区营造层次与温度。

气质参照：Kinfolk / 无印良品式的呼吸感、真实生活摄影、温柔在场的文案（齐默默气质）。

---

## 1. 颜色

### 1.1 日间（默认）

| 角色 | token | 值 |
|---|---|---|
| 窗外底 | `--canvas-outer` | `#E8E2D9` |
| 应用画布 | `--canvas` | `#F7F4EF` |
| 卡片表面 | `--surface` | `#FFFFFF` |
| 表面备用 | `--surface-alt` | `#FCFAF6` |
| 主文字 | `--ink` | `#2E2A26`（暖炭黑，非纯黑） |
| 次要文字 | `--ink-soft` | `#8A8178` |
| 占位/三级 | `--ink-faint` | `#B5AEA4` |
| 描边/分隔 | `--hairline` | `#ECE7E0` |

### 1.2 夜间（暖暗，不冷）

| token | 值 |
|---|---|
| `--canvas-outer` | `#1A1714` |
| `--canvas` | `#24201C` |
| `--surface` | `#2C2723` |
| `--surface-alt` | `#322C27` |
| `--ink` | `#F0EBE3` |
| `--ink-soft` | `#A89E92` |
| `--ink-faint` | `#7C7268` |
| `--hairline` | `#3A332D` |

### 1.3 功能性柔彩（accents）

日/夜同色相，夜间略提亮去饱和。**禁止**用作大面积背景或唯一品牌主色。

| 名 | `--accent-*` 日 / 夜 | 极浅底 `--chip-*` 日 / 夜 |
|---|---|---|
| lavender 薰衣草 | `#B7AEE0` / `#C5BCEC` | `#EFEDF8` / `#322E3C` |
| peach 蜜桃 | `#F0C3A3` / `#F4CFB2` | `#FBEEE3` / `#3A322B` |
| sage 鼠尾草 | `#A9C0A0` / `#B6CBAD` | `#EDF2EA` / `#2E342B` |
| pink 柔粉 | `#E9B7BE` / `#EFC4CA` | `#FAEDEF` / `#3A2F31` |
| mist 雾蓝 | `#A8C4D6` / `#B7CFDE` | `#EAF1F5` / `#2B343A` |

**用途**：图标圆片（chip 底 + accent 图标色）、数据数字/进度条、分类点。错误态可借 `pink`。

---

## 2. 字体

- **serif-first（文艺基调核心）**：UI 正文与标题统一用人文衬线。中文 **Noto Serif SC**（Google Fonts，`@import` 于 `index.css` 最顶部），fallback `Songti SC` / 拉丁衬线。
- 双保险落地：`html, body { font-family: 'Noto Serif SC', 'Songti SC', serif }` **且** `@theme` 设 `--font-sans: 'Noto Serif SC', 'Songti SC', ui-serif, serif`，使 Tailwind 默认 `font-sans` 也指向衬线——组件无需散写 `font-serif`。
- **不再 sans-first**：原 PingFang / Inter 无衬线正文方案已弃用（衬线才是活泼文艺气质的来源）。
- **层级**：亲切大问候（xl bold）→ 中号分区标题（sm semibold）→ 小号标签（xs）。数据数字加粗突出（2xl bold）。

---

## 3. 形状 / 深度

- **圆角**：常规按钮、输入框、选择项统一 `rounded-md`（`--radius: 0.375rem`）。不要用 `rounded-[2px]` / `0.125rem` 这类过尖圆角，也不要把常规按钮做成胶囊或大圆角。卡片用 `16`（token `--radius-card`，工具类 `rounded-card`）。仅圆形头像、圆形图标按钮、进度条等天然圆形控件可用 `rounded-full`。
- **阴影**：极轻、弥散、暖调。**不使用 backdrop-blur / 玻璃模糊。**
  - 卡片 / 列表项 **默认扁平无阴影**（`.surface-card { box-shadow: none }`）——靠 hairline 描边 + surface/canvas 微差制造层次，不靠投影。
  - `--shadow-md`（`--shadow-raised`）：**仅** chrome / overlay —— 侧栏 / 顶栏 / 浮层。
  - `--shadow-lg`（`--shadow-float`）：**仅** overlay —— 弹窗 / 拖拽。
- **哑光 ≠ 纯平**：靠 surface 与 canvas 的微差 + 暖描边制造层次；阴影专留给浮起的 chrome / overlay，内容卡片保持安静扁平。

---

## 3.5 Shell / 导航 chrome

外壳布局靠**深色侧栏 + 浮起内容区**制造层次，**用阴影代替边框分界线**（不再硬边框，去后台感）。

- **侧边栏深色**：宽 220px，底 `--sidebar-bg #2E2A26`（主墨色，日夜都深）。文字浅奶油 `--sidebar-ink #F3EFE8`，次要 `--sidebar-ink-soft #A8A097`；选中态 `--sidebar-active`（白 10% 叠加）+ 主文字色，hover `--sidebar-hover`（白 6% 叠加）；disabled 项 `text-sidebar-ink-soft opacity-50` + 「即将」标签。**无** `border-r`。
- **内容区浮起**：`flex-1 bg-canvas rounded-l-[20px] shadow-float`，坐在深色侧栏之上——左侧圆角缺口透出深色，阴影制造抬起感。最外层容器 `bg-sidebar-bg` 让缺口处显深色。
- **内容区顶部 Header**（`components/Header.tsx`，跨 feature 复用纯展示组件）：左为搜索框（胶囊、占主要宽度，stub toast），右为通知（`Bell` + peach 红点，stub）+ 用户头像（`bg-lavender` 圆 + `User` 占位，stub）。搜索 placeholder 走 i18n `header.searchPlaceholder`。
- **不设侧栏底部用户区**：用户入口与设置统一收在 Header（避免双入口、去后台感）；侧栏也**不设**搜索项（搜索唯一出处 = Header，避免双搜索）。侧栏 sections：仪表盘 / 房间 / 世界。

---

## 4. 图标 / 图像

- **图标**：`lucide-react`，1.5px 圆头线性笔触，统一尺寸。强调色仅用于 §1.3 的图标圆片。
- **禁用 emoji（硬规则）**：UI 文案、i18n 文本、组件内一律不得出现 emoji 字符（杂项符号 / emoji 区，如 ☀ 🌿 🌶 ✅ 等）。需要图形符号时用 `lucide-react` 图标组件。原因：emoji 跨平台渲染不一致、破坏 serif 文艺统一调性。
- **图像是一等公民**：收纳空间用真实生活照（底部暖色 scrim 压字保证可读），物品用中性背景实拍。摄影管线 M1 用占位图，真实素材独立跟进。

---

## 5. 动效 / 声音

- **动效**：`--ease-soft`（`cubic-bezier(0.22,0.61,0.36,1)`）+ `--dur-base`（240ms）；安静、不弹跳。
- **文案声音**：温柔、在场、带自然意象（如"有序的空间，安定的心"）。**禁止 emoji**——意象靠文字本身，不靠 emoji 装饰（见 §4 硬规则）。角色化反馈（齐默默 +1 气泡等）= M2 soul 层。

---

## 6. 像素层规则（不变）

- 像素**仅**出现在 World 全屏（`/world`）与未来物品 sprite 缩略图。
- chrome（侧栏 / 顶栏 / 卡片 / 表单 / 弹窗）**永远**柔白哑光。
- World 是唯一的暖深色"传送门"；其上的退出/控制件是轻量现代悬浮控件（不破坏沉浸），即**外壳现代、内核像素**。
- 像素美术走 painterly 暖光，与主界面是同一世界的两面。

---

## 7. Surface 组件契约

`apps/web/src/components/Surface.tsx` —— 全站卡片底座，禁止散写 surface 样式。

| variant | 用途 | 阴影 | class |
|---|---|---|---|
| `card`（默认） | Dashboard 卡片 / 列表项 | **扁平无阴影**（hairline + 微差制造层次） | `surface surface-card` |
| `raised` | 仅浮起 chrome：侧栏 / 顶栏 / 浮层 | `--shadow-md` | `surface surface-raised` |
| `float` | 仅 overlay：弹窗 / 拖拽 | `--shadow-lg` | `surface surface-float` |
| `flat` | 内嵌 / 占位 | 无 | `surface surface-flat` |

`.surface` = `bg-surface` + `1px var(--hairline)` 描边 + `16px` 圆角；variant 仅叠加阴影层级。**内容卡片/列表项一律用 `card`（扁平）**，阴影只出现在 chrome（`raised`）与 overlay（`float`）。

---

## 8. Tailwind 工具类映射

`index.css` 用 `@theme inline` 把语义变量注册为工具类（随 `data-theme` 动态）：

- 颜色：`bg-canvas` `bg-surface` `bg-surface-alt` · `text-ink` `text-ink-soft` `text-ink-faint` · `border-hairline` · `text-lavender`/`-peach`/`-sage`/`-pink`/`-mist` 及 `bg-chip-*`
- 侧栏 chrome：`bg-sidebar-bg` `text-sidebar-ink` `text-sidebar-ink-soft`（进 `@theme inline`）；选中/hover 叠加直接用 `bg-[var(--sidebar-active)]` / `bg-[var(--sidebar-hover)]`（不进 @theme）
- 字体：默认 `font-sans` 已映射为 serif（`--font-sans` = Noto Serif SC）
- 圆角：`rounded-card`
- 阴影：`shadow-card` `shadow-raised` `shadow-float`

**禁用**：组件内硬编码 `text-gray-*` / `bg-violet-*` / `oklch(...)` / `backdrop-blur` / `bg-white/NN`。一律走上述 token。

### 8.1 滚动

- **滚动条全局隐藏**：任何情况都不显示原生滚动条（hover 也不显），内容仍可滚（`index.css` 中 `* { scrollbar-width: none; -ms-overflow-style: none }` + `*::-webkit-scrollbar { display: none }`）。`.no-scrollbar` 作显式语义逃生口保留，与全局一致。
- **横向滚动统一用 `components/ScrollArea.tsx`**：跨 feature 复用滚动容器。
  - props：`children` · `className?` · `orientation?: 'vertical' | 'horizontal'`（默认 vertical）。
  - 渲染单个可滚 `div` + `no-scrollbar`；vertical → `overflow-y-auto`，horizontal → `overflow-x-auto overflow-y-hidden`。
  - **horizontal 时把鼠标滚轮纵向滚动转成横向滚动**：用 `useRef` + `useEffect` 挂非被动（`{ passive: false }`）原生 `wheel` 监听，`preventDefault` 后 `el.scrollLeft += e.deltaY`；无可横向滚（`scrollWidth <= clientWidth`）则放过。effect 依赖 `orientation`，vertical 不挂监听，清理时 `removeEventListener`。
- HeroUI `ScrollShadow` **已弃用移除**（横向滚动一律走 `ScrollArea`）。

---

## 9. 昼夜机制

- 日间放 `:root`，夜间放 `:root[data-theme='dark']`；M1 默认日间。
- **自动切换 / 时段感知 / 切换器 UI 不在本基调任务内**（独立 task），但 `data-theme` seam 已就位，组件零改动即可切。

---

## 实现约束

- **无 legacy 双套**：仓库内不得同时存在玻璃 + 哑光两套视觉语言（铁律 no-legacy-compat）。
- **HeroUI v3**：oklch theme 变量仍是底座；本系统语义 token 覆盖其表面/背景表现，不另起炉灶。
