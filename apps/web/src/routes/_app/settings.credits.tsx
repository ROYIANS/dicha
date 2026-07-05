import { createFileRoute } from '@tanstack/react-router';
import {
  creditBalanceQueryOptions,
  creditCheckInQueryOptions,
  creditLedgerQueryOptions,
} from '@/api/credits';
import { CreditsSettingsPage } from '@/features/settings/credits-page';

export const Route = createFileRoute('/_app/settings/credits')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(creditCheckInQueryOptions());
    return Promise.all([
      context.queryClient.ensureQueryData(creditBalanceQueryOptions()),
      context.queryClient.ensureQueryData(creditLedgerQueryOptions({ page: 1, pageSize: 30 })),
    ]);
  },
  component: CreditsSettingsPage,
});
