import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
});

export type UserDto = z.infer<typeof UserDto>;

export const authContract = c.router({
  getMe: {
    method: 'GET',
    path: '/auth/me',
    responses: {
      200: UserDto,
      401: z.object({ message: z.string() }),
    },
  },
});
