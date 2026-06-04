# Backend Quality Guidelines

---

## 通用原则（与 plan.md 铁律对齐）

1. **不做半成品** —— 部分实现 + 不一致体验 = 比不做更糟
2. **不为未来抽象** —— 三行相似代码好过一个过早的抽象
3. **不加未发生的错误处理** —— 信任内部代码与框架保证
4. **默认不写注释** —— 命名讲清"做什么"，注释只解释"为什么"

---

## Code Style

- TypeScript strict mode 全开
- ESLint + Prettier（M1 Week 1-2 落地，配置同前端共享）
- 无 `any`（除非有 `// reason:` 注释）

---

## 测试（MVP 阶段）

- **MVP 不强制单测覆盖率** —— ROYIANS 单人开发，过度测试 = 拖慢迭代
- **集成测试只覆盖关键路径**：录入流程、AI 降级路径、auth
- v1.0 发布前重点跑一遍核心链路 e2e

> 注：与典型团队 spec 不同，这条是 vidorra 项目的自觉选择，因为是单人 weekend warrior 项目（15-25h/周）。

---

## TODO（M1 跑起来后回填）

- [ ] 测试框架选型（Jest 默认 vs Vitest）
- [ ] CI 流水线（GitHub Actions）
- [ ] Type check / lint 的 pre-commit hook
