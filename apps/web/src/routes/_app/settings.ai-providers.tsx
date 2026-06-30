import { createFileRoute } from '@tanstack/react-router';
import { AiProvidersSettingsPage } from '@/features/settings/ai-settings-pages';

export const Route = createFileRoute('/_app/settings/ai-providers')({
  component: AiProvidersSettingsPage,
});
