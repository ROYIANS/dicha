# 超级管理员管理系统

## Goal

建设一个独立部署在 `admin.<domain>` 的超级管理员管理系统，用于承载后续平台级管理能力。它应复用现有 Better Auth 用户体系和 API 后端，但拥有独立前端项目、独立登录页、独立后台布局和只允许超级管理员访问的安全边界。

## What I Already Know

* 用户希望这是一个较大的新任务，先新建并认领任务，后续逐步实施。
* 管理系统功能方向包括：
  * 基础管理功能。
  * 系统功能。
  * 统计看板。
* 技术架构：
  * 前端需要新建独立项目。
  * 后端复用现有 `apps/api`。
  * 部署在 `admin.<domain>` 二级域名，主项目仍部署在顶级域名或现有主入口下。
* 登录和用户体系：
  * 需要独立登录页。
  * 仅允许环境变量中配置过的超级管理员邮箱用户登录。
  * 凭证和用户体系与现有系统保持一致。
* UI：
  * 可以复用现有设计方案。
  * 继续采用侧边栏 + 内容区的后台布局。
  * 这是独立前端项目，不是在现有 `apps/web` 内加一个 settings 页面。
* 现有代码已经有超级管理员基础：
  * 服务端环境变量：`DICHA_SUPER_ADMIN_EMAILS`。
  * `apps/api/src/modules/auth/auth.controller.ts` 根据 Better Auth session 用户邮箱派生 `UserDto.isSuperAdmin`。
  * `packages/shared/src/contracts/auth.contract.ts` 的 `UserDto` 已包含 `isSuperAdmin`。
  * `.trellis/spec/backend/auth-admin.md` 明确禁止把超级管理员邮箱列表暴露到 `VITE_*`。
* 当前 monorepo 支持新增前端 app：
  * `pnpm-workspace.yaml` 包含 `apps/*`。
  * `turbo.json` 已按 workspace task 运行 build/typecheck/lint。
  * 现有 `docker/Dockerfile.web` 和 `docker-compose.yml` 提供了可参考的独立前端镜像模式。

## Requirements

### MVP Scope

* 第一阶段只做管理系统骨架与安全边界：
  * `apps/admin` 独立前端项目。
  * 独立登录页与超级管理员准入。
  * 后台 shell：侧边栏、内容区、当前用户/退出入口。
  * Dashboard、基础管理、系统功能、统计看板的空路由/占位页面。
  * 后端 admin API guard 基座和一个可验证的安全端点。
* 第一阶段不实现第一个真实管理模块的 CRUD 或平台级统计明细。

### App Boundary

* 新建独立前端项目，建议路径为 `apps/admin`，包名建议为 `@dicha/admin`。
* 管理端前端应复用现有技术栈：React 19、Vite、TanStack Router/Query、ts-rest shared contract、i18next、Tailwind v4/HeroUI 设计基础。
* 管理端不应直接引用 `apps/web` 的业务页面；可在后续把真正通用的设计组件抽到共享包，但本任务第一阶段避免大规模抽象。

### Authentication And Authorization

* 管理端使用现有 Better Auth session 和 `/api/account/me` 查询当前用户。
* 管理端登录页是独立 UI，但登录动作应复用 Better Auth 的邮箱 OTP / OAuth / passkey 等现有能力，不建立第二套用户凭证系统。
* 登录成功后必须检查 `UserDto.isSuperAdmin`：
  * `true`：进入管理端。
  * `false`：显示无权限状态，并提供退出/返回主站动作。
* 后端需要提供 admin API 的服务端保护能力，不能只依赖前端隐藏入口。
* 建议新增 API 侧 `SuperAdminGuard` 或等价机制，在 `AuthGuard` 之后检查 `request.user.email` 是否匹配服务端 `DICHA_SUPER_ADMIN_EMAILS`。

### Initial Admin Modules

MVP 先建立信息架构与真实路由，不要求一次性实现所有复杂管理功能。

* 基础管理：
  * 用户管理入口。
  * AI 供应商/模型管理入口或跳转规划。
  * 内容/资源管理入口占位。
* 系统功能：
  * 系统健康状态。
  * 环境/服务配置只读摘要，避免泄露 secret。
  * 后续任务入口。
* 统计看板：
  * 平台级统计看板入口。
  * 首版可展示 API health、用户总数/AI 调用总览等可从后端安全提供的数据。

### Deployment

* 新增 admin 前端镜像/构建流程，参考现有 `docker/Dockerfile.web`。
* `docker-compose.yml` 需要能选择性运行 admin 服务，或默认增加 `admin` 服务并映射到单独端口。
* 生产反代目标是 `admin.<domain>`：
  * 管理端静态资源由 admin 前端容器提供。
  * `/api/*` 继续反代到同一个 `apps/api` 服务。
* 需要检查 Better Auth cookie / trusted origins / base URL 对跨子域的影响，确保 `admin.<domain>` 能与主应用共享凭证或完成独立登录。

### UI And UX

* 管理端使用后台管理系统常见布局：左侧 sidebar + 顶部/内容区。
* 视觉上沿用当前 warm matte + 结构感设计，但应更偏运营后台：密度更高、扫描更快、少叙事、多状态。
* 管理端登录页与主站登录页区分，但不应创造新的品牌语言。
* 普通用户进入 admin 域名时，应看到明确且克制的无权限页，而不是空白或循环跳转。

## Acceptance Criteria

* [ ] 新增 `apps/admin` workspace app，能独立 `dev`、`build`、`typecheck`、`lint`。
* [ ] 管理端登录页存在，并复用现有 Better Auth 登录能力。
* [ ] 管理端 route guard 使用 `/api/account/me` 的 `isSuperAdmin`，普通用户不能进入管理页面。
* [ ] 后端新增服务端超级管理员 guard 和一个 admin API 骨架端点，普通登录用户不能调用。
* [ ] 管理端有基础 shell：sidebar、内容区、用户状态/退出入口。
* [ ] 管理端有初版路由：Dashboard、基础管理、系统功能、统计看板，页面明确为骨架/占位状态。
* [ ] 部署文件支持构建/运行 admin 前端，并记录 `admin.<domain>` 反代方式。
* [ ] 不把 `DICHA_SUPER_ADMIN_EMAILS` 或任何 secret 暴露到 Vite 前端环境变量。
* [ ] 使用本机 pnpm `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm` 跑相关检查。

## Definition of Done

* PRD 和技术边界经用户确认。
* 代码实现通过相关 lint/typecheck/build。
* 新增 admin 入口具备真实登录和超级管理员准入保护。
* 后端 admin API 具备服务端授权保护。
* 部署说明或 compose/docker 文件与新前端项目一致。
* 如产生新的 auth/deployment 约定，更新 `.trellis/spec/`。

## Technical Approach

### Proposed Monorepo Shape

```text
apps/
  admin/
    src/
      api/
      components/
      features/
      routes/
      lib/
    package.json
    vite.config.ts
    tsconfig.json
```

`apps/admin` 初期可以复制 `apps/web` 的 Vite/TanStack 基础骨架，但只迁移必要部分。共享契约继续来自 `@dicha/shared`，不要复制 contract 类型。

### Auth Flow

1. 未登录访问 `admin.<domain>`。
2. 管理端显示独立登录页，调用 Better Auth 登录能力。
3. 登录成功后请求 `/api/account/me`。
4. 若 `isSuperAdmin === true`，进入 admin shell。
5. 若 `isSuperAdmin === false`，显示无权限页并允许退出。

### API Flow

* 管理端前端调用 `/api/admin/*` 或 shared contract 中的 admin namespace。
* `apps/api` 的 admin controller 必须同时满足：
  * 已登录。
  * 当前用户邮箱命中 `DICHA_SUPER_ADMIN_EMAILS`。
* 所有平台级统计/管理数据只能由后端聚合后返回，不允许前端直连数据库或 AI Gateway 内部数据文件。

### Deployment Flow

* 新增 `docker/Dockerfile.admin`。
* `docker-compose.yml` 增加 `admin` 服务，构建 `apps/admin` 静态资源并通过 nginx 服务。
* 管理端 nginx 需要和 web 一样反代 `/api/` 到 `api:3000/api/`。
* 生产环境由外层反代把 `admin.<domain>` 指向 admin 容器。

## Decision (ADR-lite)

**Context**: 超级管理员系统既需要复用现有登录用户体系，又需要和面向普通用户的主 Web 产品隔离，避免 settings 页面继续膨胀为内部平台。

**Decision**: 新建 `apps/admin` 独立前端项目，复用 `apps/api` 和 `@dicha/shared` contract；授权边界由服务端 `DICHA_SUPER_ADMIN_EMAILS` 派生，不把管理员邮箱配置交给浏览器。

**Consequences**: 前端会有少量 shell/auth/UI 代码重复，但部署和权限边界更清晰；后续如果重复组件增多，再抽共享 UI 包或应用级 layout 包。

## Expansion Sweep

### Future Evolution

* 管理端可能发展为平台运营系统：用户管理、AI 供应商运营、用量/账单、系统任务、审计日志、配置发布。
* 后续可能需要 RBAC，而不只是超级管理员布尔值；MVP 先只做超级管理员。

### Related Scenarios

* 主 Web 的 settings 内部工具应逐步迁移到 admin 前端。
* 平台级 AI 消费统计应区别于用户自己的 AI 消费统计，避免概念混淆。

### Failure And Edge Cases

* 普通用户打开 admin 域名：不能进入 shell，也不能拿到 admin API 数据。
* `DICHA_SUPER_ADMIN_EMAILS` 未配置：所有用户都不是超级管理员。
* Cookie 在 `admin.<domain>` 与主域名之间的作用域需要确认；不正确时可能导致登录后仍未识别 session。
* Better Auth `trustedOrigins()` 目前包含 `https://*.dicha.life`，但自定义域名或本地 admin 端口也需要覆盖。

## Out of Scope

* 第一阶段不实现完整用户 CRUD、账单、审计、权限角色系统。
* 第一阶段不迁移主 Web 的所有设置页。
* 第一阶段不建立第二套账户、密码或管理员凭证系统。
* 第一阶段不把超级管理员邮箱列表暴露给前端。
* 第一阶段不做复杂 RBAC，只做 `isSuperAdmin`。

## Technical Notes

* Existing super-admin spec: `.trellis/spec/backend/auth-admin.md`
* Shared auth contract: `packages/shared/src/contracts/auth.contract.ts`
* API current-user endpoint: `apps/api/src/modules/auth/auth.controller.ts`
* Better Auth config: `apps/api/src/modules/auth/auth.ts`
* Web auth query pattern: `apps/web/src/api/auth.ts`
* Web ts-rest client pattern: `apps/web/src/api/client.ts`
* Existing app routing/layout reference: `apps/web/src/routes/_app.tsx`, `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/Header.tsx`
* Existing deploy reference: `docker/Dockerfile.web`, `docker/nginx.conf`, `docker-compose.yml`
* Package manager constraint: use `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm`, never Codex Runtime pnpm.

## Open Questions

* None. MVP scope confirmed: build admin app skeleton + auth/authorization + empty module routes first.
