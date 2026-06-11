import { initClient } from '@ts-rest/core';
import { contract } from '@vidorra/shared';
import { env } from '@/lib/env';
import { getCsrfToken } from '@/lib/csrf';

/**
 * Single ts-rest client over the shared contract.
 * `credentials: 'include'` sends the BFF httpOnly session cookie (architecture.md §3).
 * CSRF token (non-httpOnly) is read from cookie and injected into mutation headers.
 */
export const api = initClient(contract, {
  baseUrl: env.VITE_API_BASE_URL,
  baseHeaders: {},
  credentials: 'include',
  api: async (args) => {
    const headers = new Headers(args.headers);

    // Inject CSRF token for mutations (POST, PUT, PATCH, DELETE)
    const method = args.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers.set('x-csrf-token', csrfToken);
      }
    }

    const response = await fetch(args.path, {
      method: args.method,
      headers,
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
