import { z } from 'zod';

/**
 * Typed, validated client env (mirrors the backend's env.validation.ts, zod-flavored).
 * Only `VITE_`-prefixed vars are exposed by Vite to the browser.
 * Default base is the same-origin `/api` dev proxy (architecture.md §6).
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default('/api'),
  /** Set to 'true' in .env.local to bypass real auth during local dev. */
  VITE_DEV_BYPASS_AUTH: z.enum(['true', 'false']).optional(),
  /** Umami tracker script URL, e.g. https://analytics.example.com/script.js */
  VITE_UMAMI_SCRIPT_URL: z.string().optional(),
  /** Umami website ID (Settings → Websites). Both Umami vars required to enable tracking. */
  VITE_UMAMI_WEBSITE_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(`Invalid client env:\n${parsed.error.message}`);
}

export const env = parsed.data;
