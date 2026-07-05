import { queryOptions } from '@tanstack/react-query';
import {
  CreditBalanceReportSchema,
  CreditCheckInResponseSchema,
  CreditCheckInStatusSchema,
  CreditLedgerPageSchema,
  CreditRedeemResponseSchema,
  type CreditLedgerQuery,
} from '@dicha/shared';
import { api } from './client';

export const creditBalanceQueryOptions = () =>
  queryOptions({
    queryKey: ['credits', 'balance'] as const,
    queryFn: async ({ signal }) => {
      const res = await api.credits.getBalance({ fetchOptions: { signal } });
      if (res.status === 200) {
        return CreditBalanceReportSchema.parse(res.body);
      }
      throw new Error(`Credit balance request failed (${res.status})`);
    },
    staleTime: 30 * 1000,
  });

export const creditLedgerQueryOptions = (query: CreditLedgerQuery) =>
  queryOptions({
    queryKey: ['credits', 'ledger', query] as const,
    queryFn: async ({ signal }) => {
      const res = await api.credits.getLedger({ query, fetchOptions: { signal } });
      if (res.status === 200) {
        return CreditLedgerPageSchema.parse(res.body);
      }
      throw new Error(`Credit ledger request failed (${res.status})`);
    },
    staleTime: 30 * 1000,
  });

export const creditCheckInQueryOptions = () =>
  queryOptions({
    queryKey: ['credits', 'check-in'] as const,
    queryFn: async ({ signal }) => {
      const res = await api.credits.getCheckInStatus({ fetchOptions: { signal } });
      if (res.status === 200) {
        return CreditCheckInStatusSchema.parse(res.body);
      }
      throw new Error(`Credit check-in status request failed (${res.status})`);
    },
    staleTime: 30 * 1000,
  });

export async function redeemCreditCode(code: string) {
  const res = await api.credits.redeemCode({ body: { code } });
  if (res.status === 200) {
    return CreditRedeemResponseSchema.parse(res.body);
  }
  if (res.status === 400) {
    throw new Error(res.body.message);
  }
  throw new Error(`Credit redemption failed (${res.status})`);
}

export async function checkInToday() {
  const res = await api.credits.checkInToday({ body: {} });
  if (res.status === 200) {
    return CreditCheckInResponseSchema.parse(res.body);
  }
  if (res.status === 400) {
    throw new Error(res.body.message);
  }
  throw new Error(`Credit check-in failed (${res.status})`);
}
