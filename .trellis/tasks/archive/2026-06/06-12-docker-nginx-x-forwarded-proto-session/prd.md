# 修复 Docker Nginx X-Forwarded-Proto 覆盖导致 session 丢失

## Goal

修复生产环境 Casdoor OIDC 认证回调时 session 丢失的问题。根因是 Docker 内部 Nginx 的 `proxy_set_header X-Forwarded-Proto $scheme` 覆盖了外部 Nginx 传入的 `https` 协议头，导致 NestJS 认为请求是 HTTP，浏览器拒绝发送 `secure=true` 的 Cookie。

## What I already know

### 问题现象（生产环境）
* 用户点击登录 → 跳转 Casdoor 授权 → 回调时报错 `callback_failed`
* 日志显示 `unexpected "state" response parameter encountered`
* Login 时 session ID 和 callback 时 session ID 不一致
* Login 时 session 包含 `pkceVerifier/nonce/state`，callback 时 session 为空（只有 cookie 元数据）

### 架构链路
```
浏览器 HTTPS → 外部 Nginx (X-Forwarded-Proto: https)
           → HTTP 127.0.0.1:8089 (Docker web 容器)
           → Docker Nginx (proxy_set_header X-Forwarded-Proto $scheme ❌ 覆盖为 http)
           → api:3000 (NestJS 认为 protocol 是 HTTP)
```

### 代码现状
* `docker/nginx.conf:15`: `proxy_set_header X-Forwarded-Proto $scheme;`
  - `$scheme` 在 Docker 内部是 `http`，会覆盖外部传入的 `https`
* `apps/api/src/main.ts:40`: `secure: process.env.NODE_ENV === 'production'`
  - 生产环境 Cookie 设置 `secure=true`，要求 HTTPS
* 外部 Nginx 已正确配置 `proxy_set_header X-Forwarded-Proto https;`

### 本地环境正常的原因
* 本地开发可能直接访问 `http://localhost:8089`，没有外部 HTTPS 层
* 或者 `NODE_ENV` 不是 `production`，Cookie `secure=false`

## Assumptions (temporary)

* 外部 Nginx 配置正确（已确认有 `X-Forwarded-Proto https`）
* 其他 proxy headers（Host, X-Real-IP, X-Forwarded-For）无问题
* 只需修复 `X-Forwarded-Proto` 的透传逻辑

## Open Questions

(已全部解决)

## Requirements

* Docker 内 Nginx 使用 map 兜底策略：外部有 `X-Forwarded-Proto` 时透传，否则回退到 `$scheme`
* 保证生产环境（外部 HTTPS → 内部 HTTP）时，NestJS 能正确识别原始协议为 HTTPS
* 兼容本地开发场景（直接访问 8089 端口，无外部 Nginx）

## Acceptance Criteria (evolving)

* [ ] 修改 `docker/nginx.conf` 的 `X-Forwarded-Proto` 设置
* [ ] 本地 `./deploy.sh` 测试登录流程通过（如果本地有外部 Nginx 模拟）
* [ ] 生产环境部署后，Casdoor 回调成功，session 保持一致

## Definition of Done (team quality bar)

* 代码修改完成并 commit
* 本地 docker-compose 验证（可选，取决于是否有外部 Nginx）
* 生产环境验证通过
* 如需要，更新 `.env.example` 或部署文档中的相关说明

## Out of Scope (explicit)

* 不修改外部 Nginx 配置（已确认正确）
* 不修改 NestJS session/cookie 配置（当前配置正确）
* 不处理其他可能的 proxy header 问题（X-Real-IP, X-Forwarded-For 等）

## Technical Notes

### 涉及文件
* `docker/nginx.conf` (第 15 行)

### 选定方案：map 兜底
```nginx
# 在 server 块前添加
map $http_x_forwarded_proto $real_proto {
    default $http_x_forwarded_proto;
    '' $scheme;
}

# 在 location /api/ 内修改
proxy_set_header X-Forwarded-Proto $real_proto;
```

**逻辑**：
- 外部 Nginx 设置了 `X-Forwarded-Proto: https` → 透传 `https`
- 本地开发直接访问（无外部 Nginx）→ 回退到 `$scheme` (http)

**优点**：兼容生产和本地两种场景

### 参考链接
* Nginx 变量文档：`$http_*` 读取请求头，`$scheme` 是当前连接协议
* NestJS Express session 依赖 `req.protocol` 判断（由 Express 的 trust proxy 机制决定）
