import { initClient } from '@ts-rest/core';
import { contract } from '@vidorra/shared';
import { env } from '@/lib/env';

/**
 * Single ts-rest client over the shared contract.
 * `credentials: 'include'` sends the future BFF httpOnly cookie (architecture.md §3).
 * Data hooks build `queryOptions` factories over this — no hand-written fetch.
 */
export const api = initClient(contract, {
  baseUrl: env.VITE_API_BASE_URL,
  baseHeaders: {},
  credentials: 'include',
});
