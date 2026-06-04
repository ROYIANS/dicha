# Database Guidelines

> Postgres + Prisma。

---

## 技术栈

- **DB**: Postgres（自托管 / 云端均可）
- **ORM**: Prisma
- **Migration**: Prisma Migrate（`prisma migrate dev` / `prisma migrate deploy`）

---

## 命名约定

- Model：PascalCase 单数（`User`、`Item`、`Sticker`、`Poem`）
- 字段：camelCase（`createdAt`、`userId`）
- 表名：Prisma 自动 snake_case 复数（`@@map` 仅在必要时覆盖）
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

## TODO（M1 Week 1-2 写完 schema.prisma 后回填）

- [ ] 完整 model 关系图
- [ ] 软删除策略（如果有）
- [ ] 索引清单
- [ ] seed 脚本规范
