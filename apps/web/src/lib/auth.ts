/** Hardcoded dev user for VITE_DEV_BYPASS_AUTH=true sessions.
 *  Shape mirrors the merged Better Auth `user` (UserDto) so bypass and real
 *  sessions are type-compatible everywhere they're consumed. */
export const DEV_USER = {
  id: 'dev',
  name: 'Royians',
  displayName: 'Royians',
  email: 'dev@dicha.life',
  emailVerified: true,
  image: null,
  city: null,
  gender: null,
  personalityArchetype: null,
  homeName: null,
  coins: 0,
} as const;

export type DevUser = typeof DEV_USER;

/**
 * Auth guard bypass for local dev / self-host demo.
 * - explicit `VITE_DEV_BYPASS_AUTH=true` → always bypass (docker default)
 * - explicit `false` → never bypass (test real guard locally)
 * - unset in Vite dev → bypass so `pnpm dev` matches docker-compose without .env
 */
export function shouldBypassAuth(): boolean {
  const flag = import.meta.env.VITE_DEV_BYPASS_AUTH;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return import.meta.env.DEV;
}
