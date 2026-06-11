import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { authContract } from './auth.contract';

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
  auth: authContract,
});
