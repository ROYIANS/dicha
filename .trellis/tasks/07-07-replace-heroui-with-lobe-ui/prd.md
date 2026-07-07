# 替换 HeroUI 为 Lobe UI

## Goal

将前端项目中的 HeroUI 彻底替换为 Lobe UI 体系，移除 `@heroui/react` 与 `@heroui/styles` 的全部依赖和样式入口；基础交互组件迁移到 `@lobehub/ui` / Ant Design 组合，并适配项目现有暖白哑光、工程纸结构与多主题 CSS token 设计。

## What I Already Know

* 用户明确目标：全部替换 HeroUI，移除 HeroUI 的全部依赖。
* `apps/web` 和 `apps/admin` 当前都依赖 `@heroui/react`、`@heroui/styles`。
* `apps/web/src/index.css` 与 `apps/admin/src/index.css` 都 import 了 `@heroui/styles`。
* 直接 `@heroui/react` 组件使用只有 `apps/web` 两处：
  * `apps/web/src/features/settings/ai-settings-pages.tsx` 使用 `Dropdown`、`Input`、`Tooltip`。
  * `apps/web/src/routes/login.tsx` 使用 `InputOTP`。
* `apps/admin` 没有直接使用 `@heroui/react` 组件，但依赖和 CSS 入口仍需清理。
* 本地 `D:\Code\Study\lobe-ui` 源码显示包名为 `@lobehub/ui`，当前版本 `5.19.0`，peer dependencies 包含 `antd ^6.1.1`、`motion ^12`、`react ^19`、`react-dom ^19`。
* Lobe UI 不是 HeroUI 的一比一替代：基础表单控件部分依赖 Ant Design；Provider 需要 `ThemeProvider` 与 `ConfigProvider motion={motion}`。
* Lobe UI 本地源码中 OTP 组件命名为 `InputOPT`，内部包装 `AntInput.OTP`，API 与 HeroUI `InputOTP.Group/Slot` 写法不同。
* `lucide-react`、`@lobehub/icons`、`recharts`、`sonner`、`altcha`、`boring-avatars`、`@tanstack/react-table` 承担不同职责，不应被本任务泛化替换。

## Assumptions

* 本任务的“全部替换”限定为 HeroUI 相关包、样式入口、组件调用与主题适配，不包含替换图表、toast、验证码、头像、表格逻辑等专职库。
* `apps/web` 与 `apps/admin` 都应接入统一的 Lobe UI/AntD provider 基础设施，即使 `admin` 当前没有直接 HeroUI 组件调用。
* 迁移后仍以项目现有 CSS 变量和 Tailwind v4 token 为视觉主导，Lobe/AntD token 需要向项目 token 对齐，而不是反向重塑整体视觉。

## Open Questions

* None.

## Requirements

* 移除 `apps/web` 与 `apps/admin` 的 `@heroui/react`、`@heroui/styles` 依赖。
* 移除 `apps/web/src/index.css` 与 `apps/admin/src/index.css` 中的 `@heroui/styles` import，并清理/替换只为 HeroUI 保留的语义变量映射。
* 新增并接入 `@lobehub/ui`、`antd`、`motion` 所需依赖，遵循项目 package manager hygiene，不擅自安装或改 lockfile，除非进入实现阶段时明确需要。
* 在 `apps/web` 与 `apps/admin` 根入口接入 Lobe UI/AntD provider，保证浮层、tooltip、dropdown、OTP 等组件具备正确 portal、motion 与主题上下文。
* 将 `ai-settings-pages.tsx` 中 HeroUI `Dropdown`、`Input`、`Tooltip` 替换为 Lobe UI/AntD 对应组件或轻量本地适配组件。
* 将 `login.tsx` 中 HeroUI `InputOTP` 替换为 Lobe UI `InputOPT` 或 AntD `Input.OTP`，保留 6 位验证码、自动聚焦、输入完成提交、受控值等行为。
* 对齐 Lobe/AntD 主题 token 到项目现有 `--canvas`、`--surface`、`--ink`、`--hairline`、主题色与暗色模式设计。
* 保留现有 specialized libraries：`lucide-react`、`@lobehub/icons`、`recharts`、`altcha`、`boring-avatars`、`@tanstack/react-table`。
* 保留现有 `sonner` toast，不切换到 Lobe UI Toast；toast 视觉优化后续单独开任务处理。

## Acceptance Criteria

* [x] 全仓库无 `@heroui/react` import。
* [x] 全仓库无 `@heroui/styles` import。
* [x] `apps/web/package.json` 与 `apps/admin/package.json` 不再包含 `@heroui/react`、`@heroui/styles`。
* [x] `apps/web` 登录页 OTP 输入可输入 6 位验证码，并在填满后保持原有提交行为。
* [x] `apps/web` AI 设置页搜索输入、排序下拉、tooltip 行为正常。
* [x] `apps/web` 与 `apps/admin` 在浅色/深色/主题色下 Lobe/AntD 组件视觉与现有 token 协调。
* [x] 项目 lint/typecheck/build 相关检查通过，至少覆盖受影响 app 的 typecheck。
* [x] 未引入与本任务无关的组件库替换或大规模视觉重写。

## Definition of Done

* Tests added/updated where behavior risk warrants it.
* Lint / typecheck / build checks pass for affected frontend apps.
* Dependency changes are intentional and reflected in package manifests/lockfile only when implementation阶段明确执行安装或更新。
* Design/spec notes updated if this migration establishes a new frontend component-library convention.
* Rollback path clear: revert provider/dependency changes and restored HeroUI callsites if needed.

## Technical Approach

Recommended direction: remove HeroUI in one focused migration, introduce a small project-level Lobe UI provider/theme adapter, then replace each direct HeroUI callsite with the closest Lobe UI/AntD primitive.

1. Add shared provider plumbing for `ThemeProvider` / `ConfigProvider motion={motion}` in both frontend apps.
2. Map project CSS tokens into AntD/Lobe theme tokens at the provider boundary.
3. Replace AI settings page controls:
   * `Input` -> Lobe `Input` or AntD `Input` with existing class/token polish.
   * `Dropdown` -> Lobe `DropdownMenu`/`Dropdown` with item-based API.
   * compound `Tooltip` -> Lobe `Tooltip` with `title` prop.
4. Replace login OTP:
   * HeroUI `InputOTP.Group/Slot` -> Lobe `InputOPT` or AntD `Input.OTP`.
   * Use AntD `onChange`/`onInput` semantics to preserve controlled state and completion submit.
5. Remove HeroUI CSS imports and dependencies.
6. Verify visual and behavior parity, especially floating layers and OTP completion.

## Decision (ADR-lite)

**Context**: HeroUI is barely used directly but still anchors package dependencies and global CSS imports. The project wants to standardize future base components on Lobe UI while preserving a custom visual system.

**Decision**: Treat `@lobehub/ui` plus required Ant Design/motion peers as the new base component stack. Keep non-overlapping specialized libraries in place.

**Consequences**:

* Migration surface is small in direct callsites, but root provider/theme work is important.
* OTP requires API rewrite because Lobe/AntD does not use HeroUI compound slot syntax.
* Frontend specs currently mention HeroUI; this task likely needs a spec update after implementation.

## Out of Scope

* Replacing `recharts` charts.
* Replacing or restyling `sonner` toast; toast 样式优化应另起专门任务。
* Replacing `altcha` captcha web component.
* Replacing `@tanstack/react-table` table logic.
* Replacing `boring-avatars`.
* Large redesign of landing page or settings UI beyond Lobe/HeroUI migration needs.
* Backend/API changes.

## Research References

* [`research/lobe-ui-migration.md`](research/lobe-ui-migration.md) — Lobe UI package, peer deps, provider setup, and HeroUI replacement notes.

## Technical Notes

* Relevant specs:
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/frontend/architecture.md`
  * `.trellis/spec/frontend/design-system.md`
  * `.trellis/spec/frontend/blueprint-aesthetic.md`
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
* Existing frontend spec index still names HeroUI in the stack; migration should update this convention after code changes.
* Package manager hygiene from `AGENTS.md`: use project-declared package manager (`pnpm@9.12.0` via corepack or local binaries), do not run install/delete lockfile unless implementation explicitly requires dependency changes.
