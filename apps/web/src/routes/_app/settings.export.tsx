import { createFileRoute } from '@tanstack/react-router';
import { ExportSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/export')({
  component: ExportSettingsPage,
});
