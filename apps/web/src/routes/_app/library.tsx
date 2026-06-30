import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { Surface } from '@/components/Surface';

export const Route = createFileRoute('/_app/library')({
  component: LibraryPage,
});

function LibraryPage() {
  const { t } = useTranslation();

  return (
    <div className="px-2 py-6 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">{t('libraryPage.title')}</h1>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-alt border border-hairline text-ink-soft">
          {t('libraryPage.comingSoon')}
        </span>
      </div>
      <Surface variant="card" className="p-12 flex flex-col items-center gap-4">
        <BookOpen size={48} className="text-ink-faint" />
        <p className="text-ink-faint text-sm">{t('libraryPage.comingSoon')}</p>
      </Surface>
    </div>
  );
}
