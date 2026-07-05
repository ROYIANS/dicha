import { queryOptions } from '@tanstack/react-query';
import {
  AdminAuditLogsPageSchema,
  AdminAiProviderDirectoryItemSchema,
  AdminAiProviderDirectoryOverviewSchema,
  AdminAiProviderDirectorySyncResponseSchema,
  AdminAiInternalProviderSchema,
  AdminCreditBalanceItemSchema,
  AdminCreditBalancesPageSchema,
  AdminCreditGrantResponseSchema,
  AdminCreditLedgerPageSchema,
  AdminCreditOperationsReportSchema,
  AdminCreditRedemptionCodeSchema,
  AdminCreditRedemptionCodesOverviewSchema,
  AdminCreditRuleSchema,
  AdminCreditRulesOverviewSchema,
  AdminDichaAiServiceOverviewSchema,
  AdminDichaAiDiagnosticsReportSchema,
  AdminDichaAiUsageReportSchema,
  AdminDichaInternalProviderSyncResponseSchema,
  AdminOverviewSchema,
  AdminPermissionSummarySchema,
  AdminSystemActionResultSchema,
  AdminSystemOperationsSchema,
  AdminUserSecurityActionResponseSchema,
  AdminUserDetailSchema,
  AdminUsersListSchema,
  type AdminAuditLogsPage,
  type AdminAuditLogsQuery,
  type AdminAiInternalProvider,
  type AdminAiInternalProviderUpsert,
  type AdminAiProviderDirectoryItem,
  type AdminAiProviderDirectoryModelUpdate,
  type AdminAiProviderDirectoryOverview,
  type AdminAiProviderDirectorySyncResponse,
  type AdminAiProviderDirectoryUpdate,
  type AdminCreditBalanceItem,
  type AdminCreditBalancesPage,
  type AdminCreditBalancesQuery,
  type AdminCreditGrant,
  type AdminCreditGrantResponse,
  type AdminCreditLedgerPage,
  type AdminCreditLedgerQuery,
  type AdminCreditOperationsQuery,
  type AdminCreditOperationsReport,
  type AdminCreditRedemptionCode,
  type AdminCreditRedemptionCodeUpsert,
  type AdminCreditRedemptionCodesOverview,
  type AdminCreditRule,
  type AdminCreditRulesOverview,
  type AdminCreditRuleUpsert,
  type AdminDichaAiServiceOverview,
  type AdminDichaAiDiagnosticsQuery,
  type AdminDichaAiDiagnosticsReport,
  type AdminDichaAiUsageReport,
  type AdminDichaInternalProviderSyncResponse,
  type AdminDichaModelUpdate,
  type AdminOverview,
  type AdminPermissionSummary,
  type AdminSystemActionResult,
  type AdminSystemActionRun,
  type AdminSystemOperations,
  type AdminUserDetail,
  type AdminUserSecurityActionResponse,
  type AdminUsersList,
  type AdminUserStatusUpdate,
  type AiUsageWindow,
  type AiInvokeRequest,
} from '@dicha/shared';
import { api } from './client';
import { env } from '@/lib/env';
import { streamAiInvokeEvents, type AiInvokeStreamHandlers } from './ai-stream';

export type AdminUsersQueryInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'active' | 'disabled';
  emailVerified?: boolean;
};

export type AdminDichaAiUsageQueryInput = {
  window?: AiUsageWindow;
  logLimit?: number;
};
export type AdminDichaAiDiagnosticsQueryInput = Partial<AdminDichaAiDiagnosticsQuery>;

export type AdminCreditBalancesQueryInput = Partial<AdminCreditBalancesQuery>;
export type AdminCreditLedgerQueryInput = Partial<AdminCreditLedgerQuery>;
export type AdminCreditOperationsQueryInput = Partial<AdminCreditOperationsQuery>;
export type AdminAuditLogsQueryInput = Partial<AdminAuditLogsQuery>;

export async function invokeAdminAiStream(
  body: AiInvokeRequest,
  handlers: AiInvokeStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  await streamAiInvokeEvents(
    {
      url: `${env.VITE_API_BASE_URL}/ai/invoke/stream`,
      body,
      credentials: 'include',
      signal,
    },
    handlers,
  );
}

export function adminOverviewQueryOptions() {
  return queryOptions<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const res = await api.admin.getOverview();
      if (res.status !== 200) {
        throw new Error(`Admin overview request failed (${res.status})`);
      }
      return AdminOverviewSchema.parse(res.body);
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function adminUsersQueryOptions(query: AdminUsersQueryInput) {
  return queryOptions<AdminUsersList>({
    queryKey: ['admin', 'users', query] as const,
    queryFn: async () => {
      const res = await api.admin.listUsers({ query });
      if (res.status !== 200) {
        throw new Error(`Admin users request failed (${res.status})`);
      }
      return AdminUsersListSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function adminUserDetailQueryOptions(id: string) {
  return queryOptions<AdminUserDetail>({
    queryKey: ['admin', 'users', id] as const,
    queryFn: async () => {
      const res = await api.admin.getUser({ params: { id } });
      if (res.status !== 200) {
        throw new Error(`Admin user detail request failed (${res.status})`);
      }
      return AdminUserDetailSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export async function updateAdminUserStatus(
  id: string,
  body: AdminUserStatusUpdate,
): Promise<AdminUserSecurityActionResponse> {
  const res = await api.admin.updateUserStatus({ params: { id }, body });
  if (res.status !== 200) {
    throw new Error(`Admin user status update failed (${res.status})`);
  }
  return AdminUserSecurityActionResponseSchema.parse(res.body);
}

export async function revokeAdminUserSessions(
  id: string,
): Promise<AdminUserSecurityActionResponse> {
  const res = await api.admin.revokeUserSessions({ params: { id }, body: {} });
  if (res.status !== 200) {
    throw new Error(`Admin user session revoke failed (${res.status})`);
  }
  return AdminUserSecurityActionResponseSchema.parse(res.body);
}

export function adminPermissionSummaryQueryOptions() {
  return queryOptions<AdminPermissionSummary>({
    queryKey: ['admin', 'permissions'] as const,
    queryFn: async () => {
      const res = await api.admin.getPermissionSummary();
      if (res.status !== 200) {
        throw new Error(`Admin permission summary request failed (${res.status})`);
      }
      return AdminPermissionSummarySchema.parse(res.body);
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function adminAuditLogsQueryOptions(query: AdminAuditLogsQueryInput = {}) {
  const normalizedQuery = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
    window: query.window ?? '7d',
    action: query.action,
    resourceType: query.resourceType,
    result: query.result,
    search: query.search,
  };
  return queryOptions<AdminAuditLogsPage>({
    queryKey: ['admin', 'audit-logs', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.listAuditLogs({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin audit log request failed (${res.status})`);
      }
      return AdminAuditLogsPageSchema.parse(res.body);
    },
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function adminSystemOperationsQueryOptions() {
  return queryOptions<AdminSystemOperations>({
    queryKey: ['admin', 'system', 'operations'] as const,
    queryFn: async () => {
      const res = await api.admin.getSystemOperations();
      if (res.status !== 200) {
        throw new Error(`Admin system operations request failed (${res.status})`);
      }
      return AdminSystemOperationsSchema.parse(res.body);
    },
    staleTime: 15 * 1000,
    retry: false,
  });
}

export async function runAdminSystemAction(
  body: AdminSystemActionRun,
): Promise<AdminSystemActionResult> {
  const res = await api.admin.runSystemAction({ body });
  if (res.status !== 200) {
    throw new Error(`Admin system action failed (${res.status})`);
  }
  return AdminSystemActionResultSchema.parse(res.body);
}

export function adminAiProviderDirectoryQueryOptions() {
  return queryOptions<AdminAiProviderDirectoryOverview>({
    queryKey: ['admin', 'ai', 'provider-directory'] as const,
    queryFn: async () => {
      const res = await api.admin.getAiProviderDirectory();
      if (res.status !== 200) {
        throw new Error(`Admin AI provider directory request failed (${res.status})`);
      }
      return AdminAiProviderDirectoryOverviewSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export async function updateAdminAiProviderDirectory(
  body: AdminAiProviderDirectoryUpdate,
): Promise<AdminAiProviderDirectoryItem> {
  const res = await api.admin.updateAiProviderDirectory({ body });
  if (res.status !== 200) {
    throw new Error(`Admin AI provider directory update failed (${res.status})`);
  }
  return AdminAiProviderDirectoryItemSchema.parse(res.body);
}

export async function syncAdminAiProviderDirectoryModels(
  providerId: string,
): Promise<AdminAiProviderDirectorySyncResponse> {
  const res = await api.admin.syncAiProviderDirectoryModels({ body: { providerId } });
  if (res.status !== 200) {
    throw new Error(`Admin AI provider directory sync failed (${res.status})`);
  }
  return AdminAiProviderDirectorySyncResponseSchema.parse(res.body);
}

export async function updateAdminAiProviderDirectoryModel(
  body: AdminAiProviderDirectoryModelUpdate,
): Promise<AdminAiProviderDirectoryOverview> {
  const res = await api.admin.updateAiProviderDirectoryModel({ body });
  if (res.status !== 200) {
    throw new Error(`Admin AI provider directory model update failed (${res.status})`);
  }
  return AdminAiProviderDirectoryOverviewSchema.parse(res.body);
}

export function adminDichaAiServiceQueryOptions() {
  return queryOptions<AdminDichaAiServiceOverview>({
    queryKey: ['admin', 'ai', 'dicha-service'] as const,
    queryFn: async () => {
      const res = await api.admin.getDichaAiService();
      if (res.status !== 200) {
        throw new Error(`Admin Dicha AI service request failed (${res.status})`);
      }
      return AdminDichaAiServiceOverviewSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export async function upsertAdminDichaInternalProvider(
  body: AdminAiInternalProviderUpsert,
): Promise<AdminAiInternalProvider> {
  const res = await api.admin.upsertDichaInternalProvider({ body });
  if (res.status !== 200) {
    throw new Error(`Admin Dicha internal provider save failed (${res.status})`);
  }
  return AdminAiInternalProviderSchema.parse(res.body);
}

export async function syncAdminDichaInternalProviderModels(
  providerId: string,
): Promise<AdminDichaInternalProviderSyncResponse> {
  const res = await api.admin.syncDichaInternalProviderModels({ body: { providerId } });
  if (res.status !== 200) {
    throw new Error(`Admin Dicha internal provider sync failed (${res.status})`);
  }
  return AdminDichaInternalProviderSyncResponseSchema.parse(res.body);
}

export async function updateAdminDichaModel(
  body: AdminDichaModelUpdate,
): Promise<AdminDichaAiServiceOverview> {
  const res = await api.admin.updateDichaModel({ body });
  if (res.status !== 200) {
    throw new Error(`Admin Dicha model update failed (${res.status})`);
  }
  return AdminDichaAiServiceOverviewSchema.parse(res.body);
}

export function adminDichaAiUsageQueryOptions(
  query: AdminDichaAiUsageQueryInput | AiUsageWindow = '7d',
) {
  const normalizedQuery =
    typeof query === 'string'
      ? { window: query, logLimit: 500 }
      : { window: query.window ?? '7d', logLimit: query.logLimit ?? 500 };
  return queryOptions<AdminDichaAiUsageReport>({
    queryKey: ['admin', 'ai', 'dicha-usage', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.getDichaAiUsage({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin Dicha AI usage request failed (${res.status})`);
      }
      return AdminDichaAiUsageReportSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function adminDichaAiDiagnosticsQueryOptions(query: AdminDichaAiDiagnosticsQueryInput = {}) {
  const normalizedQuery = {
    window: query.window ?? '7d',
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
    ...(query.status ? { status: query.status } : {}),
    ...(query.errorCategory ? { errorCategory: query.errorCategory } : {}),
    ...(query.requestId ? { requestId: query.requestId } : {}),
    ...(query.userSearch ? { userSearch: query.userSearch } : {}),
    ...(query.modelSearch ? { modelSearch: query.modelSearch } : {}),
    ...(query.internalChannelId ? { internalChannelId: query.internalChannelId } : {}),
  };
  return queryOptions<AdminDichaAiDiagnosticsReport>({
    queryKey: ['admin', 'ai', 'dicha-diagnostics', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.getDichaAiDiagnostics({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin Dicha AI diagnostics request failed (${res.status})`);
      }
      return AdminDichaAiDiagnosticsReportSchema.parse(res.body);
    },
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function adminCreditRulesQueryOptions() {
  return queryOptions<AdminCreditRulesOverview>({
    queryKey: ['admin', 'credits', 'rules'] as const,
    queryFn: async () => {
      const res = await api.admin.getCreditRules();
      if (res.status !== 200) {
        throw new Error(`Admin credit rules request failed (${res.status})`);
      }
      return AdminCreditRulesOverviewSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function adminCreditOperationsQueryOptions(query: AdminCreditOperationsQueryInput = {}) {
  const normalizedQuery = {
    window: query.window ?? '7d',
  };
  return queryOptions<AdminCreditOperationsReport>({
    queryKey: ['admin', 'credits', 'operations', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.getCreditOperations({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin credit operations request failed (${res.status})`);
      }
      return AdminCreditOperationsReportSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export async function upsertAdminCreditRule(body: AdminCreditRuleUpsert): Promise<AdminCreditRule> {
  const res = await api.admin.upsertCreditRule({ body });
  if (res.status !== 200) {
    throw new Error(`Admin credit rule save failed (${res.status})`);
  }
  return AdminCreditRuleSchema.parse(res.body);
}

export async function grantAdminCredits(body: AdminCreditGrant): Promise<AdminCreditGrantResponse> {
  const res = await api.admin.grantCredits({ body });
  if (res.status !== 200) {
    throw new Error(`Admin credit grant failed (${res.status})`);
  }
  return AdminCreditGrantResponseSchema.parse(res.body);
}

export function adminCreditBalancesQueryOptions(query: AdminCreditBalancesQueryInput = {}) {
  const normalizedQuery = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 30,
    search: query.search,
  };
  return queryOptions<AdminCreditBalancesPage>({
    queryKey: ['admin', 'credits', 'balances', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.listCreditBalances({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin credit balances request failed (${res.status})`);
      }
      return AdminCreditBalancesPageSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function adminCreditLedgerQueryOptions(query: AdminCreditLedgerQueryInput = {}) {
  const normalizedQuery = {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
    search: query.search,
    type: query.type,
    ownerId: query.ownerId,
  };
  return queryOptions<AdminCreditLedgerPage>({
    queryKey: ['admin', 'credits', 'ledger', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.listCreditLedger({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin credit ledger request failed (${res.status})`);
      }
      return AdminCreditLedgerPageSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function adminCreditRedemptionCodesQueryOptions() {
  return queryOptions<AdminCreditRedemptionCodesOverview>({
    queryKey: ['admin', 'credits', 'redemption-codes'] as const,
    queryFn: async () => {
      const res = await api.admin.getCreditRedemptionCodes();
      if (res.status !== 200) {
        throw new Error(`Admin credit redemption codes request failed (${res.status})`);
      }
      return AdminCreditRedemptionCodesOverviewSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export async function upsertAdminCreditRedemptionCode(
  body: AdminCreditRedemptionCodeUpsert,
): Promise<AdminCreditRedemptionCode> {
  const res = await api.admin.upsertCreditRedemptionCode({ body });
  if (res.status !== 200) {
    throw new Error(`Admin credit redemption code save failed (${res.status})`);
  }
  return AdminCreditRedemptionCodeSchema.parse(res.body);
}

export { AdminCreditBalanceItemSchema };
export type { AdminCreditBalanceItem };
