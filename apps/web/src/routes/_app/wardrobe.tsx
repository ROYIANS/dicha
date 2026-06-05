import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Shirt } from 'lucide-react';
import { Surface } from '@/components/Surface';

export const Route = createFileRoute('/_app/wardrobe')({
  component: WardrobePage,
});

function WardrobePage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-ink">{t('wardrobePage.title')}</h1>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-surface-alt border border-hairline text-ink-soft">
          {t('wardrobePage.comingSoon')}
        </span>
      </div>
      <Surface variant="card" className="p-12 flex flex-col items-center gap-4">
        <Shirt size={48} className="text-ink-faint" />
        <p className="text-ink-faint text-sm">{t('wardrobePage.comingSoon')}</p>
      </Surface>
    </div>
  );
}
