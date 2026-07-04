import { queryOptions } from '@tanstack/react-query';
import { UserDto, type UserDto as UserDtoType } from '@dicha/shared';
import { authClient } from '@/lib/auth-client';
import { api } from './client';

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
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export async function logout(): Promise<void> {
  await authClient.signOut();
}
