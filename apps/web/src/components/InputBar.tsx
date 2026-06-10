import { Camera, QrCode, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function handleStub() {
  toast.info('录入功能即将开放');
}

export function InputBar() {
  const { t } = useTranslation();

  return (
    <div className="border-t border-hairline bg-canvas px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={handleStub}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-surface shadow-card transition-opacity hover:opacity-90"
        >
          <Plus size={18} />
        </button>

        <button
          onClick={handleStub}
          className="h-9 min-w-0 flex-1 rounded-full border border-hairline bg-surface px-3 text-left text-sm text-ink-faint transition-colors hover:bg-surface-alt sm:px-4"
        >
          <span className="truncate">{t('inputBar.placeholder')}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            onClick={handleStub}
            className="flex size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface"
          >
            <Camera size={16} />
          </button>
          <button
            onClick={handleStub}
            className="hidden size-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface sm:flex"
          >
            <QrCode size={16} />
          </button>
          <button
            onClick={handleStub}
            className="flex size-8 items-center justify-center rounded-lg text-lavender transition-colors hover:bg-surface"
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
