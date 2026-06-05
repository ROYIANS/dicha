import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { DEV_USER } from '@/lib/auth';

/**
 * Pathless layout route — groups pages that require authentication.
 * URL paths of child routes are NOT prefixed with `_app`.
 *
 * beforeLoad:
 *   - VITE_DEV_BYPASS_AUTH=true → inject DEV_USER into context, allow through.
 *   - Otherwise → redirect to /login (stub; real Casdoor integration is a separate task).
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') {
      return { user: DEV_USER };
    }
    // Real auth guard placeholder — redirect to login when bypass is off.
    throw redirect({ to: '/' });
  },
  component: () => <Outlet />,
});
