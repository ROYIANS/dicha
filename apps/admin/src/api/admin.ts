import { queryOptions } from '@tanstack/react-query';
import {
  AdminAiProviderDirectoryItemSchema,
  AdminAiProviderDirectoryOverviewSchema,
  AdminAiProviderDirectorySyncResponseSchema,
  AdminAiInternalProviderSchema,
  AdminCreditBalanceItemSchema,
  AdminCreditBalancesPageSchema,
  AdminCreditGrantResponseSchema,
  AdminCreditLedgerPageSchema,
  AdminCreditRedemptionCodeSchema,
  AdminCreditRedemptionCodesOverviewSchema,
  AdminCreditRuleSchema,
  AdminCreditRulesOverviewSchema,
  AdminDichaAiServiceOverviewSchema,
  AdminDichaAiUsageReportSchema,
  AdminDichaInternalProviderSyncResponseSchema,
  AdminOverviewSchema,
  AdminUserDetailSchema,
  AdminUsersListSchema,
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
  type AdminCreditRedemptionCode,
  type AdminCreditRedemptionCodeUpsert,
  type AdminCreditRedemptionCodesOverview,
  type AdminCreditRule,
  type AdminCreditRulesOverview,
  type AdminCreditRuleUpsert,
  type AdminDichaAiServiceOverview,
  type AdminDichaAiUsageReport,
  type AdminDichaInternalProviderSyncResponse,
  type AdminDichaModelUpdate,
  type AdminOverview,
  type AdminUserDetail,
  type AdminUsersList,
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
};

export type AdminDichaAiUsageQueryInput = {
  window?: AiUsageWindow;
  logLimit?: number;
};

export type AdminCreditBalancesQueryInput = Partial<AdminCreditBalancesQuery>;
export type AdminCreditLedgerQueryInput = Partial<AdminCreditLedgerQuery>;

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
        throw new Error(`Admin DicHA AI service request failed (${res.status})`);
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
    throw new Error(`Admin DicHA internal provider save failed (${res.status})`);
  }
  return AdminAiInternalProviderSchema.parse(res.body);
}

export async function syncAdminDichaInternalProviderModels(
  providerId: string,
): Promise<AdminDichaInternalProviderSyncResponse> {
  const res = await api.admin.syncDichaInternalProviderModels({ body: { providerId } });
  if (res.status !== 200) {
    throw new Error(`Admin DicHA internal provider sync failed (${res.status})`);
  }
  return AdminDichaInternalProviderSyncResponseSchema.parse(res.body);
}

export async function updateAdminDichaModel(
  body: AdminDichaModelUpdate,
): Promise<AdminDichaAiServiceOverview> {
  const res = await api.admin.updateDichaModel({ body });
  if (res.status !== 200) {
    throw new Error(`Admin DicHA model update failed (${res.status})`);
  }
  return AdminDichaAiServiceOverviewSchema.parse(res.body);
}

export function adminDichaAiUsageQueryOptions(query: AdminDichaAiUsageQueryInput | AiUsageWindow = '7d') {
  const normalizedQuery =
    typeof query === 'string'
      ? { window: query, logLimit: 500 }
      : { window: query.window ?? '7d', logLimit: query.logLimit ?? 500 };
  return queryOptions<AdminDichaAiUsageReport>({
    queryKey: ['admin', 'ai', 'dicha-usage', normalizedQuery] as const,
    queryFn: async () => {
      const res = await api.admin.getDichaAiUsage({ query: normalizedQuery });
      if (res.status !== 200) {
        throw new Error(`Admin DicHA AI usage request failed (${res.status})`);
      }
      return AdminDichaAiUsageReportSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
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
