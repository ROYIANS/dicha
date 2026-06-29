# 业务功能首个切片

## Goal

从视觉壳和登录基础转入真实业务闭环，选择一个足够小但能打通“数据库 → API 合约 → 后端模块 → 前端页面”的首个业务功能。目标不是一次做完整收纳系统，而是让 dicha 第一次拥有可登录用户自己的业务数据。

## What I Already Know

* 用户明确认为现在可以准备开发业务功能。
* 当前仓库没有 active task，工作区在创建本任务前是干净的。
* 后端已有 Nest + Prisma + Better Auth；`AuthGuard` 可保护业务路由。
* `packages/shared` 目前只有 `health` / `auth` 合约，尚未承载业务 API 合约。
* Prisma schema 已有 `RoomType`、`Category`、`Item`、`Event`、`Sticker`、`Poem` 等业务模型，其中 `Item` 关联 owner、category、sticker、poems、events。
* 前端 app shell 已有 `/home`、`/storage-room`、`/wardrobe`、`/library`、`/world`；其中 `/storage-room` 当前是空状态页面，衣橱和书房在导航里仍 disabled。
* 当前 `/home` 仍是 M1 skeleton/mock data，业务数据尚未从 API 读取。

## Assumptions (Temporary)

* 首个业务切片应优先打通一个真实用户数据闭环，而不是继续做纯视觉页面。
* MVP 阶段不需要兼容旧数据；可以按当前 Prisma schema 直接推进。
* 第一刀最好落在 STORAGE_ROOM / 物品录入，因为 storage-room 页面已经开放，schema 里的 `Item` 也最接近核心价值。
* 当前没有 category seed；由于 `Item.categoryId` 必填，MVP 必须明确类目来源。

## Selected Slice

### A. 储物间物品录入 + 列表

用户选择首个业务功能切片为“储物间物品录入 + 列表”。MVP 要让登录用户能在储物间创建一个物品，填写名称、类目、备注；创建后能在列表里看到自己的物品。后端按登录用户隔离数据，并写入 `CREATED` event。

## Candidate Slices (Decided)

### A. 储物间物品录入 + 列表（Selected）

用户能在储物间创建一个物品，填写名称、类目、备注；创建后能在列表里看到自己的物品。后端按登录用户隔离数据，并写入 `CREATED` event。

* Pros: 最像真正业务闭环；复用现有 `Item` / `Category` / `Event` 模型；能替换 storage-room 空状态。
* Cons: 跨 DB/API/shared/web，第一刀较完整，需要补合约、模块、UI 状态。

### B. 房间总览从 mock 改为真实统计

首页读取当前用户的物品数量、房间分布和最近活动，用真实数据替换部分 mock。

* Pros: 首页变化明显，用户一进 app 就能感知“活了”。
* Cons: 如果还没有创建物品的入口，统计页会先依赖 seed/mock，不如 A 闭环。

### C. 用户 homeName / 个人资料业务化

把账户页的 homeName、bio 等字段做成真实保存/读取，并在 app shell 展示。

* Pros: 范围较小，Auth user 表已有字段。
* Cons: 更像账户设置补全，不是收纳核心业务。

## Requirements (Evolving)

* 首个业务切片是储物间物品录入 + 列表。
* MVP 必须能证明登录用户拥有自己的储物间物品数据。
* 登录用户可以在 `/storage-room` 创建物品。
* 登录用户可以在 `/storage-room` 查看自己创建的物品列表。
* 物品至少包含名称、类目、备注。
* 创建物品时后端必须按当前 session user 写入 owner，不信任前端传 ownerId。
* 创建物品成功后写入 `CREATED` event，作为后续首页最近活动/统计的基础。
* MVP 不应引入大规模视觉重做、AI 生成、sprite 世界或复杂多房间系统。

## Acceptance Criteria (Evolving)

* [x] PRD 明确首个业务切片和 out-of-scope。
* [ ] 已确定类目来源与 MVP 类目交互。
* [ ] `/storage-room` 不再只是空状态；有真实列表与创建入口。
* [ ] 物品创建 API 需要登录，且只写入当前用户数据。
* [ ] 物品列表 API 需要登录，且只返回当前用户数据。
* [ ] shared contract 覆盖 list/create item 的请求与响应结构。
* [ ] 创建物品后 UI 能刷新或乐观展示新物品。
* [ ] 技术方案明确需要触碰的 DB / shared contract / API / web 页面。
* [ ] 实现前已配置相关 spec context。
* [ ] 完成后 lint / typecheck / build 通过。

## Definition of Done

* Tests added/updated where behavior is testable within current project setup.
* Lint / typecheck / build pass for touched packages.
* Docs/spec notes updated if new API or data contract conventions emerge.
* Task is committed, archived, and journaled.

## Out of Scope (Draft)

* 不做完整多房间管理系统。
* 不做 AI 贴纸匹配、诗句生成、世界 sprite 渲染。
* 不做导入/导出、搜索、提醒、协作或社交。
* 不重做 app shell / landing 视觉语言。

## Technical Notes

* Likely DB file: `apps/api/prisma/schema.prisma`.
* Likely API files: `apps/api/src/modules/*`, `apps/api/src/app.module.ts`.
* Likely shared contract files: `packages/shared/src/contracts/*`, `packages/shared/src/index.ts`.
* Likely web page: `apps/web/src/routes/_app/storage-room.tsx`.
* Existing protected backend example: `apps/api/src/modules/media/media.controller.ts` uses `@UseGuards(AuthGuard)`.
* Existing ts-rest contract example: `packages/shared/src/contracts/health.contract.ts`.
* Existing opened app route: `/storage-room`; wardrobe/library are still disabled in sidebar.
* Current Prisma setup has only `apps/api/prisma/schema.prisma`; no seed or migration directory exists yet.
* Current DB scripts: `prisma:generate` and `prisma:push`.
