# 错误页面设计改造

## Goal

把当前过于简陋的 404 / 500 / root error 页面改造成与滴茶现有设计系统一致、但更有创意和文艺气息的错误体验。错误页不只是提示失败，而是成为“生活 OS 里迷路/失联的小场景”。

## What I already know

* 用户希望 404、500 等错误页面都处理好，风格贴合当前系统设计规范，同时不能太简单。
* 用户给了参考站点：
  * https://www.iyo.ai/404?via=404sdesign
  * https://maxime-ducret.com/404?via=404sdesign
  * https://www.jasonbergh.com/404?via=404sdesign
  * https://www.vap.studio/404?via=404sdesign
* 当前 `apps/web/src/routes/__root.tsx` 只有简单的 `RootPending` / `RootError`。
* 当前 `apps/web/src/router.tsx` 有一个极简 `defaultErrorComponent`。
* 代码里还没有专门的 notFound/defaultNotFound 页面。
* 现有设计语言：暖白柔面哑光、工程纸结构、细线/节点/标尺/条码刻线、中文优先、禁止 emoji。

## Assumptions

* MVP 优先覆盖 web 前端路由层的 404、root error、default error，不改后端 HTTP error response body。
* 错误页面可以复用落地页的工程纸结构语汇，但要比落地页更克制，不做一个新的 marketing page。
* 500 页面不暴露技术堆栈，只给用户可执行的恢复路径。

## Requirements

* 提供统一的错误页面组件，覆盖 404/not found、root error、router default error。
* 404 页面需要有明确创意场景和返回路径，不只是“页面不存在”。
* 500/error 页面需要表达“系统暂时失联”，并提供回首页/刷新/返回等操作。
* 页面视觉必须贴合现有 warm matte + blueprint aesthetic，不使用玻璃拟态、紫色渐变、emoji。
* 页面在登录前后都能独立工作；不依赖 `_app` authenticated layout。
* 移动端和桌面端都不能文字溢出或操作拥挤。

## Acceptance Criteria

* [ ] 未匹配路由展示新的 404 页面。
* [ ] root/default error 展示新的 500-style 页面。
* [ ] 错误页提供至少两个恢复动作：返回首页 / 返回上一页 / 重新加载中按场景选择。
* [ ] 视觉包含有辨识度的原创场景，不是普通居中卡片。
* [ ] 文案中文优先，语气与滴茶一致。
* [ ] `pnpm --filter @dicha/web typecheck` 通过。
* [ ] `pnpm --filter @dicha/web lint` 通过。
* [ ] `pnpm --filter @dicha/web build` 通过。
* [ ] Vite dev module graph 可加载相关页面模块。

## Out of Scope

* 后端 404/500 JSON 响应格式。
* 多语言英文 locale。
* 引入新的大体积视觉/动画依赖。
* 专门为参考站点做像素级复刻。

## Technical Notes

* Likely files:
  * `apps/web/src/routes/__root.tsx`
  * `apps/web/src/router.tsx`
  * `apps/web/src/i18n/locales/zh.ts`
  * possibly `apps/web/src/components/ErrorStateScene.tsx`
* 需要确认 TanStack Router 当前版本的 `notFoundComponent` / `defaultNotFoundComponent` 接入方式。
* 参考方向不是照搬，而是吸收：空白对话、迷路关卡、坐标尺/作品集式结构、studio 气质。

## Design Directions To Confirm

### Approach A: 迷路房间 / Lost Room（推荐）

把 404 做成“房间索引里丢失的一页”：工程纸上有房间剖面、断开的路径线、散落标签和一个缺失编号。500 则是“房间灯暂时灭了”：同一套结构，但线条断续、状态读数归零。优点是最贴合滴茶“生活 OS / 房间 / 物品”的世界观。

### Approach B: 档案台账 / Missing Ledger

把错误页做成一张未能归档的台账：大号 404/500 像档案编号，周围是索引卡、缺页孔、校验失败标记。优点是极简、很设计；缺点是生活感稍弱。

### Approach C: 小型互动关卡

做一个轻微交互场景，例如鼠标移动时路径线/节点微微响应。优点是更有记忆点；缺点是实现成本和移动端调试成本更高。
