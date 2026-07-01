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

## Scenario: AI Gateway boundary and config persistence

### 1. Scope / Trigger

- Trigger: Any change that creates or modifies the independent AI service boundary under `apps/ai-gateway/`, its BFF proxy in `apps/api/`, or the shared AI contract.
- Use this service for AI provider/model catalog, future routing, probes, circuit breaking, call logs, cost accounting, queues, and status dashboards.
- Do not put long-running third-party AI calls or AI availability probes into `apps/api`; `apps/api` stays the business-domain API.
- `apps/api` may proxy configuration/catalog endpoints so the browser keeps using same-origin `/api` plus the Better Auth session cookie.

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
  - `PATCH /ai/config` -> `{ catalog: AiGatewayCatalog }`
- API BFF:
  - `GET /api/ai/catalog` -> proxies to `GET {AI_GATEWAY_BASE_URL}/catalog`
  - `PATCH /api/ai/config` -> proxies to `PATCH {AI_GATEWAY_BASE_URL}/config`
  - Protect BFF routes with `AuthGuard`; do not expose AI config writes as anonymous endpoints.
- Shared contract source:
  - `packages/shared/src/contracts/ai.contract.ts`
- Shared root contract:
  - `packages/shared/src/contracts/health.contract.ts` exports `contract` with nested `ai: aiContract` so web clients call `api.ai.*`.
- Mock catalog fixture:
  - `packages/shared/src/fixtures/ai-catalog.ts`
  - `apps/ai-gateway/src/modules/catalog/catalog.seed.ts` must re-export the shared fixture instead of keeping a second copy.

### 3. Contracts

- Environment:
  - `PORT`: optional number, defaults to `3100`.
  - `AI_GATEWAY_INTERNAL_TOKEN`: optional string. When set in `apps/ai-gateway`, `CatalogController` requires the `x-ai-gateway-token` header. `apps/api` sends the same header when proxying.
  - `AI_GATEWAY_SECRET_KEY`: optional string used to encrypt persisted provider credentials. Production/self-hosted deployments should set it; rotating it makes existing encrypted credentials unreadable.
  - `AI_GATEWAY_DATA_DIR`: optional string, defaults to `./data/ai-gateway`; config is stored as `config.json` in this directory.
  - `AI_GATEWAY_BASE_URL` in `apps/api`: optional string, defaults to `http://localhost:3100/ai`; Docker compose must set it to `http://ai-gateway:3100/ai`.
- Docker:
  - Dockerfile path: `docker/Dockerfile.ai-gateway`.
  - Compose service name: `ai-gateway`.
  - Healthcheck must call `http://127.0.0.1:3100/ai/health`.
  - Mount a named volume for `AI_GATEWAY_DATA_DIR` so provider/model config and encrypted credentials survive container recreation.
- Cross-package DTOs must come from `@dicha/shared`; do not duplicate AI provider/model/status enums in web/api/ai-gateway.
- `GET /ai/catalog` is generated from persisted config. First boot with no config seeds providers/models/assignments from `aiCatalogSeed`; credential state must be `missing` and model availability may be `config_required`.
- Secrets are write-only. `PATCH /ai/config` may accept `providers[].credential`, but no API may return plaintext credentials. Catalog responses return only `credentialState`.
- UI settings pages must consume `api.ai.getCatalog` / `api.ai.updateConfig`; direct fixture reads are only acceptable for seed data inside `apps/ai-gateway`.

### 4. Validation & Error Matrix

- Missing or invalid env -> process startup fails via `class-validator` config validation.
- Unknown provider/model states -> rejected by zod schemas in shared contract.
- Invalid config payload -> reject at the gateway boundary with `AiConfigUpdateSchema.parse`.
- AI Gateway down or invalid gateway response -> `apps/api` proxy returns `502 Bad Gateway`; web shows a save/load failure instead of using stale mock data.
- Missing `x-ai-gateway-token` when `AI_GATEWAY_INTERNAL_TOKEN` is configured -> gateway returns `401`.
- AI Gateway down -> must not block `web` or `api` container startup unless a task explicitly wires dependency. Runtime catalog/config calls may fail gracefully.
- Docker unavailable in the local environment -> record as verification gap, but still run package lint/typecheck/build.

### 5. Good/Base/Bad Cases

- Good: add a new provider config field in `packages/shared/src/contracts/ai.contract.ts`, parse it in `apps/ai-gateway`, proxy it in `apps/api`, and consume it from web through `api.ai.*`.
- Base: seed a missing config file from `aiCatalogSeed`, then persist user changes in `AI_GATEWAY_DATA_DIR/config.json`.
- Bad: define `type AiModelStatus = string` separately in `apps/web` and `apps/ai-gateway`, or add OpenAI SDK calls directly inside a settings page.
- Bad: return `credential` or `apiKey` in `AiGatewayCatalog`; secrets are never readable after write.
- Bad: copy the mock catalog into a settings page to unblock UI work; provider/model ids will drift from AI Gateway.

### 6. Tests Required

- Required for AI gateway/config changes:
  - `pnpm --filter @dicha/shared build`
  - `pnpm --filter @dicha/ai-gateway lint`
  - `pnpm --filter @dicha/ai-gateway typecheck`
  - `pnpm --filter @dicha/ai-gateway build`
  - Assert manually or via tests that `GET /ai/catalog` never includes plaintext credentials.
- Required when `apps/api` proxies AI config:
  - `pnpm --filter @dicha/api lint`
  - `pnpm --filter @dicha/api typecheck`
  - `pnpm --filter @dicha/api build`
- Required when web consumes AI settings:
  - `pnpm --filter @dicha/web lint`
  - `pnpm --filter @dicha/web typecheck`
  - `pnpm --filter @dicha/web build`
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

#### Wrong

```typescript
// apps/web/src/features/settings/ai-settings-pages.tsx
const providers = [{ id: 'openai', name: 'OpenAI' }];
```

#### Correct

```typescript
// apps/web/src/api/ai.ts
import { api } from './client';

export const aiCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ['ai', 'catalog'] as const,
    queryFn: async ({ signal }) => {
      const res = await api.ai.getCatalog({ fetchOptions: { signal } });
      if (res.status === 200) return res.body;
      throw new Error(`AI catalog request failed (${res.status})`);
    },
  });
```

#### Wrong

```typescript
// Any API response shape
return { providerId: 'openai', apiKey: decryptedSecret };
```

#### Correct

```typescript
return {
  providerId: 'openai',
  credentialState: credential ? 'masked' : 'missing',
};
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
