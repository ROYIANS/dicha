# Research: ts-rest end-to-end (shared contract → NestJS → React 19/Vite + TanStack Query v5)

- **Query**: Wire `@ts-rest/core` / `@ts-rest/nest` / `@ts-rest/react-query` across `packages/shared`, `apps/api`, `apps/web` (health vertical slice).
- **Scope**: external (npm registry + 3.52.1 package internals) + internal (repo mapping).
- **Date**: 2026-06-04
- **Method**: versions/peers from `npm view`; APIs verified by unpacking the actual published `3.52.1` `.d.ts`/compiled output (not from memory).

---

## 0. TL;DR / load-bearing facts

1. **All three ts-rest packages are at `3.52.1`** and peer-require **`zod@^3.22.3`**. **ts-rest 3.52 does NOT support zod 4.** zod's `latest` dist-tag is `4.4.3` — installing `zod@latest` **breaks ts-rest type inference**. → **Pin `zod@^3.25.76` (latest 3.x) in `packages/shared`, `apps/api`, and `apps/web`**, deduped to ONE version. This is the single highest-risk item.
2. **Current Nest API = `@TsRestHandler` + `tsRestHandler`.** The old `@TsRest` / `@Api` decorators are `@deprecated` ("will be removed in v4"). `@TsRestHandler` **auto-binds** its interceptor — controller needs nothing else; `TsRestModule` is **optional**.
3. **Global `ValidationPipe` does NOT interfere with ts-rest routes and does NOT need to be bypassed.** ts-rest validates the request itself (zod, via its own interceptor → `RequestValidationError extends BadRequestException`). `ValidationPipe` only acts on `@Body()/@Query()/@Param()` class-validator DTOs, which ts-rest handlers don't have → it's a **no-op** on contract routes. (Confirms `architecture.md §1`.)
4. **`@ts-rest/react-query` v5 has NO `queryOptions()` method.** To honor `hook-guidelines.md` (single `xxxQueryOptions()` object shared by `queryClient.ensureQueryData(...)` **and** `useQuery(...)`), use **native `@tanstack/react-query` `queryOptions()` wrapping `@ts-rest/core` `initClient`** (Pattern A below). `@ts-rest/react-query` is then optional.
5. **Cookies for BFF**: set `credentials: 'include'` as a **top-level** client arg on `initClient`.

---

## 1. Current stable versions + peers (npm, 2026-06-04)

| Package | Version (`latest`) | Key peers |
|---|---|---|
| `@ts-rest/core` | **3.52.1** | `zod ^3.22.3`, `@types/node ^18.18.7 \|\| >=20.8.4` |
| `@ts-rest/nest` | **3.52.1** | `zod ^3.22.3`, `rxjs ^7.1.0`, `@nestjs/core` & `@nestjs/common` `^9 \|\| ^10 \|\| ^11`, `@ts-rest/core ~3.52.0` |
| `@ts-rest/react-query` | **3.52.1** | `zod ^3.22.3`, `react ^16.8 \|\| ^17 \|\| ^18`, `@ts-rest/core ~3.52.0`, `@tanstack/react-query ^4 \|\| ^5` |
| `zod` | use **3.25.76** (latest 3.x) — **NOT** `4.4.3` | — |
| `@tanstack/react-query` | **5.101.0** | `react ^18 \|\| ^19` |
| `@tanstack/react-router` | **1.170.11** | `react >=18 \|\| >=19` |

Notes:
- `apps/api` is on `@nestjs/* ^11.1.24` → satisfies `@ts-rest/nest` peer. `rxjs ^7.8.2` ✓.
- `@ts-rest/react-query` declares `react ^16.8/17/18` — **does NOT list React 19**. Repo `.npmrc` has `strict-peer-dependencies=false` + `auto-install-peers=true`, so install only **warns** (runtime is 19-safe). Pattern A avoids this package entirely.

---

## 2. zod contract in `packages/shared` (no circular/build issues)

`packages/shared` currently: `src/index.ts → export * from './enums'`, emits **CommonJS** (`tsconfig.json` overrides base `NodeNext` to `module:CommonJS, moduleResolution:Node`; `main:./dist/index.js`, no `exports`/`type`). `apps/api` is also CommonJS. So **no NodeNext ESM `.js`-extension / circular pain today** — base `NodeNext` is overridden by both consumers.

**Add deps** to `packages/shared/package.json` (the contract value + zod schemas are runtime, so `dependencies`, not peer):
```jsonc
"dependencies": { "@ts-rest/core": "^3.52.1", "zod": "^3.25.76" }
```

**`packages/shared/src/contracts/health.contract.ts`** (new):
```ts
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const HealthSchema = z.object({
  status: z.literal('ok'),
  db: z.enum(['up', 'down']),
});
export type Health = z.infer<typeof HealthSchema>;

// One router; future routes get added here → single `contract`.
export const contract = c.router({
  getHealth: {
    method: 'GET',
    path: '/health',
    responses: { 200: HealthSchema },
    summary: 'Liveness + DB probe',
  },
});
```

**`packages/shared/src/index.ts`**: add
```ts
export * from './enums';
export * from './contracts/health.contract';
```

**Import from BOTH apps** as `import { contract, HealthSchema } from '@vidorra/shared'`.

**Build/wiring gotchas (real, must handle):**
- `@vidorra/shared` resolves to `dist/index.js` + `dist/index.d.ts` → **shared must be built before `apps/api` / `apps/web` typecheck**, else stale contract types. Ensure `turbo.json` `build` has `dependsOn: ["^build"]`; for `pnpm dev`, run shared in watch (`shared` already has `dev: tsc -w`). *(Optional alt: web `tsconfig` `paths` + Vite `resolve.alias` `@vidorra/shared` → `packages/shared/src` to consume source and skip the build in dev.)*
- **One zod version only.** A second zod major anywhere in the workspace breaks ts-rest inference + `instanceof ZodError`. Pin `^3.25.76` in shared **and** api **and** web.
- web (Vite/ESM) importing shared's **CJS** `dist` is fine — esbuild does CJS→ESM interop; named imports work because tsc CJS output exposes them as named props.

---

## 3. Implement the contract in a Nest controller (`@ts-rest/nest`)

**Add dep** to `apps/api/package.json`: `"@ts-rest/nest": "^3.52.1"` and `"zod": "^3.25.76"` (same version as shared).

**Current/recommended API** (verified: `@TsRest`/`@Api` are `@deprecated`):

Rewrite `apps/api/src/modules/health/health.controller.ts`:
```ts
import { Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@vidorra/shared';
import { HealthService } from './health.service';

@Controller() // NO path string — path comes from the contract ('/health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @TsRestHandler(contract.getHealth)
  getHealth() {
    return tsRestHandler(contract.getHealth, async () => {
      const body = await this.health.check(); // already { status:'ok', db:'up'|'down' }
      return { status: 200, body };
    });
  }
}
```
- `HealthService` stays as-is (its return already matches `HealthSchema`). Optionally type it as `Promise<Health>` from `@vidorra/shared`.
- **`@TsRestHandler` auto-applies `UseInterceptors(TsRestHandlerInterceptor)`** (verified in compiled `index.cjs.js`) → no manual interceptor wiring.
- **`TsRestModule` is optional** (interceptor injects options via `@Optional() @Inject`). Register `TsRestModule.register({ jsonQuery, validateResponses })` (in `app.module.ts`, `isGlobal`) **only** if you want global response validation / JSON query parsing. Per-route override: `@TsRestHandler(route, { validateResponses: true })`.
- `health.module.ts` unchanged (still declares `HealthController` + `HealthService`).

**ValidationPipe interaction — answer:** zod (via ts-rest) **replaces** `ValidationPipe`'s role for contract routes; you do **NOT** bypass `ValidationPipe`.
- ts-rest's interceptor validates `pathParams/headers/query/body` against the contract's zod schemas and throws `RequestValidationError extends BadRequestException` (400) on failure — **independent** of Nest pipes.
- Global `ValidationPipe({whitelist, forbidNonWhitelisted, transform})` (in `apps/api/src/main.ts`) only validates/strips params bound via `@Body()/@Query()/@Param()` to **class-validator DTO classes**. `@TsRestHandler` methods have **no such param decorators** (inputs arrive via the `tsRestHandler` callback) → `ValidationPipe` is a **no-op** on ts-rest routes; no conflict, nothing to disable. For `GET /health` (no inputs) it's doubly irrelevant.
- **Keep** the global `ValidationPipe` for any future non-ts-rest controllers.
- **Gotcha:** never mix `@Body() dto: SomeClassValidatorDto` into a ts-rest handler — pick one validation path per route.
- `TsRestOptions` knobs (per-handler 2nd arg or global via `TsRestModule`): `jsonQuery`, `validateResponses`, `validateRequestHeaders`, `validateRequestQuery`, `validateRequestBody`.

---

## 4. Consume on web — reusable `queryOptions` factory (loader + `useQuery`)

`@ts-rest/react-query` v5 `QueryHooks` exposes `useQuery` / `useSuspenseQuery` / `query` / `useInfiniteQuery` — **no `queryOptions()` method** (verified). The loader-side helpers (`ensureQueryData`, `fetchQuery`…) live on `tsr.initQueryClient(queryClient).<route>`, not on the bare TanStack `queryClient`. So ts-rest/react-query **cannot** produce the single shared `xxxQueryOptions()` object that `hook-guidelines.md` L16-20 + `architecture.md §2` mandate (`queryClient.ensureQueryData(xxxQueryOptions(...))` **and** `useQuery(xxxQueryOptions(...))`).

### ★ Pattern A (RECOMMENDED) — native `queryOptions()` + `@ts-rest/core` `initClient`
Satisfies the documented convention verbatim; one object → both consumers; no extra provider; sidesteps the React-19 peer warning. Keeps full contract types + (optional) zod response validation.

`apps/web/src/api/client.ts`:
```ts
import { initClient } from '@ts-rest/core';
import { contract } from '@vidorra/shared';

export const api = initClient(contract, {
  baseUrl: '/api',          // same-origin; Vite dev proxy /api -> :3000
  baseHeaders: {},
  credentials: 'include',   // (5) send BFF httpOnly cookie
  // validateResponse: true, // opt-in: zod-validate responses client-side
});
```

`apps/web/src/api/health.ts` (the factory):
```ts
import { queryOptions } from '@tanstack/react-query';
import { api } from './client';

export const healthQueryOptions = () =>
  queryOptions({
    queryKey: ['health'] as const,            // domain-first key (hook-guidelines)
    queryFn: async ({ signal }) => {
      const res = await api.getHealth({ fetchOptions: { signal } });
      if (res.status === 200) return res.body; // typed: { status:'ok', db:'up'|'down' }
      throw new Error(`health ${res.status}`);
    },
  });
```

Root route `apps/web/src/routes/__root.tsx` — loader + component share the **same** factory object:
```ts
import { createRootRouteWithContext, useQuery } from '...'; // router + @tanstack/react-query
import type { QueryClient } from '@tanstack/react-query';
import { healthQueryOptions } from '@/api/health';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(healthQueryOptions()),
  component: RootComponent,
});

function RootComponent() {
  const { data } = useQuery(healthQueryOptions()); // data: { status:'ok', db:'up'|'down' }
  // HeroUI: render chip from data.db === 'up' ? ... : ...
}
```
Note: with Pattern A, `data` is the **unwrapped body** (`{ status, db }`), because the factory's `queryFn` returns `res.body`.

### Pattern B (alternative) — `@ts-rest/react-query/v5` generated hooks
Use only if you want ts-rest's generated hooks/typed-error envelope. **Deviates** from the single-`queryOptions`-object convention and adds a provider + React-19 peer warning.

`apps/web/src/api/tsr.ts`:
```ts
import { initTsrReactQuery } from '@ts-rest/react-query/v5';
import { contract } from '@vidorra/shared';
export const tsr = initTsrReactQuery(contract, { baseUrl: '/api', credentials: 'include' });
```
- **Provider required** (in addition to `QueryClientProvider`):
  `<QueryClientProvider client={qc}><tsr.ReactQueryProvider>…</tsr.ReactQueryProvider></QueryClientProvider>`
- Component: `const { data } = tsr.getHealth.useQuery({ queryKey: ['health'] });` → `data` is the **full envelope** `{ status, body, headers }` → read `data.body.db` (NOT `data.db`).
- Loader: `await tsr.initQueryClient(context.queryClient).getHealth.ensureQueryData({ queryKey: ['health'] });`
- Shared unit is a `{ queryKey, queryData }` **bag**, not a TanStack `queryOptions` object; `queryData` carries request args (omit for health — no inputs).

**Recommendation:** **Pattern A.** Keep `@ts-rest/react-query` OUT of `apps/web` deps unless adopting B. *(`architecture.md`'s dep list names `@ts-rest/react-query`; if going with A, the spec should be reconciled — flag for the main agent; not edited here.)*

---

## 5. Cookies for BFF auth (`credentials: 'include'`)

- Verified client args (`@ts-rest/core`): `OverrideableClientArgs = { baseUrl, credentials?, jsonQuery?, validateResponse? }`. Set **`credentials: 'include'` top-level** on `initClient` / `initTsrReactQuery` (preferred; the per-call `credentials` field is `@deprecated` in favor of `fetchOptions.credentials`).
- Per-call override: `api.getHealth({ fetchOptions: { credentials: 'include' } })`.
- With the Vite **same-origin** dev proxy (`/api` → `:3000`), the BFF `httpOnly + SameSite` cookie is sent automatically and **no CORS** config is needed in dev (matches `architecture.md §3`).

---

## Files mapped (this repo)

| Path | Action |
|---|---|
| `packages/shared/package.json` | add deps `@ts-rest/core ^3.52.1`, `zod ^3.25.76` |
| `packages/shared/src/contracts/health.contract.ts` | **new** — zod schema + `contract` |
| `packages/shared/src/index.ts` | add `export * from './contracts/health.contract'` |
| `apps/api/package.json` | add `@ts-rest/nest ^3.52.1`, `zod ^3.25.76` |
| `apps/api/src/modules/health/health.controller.ts` | rewrite via `@TsRestHandler`/`tsRestHandler` |
| `apps/api/src/main.ts` | leave `ValidationPipe` as-is; see prefix caveat below |
| `apps/web/src/api/client.ts` | **new** — `initClient` (`baseUrl:'/api'`, `credentials:'include'`) |
| `apps/web/src/api/health.ts` | **new** — `healthQueryOptions()` factory |
| `apps/web/src/routes/__root.tsx` | loader `ensureQueryData` + component `useQuery` |

(`apps/web/src/api/` placement per `directory-structure.md` L26.)

---

## Caveats / Open integration points

- **Path/prefix must agree.** Contract path `/health` + client `baseUrl:'/api'` ⇒ browser hits `/api/health`. Backend currently serves `/health` (no global prefix). Resolve by EITHER `app.setGlobalPrefix('api')` in `apps/api/src/main.ts` (recommended — keeps contract path `/health`, client base `/api`) **OR** a Vite proxy rewrite `^/api → ''`. Pick one. (Vite proxy details belong to `research/tanstack-router-setup.md`.)
- **zod single-version pin (`^3.25.76`) across shared+api+web** — highest-risk; verify dedupe after install (`pnpm why zod`).
- **Build ordering**: shared must be built/watched before api+web typecheck (`turbo ^build` / `tsc -w`).
- **React 19 peer warning** if Pattern B is used (`@ts-rest/react-query` peers `react ^16.8/17/18`); harmless with `strict-peer-dependencies=false`, but Pattern A avoids it.
- `@TsRestHandler` controllers use `@Controller()` (empty) — path comes from the contract; don't double-prefix.

## Not found / not needed
- No live `@ts-rest/*` install in the repo yet (web unscaffolded; lockfile has none) — all API facts taken from unpacked `3.52.1` tarballs.
