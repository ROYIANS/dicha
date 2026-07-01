# AI 默认供应商按需添加

## Goal

调整 AI 供应商配置体验：OpenAI、Anthropic、DeepSeek 仍作为系统内置模板存在，但不在新用户的供应商列表中自动出现；用户点击“添加供应商”后再选择并配置这些模板。

## What I already know

* 当前内置供应商来自 `packages/shared/src/fixtures/ai-catalog.ts`。
* `apps/ai-gateway/src/modules/catalog/catalog.store.ts` 首次读取用户配置时会把 seed provider/model/assignment 写入持久化文件。
* `apps/web/src/features/settings/ai-settings-pages.tsx` 的“添加供应商”目前只打开自定义供应商表单。
* `PATCH /ai/config` 已支持通过 unknown `providerId` + provider 基本信息创建供应商。

## Requirements

* 新用户或无配置用户的 AI provider 列表默认为空，不自动显示 OpenAI、Anthropic、DeepSeek。
* OpenAI、Anthropic、DeepSeek 作为“添加供应商”入口中的内置模板展示。
* 用户选择内置模板后，系统创建对应 provider，但默认不启用，credentialState 为 missing。
* 保留现有自定义供应商创建能力。
* 当前不实现“自有供应商”或平台托管 AI 服务。
* 当前不新增真实调用、路由、监控或额度逻辑。

## Acceptance Criteria

* [ ] 首次 `GET /ai/catalog` 不返回默认 provider/model/assignment 数据。
* [ ] 历史自动 seed 且未配置 credential 的内置 provider/model/assignment 不继续出现在列表中。
* [ ] AI 供应商页空列表时能明确引导用户添加供应商。
* [ ] “添加供应商”弹窗可选择 OpenAI、DeepSeek、Anthropic 模板。
* [ ] 选择内置模板后，供应商出现在列表中，但处于 disabled/missing credential 状态。
* [ ] 自定义供应商创建流程仍可用。
* [ ] Lint/typecheck 通过相关包校验。

## Out of Scope

* 自有供应商。
* 默认模型和用途分配的自动生成。
* 删除已有真实凭证或用户明确添加过的供应商。
* 真实 AI 调用、模型路由、周期探测和状态大盘。

## Technical Notes

* 优先复用现有 `AiProviderUpdate` contract，避免新增 API。
* 内置模板可以继续从 shared fixture 派生，防止 provider 元信息重复漂移。
* 需要同步更新 backend/frontend Trellis spec 中“首次 seed 默认数据”的旧描述。
