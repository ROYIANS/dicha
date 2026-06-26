# 落地页发布前体检

## Goal

对落地页做一次发布前的小体检：覆盖关键视口的视觉稳定性、浏览器 head/favicon/meta 基础信息，以及最近改动过的 footer wordmark 区域。目标是把明显的小瑕疵收掉，而不是重新设计页面或开启新产品功能。

## Requirements

* 使用本地 Vite dev server 检查落地页在移动端与桌面端的首屏、关键内容段和 footer。
* 检查 `apps/web/index.html` 的基础 head 信息，补齐必要的 `description` / Open Graph / Twitter card 等发布基础 meta。
* 确认 favicon 与 manifest 资源能在 dev server 下正常加载。
* 只修复体检中发现的低风险小问题；不调整落地页整体信息架构和视觉语言。

## Acceptance Criteria

* [x] 至少检查一个移动视口和一个桌面视口的落地页截图。
* [x] footer logo wordmark 在检查视口中不过大、不挤压 footer 布局。
* [x] `index.html` 有基础 SEO/social preview meta，且与滴茶品牌一致。
* [x] favicon / manifest 路径在 dev server 下返回 200。
* [x] Vite build 通过。
* [x] 修改过的文本文件保持 UTF-8 无 BOM + CRLF。

## Definition of Done

* 实现完成并通过质量检查。
* 如有必要，同步更新相关前端规范。
* 工作提交到 git。

## Out of Scope

* 不重做 landing 视觉风格或布局系统。
* 不新增产品功能、登录流程或房间数据逻辑。
* 不新增 service worker / PWA 离线能力。
* 不重新生成 favicon 图形。

## Technical Notes

* 入口文件：`apps/web/index.html`。
* 主要页面：`apps/web/src/routes/index.tsx`。
* 主要样式：`apps/web/src/index.css`。
* favicon 资源：`apps/web/public/favicon/`。
* 本任务优先用截图和 dev server 实际请求确认，不只依赖 production build。
