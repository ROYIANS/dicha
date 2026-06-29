import { createFileRoute } from '@tanstack/react-router';
import { SecuritySettingsPage } from '@/routes/_app/account';

export const Route = createFileRoute('/_app/settings/security')({
  component: SecuritySettingsPage,
});
