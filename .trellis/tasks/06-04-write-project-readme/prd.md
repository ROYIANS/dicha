# Write Project README

## Goal

为 `github.com/ROYIANS/easylife-os` 写一份 README.md，作为仓库的"门面"。greenfield 阶段（M1 Week 1 之前），README 承担 **manifesto + roadmap** 双重角色，不是 install/usage 模板套话。

---

## Decisions (locked 2026-06-04)

1. **语调**：Manifesto 浓度高（aesthetic-first，开头就诗）。以 plan.md 末尾"为什么不是 Notion / 动森 / Stardew / Replika 是皮卡堂"那段为语调基线。
2. **语言**：中文为主（完整 manifesto）+ 文末 5-10 行英文 elevator pitch。不拆双文件。
3. **CONTRIBUTING.md**：本轮不写，README 末尾注明"Contribution guide 在 M1 Week 12 真代码跑起来后补"。符合"不做半成品"铁律。
4. **截图**：用 ASCII 房间剖面 + palette ramp 文字框占位，注明 "M2 sprite 上线后替换"。不放假图。
5. **商业策略暴露度**：只写"全开源 + 永远不会变质 + 自托管一键 docker compose"。AI 积分付费 / 创意市集 / 房间细节藏在 plan.md。

---

## Requirements

### README.md 必含章节

1. **标题 + tagline** — `vidorra · 安逸生活 · Your cozy pocket`
2. **状态条** — `pre-alpha · 设计完成 · v1.0 预计 2027 早春`
3. **一句话 elevator pitch** — 30 秒抓眼球
4. **它不是什么** — 用 vidorra 自己的语言定义反面（不是清单工具 / 不是无菌可爱 / 不是注意力经济 / 不是情绪代理）。**不点名其他游戏或产品**（见 feedback_external_copy_no_namedrop）
5. **它是什么** — 一段诗化描述 + 4 个核心机制速览（录入即装饰 / 物品有诗 / 落灰 / 齐默默作者在场）
6. **空间速览** — ASCII 房间剖面占位（衣橱 / 书房 / 杂物间）
7. **路线图** — M1 / M2 / M3 三个里程碑摘要 + 链 plan.md
8. **技术栈** — NestJS + Prisma + Postgres / Pure React + Vite + TanStack + PixiJS / Python image worker / Casdoor / Docker compose（一句话块）
9. **开源承诺** — MIT、永不变质、无 Enterprise tier、自托管
10. **参与** — Discussions / Issues 链接，明示"contribution guide 待 M1 末补"
11. **致谢/灵感** — **不点名其他作品**，改写一句"vidorra 站在很多温柔作品的肩膀上，但它要长成自己的样子"或直接删除本节
12. **License** — MIT, © 2026 ROYIANS
13. **English summary** — 文末折叠或独立小节，5-10 行 elevator pitch + 链 plan.md（同样不点名其他作品）

### 配套文件

- **LICENSE** — 标准 MIT，© 2026 ROYIANS
- **不写** CONTRIBUTING.md（本轮）

### 仓库元数据建议（手动填，不在代码里）

PR 描述里提供给 ROYIANS：
- GitHub repo description: `vidorra · 像素风 2.5D 个人物品管理 OS · Your cozy pocket`
- Website: 留空（或填 vidorra.life，如果域名已注册）
- Topics: `pixel-art`, `cozy`, `nestjs`, `react`, `pixijs`, `self-hosted`, `personal-os`

---

## Acceptance Criteria

- [ ] README.md 落地，commit + push 到 main
- [ ] LICENSE (MIT) 落地
- [ ] 访客 30 秒能感受到情感北极星，不需要读 plan.md
- [ ] 不出现"咖啡厅 / 治愈 / 安逸"等无设计支撑的空泛词
- [ ] 不撒谎说"已支持 X"——pre-alpha 状态明示
- [ ] 不写 install / quickstart（无代码可装）
- [ ] 不放假截图
- [ ] 链接到 plan.md、discuss.md 引导深度阅读
- [ ] 末尾英文 elevator pitch 5-10 行，能让国际访客判断是否继续

## Definition of Done

- README.md + LICENSE commit + push 到 main
- 仓库 description / topics 建议值在 commit message 或本 PRD 中列出供 ROYIANS 手动填
- 本任务在 Trellis 中 `finish` + `archive`

## Out of Scope

- 截图 / GIF / 视频 demo
- install / quickstart 章节
- 详细 API doc / 架构图（plan.md 已覆盖）
- CONTRIBUTING.md（M1 Week 12 后补）
- 中英双 README 文件（只单文件中文 + 英文摘要）
- AI 积分定价 / 创意市集详细机制（plan.md 已覆盖）
- 中英文国际化营销

## Technical Approach

**单文件 README.md，结构如下**：

```
[Title + Tagline]
[Status badge line: pre-alpha · v1.0 早春 2027]
[Elevator pitch 一句话]

---

## 它不是什么
[manifesto 段：why not Notion/动森/Stardew/Replika，是皮卡堂]

## 它是什么
[诗化描述 + 4 个机制速览]

## 房间速览
[ASCII 占位，标 "M2 sprite 上线后替换"]

## 路线图
[M1/M2/M3 三段 + 链 plan.md]

## 技术栈
[一句话块]

## 开源承诺
[MIT / 永不变质 / 自托管]

## 参与
[Discussions / Issues / "contribution guide M1 后补"]

## 致谢
[皮卡堂 / Spiritfarer / 落水山庄 / Stardew / 早期豆瓣]

## License
[MIT © 2026 ROYIANS]

---

<details>
<summary>English (elevator pitch)</summary>
[5-10 lines + 链 plan.md]
</details>
```

**LICENSE**: 标准 MIT 模板，© 2026 ROYIANS。

## Decision (ADR-lite)

**Context**: greenfield 仓库要 README，但没代码可文档化。
**Decision**: 走 manifesto-first 路线，借 plan.md 的语调，不写 install。中文主 + 英文 mini 摘要。CONTRIBUTING 后补。
**Consequences**:
- ✅ 仓库门面与 vidorra 灵魂一致，吸引"诗的访客"而非"工具评估者"
- ✅ 不会因为加 install / 假截图而违反"不做半成品"铁律
- ⚠️ GitHub Trending / HN 等国际渠道发现路径稍弱（英文摘要可缓解）
- ⚠️ M2 sprite 上线后需要回来补真图，到时一并补 CONTRIBUTING.md

## Technical Notes

- 现有可链文档：`plan.md`、`discuss.md`、`AGENTS.md`、`.trellis/spec/`
- plan.md 第十二节"最后"是天然语调源
- discuss.md 不在 README 直接引用（太长），但可链
- 仓库 default branch = main（已设）
- 仓库现 public、proxy 已配（127.0.0.1:7890）
- 不放 CI / coverage / build badge（都是空的，硬塞会假）

## Files to Create

- `D:\Code\Study\vidorra-life\README.md`
- `D:\Code\Study\vidorra-life\LICENSE`
