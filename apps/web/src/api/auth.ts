import { queryOptions } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { UserDto, type UserDto as UserDtoType } from '@dicha/shared';
import { api } from './client';

/**
 * Query options factory for the current auth user.
 * Loader and components share the same factory (loader-first pattern).
 *
 * Source of truth is the app-owned account endpoint. It is backed by Better
 * Auth on the server and adds server-derived fields such as `isSuperAdmin`.
 *
 * Throws when there's no session so the `_app` route guard can redirect.
 */
export function authQueryOptions() {
  return queryOptions<UserDtoType>({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const res = await api.account.getMe();
      if (res.status !== 200) {
        throw new Error('Unauthorized');
      }
      return UserDto.parse(res.body);
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
