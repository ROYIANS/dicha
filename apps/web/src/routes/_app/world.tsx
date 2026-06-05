import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/_app/world')({
  component: WorldPage,
});

function WorldPage() {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-full flex flex-col items-center justify-center relative"
      style={{
        background:
          'linear-gradient(135deg, oklch(18% 0.04 280) 0%, oklch(12% 0.06 320) 50%, oklch(10% 0.03 260) 100%)',
      }}
    >
      {/* Back button */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white/90 text-sm transition-colors"
        aria-label="返回"
      >
        <ArrowLeft size={16} />
        <span>{t('world.back')}</span>
      </Link>

      {/* Center content */}
      <div className="text-center space-y-4 px-6">
        <Sparkles size={48} className="text-violet-400 mx-auto" />
        <h1 className="text-3xl font-bold text-white">{t('world.title')}</h1>
        <p className="text-white/50 text-sm">{t('world.comingSoon')}</p>
      </div>
    </div>
  );
}
