import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Shirt } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';

export const Route = createFileRoute('/_app/wardrobe')({
  component: WardrobePage,
});

function WardrobePage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('wardrobePage.title')}</h1>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-600">
          {t('wardrobePage.comingSoon')}
        </span>
      </div>
      <GlassPanel variant="subtle" className="p-12 flex flex-col items-center gap-4">
        <Shirt size={48} className="text-gray-300" />
        <p className="text-gray-400 text-sm">{t('wardrobePage.comingSoon')}</p>
      </GlassPanel>
    </div>
  );
}
