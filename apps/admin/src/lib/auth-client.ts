import { createAuthClient } from 'better-auth/react';
import { emailOTPClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';
import { env } from '@/lib/env';

function resolveAuthBaseURL(): string | undefined {
  const raw = env.VITE_API_BASE_URL;
  if (/^https?:\/\//i.test(raw)) return new URL(raw).origin;
  return undefined;
}

export const authClient = createAuthClient({
  baseURL: resolveAuthBaseURL(),
  plugins: [
    emailOTPClient(),
    passkeyClient(),
    inferAdditionalFields({
      user: {
        displayName: { type: 'string', required: false },
        city: { type: 'string', required: false },
        gender: { type: 'string', required: false },
        bio: { type: 'string', required: false },
        personalityArchetype: { type: 'string', required: false },
        homeName: { type: 'string', required: false },
        coins: { type: 'number', required: false },
      },
    }),
  ],
});
