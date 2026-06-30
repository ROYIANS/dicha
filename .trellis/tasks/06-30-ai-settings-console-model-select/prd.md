# AI 设置控制台与模型选择组件

## Goal

在设置页新增 AI 供应商和服务模型控制台页面，并开发可复用 `ModelSelect`，先基于 mock catalog 展示配置、状态和用途分配。

## Requirements

* 设置首页新增 AI 配置入口：AI 供应商、服务模型。
* 新增 `/settings/ai-providers` 页面。
* 新增 `/settings/ai-models` 页面。
* 供应商页展示名称、说明、启用状态、基础地址、凭证状态、最近检测/可用性状态。
* 服务模型页展示模型、供应商、能力、上下文长度、启用状态、可用性、用途分配。
* `ModelSelect` 支持受控值、禁用、空状态、当前选中不可用提示。
* 页面保持现有 `SettingsScaffold`、暖白哑光和工程纸结构审美。

## Acceptance Criteria

* [ ] 设置首页出现两个 AI 入口。
* [ ] 两个路由可打开并正常返回设置页。
* [ ] `ModelSelect` 可在设置行 action 区域内使用且移动端不溢出。
* [ ] API Key 等敏感值不明文展示。
* [ ] `pnpm --filter @dicha/web lint` 通过。
* [ ] `pnpm --filter @dicha/web typecheck` 通过。

