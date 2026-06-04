# vidorra

> 安逸生活 · Your cozy pocket

**`pre-alpha · 设计完成 · v1.0 预计 2027 早春`**

---

每件物品 = 一份数据 + 一张 sprite + 一句诗 = **一份重量**。

vidorra 是一个像素风、2.5D 等距视角、承认生活有重量的个人物品管理 OS。
你录入一件衣服，它不会变成清单里第 137 行；它会变成衣橱地板上一块新的颜色，
你的小狗会跑过去看一眼，然后回头看你。

---

## 它不是什么

vidorra 不是一个**冷感清单工具**——它拒绝把你的物品压成行与列。
vidorra 不是一个**注意力经济红点游戏**——它永远不会在你的手机上点亮一颗未读小圆点，告诉你"8 件衣服在等你的注意"。
vidorra 不是**无菌的可爱**——它允许蜘蛛网积下来，允许一本书在书架上落灰三年，允许你删掉一支用空的牙膏而不必先哀悼它。
vidorra 不是**情绪代理**——它不会代替你和你的物品建立关系，它只是把灯打开，把椅子摆好，然后退到旁边。

我们不靠引用别人来立人设。vidorra 想长成自己的样子。

---

## 它是什么

> 安逸 = 录入即装饰，不发红点，不发内疚提醒。
> 安逸 = 系统永远在低声说话，但从不抓你的袖子。
> 安逸 = 你的小窝里有蛛网，也有光。

### 四个核心机制

**1. 录入即装饰**
拍一张照、说一句话、扫一个 ISBN——AI 帮你识别、推荐 sticker、选好房间。
你按下确认，sprite 从屏幕中心飞向它该去的房间，小狗跑过去看一眼。
录入这个动作本身就是奖励。没有打卡，没有签到，没有连续 N 天的焦虑。

**2. 物品有诗**
每一件物品都带一句话。可能是你写的，可能是品类的默认池兜底——
**诗永不为空，vidorra 永远在低声说话**。
诗不会在 hover 时跳出来——它的力量来自稀缺。
它会在详情卡里安静地待着、在角色路过时偶尔被念出、在月报里被引用、
在很久没有被打开的物品上轻轻浮现。

**3. 落灰**
长时间未互动的物品会落上蛛网贴纸。你可以擦掉它（24 小时临时清洁），
也可以让它继续落下去。落灰只发生在物品 sprite 上，不会蔓延到房间，
不会变成扣分项——它只是承认"时间真的过去了"这件事。

**4. 齐默默——作者在场**
齐默默 (Qí Mòmò) 是 vidorra 的引导角色，也是作者 ROYIANS 的化身。
她会出现在 onboarding、版本更新、节日、新功能首次解锁的时刻。
她说的每一句话都由作者本人审过——AI 不替她开口。
你在用一个有人在家的软件。

---

## 房间速览

> 以下是 ASCII 占位剖面，**M2 sprite 上线后替换为真实房间渲染**。
> 现在还没有真图。这一点 vidorra 不撒谎。

```
        ┌──────────────────────────┐
        │   衣 橱  ·  Wardrobe     │
        │                          │
        │   ╔═══╗  ╔═══╗   🧥      │
        │   ║   ║  ║   ║  ╱        │
        │   ║   ║  ║   ║ ╱  季节   │
        │   ╚═══╝  ╚═══╝╱  上次穿  │
        │   ─────────────         │
        │      🐕                  │
        └──────────────────────────┘
        装饰灵魂 · MVP 深度模块
```

```
        ┌──────────────────────────┐
        │   书 房  ·  Library      │
        │                          │
        │   ▤ ▤ ▤ ▤   📖           │
        │   ▤ ▤ ▤ ▤  ╱             │
        │   ▤ ▤ ▤ ▤ ╱  想读 / 在读 │
        │   ────────  已读 / 落灰  │
        │              ✦ 一句诗    │
        └──────────────────────────┘
        内容灵魂 · MVP 深度模块
```

```
        ┌──────────────────────────┐
        │   杂物间 · Storage Room  │
        │                          │
        │   ▣  ▢  ▤   🥄          │
        │   ▢  ▣  ▢                │
        │   ▤  ▢  ▣   兜底一切     │
        │   ─────────             │
        │      🐕  💤              │
        └──────────────────────────┘
        浅模块 · MVP 兜底
```

调色板：**128 色主调色板 · 32 个基色族 · 4 套昼夜 palette 跟随真实时间**。
风格一致性来自代码（rembg 抠白底 → 量化到主 palette → 按 45° 光源 ramp 映射 shade），
温暖感来自调色板设计本身。

---

## 路线图

完整作战计划见 [`plan.md`](./plan.md) 第八节。这里只放骨架：

### M1 「能记录」 · 2026-06 → 2026-08
搭骨架、跑通录入闭环、自己每天用它。
Monorepo + NestJS + Prisma + Postgres + Casdoor，简陋 UI，但**循环必须真的转起来**。
M1 验收：vidorra 在作者自己电脑上活起来，每天用它管理杂物。

### M2 「会说话」 · 2026-09 → 2026-11
主调色板上线、Python image worker（rembg → quantize → ramp）、100 张基础 sticker、
PixiJS v8 像素引擎、落灰系统、角色 + 宠物 sprite。
M2 验收：朋友看一眼就能感受到 vidorra 是个有灵魂的地方。

### M3 「活起来」 · 2026-12 → 2027-02
衣橱深度模块、书房深度模块、齐默默 onboarding 30s ceremony、
昼夜 palette swap、飞行动画、全景视图、性能调到 1000+ sprite 不卡。
**v1.0 预计 2027 早春发布。**

v2+ 候选：冰箱 / 药盒 / 唱片架 / 季节 palette / 诗的考古层 / 纪念角 / 创意市集 / 长期记忆。
详见 [`plan.md`](./plan.md) 第十一节。

---

## 技术栈

```
前端    Pure React · Vite · TanStack Router · TanStack Query · Zustand · PixiJS v8 (@pixi/react)
后端    NestJS · Prisma · Postgres
图像    Python · FastAPI · Pillow · rembg（独立 service）
AI      OpenRouter + 自建 proxy + budget guard（用户级日限额）
Auth    Casdoor（开源、自托管、原生微信支持）
存储    S3 SDK 抽象 · COS+CDN（云端）/ MinIO（自托管）
结构    Monorepo · pnpm workspaces · Turborepo
部署    Docker compose · 单台 VPS · 一键自托管
```

更细的层级规范见 [`.trellis/spec/`](./.trellis/spec/)。

---

## 开源承诺

- **License: MIT** ——商业友好，无 Enterprise Tier，无 Community/Pro 切分。
- **vidorra 永远不会变质** ——所有代码、所有功能、所有 module 全开源，一份代码两种部署。
- **自托管一键 docker compose** ——用户配自己的 AI API key 即可白嫖云端所有 AI 功能。
- **云端版只卖"接入网络的入场券"** ——AI 积分转售、theme/sticker pack、创意市集（v2+）。
  云端版能做的，自托管版本质上都能做。

承诺的反面是：vidorra 不会有"vidorra Pro 解锁高级房间"，不会有"团队版加密"，
不会有"自托管阉割模块"。这些选择都是在仓库创立之初就锁死的，不会因为后期商业压力反悔。

---

## 参与

vidorra 现在是 **pre-alpha**——设计已锁定，但代码还没开始。你能做的：

- 💬 **来 GitHub Discussions 聊设计** ——任何关于产品、美学、机制的讨论都欢迎。
  现在是 vidorra 最柔软的时候，你的看法可能真的会影响 v1.0。
- 🐛 **Issues 暂只收设计层面的问题** ——代码相关的 issue 等 M1 Week 12 之后再开放。
- 🛠️ **Contribution guide** 会在 **M1 Week 12 真代码跑起来之后补**。
  现阶段 PR 暂不开放，因为没有可以贡献的代码骨架。
  vidorra 信奉一条铁律：**部分实现 + 不一致体验 = 比不做更糟**。
  这条铁律也适用于参与流程本身。

深度阅读：
- [`plan.md`](./plan.md) ——开发圣经，所有"做什么 + 怎么做 + 何时做"
- [`discuss.md`](./discuss.md) ——2026-06-04 与 Claude 头脑风暴 15 轮 grill-me 的完整推理过程
- [`AGENTS.md`](./AGENTS.md) ——AI 协作者入口
- [`.trellis/spec/`](./.trellis/spec/) ——分层编码规范

---

## 致谢

vidorra 站在很多温柔作品的肩膀上，但它要长成自己的样子。
具体感谢哪些灵感，等 v1.0 launch 的时候再认真写一封信。

---

## License

[MIT](./LICENSE) © 2026 ROYIANS

---

<details>
<summary><strong>English (elevator pitch)</strong></summary>

**vidorra** is a pixel-art, 2.5D isometric personal-belongings OS that treats your stuff as having weight.

Every item = data + a sprite + a single line of verse. You log a sweater, it doesn't become row 137 of a spreadsheet — it becomes a new patch of color on the wardrobe floor, and the little dog walks over to look at it.

It is **not** a cold checklist tool, **not** an attention-economy game with red-dot guilt, **not** sterile cuteness, **not** an emotional proxy. It lets dust gather. It speaks softly but never tugs your sleeve. The author, Qí Mòmò, lives inside the software.

Status: **pre-alpha**, design locked, code not yet started. v1.0 targeted for **early spring 2027**. MIT licensed, fully open source, one-command self-host via Docker Compose. No Enterprise Tier, ever.

Code-level contributions open after M1 Week 12 (~late August 2026). Design discussions welcome now via GitHub Discussions.

Full master plan (in Chinese): [`plan.md`](./plan.md).

</details>
