import { initClient } from '@ts-rest/core';
import { contract } from '@dicha/shared';
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

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    return {
      status: response.status,
      body,
      headers: response.headers,
    };
  },
});
