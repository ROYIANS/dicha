import { Camera, QrCode, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function handleStub() {
  toast.info('录入功能即将开放');
}

/** 底部录入栏 — Zed 式 hairline + mono 输入 + 物理感主按钮。 */
export function InputBar() {
  const { t } = useTranslation();

  return (
    <div className="app-input-bar relative z-10 w-full px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleStub}
          className="lp-btn lp-btn-primary flex size-8 shrink-0 items-center justify-center rounded-md sm:size-9"
          aria-label="添加物品"
        >
          <Plus size={16} />
        </button>

        <button
          type="button"
          onClick={handleStub}
          className="app-input-field app-mono h-8 min-w-0 flex-1 rounded-md border border-hairline bg-surface px-3 text-left text-ink-faint sm:h-9 sm:px-4"
        >
          <span className="truncate">{t('inputBar.placeholder')}</span>
        </button>

        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={handleStub} className="app-icon-btn flex size-8 items-center justify-center rounded-md">
            <Camera size={15} />
          </button>
          <button
            type="button"
            onClick={handleStub}
            className="app-icon-btn hidden size-8 items-center justify-center rounded-md sm:flex"
          >
            <QrCode size={15} />
          </button>
          <button type="button" onClick={handleStub} className="app-icon-btn flex size-8 items-center justify-center rounded-md text-lavender">
            <Sparkles size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
