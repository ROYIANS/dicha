import { queryOptions } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { DEV_USER, shouldBypassAuth } from '@/lib/auth';
import type { UserDto } from '@vidorra/shared';

/**
 * Query options factory for the current auth user.
 * Loader and components share the same factory (loader-first pattern).
 *
 * Source of truth is the Better Auth session endpoint via `authClient`.
 * Dev bypass returns the hardcoded DEV_USER with zero network calls.
 *
 * Throws when there's no session so the `_app` route guard can redirect.
 */
export function authQueryOptions() {
  return queryOptions<UserDto>({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      if (shouldBypassAuth()) {
        return DEV_USER;
      }

      const { data, error } = await authClient.getSession();
      if (error || !data) {
        throw new Error('Unauthorized');
      }
      return data.user as UserDto;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Logout via Better Auth client. Better Auth manages the session cookie and
 * CSRF/origin protection itself — no manual token injection needed.
 * Caller handles navigation to /login after this resolves.
 */
export async function logout(): Promise<void> {
  await authClient.signOut();
}
