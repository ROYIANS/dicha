import { createFileRoute } from '@tanstack/react-router';
import { AppearanceSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/appearance')({
  component: AppearanceSettingsPage,
});
