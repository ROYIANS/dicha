# vidorra-life · Master Plan

> 安逸生活 · Your cozy pocket
>
> 这份文档是 2026-06-04 与 Claude 头脑风暴 15 轮 grill-me 的最终凝结。
> 它不是规格说明书，而是开发圣经——所有 idea 的"为什么"都在 [discuss.md](./discuss.md)，这里只放"做什么 + 怎么做 + 何时做"。

---

## 🪟 一、产品定位

**vidorra** 是一个像素风、2.5D 等距视角、**承认生活有重量**的个人物品管理 OS。

- **不是** Notion 那样的冷感清单工具
- **不是** Animal Crossing 那样的无菌可爱
- **是** 皮卡堂 / Spiritfarer / Stardew Valley 路数的**情感容器**
- 物品是数据 + sprite + 一句诗——每一件都有重量

**核心动机的反 Notion 设计：** 录入 = 装饰自己的家。装饰的动作本身就是奖励。

---

## 🧭 二、商业 / 开源策略

| 项 | 选择 |
|---|---|
| **目标用户** | 自用为主 + 喜欢像素风的同好（B 路径）→ 后期开放 SaaS |
| **开源边界** | 100% 全开源（B 路径），云端只卖"接入网络的入场券" |
| **License** | MIT |
| **盈利** | AI 积分转售 + 创意市集（v2+） + theme/sticker pack 销售 |
| **承诺** | vidorra 永远不会变质——所有代码全开源，无 Enterprise Tier |
| **自托管** | 一键 docker compose，用户配自己 API key 即可白嫖云端所有 AI 功能 |

---

## 🎨 三、美学北极星

**画风 = C 中度像素 (Eastward / 星露谷之间)**
- 128 色主调色板，分 ~32 个 "基色族"，每族 3-4 档明度 ramp
- AI 输出 = flat sprite + no shading + no lighting + white bg + isometric
- 代码做：rembg 抠白底 → 量化到主 palette → 按 45° 光源 ramp 映射 shade
- **风格一致性来自代码，温暖感来自 palette ramp 设计**

**调色板系统 (build for L3, ship L1)**
- L1 (MVP): 4 套昼夜 palette，跟随真实时间（动森式）渐变切换
- L2 (v1.x): + 4 套季节 palette
- L3 (v2): theme 市集，用户可装第三方 palette pack

**情感参考 (Emotional Vision)**
- 皮卡堂家具诗 ← 主要 reference
- 落水山庄 / 早期豆瓣 ← brand voice
- Spiritfarer / Cozy Grove ← 玩法情绪
- ❌ NOT Apple "魔法时刻" / NOT 可爱 emoji 轰炸

---

## 🏠 四、空间模型

**架构 = B 全景 + 房间细览**
- 全景视图（首页）：固定 + 轻微视差 + 可缩放
- 房间细览：等距 2.5D 一致，独立 2.5D 场景
- 视觉过渡（v1.x+）：从全景"走入"房间的动画

**房间 = 独立功能模块（不是数据分类）**
- 每个房间由 vidorra 官方品类定制化开发
- 用户在首页摆出"房间 sticker"才解锁该房间入口（A3 扩建机制）
- 房间背景必须原子化（tile 系统），不能是单张大图

**MVP 包含 3 个房间（α 战略）：**
1. **衣橱**（深度）—— vidorra 的"装饰灵魂"
2. **书房**（深度）—— vidorra 的"内容灵魂" + 市集冷启动黄金
3. **杂物间**（浅）—— 兜底

**v2 候选：** 冰箱 / 药盒 / 唱片架 / 厨房 / 工具房 / 美妆台 / 香薰区

---

## 🧬 五、核心机制

### 1. AI 在系统中的四个角色（① + ② + ③ + ④ 全启）

| 角色 | 用途 | 成本量级 |
|---|---|---|
| ① 物品贴纸生成 | 用户从无到有生成 sprite（被 ② 兜底） | 中 |
| ② 识别 + 匹配 | embedding 智能推荐已有 sticker（**优先此路径**） | 低 |
| ③ Onboarding 一次性魔法 | 房屋外观 + 角色 batch 生成 | 单用户一次性 |
| ④ 灵魂 / 陪伴 | 角色对白、月报、周年诗、节气问候 | 极低 |

### 2. 录入流程 (C2 + B2 + D2)

```
用户拍照 / 输入 / ISBN
  ↓
[loading: 角色"让我看看..."]
  ↓
AI 提议卡片（一张）：
  - 识别名称 ✏️
  - 推荐 sticker ✏️ (换一组，默认 2 张，用户可选数量)
  - 目标房间 ✏️
  - 房间特有字段（衣橱: 季节 / 书房: 状态）
  - [确认] 大按钮
  ↓
[飞行动画 0.8s]
  - sprite 从中心飞向房间位置
  - 角色跑过去看，宠物反应
  - 顶栏 +1 气泡 + 经验提示
  - 不阻塞——可立即录下一件
```

**Edge cases:**
- 重复物品：不检查（部分检查比不检查更糟）
- AI 识别错：用户改名（不让 AI 重识别，太奢侈）
- Sticker 不像：再抽一组，默认 2 张，用户可调数量
- 没积分：降级 sticker 库匹配 + 文字记录（永不阻塞）

### 3. 物品的诗（皮卡堂内化）

- 类目级默认池兜底（**诗永不为空，vidorra 永远在低声说话**）
- 用户可 override，可自定义对白
- AI 提议时给 chip：写描述 / 写来历 / 写感受 / 写记录
- **MVP c1 一句，schema 留多句空间；v2 升级"诗的卷轴"**
- 显示时机：详情卡始终 + 角色路过偶尔念出 + 月报引用 + 长时间未访问的浮现
- **明确不在 hover 时显示（诗的力量来自稀缺）**
- 隐私：默认私密，per-item 可分享给好友，**市集不上诗**（伦理边界）
- 用户编辑诗时：旧版自动归档 → v2 "诗的考古层"

### 4. 时间感与落灰

- 互动追踪 = 录入日 + 用户打卡 + 房间事件（衣橱"穿了"、书房"读了"）
- **不**追踪"打开详情卡 = 互动"（会让互动变廉价）
- 视觉表现：sprite 上叠加蜘蛛网贴纸（皮卡堂质感），用户可"擦擦它" 24h 临时清洁
- 落灰**只对物品 sprite，不对房间整体**
- 每类目独立可配置 dust_curve
- 周年纪念：录入日 1 周年，用户主动启动才触发，AI 基于物品诗 + 时间叙事生成专属一句

### 5. 角色 + 宠物（灵魂层）

| 角色 | 用户化身（用户 = 角色，非 NPC） |
|---|---|
| **宠物** | MVP 固定柴犬 + 3-4 毛色变体（palette swap，零成本）|
| **性别** | Onboarding 选基础信息 |
| **性格** | Onboarding 选 1 种 archetype (4-5 种，不做 AI 推断) |
| **对白引擎** | a1 + a2 复合：80% scripted 池 + 20% AI 模板填空 |
| **用户自定义** | **每个物品可由用户写自定义对白**（皮卡堂家具诗机制内化） |
| **MVP 明确不做** | 对话（用户不能"点宠物说话"）→ a3/a4 留 v2 |
| **记忆模型** | MVP "事件流摘要"（最近 30 天注入 system context），v2 embedding |
| **功能影响** | 软推荐，不硬推荐（他们陪伴，不代理） |
| **性格哲学** | 宠物可以伤心生气（QQ宠物式），但**不勒索情绪** |

### 6. 齐默默 (Qí Mòmò) ——作者在场

- ROYIANS 本人化身，引导角色 + 系统 NPC
- 出现在 onboarding / 版本更新 / 节日彩蛋 / 新功能首次解锁
- 对白由 ROYIANS 本人审/写，不自由 AI 生成
- 类似 Toby Fox / ConcernedApe 的开发者-玩家关系

### 7. 物品死亡：g1 直接删除

- 大多数物品（食物、日用品）删除即删除——**断舍离是健康的**
- **v2 加 "🌿 标记为纪念物" 开关 + 纪念角**
- 纪念角符合 "Hidden Discovery" 原则：**从不主动展示，仅角色对白偶尔提及才能进入**

### 8. 货币系统

- 游戏内金币（非 AI 积分，非现实金钱）
- 用于后期 sticker 交易 / 装饰购买
- MVP 仅 schema + 显示，无消费场景

---

## 🚪 六、Onboarding（5 步 + 30s ceremony）

```
[欢迎页] 齐默默：你好，我是齐默默
   ↓
[1] 名字 + 城市（限定中国主要城市 + "其他"文本框）
   ↓
[2] 户型（4-6 种）+ 风格 chip（3-4 种）
   ↓
[3] 捏脸 picker（性别 + 基础信息）+ "用 AI 帮我" 选项
   ↓
[4] 角色性格 archetype（4-5 种）
   ↓
[5] 小窝命名（"幸福小窝" "落水山庄"）
   ↓
[Ceremony 30s] 
   - AI 1 次 batch 生成专属房屋外观 + 角色像素
   - 齐默默对白渐次出现："正在打地基..." "在挂窗帘..."
   - 失败 → fallback 模板（永不阻塞）
   ↓
[Dashboard 第一次]
   - 全景视图（空屋 + 默认家具）
   - 用户可拖拽布置 / 一键 AI 推荐布局
   - 角色 60s 后邀请："要不要试着记一件衣服？"
   - 不强制录入第一件
```

**注册时机：** 先 onboarding 再注册（数据先 localStorage，注册时 upload）→ 转化率高 5-10×

**Auth:** GitHub OAuth + 邮箱 OTP（passwordless）+ Passkey。微信留 v1.x。

---

## 🏗️ 七、技术栈

| 层 | 选型 |
|---|---|
| **前端框架** | Pure React + Vite + TanStack Router + TanStack Query |
| **状态** | Zustand |
| **2.5D 引擎** | PixiJS v8（`@pixi/react` 集成进 React 组件树） |
| **后端** | NestJS + Prisma |
| **数据库** | Postgres |
| **图像处理** | Python (FastAPI) + Pillow + rembg（独立 service） |
| **AI 调用** | 自建 proxy + OpenRouter（含 budget guard + 计费 schema） |
| **Auth** | Casdoor（开源、自托管、原生微信支持） |
| **Storage** | 腾讯云 COS + CDN（云端版） / MinIO（自托管版）—— 代码用 S3 SDK 协议抽象 |
| **i18n** | 中文优先，next-intl 类库装上 |
| **结构** | Monorepo（pnpm workspaces + Turborepo）|
| **部署** | Docker compose 全自托管，一台 VPS |

### Monorepo 结构
```
vidorra-life/
├── apps/
│   ├── web/              # React + Vite + PixiJS
│   ├── api/              # NestJS + Prisma
│   └── image-worker/     # Python FastAPI
├── packages/
│   ├── shared/           # 共享类型 + 协议
│   └── palette/          # 主调色板 + ramp 配置
├── docker-compose.yml
├── BRAND.md              # 主调色板宣言
└── plan.md               # 本文档
```

### NestJS Module 设计（与产品形态对齐）
- `AuthModule` / `UserModule` / `StorageModule` / `AIModule` / `ImageWorkerModule` （shared）
- `StorageRoomModule`（杂物间）—— M1
- `WardrobeModule`（衣橱）—— M3
- `LibraryModule`（书房）—— M3
- `FridgeModule` / `MedicineModule` / `VinylModule` —— v2+

### 关键技术约束
1. **离线录入 v1 不可行**——每次录入依赖 AI 调用（自托管用户配 API key）
2. **AI budget guard day 1 必须装**——用户级日限额 + IP 限流 + 调用前 estimate
3. **Python image worker 是单点故障**——graceful degradation 到"仅 sticker 库匹配"
4. **PixiJS 不为未来 mobile 妥协**——mobile webview 也能跑

---

## 🗓️ 八、6→9 个月作战计划

> 投入：工作之余 + 周末战士 ≈ 15-25h/周
> 时间线 = 6 个月预估 × 1.5 = 9 个月实际

### M1 「能记录」（月 1-3，2026-06 ~ 2026-08）

**目标：自己开始用 vidorra 记录物品**

**Week 1-2 基础架构**
- Monorepo + Docker compose
- NestJS + Prisma + Postgres
- 数据模型 v0: User / Item / Category / Sticker / Poem / Event
- Casdoor 部署 + GitHub OAuth + 邮箱 OTP
- React + Vite + TanStack 跑通

**Week 3-6 核心循环（简陋 UI）**
- 杂物间页面（列表 UI，无 sprite，文字 + tag）
- 录入流程 C2（拍照 / 文字 → AI 识别 → 提议卡片 → 落入）
- AI 调用层：OpenRouter + 自建 proxy + budget guard
- Image worker 占位（暂不实现量化/抠图）
- 用户级日限额 + 月报存档

**Week 7-10 数据基础**
- 类目体系初版（30 个最常见类目）
- 诗系统 schema + UI
- 类目默认诗池占位（GPT 起草 + 自己改）
- 互动事件追踪 + "上次互动 X 天前"
- 金币 schema + 显示

**Week 11-12 自用**
- 自己每天用 vidorra 录物品 ≥ 30 件，找痛点
- 调 AI 识别准确率 + 调诗的 tone
- 重构 + bug fix

**M1 验收：** vidorra 在自己电脑上活起来，每天用它管理杂物。

---

### M2 「会说话」（月 4-6，2026-09 ~ 2026-11）

**目标：vidorra 长成皮卡堂的样子**

**Week 13-14 像素引擎**
- PixiJS v8 + `@pixi/react` 集成
- Sprite atlas + 加载器
- Palette swap fragment shader
- 60fps 房间渲染（占位 sprite）

**Week 15-18 主调色板 + 后处理**
- **🎨 ROYIANS 在 Aseprite 定主 palette（128 色，32 ramps）—— 两周咖啡馆活**
- BRAND.md + palette.json 提交 repo
- Python image worker：rembg → quantize → grid align → ramp 映射 → 输出
- AI prompt 模板（"flat colors, no shading, white bg, isometric"）
- 抽卡机制（默认 2 张可调）

**Week 19-22 Sticker 库（最关键的两周）**
- 手工种 **100 张基础 sticker**（覆盖 30 类目）
- 来源：AI 生成 + 手工筛 + Kenney/Lospec 开源素材辅助
- Description + embedding（OpenAI text-embedding-3-small）
- 智能匹配（embedding 距离）
- "用 sticker / AI 生成" 双路径

**Week 23-24 灵魂**
- 角色 sprite（用户化身）+ 宠物 sprite（柴犬 + 3 色）
- 对白池（a1）+ 模板系统（a2）
- 用户自定义物品对白
- **落灰系统：蜘蛛网贴纸 + 擦除**

**M2 验收：** 朋友看一眼就说"操，这就是皮卡堂的感觉！"

---

### M3 「活起来」（月 7-9，2026-12 ~ 2027-02）

**目标：发布 v1.0**

**Week 25-26 衣橱模块**
- WardrobeModule
- 季节、上次穿、穿着频次字段
- "今天穿了什么" 打卡 UI
- 衣橱细览页（独立 2.5D 场景）

**Week 27-28 书房模块**
- LibraryModule
- 想读/在读/已读 状态
- 阅读进度（手动）
- ISBN 扫码

**Week 29-32 Onboarding + 齐默默**
- 5 步流程 UI
- 齐默默 sprite + 对白
- 户型 + 风格 chip
- 空屋拖拽（基础版）
- AI 一键推荐布局
- 30s ceremony

**Week 33-36 集成 + 发布**
- 昼夜 palette swap（4 套 + 真实时间）
- 飞行动画
- 全景视图 + 视差 + 缩放
- 性能优化（1000+ sprite）
- BRAND.md + README + LICENSE (MIT)
- 部署到 vidorra.life
- v1.0 发布：Twitter / 小红书 / 即刻 / HN
- 写一篇 launch 博客 + 1 段 demo 视频

**vidorra v1.0 预计发布：2027 年早春 🌸**

---

## ⚠️ 九、铁律 (Don't 列表)

刻在墙上：

1. **6 个月内别加新 idea**（市集、冰箱、季节、考古层、纪念角……都忍住）
2. **M1 别上 PixiJS** —— 先验证数据 + 录入流程
3. **M2 别加衣橱/书房** —— 专心做像素引擎 + sticker 库
4. **M3 别推迟发布** —— 截止日就是动力
5. **每周 1 天用 vidorra（不开发只用）** —— 自己不用做出来一定是错的
6. **永远不发"内疚提醒"** —— "8 件衣服在等一个春天" 而非 "你冷落了 8 件衣服"
7. **AI 永不替用户决定** —— 永远是 "AI 建议，用户主导"
8. **市集不上诗** —— 诗是情感，不卖
9. **部分实现 + 不一致体验 = 比不做更糟** —— 砍掉别做半成品
10. **情感性 feature 用"发现"而非"展示"** —— 藏起来让用户偶遇

---

## 📐 十、关键 BRAND 元素清单（待 ROYIANS 创作）

这些是 vidorra 的"基础设施作品"，没有它们不能 ship：

1. **BRAND.md / palette.json** —— 主调色板宣言（M2 Week 15-16 完成）
2. **100 张 MVP sticker** —— 覆盖 30 个常用品类（M2 Week 19-22）
3. **类目默认诗池** —— 30 类目 × 5-10 句 = 150-300 句默认诗（M1 起草，M2 精修）
4. **齐默默 sprite + 对白脚本** —— ~30 句 onboarding 对白（M3）
5. **角色对白池** —— 录入完成 30 句 + 节气 24 节×2 句 + 月报模板 12 句（M2-M3）
6. **房屋户型 + 风格 chip** —— 4-6 种户型 × 3-4 风格（M3 Week 30）
7. **柴犬 sprite 集** —— idle / 跑 / 叫 / 睡 / 看 / 吃 ≈ 50 帧（M2 Week 23）
8. **Launch 博客 + Demo 视频** —— 发布物料（M3 Week 36）

---

## 🌱 十一、v2+ 路线图（不在 MVP，留作未来）

按优先级：
1. 冰箱（v2 first，需 mobile push 配套）
2. 季节 palette (L2)
3. 多句诗 + 诗的考古层
4. 纪念角（hidden discovery）
5. 创意市集（palette pack / sticker pack / room theme pack）
6. AI 对话 (a3/a4) + embedding 长期记忆
7. 唱片架（接流媒体）
8. 药盒（需医疗免责声明）
9. 多设备同步
10. iOS 原生 App（Tauri 桌面 / React Native）
11. 家庭共享 vidorra

---

## 💌 十二、最后

vidorra 是一个 idea 的胜利——它的每一笔设计都来自具体的判断：

- 为什么不是 Notion？因为录入要是仪式
- 为什么不是动森？因为生活有重量
- 为什么不是 Stardew？因为不要虚拟时间
- 为什么不是 Replika？因为伤心不等于操控
- 为什么是皮卡堂？因为"外婆不吃糖，但是糖果罐总是满满的"

**做下去。**

---

*Last updated: 2026-06-04 · grill-me 会话产物 · 见 [discuss.md](./discuss.md) 完整推理过程*
