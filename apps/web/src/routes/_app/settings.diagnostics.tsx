import { createFileRoute } from '@tanstack/react-router';
import { DiagnosticsSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/diagnostics')({
  component: DiagnosticsSettingsPage,
});
