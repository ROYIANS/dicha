# Frontend Quality Guidelines

---

## 通用原则（与 plan.md 铁律对齐）

1. **不做半成品** —— 不一致体验比不做更糟
2. **不为未来抽象** —— 三行相似代码好过一个过早的抽象
3. **默认不写注释** —— 命名讲清"做什么"
4. **情感性 feature 用"发现"而非"展示"**

---

## 技术栈版本选型

- **永远用前沿稳定版**（最新 LTS / latest stable）。新建依赖时查实当前最新版本号再写，不沿用过时版本。
- 跨大版本优先升（React 19、Vite 最新、TanStack 最新等），配置按新版规范重写。
- 例外：ROYIANS 明确要求锁版本时才锁。

---

## 不要兼容历史 / 旧数据（MVP 铁律）

**MVP 阶段本就会大量重构、重设计。除非 ROYIANS 明确要求兼容，否则绝不为"旧数据 / 旧 localStorage / 旧组件接口"写兼容逻辑。**

**Why:** 单人开发、greenfield。胶水代码、向后兼容分支污染代码库、拖慢迭代，违背"最干净版本"目标。

**How to apply:**
- 改组件 props / store 结构就直接改，不留 deprecated 别名或迁移层。
- 不写 `if (oldLocalStorageFormat)` 之类的版本判断分支。
- 唯一触发兼容的信号：ROYIANS 明说"这个要兼容 / 保留"。

---

## Code Style

- **ESLint flat config + Prettier**（root 共享、前后端 extend）：`typescript-eslint` + `eslint-plugin-react-hooks`（严格）+ `eslint-plugin-react-refresh`。
  - `eslint-plugin-react-hooks@7` 的 flat 预设在 `configs.flat['recommended-latest']`——顶层 `configs['recommended-latest']` 仍是 legacy eslintrc 形状，**会让 ESLint 10 崩**。
  - `react-refresh/only-export-components` 与 TanStack Router file-route 冲突（route 文件导出 `Route` 对象而非组件）→ 仅对 `src/routes/**` 关掉该规则（HMR 由 router 插件管）。
- **Tailwind v4 + HeroUI v3** 是 M1 样式/组件基建（不再推迟 M3）；CSS Modules 仅作 bespoke 逃生口。详见 [architecture.md §4](./architecture.md)。
- i18n：`react-i18next`（**不是** plan 误写的 next-intl）。

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
- **验证陷阱**：`vite build` 绿 ≠ `vite dev` 能跑（workspace **CJS** 包：Rollup 能静态分析 CJS 再导出，esbuild/原生 ESM dev 看不穿 tslib `__exportStar`）→ 改完前端**必须真加载 dev module graph**（curl Vite 转换后的模块或开浏览器），别只看 build/typecheck/lint。

---

## TODO（M1 起跑后回填）

- [ ] 视觉回归测试（M2 sprite 上来后再考虑）
- [ ] a11y 基线（HeroUI/React Aria 已带基础可访问性，确认补充项）
