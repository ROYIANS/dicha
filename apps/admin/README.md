# dicha Admin

Independent super-admin frontend for `admin.<domain>`.

## Local Development

```bash
/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm --filter @dicha/admin dev
```

The dev server uses port `5174` and proxies `/api/*` to `http://localhost:3000`.
The API must set `DICHA_SUPER_ADMIN_EMAILS` for any user to enter the admin
shell.

## Deployment

`docker/Dockerfile.admin` builds the static Vite app and serves it with the
same nginx reverse proxy shape as `apps/web`.

`docker-compose.yml` exposes the admin container on `ADMIN_PORT` (`8081` by
default). Production should route `admin.<domain>` to this admin container,
while `/api/*` continues to proxy to the same `apps/api` service.

Do not add any `VITE_*` variable that contains the super-admin email list. The
browser only consumes `UserDto.isSuperAdmin` from `/api/account/me`.
