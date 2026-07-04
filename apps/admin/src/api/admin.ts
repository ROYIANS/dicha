import { queryOptions } from '@tanstack/react-query';
import {
  AdminAiProvidersOverviewSchema,
  AdminAiSystemChannelSchema,
  AdminOverviewSchema,
  AdminUserDetailSchema,
  AdminUsersListSchema,
  type AdminAiProvidersOverview,
  type AdminAiSystemChannel,
  type AdminAiSystemChannelUpsert,
  type AdminOverview,
  type AdminUserDetail,
  type AdminUsersList,
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

export function adminAiProvidersQueryOptions() {
  return queryOptions<AdminAiProvidersOverview>({
    queryKey: ['admin', 'ai', 'providers'] as const,
    queryFn: async () => {
      const res = await api.admin.getAiProviders();
      if (res.status !== 200) {
        throw new Error(`Admin AI providers request failed (${res.status})`);
      }
      return AdminAiProvidersOverviewSchema.parse(res.body);
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

export async function upsertAdminAiSystemChannel(
  body: AdminAiSystemChannelUpsert,
): Promise<AdminAiSystemChannel> {
  const res = await api.admin.upsertAiSystemChannel({ body });
  if (res.status !== 200) {
    throw new Error(`Admin AI system channel save failed (${res.status})`);
  }
  return AdminAiSystemChannelSchema.parse(res.body);
}
