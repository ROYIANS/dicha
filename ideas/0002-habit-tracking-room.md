# 0002 · 习惯跟踪并入 vidorra（来自旧 wabi 项目）

**状态**：🤔 思考中 · v2 候选
**提出**：2026-06-04，ROYIANS（"这个功能我也想做到我们这个项目里"）

## 背景

- ROYIANS 之前有个习惯跟踪 dev 项目 **wabi**（dev 库 `wabi` 里曾有这些表，2026-06-04 已被清空重建为 vidorra）：
  `ExerciseLog / HabitLog / HabitTemplate / Moment / MoodRecord / WeightRecord / ScheduleItem / ScheduleAdjustment / PushSubscription / RefreshToken / User`
- 想把习惯跟踪能力并进 vidorra。

## 契合点

- vidorra 的架构天然支持："**房间 = 独立功能模块**"。习惯跟踪可作为一个新房间，如「习惯墙」/「打卡角」/「日课房」，与衣橱、书房平级，独立 NestJS module + 独立 2.5D 场景。
- vidorra 已有 **Event 表 + 互动打卡 + 落灰/时间感** 机制——习惯的"连续打卡 / 断签"与"物品落灰"是同一套时间感语言，可复用。
- 情绪上也合：习惯的坚持与遗忘，和"物品被冷落"是同一种温柔叙事（不内疚提醒，铁律 #6）。

## 张力（要想清楚）

- vidorra 当前定位是「**个人物品**管理 OS」。习惯**不是物品**——硬塞进来可能稀释定位。
- 是「同一个产品的一个房间」还是「两个独立产品共用引擎」？这决定信息架构。
- 习惯跟踪常需 **push 提醒**，而铁律 #6/前端 spec 明确"不发内疚提醒、MVP 不上 push"——要重新设计成 vidorra 式的"不勒索"的习惯陪伴。

## 待决策

- [ ] 习惯 = vidorra 的一个房间，还是平行产品？
- [ ] 数据模型如何复用 Event / 时间感系统
- [ ] 习惯的"提醒"如何符合 vidorra 灵魂（不内疚、不强制回流）
- [ ] 旧 wabi 的哪些字段值得借鉴（MoodRecord 情绪记录 / WeightRecord 等）

## 与铁律的关系

- ⚠️ **铁律 #1：6 个月内别加新 idea。** 这是明确的 v2+ 候选，**M1–M3 不碰**。
- 记录在此，等 v1.0 发布、三个房间（衣橱/书房/杂物间）跑顺后再认真评估。
- 可顺带回写进 plan.md「v2+ 路线图」清单。
