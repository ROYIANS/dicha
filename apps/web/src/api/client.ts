import { initClient } from '@ts-rest/core';
import { contract } from '@vidorra/shared';
import { env } from '@/lib/env';

/**
 * Single ts-rest client over the shared contract.
 * `credentials: 'include'` sends the Better Auth session cookie.
 * Mutation protection relies on SameSite=lax cookie + Better Auth origin
 * checks (MVP); no app-level CSRF token is injected here.
 */
export const api = initClient(contract, {
  baseUrl: env.VITE_API_BASE_URL,
  baseHeaders: {},
  credentials: 'include',
  api: async (args) => {
    const response = await fetch(args.path, {
      method: args.method,
      headers: new Headers(args.headers),
      body: args.body,
      credentials: 'include',
    });

    return {
      status: response.status,
      body: await response.text(),
      headers: response.headers,
    };
  },
});
