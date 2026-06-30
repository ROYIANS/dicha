import { createFileRoute } from '@tanstack/react-router';
import { AiModelsSettingsPage } from '@/features/settings/ai-settings-pages';

export const Route = createFileRoute('/_app/settings/ai-models')({
  component: AiModelsSettingsPage,
});
