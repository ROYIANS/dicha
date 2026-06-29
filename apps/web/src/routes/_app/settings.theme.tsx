import { createFileRoute } from '@tanstack/react-router';
import { ThemeSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/theme')({
  component: ThemeSettingsPage,
});
