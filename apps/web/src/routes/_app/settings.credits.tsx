import { createFileRoute } from '@tanstack/react-router';
import { creditBalanceQueryOptions, creditLedgerQueryOptions } from '@/api/credits';
import { CreditsSettingsPage } from '@/features/settings/credits-page';

export const Route = createFileRoute('/_app/settings/credits')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(creditBalanceQueryOptions()),
      context.queryClient.ensureQueryData(creditLedgerQueryOptions({ page: 1, pageSize: 30 })),
    ]),
  component: CreditsSettingsPage,
});
