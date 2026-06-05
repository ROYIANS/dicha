import { Camera, QrCode, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function handleStub() {
  toast.info('录入功能即将开放');
}

export function InputBar() {
  const { t } = useTranslation();

  return (
    <div className="bg-canvas border-t border-hairline px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Add button — primary action, warm ink */}
        <button
          onClick={handleStub}
          className="w-9 h-9 rounded-full bg-ink flex items-center justify-center text-surface shadow-card shrink-0 hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
        </button>

        {/* Input field */}
        <button
          onClick={handleStub}
          className="flex-1 h-9 px-4 rounded-full bg-surface border border-hairline text-sm text-ink-faint text-left hover:bg-surface-alt transition-colors"
        >
          {t('inputBar.placeholder')}
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleStub}
            className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center text-ink-soft transition-colors"
          >
            <Camera size={16} />
          </button>
          <button
            onClick={handleStub}
            className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center text-ink-soft transition-colors"
          >
            <QrCode size={16} />
          </button>
          <button
            onClick={handleStub}
            className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center text-lavender transition-colors"
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
