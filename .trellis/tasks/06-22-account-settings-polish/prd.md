# PRD: 账户设置独立页面与账户能力补全

## Goal

把现有右上角账户弹窗升级为真正可长期承载的账户设置体验：解决卡顿、移动端布局差、Passkey 未命名且不可重命名、预设头像不合适等问题，同时补齐账户资料与安全管理的核心闭环。

## What I Already Know

- 当前账户入口在 `apps/web/src/components/Header.tsx`，点击右上角用户区打开 `AccountModal`。
- 当前 `AccountModal` 已有 Profile / Security 两个 tab，但它是居中 modal，移动端空间有限。
- 当前 Profile 已支持头像预设、头像上传、昵称修改、邮箱验证状态与重发验证邮件。
- 当前 Security 已支持 GitHub 绑定/解绑、Passkey 添加/删除。
- 用户明确偏好：改成独立页面，不再继续抽屉/弹窗方案。
- 用户明确决定：旧 `AccountModal` 直接删除，不保留为隐藏入口或轻量菜单。
- 用户指出的主要问题：
  - 账户弹窗卡顿。
  - 移动端适配不好，个别输入框展示不佳。
  - Passkey 添加后显示“未命名 passkey”，且不能重命名。
  - 现有预设头像不合适，希望采用 Boring Avatars。
- 我此前评估的账户缺口：
  - 没有独立 `/account` / `/settings` 页面。
  - `city / gender / personalityArchetype / homeName / coins` 等用户字段未完整纳入账户 UI。
  - 缺少设备/session 管理、删除账号、导出数据、隐私/通知设置等后续账户能力。
  - 邮箱验证重发目前没有 ALTCHA header，可能被后端守卫拒绝。
  - 登录成功后跳 `/`，可能应该进入 `/home`。
  - GitHub 解绑和 Passkey 删除缺少确认。
  - 账户相关无测试/e2e。

## Research References

- Boring Avatars README: https://raw.githubusercontent.com/boringdesigners/boring-avatars/master/README.md
- jsDelivr package page: https://www.jsdelivr.com/package/npm/boring-avatars
- `research/account-avatar-passkey-notes.md` — Boring Avatars 与 Better Auth Passkey 命名/重命名能力确认。

## Research Notes

### Boring Avatars

- `boring-avatars` 是 React SVG avatar 库，可以用 username/email/random string 生成稳定头像。
- Install: `pnpm add boring-avatars --filter @dicha/web`。
- Props: `name`, `variant`, `colors`, `size`, `square`, `title`。
- Variants: `marble`, `beam`, `pixel`, `sunset`, `ring`, `bauhaus`。
- 当前 npm/jsDelivr 显示版本 `2.0.4`，MIT license。
- 旧的 hosted API service 已暂停，MVP 应使用 npm React 组件本地生成，不依赖远程头像 API。

### Better Auth Passkey

- 官方 docs 显示 `passkey.addPasskey({ name })` 支持添加时传入可读名称。
- 官方 docs 显示已有 passkey 可以用 `passkey.update({ id, name })` 重命名。
- 当前代码已经有 `useListPasskeys()` 和 `passkey.deletePasskey({ id })`；实现时先按已安装版本的类型确认具体方法名。
- 预计不需要新增后端接口，除非当前安装版本的 client API 暴露能力与文档不一致。

### Repo Constraints

- 前端栈：React 19 + TanStack Router + TanStack Query + HeroUI + Tailwind v4。
- 账户 UI 应遵守 `.trellis/spec/frontend/design-system.md` 与 `blueprint-aesthetic.md`：
  - 暖白柔面哑光 token。
  - 工程纸 / blueprint 结构语汇。
  - 浮层遮罩统一 `DotsBackdrop`，但本任务主方向是独立页面，尽量减少 modal 使用。
- 当前 auth 客户端在 `apps/web/src/lib/auth-client.ts`，已导出：
  - `updateUser`
  - `listAccounts`
  - `linkSocial`
  - `unlinkAccount`
  - `useListPasskeys`
  - `passkey`
- 当前后端有 `/api/media/avatar` 上传头像接口，但还没有专门的账户 REST contract。

## Requirements

### R1. 独立账户设置页面

- 新增受保护账户设置页面，路由为 `/account`。
- Header 用户入口改为导航到该页面，不再打开 `AccountModal` 作为主账户管理入口。
- 删除旧 `AccountModal` 组件与相关引用，避免保留重复账户 UI 和卡顿源。
- 页面应在桌面端提供清晰分区，在移动端作为单列完整页面使用。
- 页面要延续 app shell 与 blueprint 语汇，不做后台 admin 风格。

### R2. 性能与卡顿治理

- 移除或减少账户管理中的高成本 modal/backdrop 渲染路径。
- 将账户页面拆成更小的 profile/security/avatar/passkey section，避免一个大组件里所有状态互相触发重渲染。
- 对头像候选渲染保持轻量，避免大量图片或远程请求。

### R3. 移动端适配

- 移动端表单、按钮、头像选择、Passkey 列表都必须不横向溢出。
- 输入框与操作按钮在窄屏下可自然换行或变为纵向布局。
- 重要操作不隐藏在 hover-only 控件中。

### R4. Boring Avatars 替换预设头像

- 引入 `boring-avatars`，用本地 React SVG 组件生成默认头像/候选头像。
- 头像 palette 使用 dicha 暖色 token 对应的固定色板，不使用库默认高饱和色板。
- 头像应基于用户 email/name/homeName 等稳定 seed 生成。
- 保留“上传自定义头像”能力。
- 默认头像不应依赖外部 API。

### R5. Passkey 命名与管理

- 添加 Passkey 时先收集/生成可读名称，再调用 `passkey.addPasskey({ name })`，避免默认显示“未命名 passkey”。
- 已有 Passkey 支持通过 Better Auth passkey update API 重命名。
- 删除 Passkey 前需要确认，避免误删。
- Passkey 列表移动端展示清楚：名称、状态/创建信息（若 API 可得）、操作按钮。

### R6. 账户资料补全

- 除 displayName 外，纳入已有用户字段的编辑能力：
  - `homeName`
  - `city`
  - `gender`
  - `personalityArchetype`
- `coins` 只展示，不允许编辑。
- 字段保存后刷新 session/query cache，Header 和页面同步更新。

### R7. 安全账户能力补齐

- GitHub 解绑需要确认。
- 邮箱验证重发需要修正 ALTCHA 流程，不能被后端 `altchaGuard` 拦截。
- 登录成功后进入 app 首页（建议 `/home`），而不是回到 landing `/`。

### R8. 明确非目标能力的占位策略

- 设备/session 管理、删除账号、数据导出、隐私/通知设置可以先作为后续分区占位或明确 Out of Scope。
- 占位必须克制，不出现“做了一半但误导可用”的按钮。

## Acceptance Criteria

- [ ] 访问账户入口进入独立账户设置页面，而不是打开账户管理弹窗。
- [ ] 旧 `AccountModal` 被移除，代码库不再保留完整账户弹窗实现。
- [ ] 页面在 desktop / tablet / mobile 宽度下无横向溢出，表单和操作按钮布局合理。
- [ ] displayName、homeName、city、gender、personalityArchetype 可编辑并保存。
- [ ] coins 仅展示，不可编辑。
- [ ] 头像默认/候选由 Boring Avatars 本地生成，上传头像仍可用。
- [ ] 添加 Passkey 后有可读名称；已有 Passkey 可重命名。
- [ ] 删除 Passkey 与解绑 GitHub 均有确认步骤。
- [ ] 邮箱验证重发可成功经过 ALTCHA 守卫。
- [ ] 登录成功后进入 `/home`。
- [ ] lint / typecheck / web build 通过。
- [ ] 至少补一条账户关键路径的测试或明确记录测试缺口。

## Definition of Done

- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- `pnpm --filter @dicha/web build` 通过。
- Vite dev module graph 能实际加载账户页面。
- 移动端和桌面端视觉检查通过。
- 若引入新依赖，lockfile 更新且版本记录清晰。
- 如发现 Better Auth API 限制，需要在 PRD 或 spec 中记录。

## Out of Scope

- 不实现完整 session/device 管理，除非 Better Auth client 现有 API 能低成本完成。
- 不实现删除账号。
- 不实现数据导出。
- 不做通知偏好系统。
- 不引入远程头像 API 或外部头像服务。
- 不重构整个 app shell。
- 不保留旧账户弹窗作为备用体验。

## Technical Notes

- Likely impacted files:
  - `apps/web/src/routes/_app.tsx`
  - `apps/web/src/routes/_app/account.tsx` or `apps/web/src/routes/_app/settings/account.tsx`
  - `apps/web/src/components/Header.tsx`
  - `apps/web/src/components/AccountModal.tsx` (delete)
  - new account settings components under `apps/web/src/components/` or route-local helpers
  - `apps/web/src/lib/auth-client.ts`
  - `apps/web/src/api/auth.ts`
  - `apps/web/src/i18n/locales/zh.ts`
  - `apps/web/package.json`
  - `pnpm-lock.yaml`
- Backend changes are not expected for Passkey naming unless the installed Better Auth client typings differ from current docs.

## Decisions

- Route: `/account`.
- Account management surface: standalone page, not modal/drawer.
- Legacy modal: delete `AccountModal` directly.

## Open Questions

- None.
