/** Hardcoded dev user for VITE_DEV_BYPASS_AUTH=true sessions. */
export const DEV_USER = {
  id: 'dev',
  name: 'Royians',
  avatar: null,
  level: 18,
} as const;

export type DevUser = typeof DEV_USER;
