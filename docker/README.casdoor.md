# Casdoor Self-Hosted Setup

vidorra 使用 Casdoor 作为 OAuth/OIDC 身份提供商。docker-compose 已配置 Casdoor 服务，首次启动后需要手动配置应用。

## 快速开始

1. **启动服务**

   ```bash
   docker compose up -d
   ```

   Casdoor 将运行在 `http://localhost:8000`

2. **首次登录 Casdoor 控制台**

   - 访问 `http://localhost:8000`
   - 默认管理员账号：`admin` / `123`
   - **强烈建议**：登录后立即修改密码（右上角头像 → My Account → Password）

3. **创建应用**

   进入 Casdoor 控制台 → Applications → Add：

   - **Name**: `vidorra`（或任意名称）
   - **Organization**: `built-in`（默认组织）
   - **Redirect URLs**: 添加 `http://localhost:3000/api/auth/callback`（开发环境），生产环境添加实际域名
   - **Token format**: `JWT`
   - **Grant types**: 勾选 `Authorization code`
   - **Enable PKCE**: ✅ 勾选

   保存后，记录：
   - **Client ID**（形如 `abc123...`）
   - **Client secret**（点击 "Show" 查看）

4. **配置 vidorra 环境变量**

   编辑 `.env` 文件，更新以下字段：

   ```bash
   CASDOOR_ENDPOINT=http://localhost:8000
   CASDOOR_CLIENT_ID=<刚创建的应用 Client ID>
   CASDOOR_CLIENT_SECRET=<刚创建的应用 Client secret>
   CASDOOR_ORG=built-in
   CASDOOR_APP=vidorra
   CASDOOR_CALLBACK_URL=http://localhost:3000/api/auth/callback
   ```

5. **重启 API 服务**

   ```bash
   docker compose restart api
   ```

6. **测试登录**

   - 访问 `http://localhost:8080`
   - 未登录时会跳转到 `/login`
   - 点击"使用 Casdoor 登录"，跳转到 Casdoor 授权页
   - 使用 Casdoor 用户登录（可以先在 Casdoor 控制台 → Users 创建测试用户）
   - 授权后回跳到 vidorra，登录成功

## 生产环境部署注意事项

1. **修改默认管理员密码**：首次登录后立即修改 `admin` 账号密码

2. **配置域名**：
   - 更新 `.env` 中的 `CASDOOR_ORIGIN`、`CASDOOR_ENDPOINT`、`CASDOOR_CALLBACK_URL` 为实际域名
   - Casdoor 应用配置中的 Redirect URLs 也要更新为生产域名

3. **HTTPS**：生产环境强烈建议为 Casdoor 和 vidorra 都配置 HTTPS（可通过 nginx/Caddy 反向代理）

4. **备份**：
   - Casdoor 数据存储在 Postgres（与 vidorra 共用数据库，不同 schema）
   - 定期备份 `vidorra-pgdata` volume

## 微信登录配置（可选）

Casdoor 内置微信 OAuth 支持：

1. 在 Casdoor 控制台 → Providers → Add
2. 选择 **WeChat**，填入微信开放平台的 AppID 和 AppSecret
3. 在应用配置中关联该 Provider
4. 用户登录时可选择微信扫码授权

详见 [Casdoor 官方文档 - WeChat Provider](https://casdoor.org/docs/provider/oauth/wechat)

## 故障排查

- **Casdoor 启动失败**：检查 Postgres 是否健康（`docker compose logs postgres`）
- **登录跳转 404**：确认 `.env` 中的 `CASDOOR_CALLBACK_URL` 与 Casdoor 应用配置中的 Redirect URLs 一致
- **授权后返回错误**：检查 `CASDOOR_CLIENT_ID` 和 `CASDOOR_CLIENT_SECRET` 是否正确
- **PKCE 错误**：确认 Casdoor 应用配置中勾选了 "Enable PKCE"

## 参考链接

- [Casdoor 官方文档](https://casdoor.org/docs/overview)
- [Casdoor Docker 部署](https://casdoor.org/docs/basic/server-installation#docker)
