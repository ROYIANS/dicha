# Admin App

> 独立超级管理员前端 `apps/admin`。它复用主系统 Better Auth 身份与 shared contract，但不属于 `apps/web` 的 settings 子页面。

---

## Scenario: Super Admin Management Frontend

### 1. Scope / Trigger

- Trigger: creating or modifying the independent super-admin management UI under `apps/admin`.
- Use this spec for admin-only pages, admin auth routing, admin ts-rest API calls, and admin deployment wiring.

### 2. Signatures

- Package: `apps/admin/package.json`, name `@dicha/admin`.
- Dev port: `5174`.
- Client env: `VITE_API_BASE_URL`, default `/api`.
- Auth source: `api.account.getMe` through `authQueryOptions()`.
- Admin source: `api.admin.*` through query option factories in `apps/admin/src/api/`.
- Route boundary:
  - `/login` independent login page.
  - `/unauthorized` non-admin state.
  - Pathless `/_admin` layout guards `/`, `/basic`, `/system`, `/analytics`.
- Deployment:
  - `docker/Dockerfile.admin`.
  - `docker-compose.yml` service `admin`, external port `ADMIN_PORT` default `8081`.

### 3. Contracts

- `apps/admin` is an independent Vite app, not a route group inside `apps/web`.
- Credentials stay unified: sign-in/out uses Better Auth client, and current profile uses `/api/account/me`.
- Authorization is two-layered:
  - frontend route guard redirects non-admin users away from shell routes.
  - backend admin endpoints must still use `SuperAdminGuard`.
- The frontend must only consume `UserDto.isSuperAdmin`; never expose or parse `DICHA_SUPER_ADMIN_EMAILS` in Vite env.
- Admin API calls must go through `@dicha/shared` ts-rest contract and `queryOptions()` factories so loaders and components share the same definitions.
- Keep first-stage admin UI dense and operational: sidebar + content area, warm matte tokens, no marketing landing page, no fake CRUD.

### 4. Validation & Error Matrix

| Condition | Expected Behavior |
|---|---|
| Anonymous user opens admin app | `/api/account/me` fails and route guard redirects to `/login`. |
| Logged-in ordinary user opens shell route | Route guard redirects to `/unauthorized`. |
| Ordinary user manually calls admin endpoint | API returns `403` through `SuperAdminGuard`. |
| `DICHA_SUPER_ADMIN_EMAILS` missing | No user can enter shell or call admin API. |
| Admin domain deployed | `admin.<domain>` serves admin static assets; `/api/*` proxies to the same API service. |

### 5. Good/Base/Bad Cases

- Good: add a new admin dashboard route as `apps/admin/src/routes/_admin.<name>.tsx`, backed by an `api/admin.ts` query factory.
- Good: keep placeholders honest until a real backend module exists.
- Base: skeleton pages show module intent and safe admin overview data.
- Bad: importing `apps/web` settings pages directly into `apps/admin`.
- Bad: using `VITE_DICHA_SUPER_ADMIN_EMAILS` or hard-coded email checks in React.
- Bad: adding a "system config" page that renders raw server env values.

### 6. Tests Required

- `pnpm --filter @dicha/admin typecheck`
- `pnpm --filter @dicha/admin lint`
- `pnpm --filter @dicha/admin build`
- `pnpm --filter @dicha/shared build` when shared admin contracts change.
- `docker compose config --quiet` when admin compose/Docker wiring changes.
- Manual route check when the API is available: anonymous -> login, ordinary user -> unauthorized, super admin -> shell.

### 7. Wrong vs Correct

#### Wrong

```typescript
const isAdmin = import.meta.env.VITE_DICHA_SUPER_ADMIN_EMAILS.includes(user.email);
```

This leaks privileged configuration into the public browser bundle.

#### Correct

```typescript
const user = await context.queryClient.ensureQueryData(authQueryOptions());
if (!user.isSuperAdmin) {
  throw redirect({ to: '/unauthorized' });
}
```
