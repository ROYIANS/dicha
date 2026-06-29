import { createFileRoute } from '@tanstack/react-router';
import { ProfileSettingsPage } from '@/routes/_app/account';

export const Route = createFileRoute('/_app/settings/profile')({
  component: ProfileSettingsPage,
});
