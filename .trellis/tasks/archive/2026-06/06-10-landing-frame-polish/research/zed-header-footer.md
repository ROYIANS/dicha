# Research: zed.dev header / footer / 分界线与菱形节点的精确实现

- **Query**: 从 zed.html 提取 header、footer、section 分界线、菱形节点定位的 CSS 变量与具体值
- **Scope**: external（zed.html 抓取文件 + zed.dev 线上 CSS chunk `06~-~srj9s.v~.css`）
- **Date**: 2026-06-10

> 原始 HTML 切片已落盘：`research/zed-header.html`（header 全文，位于 zed.html 字节 17299–32107）、`research/zed-footer.html`（footer 全文，字节 1326178–1361620）。
> CSS 变量定义不在 zed.html 内（在外链 Next.js CSS chunk 里），以下值取自线上 `https://zed.dev/_next/static/chunks/06~-~srj9s.v~.css`。

## 1. 关键 CSS 变量（精确值）

```css
/* :root 级（CSS chunk 内） */
:root, :host {
  --node-vertical-offset: 3.5px;
  --node-horizontal-offset: 4.5px; /* 默认值，几乎总是被覆盖 */
}

/* outer-section-node-offset：每个 section/header/footer 根上都挂这个类，
   按断点覆盖水平 offset（= 窄 rail 宽度 - 3px 节点半宽 ± 0.5px 线宽修正） */
.outer-section-node-offset { --node-horizontal-offset: 12.5px; }   /* base: rail w-4=16px → 中心 15.5px */
@media (min-width:640px)  { .outer-section-node-offset { --node-horizontal-offset: 19.5px; } }  /* sm: w-6=24px */
@media (min-width:768px)  { .outer-section-node-offset { --node-horizontal-offset: 43.5px; } }  /* md: w-12=48px */
@media (min-width:1024px) { .outer-section-node-offset { --node-horizontal-offset: 45.5px; } }  /* lg: 节点中心 48.5px = flex-rail border-x 线中心 */

/* 中央 container 自己的一对节点：内联在 class 里 */
[--node-horizontal-offset:-3.5px]  /* → 节点中心 = -0.5px = container 左/右边界 1px 线的中心 */

/* container 宽度 */
.container-max-w { max-width: 1080px; }
@media (min-width:768px)  { .container-max-w { min-width: 680px; } }
@media (min-width:1024px) { .container-max-w { min-width: 920px; } }
@media (min-width:1280px) { .container-max-w { min-width: 1120px; } }  /* min>max → xl 时实际宽 1120px */

/* 颜色工具类 */
.nav-background { background-color: var(--color-cream-50); }          /* 不透明，无 backdrop blur */
.nav-background:where(.dark, .dark *) { background-color: #121316; }
.default-border-color { border-color: #dadde2; }                       /* dark: offgray 混黑 14%/14% 透明 */
.default-border-text-color { color: #dadde2; }                         /* 分段竖线 / 条码纹用 currentColor */
--color-offgray-100: #ced1d6;                                          /* 节点描边色 */
```

## 2. 菱形节点（diamond node）的骑线数学

节点本体：`absolute z-99 size-1.5 rotate-45 border border-offgray-100 bg-white`，即 **6×6px 方块绕中心转 45°**（视觉对角线 ≈ 8.5px）。**不用 translate 居中**，全部用显式 offset：

- **垂直骑线**：`[bottom:calc(-1*var(--node-vertical-offset))]` = `bottom:-3.5px`
  → 盒子底边在分界线下方 3.5px，中心在元素底边缘下方 **0.5px** —— 正好是下一条 1px 水平 hairline 的**线中心**。footer 用 `[top:calc(-1*3.5px)]` 镜像骑在自己的上边界线上。
  公式：`3.5px = 节点半宽 3px + 线半宽 0.5px`。
- **水平压竖线**：
  - 外侧一对：`left/right: var(--node-horizontal-offset)`（lg 时 45.5px → 中心 48.5px，恰为 48px 窄 rail 与 flex rail 的 `border-x` 1px 线中心）。
  - container 一对：`left/right: -3.5px` → 中心 -0.5px，压在 container 边界 1px 线中心。**仅 lg 显示**（`hidden lg:block`，header 的 nav 内一对除外，始终显示）。
- 节点是**所属区块自己的子元素**（header 的节点在 header 内、section 的在 section 内），跟随 sticky header 一起滚动/置顶，且 `z-99` 画在区块背景之上 —— 不会被相邻层级的背景盖掉上半截。

## 3. 水平分界线由谁画

- header：自身 `border-t border-b sm:border-t-0`（h-[57px] 整条框架带），节点骑 header 自己的 border-b。
- section 之间三种分隔，全部**全幅贯穿视口**：
  1. `<hr class="w-full border-t default-border-color">`（普通 hr）
  2. `<section id="divider-main" class="relative before:absolute before:top-0 before:-left-[100vw] before:[z-index:-1] before:h-px before:w-[200vw] default-border-before-color">`（伪元素 200vw 细线）
  3. `<section id="divider-slash" class="relative h-3.5 w-full before:... after:...">`：上下各一条 200vw 细线 + 内部 4×4 `rotate(45)` 斜纹 SVG（`stroke-width:1.5`、`py-[1px]`、`!opacity-30 dark:!opacity-60`）
- section 自己的节点 `bottom:-3.5px` 骑在**紧随其后的 hr/divider 线**上。

## 4. Header 完整结构（zed-header.html）

```html
<header class="sticky top-0 z-100 h-[57px] shrink-0 nav-background flex min-w-0
               default-border-color border-t border-b sm:border-t-0 outer-section-node-offset">
  <!-- 外侧节点对（hidden lg:block），骑在 header border-b 上 -->
  <div class="absolute z-99 size-1.5 rotate-45 border border-offgray-100 bg-white
              [bottom:calc(-1*var(--node-vertical-offset))] [left:var(--node-horizontal-offset)] hidden lg:block"></div>
  <div class="... [right:var(--node-horizontal-offset)] hidden lg:block"></div>

  <span class="w-4 sm:w-6 md:w-12 shrink-0 border-r lg:border-r-0 default-border-color"></span>  <!-- 窄 rail，实线边 -->
  <span class="hidden flex-1 border-x default-border-color lg:block"></span>                      <!-- 弹性 rail，lg+ -->

  <nav class="w-full relative isolate z-2 pl-3 lg:pl-3.5 pr-3 container-max-w flex-1
              flex items-center justify-between gap-4 lg:gap-0 [--node-horizontal-offset:-3.5px]">
    <!-- 内侧节点对（始终显示），压 container 边线 × header 底线 -->
    <div class="absolute z-99 size-1.5 rotate-45 ... [bottom:calc(-1*var(--node-vertical-offset))] [left:var(--node-horizontal-offset)]"></div>
    <div class="... [right:var(--node-horizontal-offset)]"></div>
    <!-- 左组：logo(h-[23px] svg) + 主导航 ul（hidden lg:flex gap-0.5，item h-8 px-2.5 text-sm，hover:bg-offgray-50/80） -->
    <!-- 右组 ul（gap-1.5）：搜索按钮(含 kbd 徽标 h-5 text-[.6875rem] border-gray-500/20 bg-gray-50/50)
         → 竖分隔 <li class="h-5 w-px border-l default-border-color"></li>
         → Account 下拉 → Download 主按钮（h-8 px-2.5，inset 物理阴影
           [box-shadow:hsl(219,93%,30%)_0_-2px_0_0_inset,_hsl(219,93%,95%)_0_1px_3px_0]，hover 摊平，kbd "D"） -->
    <!-- 移动端汉堡：inline-flex lg:hidden size-8 rounded-sm border default-border-color -->
  </nav>

  <span class="hidden flex-1 border-x default-border-color lg:block"></span>
  <span class="w-4 sm:w-6 md:w-12 shrink-0 border-l lg:border-l-0 default-border-color"></span>
</header>
```

要点：
- header **本身就是一条 rail 框架带**（与 body section 同款五段 flex），rail 边线在 header 内是**实线**（`default-border-color`），不像 body section 里是透明 border + 分段标尺。
- 背景为**不透明** cream-50（无毛玻璃/blur）。
- 4 颗节点全部骑 header 自己的 border-b：外侧对 lg-only，内侧对常显。

## 5. Footer 完整结构（zed-footer.html）

```html
<footer class="relative flex min-w-0 outer-section-node-offset bg-accent-blue text-offgray-50 min-h-fit">
  <!-- 节点对骑在 footer 上边界：[top:calc(-1*var(--node-vertical-offset))] left/right:var(--node-horizontal-offset) -->
  <!-- 五段 flex 同 section：窄 rail / flex rail(lg) / container-max-w / flex rail / 窄 rail -->
```

- **rail 内容**：分段竖线同 section（10px 定位容器贴 rail 内边界 `right:-0.5px; translateX(50%)`，1px 列，flex 随机分段，实/虚混合），但颜色用 `text-white/14`（深底上的白色低透明），flex rail 上还铺 noise 贴图（`bg-[size:180px] opacity-[0.035]`）。
- **container 内**（`relative isolate overflow-clip size-full p-0` + noise）：
  - 链接栅格：`grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-2 lg:gap-6 divide-white/10 lg:divide-x`
  - 第 1 列 `col-span-1 sm:col-span-2`：`<h3 class="font-plex-serif h6 text-white">Zed Industries © 2026</h3>` + `<hr class="my-2 w-20 border-t border-white/10">` + Sign Out / Terms / Attributions / Cookies
  - 其余 4 列（Product/Resources/Company/Social）：`py-4 lg:py-6 px-4 flex flex-col gap-4`，`<ul class="flex flex-col gap-3 text-sm">`
  - 链接样式统一：`underline decoration-white/20 hover:decoration-white underline-offset-2`；外链尾缀 `<span class="text-white/50 ml-2">↗</span>`
  - **底部装饰带**：`relative py-6 -mb-16 col-span-full w-full flex justify-center border-t border-white/10`，内含三层：
    1. 45° 斜纹 SVG（pattern 4×4，stroke-width 1.5，`text-white/20`）
    2. 渐隐水平刻线 SVG（pattern 16×1000，每 10px 一条线，stroke-opacity 1→0.01 线性衰减，`stroke-blue-500 opacity-20`）
    3. 巨型描边 logo SVG（824×258，`opacity-40`，`fill:white; fill-opacity:0.025; stroke:white; stroke-opacity:0.2; stroke-width:1.2`）——靠 `-mb-16` + 父级 `overflow-clip` 裁掉下缘
- 节点对：外侧 `top:-3.5px`（base 即显示），container 内侧一对 `hidden lg:block`。

## 6. body section 五段框架（对照基准，详见 zed-section-reference.md）

`[窄 rail w-4/6/12, border-transparent] [flex rail hidden lg:block border-x transparent] [container-max-w flex-1] [flex rail] [窄 rail]`
- body section 的 rail border 全部 transparent —— 可见竖线是 rail 内**分段标尺**（1px 列贴 rail 内边界 ±0.5px）与 flex rail 上 32px 宽**条码刻线 pattern**（贴 container 边缘）。
- 每个 section 高度 `min-h-[448px]`/`min-h-[450px]`，根类 `outer-section-node-offset`。

## Caveats / Not Found

- zed.html 本体不含上述 CSS 变量定义（只有使用处），定义全部在外链 CSS chunk，已从线上拉取验证。
- sm/md 断点的 `--node-horizontal-offset`（19.5/43.5）按"rail宽-3-0.5"算各差 1px（22.5 vs 23.5），但外侧节点 `hidden lg:block`，lg 以下不渲染，zed 没做精确对齐；lg 值 45.5（中心 48.5）是精确压线的。
- footer 渐隐刻线 SVG 共 100 条 line（每 10px、opacity 步进 0.01），实现时应该用 JS/循环生成而非手写。
