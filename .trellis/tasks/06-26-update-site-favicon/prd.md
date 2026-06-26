# 更新网站 favicon

## Goal

将 `apps/web/public/favicon/` 下已有的 favicon 资源接入网站入口，让浏览器标签页、Apple touch icon 和 PWA manifest 使用新的品牌图标与滴茶品牌信息。

## What I Already Know

* 用户希望更新 `apps/web/public/favicon` 作为网站 favicon。
* 当前 `apps/web/index.html` 只有基础 meta/title，没有 favicon、apple touch icon 或 webmanifest 链接。
* `apps/web/public/favicon/` 已存在完整 favicon 包：`favicon.ico`、`favicon.svg`、`favicon-96x96.png`、`apple-touch-icon.png`、`web-app-manifest-192x192.png`、`web-app-manifest-512x512.png`、`site.webmanifest`。
* 当前 `site.webmanifest` 仍是生成器默认名称 `MyWebSite` / `MySite`，需要改为项目品牌信息。

## Requirements

* 在 `apps/web/index.html` 的 `<head>` 中添加 favicon 相关 `<link>` 标签，路径指向 `/favicon/...`。
* 接入 SVG favicon、ICO fallback、96x96 PNG、Apple touch icon 和 webmanifest。
* 更新 `site.webmanifest` 的 `name`、`short_name`，使其符合滴茶网站身份；主题色与背景色保留 favicon 包现有的 `#d6eacd`。
* 保留 `apps/web/public/favicon/` 中现有图标文件，不重新设计或重生成图标。

## Acceptance Criteria

* [x] 浏览器可从 `index.html` 发现 `/favicon/favicon.svg`、`/favicon/favicon.ico`、`/favicon/favicon-96x96.png`、`/favicon/apple-touch-icon.png` 和 `/favicon/site.webmanifest`。
* [x] `site.webmanifest` 不再使用 `MyWebSite` / `MySite` 默认文案。
* [x] Vite build 通过。
* [x] 修改过的文本文件保持 UTF-8 无 BOM + CRLF。

## Definition of Done

* 实现完成并通过质量检查。
* 如有必要，同步更新相关前端规范。
* 工作提交到 git。

## Out of Scope

* 不重新绘制 favicon 图形。
* 不调整应用 UI 或落地页视觉。
* 不新增 PWA service worker 或离线能力。

## Technical Notes

* 入口文件：`apps/web/index.html`。
* favicon 资源目录：`apps/web/public/favicon/`。
* Vite public 目录资源以站点根路径暴露，因此 HTML/manifest 内使用 `/favicon/<file>`。
