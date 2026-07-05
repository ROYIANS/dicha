import { createFileRoute } from '@tanstack/react-router';
import { aiUsageQueryOptions } from '@/api/ai';
import { AiUsageSettingsPage } from '@/features/settings/ai-usage-page';

export const Route = createFileRoute('/_app/settings/ai-usage')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(aiUsageQueryOptions('7d'));
  },
  component: AiUsageSettingsPage,
});
