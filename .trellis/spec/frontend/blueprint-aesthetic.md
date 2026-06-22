# Blueprint Aesthetic — 工程纸 / 蓝图结构语汇（Structural Design Language）

> dicha 的**结构装饰层**。与 [design-system.md](./design-system.md)（材质 / token / 色彩系统）成对：
> - `design-system.md` 管「**用什么材料**」——暖白柔面哑光、暖中性色、柔彩。
> - **本文管「结构怎么长出来」**——工程纸网格、五段轨道框架、骑线菱形节点、分段标尺、条码刻线、斜线舱壁、物理感按钮；**不包含装饰性工程文字**。
>
> **调色板以落地页为准**：落地页（`apps/web/src/routes/index.tsx`）是 dicha 落实 zed 风格的最佳范本，其他页面（含早期 login）只用了其子集。结构语汇（几何 / 间距 / 装饰原子）以本文为单一出处。

来源（实测，2026-06-10 / 2026-06-16）：
- `zed.html`、`zed-signup.html`（根目录抓取，3.2MB / 1.7MB）
- `.trellis/tasks/06-10-landing-frame-polish/research/`（zed-header / zed-footer / zed-section 精确拆解）
- `apps/web/src/routes/index.tsx`（落地页，dicha 译本）
- `apps/web/src/index.css`（`lp-*` / `app-*` / `dash-card-*` 工具类块）
- `apps/web/src/components/{FrameNode,DashCard,Header}.tsx`（app-shell 语汇延续）

---

## 0. 一句话基调

**Structure IS the decoration.**（结构即装饰）。

一套网格底、蓝框、标尺、节点、刻线、斜纹构成的工程制图语汇——**不用插画、不用渐变背景、不用装饰性图片，也不用装饰性文字编号**，靠**结构本身的精确与秩序**完成视觉表达。气质是 **precision / clarity / engineering craft**（精准、清晰、工程匠心），但配色是**暖棕中性**而非冷蓝钢，让「蓝图的严谨」落在「手帐的温度」上。

铁律（来自 zed，dicha 照搬）：
1. **No gradients**（作背景装饰）· **No illustrations** · **No decorative images** ——例外只有功能性的横向光带（公告 banner）、极淡 hero 渐隐层次、暗角 scrim（盖图压字），均为**结构服务的层次**而非装饰。
2. **细线全幅贯穿视口** ——分界线永远是 200vw 的 1px 线，不收在容器里。
3. **每个元素都要骑线/对齐** ——节点压线、标尺贴边、刻度对格子；半像素都不放过。
4. **No decorative blueprint text** ——禁止 `PRO / 01`、`ACCT / 01`、`AUTH·OTP`、`A1`、`F.01`、`№001` 这类无业务含义的工程编号、角落坐标、仿制图标签。只有真实导航、字段名、状态、数据、快捷键等功能文本可以显示。

---

## 1. 五段全幅框架（Five-Segment Frame）

> zed 与落地页的**布局骨架**。几乎所有 section（含 header / footer）都是这条横向 flex。

```
[窄 rail w-4/6/12][flex rail (lg+)][container 1080→1120px][flex rail (lg+)][窄 rail]
```

- **窄 rail（narrow rail）**：`w-4 sm:w-6 md:w-12 shrink-0`，贴视口边。base = 16px / sm = 24px / md = lg = 48px。占位 + 节点骑线锚点。
- **flex rail（弹性 rail）**：`hidden lg:block flex-1`，吃掉 container 两侧的剩余空间。承载分段标尺（Ruler）与条码刻线（Barcode）。
- **container**：`.lp-container-max-w` / zed `.container-max-w`，中央内容区。
  ```css
  .lp-container-max-w { max-width: 1080px; }
  @media (min-width:768px)  { .lp-container-max-w { min-width: 680px; } }
  @media (min-width:1024px) { .lp-container-max-w { min-width: 920px; } }
  @media (min-width:1280px) { .lp-container-max-w { min-width: 1120px; max-width: 1120px; } } /* min>max → xl 实际 1120px */
  ```
  container 与 flex rail 同为 `flex-1`（basis 0），**必须靠断点 `min-width` 防止被 rail 平分挤扁**。
- **rail 边线**：body section 的 rail `border-transparent`（可见竖线由 rail 内的标尺画）；header / footer 区的 rail 用**实线**（`border-r/l/x`，`var(--hairline)`）——header 本身就是「一条带框架的横条」。

落地页实现：`SectionFrame`（index.tsx）+ `RAILS` 预设（intro/hero/marquee/standard/leftHeavy/minimal/bare），逐段配置两侧 rail 装饰组合。**zed 并非每段左右都有刻度——各 section 的 rail 装饰组合不同**，是刻意的节奏变化。

---

## 2. 骑线菱形节点（Diamond Node on the Line）

> 全站最辨识度的细节：6px 方块转 45°，**中心精确压在 1px 分界线交点上**。

### 几何
- 本体：`size-1.5 rotate-45 border`（**6×6px**，对角线 ≈ 8.5px），**不用 translate 居中**，全部用显式 offset 定位。
- 颜色：`border` = 1px `var(--hairline)`（zed 用 `border-offgray-100 #ced1d6`）；`background` = `var(--canvas)`（底色填充，让节点「嵌」在背景里而不是浮在上面）。
- z-层级：`z-50`（dicha）/ `z-99`（zed），**画在所属区块背景之上**，跟随 sticky 一起滚动。

### 骑线数学（zed `--node-*-offset` 体系，dicha 照搬）
```css
:root {
  --node-vertical-offset: 3.5px;    /* = 节点半宽 3px + 线半宽 0.5px → 中心压在 1px 线中心 */
  --node-horizontal-offset: 4.5px;  /* 默认值，几乎总被覆盖 */
}
.lp-outer-node-offset { --node-horizontal-offset: 12.5px; }   /* base: rail w-4=16px */
@media (min-width:640px)  { .lp-outer-node-offset { --node-horizontal-offset: 19.5px; } }  /* sm: w-6=24px */
@media (min-width:768px)  { .lp-outer-node-offset { --node-horizontal-offset: 43.5px; } }  /* md: w-12=48px */
@media (min-width:1024px) { .lp-outer-node-offset { --node-horizontal-offset: 45.5px; } }  /* lg: 中心 48.5px = 1px 线中心 */
```

- **垂直骑水平线**：`bottom: calc(-1 * var(--node-vertical-offset))` = `bottom: -3.5px` → 盒底边在线下 3.5px，**中心恰落 1px 水平线的线心**。footer / section 顶边节点用 `top` 镜像。
- **水平压竖线**：
  - **外侧对**（section 根上）：`left/right: var(--node-horizontal-offset)`（lg = 45.5px → 中心 48.5px = 48px 窄 rail 与 flex rail 的 `border-x` 1px 线中心）。**仅 `lg:block`**（sm/md offset 不精确压线，zed 在 lg 以下直接隐藏）。
  - **container 内侧对**（container 根上）：`[--node-horizontal-offset:-3.5px]` → 中心 -0.5px，压 container 边界 1px 线心。

### 出现位置（四颗一组是标准）
- header：4 颗全骑 `border-b`（外对 lg-only + container 内对常显）——**节点是 header 的子元素**，所以 sticky 时跟着走、永不被自己背景盖掉（这是落地页 vs 早期实现的关键修正）。
- section：根上 2 颗骑**下一条** hr/divider 线（`bottom:-3.5px`）。
- footer：根上 2 颗骑**上边界**（`top:-3.5px`，base 即显示）+ container 内对（lg-only）。

**禁用**：用 `translate -50%` 居中节点（半像素误差 + 奇数尺寸渲染发虚，zed 实测已废弃此法）。dicha 组件契约：节点一律走 `FrameNode`（app）/ `Node`（landing），不散写。

**业务页克制**：账户设置、表单密集页、工具页等以内容操作为主的页面可以完全省略菱形节点，不要为了套蓝图语汇强行加节点。此类页面优先用 `rounded-md` 卡片、hairline 描边、留白和层级承载结构感。

---

## 3. 装饰原子（Decorative Atoms）

> 这些是「结构即装饰」的字面体现——把工程图纸里的元素拿来当视觉。**全部无图片，纯 SVG/CSS。**
> **边界**：这些原子只能是线、点、网格、刻线、斜纹等几何结构。不要用文字来伪造工程图纸氛围；无业务含义的缩写、编号、坐标角标都属于禁用装饰。

### 3.1 分段标尺（Ruler）
> 一条被切成不等段的竖线，部分实段部分虚段。贴 rail 内边界画。

- 外层定位容器：`width:10px; right:-0.5px; transform:translateX(50%)`（左 rail）/ 镜像（右 rail），让内层 1px 列**居中于边界**。
- 内层：`flex flex-col width:1px`，每段 `flex: <随机>`；实段 `background: currentColor`，虚段 `background-image: repeating-linear-gradient(to bottom, currentColor 0 4px, transparent 4px 8px)`。
- 颜色：`--rule` = `color-mix(in oklab, var(--ink) 12%, transparent)`（比 `--line` 更弱，标尺是辅助读数）。
- **flex 数值是伪随机但确定**的（避免每次渲染抖动）；落地页 `RAILS` 里硬编码每组 `{f, dash?}`。

### 3.2 条码刻线（Barcode）
> zed 弹性 rail 上的不等宽水平 rect pattern，像条码/读数带。**仅 hero 段出现**（zed 也只在 hero 两侧用）。

- 32px 宽 SVG，贴 container 边缘往外长（`rail="left"` → `right:-1`）。
- pattern `32×198`，~22 行 `rect`（宽 9~24px 随机、高 1px、垂直间距 9px），`fill: currentColor`。
- 颜色同 Ruler（`--rule`）。

### 3.3 斜线舱壁（Slash / divider-slash）
> section 之间的斜纹分隔带：上下两条 200vw 细线全幅贯穿 + 中间 45° 斜纹。

- 容器 `h-3.5 w-full`，上下各一条 `h-px w-[200vw] -translate-x-1/2` 线（`--line` = `color-mix(in oklab, var(--ink) 16%, transparent)`）。
- 中间 45° 斜纹 SVG：`pattern 6×6 patternTransform="rotate(45)"`，`line stroke-width:1.5`，`opacity:0.45`，`color: --rule`。
- **节点骑上沿线**：`--node-vertical-offset: 2.5px`（上沿线画在 top:0..1，骑线中心 0.5px → offset 2.5px）。
- zed 用 4×4 pattern + `py-[1px]` 内缩（斜纹不顶到上下线）；dicha 用 6×6，斜纹更舒展——属风格微调。

### 3.4 细网格底纹（GridPattern / engineering paper）
> **「Engineering Paper Background」的字面来源**——方格纸底纹。

- SVG `pattern 8×8`（落地页）/ `10×10`（zed），`path d="M.5 8V.5H8"` 画**只画右下两边**的 L 形格子（不画完整十字，更轻）。
- `color: var(--lp-deco)`，`opacity: 0.08~0.12`。
- **渐隐遮罩**：`mask-image: linear-gradient(to bottom, #000, transparent)`（或 hero 的 `to top, rgb(0 0 0 /68%), transparent`）——网格**不铺满**，从一侧渐隐消失，避免背景太「满」抢内容。
- hero 底景：网格 + 慢旋嵌套方块水印（9 个 `rect`，`460 * 0.9^i`，每个 `rotate(i*7)`，`opacity:0.035`，`lp-spin 120s`）——**极淡的几何呼吸**，不是装饰图。

### 3.5 圆点纹理（DotPattern）
> 选中态 tab 的底纹。SVG `pattern 8×8`，`circle r:0.75 fill:currentColor`，`opacity:0.22`。

### 3.6 公告光带（Announce banner）
> zed "Introducing:" 行。**唯一允许的横向渐变**——因为它是结构（引导带）不是装饰背景。

```css
background: linear-gradient(to right, transparent, color-mix(in oklab, var(--chip-peach) 75%, transparent), transparent);
```
- `:hover` 整行高亮（渐变换成实色低透明），整行可点。
- 深底（footer）上 zed 用 `from-transparent via-blue-100/40 to-transparent`；dicha 用暖桃 chip。

---

## 4. 调色板（以落地页为准）

> 色彩 token 的**完整定义**在 [design-system.md §1](./design-system.md#1-颜色)；本文只补**落地页独有 / 结构专用**的 token，并固化「落地页是范本」的优先级。

### 4.1 暖中性主调（Warm Matte，日/夜两套）
落地页与 design-system.md **完全一致**，无第二套色板：

| 角色 | token | 日 | 夜 |
|---|---|---|---|
| 窗外底 | `--canvas-outer` | `#E8E2D9` | `#0D0D0D` |
| 画布 | `--canvas` | `#F7F4EF` | `#141414` |
| 表面 | `--surface` | `#FFFFFF` | `#212121` |
| 表面备用 | `--surface-alt` | `#FCFAF6` | `#2A2A2A` |
| 主文字 | `--ink` | `#2E2A26`（暖炭黑） | `#F0EBE3` |
| 次文字 | `--ink-soft` | `#8A8178` | `#A89E92` |
| 三级 | `--ink-faint` | `#B5AEA4` | `#7C7268` |
| 描边 | `--hairline` | `#ECE7E0` | `#2A2A2A` |
| 深色 chrome | `--sidebar-bg` | `#2E2A26` | `#212121` |
| chrome 文字 | `--sidebar-ink` | `#F3EFE8` | `#F3EFE8` |

### 4.2 结构衍生色（落地页专用，design-system.md 未列）
```css
/* 结构线 —— 都是从 --ink 衍生的低透明，保持暖调 */
--line: color-mix(in oklab, var(--ink) 16%, transparent);   /* 主分界线（section 边、slash 上下线） */
--rule: color-mix(in oklab, var(--ink) 12%, transparent);   /* 标尺 / 条码（更弱） */

/* 品牌强调 —— 暖棕（日）/ 中性灰（夜）。落地页所有 // 标签、icon、强调都用它 */
--accent-warm: #7a6248;          /* 日：暖棕，唯一「品牌主色」 */
--lp-brand: var(--accent-warm);  /* 落地页标签 / link 色 */
--lp-deco: var(--accent-warm);   /* 装饰原子（grid / dot）色 = brand */

/* footer 深底上的浅奶油低透明（骑 chrome-ink 衍生） */
--lp-footer-rail:   color-mix(in oklab, var(--sidebar-ink) 14%, transparent);
--lp-footer-hair:   color-mix(in oklab, var(--sidebar-ink) 10%, transparent);
--lp-footer-divide: color-mix(in oklab, var(--sidebar-ink) 12%, transparent);
--lp-footer-fg-muted: color-mix(in oklab, var(--sidebar-ink) 70%, transparent);
--lp-footer-fg-faint: color-mix(in oklab, var(--sidebar-ink) 50%, transparent);
```
夜间：`--accent-warm: var(--ink-soft)`、`--lp-deco: var(--ink-faint)`（深底上品牌色退成中性灰，保持对比）。

### 4.3 功能柔彩（accents，日/夜同色相）
lavender / peach / sage / pink / mist——**仅**用于图标圆片、数据点、进度条、分类标识、Mark 高亮短语底。详见 design-system.md §1.3。**禁止用作大面积背景或唯一品牌主色**（品牌主色是暖棕 `--accent-warm`）。

> **关键区分**：zed 的「蓝图」用的是**冷蓝钢**（`accent-blue hsl(219,93%,...)`、`offgray` 灰阶）。dicha 把同一套结构语汇**换皮**成**暖棕中性 + 柔彩**——结构照搬 zed，色温是自己的。这是落地页作为「最佳范本」的核心价值。

---

## 5. 字体（三声部）

| 声部 | 字体 | 用途 | 实现 |
|---|---|---|---|
| **衬线（主体/情感）** | `'Noto Serif SC', 'Songti SC', serif` | H1/大金句/正文/blockquote | `@theme --font-sans` 已指向它，Tailwind 默认 `font-sans` 即衬线 |
| **等宽（工程/技术）** | `'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace` | 导航、字段标签、kbd、真实读数、真实编号 | 落地页 `Mono` 组件 / app `app-mono` 类 |
| （落地页 SERIF 别名） | `'Noto Serif SC', serif` | 与主体同，落地页内 `SERIF` 常量显式标注情感性标题 | — |

> **铁律**：技术性 / 读数性 / 导航性文字**一律走 mono**；情感性 / 叙事性文字走 serif。两者从不混用。mono 不能被用来生成纯装饰的工程编号或角标。
>
> zed 对应是 `font-plex-serif`（衬线，情感）+ `font-plex-mono`（等宽，技术）。dicha 换成 Noto Serif SC + IBM Plex Mono，分工一致。

字号节奏（落地页实测，`clamp()` 流体）：
- 巨型宣言 H1：`clamp(2.8rem, 8vw, 6.5rem)` `font-medium` `leading-[1.05]` `tracking:-0.01em`
- 段落大金句：`clamp(1.55rem, 3.2vw, 2.65rem)` `leading-[1.55]`
- section 标题 H2：`clamp(1.6rem, 3.6vw, 2.4~2.6rem)` `font-semibold`
- 正文：`13.5~16px` `leading-relaxed`
- mono 标签：`11~13px`，仅用于真实字段、导航、kbd、数据读数；不要添加 `PRO / 01`、`AUTH·OTP`、`№001` 这类氛围型代号。

---

## 6. 排版语汇（Editorial Vocabulary）

> 落地页**刻意让每个 section 排版不同**，避免「等高卡片墙」的单调。这是 zed 式「结构变奏」：

1. **居中宣言**（Hero）——大字 + 副标 + 双按钮，几何水印衬底。
2. **跑马灯物件流**（Marquee）——`border-y` 包夹的横向滚动带，两端 `mask` 渐隐；内容渲染两份、`translateX(-50%)` 无缝循环（`lp-marquee 56s linear`）。
3. **左列表右画布**（FeatureTabs）——纵向 tab，选中行**展开**（铺 DotPattern + 显示正文）+ 右侧 CSS 小景随 tab 切换淡入（`lp-fade 0.4s`）。
4. **读数条**（SpecPanel）——横排 `flex-wrap`，项间虚线竖隔。
5. **编目网格**（Rooms）——`grid-cols-2 lg:grid-cols-3`，每格虚线十字分隔 + hover `bg-surface-alt`。
6. **大金句拼格**（Principles）——`gap-px` 网格用 `background:--line` 当分隔线（1px 缝隙显线）；左列跨两行大金句 + 右上四格小原则 + 右下斜纹填充格（HatchCell 补齐 3×3）。
7. **清单台账**（Extras）——左右双列，描述之间可用领导线式（中间 `border-b border-dotted` 伸缩填充）；不要用 `№01` 这类装饰编号，除非它是真实排序数据。
8. **非对称信笺**（AuthorLetter）——`grid-cols-12`，左 4 列作者卡 / 右 8 列 blockquote，中间虚线竖隔。
9. **留白收尾**（FinalCTA）——居中大字 CTA，无网格无装饰。

**变奏原则**：相邻 section **禁止同款布局**；网格 / 清单 / 居中 / 非对称轮换。section 顶部只放真实标题或业务标签，不加 `// 标签`、缩写编号、坐标角标来营造图纸感。

---

## 7. 物理感交互（Physical Buttons & States）

> zed 的 `fv-style` 体系：按钮 / 卡片有**实体重量**——靠 `inset` 底边阴影模拟「凸起」，hover「摊平」，active「下压」。

### 7.1 按钮（`lp-btn`）
```css
.lp-btn { transition: box-shadow 150ms, background-color 150ms, transform 80ms; }
.lp-btn:active { transform: translateY(1px) scale(0.99); }   /* 所有按钮 active 下压 */

.lp-btn-primary {
  background: var(--sidebar-bg); color: var(--sidebar-ink);
  box-shadow: inset 0 -2px 0 0 color-mix(in oklab, var(--sidebar-ink) 12%, transparent),  /* 底边 inset 凸起 */
              0 1px 3px color-mix(in oklab, var(--sidebar-bg) 40%, transparent);
}
.lp-btn-primary:hover { background: color-mix(in oklab, var(--sidebar-bg) 88%, var(--sidebar-ink)); box-shadow: none; }  /* 摊平 */

.lp-btn-ghost {
  border: 1px solid color-mix(in oklab, var(--ink) 18%, transparent);
  background: color-mix(in oklab, var(--surface) 55%, transparent);
  box-shadow: inset 0 -2px 0 0 color-mix(in oklab, var(--ink) 9%, transparent);
}
```
> zed primary 用 `hsl(219,93%,30%) 0 -2px 0 0 inset`（冷蓝底边）；dicha 换成 `--sidebar-ink` 低透明（暖墨底边）。**结构同，色温换**。
> 圆角基准：常规按钮、输入框、选择项一律使用 `rounded-md`（`--radius: 0.375rem`）。不要用 `rounded-[2px]` / `0.125rem` 的针尖感，也不要把常规按钮做成胶囊或大圆角。

### 7.2 导航 / icon 按钮
- `lp-nav-link` / `app-icon-btn`：`color:--ink-soft`，hover `bg: color-mix(in oklab, var(--ink) 6%, transparent)` + `color:--ink`，active `translateY(1px) scale(0.99)`。
- 块状 hover 底（非纯文字变色）——这是 zed nav item 的标志。

### 7.3 卡片（DashCard）
`dash-card` = `rounded-md`(6px) + `1px var(--hairline)` + `inset 0 -2px 0 0 color-mix(in oklab, var(--ink) 8%, transparent)` 底边凸起。`--interactive:hover` 摊平（`bg:surface-alt, box-shadow:none`），`:active` 下压。

### 7.4 kbd 徽标
`h-[18px] min-w-[18px] rounded px-1 text-[11px]`，mono；普通态 `1px solid --line` + `color:--ink-soft`；chrome 块上用 `.lp-key-on-chrome`（`border: sidebar-ink 35%`, `color: sidebar-ink 85%`）。主按钮内 kbd 用 onDark 变体。

---

## 8. App-shell 延续（结构语汇不止于落地页）

> 落地页是范本，但**同一套语汇已延伸进登录页 + app 内壳**。二次封装组件库时应统一到这套原子。

| 落地页原子 | app-shell 对应 | 组件 |
|---|---|---|
| `Node` | `FrameNode` | `components/FrameNode.tsx`（同几何，`border-hairline bg-canvas`） |
| `lp-btn` | `app-icon-btn` / `app-sidebar-link` | `index.css` `.app-*` 块 |
| `lp-nav-link` | `app-sidebar-link`（深色侧栏版：hover `--sidebar-hover`） | 同上 |
| — | `dash-card`（Zed `fv-style`） | `components/DashCard.tsx` |
| `GridPattern` | `app-shell-noise`（subtle 噪点，zed body noise 轻量版） | `index.css` |
| `Mono` | `app-mono` / `app-dash-section`（`11px uppercase tracking:0.06em`） | 同上 |

app-shell 特有：
- **深色侧栏**（`--sidebar-bg`，日夜都深）+ 浮起内容区（`rounded-l-[20px] shadow-float`），**用阴影代替边框分界**（去后台感）。
- 侧栏 `app-sidebar-noise` 噪点（`opacity:0.04`，`feTurbulence fractalNoise`）+ World 入口 `app-sidebar-world` 暖深渐变。
- header `app-chrome-header`：`82% canvas + saturate(160%) blur(14px)` 毛玻璃（落地页 Nav 同款）。

---

## 9. 落地页 → 组件库（封装路线，当前任务的前置）

> 用户目标：基于 HeroUI / 原生，对齐 zed 风格，二次封装 dicha 专用组件库。**当前任务只提取设计风格**，封装另开 task。以下为对照表，供后续封装参考。

| dicha 原子 | HeroUI 对照 | 封装方向 |
|---|---|---|
| 节点 / 标尺 / 条码 / 网格 / 斜纹 | （无对应，纯 bespoke） | 纯原生 SVG 组件，HeroUI 不碰 |
| `lp-btn` primary/ghost | HeroUI `Button`（`variant=solid/ghost`） | 用 `--accent`/`--default` token 对齐；inset 底边阴影靠 `index.css` 覆盖 |
| `dash-card` | HeroUI `Card` | variant=flat + 覆盖 `box-shadow` 为 inset |
| kbd 徽标 | HeroUI `Kbd` | 覆盖 border/bg 为 `--hairline` |
| nav link / icon btn | HeroUI `Button variant=light` |  |
| 搜索框 / input | HeroUI `Input` | `--field-*` token 已对齐 rounded-md 奇纸底 |

**HeroUI token 对齐已在 `index.css` 完成**（`--background`/`--surface`/`--accent`/`--border`/`--radius:0.375rem`/`--field-*` 全部映射到 dicha 暖色 blueprint）。封装时优先复用这些 seam，不要另起炉灶（见 design-system.md §实现约束）。

---

## 9.5 抽屉 / 弹窗遮罩 = DotsBackdrop（铁律）

> **所有抽屉（drawer）与弹窗（modal/dialog）的 overlay 遮罩一律用 `DotsBackdrop` 组件**，不得用纯色半透明 / 纯 blur / 其它点阵实现。这是日后必须遵守的统一规则。

`components/DotsBackdrop.tsx` —— WebGL2 闪烁点阵 + 半透明叠层（参考 ChemViz ClerkModalBackdrop）：
- 一层 `<canvas>` 同时承载：底色 scrim（`--lp-drawer-scrim-rgb` + `--lp-drawer-scrim-a`，日 0.38 / 夜 0.55）+ 其上随机闪烁的点阵（`--lp-drawer-dot-rgb`，日暖墨 / 夜浅奶油）。
- 跟随 `data-theme` 自动换色（`MutationObserver` 监听），`prefers-reduced-motion` 时停闪。
- props：`visible`（控制 opacity 0.35s 淡入淡出）+ `className`。

**标准用法**（已落地的三个范本，照抄）：
```tsx
// 抽屉（自建 Portal）：lp-drawer-backdrop 当 <button> 背景可点击关闭 + DotsBackdrop 铺满
<button className="lp-drawer-backdrop fixed inset-0 z-[200] backdrop-blur-[14px] backdrop-saturate-150" onClick={close}>
  <DotsBackdrop visible={open} className="pointer-events-none absolute inset-0 size-full" />
</button>

// 弹窗（HeroUI Modal）：Backdrop 内放 DotsBackdrop
<Modal.Backdrop className="lp-drawer-backdrop backdrop-blur-[14px] backdrop-saturate-150">
  <DotsBackdrop visible={isOpen} className="pointer-events-none absolute inset-0 size-full" />
  <Modal.Container>...</Modal.Container>
</Modal.Backdrop>
```

已用此规则的组件：`LandingNavDrawer`、`AppNavDrawer`、`AccountModal`。**新增任何浮层都照此办理**，不得另造遮罩。

---

## 10. 不变式（铁律清单）

1. **No gradients**（背景装饰）/ **No illustrations** / **No decorative images**。例外：公告光带、hero 渐隐层次、暗角 scrim——都是结构服务的层次。
2. **分界线全幅贯穿视口**（`w-[200vw]`），不收容器宽。
3. **节点骑线**走 `--node-*-offset` 变量，**不用 translate 居中**；6px、显式 offset。
4. **禁止装饰性工程文字**：不得添加 `PRO / 01`、`ACCT / 01`、`AUTH·OTP`、`A1`、`F.01`、`№001`、`// 标签` 这类无业务含义的角标、编号、代号、图纸标题栏。
5. **技术文字走 mono，情感文字走 serif**，不混用；mono 只服务真实内容。
6. **rail 装饰组合逐段不同**（`RAILS` 预设），相邻 section 禁同款布局；业务页可以完全不用 rail，避免内容被挤压。
7. **交互控件统一 `rounded-md`**：按钮、输入框、选择项不得使用 `rounded-[2px]` / `0.125rem`，也不要用胶囊或大圆角替代。
8. **颜色只走 token**（`var(--ink)` / `--hairline` / `--lp-brand` …），禁硬编码 `text-gray-*` / `oklch()` / `bg-white/NN`（见 design-system.md §8）。
9. **物理感**：按钮/卡片默认有 inset 底边凸起，hover 摊平、active 下压 `translateY(1px) scale(0.99)`。
10. **昼夜只换变量值**，组件零改动（`@theme inline` + `data-theme`）。
11. **无 legacy 双套**：仓库内不得并存玻璃 + 哑光、冷蓝 + 暖棕两套视觉语言。
12. **抽屉 / 弹窗 overlay 一律用 `DotsBackdrop`**（见 §9.5），不得用纯色 / 纯 blur / 其它点阵。

---

## 参考

- zed 精确拆解：`.trellis/tasks/06-10-landing-frame-polish/research/zed-header-footer.md`、`zed-section-reference.md`、`current-gap-analysis.md`
- 落地页实现：`apps/web/src/routes/index.tsx`（`SectionFrame` / `RAILS` / `Node` / `Slash` / `Ruler` / `Barcode` / `GridPattern` / `DotPattern` / `Mark` / `Reveal` / `Mono` / `Key`）
- token 与工具类：`apps/web/src/index.css`（`lp-*` 行 315–646、`app-*` 行 648–939、`dash-card-*` 行 717–883、`surface-*` 行 941–961）
- app-shell 语汇：`apps/web/src/components/{FrameNode,DashCard,Header,Sidebar}.tsx`
- 材质 / 色彩细则：[design-system.md](./design-system.md)
