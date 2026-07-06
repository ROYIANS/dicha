# brainstorm: AI 模型配置与供应商同步

## Goal

梳理并改造前台与 admin 后台的 AI 模型配置体验：优先解决当前混乱与同步问题，供应商渠道同步出的模型要稳定进入前台可见目录，同时前台对 Dicha AI 官方模型减少不必要的用户配置入口，让普通用户少配置、专业用户仍能按需配置自带供应商。

## What I already know

* 用户指出三个问题：
  * Dicha AI 服务和供应商渠道都缺少“模型具体参数”的配置页面或入口。
  * admin 供应商渠道同步了模型后，前台“模型供应商”没有同步更新。
  * 前台模型供应商中，Dicha AI 官方模型不应出现模型参数配置入口；官方渠道和具体模型也不需要让用户启用/禁用。
* admin `供应商渠道` 页面当前有供应商级 Base URL、请求格式、认证方式、备注，以及模型级推荐/启用；没有模型级参数编辑入口。
* admin `Dicha AI 服务` 页面当前在 `DichaModelForm` 中已有 `parameterConfig` JSON 编辑字段，并会保存到 `AdminDichaModelUpdate.parameterConfig`；内部供应商级表单没有默认参数字段。
* 前台 `ProviderCard` 已识别官方 Dicha provider，并隐藏用户侧维护动作（检测连接、同步模型、新增模型），但 `ProviderModelRow` 仍然对所有模型显示“配置模型”和启用开关。
* 前台 catalog 由 `CatalogStore.readConfig` 合并目录供应商设置、目录模型和 Dicha 内部模型。已有用户配置会经过 `normalizeConfig` 合并 seed 模型，因此同步未更新前台的问题需要重点验证“目录模型变更是否能进入已有用户 catalog”。
* 用户补充：MVP 主要先解决列表中的 1/2/3，即混乱和同步问题；模型配置弹窗继续 leave it as is，最多参考 LobeHub 查缺补漏。
* 用户补充：前台模型列表要优化，多用图形化表述，增强分类、前端筛选、排序等能力，可参考附件中的 LobeHub 模型列表截图。
* 用户补充：项目里有 HeroUI，高级复杂组件应优先使用 HeroUI，不需要从头写基础交互组件。
* 项目 `apps/web` 和 `apps/admin` 均已依赖 `@heroui/react` / `@heroui/styles`。
* LobeHub 参考点：
  * 模型列表按类型做 tab：全部、对话、图片、视频、embedding、ASR、TTS 等，并显示数量。
  * 列表按启用/未启用分组，行内用图标、能力标签、上下文长度、价格/发布日期等图形化信息辅助扫描。
  * 行内配置/删除等次级动作可以在 hover 或紧凑按钮中展示。
  * 未启用模型支持前端排序：默认、名称升序/降序、发布时间升序/降序。
  * 配置弹窗复用模型表单，字段包含模型 ID、展示名、最大上下文、扩展参数、能力开关和类型。

## Assumptions (temporary)

* 前台“减少配置”只约束 Dicha 官方模型；用户自带 API Key 的第三方供应商仍保留模型级专业配置入口。
* 官方 Dicha provider 对用户应近似只读：展示可用模型与价格/能力，不暴露密钥、同步、模型配置、启用/禁用等维护控制。
* 前台模型配置弹窗本任务不做大改；若发现明显缺字段，只做小范围查缺补漏。
* 前台复杂交互优先使用 HeroUI 组件，如 Tabs、Chip、Tooltip、Dropdown/Menu、Switch、Modal、Input/Select 等，再套项目现有视觉 token。

## Open Questions

* 已确认：当前范围按“同步修复 + 官方 Dicha 只读化 + 前台模型列表增强 + 配置弹窗保持现状/仅小补”实现，不在本任务内重做模型参数系统。

## Requirements (evolving)

* Dicha AI 服务和供应商渠道关于模型参数的入口先保持现有形态；如果现有弹窗或表单缺少 LobeHub 中已经成熟的基础字段，仅做必要补漏，不重做复杂参数系统。
* 供应商渠道同步/更新模型后，前台模型供应商列表应能看到新增模型或更新后的模型元数据。
* 前台 Dicha AI 官方模型不显示模型参数配置入口。
* 前台 Dicha AI 官方 provider/model 不提供用户侧启用/禁用控制。
* 前台非官方供应商仍保留面向专业用户的 API Key、同步、模型配置、启用/禁用等能力。
* 前台模型列表增强分类、筛选、排序和图形化表达：
  * 按模型类型/能力提供 tab 或 segmented 分类，并显示数量。
  * 支持前端搜索/筛选，至少覆盖展示名、模型 ID、供应商、能力、类型。
  * 支持前端排序，至少覆盖默认、名称、上下文长度/能力丰富度；若数据存在发布时间，可支持发布时间排序。
  * 行内使用模型/供应商图标、能力 chips、上下文长度、价格提示、状态 pill 等信息辅助扫描。
  * 复杂 UI 控件优先使用 HeroUI，不手写可由 HeroUI 承担的基础交互。

## Acceptance Criteria (evolving)

* [x] 现有模型配置弹窗继续可用，未被前台列表改造破坏。
* [x] 若参考 LobeHub 查到当前弹窗存在基础字段缺口，完成小范围补漏并保持原交互风格。
* [x] 后台同步供应商渠道模型后，已有用户前台 catalog 能合并新增模型或更新关键元数据。
* [x] 前台 Dicha AI 官方模型行不再展示“配置模型”入口。
* [x] 前台 Dicha AI 官方 provider/model 不再展示用户侧启用/禁用入口。
* [x] 前台非官方供应商的专业配置入口不受影响。
* [x] 前台模型列表支持分类、搜索/筛选、排序，并以图标、chips、状态信息增强可扫描性。
* [x] 前台列表增强优先使用 HeroUI 组件实现复杂控件。

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* 不在本任务内重做完整 AI 供应商设置页信息架构。
* 不在本任务内引入复杂可视化参数 schema/动态表单系统。
* 不在本任务内重写现有模型配置弹窗；仅允许查缺补漏式的小范围调整。
* 不在本任务内改变 Dicha 官方模型的计费规则。

## Technical Notes

* 前台相关：`apps/web/src/features/settings/ai-settings-pages.tsx`、`apps/web/src/lib/ai-catalog-ui.ts`、`apps/web/src/components/ModelSelect.tsx`。
* admin 相关：`apps/admin/src/routes/_admin.ai-providers.tsx`、`apps/admin/src/routes/_admin.dicha-ai.tsx`、`apps/admin/src/api/admin.ts`。
* 共享契约：`packages/shared/src/contracts/admin.contract.ts`、`packages/shared/src/contracts/ai.contract.ts`。
* catalog 合并与调用渠道：`apps/ai-gateway/src/modules/catalog/catalog.store.ts`。
* 当前 Dicha 内部模型已有 `parameterConfig` 数据链路。
* 供应商目录模型共享契约当前没有 `parameterConfig` 字段，`AdminAiProviderDirectoryModelUpdate` 只支持 `enabled`、`recommended`、`displayName` 等轻量字段；用户已确认本任务不扩展完整参数配置链路，后续如要做再单独开任务。
* LobeHub 参考代码：
  * `D:\Code\Study\lobehub\src\routes\(main)\settings\provider\features\ModelList\index.tsx`
  * `D:\Code\Study\lobehub\src\routes\(main)\settings\provider\features\ModelList\ModelItem.tsx`
  * `D:\Code\Study\lobehub\src\routes\(main)\settings\provider\features\ModelList\EnabledModelList\index.tsx`
  * `D:\Code\Study\lobehub\src\routes\(main)\settings\provider\features\ModelList\DisabledModels.tsx`
  * `D:\Code\Study\lobehub\src\routes\(main)\settings\provider\features\ModelList\CreateNewModelModal\Form.tsx`
* HeroUI 依赖：
  * `apps/web/package.json` includes `@heroui/react` and `@heroui/styles`.
  * `apps/admin/package.json` includes `@heroui/react` and `@heroui/styles`.
