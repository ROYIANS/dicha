import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields, emailOTPClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { env } from '@/lib/env';

/**
 * Better Auth react client — the single driver for auth on the web side.
 * Application data still flows through ts-rest; this only covers
 * sign-in/up/out + session.
 *
 * The auth endpoints live at `<api-origin>/api/auth/*` (handler mounted in
 * `apps/api/src/main.ts`). Better Auth's default `basePath` is `/api/auth`,
 * so the client only needs the API *origin* as `baseURL`:
 *   - `VITE_API_BASE_URL` absolute (e.g. https://api.example.com) → use its origin.
 *   - relative same-origin proxy default (`/api`) → leave undefined so the
 *     client falls back to `window.location.origin` (Vite proxies `/api/auth`).
 * Passing the relative `/api` straight through would make the client treat it
 * as a full base and skip the `/api/auth` basePath — hence the origin extraction.
 *
 * `inferAdditionalFields` teaches the client about the dicha app columns
 * merged into the user table (displayName/city/gender/bio/... + coins) so
 * `signUp.email({ displayName })` and `session.user.displayName` are typed.
 */
function resolveAuthBaseURL(): string | undefined {
  const raw = env.VITE_API_BASE_URL;
  if (/^https?:\/\//i.test(raw)) return new URL(raw).origin;
  return undefined;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseURL(),
  plugins: [
    emailOTPClient(),
    passkeyClient(),
    inferAdditionalFields({
      user: {
        displayName: { type: 'string', required: false },
        city: { type: 'string', required: false },
        gender: { type: 'string', required: false },
        bio: { type: 'string', required: false },
        personalityArchetype: { type: 'string', required: false },
        homeName: { type: 'string', required: false },
        coins: { type: 'number', required: false },
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  emailOtp,
  passkey,
  updateUser,
  listAccounts,
  linkSocial,
  unlinkAccount,
  useListPasskeys,
} = authClient;
