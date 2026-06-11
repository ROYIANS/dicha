/** Hardcoded dev user for VITE_DEV_BYPASS_AUTH=true sessions. */
export const DEV_USER = {
  id: 'dev',
  name: 'Royians',
  avatar: null,
  email: null,
  phone: null,
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
