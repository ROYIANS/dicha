# AI Gateway 基础骨架与部署入口

## Goal

建立独立 `apps/ai-gateway` 服务的最小可运行骨架，让后续 AI 配置、调用、探测和状态大盘工作有明确服务边界。

## Requirements

* 新增 `apps/ai-gateway` NestJS package。
* 新增 `GET /ai/health` 健康检查。
* 新增 mock `GET /ai/catalog`，返回供应商、模型、用途分配和状态字段。
* 在 `packages/shared` 新增 AI contract/types，供 web/api/ai-gateway 共用。
* 新增 provider adapter interface，预留模型列表、探测、调用状态扩展点。
* 新增 `docker/Dockerfile.ai-gateway`。
* 更新 `docker-compose.yml`，加入 `ai-gateway` 服务位和 healthcheck。
* 更新 GitHub Actions 镜像构建矩阵，发布 `dicha-ai-gateway` 镜像。
* 暂不引入真实供应商 SDK、数据库、密钥、队列和真实调用。

## Acceptance Criteria

* [x] `pnpm --filter @dicha/shared build` 通过。
* [x] `pnpm --filter @dicha/ai-gateway lint` 通过。
* [x] `pnpm --filter @dicha/ai-gateway typecheck` 通过。
* [x] `pnpm --filter @dicha/ai-gateway build` 通过。
* [ ] Dockerfile 可以构建 ai-gateway 镜像。
* [x] docker-compose 中存在 ai-gateway 服务，且 web/api 不因它未就绪而被强绑定。
* [x] GitHub Actions 镜像构建矩阵包含 `ai-gateway`。

## Implementation Notes

当前会话已经开始落地：

* `packages/shared/src/contracts/ai.contract.ts`
* `apps/ai-gateway/**`
* `docker/Dockerfile.ai-gateway`

后续继续本子任务时，先完成 `docker-compose.yml` 接入，然后跑质量检查。

## Verification Notes

* `pnpm --filter @dicha/shared build` passed.
* `pnpm --filter @dicha/ai-gateway lint` passed.
* `pnpm --filter @dicha/ai-gateway typecheck` passed.
* `pnpm --filter @dicha/ai-gateway build` passed.
* `docker compose config --quiet` and `docker build -f docker/Dockerfile.ai-gateway -t dicha-ai-gateway:test .` could not run because Docker CLI is not available in the current environment.
* `.trellis/spec/backend/directory-structure.md` updated with the AI Gateway scaffold contract.
* `.github/workflows/build-images.yml` now builds and pushes the `ai-gateway` image.
