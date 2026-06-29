import { createFileRoute } from '@tanstack/react-router';
import { LanguageSettingsPage } from '@/features/settings/secondary-pages';

export const Route = createFileRoute('/_app/settings/language')({
  component: LanguageSettingsPage,
});
