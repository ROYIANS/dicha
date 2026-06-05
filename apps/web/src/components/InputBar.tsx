import { Camera, QrCode, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from './GlassPanel';

function handleStub() {
  toast.info('录入功能即将开放');
}

export function InputBar() {
  const { t } = useTranslation();

  return (
    <GlassPanel
      variant="strong"
      className="rounded-none border-t border-white/20 border-l-0 border-r-0 border-b-0 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        {/* Add button */}
        <button
          onClick={handleStub}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0 hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
        </button>

        {/* Input field */}
        <button
          onClick={handleStub}
          className="flex-1 h-9 px-4 rounded-full bg-white/30 border border-white/40 text-sm text-gray-400 text-left hover:bg-white/40 transition-colors"
        >
          {t('inputBar.placeholder')}
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleStub}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-gray-500 transition-colors"
          >
            <Camera size={16} />
          </button>
          <button
            onClick={handleStub}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-gray-500 transition-colors"
          >
            <QrCode size={16} />
          </button>
          <button
            onClick={handleStub}
            className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-violet-500 transition-colors"
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}
