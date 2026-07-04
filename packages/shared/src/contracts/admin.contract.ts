import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const AdminModuleSummarySchema = z.object({
  id: z.enum(['dashboard', 'basic', 'system', 'analytics']),
  title: z.string(),
  description: z.string(),
  status: z.enum(['ready', 'planned']),
});

export type AdminModuleSummary = z.infer<typeof AdminModuleSummarySchema>;

export const AdminOverviewSchema = z.object({
  generatedAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  modules: z.array(AdminModuleSummarySchema),
});

export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const adminContract = c.router({
  getOverview: {
    method: 'GET',
    path: '/admin/overview',
    responses: {
      200: AdminOverviewSchema,
    },
    summary: 'Super admin management shell overview',
  },
});
