import { createFileRoute } from '@tanstack/react-router';
import { NotificationSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/notifications')({
  component: NotificationSettingsPage,
});
