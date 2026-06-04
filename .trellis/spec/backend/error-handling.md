# Error Handling

> NestJS exception filters + 业务边界异常。

---

## 原则

1. **永不阻塞用户录入** —— AI / image worker / sticker 生成失败都要 graceful degrade
2. **system boundary 才校验**（用户输入、外部 API），内部代码相信 TypeScript 类型
3. **不为不可能发生的场景写防御代码**

---

## Graceful Degradation 矩阵（关键）

| 场景 | 降级路径 |
|---|---|
| AI 识别失败 | 用户手动输入 |
| AI 贴纸生成失败 | 落到 sticker 库 embedding 匹配 |
| Sticker 库匹配也无 | 用文字占位（item 仍可录入） |
| Image worker 宕机 | 跳过量化 / ramp 映射，原图入库 |
| 用户 AI 积分耗尽 | 切到 sticker 库匹配 + 文字记录 |

---

## TODO（M1 Week 3-6 录入流程落地后回填）

- [ ] 具体的 ExceptionFilter 实现
- [ ] 错误码体系
- [ ] AI 调用层的重试 / 超时策略
- [ ] 前端如何展示降级（不暴露内部错误码）
