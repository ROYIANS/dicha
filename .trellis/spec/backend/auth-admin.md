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

| Condition                                                   | Expected Behavior                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Missing session                                             | `/api/account/me` returns unauthorized via `AuthGuard`; web redirects to `/login`. |
| `DICHA_SUPER_ADMIN_EMAILS` empty or missing                 | All users receive `isSuperAdmin: false`.                                           |
| User email matches configured list                          | API returns `isSuperAdmin: true`.                                                  |
| User email differs only by case/space from configured entry | API still returns `isSuperAdmin: true`.                                            |
| Ordinary user directly opens admin route                    | Web redirects to `/settings` or another safe authenticated page.                   |
| Admin email list accidentally placed in `VITE_*`            | Wrong; remove it because Vite exposes it to the browser bundle.                    |

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

## Scenario: Super Admin Management API Boundary

### 1. Scope / Trigger

- Trigger: adding or modifying `/api/admin/*` endpoints for the independent `apps/admin` management frontend.
- This is a server-side authorization boundary, not just a frontend navigation gate.

### 2. Signatures

- Shared contract: `packages/shared/src/contracts/admin.contract.ts`.
- Root contract namespace: `contract.admin.*`.
- Initial endpoint: `GET /admin/overview` via Nest global prefix -> `GET /api/admin/overview`.
- API module: `apps/api/src/modules/admin/admin.module.ts`.
- Controller guard order: `@UseGuards(AuthGuard, SuperAdminGuard)`.
- Guard source: `apps/api/src/modules/auth/super-admin.guard.ts`.
- Email parser source: `apps/api/src/modules/auth/super-admin.ts`.

### 3. Contracts

- `SuperAdminGuard` must run after `AuthGuard` so it checks the authenticated Better Auth session user.
- Super-admin matching uses only server env `DICHA_SUPER_ADMIN_EMAILS`; browser bundles must never receive that list.
- Shared responses may include safe user identity fields and operational summaries, but must not include secrets, raw env values, API keys, or the configured admin email list.
- Frontend calls admin data through `api.admin.*`; do not add ad-hoc `fetch('/api/admin/...')` calls in React components.

### 4. Validation & Error Matrix

| Condition                                  | Expected Behavior                                                 |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Missing session                            | `AuthGuard` returns unauthorized before admin logic runs.         |
| Authenticated non-admin user               | `SuperAdminGuard` throws `403 Forbidden`.                         |
| Empty `DICHA_SUPER_ADMIN_EMAILS`           | All users fail admin API authorization.                           |
| Matching email with case/space differences | Authorization succeeds after normalization.                       |
| Frontend hides admin UI only               | Insufficient; backend endpoint must still reject non-admin calls. |

### 5. Good/Base/Bad Cases

- Good: define a new admin route in `admin.contract.ts`, implement it in `apps/api/src/modules/admin`, and guard it with both auth guards.
- Base: `GET /api/admin/overview` returns a non-secret skeleton payload for the admin shell.
- Bad: relying on `UserDto.isSuperAdmin` in the browser while leaving `/api/admin/*` protected only by `AuthGuard`.
- Bad: returning raw environment/config values to support a future "system settings" page.

### 6. Tests Required

- `pnpm --filter @dicha/shared build`
- `pnpm --filter @dicha/api typecheck`
- `pnpm --filter @dicha/api lint`
- `pnpm --filter @dicha/api build`
- Manual/API verification when possible: anonymous request -> unauthorized, ordinary session -> 403, configured admin session -> 200.

### 7. Wrong vs Correct

#### Wrong

```typescript
@UseGuards(AuthGuard)
export class AdminController {}
```

This authenticates the user but does not enforce the super-admin boundary.

#### Correct

```typescript
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {}
```

## Scenario: Super Admin User Management API

### 1. Scope / Trigger

- Trigger: adding or modifying read-only user-management endpoints under `/api/admin/users`.
- This is a cross-layer contract used by `apps/admin` through `contract.admin.*`.

### 2. Signatures

- Shared contract:
  - `contract.admin.listUsers` -> `GET /admin/users`
  - `contract.admin.getUser` -> `GET /admin/users/:id`
- Runtime paths:
  - `GET /api/admin/users?page=1&pageSize=20&search=<text>`
  - `GET /api/admin/users/:id`
- Backend implementation:
  - `apps/api/src/modules/admin/admin.controller.ts`
  - `apps/api/src/modules/admin/admin.service.ts`
- Frontend query factories:
  - `adminUsersQueryOptions(query)`
  - `adminUserDetailQueryOptions(id)`

### 3. Contracts

- All user-management endpoints must keep `@UseGuards(AuthGuard, SuperAdminGuard)` on the admin controller.
- `listUsers` supports `page`, `pageSize` max `50`, and optional trimmed `search`.
- `listUsers` returns pagination metadata plus `AdminUserSummary[]`.
- `getUser` returns `AdminUserDetail` or `{ message }` with `404`.
- Safe user-management fields include identity/profile fields, login/auth counts, dates, provider ids, session IP/user-agent, and token expiry timestamps.
- User-management responses must not include user content/activity data such as item lists, event lists, drawing/artwork records, or per-user content counts unless a later PRD explicitly adds an audited privacy review.
- Responses must not include Better Auth/OAuth secrets or passkey material: `token`, `accessToken`, `refreshToken`, `idToken`, `password`, `publicKey`, `credentialID`.
- First version is read-only. Do not add ban/delete/edit/reset operations without a new PRD and audit/confirmation design.

### 4. Validation & Error Matrix

| Condition                                      | Expected Behavior                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Anonymous request                              | Rejected by `AuthGuard`.                                                         |
| Authenticated ordinary user                    | Rejected by `SuperAdminGuard` with `403`.                                        |
| `pageSize > 50` or invalid query               | Rejected by shared zod/ts-rest validation.                                       |
| User id does not exist                         | `GET /api/admin/users/:id` returns `404` with `{ message }`.                     |
| Account/passkey records contain secret columns | Service `select` excludes those columns before response mapping.                 |
| User has items/events/artwork                  | User-management detail does not return those content/activity records or counts. |

### 5. Good/Base/Bad Cases

- Good: expose login/auth counts and recent session summaries using explicit Prisma `select`.
- Good: use `api.admin.*` query factories from the admin frontend.
- Base: show a read-only detail panel with safe account/session/passkey summaries.
- Bad: showing user content/activity counts in the account-management detail panel.
- Bad: returning full `account` or `passkey` records from Prisma.
- Bad: adding destructive user actions to the first read-only management slice.

### 6. Tests Required

- `pnpm --filter @dicha/shared build`
- `pnpm --filter @dicha/api typecheck`
- `pnpm --filter @dicha/api lint`
- `pnpm --filter @dicha/api build`
- `pnpm --filter @dicha/admin typecheck`
- `pnpm --filter @dicha/admin lint`
- `pnpm --filter @dicha/admin build`
- Sensitive-field scan for admin user responses should only allow expiry metadata, not secret token values.

### 7. Wrong vs Correct

#### Wrong

```typescript
const user = await prisma.user.findUnique({
  where: { id },
  include: { accounts: true, passkeys: true, sessions: true },
});
```

This can expose token and WebAuthn credential material.

#### Correct

```typescript
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    accounts: { select: { id: true, providerId: true, createdAt: true } },
    passkeys: { select: { id: true, name: true, deviceType: true } },
  },
});
```

## Scenario: Super Admin User Security And Audit Logs

### 1. Scope / Trigger

- Trigger: adding or modifying user status operations, session revocation, admin audit log storage, role/permission summaries, or admin write-operation tracing.
- This is a cross-layer contract: Prisma stores user security state and audit rows; `packages/shared` defines admin DTOs; `apps/api` enforces disabled-account access and writes audit logs; `apps/admin` displays user security actions, lightweight permissions, and audit logs.

### 2. Signatures

- Prisma fields:
  - `User.status: "active" | "disabled"` stored as string.
  - `User.disabledAt`, `disabledReason`, `disabledById`.
  - `AdminAuditLog(actorId, actorEmail, actorName, action, resourceType, resourceId, result, ipAddress, userAgent, summary, metadata, createdAt)`.
- Shared contract:
  - `contract.admin.updateUserStatus` -> `POST /admin/users/:id/status`.
  - `contract.admin.revokeUserSessions` -> `POST /admin/users/:id/revoke-sessions`.
  - `contract.admin.getPermissionSummary` -> `GET /admin/permissions`.
  - `contract.admin.listAuditLogs` -> `GET /admin/audit-logs`.
- Runtime paths use the Nest global prefix:
  - `POST /api/admin/users/:id/status`.
  - `POST /api/admin/users/:id/revoke-sessions`.
  - `GET /api/admin/permissions`.
  - `GET /api/admin/audit-logs`.

### 3. Contracts

- All endpoints stay behind `@UseGuards(AuthGuard, SuperAdminGuard)`.
- `AuthGuard` must reject disabled users after Better Auth session lookup by checking `User.status`.
- Disabling a user must revoke that user's existing sessions. Re-enabling does not recreate sessions.
- A super admin must not be able to disable their own current account.
- User-management responses may include `status`, disabled metadata, recent-session timestamp, and active-session count.
- Audit logs are append-only operational records. Do not update old audit rows to hide or rewrite an operation.
- Audit rows may store safe summaries and scalar metadata only. Never store raw request bodies, API keys, OAuth tokens, Better Auth session tokens, passkey `publicKey`/`credentialID`, decrypted credentials, prompts, response bodies, or user content/activity payloads.
- Admin write operations that mutate users, credits, AI provider directory, Dicha AI internals, or redemption codes should call the shared audit helper with an action string such as `users.disable`, `credits.grant`, or `ai.dicha_model.update`.
- Permission summary is informational in MVP. The actual privilege source remains server-side `DICHA_SUPER_ADMIN_EMAILS`; do not expose the configured email list to the browser.

### 4. Validation & Error Matrix

| Condition                                              | Expected Behavior                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Disabled user calls protected API with an old session  | `AuthGuard` returns unauthorized.                                                             |
| Super admin disables another user                      | User status becomes `disabled`, sessions are deleted, audit log records `users.disable`.      |
| Super admin re-enables a user                          | User status becomes `active`, disabled metadata is cleared, audit log records `users.enable`. |
| Super admin attempts to disable self                   | API rejects with bad request and does not update status.                                      |
| Target user id does not exist                          | API returns not found / throws `NotFoundException`.                                           |
| Audit log query has `pageSize > 100` or invalid result | Shared zod/ts-rest validation rejects it.                                                     |
| Mutation body contains secrets                         | Audit metadata must omit them and store only safe scalar summaries.                           |

### 5. Good/Base/Bad Cases

- Good: store actor email/name snapshots on `AdminAuditLog` so audit history remains readable if user profile data changes later.
- Good: keep `disabledById` as an id snapshot, not a hard dependency that can break audit/history retention.
- Good: derive active-session count from `Session`, not from a denormalized `User` field.
- Base: only two roles exist in MVP: ordinary user and super admin.
- Bad: using the frontend role page to decide whether an API operation is allowed.
- Bad: logging full mutation bodies for AI provider or Dicha internal channel updates because they may include credentials.
- Bad: adding content/activity details to user-management responses without a new privacy review.

### 6. Tests Required

- `pnpm --filter @dicha/shared build` after shared admin contract changes.
- `pnpm --filter @dicha/api typecheck && pnpm --filter @dicha/api lint && pnpm --filter @dicha/api build`.
- `pnpm --filter @dicha/admin typecheck && pnpm --filter @dicha/admin lint && pnpm --filter @dicha/admin build`.
- Focused assertions:
  - disabled user is rejected by `AuthGuard`;
  - disabling a user revokes sessions and writes one safe audit row;
  - self-disable is rejected;
  - audit log list supports pagination, window, result, resource type/action, and search filters;
  - audit metadata does not include token/credential/passkey secret fields.

### 7. Wrong vs Correct

#### Wrong

```typescript
await prisma.adminAuditLog.create({
  data: {
    action: 'ai.dicha_internal_provider.update',
    metadata: body,
  },
});
```

This can persist decrypted credentials or raw request content in an audit table.

#### Correct

```typescript
await recordAuditLog(context, {
  action: 'ai.dicha_internal_provider.update',
  resourceType: 'dicha_internal_provider',
  resourceId: provider.id,
  summary: `Updated Dicha AI internal provider ${provider.name}`,
  metadata: safeMetadata({
    providerId: provider.id,
    enabled: provider.enabled,
    credentialChanged: body.credential !== undefined,
  }),
});
```

## Scenario: Super Admin System Operations Console

### 1. Scope / Trigger

- Trigger: adding or modifying admin dashboard situation reports, system operations pages, service health probes, maintenance actions, cache/log tooling, or restart controls.
- This is a cross-layer contract: `packages/shared` defines safe system operation DTOs; `apps/api` performs probes and whitelisted maintenance; `apps/admin` renders the situation report and operations console.

### 2. Signatures

- Shared contract:
  - `contract.admin.getSystemOperations` -> `GET /admin/system/operations`.
  - `contract.admin.runSystemAction` -> `POST /admin/system/actions`.
- Runtime paths:
  - `GET /api/admin/system/operations`.
  - `POST /api/admin/system/actions` with `{ actionId }`.
- Supported action ids:
  - always executable: `refresh_health`, `prune_expired_sessions`, `inspect_audit_logs`, `inspect_runtime_logs`, `inspect_cache`, `prepare_backup`.
  - config-gated executable: `run_backup`, `restart_api`, `restart_ai_gateway`, `clear_runtime_cache`.
- Response includes runtime memory/uptime, host CPU/disk summary, database probe, external service cards, backup files, runtime log lines, cache summaries, maintenance counters, action descriptors, and recent audit logs.
- Optional server env:
  - `DICHA_ADMIN_BACKUP_DIR`: server-side directory whose backup files can be listed.
  - `DICHA_ADMIN_BACKUP_COMMAND`: server-side command used by `run_backup`.
  - `DICHA_ADMIN_LOG_FILES`: comma-separated `name=/path/to/file.log` entries for runtime log viewing.
  - `DICHA_ADMIN_RESTART_API_COMMAND`: server-side command used by `restart_api`.
  - `DICHA_ADMIN_RESTART_AI_GATEWAY_COMMAND`: server-side command used by `restart_ai_gateway`.
  - `DICHA_ADMIN_CLEAR_CACHE_COMMAND`: server-side command used by `clear_runtime_cache`.

### 3. Contracts

- All system operations endpoints must remain protected by `AuthGuard + SuperAdminGuard`.
- Health probes may call internal services with short timeouts and sanitized status details only.
- The API may execute only bounded, request-safe actions. Current allowed mutation is pruning expired Better Auth sessions.
- Dangerous or externally orchestrated operations, especially restarting the API process or AI Gateway, must only execute when an explicit server-side command env is configured. The command itself must never come from the browser request body.
- If an ops command is not configured, return an action descriptor with `executable: false` and a clear `disabledReason`; do not pretend the action succeeded.
- Runtime responses may include Node version, platform, uptime, memory summary, host CPU/disk summary, service status, and counts. They must not expose raw env variables, connection strings, secrets, tokens, API keys, decrypted credentials, filesystem paths containing secrets, or process dumps.
- System runtime logs are a separate concept from admin audit logs. The system operations console may read recent lines from configured log files and must sanitize obvious secrets before returning them.
- Data backup controls may list files from `DICHA_ADMIN_BACKUP_DIR` and run `DICHA_ADMIN_BACKUP_COMMAND`. The admin API must not expose the expanded `DATABASE_URL` or raw command output.
- Cache management must distinguish "not configured", "external", and "ready" states. Destructive cache deletion requires `DICHA_ADMIN_CLEAR_CACHE_COMMAND`; no command means the UI disables the action.
- System actions that mutate state or represent an operational check should write safe audit rows through the admin audit helper.
- The admin dashboard situation report may reuse `GET /admin/system/operations`; do not duplicate service-probe logic in the frontend. Dashboard should show operational data, status cards, resource bars, and recent events rather than listing sidebar menus or module descriptions.

### 4. Validation & Error Matrix

| Condition                                         | Expected Behavior                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Ordinary user calls system operations endpoint    | `SuperAdminGuard` returns `403`.                                                                        |
| Database probe fails                              | Response reports database `down`; API should still return a sanitized operations payload when possible. |
| AI Gateway is unreachable                         | Service status is `unknown` or `degraded`; do not throw the whole dashboard response.                   |
| `prune_expired_sessions` runs                     | Expired sessions are deleted and an audit row records affected count.                                   |
| Restart action requested with configured command   | API executes the configured server-side command and writes an audit row.                                |
| Restart action requested without configured command| API returns skipped/non-executable guidance; it must not terminate the process directly.                 |
| Runtime cache clear requested before command exists| API returns skipped/non-executable guidance.                                                            |
| Runtime logs are configured                       | Response returns recent sanitized runtime lines from readable files.                                    |
| Runtime logs are not configured                   | Response explains how to configure log files and returns no fake log entries.                           |
| Backup action is configured                       | API executes the configured server-side command and refreshes backup file list.                         |
| Backup action is not configured                   | API returns skipped/non-executable guidance and a sanitized recommended command.                         |

### 5. Good/Base/Bad Cases

- Good: use short timeout probes for AI Gateway so the admin dashboard does not hang.
- Good: make maintenance actions self-describing so the UI can render executable and disabled operations from the same response.
- Good: execute only server-side configured commands for backup/restart/cache operations; never accept arbitrary command strings from the browser.
- Good: make runtime logs explicit as configured log-file sources and sanitize obvious tokens before returning lines.
- Base: operational console shows system status, external services, backup files, runtime log lines, cache status, and maintenance actions.
- Bad: calling `process.exit()` from an HTTP request or executing browser-provided shell commands.
- Bad: accepting a command string in the request body.
- Bad: rendering `.env` values or connection strings in the system settings page.
- Bad: presenting admin audit logs as system runtime logs.
- Bad: enabling cache clearing without either a configured command or a concrete namespace strategy.

### 6. Tests Required

- `pnpm --filter @dicha/shared build`.
- `pnpm --filter @dicha/api typecheck && pnpm --filter @dicha/api lint && pnpm --filter @dicha/api build`.
- `pnpm --filter @dicha/admin typecheck && pnpm --filter @dicha/admin lint && pnpm --filter @dicha/admin build`.
- Focused assertions:
  - operations response stays sanitized;
  - AI Gateway probe failure degrades gracefully;
  - expired session pruning deletes only expired sessions;
  - restart/cache/backup actions are executable only when server-side command env is configured;
  - runtime logs and audit logs remain distinct in the UI;
  - dashboard and system page consume the shared operations contract.

### 7. Wrong vs Correct

#### Wrong

```typescript
if (body.actionId === 'restart_api') {
  process.exit(0);
}
```

This lets an HTTP request kill its own server process and can interrupt in-flight requests.

#### Correct

```typescript
return {
  actionId: 'restart_api',
  status: 'skipped',
  message: 'Restart command is not configured.',
  affectedCount: null,
  operations: await getSystemOperations(),
};
```

## Scenario: Cross-Domain Admin Auth Flows

### 1. Scope / Trigger

- Trigger: changing Better Auth login behavior for the independent admin domain.
- This covers passkey and OAuth flows when the public app and admin app use different browser origins.

### 2. Signatures

- Server env:
  - `BETTER_AUTH_URL`: public API/auth origin.
  - `DICHA_WEB_ORIGIN`: public frontend origin.
  - `DICHA_ADMIN_ORIGIN`: public admin frontend origin.
  - `DICHA_PASSKEY_RP_ID`: optional WebAuthn relying-party id for production.
- Better Auth config:
  - `trustedOrigins()` includes explicit web/admin origins plus local dev origins.
  - `passkey({ rpID, rpName, origin })` uses `origin: string[]`.
- Admin client:
  - GitHub login passes an absolute `callbackURL` based on `window.location.origin`.

### 3. Contracts

- Passkey `rpID` must be the shared registrable root domain in production so credentials work across subdomains such as `dicha.life` and `admin.dicha.life`. Default is `dicha.life`; self-hosted domains should set `DICHA_PASSKEY_RP_ID`.
- Passkey `origin` must include every browser origin that can call WebAuthn, especially the admin origin. Wildcards are not enough for passkey origin verification.
- Local development must include `localhost:8080`, `localhost:8081`, `localhost:5173`, and `localhost:5174`.
- GitHub OAuth provider callback remains the API route configured in GitHub, for example `/api/auth/callback/github`.
- The post-login destination is controlled by Better Auth `callbackURL`; admin must pass an absolute admin URL so successful OAuth returns to the admin app, not the public frontend.
- Do not expose `DICHA_SUPER_ADMIN_EMAILS` to the browser to solve auth routing.

### 4. Validation & Error Matrix

| Condition                                                          | Expected Behavior                                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Admin origin missing from passkey `origin`                         | Passkey sign-in fails after browser credential assertion.                                     |
| Admin origin missing from `trustedOrigins`                         | Better Auth rejects cross-origin admin auth requests.                                         |
| GitHub login from admin uses relative `/` callback                 | User may be redirected to the auth base/frontend origin.                                      |
| GitHub login from admin uses absolute `https://admin.../` callback | User returns to admin shell after OAuth completes.                                            |
| GitHub OAuth App has only one callback URL                         | Keep it pointed at the API Better Auth callback route; do not create a second admin callback. |

### 5. Good/Base/Bad Cases

- Good: set `DICHA_WEB_ORIGIN=https://dicha.life`, `DICHA_ADMIN_ORIGIN=https://admin.dicha.life`, and `DICHA_PASSKEY_RP_ID=dicha.life`.
- Good: call `signIn.social({ provider: 'github', callbackURL: new URL('/', window.location.origin).toString() })` in the admin app.
- Base: hide a social login entry only when the provider is intentionally unavailable, not because callback routing is misunderstood.
- Bad: changing GitHub's authorized callback URL from the API route to the admin frontend route.
- Bad: hard-coding the admin frontend URL in source code.

### 6. Tests Required

- `pnpm --filter @dicha/api typecheck`
- `pnpm --filter @dicha/api lint`
- `pnpm --filter @dicha/api build`
- `pnpm --filter @dicha/admin typecheck`
- `pnpm --filter @dicha/admin lint`
- `pnpm --filter @dicha/admin build`
- `docker compose config --quiet` when env wiring changes.
- Manual production/staging check: Passkey from public app and admin app; GitHub from admin returns to admin root.

### 7. Wrong vs Correct

#### Wrong

```typescript
passkey({
  rpID: 'dicha.life',
  origin: process.env.BETTER_AUTH_URL,
});
```

This only trusts the auth/API origin and can reject WebAuthn assertions from `admin.dicha.life`.

#### Correct

```typescript
passkey({
  rpID: 'dicha.life',
  origin: [
    process.env.BETTER_AUTH_URL,
    process.env.DICHA_WEB_ORIGIN,
    process.env.DICHA_ADMIN_ORIGIN,
  ].filter(Boolean),
});
```
