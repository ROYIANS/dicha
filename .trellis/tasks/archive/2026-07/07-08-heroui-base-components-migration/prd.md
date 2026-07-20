# HeroUI 基础组件迁移计划

## Goal

将前台 `apps/web` 与后台 `apps/admin` 中自写或原生的基础交互控件逐步迁移到 HeroUI v3，本轮优先覆盖表单输入、选择器、OTP、开关/复选、标签页与按钮。按钮视觉以落地页 hero section 的 `lp-btn` 物理感按钮为基准，尽量通过 HeroUI `Button` 薄封装统一，不引入另一套按钮系统。

## What I Already Know

* 用户希望“稍微突破 frontend UI spec 限制”，优先把原生 `input`、自写 tab、select 等基础组件换成 HeroUI 现成组件。
* 样式不是当前阶段重点，先保持 HeroUI 默认样子；登录 OTP 也要还原之前覆盖 HeroUI 的样式代码。
* 最近的 revert 主要是因为不喜欢 Lobe UI，不是反对 HeroUI 方向。
* `apps/web` 和 `apps/admin` 已安装 `@heroui/react@^3.1.0` 与 `@heroui/styles@^3.1.0`，不需要先调整依赖。
* 两侧全局 CSS 已导入 `@heroui/styles` 并映射部分 HeroUI theme token。
* HeroUI v3 文档覆盖本任务需要的组件：`Button`、`InputOTP`、`NumberField`、`TextArea`、`Form`、`Select`、`Switch`、`Checkbox`、`Tabs`、`Table`、`Modal`、`Drawer`、`Toast`、`ComboBox` 等。

## Requirements

* 前台和后台都纳入梳理与迁移计划。
* 第一批实施采用全量非容器表单控件迁移：一次性扫完前后台 input/select/textarea/checkbox/switch/OTP/tab 等基础交互控件。
* 按钮纳入本轮继续迁移：普通 action button 使用 HeroUI `Button`，视觉尽量还原落地页 hero section 的物理感 `lp-btn`。
* 表格和弹窗暂时保持原样，不在本轮迁移 HeroUI `Table` / `Modal`。
* 优先迁移表单与基础输入组件，同时覆盖标签页，而不是重做整站视觉。
* 替换后尽量使用 HeroUI 组件作为交互底座；按钮允许统一覆写为项目的 warm matte physical button 样式。
* 选择当前对象的整行列表不视为按钮：供应商、模型、用户、主题色板等单选对象列表使用 HeroUI `ListBox` / `ListBox.Item`；真实保存、同步、删除、清空等命令才使用 `HeroButton`。
* 保留现有业务行为、状态逻辑、路由与 API 调用。
* ALTCHA 自定义元素必须继续放在 `<form>` 外，避免内部 required input 拦截提交。
* 虽然按一个任务全量完成，内部实现仍按文件/区域小步推进，每个区域完成后跑局部检查，最终统一 lint/typecheck。

## Acceptance Criteria

* [x] 前台登录页使用 HeroUI `Input` / `InputOTP`，按钮保持现状，OTP 不再依赖自写 slot 样式覆盖。
* [x] 后台登录页使用 HeroUI `Input` / `InputOTP`，按钮保持现状。
* [x] `ModelSelect` 迁移为 HeroUI `Select + ListBox.Section`，继续支持按供应商分组与不可用模型提示。
* [x] `SettingsSwitch` 迁移为 HeroUI `Switch`，调用点行为不变。
* [x] AI 设置与后台 AI 管理表单中的原生 input/select/textarea/checkbox 优先迁移到 HeroUI 对应组件。
* [x] 后台自写 tabs 至少在 `_admin.system.tsx` 迁移到 HeroUI `Tabs`。
* [x] 前台和后台普通按钮迁移到 HeroUI `Button` 薄封装，并保留现有业务行为、disabled/loading、表单提交与路由语义。
* [x] HeroUI `Button` 的默认项目样式尽量还原落地页 hero section `lp-btn` / `lp-btn-primary` / `lp-btn-ghost` 的物理按钮效果。
* [x] 纠正大交互选择行的按钮误用：后台 `/dicha-ai`、AI 供应商目录、用户列表与前台主题色板使用 HeroUI `ListBox`，不再用大块 `HeroButton` 表示单选项。
* [x] 本轮不迁移 HeroUI `Modal` / `Table`，相关原有结构保持稳定。
* [x] `apps/web` 和 `apps/admin` 的 typecheck/lint 通过。

## Definition of Done

* Tests added/updated where component behavior or utility logic changes.
* `apps/web` lint/typecheck pass.
* `apps/admin` lint/typecheck pass.
* No dependency install, lockfile rewrite, or `node_modules` purge unless explicitly requested.
* If new reusable component conventions emerge, update `.trellis/spec/frontend` after implementation.

## Initial Technical Approach

### Implementation Passes

1. **Foundation and wrappers**
   * Clean up obvious HeroUI style override points.
   * Migrate `ModelSelect` and `SettingsSwitch`.
   * Replace small filter helpers such as admin `FilterSelect` / `FilterInput`.

2. **Login parity**
   * Migrate `apps/web/src/routes/login.tsx`.
   * Migrate `apps/admin/src/routes/login.tsx`.
   * Keep ALTCHA form boundary unchanged.

3. **Settings and AI forms**
   * Migrate web AI provider/model forms.
   * Migrate admin AI provider/model configuration forms.
   * Replace parameter switches/selects/number inputs with HeroUI primitives.

4. **Admin tabs**
   * Replace `_admin.system.tsx` tab buttons with HeroUI `Tabs`.

5. **Button migration**
   * Add `HeroButton` thin wrappers in web/admin `HeroControls.tsx`.
   * Style the wrapper from landing hero section `lp-btn` physical button behavior.
   * Replace native/custom button markup across web/admin with HeroUI-backed buttons where the element is a real button.
   * Link/anchor CTAs may keep their navigational element but should share the same button class system.

6. **Deferred container controls**
   * Do not migrate custom modal shells or table markup in this task.

## Decision (ADR-lite)

**Context**: The migration can be done as a conservative first batch or a broad component-library reset. The user wants to move decisively away from hand-rolled native controls and back to HeroUI defaults. Button migration was initially deferred, then explicitly pulled into the next step with a requirement to match the landing hero section physical button style. Modal and table migration remain deferred to avoid widening the implementation.

**Decision**: Use a broad implementation pass that covers frontend/admin form controls and buttons in this task; keep modals and tables as-is. Buttons use HeroUI as the accessible interaction primitive and project-level classes for the landing-inspired physical style.

**Consequences**: This reduces split UI patterns for form controls and action buttons while avoiding churn in complex container components. Later tasks can migrate modals and tables after the HeroUI baseline settles.

## Open Questions

* None.

## Out of Scope

* Replacing HeroUI with Lobe UI or introducing another component library.
* Final visual polish beyond basic HeroUI theme token alignment.
* Modal migration to HeroUI.
* Table migration to HeroUI.
* Rewriting business logic, API contracts, auth behavior, or AI provider semantics.
* Installing/upgrading dependencies unless a missing HeroUI feature makes it necessary and the user approves.
* Full landing page redesign.

## Technical Notes

* Relevant spec files:
  * `.trellis/spec/frontend/index.md`
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/design-system.md`
  * `.trellis/spec/frontend/admin-app.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
* HeroUI docs:
  * `https://heroui.com/react/llms.txt`
  * `https://www.heroui.com/en/docs/react/components/select`
* Initial file hotspots:
  * `apps/web/src/routes/login.tsx`
  * `apps/admin/src/routes/login.tsx`
  * `apps/web/src/components/ModelSelect.tsx`
  * `apps/web/src/components/SettingsScaffold.tsx`
  * `apps/web/src/routes/_app/account.tsx`
  * `apps/web/src/features/settings/ai-settings-pages.tsx`
  * `apps/web/src/features/settings/ai-invoke-demo-page.tsx`
  * `apps/web/src/features/settings/credits-page.tsx`
  * `apps/admin/src/routes/_admin.ai-providers.tsx`
  * `apps/admin/src/routes/_admin.dicha-ai.tsx`
  * `apps/admin/src/routes/_admin.system.tsx`
  * `apps/admin/src/routes/_admin.ai-diagnostics.tsx`
  * `apps/admin/src/routes/_admin.analytics.tsx`
  * `apps/admin/src/routes/_admin.audit-logs.tsx`
  * `apps/admin/src/routes/_admin.basic.tsx`
  * `apps/admin/src/routes/_admin.credits.*.tsx`

## Research References

* [`research/heroui-v3-components.md`](research/heroui-v3-components.md) — HeroUI v3 component coverage and mapping notes for this migration.
