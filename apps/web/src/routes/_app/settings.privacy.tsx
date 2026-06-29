import { createFileRoute } from '@tanstack/react-router';
import { PrivacySettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/privacy')({
  component: PrivacySettingsPage,
});
