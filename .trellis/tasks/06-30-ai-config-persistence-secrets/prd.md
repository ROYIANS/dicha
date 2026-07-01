# AI 配置持久化与密钥管理

## Goal

让 AI Gateway 拥有真实配置存储能力，支持供应商、模型、用途分配和密钥安全管理。

## Requirements

* 设计供应商、模型、用途分配、密钥状态的数据模型。
* API Key / Secret 加密存储，不明文回显。
* 提供供应商和模型 CRUD API。
* 设置页从真实 API 读取/保存配置。
* 支持配置错误状态，如 missing credential、invalid base URL。
* `GET /ai/catalog` 从持久化配置生成 catalog；首次启动没有配置时可以用 shared mock fixture seed 默认供应商、模型和用途分配。
* 设置页可以启用/停用 provider/model，保存用途分配，并清楚标注当前不做真实模型调用。
* 密钥输入只做写入/覆盖；读取接口只返回 `configured` / `missing` / `masked` 等状态。

## Acceptance Criteria

* [ ] 配置可持久化。
* [ ] 密钥只写入、不明文读取。
* [ ] 设置页可保存供应商和模型启用状态。
* [ ] 设置页可保存用途分配的 primary/fallback 模型。
* [ ] `GET /ai/catalog` 返回真实配置生成的 provider/model/assignment catalog。
* [ ] shared contract 覆盖请求/响应。
* [ ] 首次无配置时 catalog 有可用默认数据，不需要手工录入才能打开设置页。

## Out of Scope

* 不做真实供应商 SDK 调用。
* 不做用途路由、重试、超时、熔断和降级。
* 不做周期探测、调用日志、Token/成本统计或状态大盘。
* 不在前端展示 API Key 明文，不做密钥读取/复制能力。

## Technical Notes

* 前序任务已完成 `/settings/ai-providers`、`/settings/ai-models` 和 `ModelSelect`，当前仍基于 `aiCatalogFixture`。
* `packages/shared/src/fixtures/ai-catalog.ts` 是 mock catalog 单一来源；持久化 seed 可复用它，避免 web/ai-gateway 双份数据漂移。
* 当前任务应优先打通配置保存闭环，再进入 `06-30-ai-routing-degradation`。

