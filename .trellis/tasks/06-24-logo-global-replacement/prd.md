# 全局替换应用 Logo

## Goal

将用户提供的单色 SVG logo 作为全站统一品牌图标，替换当前临时 `v` 徽标，并让 SVG 使用 `currentColor` 适配深色侧栏、浅色画布、落地页导航等不同界面。

## What I Already Know

- 用户已提供新资产：`apps/web/public/assets/logo.svg`。
- 该 SVG 是单色图标，当前 `path` 使用硬编码 `fill="#2F2B27"` 和 `stroke="#2F2B27"`。
- 当前 app shell 的品牌入口集中在 `apps/web/src/components/AppBrand.tsx`，由桌面 `Sidebar` 和移动 `AppNavDrawer` 复用。
- 现有 `AppBrand` 使用临时 `v` 方形徽标 + `dicha` 字标，需要替换徽标部分而不是删掉文字品牌。
- Header 右侧是用户头像入口，不属于品牌 logo。

## Requirements

- 将 `apps/web/public/assets/logo.svg` 改为单色可继承颜色的 SVG：`fill`/`stroke` 使用 `currentColor`。
- 新增或复用一个 React 品牌图标渲染方式，引用 `/assets/logo.svg` 或内联等价 SVG，确保颜色能随 `currentColor` 变化。
- 全局替换现有临时品牌徽标，优先覆盖 app shell：桌面侧栏、移动导航抽屉。
- 保留 `dicha` 文字品牌，不把本次任务扩大成命名/文案重设计。
- 图标在深色侧栏和浅色画布上都应可读，不出现硬编码深色导致的低对比问题。
- 不引入多色 logo，不做复杂动画。

## Acceptance Criteria

- [ ] `apps/web/public/assets/logo.svg` 不再硬编码品牌色，单色路径使用 `currentColor`。
- [ ] 桌面侧栏品牌区显示新 logo。
- [ ] 移动导航抽屉品牌区显示新 logo。
- [ ] 品牌图标颜色在深色侧栏为浅色，在浅色画布为深色或 `--ink`，与周围 UI 协调。
- [ ] 现有临时 `v` 徽标不再作为主品牌 mark 出现。
- [ ] `pnpm --filter @dicha/web lint` 与 `pnpm --filter @dicha/web typecheck` 通过。
- [ ] 尽量通过本地页面预览或截图快速确认视觉效果。

## Definition of Done

- 代码和 SVG 文件使用 UTF-8 无 BOM + CRLF。
- 前端 lint/typecheck 通过。
- 变更保持小范围，主要限于 logo asset、品牌组件及必要样式。
- 若发现落地页存在独立品牌 mark，也一并纳入同一视觉口径。

## Out of Scope

- 不重做完整品牌系统。
- 不修改产品名、tagline 或导航结构。
- 不处理 favicon / PWA 图标，除非现有代码明确复用同一 logo。
- 不创建多色、渐变或动画版本。

## Technical Notes

- Relevant files discovered:
  - `apps/web/public/assets/logo.svg`
  - `apps/web/src/components/AppBrand.tsx`
  - `apps/web/src/components/Sidebar.tsx`
  - `apps/web/src/components/AppNavDrawer.tsx`
- Frontend specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/design-system.md`
  - `.trellis/spec/frontend/blueprint-aesthetic.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
