import { createFileRoute } from '@tanstack/react-router';
import { AboutSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/about')({
  component: AboutSettingsPage,
});
