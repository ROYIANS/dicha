import { env } from '@/lib/env';

export function altchaChallengeUrl(): string {
  const raw = env.VITE_API_BASE_URL;
  if (/^https?:\/\//i.test(raw)) return `${new URL(raw).origin}/api/altcha/challenge`;
  return '/api/altcha/challenge';
}
