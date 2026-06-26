# Footer Wordmark 使用 Logo SVG

## Goal

将落地页 footer 底部 `lp-footer-wordmark` 装饰区域从「滴茶」文字改为项目现有 logo SVG，保持原有 footer 装饰带、斜纹、刻线、裁切和低透明品牌氛围。

## Requirements

* `FooterBand` 不再渲染「滴茶」两个字作为 wordmark。
* 使用现有 `BrandMark` / `/assets/logo.svg` 作为该区域的视觉主体，避免复制 SVG 或新增图片入口。
* 保持 `lp-footer-wordmark` 作为该区域的样式入口，继续服务大尺寸、低透明、不可选中、响应式裁切。
* 不改变 footer 其他品牌区、链接区、rail、斜纹和节点结构。

## Acceptance Criteria

* [x] 落地页 footer 底部装饰区域显示 logo mark，而不是「滴茶」文字。
* [x] logo 在移动端和桌面端都有稳定尺寸，不挤压 footer 布局。
* [x] 仍使用现有 `BrandMark` 组件，符合品牌图形复用规范。
* [x] 前端 lint / typecheck / build 通过。

## Definition of Done

* 实现完成并通过质量检查。
* 如有必要，同步更新相关前端规范。
* 工作提交到 git。

## Out of Scope

* 不重新设计 footer 布局。
* 不修改 logo SVG 文件本身。
* 不调整页面其他位置的品牌标识。

## Technical Notes

* 现有实现：`apps/web/src/routes/index.tsx` 的 `FooterBand` 内部使用 `<span className="lp-footer-wordmark">滴茶</span>`。
* 品牌图形复用入口：`apps/web/src/components/AppBrand.tsx` 导出的 `BrandMark`，通过 CSS mask 使用 `/assets/logo.svg`。
* 样式入口：`apps/web/src/index.css` 的 `.lp-footer-wordmark`。
