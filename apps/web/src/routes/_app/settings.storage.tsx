import { createFileRoute } from '@tanstack/react-router';
import { StorageSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/storage')({
  component: StorageSettingsPage,
});
