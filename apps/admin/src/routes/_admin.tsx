import { createFileRoute, redirect } from '@tanstack/react-router';
import { authQueryOptions } from '@/api/auth';
import { AdminShell } from '@/components/AdminShell';

export const Route = createFileRoute('/_admin')({
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(authQueryOptions());
      if (!user.isSuperAdmin) {
        throw redirect({ to: '/unauthorized' });
      }
      return { user };
    } catch (error) {
      if (isRedirect(error)) throw error;
      throw redirect({ to: '/login' });
    }
  },
  component: AdminShell,
});

function isRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isRedirect' in error &&
    (error as { isRedirect?: unknown }).isRedirect === true
  );
}
