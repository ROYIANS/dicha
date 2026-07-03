# 昼夜模式自动切换

## Goal

实现设置页“昼夜模式”里的“跟随时间自动切换”，让滴茶可以根据设备本地时间自动在日间和夜间外观之间切换。当前任务只聚焦昼夜模式本身，不扩展其它外观设置。

## What I Already Know

- 用户希望实现设置菜单里已有的“跟随时间自动切换”入口。
- 当前 `apps/web/src/lib/hooks/useTheme.ts` 已维护 `theme: light | dark` 和 `palette`，通过 `data-theme` / `data-theme-palette` 驱动 CSS，并写入 localStorage。
- 当前 `ThemeSettingsPage` 已展示手动切换行，并把“跟随时间自动切换”标为 `settings.values.soon`。
- `ThemeToggle` 和 `useThemeTransition` 目前只调用 `toggle()`，未区分手动/自动。
- 设计系统 spec 已记录主题色 preset，暗色仍是一套全局夜间 token。
- 这个功能是纯客户端 UI 偏好，MVP 不需要后端账户同步。

## Requirements

- 昼夜模式设置页提供可操作的“跟随时间自动切换”开关，不再显示“稍后”。
- 开启自动后，应用根据设备本地时间解析当前应使用日间或夜间主题。
- MVP 时间规则：`06:00 <= 本地时间 < 18:00` 使用日间；其它时间使用夜间。
- 自动模式需要持续生效：页面加载、刷新、跨分钟/跨边界时间变化后都能同步。
- 关闭自动或点击任意手动主题切换按钮时，回到手动模式，并保存当前手动主题。
- 设置页需要清楚展示当前模式是“手动”还是“自动”，以及自动模式下当前解析出的日间/夜间状态。
- 偏好保存到本机 localStorage；不做账号同步。
- 继续保持主题色 palette 与昼夜 mode 解耦：自动只决定 `light | dark`，不改变用户选择的主题色 preset。

## Acceptance Criteria

- [ ] `/settings/theme` 的“跟随时间自动切换”是一个可切换开关。
- [ ] 开启自动模式后，`data-theme` 会按本地时间规则变成 `light` 或 `dark`。
- [ ] 刷新页面后自动模式仍然生效。
- [ ] 自动模式下跨过 06:00 或 18:00 边界时，主题能自动更新。
- [ ] 点击 Header / Landing / 设置页里的手动昼夜切换按钮，会退出自动模式并保存新的手动主题。
- [ ] 外观主题色 preset 不会被自动模式改写。
- [ ] 前端 lint、typecheck、相关单测通过；Vite dev module graph 可加载。

## Definition of Done

- Unit tests cover automatic time resolution and preference parsing.
- `eslint "src/**/*.{ts,tsx}"` passes in `apps/web`.
- `tsc --noEmit -p tsconfig.json` passes in `apps/web`.
- Vite dev module graph loads changed theme modules.
- Spec update considered after implementation.

## Technical Approach

- Extend `useTheme` state from `{ theme, palette }` to include `mode: 'manual' | 'auto'` and a persisted manual theme.
- Add pure helpers in the theme hook/module for:
  - validating persisted mode
  - resolving `light | dark` from a `Date`
  - calculating milliseconds until the next 06:00/18:00 boundary
- In auto mode, apply resolved theme on load and schedule the next boundary update with `setTimeout`; avoid polling.
- `toggle()` remains the manual action: it flips current theme, switches mode to `manual`, and persists the manual theme.
- Add `setMode` / `setAutoMode` for the settings switch.
- Keep `data-theme-palette` behavior unchanged.

## Decision (ADR-lite)

**Context**: The app already has localStorage-backed theme mode and a root `data-theme` contract. The missing part is an automatic source of truth for day/night.

**Decision**: Implement local-clock based auto mode with fixed day window (`06:00-18:00`) and no geolocation or system preference integration in MVP.

**Consequences**: This is privacy-preserving, deterministic, easy to test, and fits the current local-first UI preference layer. Later tasks can add system preference, custom schedule, or location-aware sunrise/sunset without changing CSS tokens.

## Out of Scope

- Location-aware sunrise/sunset.
- System color scheme integration.
- Custom day/night schedule UI.
- Backend/account sync.
- Multiple dark theme presets.

## Technical Notes

- Key files inspected:
  - `apps/web/src/lib/hooks/useTheme.ts`
  - `apps/web/src/lib/hooks/useThemeTransition.ts`
  - `apps/web/src/components/ThemeToggle.tsx`
  - `apps/web/src/features/settings/secondary-pages.tsx`
  - `apps/web/src/i18n/locales/zh.ts`
  - `.trellis/spec/frontend/design-system.md`
- Relevant specs:
  - `.trellis/spec/frontend/index.md`
  - `.trellis/spec/frontend/design-system.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/state-management.md`
  - `.trellis/spec/frontend/quality-guidelines.md`
