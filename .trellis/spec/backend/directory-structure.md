# Backend Directory Structure

> NestJS + Prisma. Monorepo 中 `apps/api/`。

---

## Monorepo 全局骨架

```
dicha-life/
├── apps/
│   ├── web/              # React + Vite + PixiJS
│   ├── api/              # NestJS + Prisma（本文档范围）
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
- `config/env.validation.ts`：class-validator 校验 `DATABASE_URL` / `PORT`
- `modules/health/`：`GET /health` → DB ping，是 controller/service 分层的最小范例
