# 启用 Express trust proxy 修复反向代理后 Cookie 问题

## Goal

在 NestJS 启动时启用 Express 的 `trust proxy` 设置，让应用正确识别反向代理后的 HTTPS 协议，修复生产环境 session cookie 无法被浏览器接受的问题。

## What I already know

### 问题现象（生产环境）
* 即使修复了 Docker Nginx 的 `X-Forwarded-Proto` 透传，session 仍然在 login 和 callback 间丢失
* Login session ID: `zQzojiAA4aISoB92H6u8S6La-piKc4Eq`
* Callback session ID: `AShALgWsXceUnBZQLz5qW1aaTpulNcO6`（完全不同）
* 说明 Cookie 根本没被浏览器保留/发送

### 根本原因
**Express 默认不信任反向代理的 `X-Forwarded-*` 头**。

调用链：
```
外部 Nginx → X-Forwarded-Proto: https
   ↓
Docker Nginx → X-Forwarded-Proto: https (已修复透传)
   ↓
NestJS/Express → trust proxy = false (默认) ❌
               → req.protocol 还是 'http'
               → Cookie {secure: true} + protocol 'http' 
               → 浏览器拒绝接受 Cookie
```

### 涉及代码
* `apps/api/src/main.ts:40` - Cookie 配置 `secure: process.env.NODE_ENV === 'production'`
* `apps/api/src/main.ts:13-17` - NestJS 初始化，需要在这里添加 `app.set('trust proxy', true)`

### Express trust proxy 文档
当应用运行在反向代理后（Nginx、HAProxy、AWS ELB 等）：
- `trust proxy: true` → Express 信任所有代理，从 `X-Forwarded-*` 头读取原始协议/IP
- `req.protocol` 会正确返回 `https`（从 `X-Forwarded-Proto` 读取）
- `secure: true` 的 Cookie 可以正常工作

## Requirements

* 在 `main.ts` 的 `app.setGlobalPrefix('api')` 之后添加 `app.set('trust proxy', true)`
* 不修改 Cookie 配置（现有配置正确）
* 不修改 Nginx 配置（已在前一个任务中修复）

## Acceptance Criteria

* [ ] `main.ts` 添加 `app.set('trust proxy', true)`
* [ ] 本地验证编译通过
* [ ] 生产环境部署后，login 和 callback 的 session ID 保持一致
* [ ] Casdoor OIDC 回调成功

## Definition of Done

* 代码修改完成并 commit
* 生产环境验证通过

## Out of Scope

* 不修改 session/cookie 配置
* 不修改 Nginx 配置
* 不添加其他 Express 中间件

## Technical Notes

### 修改位置
`apps/api/src/main.ts` 第 17 行后：

```typescript
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.set('trust proxy', true);  // <-- 添加这一行
  
  const config = app.get(ConfigService);
  // ... rest of the code
}
```

### Why this fixes the issue
1. Express 读取 `X-Forwarded-Proto: https`
2. `req.protocol` 返回 `'https'`（而非默认的 `'http'`）
3. Session 中间件设置 Cookie 时，浏览器识别为 HTTPS 来源
4. `secure: true` 的 Cookie 被浏览器接受并在后续请求中发送
5. Callback 时 session ID 保持一致

### 相关 commits
* `60f23ee` - 修复 Docker Nginx X-Forwarded-Proto 透传（前置条件）
* `25ea009` - 设置 cookie domain 为 `.vidorra.life`
