# AI 调用路由与优雅降级

## Goal

实现 AI Gateway 的调用代理、供应商 adapter、用途路由、重试、超时、熔断和优雅降级。

## Requirements

* 业务方按 use case 请求模型能力，不直接依赖供应商。
* Provider adapter 支持至少一个真实供应商。
* 实现主模型、同供应商 fallback、跨供应商 fallback。
* 区分鉴权失败、配置错误、限流、5xx、超时、内容安全拒绝。
* 对业务侧返回可解释的降级结果，不暴露内部密钥或堆栈。

## Acceptance Criteria

* [ ] 至少一个 use case 可以完成真实调用。
* [ ] 超时/5xx 可触发 fallback。
* [ ] 鉴权失败不会无限重试。
* [ ] 调用错误分类可用于状态监控。

