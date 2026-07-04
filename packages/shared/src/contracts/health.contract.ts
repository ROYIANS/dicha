import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { adminContract } from './admin.contract';
import { aiContract } from './ai.contract';
import { accountContract } from './auth.contract';

const c = initContract();

/**
 * Health probe response. The DB field reflects a live `SELECT 1` ping.
 * Single source of truth for both `apps/api` (impl) and `apps/web` (consume).
 */
export const HealthSchema = z.object({
  status: z.literal('ok'),
  db: z.enum(['up', 'down']),
});
export type Health = z.infer<typeof HealthSchema>;

/**
 * The app contract. Future routes are added to this one router so the
 * ts-rest client + Nest handlers stay in sync from a single export.
 *
 * Sign-in/up/out are still served by the Better Auth handler mounted at
 * `/api/auth/*`. The app-owned account profile lives here so web/API share
 * derived user fields such as `isSuperAdmin`.
 */
export const contract = c.router({
  getHealth: {
    method: 'GET',
    path: '/health',
    responses: {
      200: HealthSchema,
    },
    summary: 'Liveness + DB probe',
  },
  account: accountContract,
  ai: aiContract,
  admin: adminContract,
});
