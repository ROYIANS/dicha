import { createFileRoute, redirect } from '@tanstack/react-router';
import { AiInvokeDemoPage } from '@/features/settings/ai-invoke-demo-page';

export const Route = createFileRoute('/_app/settings/ai-invoke-demo')({
  beforeLoad: ({ context }) => {
    if (!context.user?.isSuperAdmin) {
      throw redirect({ to: '/settings' });
    }
  },
  component: AiInvokeDemoPage,
});
