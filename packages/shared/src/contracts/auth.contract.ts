import { z } from 'zod';

/**
 * Domain user shape, aligned with the merged Better Auth `user` table.
 * Better Auth owns the required columns (id/name/email/emailVerified/image/
 * createdAt/updatedAt); vidorra app fields live as `additionalFields`.
 *
 * Auth itself (sign-in/up/out, session) is no longer a ts-rest endpoint —
 * the frontend drives it via `better-auth/react` client + session endpoints.
 * This type stays here only as the single source of truth for UI components
 * that consume the authenticated user (Header, router context, dev bypass).
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
  personalityArchetype: z.string().nullable(),
  homeName: z.string().nullable(),
  coins: z.number(),
});

export type UserDto = z.infer<typeof UserDto>;
