# 统一基础组件到 Lobe UI

## Goal

将前台和后台中自写的基础表单/浮层/选择控件逐步替换为 Lobe UI/Ant Design 体系内的组件，降低自维护样式成本，让输入框、选择器、表单、开关、弹窗等基础控件具备一致交互和默认质感。迁移时保留项目主题色 token 和现有按钮风格；Toast 暂不纳入，继续使用 `sonner`，后续单独优化样式。

## What I Already Know

* Lobe UI 已经接入到 `apps/web` 和 `apps/admin`，入口分别是 `DichaLobeProvider`。
* 当前主题已经通过 Ant Design `ThemeConfig` 映射了项目色：`colorPrimary` 使用项目暖色，背景、边框、文字色也映射到现有 token。
* 用户明确接受这次可以适当放宽原先的前端设计规范：基础组件可以更多使用 Lobe UI 默认样式，但主题色和按钮样式仍沿用我们自己的。
* Toast 不替换为 Lobe UI；保留 `sonner`，后续开单独任务做样式优化。
* 当前高价值替换区集中在 Web 端 AI 设置页、账号页、AI 调用测试页、登录页，以及 Admin 端大量 `admin-input`/原生表单控件。

## Requirements

* 建立 Lobe UI 基础组件能力清单，并映射到项目现有自写/原生控件。
* 优先替换输入、文本域、数字输入、密码输入、选择器、复选框、开关、表单布局、Modal/Drawer、Tooltip/Dropdown 等基础控件。
* 保留项目按钮视觉，不把按钮大规模替换成 Lobe UI 默认按钮；需要按钮 API 时可评估薄封装或局部使用。
* 优先用项目主题 token 驱动 Lobe/AntD 组件，不在每个 callsite 重复打补丁。
* 不替换 `sonner` toast。
* 不把业务布局组件和品牌视觉组件纳入本任务，例如 `Surface`、`DashCard`、设置页壳层、导航 chrome。

## Acceptance Criteria

* [ ] 有一份按组件类别和代码位置整理的替换清单。
* [ ] 明确每类控件对应的 Lobe UI/AntD 目标组件。
* [ ] 明确迁移优先级、阶段边界和不纳入范围。
* [ ] 实施阶段完成后，项目内高频自写基础控件和原生 `input/select/textarea/checkbox/switch` 使用显著减少。
* [ ] 主题色、暗色模式、按钮样式、OTP 输入框和 toast 行为不回退。

## Definition Of Done

* Web 端核心设置和账号流程完成基础控件替换。
* Admin 端后台表单控件完成统一或被明确拆为后续子任务。
* `@heroui/*` 依赖保持移除状态，不重新引入。
* 运行相关 typecheck/lint，必要页面手动过一遍视觉检查。
* Trellis 任务记录实际替换范围和剩余尾项。

## Technical Approach

推荐采用“薄封装 + 直接使用混合”的路线：

* 高频基础件建立本地薄封装或样式入口，例如 `DichaInput`、`DichaTextArea`、`DichaSelect`、`DichaSwitch`、`DichaModal`/`DichaForm`。封装只负责项目 token、尺寸、无障碍默认值和少量兼容 API。
* 低频或 Lobe UI 已经语义完整的组件直接从 `@lobehub/ui` 使用，例如 `InputOPT`、`DropdownMenu`、`Tooltip`、`FormModal`、`Segmented`、`Tabs`。
* 主题层优先在 `DichaLobeProvider` 里扩展 AntD component token，避免每个控件手写 className。
* 迁移按页面分阶段推进，先 Web 核心用户路径，再 Admin 管理后台。

## Replacement Plan

### P0: Foundation

* 扩展 `DichaLobeProvider` 的 AntD component token：`Input`、`Select`、`InputNumber`、`TextArea`、`Checkbox`、`Switch`、`Modal`、`Drawer`、`Form`。
* 评估是否增加 `apps/web/src/components/base/` 与 `apps/admin/src/components/base/`，放置薄封装。
* 明确按钮策略：保留项目按钮 class/组件；Lobe Button 只用于确实需要 Lobe/AntD 表单生态配合的局部场景。

### P1: Web Small Wins

* `apps/web/src/components/SettingsScaffold.tsx`
  * `SettingsSwitch` 自写 `button role="switch"` -> Lobe/base-ui `Switch` 或 AntD `Switch`。
* `apps/web/src/components/ModelSelect.tsx`
  * 原生 `<select>/<optgroup>` -> Lobe/AntD `Select`，保留分组、不可用提示和选中模型辅助信息。
* `apps/web/src/features/settings/ai-invoke-demo-page.tsx`
  * 原生 `select/input/textarea` -> `Select/Input/TextArea`。
* `apps/web/src/features/settings/credits-page.tsx`
  * 单个原生 `input` -> `Input`。

### P2: Web Core Forms

* `apps/web/src/features/settings/ai-settings-pages.tsx`
  * `TextField` -> `Input/InputPassword` 或本地薄封装。
  * 原生 `textarea` -> `TextArea`。
  * 原生 `select` -> `Select`。
  * 参数数值输入 -> `InputNumber`。
  * `ModalShell`/`ModalActions` -> `Modal`/`FormModal`，保留当前按钮视觉。
  * Capability/extension 选择控件按语义替换为 `Checkbox`、`Switch`、`Select` 或 `Form` item。
* `apps/web/src/routes/_app/account.tsx`
  * `SelectControl` 和原生 `input/select/textarea` -> `Input/TextArea/Select`。
  * 保留头像、Passkey、账号安全等业务组件布局。
* `apps/web/src/routes/login.tsx`
  * 已使用 `InputOPT`；普通登录输入框继续替换为 `Input/InputPassword`。

### P3: Admin Console

* `apps/admin/src/routes/_admin.dicha-ai.tsx`
  * 大量 `admin-input`、原生 `select/textarea/checkbox` -> 统一基础组件。
* `apps/admin/src/routes/_admin.ai-providers.tsx`
  * Provider 表单、模型表单、能力开关和 JSON 文本域统一替换。
* Credits/Admin 其它页面
  * `NumberField` -> `InputNumber`。
  * 搜索/筛选 `input/select` -> `Input/Select`。
  * 后台登录页输入框 -> `Input/InputPassword`。

## Out Of Scope

* Toast：继续使用 `sonner`，另建任务优化视觉。
* 业务布局/品牌视觉组件：`Surface`、`DashCard`、设置页壳层、导航、卡片结构。
* 图表、验证码、头像生成、AI 业务逻辑、表格数据逻辑。
* 大规模重做按钮风格；本任务只保证按钮在 Lobe 表单/弹窗中协同良好。

## Research References

* [`research/lobe-ui-component-inventory.md`](research/lobe-ui-component-inventory.md) — Lobe UI 可用基础组件与项目替换清单。

## Open Questions

* 是否确认采用“高频组件薄封装，低频组件直接使用 Lobe UI”的迁移路线？

## Technical Notes

* Lobe UI 源码参考：`D:\Code\Study\lobe-ui\src\index.ts`、`D:\Code\Study\lobe-ui\src\base-ui\index.ts`。
* 当前 Lobe Provider：
  * `apps/web/src/components/DichaLobeProvider.tsx`
  * `apps/admin/src/components/DichaLobeProvider.tsx`
* 当前扫描到的 Web 高集中区域：
  * `apps/web/src/features/settings/ai-settings-pages.tsx`
  * `apps/web/src/routes/_app/account.tsx`
  * `apps/web/src/features/settings/ai-invoke-demo-page.tsx`
  * `apps/web/src/routes/login.tsx`
  * `apps/web/src/components/ModelSelect.tsx`
  * `apps/web/src/components/SettingsScaffold.tsx`
* 当前扫描到的 Admin 高集中区域：
  * `apps/admin/src/routes/_admin.dicha-ai.tsx`
  * `apps/admin/src/routes/_admin.ai-providers.tsx`
  * Credits、analytics、audit/basic/system 等后台页面。
