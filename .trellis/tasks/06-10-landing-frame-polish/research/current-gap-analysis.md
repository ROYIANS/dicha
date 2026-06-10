# Research: 当前落地页与 zed.dev 的差距清单（含修改建议）

- **Query**: 对照 zed.html 分析 apps/web/src/routes/index.tsx + index.css 的框架/节点/header/footer 差距
- **Scope**: internal（行号基于 2026-06-10 的 index.tsx，共 951 行）
- **Date**: 2026-06-10

## Files Found

| File Path | Description |
|---|---|
| `apps/web/src/routes/index.tsx` | 落地页全部实现（Nav 299-336、Announce 339-354、Frame 358-381、Node 103-111、Slash 114-132、Ruler 140-158、Barcode 161-174、Footer 878-916、LandingPage 920-951） |
| `apps/web/src/index.css` | 设计变量 + lp-* 工具类（217-279 行 landing 专区），**没有任何 node-offset 变量** |
| `.trellis/tasks/06-10-landing-frame-polish/research/zed-header-footer.md` | zed 侧精确值（本文引用的基准） |

---

## 问题 1：双竖线间距太窄 —— 根因

当前 `Frame`（index.tsx 358-381）：

```tsx
<div className="mx-auto flex w-full max-w-[1240px]">
  <div className="relative w-5 shrink-0 sm:w-8 md:w-12" style={{ borderRight: `1px dashed ${LINE}` }}>
    <Ruler ... />   {/* Ruler 在 rail 正中：left-1/2 -translate-x-1/2（140-158 行） */}
  </div>
  <div className="relative min-w-0 flex-1"> ... </div>
  <div className="relative w-5 shrink-0 sm:w-8 md:w-12" style={{ borderLeft: `1px dashed ${LINE}` }}> ... </div>
</div>
```

- 每侧实际有两条可见竖线：**rail 中线上的 Ruler**（距内边界仅 rail 半宽）+ **rail 内边界的 dashed border**。间距 = 10px（w-5）/ 16px（sm:w-8）/ 24px（md:w-12）。
- zed 是**全幅五段**结构：`[窄 rail 16/24/48px（贴视口边）][flex-1 弹性 rail（lg+）][container 1080~1120px][flex-1][窄 rail]`。两条竖线分别压在 **窄 rail 内边界** 和 **container 边界**，间距 = flex rail 宽度（1440px 视口下 ≈ (1440−96−1120)/2 ≈ 112px）。
- 另外 zed 的竖线**贴在边界上**（标尺容器 `width:10px; right:-0.5px; transform:translateX(50%)`，1px 线居中于边界），当前 Ruler 浮在 rail 正中间，位置语义就不对。

### 修改建议（Frame，358-381 行）

1. 去掉 `mx-auto max-w-[1240px]`，改为全幅 `flex w-full`，五段：
   - 窄 rail：`w-4 sm:w-6 md:w-12 shrink-0 relative`（与 zed 一致，当前 `w-5 sm:w-8` 偏宽/不齐断点）
   - 弹性 rail：`relative hidden flex-1 lg:block`，内放 Ruler（贴 container 一侧）+ Barcode（32px 贴 container 边缘，现 Barcode 已存在 161-174 行，挪进来即可）
   - 中央：`relative min-w-0 flex-1 max-w-[1120px]`（或建一个 `.container-max-w` 类：max-width:1080px + md/lg/xl min-width 680/920/1120）
2. Ruler 改为 zed 式贴边：外层 `absolute inset-y-0 right-[-0.5px] w-[10px] translate-x-1/2`（左 rail）/镜像（右 rail），内层保持 1px 分段列。Ruler 组件本身（140-158）只需把定位从 `left-1/2 -translate-x-1/2` 参数化。
3. rail 的 dashed border 可以保留为 vidorra 风格，但若要贴近 zed：body 区 rail border 透明、只显标尺；header 区 rail 用实线。

---

## 问题 2：菱形节点没骑在分界线上 —— 根因（两个）

当前 `Node`（index.tsx 103-111）：`size-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45`，用法 `<Node className="left-0 top-0" />`（Frame 368-371、Slash 128-129）。

1. **被 sticky header 盖住上半截（主因，最显眼）**：header nav 与 hero 之间的节点是 Frame 的 `top-0` 一对（368-369 行），属于 Frame 内容层，`z-30`；而 Nav（301-309 行）是 `sticky z-40` 且带不透明度 82% 的背景。节点中心压在 Frame 顶边 = nav 的 border-bottom 处，**上半个菱形（≈4px）伸进 nav 区域，被 z-40 的 nav 背景盖掉**，视觉上菱形像"挂"在线下面而不是骑在线上。zed 的做法是**节点作为 header 自己的子元素**（z-99，bottom:-3.5px），永远画在 header 背景之上、跟随 sticky 一起动。
2. **半像素误差 + 奇数尺寸**：zed 节点 6px，显式 `bottom:-3.5px`（中心恰落 1px 线中心，公式 3px+0.5px）；当前 7px + `translate -50%`，中心落在元素边缘（线中心偏 0.5px），且 7px/2=3.5px 的 transform 居中在非整数像素上渲染发虚。

### 修改建议

1. `index.css` 增加变量（landing 专区 217 行附近）：
   ```css
   :root { --node-vertical-offset: 3.5px; --node-horizontal-offset: 4.5px; }
   .lp-outer-node-offset { --node-horizontal-offset: 12.5px; }
   @media (min-width:640px){ .lp-outer-node-offset { --node-horizontal-offset: 19.5px; } }
   @media (min-width:768px){ .lp-outer-node-offset { --node-horizontal-offset: 43.5px; } }
   @media (min-width:1024px){ .lp-outer-node-offset { --node-horizontal-offset: 45.5px; } }
   ```
2. `Node`（103-111 行）改为 zed 式：`size-1.5`（6px），去掉 translate，改用显式定位 props（如 `pos="bottom-left"` → `bottom:calc(-1*var(--node-vertical-offset)); left:var(--node-horizontal-offset)`；container 内侧节点 `left:-3.5px`）。z-index 提到 nav 之上（如 z-50）。
3. **把 header/hero 分界上的节点对移进 Nav**（301-334 行）：在 header 根元素内加一对 `absolute bottom:-3.5px` 的节点（左右 offset 用上面的变量），删掉 Frame 顶部那对（368-369 行）或保留给 Announce 底线用。
4. Slash（114-132 行）的两颗节点同样从 `top-0 -translate-y-1/2` 改为骑上边线：`top:calc(-1*var(--node-vertical-offset))` 相对其上线，或保持 translate 但补 `margin-top:-0.5px` —— 推荐统一走变量方案。

---

## 问题 3：Header 逐项差距（Nav，299-336 行）

| 项 | zed | 当前 | 建议 |
|---|---|---|---|
| 框架 | header 自身是五段 rail 框架带（窄 rail 实线 border-r/l、flex rail border-x、nav=container-max-w） | `max-w-[1240px] px-6` 单容器，无 rail | 把 Nav 内部改成与 Frame 同款五段结构，rail 用实线（非 dashed） |
| 高度 | `h-[57px]`（56px+1px 边） | `h-14`（56px）≈ 等价 | 可不动 |
| 背景 | 不透明 `nav-background`（cream-50） | 82% 透明 + backdrop blur | 风格取舍；要贴近 zed 改为不透明 `var(--canvas)` |
| border | `border-t border-b sm:border-t-0` | 只有 borderBottom | 补 `border-t sm:border-t-0`（移动端顶边线） |
| 菱形节点 | 4 颗骑 border-b（外对 lg-only + 内对常显，z-99 在 header 内） | 无 | 见问题 2 建议 3 |
| 导航项 | `h-8 px-2.5 text-sm rounded-sm hover:bg-offgray-50/80`，active 下压 `translate-y-px scale-[.99]` | 纯文字 hover 变色（315-321 行） | 给 nav link 加 h-8 块状 hover 底 + active 下压 |
| 右侧组 | 搜索(kbd) → **竖分隔线 `h-5 w-px border-l`** → Account → Download(物理按钮+kbd D) | 搜索框、登录、按钮之间无分隔线（322-332 行） | 在搜索徽标与"登录"之间补 `<span class="h-5 w-px border-l" />` |
| 移动端 | `lg:hidden size-8 border` 汉堡按钮 | 无（md 以下导航直接消失） | 补一个汉堡按钮占位（可后续接抽屉） |
| kbd 徽标 | `h-5 px-1.5 text-[.6875rem] font-bold border-gray-500/20 bg-gray-50/50` | Key 组件（274-287 行）`h-[18px] text-[11px]` 仅描边 | 可加浅底色 `bg-gray-50/50` 提质感 |

另外 `Announce`（339-354 行）的 borderBottom 只有容器宽；zed 的横向分界全部 `-left-[100vw] w-[200vw]` 全幅贯穿。建议 Announce 底线改为伪元素 200vw 全幅线，并在其上骑一对节点（这正是"header 区与 hero 内容"的第二条分界）。

---

## 问题 4：Footer 逐项差距（Footer，878-916 行）

| 项 | zed | 当前 | 建议 |
|---|---|---|---|
| 框架 | 五段 rail 框架（窄 rail+flex rail+container），rail 内 `text-white/14` 分段竖线延续到底 | `max-w-[1240px] px-6` 单容器 | footer 也套 Frame 同款五段结构，标尺颜色换 `rgba(243,239,232,0.14)` |
| 菱形节点 | 一对骑 footer **上边界**（`top:-3.5px`，base 即显示）+ container 内对（lg-only） | 无 | footer 根加 `relative` + 节点对 `top:calc(-1*var(--node-vertical-offset))` |
| 顶部分界 | footer 上边界即水平线（节点压线） | footer 与 FinalCTA 之间无明确 hairline | 加 `border-top: 1px solid` 浅色线（深底上用 cream 低透明） |
| 列布局 | `grid md:grid-cols-4 lg:grid-cols-6 divide-white/10 lg:divide-x`，第 1 列 `sm:col-span-2`，列 `py-4 lg:py-6 px-4 gap-4` | `grid-cols-2 sm:grid-cols-5 gap-10`，无列分隔线（889 行） | 改 6 列 + `lg:divide-x divide-[rgba(243,239,232,0.1)]` |
| 链接样式 | `underline decoration-white/20 hover:decoration-white underline-offset-2`；外链 `↗` 为 `text-white/50 ml-2` 独立 span | 纯色 hover 变亮（904 行）；`↗` 直接拼在文字里（883 行） | 改下划线渐显样式，外链箭头拆成半透明 span |
| 第 1 列 | © 标题 + `<hr class="my-2 w-20 border-t border-white/10">` + 法务链接 | 有 ©/登录/条款（890-898 行），无短 hr | 补 `w-20` 短分隔线 |
| 底部装饰带 | `py-6 -mb-16 border-t border-white/10` 三层：45° 斜纹 + 渐隐水平刻线（16×1000 pattern，opacity 1→0.01）+ **描边**巨型 logo（fill-opacity 0.025 / stroke white 0.2） | 实心 wordmark `translateY(28%)`（910-912 行），无斜纹/刻线带，无 border-t | 加 `border-t` 装饰带；wordmark 改描边字效果（`-webkit-text-stroke` 或 SVG text），叠 Slash 同款斜纹 + 渐隐刻线 pattern |
| 纹理 | noise 贴图 `bg-[size:180px] opacity-[0.035]` | 34px 方格网格 opacity 0.10（887 行） | 风格取舍；方格可调淡或换噪点 |
| 暗色 | dark 下节点底色 `hsl(219,92%,2%)`、线色变体 | 落地页未接 data-theme 切换 | 节点/线色都已用 var()，footer 深底是常量 BROWN，可不动 |

---

## 问题 5：section 分界线（次要）

- 当前 `Slash`（114-132 行）≈ zed `divider-slash`，但斜纹 pattern 是 6×6/1.5px、无 `py-[1px]` 内缩；zed 是 4×4/1.5px + py-[1px]（斜纹不顶到上下线）。建议补 `py-[1px]`。
- 当前节内分隔大量用 dashed（HRule 135-137、FeatureTabs 507、RoomCell 726-727 等），zed 节内多为实线 hairline + 全幅 200vw 伪元素。属风格选择，可保留 dashed 作为 vidorra 个性。

## 执行顺序建议

1. index.css 加 node-offset 变量 + `.lp-outer-node-offset`（问题 2-1）
2. 重写 Frame 为全幅五段（问题 1），Ruler 贴边参数化
3. Node 改 6px 显式定位；Nav/Announce/Slash/Footer 各自挂节点（问题 2、3、4）
4. Nav 补 rail/竖分隔/border-t/汉堡（问题 3）
5. Footer 套框架 + divide-x + 下划线链接 + 装饰带（问题 4）

## Caveats

- 行号基于当前未提交版本（git status 显示 index.tsx/index.css 为新增未跟踪文件），改动后行号会漂移。
- zed 在 lg 以下隐藏外侧节点（offset 值在 sm/md 并不精确压线），实现时 lg 以下可直接 `hidden lg:block`，不必追求小屏压线。
