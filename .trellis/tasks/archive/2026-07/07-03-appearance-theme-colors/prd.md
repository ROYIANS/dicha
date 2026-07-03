# 外观主题色设置

## Goal

让用户可以在设置页真实切换产品的主题色，先覆盖亮色主题下的视觉色彩 preset。现有暖白纸张感收为默认主题，新增几套马卡龙色系主题，让滴茶的外观可以从“纸张/暖白”切到更轻、更甜但仍克制的界面色调。

## What I Already Know

- 用户希望在“用户设置 > 外观”里提供设置入口，不再只是占位。
- 用户最关心主题色替换：通过主题色改变产品外观。
- 亮色主题先做；暗色主题可以先只有当前这一种，或再扩展，优先由实现规划决定。
- 当前前端已有 `/settings/appearance` 和 `/settings/theme` 二级页。
- `apps/web/src/features/settings/secondary-pages.tsx` 里 `AppearanceSettingsPage` 当前只有“视觉材质 / 紧凑列表 / 纸面纹理”等占位开关，未持久化，也未影响全局视觉。
- `apps/web/src/lib/hooks/useTheme.ts` 当前只管理 `light | dark`，通过 `localStorage` 的 `dicha-theme` 和 `document.documentElement.dataset.theme` 驱动 CSS。
- `apps/web/src/index.css` 是主题 token 单一出处：`:root` 定义日间暖白，`:root[data-theme='dark']` 定义夜间；Tailwind v4 `@theme inline` 已把 CSS 变量映射为工具类。
- 前端规范要求 warm matte / blueprint aesthetic，不使用玻璃拟态、不使用 emoji、设置二级页复用 `SettingsScaffold`。

## Requirements

- 外观设置页必须提供可操作的主题色 preset 选择，而不是占位状态。
- 默认 preset 保留现有暖白柔面哑光/纸张感，并作为“默认主题”。
- 新增多套亮色马卡龙主题，切换后影响全局语义 token，包括画布、表面、描边、强调色、图标 chip 和落地页装饰色。
- 第一阶段提供 5 到 6 个左右的主题选择：默认主题 + 5 个马卡龙亮色主题。
- 主题色选择保存到本机，并在刷新后继续生效。
- 昼夜模式仍然可独立切换；暗色模式 MVP 先保持当前一套暗色视觉，不做多套暗色主题。
- 主题色选择 UI 需要符合设置页已有 iOS 分组行结构，移动端不挤压中文文案。
- 桌面侧边栏左下角“像素世界”卡片需要跟随当前主题色衍生，不再固定为默认暖棕色。
- 所有显示文案走 `apps/web/src/i18n/locales/zh.ts`。

## Acceptance Criteria

- [ ] 进入 `/settings/appearance` 可以看到默认主题和 5 个马卡龙亮色主题选项。
- [ ] 点击任一主题色后，应用主界面颜色立即变化。
- [ ] 刷新页面后，已选主题色仍然生效。
- [ ] 切换日间/夜间模式后，夜间仍使用当前暗色主题；回到日间时恢复所选亮色主题。
- [ ] 设置首页“外观”行的当前值能反映所选主题名，或至少不再固定显示“暖白哑光”造成误导。
- [ ] 侧边栏“像素世界”卡片在切换不同亮色主题时能随主题色变化，并在暗色模式下保持可读。
- [ ] 前端 lint、typecheck 通过；并实际加载 Vite dev module graph 或浏览器页面确认无运行错误。

## Definition of Done

- Tests added/updated where useful for theme parsing/persistence.
- `pnpm --filter @dicha/web lint` passes.
- `pnpm --filter @dicha/web typecheck` passes.
- Dev server/browser verification confirms settings page can switch themes and layout does not break.
- Docs/spec update is considered after implementation.

## Technical Approach

Recommended MVP: extend the existing local theme hook into a small client-side appearance preference store.

- Keep `data-theme="light|dark"` as the mode switch so existing dark/light mechanics stay intact.
- Add a separate root dataset, likely `data-theme-palette="<preset>"`, for light color presets.
- Define preset ids and labels in one TypeScript module, and define CSS variable overrides in `index.css` for `:root[data-theme-palette='...']`.
- Keep the current `:root` values as the default preset.
- In `:root[data-theme='dark']`, keep current dark values authoritative so dark mode ignores light preset color overrides.
- Update `/settings/appearance` with a real preset chooser using swatches/check icons and existing `SettingsPanel`/`SettingsValueRow` patterns.
- Persist with localStorage because this is pure client UI state in MVP and current theme mode already uses localStorage.

## Decision (ADR-lite)

**Context**: The app already uses CSS variables and root `data-theme` for theme mode. Theme colors are global semantic tokens, not component-local styles.

**Decision**: Implement preset selection as root-level CSS variable overrides plus a shared hook/store, rather than hardcoding colors inside components or introducing backend user settings now.

**Consequences**: This keeps the first version small and consistent with the existing design system. Later account sync or marketplace theme packs can layer on top by replacing the persistence source and expanding the preset registry.

## Out of Scope

- Account/server-side sync of theme preference.
- User-created custom color picker.
- Theme marketplace / third-party palette packs.
- Multiple dark theme presets.
- Real persistence for compact rows / paper texture toggles, unless needed as part of cleaning the page around theme presets.

## Expansion Sweep

- Future evolution: theme preset registry can later power theme packs, onboarding-selected palettes, or account-synced preferences.
- Related scenarios: `/settings/theme` remains responsible for light/dark mode; `/settings/appearance` owns color/material preferences.
- Failure & edge cases: unknown localStorage preset should fall back to default; SSR/browser guards must avoid `window` errors; dark mode should not accidentally inherit low-contrast light preset tokens.

## Open Questions

- None for MVP.

## Technical Notes

- Key files inspected:
  - `apps/web/src/features/settings/secondary-pages.tsx`
  - `apps/web/src/lib/hooks/useTheme.ts`
  - `apps/web/src/lib/hooks/useThemeTransition.ts`
  - `apps/web/src/components/ThemeToggle.tsx`
  - `apps/web/src/components/SettingsScaffold.tsx`
  - `apps/web/src/routes/_app/settings.tsx`
  - `apps/web/src/index.css`
  - `apps/web/src/i18n/locales/zh.ts`
- Relevant specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/design-system.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
  - `.trellis/spec/guides/code-reuse-thinking-guide.md`
