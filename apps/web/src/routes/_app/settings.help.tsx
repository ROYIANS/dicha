import { createFileRoute } from '@tanstack/react-router';
import { HelpSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/help')({
  component: HelpSettingsPage,
});
