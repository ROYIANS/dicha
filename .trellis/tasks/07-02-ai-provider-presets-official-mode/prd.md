# AI 供应商预设与官方服务模式

## Goal

学习 LobeHub 的 AI provider 组织方式，并将 Dicha 的 AI provider seed 从少量示例扩展为更接近真实产品的预设供应商集合。同时为未来“Dicha 官方 AI 服务走平台积分计费，用户自带供应商不走平台计费”的模式预留清晰边界。

## What I Already Know

* 用户希望参考 LobeHub：LobeHub 既有自己的默认/官方 provider，也允许用户配置自己的供应商。
* LobeHub 官方服务使用 credits/积分计费，平台从官方 AI credits 中盈利。
* 用户自带供应商/API key 不走 LobeHub 的计费体系。
* 当前 Dicha 已有 AI Gateway、provider/model 配置页、用量统计页和 shared AI contract。
* 当前 `packages/shared/src/fixtures/ai-catalog.ts` 只有 OpenAI、DeepSeek、Anthropic 三个 provider template。
* 当前 `apps/ai-gateway/src/modules/catalog/catalog.seed.ts` 只从 shared fixture re-export seed，因此 provider presets 应优先落在 shared fixture。
* LobeHub 将 provider 预设集中在 `model-bank`，`DEFAULT_MODEL_PROVIDER_LIST` 条件插入官方 `LobeHubProvider`，这是可借鉴的结构。
* 用户已确认采用更完整的 LobeHub-like 模型库方向，而不是只做 provider preset 列表。
* 用户说明 LobeHub 是朋友的开源项目，且已获得授权；本任务可以更直接地复用其 AI provider/model-bank 体系，但仍需按 Dicha 产品语义适配。

## Research References

* [`research/lobehub-provider-pattern.md`](research/lobehub-provider-pattern.md) - LobeHub provider preset、官方服务 provider、用户自带 key 分流模式观察。

## Assumptions

* 本任务先扩展 provider templates，不实现真实 invoke、平台积分扣费或 billing ledger。
* 外部供应商默认不能启用真实调用，必须等待用户提供 credential。
* 未来官方 provider 可以走 Dicha 自有凭证和平台积分，但本任务最多预留 schema/seed 表达，不接入计费。

## Requirements

* 扩展内置 AI provider templates，覆盖全球主流、国内友好、聚合平台、本地/self-hosted、媒体生成等类别。
* provider templates 必须是 shared 单一数据源，供 gateway seed 和 web 配置页复用。
* 建立 Dicha 自己的 model bank 雏形，参考 LobeHub 的 provider/model 分层，把模型能力、上下文窗口、模型类型、推荐状态和价格元数据从 provider seed 中分离出来。
* 第一版 model bank 先放在 `packages/shared` 内部，作为 shared contract/fixture 的同包数据模块；暂不新建独立 workspace package。
* 外部 provider 默认应为 disabled 或 needs_config，不得暗示平台已经提供可用额度。
* 保留用户自定义 provider 的现有能力。
* 加入一个保留态的官方 `Dicha AI` provider template，用于提前建立产品心智，但本任务不接入真实官方服务。
* 明确区分官方 Dicha AI provider 与用户自带 provider 的产品语义：官方通道未来走平台积分/余额，用户自带 key 不走平台计费。
* 官方 provider 需要一等语义表达平台托管凭证/平台计费，不能复用普通 provider 的 `credentialState: missing` 来假装“缺用户 API Key”。
* 用户自带外部 provider 支持通过上游 `/models` 同步更新；静态 model bank 作为默认模型库、能力元数据和价格参考，不替代远程同步。
* 官方 `Dicha AI` 未来使用 Dicha 自有模型 catalog 和 price book；对用户展示的积分价格由 Dicha 决定，上游供应商成本只作为内部成本。
* LobeHub 参考实现为 MIT license；迁移时保留必要来源说明，并按 Dicha schema、命名和产品语义适配。
* 在授权与 MIT license 允许范围内，可复用 LobeHub 的 provider/model 元数据与组织方式；落地时需要保留来源说明，避免未来维护者误判数据来源。
* 不引入假密钥、假可用性或隐式计费。

## Acceptance Criteria

* [x] `packages/shared` 中的 provider template 数量从 3 个扩展到一组有代表性的真实供应商。
* [x] 项目新增或扩展 model bank 数据源，覆盖核心 provider 的模型元数据，不把大量模型硬编码散落在 UI 或 gateway 逻辑中。
* [x] Provider priorities 稳定且有产品顺序，不因数组追加随意漂移。
* [x] 已有 per-user seed 逻辑仍能将预设 provider 初始化为待配置状态。
* [x] Web AI provider 设置页能展示新增 provider，且缺少 credential 时不能执行连接检查/模型同步。
* [x] `Dicha AI` 官方 provider 在 seed/文案中与自带 key provider 明确区分，且不能要求用户填写第三方 API key。
* [x] `Dicha AI` provider 不显示普通 API Key 输入，不因缺少用户 credential 被标成配置错误。
* [x] 模型更新策略明确：静态 model bank 提供默认能力/价格信息，外部 provider 可走上游同步，官方 provider 未来走 Dicha catalog/price book。
* [x] 类型检查和相关测试通过。

## Definition Of Done

* Tests added/updated where provider template behavior is covered.
* Lint / typecheck green.
* Docs or task notes updated if official provider billing semantics are deferred.
* Rollout/rollback considered: existing user persisted configs must not be overwritten unexpectedly.

## Out Of Scope

* 真实 AI invoke 路由与 fallback。
* 平台积分、余额、账单、扣费。
* 官方 Dicha AI 服务真实凭证注入。
* 官方 Dicha AI price book 实现。
* 完整复制 LobeHub 的所有运行时 adapter。
* 周期探测、状态矩阵、队列。
* 价格自动更新后台任务。

## Technical Notes

* Current seed source: `packages/shared/src/fixtures/ai-catalog.ts`.
* Gateway seed re-export: `apps/ai-gateway/src/modules/catalog/catalog.seed.ts`.
* Catalog normalization currently filters legacy seed providers without credentials; implementation must avoid unexpectedly deleting user-created persisted provider state.
* LobeHub reference path: `D:\Code\Study\lobehub`.
* LobeHub root package declares MIT license. Dicha is also MIT, so license compatibility is acceptable, but copied/adapted data should retain attribution in an appropriate source comment or research note.
* Product decision: MVP includes a reserved official `Dicha AI` provider template. Real routing, credits, balance, billing ledger, and platform credential injection are deferred to routing/billing work.
* Product decision: use LobeHub's mature provider/model-bank architecture as the baseline. Model freshness should combine static model bank plus upstream sync where possible; official provider pricing is Dicha-controlled.
* Product decision: implement a Dicha model bank, not only a provider preset expansion. The first version can adapt LobeHub's model-bank structure and curated metadata, then layer Dicha-specific credential/billing fields on top.
* Product decision: keep the model bank inside `packages/shared` for the MVP. Current monorepo only has `shared` and `palette`; adding a new workspace package now would add build/export overhead before the model bank has independent runtime needs.
* Authorization note: user confirmed LobeHub reuse is authorized beyond normal MIT compatibility; still keep explicit source notes in code/task docs for traceability.
* Current UI note: `ProviderCredentialPopover` currently assumes every provider has an API key flow. Official provider support likely needs provider metadata such as `credentialMode: user_api_key | platform_managed` and `billingMode: user_provider | platform_credits`.

## Open Questions

* None for MVP implementation.
