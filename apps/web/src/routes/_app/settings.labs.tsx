import { createFileRoute } from '@tanstack/react-router';
import { LabsSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/labs')({
  component: LabsSettingsPage,
});
