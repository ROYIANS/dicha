# Backend Quality Guidelines

---

## 通用原则（与 plan.md 铁律对齐）

1. **不做半成品** —— 部分实现 + 不一致体验 = 比不做更糟
2. **不为未来抽象** —— 三行相似代码好过一个过早的抽象
3. **不加未发生的错误处理** —— 信任内部代码与框架保证
4. **默认不写注释** —— 命名讲清"做什么"，注释只解释"为什么"

---

## 技术栈版本选型

- **永远用前沿稳定版**（最新 LTS / latest stable）。新建依赖时查实当前最新版本号再写，不沿用过时的版本号。
- 跨大版本（如 Prisma 5→7、NestJS 10→11）优先升，配置按新版规范重写，不为旧写法保留。
- 例外：ROYIANS 明确要求锁某个版本时才锁（如本项目 TS 暂用 5.x 最新而非 6.x，是显式选择）。

---

## 不要兼容历史 / 旧数据（MVP 铁律）

**MVP 阶段本就会大量重构、重设计。除非 ROYIANS 明确要求兼容，否则绝不为"历史数据 / 旧 schema / 旧版本"写任何兼容逻辑。**

**Why:** 单人开发、greenfield、dev 数据库可随时清空。胶水代码、迁移兼容层、向后兼容分支会污染代码库，拖慢迭代，违背"最干净版本"的目标。

**How to apply:**
- 改 Prisma schema 时，直接重置/重建，不写数据迁移脚本去保旧数据（`migrate reset` 优于手写 backfill）。
- 不写 feature flag、版本判断、`if (oldFormat)` 分支、deprecated 字段保留。
- 重命名 / 删字段就直接改，不留 `@deprecated` 别名或 re-export。
- 配置同理（Prisma、tsconfig、docker 等）：用新版推荐写法，不堆叠"兼容旧行为"的选项。
- 唯一触发兼容的信号：ROYIANS 在对话里明说"这个要兼容 / 保留旧数据"。

---

## Code Style

- TypeScript strict mode 全开（已落地：根 `tsconfig.base.json` strict 全开）
- ESLint + Prettier：**尚未落地**，待选型后与前端共享配置（见下方 TODO）
- 无 `any`（除非有 `// reason:` 注释）

---

## 测试（MVP 阶段）

- **MVP 不强制单测覆盖率** —— ROYIANS 单人开发，过度测试 = 拖慢迭代
- **集成测试只覆盖关键路径**：录入流程、AI 降级路径、auth
- v1.0 发布前重点跑一遍核心链路 e2e

> 注：与典型团队 spec 不同，这条是 dicha 项目的自觉选择，因为是单人 weekend warrior 项目（15-25h/周）。

---

## TODO（M1 跑起来后回填）

- [ ] ESLint + Prettier 配置（flat config，前后端共享；含 `@typescript-eslint`）
- [ ] 测试框架选型（Jest 默认 vs Vitest）
- [ ] CI 流水线（GitHub Actions）
- [ ] Type check / lint 的 pre-commit hook
