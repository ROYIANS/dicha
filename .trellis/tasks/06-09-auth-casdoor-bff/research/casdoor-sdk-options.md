# Research: Casdoor OIDC SDK Options for NestJS BFF

- **Query**: Compare `casdoor-nodejs-sdk` vs `openid-client` for NestJS BFF with httpOnly session cookie pattern
- **Scope**: external (npm registry + GitHub source inspection + Casdoor OIDC discovery)
- **Date**: 2026-06-09

---

## Findings

### 1. `casdoor-nodejs-sdk` (v1.34.0)

**What it is**: Official Casdoor admin SDK. Wraps Casdoor's proprietary REST API (`/api/*` endpoints) for CRUD operations on users, orgs, tokens, roles, etc.

**Key methods relevant to auth flow:**
```
sdk.getSignInUrl(redirectUri)        // builds redirect URL (hardcoded scope='read', state=appName)
sdk.getAuthToken(code)               // POSTs to /login/oauth/access_token → {access_token, refresh_token}
sdk.parseJwtToken(token)             // jwt.verify(token, certificate, {algorithms:['RS256']}) → User
```

**`getSignInUrl` internals** (url.ts):
```ts
private getSignUrl(action, redirectUri) {
  const scope = 'read'          // HARDCODED — cannot pass 'openid email profile'
  const state = this.config.appName  // HARDCODED — cannot pass random CSRF state
  return `${endpoint}/${action}/oauth/authorize?client_id=...&response_type=code
          &redirect_uri=${redirectUri.split(/[?#]/)[0]}&scope=${scope}&state=${state}`
}
```

**`getAuthToken` internals** (user.ts):
```ts
// POSTs to Casdoor's token endpoint (NOT standard /token — it's /login/oauth/access_token)
// Returns {access_token, refresh_token} — does NOT return id_token
// No PKCE support
```

**`parseJwtToken` internals** (user.ts):
```ts
jwt.verify(token, this.config.certificate, { algorithms: ['RS256'] }) as User
// Requires caller to pass the PEM certificate as a string in config
// Uses jsonwebtoken 9.0.2 (legacy library)
// Does NOT use JWKS (no automatic key rotation)
```

**Config shape:**
```ts
interface Config {
  endpoint: string        // e.g. "https://door.casdoor.com"
  clientId: string
  clientSecret: string
  certificate: string     // PEM public key — must be fetched manually from Casdoor UI
  orgName: string
  appName?: string
}
```

**Dependencies**: `axios`, `form-data`, `jsonwebtoken@9.0.2`, `node-fetch`

**GitHub stats**: 17 stars, last updated 2025-12-07, 1 open issue

---

### 2. `openid-client` (v6.8.4)

**What it is**: Standards-compliant OAuth 2 / OpenID Connect client by Filip Skokan (panva). OpenID Certified for Basic, FAPI 1.0, and FAPI 2.0 profiles.

**Core flow API:**
```ts
// Step 1: discovery (fetches /.well-known/openid-configuration once)
const config = await client.discovery(new URL(issuer), clientId, clientSecret)

// Step 2: build redirect URL with PKCE + nonce
const code_verifier = client.randomPKCECodeVerifier()
const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
const nonce = client.randomNonce()
const redirectTo = client.buildAuthorizationUrl(config, {
  redirect_uri,
  scope: 'openid email profile',
  code_challenge,
  code_challenge_method: 'S256',
  nonce,
})
// store {code_verifier, nonce} in session before redirect

// Step 3: callback — code exchange returns id_token + access_token
const tokens = await client.authorizationCodeGrant(config, currentUrl, {
  pkceCodeVerifier: code_verifier,
  expectedNonce: nonce,
  idTokenExpected: true,
})
const claims = tokens.claims()  // typed id_token payload
const userInfo = await client.fetchUserInfo(config, tokens.access_token, claims.sub)
```

**Dependencies**: `jose`, `oauth4webapi` — both modern, maintained, ESM-native
**JWKS**: automatic via discovery (no PEM certificate management)
**PKCE**: built-in S256 support
**Nonce**: built-in random generation

**GitHub stats**: 2349 stars, last updated 2026-06-08, 0 open issues

---

### 3. Casdoor OIDC Discovery (Verified Live)

Casdoor Cloud (`https://door.casdoor.com`) exposes a standard OIDC discovery document:

```
issuer:                  https://door.casdoor.com
authorization_endpoint:  https://door.casdoor.com/login/oauth/authorize
token_endpoint:          https://door.casdoor.com/api/login/oauth/access_token
userinfo_endpoint:       https://door.casdoor.com/api/userinfo
jwks_uri:                https://door.casdoor.com/.well-known/jwks
pkce_supported:          true (S256)
scopes_supported:        ['openid', 'email', 'profile', 'address', 'phone', 'offline_access', 'device_sso']
```

Self-hosted Casdoor uses the same discovery path: `{endpoint}/.well-known/openid-configuration`

---

### 4. NestJS + Casdoor Community Example (nghiahnc/nestjs-casdoor-demo)

The only public NestJS + Casdoor example repo. Key findings:

- Does NOT use `casdoor-nodejs-sdk` — it builds the auth URL and token exchange manually with `axios`
- Uses `express-session` directly (same as this project's architecture)
- Code exchange is a raw axios POST to `/api/login/oauth/access_token`
- ID token claims are extracted via `Buffer.from(base64).toString()` — no signature verification
- No PKCE, no state validation, no CSRF protection
- Hardcodes client credentials inline — not production ready

This confirms: the community does NOT rely on `casdoor-nodejs-sdk` for the OIDC auth flow.

---

### 5. Comparison Matrix

| Criterion | `casdoor-nodejs-sdk` | `openid-client` |
|---|---|---|
| OIDC Authorization Code flow | Partial — `getAuthToken(code)` does exchange, but no `id_token` | Full — `authorizationCodeGrant()` handles everything |
| PKCE support | None | Built-in S256 |
| State / nonce CSRF | Hardcoded state = appName | Built-in `randomState()`, `randomNonce()` |
| JWT verification | `jsonwebtoken` + hardcoded PEM cert | JWKS auto-fetched via discovery |
| Scope control | Hardcoded `scope='read'` | Fully configurable |
| OIDC discovery | None | Automatic via `client.discovery()` |
| ID token claims (typed) | Not returned by `getAuthToken` | `tokens.claims()` returns typed claims |
| Maintenance | 17 stars, infrequent updates | 2349 stars, updated daily, zero open issues |
| NestJS fit | No DI module — plain class, must wrap manually | No DI module either — plain functions, wrap in service |
| Primary use case | Casdoor admin API (user CRUD, org management) | Auth flow only |
| TypeScript | Yes | Yes |

---

### 6. BFF Session Pattern Recommendation (from research)

For the `/auth/login → /auth/callback → session → httpOnly cookie` pattern:

**With `openid-client` in NestJS:**

```ts
// auth.service.ts
@Injectable()
export class AuthService {
  private oidcConfig: client.Configuration | null = null

  async getConfig(): Promise<client.Configuration> {
    if (!this.oidcConfig) {
      this.oidcConfig = await client.discovery(
        new URL(process.env.CASDOOR_ENDPOINT),
        process.env.CASDOOR_CLIENT_ID,
        process.env.CASDOOR_CLIENT_SECRET,
      )
    }
    return this.oidcConfig
  }

  async buildLoginUrl(session: Session): Promise<string> {
    const config = await this.getConfig()
    const code_verifier = client.randomPKCECodeVerifier()
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
    const nonce = client.randomNonce()
    // store in session for callback validation
    session.pkceVerifier = code_verifier
    session.nonce = nonce
    return client.buildAuthorizationUrl(config, {
      redirect_uri: process.env.CASDOOR_CALLBACK_URL,
      scope: 'openid email profile',
      code_challenge,
      code_challenge_method: 'S256',
      nonce,
    }).href
  }

  async handleCallback(session: Session, currentUrl: URL): Promise<UserInfo> {
    const config = await this.getConfig()
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: session.pkceVerifier,
      expectedNonce: session.nonce,
      idTokenExpected: true,
    })
    const claims = tokens.claims()!
    return client.fetchUserInfo(config, tokens.access_token, claims.sub)
  }
}
```

---

## Caveats / Gotchas

1. **`casdoor-nodejs-sdk` `getSignInUrl` scope is hardcoded to `'read'`** — this will NOT return an `id_token` (requires `openid` scope). You'd get only an `access_token`. Cannot use for OIDC-compliant flow without monkey-patching.

2. **`casdoor-nodejs-sdk` does NOT return `id_token`** from `getAuthToken()`. The `parseJwtToken` method is meant for an access token, not an id_token. User claims embedded in id_token are unavailable via the SDK.

3. **`casdoor-nodejs-sdk` certificate requirement**: You must copy the PEM public key from the Casdoor app's cert setting and paste it as a string in config. With self-hosted Casdoor, this breaks if you rotate the cert.

4. **`openid-client` v5 → v6 breaking change**: v6 dropped the `Issuer.discover()` class-based API. The new API is `client.discovery(issuerUrl, ...)` — function-based, not class-based. If copying old examples, watch for this.

5. **Casdoor token endpoint is non-standard path**: `/api/login/oauth/access_token` instead of the more common `/token`. `openid-client` handles this correctly via discovery metadata — no manual URL needed.

6. **Session typing in NestJS with express-session**: The `req.session` object needs declaration merging to add `user`, `pkceVerifier`, `nonce` fields. Without it you get TypeScript errors:
   ```ts
   // src/types/express-session.d.ts
   declare module 'express-session' {
     interface SessionData {
       user?: UserProfile
       pkceVerifier?: string
       nonce?: string
     }
   }
   ```

7. **`openid-client` is ESM-only in v6**. It does export CJS-compatible builds via conditional exports, but if the NestJS build config uses `"module": "CommonJS"` strictly, test the import with `import * as client from 'openid-client'` — named imports work, default import does not.

8. **`casdoor-nodejs-sdk` IS useful** for the admin side: fetching user profile details (avatar, displayName, phone), managing users programmatically. Can be used alongside `openid-client` — just not for the auth flow itself.

---

## Related Specs

- `.trellis/tasks/06-09-auth-casdoor-bff/prd.md` — Task PRD defining auth requirements and architecture decisions
- `.trellis/spec/` — project spec directory (no auth spec exists yet)
