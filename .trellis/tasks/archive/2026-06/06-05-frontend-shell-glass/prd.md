# Frontend App Shell & Liquid Glass Design System

## Goal

在现有 `apps/web` scaffold（React 19 + Vite + TanStack Router + HeroUI v3 + Tailwind v4）基础上，建立 vidorra 的**前端底座**：三模式 IA（Dashboard / Collection / World）的 App Shell、Liquid Glass 设计系统（GlassPanel + token 层）、分区式侧边栏、Dashboard 骨架，以及 dev bypass auth 占位。

## Background

- `apps/web` 已有完整 scaffold（health 竖切验证通过，lint/typecheck 全绿）
- 架构决策已锁定（见 `architecture.md §4`）：三模式 IA，Dashboard 默认，World 是奖励层
- Liquid Glass skill 已安装：`.cursor/skills/liquid-glass-css-skill/`
- 本 task **不做**：真实 Auth（独立 task）、任何 API 数据接入、录入流程、PixiJS

## What to Build

### 1. Liquid Glass 设计系统

**Token 层**（`apps/web/src/styles/glass.css` 或 `index.css` 中扩展）：

```css
:root {
  /* glass surface tiers */
  --glass-bg-1: color-mix(in srgb, white 12%, transparent);
  --glass-bg-2: color-mix(in srgb, white 20%, transparent);
  --glass-border: color-mix(in srgb, white 35%, transparent);
  --glass-highlight: color-mix(in srgb, white 55%, transparent);
  --glass-shadow-sm: 0 2px 8px rgba(0,0,0,0.08);
  --glass-shadow-md: 0 8px 24px rgba(0,0,0,0.12);
  --glass-shadow-lg: 0 16px 40px rgba(0,0,0,0.16);
  --glass-blur-sm: 10px;
  --glass-blur-md: 18px;
  --glass-blur-lg: 28px;
  /* app background */
  --app-bg-from: oklch(96% 0.01 250);
  --app-bg-to: oklch(93% 0.02 280);
}
```

**`GlassPanel` 组件**（`apps/web/src/components/GlassPanel.tsx`）：

- props: `variant?: 'default' | 'strong' | 'subtle'`、`className?`、`children`
- `default`：`--glass-bg-1` + `blur-md` + 边缘高亮（顶部渐变）+ `--glass-shadow-sm`
- `strong`：`--glass-bg-2` + `blur-lg`（侧边栏/顶栏用）
- `subtle`：`--glass-bg-1` + `blur-sm`（Dashboard 卡片用）

**全局背景**：`<body>` 或 app root 设置渐变背景场（glass 才有东西采样）。参考 mock 的紫蓝灰渐变。

### 2. App Shell 布局

路由结构（TanStack Router file-based）：

```
src/routes/
  __root.tsx         ← 已有，改造成 Shell 根布局
  index.tsx          ← Dashboard（已有，改造）
  _app.tsx           ← 新：需要 auth 的路由组（beforeLoad dev bypass）
  _app/
    storage-room.tsx ← 杂物间占位
    wardrobe.tsx     ← 衣橱占位（disabled UI）
    library.tsx      ← 书房占位（disabled UI）
    world.tsx        ← 世界 stub
```

**Shell 布局**（`__root.tsx`）：

```
┌────────────────────────────────────────────┐
│ Sidebar (fixed, 220px, GlassPanel strong)  │
│ ┌──────────────────────────────────────┐   │
│ │ vidorra logo + tagline               │   │
│ │ ─── 仪表盘 ─────────────────────── │   │
│ │ 仪表盘                               │   │
│ │ ─── 房间 ──────────────────────── │   │
│ │ 衣橱 (disabled)                      │   │
│ │ 书房 (disabled)                      │   │
│ │ 杂物间                               │   │
│ │ ─── 工具 ──────────────────────── │   │
│ │ 搜索 (stub)                          │   │
│ │ ─── 世界 ──────────────────────── │   │
│ │ 世界                                 │   │
│ │                                      │   │
│ │ 底部：用户区 + 设置图标              │   │
│ └──────────────────────────────────────┘   │
│ Main content (flex-1, overflow-auto)       │
└────────────────────────────────────────────┘
```

### 3. Dev Bypass Auth

- `apps/web/src/lib/auth.ts`：export `DEV_USER = { id: 'dev', name: 'Royians', avatar: null }`
- `VITE_DEV_BYPASS_AUTH=true` 时，`_app.tsx` 的 `beforeLoad` 跳过守卫，注入假用户到 router context
- `VITE_DEV_BYPASS_AUTH` 加入 `src/lib/env.ts` 的 zod schema（`z.enum(['true','false']).optional()`）

### 4. Dashboard 骨架（`/` 路由）

按 mock 布局：

```
顶栏（贯穿主内容区）：
  左：天气图标 + 问候语（"早安，Royians"）+ 副标题
  右：城市/日期 + 通知图标

Widget 行 1（3 列）：
  今日记录 widget（GlassPanel subtle）← 空态「0 件物品」
  最近阅读 widget（GlassPanel subtle）← 空态
  衣橱提醒 widget（GlassPanel subtle）← 空态

我的空间（2 行 grid）：
  衣橱 / 书房 / 杂物间 / 月度报告卡片（GlassPanel subtle）
  数字全 0，点击跳路由

最近的物品（横向滚动）：← 空态「还没有物品」

右侧（固定宽度）：
  进入我的小窝（GlassPanel，静态 isometric 截图 or 色块占位）
  进入世界按钮
  心情状态（hardcode 92/100）
  本周打卡（hardcode 示例）

底部录入条（fixed bottom，GlassPanel strong）：
  + 按钮（圆形紫色渐变）
  输入框（「记录一件物品...」）
  相机 / 扫码 / AI 星星图标
  点击任何 → toast("录入功能即将开放")
```

### 5. 各路由占位

- `/storage-room`：大标题「杂物间」+ 「功能建设中」空态
- `/wardrobe`、`/library`：同上 + `coming soon` badge
- `/world`：全屏深色背景 + 「进入我的小窝 · M2 即将开放」文字 + 返回按钮

## Acceptance Criteria

- [ ] `pnpm dev` 启动后，访问 `/`，看到 Dashboard 骨架（Glass 效果、侧边栏、顶栏、widget 空态、底部录入条）
- [ ] 侧边栏分区正确（仪表盘 / 房间区 / 工具区 / 世界区 / 用户区），衣橱/书房视觉 disabled
- [ ] 点击侧边栏各项跳转到对应路由，不 404
- [ ] 点击录入条任何元素 → `sonner` toast 出现
- [ ] `VITE_DEV_BYPASS_AUTH=true` 下，导航不跳登录，显示假用户名「Royians」
- [ ] `pnpm typecheck` + `pnpm lint` 通过，无 `any` / 无 `@ts-ignore`
- [ ] GlassPanel 组件可复用，三种 variant 正常渲染
- [ ] 全局背景是渐变场（不是纯色），glass 有东西可采样

## Out of Scope

- 真实 Auth / Casdoor（独立 task）
- 任何 API 数据（各 feature task 回填）
- 录入流程逻辑（独立 task）
- PixiJS / World 真实内容（M2）
- 衣橱 / 书房 Collection 功能（M3）
- 移动端响应式（MVP 桌面优先）

## Technical Notes

- **Glass 必须有背景可采样**：body/app-root 设渐变背景，sidebar/主内容区透明，不能是白色实底
- **Shared Shell 优先**：GlassPanel 一个组件给所有卡片/侧边栏/顶栏/Modal 继承，不散写 backdrop-blur utility
- **层级**：侧边栏 `blur-lg`（强）→ Dashboard 顶栏 `blur-md` → widget 卡片 `blur-sm`（弱），三层材质区分
- **边缘高亮必须有**：顶部 `linear-gradient` 白色渐变（从 55% 白到透明），没有边缘高亮的 glass 只是模糊卡片
- **数据密集区更实**：未来杂物间 grid 用更低透明度，chrome 区（侧边栏/顶栏）更透明
- **路由结构**：`_app` 路由组用于 auth 守卫；`/`（Dashboard）不需要 auth（公开欢迎页风格，但 M1 dev 下直接显示用户内容）
- **i18n**：沿用已有 `react-i18next` + zh locale，新增对应 key
- **图标**：沿用已有 `lucide-react`
