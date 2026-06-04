import { z } from 'zod';

/**
 * Typed, validated client env (mirrors the backend's env.validation.ts, zod-flavored).
 * Only `VITE_`-prefixed vars are exposed by Vite to the browser.
 * Default base is the same-origin `/api` dev proxy (architecture.md §6).
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid client env:\n${parsed.error.message}`);
}

export const env = parsed.data;
