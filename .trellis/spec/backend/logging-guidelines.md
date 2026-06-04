# Logging Guidelines

> NestJS Logger。MVP 阶段：本地 stdout，自托管用户用 docker logs。

---

## 必须记录的事件

1. **AI 调用** —— 每次调用记 user / model / token / cost（budget guard 依赖）
2. **Image worker 调用** —— 输入大小 / 处理耗时 / 是否降级
3. **Auth 事件** —— 登录 / 登出 / passkey 注册
4. **Item 生命周期** —— 录入 / 删除（断舍离也要留 audit log）

---

## 禁止记录

- 用户的**诗**内容（隐私边界）
- 用户上传的原始图片内容（仅记元数据：size / mime / 用户 id）
- 完整的 AI prompt 内容（仅记 prompt 模板 id + 参数 hash）

---

## 日志级别

- `error`：影响用户操作的错误（AI 调用最终失败、DB 异常）
- `warn`：降级触发（worker 不可用 → fallback）
- `log`：业务事件（录入完成、登录）
- `debug`：仅开发期，prod 关

---

## TODO（M1 Week 3 真上 AI 调用后回填）

- [ ] 是否引入 Pino / Winston（vs Nest 自带 Logger）
- [ ] 自托管用户的日志清理策略
- [ ] 云端 SaaS 的日志聚合方案
