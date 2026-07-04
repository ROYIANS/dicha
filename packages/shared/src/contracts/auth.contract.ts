import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

/**
 * Domain user shape, aligned with the merged Better Auth `user` table.
 * Better Auth owns the required columns (id/name/email/emailVerified/image/
 * createdAt/updatedAt); dicha app fields live as `additionalFields`.
 *
 * Sign-in/up/out still use Better Auth directly. The current Dicha user profile
 * is exposed by the API BFF so server-only derived flags such as
 * `isSuperAdmin` never require exposing private env values to the browser.
 */
export const UserDto = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  city: z.string().nullable(),
  gender: z.string().nullable(),
  bio: z.string().nullable(),
  personalityArchetype: z.string().nullable(),
  homeName: z.string().nullable(),
  coins: z.number(),
  isSuperAdmin: z.boolean(),
});

export type UserDto = z.infer<typeof UserDto>;

export const accountContract = c.router({
  getMe: {
    method: 'GET',
    path: '/account/me',
    responses: {
      200: UserDto,
    },
    summary: 'Current authenticated Dicha user profile',
  },
});
