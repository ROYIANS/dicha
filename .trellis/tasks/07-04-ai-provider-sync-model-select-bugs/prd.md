# 修复 AI 供应商模型同步与服务模型选择状态

## Goal

修复 AI 供应商设置与服务模型分配页里的几个相互关联的状态问题：内置供应商（尤其 AI Hub Mix）应在支持 `/models` 时允许同步；服务模型页不应默认展示不可用模型为已选中；修改首选模型不应在第一次操作时意外清空备用模型。

## What I Already Know

- 用户反馈 AI Hub Mix 线上环境同步按钮被禁用，并显示“当前供应商没有 OpenAI compatible models 同步入口，需要手动维护模型”。
- 用户手动添加自定义供应商并使用 `aihubmix.com/v1` 时，可以拉取到 300+ 模型。
- 用户确认本轮 scope，并提出后期希望把 AI catalog 配置从文件持久化迁移到数据库；这是合理方向，但不纳入本任务。
- 本地 dev 环境有时不会禁用同步，并且刚才曾成功拉取模型，说明上游 `/models` 兼容路径本身是可行的。
- LobeHub 本地代码中 `packages/model-bank/src/modelProviders/aihubmix.ts` 配置为 `sdkType: 'router'` 且 `showModelFetcher: true`。
- 当前项目 `packages/shared/src/fixtures/ai-catalog.ts` 的 `providerModelSyncMode()` 只有 `showModelFetcher === true`、存在 HTTP proxy/base URL、并且 `sdkType` 属于 `openAiLikeSdkTypes` 时才标记为 `openai_models_endpoint`。
- 当前 AI Hub Mix 的 `router` SDK 不在 `openAiLikeSdkTypes` 判断中，因此内置模板会被生成成 `modelSyncMode: 'manual'`。
- Web 供应商页的同步/检测按钮由 `provider.modelSyncMode === 'openai_models_endpoint'` 直接决定是否禁用。
- AI Gateway 的同步接口也会拒绝 `modelSyncMode !== 'openai_models_endpoint'` 的供应商。
- 服务模型页 `AiModelsSettingsPage` 用 `catalog.assignments` 作为初始选择；本地 `selectedByUseCase` / `fallbackByUseCase` 只在用户操作后覆盖。
- `ModelSelect` 当前只把 `status === 'enabled'` 的供应商下 `enabled === true` 的模型视为可选；assignment 指向旧的默认模型或停用模型时，会显示“当前模型不可用”。
- 首选模型变化时，`assignmentUpdate()` 默认用 catalog 中旧的 `fallbackModelIds` 过滤新首选模型；备用模型变化时，`fallbackModelIds()` 也接收当前 assignment 的旧 fallback 列表。这可能导致第一次操作时 UI 本地选择与后端 assignment 基准不一致。

## Requirements

- AI Hub Mix 等 LobeHub 标记 `showModelFetcher: true`、且拥有 HTTP base/proxy URL 的 router/OpenAI-compatible 聚合供应商，应允许通过 `/models` 同步。
- 内置供应商模板的同步能力变更必须能影响已有用户配置；线上已持久化的旧 provider 不应永久保留过时的 `modelSyncMode: 'manual'`。
- 供应商页的同步/检测按钮和提示文案必须与真实可同步能力一致，不再误导为“需要手动维护模型”。
- 服务模型页的首选/备用模型初始值必须与可选模型列表一致：只有启用供应商下的启用模型可以被当作可用选择。
- 如果 assignment 指向不可用模型，UI 应清晰提示不可用，但不应在 select 里制造“看似已正常选中”的矛盾状态。
- 修改首选模型时必须保留仍然有效、且不等于新首选模型的备用模型列表；不应在第一次操作时因为旧 catalog/local state 不一致而清空备用模型。
- 修改备用模型时必须基于当前 UI 上的最新首选/备用状态，而不是落后的 catalog assignment 快照。

## Acceptance Criteria

- [ ] AI Hub Mix 内置供应商在 catalog 中得到 `modelSyncMode: 'openai_models_endpoint'`，同步按钮可用。
- [ ] 已存在的内置供应商配置在 seed/template 更新后能刷新非用户运行态字段（至少包括 `modelSyncMode` / `requestFormat` / base metadata），同时保留用户凭证、启用状态和 endpoint 等运行配置。
- [ ] 网关同步接口不再因 AI Hub Mix 的内置模板能力误判而拒绝同步。
- [ ] 服务模型页只有可分配模型会作为 select 的有效 value；不可用旧 assignment 不显示成正常选择。
- [ ] 只启用一个模型时，该模型可以作为首选模型正常显示勾选状态，不出现“当前模型不可用”的矛盾提示。
- [ ] 启用两个模型并切换首选模型后，备用模型不会在第一次操作时被意外清空，除非它与新首选模型冲突。
- [ ] 覆盖 provider sync mode 推导、catalog normalization、model assignment/select helper 的回归测试。

## Definition of Done

- 前端、shared、ai-gateway 相关 typecheck/lint/test 通过。
- Web 服务模型页相关测试覆盖初始可用选择与 fallback 保留。
- Shared/gateway 测试覆盖 AI Hub Mix/router fetcher 能力与旧配置刷新。
- Trellis spec 更新本次学到的规则。

## Technical Approach

- 在 shared fixture 生成层修正 LobeHub `router` + `showModelFetcher` 的同步能力映射，使 AI Hub Mix 和同类聚合商可同步。
- 在 ai-gateway catalog normalization 中，让内置 provider 的 template-owned metadata 能随 seed 更新刷新，但保留用户 runtime/config fields。
- 在 web model assignment 层抽出或复用“可分配模型集合”，让 assignment 初始化、提示、提交都基于同一套可用性规则。
- 修复首选/备用模型更新逻辑：提交 mutation 时使用当前 UI row 的 selected primary/fallback，而不是只依赖 catalog 中旧 assignment。

## Decision (ADR-lite)

**Context**: LobeHub 的模型 fetcher 能力不是单纯由 `sdkType === 'openai'` 决定；router 类型聚合商也可以暴露 OpenAI-compatible `/models`。同时服务模型页最近改为只展示启用供应商/启用模型，暴露了旧 assignment 与新可选列表之间的不一致。

**Decision**: 以“showModelFetcher + HTTP base URL + 可用 OpenAI-compatible 请求路径”为同步能力判断基础，显式纳入 LobeHub `router` 聚合商；服务模型页所有选择状态统一从同一套 assignable model helper 派生。

**Consequences**: 线上旧 catalog 需要 normalization 刷新内置 provider metadata；服务模型页会更严格地区分“旧配置不可用”和“当前可选模型”，减少静默错配。

## Out of Scope

- 本任务不实现新的第三方供应商协议。
- 本任务不改变真实 AI invoke streaming/non-streaming 行为。
- 本任务不做线上数据迁移脚本；优先通过 catalog normalization 自动修复旧配置。
- 本任务不把 AI catalog 文件存储迁移到数据库；该方向保留为后续任务。
- 本任务不重新设计整个 AI 设置页视觉结构。

## Future Notes

- AI catalog 后期应迁移到数据库持久化。供应商配置、凭证状态、模型启停、上游同步结果和 use-case assignment 都是用户级配置数据；数据库比 JSON 文件更适合多实例部署、并发写入、审计、备份和 schema migration。
- 当前文件存储继续作为 MVP/本地开发路径保留，本任务只修正 normalization，让线上旧文件配置能自动吸收内置模板能力变化。

## Technical Notes

- Relevant files inspected:
  - `packages/shared/src/fixtures/ai-catalog.ts`
  - `packages/shared/src/fixtures/lobehub-model-bank.ts`
  - `apps/ai-gateway/src/modules/catalog/catalog.service.ts`
  - `apps/ai-gateway/src/modules/catalog/catalog.store.ts`
  - `apps/web/src/features/settings/ai-settings-pages.tsx`
  - `apps/web/src/components/ModelSelect.tsx`
  - `apps/web/src/lib/ai-catalog-ui.ts`
  - `/Users/xiaomengdao/WebstormProjects/lobehub/packages/model-bank/src/modelProviders/aihubmix.ts`
- Existing specs likely relevant:
  - `.trellis/spec/backend/ai-catalog.md`
  - `.trellis/spec/frontend/component-guidelines.md`
  - `.trellis/spec/frontend/type-safety.md`
  - `.trellis/spec/guides/code-reuse-thinking-guide.md`
