import { queryOptions } from '@tanstack/react-query';
import { api } from './client';
import { DEV_USER, shouldBypassAuth } from '@/lib/auth';
import { getCsrfToken } from '@/lib/csrf';

/**
 * Query options factory for /auth/me.
 * Loader and components use the same factory (loader-first pattern).
 * Dev bypass: returns hardcoded DEV_USER without network call.
 */
export function authQueryOptions() {
  return queryOptions({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      if (shouldBypassAuth()) {
        return DEV_USER;
      }

      const { status, body } = await api.auth.getMe();
      if (status === 401) {
        throw new Error('Unauthorized');
      }
      return body;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Logout: POST /auth/logout with CSRF token.
 * CSRF token is automatically injected by the API client.
 */
export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'x-csrf-token': getCsrfToken() || '',
    },
  });
}
