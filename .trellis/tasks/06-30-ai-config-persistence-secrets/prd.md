# AI 配置持久化与密钥管理

## Goal

让 AI Gateway 拥有真实配置存储能力，支持供应商、模型、用途分配和密钥安全管理。

## Requirements

* 设计供应商、模型、用途分配、密钥状态的数据模型。
* API Key / Secret 加密存储，不明文回显。
* 提供供应商和模型 CRUD API。
* 设置页从真实 API 读取/保存配置。
* 支持配置错误状态，如 missing credential、invalid base URL。

## Acceptance Criteria

* [ ] 配置可持久化。
* [ ] 密钥只写入、不明文读取。
* [ ] 设置页可保存供应商和模型启用状态。
* [ ] shared contract 覆盖请求/响应。

