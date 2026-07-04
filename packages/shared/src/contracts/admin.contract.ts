import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

const AdminErrorSchema = z.object({
  message: z.string(),
});

export const AdminModuleSummarySchema = z.object({
  id: z.enum(['dashboard', 'basic', 'system', 'analytics']),
  title: z.string(),
  description: z.string(),
  status: z.enum(['ready', 'planned']),
});

export type AdminModuleSummary = z.infer<typeof AdminModuleSummarySchema>;

export const AdminPlatformStatsSchema = z.object({
  totalUsers: z.number().int().min(0),
  verifiedUsers: z.number().int().min(0),
  usersCreatedLast7Days: z.number().int().min(0),
  activeSessions: z.number().int().min(0),
  totalItems: z.number().int().min(0),
  totalEvents: z.number().int().min(0),
});

export type AdminPlatformStats = z.infer<typeof AdminPlatformStatsSchema>;

export const AdminOverviewSchema = z.object({
  generatedAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  stats: AdminPlatformStatsSchema,
  modules: z.array(AdminModuleSummarySchema),
});

export type AdminOverview = z.infer<typeof AdminOverviewSchema>;

export const AdminUserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().nullable(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  city: z.string().nullable(),
  homeName: z.string().nullable(),
  coins: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  counts: z.object({
    sessions: z.number().int().min(0),
    accounts: z.number().int().min(0),
    passkeys: z.number().int().min(0),
  }),
});

export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;

export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(120).optional(),
});

export type AdminUsersQuery = z.infer<typeof AdminUsersQuerySchema>;

export const AdminUsersListSchema = z.object({
  generatedAt: z.string(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(50),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  users: z.array(AdminUserSummarySchema),
});

export type AdminUsersList = z.infer<typeof AdminUsersListSchema>;

export const AdminUserAccountSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  accessTokenExpiresAt: z.string().nullable(),
  refreshTokenExpiresAt: z.string().nullable(),
});

export const AdminUserSessionSchema = z.object({
  id: z.string(),
  expiresAt: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const AdminUserPasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  deviceType: z.string(),
  backedUp: z.boolean(),
  transports: z.string().nullable(),
  createdAt: z.string(),
});

export const AdminUserDetailSchema = AdminUserSummarySchema.extend({
  sessions: z.array(AdminUserSessionSchema),
  accounts: z.array(AdminUserAccountSchema),
  passkeys: z.array(AdminUserPasskeySchema),
});

export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

export const adminContract = c.router({
  getOverview: {
    method: 'GET',
    path: '/admin/overview',
    responses: {
      200: AdminOverviewSchema,
    },
    summary: 'Super admin management shell overview',
  },
  listUsers: {
    method: 'GET',
    path: '/admin/users',
    query: AdminUsersQuerySchema,
    responses: {
      200: AdminUsersListSchema,
    },
    summary: 'Super admin user list',
  },
  getUser: {
    method: 'GET',
    path: '/admin/users/:id',
    pathParams: z.object({
      id: z.string().min(1),
    }),
    responses: {
      200: AdminUserDetailSchema,
      404: AdminErrorSchema,
    },
    summary: 'Super admin user detail',
  },
});
