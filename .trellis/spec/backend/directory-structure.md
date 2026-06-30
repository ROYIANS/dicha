# Backend Directory Structure

> NestJS + Prisma. Monorepo 中 `apps/api/`。

---

## Monorepo 全局骨架

```
dicha-life/
├── apps/
│   ├── web/              # React + Vite + PixiJS
│   ├── api/              # NestJS + Prisma（本文档范围）
│   ├── ai-gateway/       # NestJS AI provider/model gateway（独立服务边界）
│   └── image-worker/     # Python FastAPI + Pillow + rembg
├── packages/
│   ├── shared/           # 共享 TS 类型 / 协议（DTO、enum）
│   └── palette/          # 主调色板 + ramp 配置
├── docker-compose.yml
└── plan.md
```

---

## `apps/api/` 内部布局

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── auth/                  # Casdoor 集成
│   │   ├── user/
│   │   ├── storage/               # S3/COS/MinIO 抽象
│   │   ├── ai/                    # OpenRouter proxy + budget guard
│   │   ├── image-worker/          # Python worker 客户端
│   │   ├── storage-room/          # 杂物间（M1）
│   │   ├── wardrobe/              # 衣橱（M3）
│   │   └── library/               # 书房（M3）
│   ├── common/                    # filters, interceptors, guards
│   ├── prisma/                    # PrismaService
│   └── config/
├── prisma/
│   └── schema.prisma
└── test/
```

---

## Module 边界原则

**房间 = 独立 NestJS Module，不是数据分类。**

- 每个房间模块独立 controller / service / DTO，可被替换 / 关闭
- shared module (`auth` / `user` / `storage` / `ai` / `image-worker`) 提供基础设施
- v2+ 候选房间：`fridge` / `medicine` / `vinyl` / `kitchen` / `tools` / `cosmetics` / `incense`

## Scenario: AI Gateway scaffold

### 1. Scope / Trigger

- Trigger: Any change that creates or modifies the independent AI service boundary under `apps/ai-gateway/`.
- Use this service for AI provider/model catalog, future routing, probes, circuit breaking, call logs, cost accounting, queues, and status dashboards.
- Do not put long-running third-party AI calls or AI availability probes into `apps/api`; `apps/api` stays the business-domain API.

### 2. Signatures

- Package: `apps/ai-gateway/package.json`
  - `dev`: `nest start --watch`
  - `build`: `nest build`
  - `start:prod`: `node dist/main.js`
  - `typecheck`: `tsc -p tsconfig.app.json --noEmit`
  - `lint`: `eslint "src/**/*.ts"`
- HTTP:
  - `GET /ai/health` -> `{ status: "ok", service: "ai-gateway" }`
  - `GET /ai/catalog` -> `AiGatewayCatalog`
- Shared contract source:
  - `packages/shared/src/contracts/ai.contract.ts`

### 3. Contracts

- Environment:
  - `PORT`: optional number, defaults to `3100`.
  - `AI_GATEWAY_INTERNAL_TOKEN`: optional string, reserved for internal service auth.
- Docker:
  - Dockerfile path: `docker/Dockerfile.ai-gateway`.
  - Compose service name: `ai-gateway`.
  - Healthcheck must call `http://127.0.0.1:3100/ai/health`.
- Cross-package DTOs must come from `@dicha/shared`; do not duplicate AI provider/model/status enums in web/api/ai-gateway.

### 4. Validation & Error Matrix

- Missing or invalid env -> process startup fails via `class-validator` config validation.
- Unknown provider/model states -> rejected by zod schemas in shared contract.
- AI Gateway down -> must not block `web` or `api` container startup until a task explicitly wires dependency.
- Docker unavailable in the local environment -> record as verification gap, but still run package lint/typecheck/build.

### 5. Good/Base/Bad Cases

- Good: add a new AI model status in `packages/shared`, consume it from `apps/ai-gateway`, then update web later from the same export.
- Base: scaffold a mock catalog service with typed seed data and no provider SDKs.
- Bad: define `type AiModelStatus = string` separately in `apps/web` and `apps/ai-gateway`, or add OpenAI SDK calls directly inside a settings page.

### 6. Tests Required

- Required for scaffold changes:
  - `pnpm --filter @dicha/shared build`
  - `pnpm --filter @dicha/ai-gateway lint`
  - `pnpm --filter @dicha/ai-gateway typecheck`
  - `pnpm --filter @dicha/ai-gateway build`
- Required when Docker CLI is available:
  - `docker compose config --quiet`
  - `docker build -f docker/Dockerfile.ai-gateway -t dicha-ai-gateway:test .`

### 7. Wrong vs Correct

#### Wrong

```typescript
// apps/api/src/modules/some-feature/some.service.ts
const model = 'gpt-5-mini';
await openai.chat.completions.create({ model, messages });
```

#### Correct

```typescript
// apps/ai-gateway/src/modules/providers/provider-adapter.ts
export interface ProviderAdapter {
  readonly providerId: string;
  listModels(): Promise<ProviderModelDescriptor[]>;
  probe(modelId: string): Promise<ProviderProbeResult>;
}
```

---

## 命名约定

- 文件夹：kebab-case (`storage-room/`)
- 文件：`<name>.<type>.ts`（NestJS 惯例：`user.service.ts`、`user.controller.ts`、`user.module.ts`、`create-user.dto.ts`）
- Module 类：PascalCase (`StorageRoomModule`)

---

## TODO（M1 Week 3 第一个房间出炉后回填）

- [ ] 具体的 controller / service 分层模板（M1 Week 3 第一个房间 storage-room 出炉后定型）
- [ ] DTO 与 Prisma model 的映射约定

### 已落地（M1 Week 1-2）

- `common/all-exceptions.filter.ts`：全局兜底 ExceptionFilter（≥500 记 error log；错误码体系待 Week 3-6）
- `prisma/`：`PrismaModule`（@Global）+ `PrismaService`（OnModuleInit `$connect`）
- `config/env.validation.ts`：class-validator 校验 `DATABASE_URL` / `PORT` / `BETTER_AUTH_*` / `ALTCHA_HMAC_SECRET` 等（缺失即启动失败，fail-fast）
- `modules/health/`：`GET /health` → DB ping，是 controller/service 分层的最小范例
- `modules/auth/`：Better Auth（直挂在 `main.ts` 的 Express 层，非 Nest 控制器）+ `auth.guard.ts`（业务路由复用）。**第三方 PoW / captcha 集成模式见 [third-party-integration.md](./third-party-integration.md)**（ALTCHA 邮箱发码防滥用是首个范例）
