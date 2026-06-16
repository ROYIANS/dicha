# Database Guidelines

> Postgres + Prisma。

---

## 技术栈

- **DB**: Postgres（自托管 / 云端均可）
- **ORM**: Prisma 7（`prisma-client` generator，非旧的 `prisma-client-js`）
- **Migration**: Prisma Migrate（`prisma migrate dev` / `prisma migrate deploy`）

### Prisma 7 关键配置（与 v5/v6 不同，易踩坑）

- **NestJS 用 CommonJS**，故 generator 必须设 `moduleFormat = "cjs"`（NestJS 官方 Prisma 配方明示 Prisma 7 默认 ESM 与 Nest 不兼容）。
- generator `output = "../src/generated/prisma"` 必填——client 不再生成进 `node_modules`，且该目录已 gitignore（构建产物）。
- **新 checkout 必须先 `pnpm --filter @dicha/api prisma:generate`**：该 client 是 gitignore 的构建产物，不生成则 `PrismaService` 丢失 `$queryRaw`/`$connect` 类型，`typecheck`/`build` 直接报错。
- **datasource 块不含 `url`**（Prisma 7 移除）。连接串放 `apps/api/prisma.config.ts` 的 `datasource.url`（供 CLI/migrate），运行时由 `PrismaService` 通过 `@prisma/adapter-pg` driver adapter 注入。
- `PrismaClient` 从 `../generated/prisma/client` 导入，**不再从 `@prisma/client`**。
- `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`——v7 运行时强制要求 driver adapter。
- 不自动加载 `.env`：`prisma.config.ts` 顶部 `import 'dotenv/config'`。
- `prisma migrate diff` 的 `--to-schema-datamodel` 已改名为 `--to-schema`。

---

## 命名约定

- Model：PascalCase 单数（`User`、`Item`、`Sticker`、`Poem`）
- 字段：camelCase（`createdAt`、`ownerId`）
- 表名：默认即 model 名（PascalCase 单数：`"User"`、`"Item"`），不加 `@@map`——v0 schema 不做 snake_case 映射
- 关系字段显式命名（`owner` / `ownerId`），不用默认的 `user` / `userId` 让多关系场景歧义

---

## v0 数据模型（M1 Week 1-2 落地）

依 plan.md：
- `User`
- `Item`（物品本体）
- `Category`（类目）
- `Sticker`（贴纸 sprite）
- `Poem`（诗）
- `Event`（互动事件 / 打卡 / 房间事件）

> 注：M1 c1 只存一句诗，但 schema 留多句空间（v2 "诗的卷轴"）。

---

## 关键约束

- **金币 schema MVP 就装上**（无消费场景，仅显示）—— 避免 v2 加字段时数据迁移
- **互动事件用 Event 表统一记录**，不在 Item 上叠 `lastInteractedAt` 字段（落灰曲线需要历史）
- **删除 = 硬删除**（g1 断舍离），v2 加纪念物 flag 时再加 `memorialAt` 字段

---

## v0 实际落地（M1 Week 1-2，`apps/api/prisma/schema.prisma`）

### 关系图

```
User 1──* Item        (ownerId, onDelete: Cascade)
User 1──* Event       (ownerId, onDelete: Cascade)
Category 1──* Item     (categoryId, onDelete: Restrict)
Category 1──* Poem     (categoryId, onDelete: SetNull)  ← 类目默认诗池
Sticker 1──* Item      (stickerId 可空, onDelete: SetNull)  ← 文字兜底
Item 1──* Poem         (itemId 可空, onDelete: Cascade)
Item 1──* Event        (itemId 可空, onDelete: SetNull)
```

- **Poem 双父**：`itemId` 与 `categoryId` 二选一——绑定 item 或作为类目默认池。
- **id 用 `cuid()`**，非自增 int（分布式友好、不泄露记录数）。

### 索引清单

- `User.email` unique、`Category.key` unique
- `Item`: `ownerId`、`categoryId`
- `Poem`: `itemId`、`categoryId`
- `Event`: `ownerId`、`itemId`、`type`

### onDelete 语义

- 删 User → 级联删其 Item / Event（断舍离，硬删除）
- 删 Item → 级联删其 Poem，Event.itemId 置 null（保留互动历史给落灰曲线）
- 删 Sticker / Category(诗) → 相关外键 SetNull，不连带删 Item

### 软删除策略

**不做软删除**（g1 断舍离）。v2 纪念物再加 `memorialAt`。

## TODO（后续回填）

- [ ] seed 脚本规范（M1 Week 7-10 类目体系 + 默认诗池落地时定）
