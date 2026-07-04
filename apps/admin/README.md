# dicha Admin

Independent super-admin frontend for `admin.<domain>`.

## Local Development

```bash
/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm --filter @dicha/admin dev
```

The dev server uses port `5174` and proxies `/api/*` to `http://localhost:3000`.
The API must set `DICHA_SUPER_ADMIN_EMAILS` for any user to enter the admin
shell.

When testing Passkey or GitHub login from the admin app, the API should also
know the admin browser origin:

```bash
DICHA_WEB_ORIGIN=http://localhost:5173
DICHA_ADMIN_ORIGIN=http://localhost:5174
# Production only, when the root domain is not the default dicha.life:
# DICHA_PASSKEY_RP_ID=example.com
```

## Deployment

`docker/Dockerfile.admin` builds the static Vite app and serves it with the
same nginx reverse proxy shape as `apps/web`.

`docker-compose.yml` exposes the admin container on `ADMIN_PORT` (`8081` by
default). Production should route `admin.<domain>` to this admin container,
while `/api/*` continues to proxy to the same `apps/api` service.

GitHub OAuth keeps a single provider callback URL on the API, for example
`https://api.<domain>/api/auth/callback/github`. The admin login page passes an
absolute admin `callbackURL` to Better Auth so the user returns to the admin
origin after GitHub completes.

Passkey uses the shared root `rpID` and explicit trusted origins. Set
`DICHA_WEB_ORIGIN`, `DICHA_ADMIN_ORIGIN`, and `DICHA_PASSKEY_RP_ID` in
production so both the public app and admin app can initiate WebAuthn
assertions.

Do not add any `VITE_*` variable that contains the super-admin email list. The
browser only consumes `UserDto.isSuperAdmin` from `/api/account/me`.
