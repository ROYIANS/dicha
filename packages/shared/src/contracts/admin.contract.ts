import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  AiUsageBreakdownSchema,
  AiUsageDistributionsSchema,
  AiUsageEventSchema,
  AiUsageStatusSchema,
  AiUsagePerformanceSchema,
  AiUsageQuerySchema,
  AiUsageSummarySchema,
  AiUsageTimeSeriesSchema,
  AiModelCapabilitySchema,
  AiModelPricingSchema,
  AiModelTypeSchema,
  AiInvokeErrorCategorySchema,
  AiProviderRequestFormatSchema,
  AiUsageWindowSchema,
} from './ai.contract';
import {
  CreditAccountSchema,
  CreditLedgerEntrySchema,
  CreditLedgerTypeSchema,
} from './credit.contract';

const c = initContract();

const AdminErrorSchema = z.object({
  message: z.string(),
});

export const AdminModuleSummarySchema = z.object({
  id: z.enum(['dashboard', 'basic', 'aiProviders', 'system', 'analytics']),
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

export const AdminAiProviderSummarySchema = z.object({
  providerId: z.string(),
  name: z.string(),
  shortName: z.string(),
  category: z.string(),
  credentialMode: z.string(),
  billingMode: z.string(),
  modelSyncMode: z.string(),
  status: z.string(),
  modelCount: z.number().int().min(0),
  enabledModelCount: z.number().int().min(0),
});

export type AdminAiProviderSummary = z.infer<typeof AdminAiProviderSummarySchema>;

export const AdminAiProviderDirectoryItemSchema = AdminAiProviderSummarySchema.extend({
  enabled: z.boolean(),
  baseUrl: z.string().url(),
  requestFormat: AiProviderRequestFormatSchema.optional(),
  authType: z.enum(['api_key', 'bearer_token', 'none']),
  notes: z.string().nullable(),
});

export type AdminAiProviderDirectoryItem = z.infer<typeof AdminAiProviderDirectoryItemSchema>;

export const AdminAiProviderDirectoryOverviewSchema = z.object({
  generatedAt: z.string(),
  providers: z.array(AdminAiProviderDirectoryItemSchema),
  models: z.array(
    z.object({
      providerId: z.string(),
      modelId: z.string(),
      name: z.string(),
      displayName: z.string(),
      modelType: AiModelTypeSchema,
      capabilities: z.array(AiModelCapabilitySchema),
      contextWindow: z.number().int().positive().nullable(),
      enabled: z.boolean(),
      recommended: z.boolean(),
      availability: z.string(),
      priceHint: z.string(),
    }),
  ),
});

export type AdminAiProviderDirectoryOverview = z.infer<
  typeof AdminAiProviderDirectoryOverviewSchema
>;

export const AdminAiProviderDirectoryUpdateSchema = z.object({
  providerId: z.string().min(1),
  enabled: z.boolean().optional(),
  baseUrl: z.string().url().optional(),
  requestFormat: AiProviderRequestFormatSchema.optional(),
  authType: z.enum(['api_key', 'bearer_token', 'none']).optional(),
  notes: z.string().trim().max(240).nullable().optional(),
});

export type AdminAiProviderDirectoryUpdate = z.infer<
  typeof AdminAiProviderDirectoryUpdateSchema
>;

export const AdminAiProviderDirectoryModelUpdateSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  enabled: z.boolean().optional(),
  recommended: z.boolean().optional(),
  displayName: z.string().min(1).max(160).optional(),
});

export type AdminAiProviderDirectoryModelUpdate = z.infer<
  typeof AdminAiProviderDirectoryModelUpdateSchema
>;

export const AdminAiProviderDirectorySyncSchema = z.object({
  providerId: z.string().min(1),
});

export type AdminAiProviderDirectorySync = z.infer<
  typeof AdminAiProviderDirectorySyncSchema
>;

export const AdminAiProviderDirectorySyncResponseSchema = z.object({
  providerId: z.string(),
  syncedCount: z.number().int().min(0),
});

export type AdminAiProviderDirectorySyncResponse = z.infer<
  typeof AdminAiProviderDirectorySyncResponseSchema
>;

export const AdminAiInternalProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string(),
  requestFormat: AiProviderRequestFormatSchema,
  authType: z.enum(['api_key', 'bearer_token', 'none']),
  enabled: z.boolean(),
  priority: z.number().int(),
  credentialState: z.enum(['configured', 'missing', 'not_required']),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AdminAiInternalProvider = z.infer<typeof AdminAiInternalProviderSchema>;

export const AdminDichaAiModelSchema = z.object({
  modelRecordId: z.string(),
  modelId: z.string(),
  internalProviderId: z.string(),
  internalProviderName: z.string(),
  upstreamModelName: z.string(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  modelType: AiModelTypeSchema,
  capabilities: z.array(AiModelCapabilitySchema),
  contextWindow: z.number().int().positive().nullable(),
  enabled: z.boolean(),
  availability: z.string(),
  recommended: z.boolean(),
  sortOrder: z.number().int(),
  priceHint: z.string().nullable(),
  upstreamPricing: AiModelPricingSchema.nullable(),
  dxPricing: AiModelPricingSchema.nullable(),
  parameterConfig: z.record(z.string(), z.unknown()).nullable(),
});

export type AdminDichaAiModel = z.infer<typeof AdminDichaAiModelSchema>;

export const AdminDichaAiServiceOverviewSchema = z.object({
  generatedAt: z.string(),
  provider: AdminAiProviderSummarySchema,
  internalProviders: z.array(AdminAiInternalProviderSchema),
  models: z.array(AdminDichaAiModelSchema),
});

export type AdminDichaAiServiceOverview = z.infer<typeof AdminDichaAiServiceOverviewSchema>;

export const AdminAiInternalProviderUpsertSchema = z.object({
  providerId: z.string().optional(),
  name: z.string().min(1).max(120),
  baseUrl: z.string().url(),
  requestFormat: AiProviderRequestFormatSchema,
  authType: z.enum(['api_key', 'bearer_token', 'none']),
  credential: z.string().min(1).max(4096).optional(),
  enabled: z.boolean(),
  priority: z.number().int().min(1).max(10000),
  notes: z.string().trim().max(240).nullable().optional(),
});

export type AdminAiInternalProviderUpsert = z.infer<typeof AdminAiInternalProviderUpsertSchema>;

export const AdminDichaInternalProviderSyncSchema = z.object({
  providerId: z.string().min(1),
});

export type AdminDichaInternalProviderSync = z.infer<
  typeof AdminDichaInternalProviderSyncSchema
>;

export const AdminDichaInternalProviderSyncResponseSchema = z.object({
  providerId: z.string(),
  syncedCount: z.number().int().min(0),
});

export type AdminDichaInternalProviderSyncResponse = z.infer<
  typeof AdminDichaInternalProviderSyncResponseSchema
>;

export const AdminDichaModelUpdateSchema = z.object({
  modelRecordId: z.string().min(1),
  enabled: z.boolean().optional(),
  dxModelId: z.string().min(1).max(180).optional(),
  dxDisplayName: z.string().min(1).max(160).optional(),
  dxDescription: z.string().trim().max(500).nullable().optional(),
  dxPriceHint: z.string().trim().max(240).nullable().optional(),
  dxPricing: AiModelPricingSchema.nullable().optional(),
  dxRecommended: z.boolean().optional(),
  dxSortOrder: z.number().int().min(1).max(10000).optional(),
  parameterConfig: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AdminDichaModelUpdate = z.infer<typeof AdminDichaModelUpdateSchema>;

export const AdminDichaAiUsageEventSchema = AiUsageEventSchema.extend({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});

export type AdminDichaAiUsageEvent = z.infer<typeof AdminDichaAiUsageEventSchema>;

export const AdminDichaAiUsageQuerySchema = AiUsageQuerySchema.extend({
  logLimit: z.coerce.number().int().min(20).max(1000).default(500),
});

export type AdminDichaAiUsageQuery = z.infer<typeof AdminDichaAiUsageQuerySchema>;

export const AdminDichaAiUserBreakdownSchema = AiUsageBreakdownSchema.extend({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});

export type AdminDichaAiUserBreakdown = z.infer<typeof AdminDichaAiUserBreakdownSchema>;

export const AdminDichaAiUsageReportSchema = z.object({
  generatedAt: z.string().datetime(),
  window: AiUsageWindowSchema,
  from: z.string().datetime().nullable(),
  to: z.string().datetime(),
  providerId: z.literal('dicha'),
  providerName: z.string(),
  activeUsers: z.number().int().min(0),
  totalEvents: z.number().int().min(0),
  logLimit: z.number().int().min(20).max(1000),
  summary: AiUsageSummarySchema,
  performance: AiUsagePerformanceSchema,
  timeSeries: AiUsageTimeSeriesSchema,
  distributions: AiUsageDistributionsSchema,
  byModel: z.array(AiUsageBreakdownSchema),
  byUseCase: z.array(AiUsageBreakdownSchema),
  byUser: z.array(AdminDichaAiUserBreakdownSchema),
  byStatus: z.array(AiUsageBreakdownSchema),
  recentEvents: z.array(AdminDichaAiUsageEventSchema),
});

export type AdminDichaAiUsageReport = z.infer<typeof AdminDichaAiUsageReportSchema>;

export const AdminDichaAiDiagnosticsQuerySchema = z.object({
  window: AiUsageWindowSchema.default('7d'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(50),
  status: AiUsageStatusSchema.optional(),
  errorCategory: AiInvokeErrorCategorySchema.optional(),
  requestId: z.string().trim().max(120).optional(),
  userSearch: z.string().trim().max(120).optional(),
  modelSearch: z.string().trim().max(160).optional(),
  internalChannelId: z.string().trim().max(160).optional(),
});

export type AdminDichaAiDiagnosticsQuery = z.infer<
  typeof AdminDichaAiDiagnosticsQuerySchema
>;

export const AdminDichaAiDiagnosticsFilterOptionSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
});

export type AdminDichaAiDiagnosticsFilterOption = z.infer<
  typeof AdminDichaAiDiagnosticsFilterOptionSchema
>;

export const AdminDichaAiDiagnosticsReportSchema = z.object({
  generatedAt: z.string().datetime(),
  window: AiUsageWindowSchema,
  from: z.string().datetime().nullable(),
  to: z.string().datetime(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(10).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  summary: AiUsageSummarySchema,
  events: z.array(AdminDichaAiUsageEventSchema),
  filters: z.object({
    statuses: z.array(AdminDichaAiDiagnosticsFilterOptionSchema),
    errorCategories: z.array(AdminDichaAiDiagnosticsFilterOptionSchema),
    models: z.array(AdminDichaAiDiagnosticsFilterOptionSchema),
    internalChannels: z.array(AdminDichaAiDiagnosticsFilterOptionSchema),
  }),
});

export type AdminDichaAiDiagnosticsReport = z.infer<
  typeof AdminDichaAiDiagnosticsReportSchema
>;

export const AdminCreditRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  cnyCreditsPerUnit: z.number().int().min(1),
  usdCreditsPerUnit: z.number().int().min(1),
  platformMarkup: z.number().min(0),
  minimumChargeCredits: z.number().int().min(0),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminCreditRule = z.infer<typeof AdminCreditRuleSchema>;

export const AdminCreditRuleUpsertSchema = z.object({
  ruleId: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  active: z.boolean(),
  cnyCreditsPerUnit: z.number().int().min(1).max(1_000_000_000),
  usdCreditsPerUnit: z.number().int().min(1).max(1_000_000_000),
  platformMarkup: z.number().min(0).max(100),
  minimumChargeCredits: z.number().int().min(0).max(1_000_000),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type AdminCreditRuleUpsert = z.infer<typeof AdminCreditRuleUpsertSchema>;

export const AdminCreditRulesOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  rules: z.array(AdminCreditRuleSchema),
});
export type AdminCreditRulesOverview = z.infer<typeof AdminCreditRulesOverviewSchema>;

export const AdminCreditGrantSchema = z.object({
  ownerId: z.string().min(1),
  amount: z.number().int().positive().max(1_000_000_000),
  reason: z.string().trim().min(1).max(500),
});
export type AdminCreditGrant = z.infer<typeof AdminCreditGrantSchema>;

export const AdminCreditGrantResponseSchema = z.object({
  account: CreditAccountSchema,
  ledgerEntry: CreditLedgerEntrySchema,
});
export type AdminCreditGrantResponse = z.infer<typeof AdminCreditGrantResponseSchema>;

export const AdminCreditBalancesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  search: z.string().trim().max(120).optional(),
});
export type AdminCreditBalancesQuery = z.infer<typeof AdminCreditBalancesQuerySchema>;

export const AdminCreditBalanceItemSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  account: CreditAccountSchema,
});
export type AdminCreditBalanceItem = z.infer<typeof AdminCreditBalanceItemSchema>;

export const AdminCreditBalancesPageSchema = z.object({
  generatedAt: z.string().datetime(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  balances: z.array(AdminCreditBalanceItemSchema),
});
export type AdminCreditBalancesPage = z.infer<typeof AdminCreditBalancesPageSchema>;

export const AdminCreditLedgerQuerySchema = AdminCreditBalancesQuerySchema.extend({
  type: CreditLedgerTypeSchema.optional(),
  ownerId: z.string().min(1).optional(),
});
export type AdminCreditLedgerQuery = z.infer<typeof AdminCreditLedgerQuerySchema>;

export const AdminCreditLedgerEntrySchema = CreditLedgerEntrySchema.extend({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
});
export type AdminCreditLedgerEntry = z.infer<typeof AdminCreditLedgerEntrySchema>;

export const AdminCreditLedgerPageSchema = z.object({
  generatedAt: z.string().datetime(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  entries: z.array(AdminCreditLedgerEntrySchema),
});
export type AdminCreditLedgerPage = z.infer<typeof AdminCreditLedgerPageSchema>;

export const AdminCreditRedemptionCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  creditAmount: z.number().int().positive(),
  enabled: z.boolean(),
  maxRedemptions: z.number().int().positive(),
  redeemedCount: z.number().int().min(0),
  expiresAt: z.string().datetime().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminCreditRedemptionCode = z.infer<typeof AdminCreditRedemptionCodeSchema>;

export const AdminCreditRedemptionCodeUpsertSchema = z.object({
  codeId: z.string().optional(),
  code: z.string().trim().min(4).max(80),
  creditAmount: z.number().int().positive().max(1_000_000_000),
  enabled: z.boolean(),
  maxRedemptions: z.number().int().positive().max(1_000_000),
  expiresAt: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type AdminCreditRedemptionCodeUpsert = z.infer<
  typeof AdminCreditRedemptionCodeUpsertSchema
>;

export const AdminCreditRedemptionCodesOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  codes: z.array(AdminCreditRedemptionCodeSchema),
});
export type AdminCreditRedemptionCodesOverview = z.infer<
  typeof AdminCreditRedemptionCodesOverviewSchema
>;

export const AdminCreditOperationsQuerySchema = z.object({
  window: AiUsageWindowSchema.default('7d'),
});
export type AdminCreditOperationsQuery = z.infer<
  typeof AdminCreditOperationsQuerySchema
>;

export const AdminCreditOperationsSummarySchema = z.object({
  totalBalance: z.number().int(),
  lifetimeGranted: z.number().int().min(0),
  lifetimeSpent: z.number().int().min(0),
  activeAccounts: z.number().int().min(0),
  ledgerEntries: z.number().int().min(0),
  grantedCredits: z.number().int().min(0),
  redeemedCredits: z.number().int().min(0),
  spentCredits: z.number().int().min(0),
  refundedCredits: z.number().int().min(0),
  adjustedCredits: z.number().int(),
  expiredCredits: z.number().int().min(0),
  aiSpentCredits: z.number().int().min(0),
  netChange: z.number().int(),
});
export type AdminCreditOperationsSummary = z.infer<
  typeof AdminCreditOperationsSummarySchema
>;

export const AdminCreditOperationsBucketSchema = z.object({
  key: z.string(),
  label: z.string(),
  grantedCredits: z.number().int().min(0),
  redeemedCredits: z.number().int().min(0),
  spentCredits: z.number().int().min(0),
  refundedCredits: z.number().int().min(0),
  adjustedCredits: z.number().int(),
  expiredCredits: z.number().int().min(0),
  aiSpentCredits: z.number().int().min(0),
  netChange: z.number().int(),
  entries: z.number().int().min(0),
});
export type AdminCreditOperationsBucket = z.infer<
  typeof AdminCreditOperationsBucketSchema
>;

export const AdminCreditOperationsBreakdownSchema = z.object({
  key: z.string(),
  label: z.string(),
  credits: z.number().int(),
  entries: z.number().int().min(0),
});
export type AdminCreditOperationsBreakdown = z.infer<
  typeof AdminCreditOperationsBreakdownSchema
>;

export const AdminCreditOperationsUserRankSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  balance: z.number().int(),
  lifetimeGranted: z.number().int().min(0),
  lifetimeSpent: z.number().int().min(0),
  credits: z.number().int(),
  lastActivityAt: z.string().datetime().nullable(),
});
export type AdminCreditOperationsUserRank = z.infer<
  typeof AdminCreditOperationsUserRankSchema
>;

export const AdminCreditOperationsRedemptionSummarySchema = z.object({
  totalCodes: z.number().int().min(0),
  enabledCodes: z.number().int().min(0),
  exhaustedCodes: z.number().int().min(0),
  expiredCodes: z.number().int().min(0),
  expiringSoonCodes: z.number().int().min(0),
  totalPotentialCredits: z.number().int().min(0),
  redeemedCredits: z.number().int().min(0),
  remainingCredits: z.number().int().min(0),
  totalRedemptions: z.number().int().min(0),
  usageRate: z.number().min(0).max(1),
});
export type AdminCreditOperationsRedemptionSummary = z.infer<
  typeof AdminCreditOperationsRedemptionSummarySchema
>;

export const AdminCreditOperationsAiBreakdownSchema = z.object({
  key: z.string(),
  label: z.string(),
  credits: z.number().int().min(0),
  calls: z.number().int().min(0),
  tokens: z.number().int().min(0),
});
export type AdminCreditOperationsAiBreakdown = z.infer<
  typeof AdminCreditOperationsAiBreakdownSchema
>;

export const AdminCreditOperationsReportSchema = z.object({
  generatedAt: z.string().datetime(),
  window: AiUsageWindowSchema,
  from: z.string().datetime().nullable(),
  to: z.string().datetime(),
  summary: AdminCreditOperationsSummarySchema,
  timeSeries: z.array(AdminCreditOperationsBucketSchema),
  byType: z.array(AdminCreditOperationsBreakdownSchema),
  userRanks: z.object({
    byBalance: z.array(AdminCreditOperationsUserRankSchema),
    bySpent: z.array(AdminCreditOperationsUserRankSchema),
    byGranted: z.array(AdminCreditOperationsUserRankSchema),
    byRecentActivity: z.array(AdminCreditOperationsUserRankSchema),
  }),
  redemption: AdminCreditOperationsRedemptionSummarySchema,
  aiUsage: z.object({
    byModel: z.array(AdminCreditOperationsAiBreakdownSchema),
    byUseCase: z.array(AdminCreditOperationsAiBreakdownSchema),
  }),
});
export type AdminCreditOperationsReport = z.infer<
  typeof AdminCreditOperationsReportSchema
>;

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
  getAiProviderDirectory: {
    method: 'GET',
    path: '/admin/ai/provider-directory',
    responses: {
      200: AdminAiProviderDirectoryOverviewSchema,
    },
    summary: 'Super admin user-facing AI provider directory',
  },
  updateAiProviderDirectory: {
    method: 'POST',
    path: '/admin/ai/provider-directory',
    body: AdminAiProviderDirectoryUpdateSchema,
    responses: {
      200: AdminAiProviderDirectoryItemSchema,
    },
    summary: 'Enable or disable a user-facing AI provider template',
  },
  syncAiProviderDirectoryModels: {
    method: 'POST',
    path: '/admin/ai/provider-directory/sync-models',
    body: AdminAiProviderDirectorySyncSchema,
    responses: {
      200: AdminAiProviderDirectorySyncResponseSchema,
    },
    summary: 'Sync default models for a user-facing AI provider template',
  },
  updateAiProviderDirectoryModel: {
    method: 'POST',
    path: '/admin/ai/provider-directory/models',
    body: AdminAiProviderDirectoryModelUpdateSchema,
    responses: {
      200: AdminAiProviderDirectoryOverviewSchema,
    },
    summary: 'Enable or disable a default user-facing AI provider model',
  },
  getDichaAiService: {
    method: 'GET',
    path: '/admin/ai/dicha-service',
    responses: {
      200: AdminDichaAiServiceOverviewSchema,
    },
    summary: 'Super admin Dicha AI internal service overview',
  },
  upsertDichaInternalProvider: {
    method: 'POST',
    path: '/admin/ai/dicha-service/providers',
    body: AdminAiInternalProviderUpsertSchema,
    responses: {
      200: AdminAiInternalProviderSchema,
    },
    summary: 'Create or update a Dicha AI internal upstream provider',
  },
  syncDichaInternalProviderModels: {
    method: 'POST',
    path: '/admin/ai/dicha-service/providers/sync-models',
    body: AdminDichaInternalProviderSyncSchema,
    responses: {
      200: AdminDichaInternalProviderSyncResponseSchema,
    },
    summary: 'Sync models for a Dicha AI internal upstream provider',
  },
  updateDichaModel: {
    method: 'POST',
    path: '/admin/ai/dicha-service/models',
    body: AdminDichaModelUpdateSchema,
    responses: {
      200: AdminDichaAiServiceOverviewSchema,
    },
    summary: 'Update a Dicha AI model mapping and display settings',
  },
  getDichaAiUsage: {
    method: 'GET',
    path: '/admin/ai/dicha-usage',
    query: AdminDichaAiUsageQuerySchema,
    responses: {
      200: AdminDichaAiUsageReportSchema,
    },
    summary: 'Super admin Dicha AI official usage analytics',
  },
  getDichaAiDiagnostics: {
    method: 'GET',
    path: '/admin/ai/dicha-diagnostics',
    query: AdminDichaAiDiagnosticsQuerySchema,
    responses: {
      200: AdminDichaAiDiagnosticsReportSchema,
    },
    summary: 'Super admin Dicha AI request diagnostics',
  },
  getCreditRules: {
    method: 'GET',
    path: '/admin/credits/rules',
    responses: {
      200: AdminCreditRulesOverviewSchema,
    },
    summary: 'Super admin credit conversion rules',
  },
  getCreditOperations: {
    method: 'GET',
    path: '/admin/credits/operations',
    query: AdminCreditOperationsQuerySchema,
    responses: {
      200: AdminCreditOperationsReportSchema,
    },
    summary: 'Super admin credit operations analytics',
  },
  upsertCreditRule: {
    method: 'POST',
    path: '/admin/credits/rules',
    body: AdminCreditRuleUpsertSchema,
    responses: {
      200: AdminCreditRuleSchema,
    },
    summary: 'Create or update a credit conversion rule',
  },
  grantCredits: {
    method: 'POST',
    path: '/admin/credits/grants',
    body: AdminCreditGrantSchema,
    responses: {
      200: AdminCreditGrantResponseSchema,
    },
    summary: 'Grant credits to a user',
  },
  listCreditBalances: {
    method: 'GET',
    path: '/admin/credits/balances',
    query: AdminCreditBalancesQuerySchema,
    responses: {
      200: AdminCreditBalancesPageSchema,
    },
    summary: 'List user credit balances',
  },
  listCreditLedger: {
    method: 'GET',
    path: '/admin/credits/ledger',
    query: AdminCreditLedgerQuerySchema,
    responses: {
      200: AdminCreditLedgerPageSchema,
    },
    summary: 'List credit ledger entries',
  },
  getCreditRedemptionCodes: {
    method: 'GET',
    path: '/admin/credits/redemption-codes',
    responses: {
      200: AdminCreditRedemptionCodesOverviewSchema,
    },
    summary: 'List credit redemption codes',
  },
  upsertCreditRedemptionCode: {
    method: 'POST',
    path: '/admin/credits/redemption-codes',
    body: AdminCreditRedemptionCodeUpsertSchema,
    responses: {
      200: AdminCreditRedemptionCodeSchema,
    },
    summary: 'Create or update a credit redemption code',
  },
});
