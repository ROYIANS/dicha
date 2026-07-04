import { queryOptions } from '@tanstack/react-query';
import {
  AdminAiProviderDirectoryItemSchema,
  AdminAiProviderDirectoryOverviewSchema,
  AdminAiProviderDirectorySyncResponseSchema,
  AdminAiInternalProviderSchema,
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
  type AdminDichaAiServiceOverview,
  type AdminDichaAiUsageReport,
  type AdminDichaInternalProviderSyncResponse,
  type AdminDichaModelUpdate,
  type AdminOverview,
  type AdminUserDetail,
  type AdminUsersList,
  type AiUsageWindow,
} from '@dicha/shared';
import { api } from './client';

export type AdminUsersQueryInput = {
  page?: number;
  pageSize?: number;
  search?: string;
};

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

export function adminDichaAiUsageQueryOptions(window: AiUsageWindow = '7d') {
  return queryOptions<AdminDichaAiUsageReport>({
    queryKey: ['admin', 'ai', 'dicha-usage', window] as const,
    queryFn: async () => {
      const res = await api.admin.getDichaAiUsage({ query: { window } });
      if (res.status !== 200) {
        throw new Error(`Admin DicHA AI usage request failed (${res.status})`);
      }
      return AdminDichaAiUsageReportSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}
