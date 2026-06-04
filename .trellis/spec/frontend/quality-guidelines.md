# Frontend Quality Guidelines

---

## 通用原则（与 plan.md 铁律对齐）

1. **不做半成品** —— 不一致体验比不做更糟
2. **不为未来抽象** —— 三行相似代码好过一个过早的抽象
3. **默认不写注释** —— 命名讲清"做什么"
4. **情感性 feature 用"发现"而非"展示"**

---

## Code Style

- ESLint + Prettier（与后端共享配置）
- `eslint-plugin-react-hooks` 严格执行
- Tailwind？M3 决定（M1 用纯 CSS / CSS Modules 起步即可）

---

## 性能门槛

- **房间渲染 60fps**（M2 Week 13-14 验收线）
- **1000+ sprite 不掉帧**（M3 Week 33 优化）
- 首屏 LCP < 2s（云端版）

---

## 不该做

- 不加红点 / "未读 N" / 内疚提醒（违背 vidorra 灵魂）
- 不写 hover 显示诗（铁律：诗的力量来自稀缺）
- 不发 push 强制回流（v2 冰箱才考虑 push，且要有理由）

---

## 测试

- MVP 不强制单测（单人开发）
- 关键路径 e2e：onboarding、录入、登录
- 每周自用 1 天验证

---

## TODO（M1 起跑后回填）

- [ ] 是否引入 Tailwind
- [ ] 视觉回归测试（M2 sprite 上来后再考虑）
- [ ] a11y 基线
