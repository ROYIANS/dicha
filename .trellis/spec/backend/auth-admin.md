# Auth And Internal Admin Contract

> Server-derived account profile and internal-only UI access.

---

## Scenario: Super Admin Internal Tool Gate

### 1. Scope / Trigger

- Trigger: adding current-user profile fields, admin-only routes, internal test pages, or environment-based access gates.
- This is a cross-layer contract: `packages/shared` defines the user profile shape; `apps/api` derives privileged flags from server-only env; `apps/web` hides and guards internal UI from ordinary users.

### 2. Signatures

- Server env: `DICHA_SUPER_ADMIN_EMAILS`, optional comma-separated email list.
- Shared DTO: `UserDto.isSuperAdmin` in `packages/shared/src/contracts/auth.contract.ts`.
- Shared contract: `contract.account.getMe` -> `GET /account/me`.
- API endpoint: `GET /api/account/me` implemented under `apps/api/src/modules/auth/auth.controller.ts`.
- Auth source: Better Auth session via `AuthGuard`; sign-in/up/out still live under `/api/auth/*`.
- Web auth source: `authQueryOptions()` in `apps/web/src/api/auth.ts` must call `api.account.getMe`.
- Internal page guard: route `beforeLoad` checks `context.user.isSuperAdmin`.

### 3. Contracts

- Never expose `DICHA_SUPER_ADMIN_EMAILS` through `VITE_*` env variables, route metadata, or frontend bundles.
- `DICHA_SUPER_ADMIN_EMAILS` accepts one email or comma-separated emails. Matching is case-insensitive and trims whitespace.
- The API returns only `isSuperAdmin: boolean`; it must not return the configured email list.
- `/api/account/me` is protected by `AuthGuard` and returns the normalized `UserDto`.
- Do not use `/api/auth/me` for app-owned profile data because `/api/auth/*` is directly handled by Better Auth before Nest contract routes.
- Web route guards and settings navigation must use `UserDto.isSuperAdmin`; do not re-implement email matching in the browser.
- Admin-only pages should be hidden from ordinary users and also blocked by route guard for direct URL entry.

### 4. Validation & Error Matrix

| Condition | Expected Behavior |
|---|---|
| Missing session | `/api/account/me` returns unauthorized via `AuthGuard`; web redirects to `/login`. |
| `DICHA_SUPER_ADMIN_EMAILS` empty or missing | All users receive `isSuperAdmin: false`. |
| User email matches configured list | API returns `isSuperAdmin: true`. |
| User email differs only by case/space from configured entry | API still returns `isSuperAdmin: true`. |
| Ordinary user directly opens admin route | Web redirects to `/settings` or another safe authenticated page. |
| Admin email list accidentally placed in `VITE_*` | Wrong; remove it because Vite exposes it to the browser bundle. |

### 5. Good/Base/Bad Cases

- Good: derive `isSuperAdmin` in `apps/api`, return it through `contract.account.getMe`, and consume that boolean in web navigation/route guards.
- Good: put internal AI test tools under authenticated settings routes and guard them with `beforeLoad`.
- Base: no super-admin env configured in local dev; app behaves as ordinary user for everyone.
- Bad: compare `user.email` against a hard-coded string in a React component.
- Bad: create `/api/auth/me` as a Nest route; Better Auth owns `/api/auth/*`.
- Bad: expose `DICHA_SUPER_ADMIN_EMAILS` as `VITE_DICHA_SUPER_ADMIN_EMAILS`.

### 6. Tests Required

- Shared typecheck covers `UserDto.isSuperAdmin` and `contract.account.getMe`.
- API typecheck/build verifies the auth controller matches the shared ts-rest contract.
- Web typecheck/build verifies `authQueryOptions()` consumes the shared account contract and admin-only routes compile in `routeTree.gen.ts`.
- Focused verification should cover ordinary user hidden nav/direct-route redirect and matching super-admin visibility when feasible.

### 7. Wrong vs Correct

#### Wrong

```typescript
const isAdmin = import.meta.env.VITE_SUPER_ADMIN_EMAIL === user.email;
```

This leaks privileged configuration into the public web bundle.

#### Correct

```typescript
const res = await api.account.getMe();
const user = UserDto.parse(res.body);
if (user.isSuperAdmin) {
  // show internal tools
}
```
