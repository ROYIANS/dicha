import { Camera, Plus, QrCode, ScanLine, Sparkles } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

type ActionItem = {
  label: 'inputBar.actions.record' | 'inputBar.actions.camera' | 'inputBar.actions.scan' | 'inputBar.actions.ai';
  icon: ComponentType<{ size?: number; className?: string }>;
  className: string;
};

function handleStub(label: string) {
  toast.info(`${label}功能即将开放`);
}

const actions: ActionItem[] = [
  { label: 'inputBar.actions.record', icon: ScanLine, className: 'app-action-dial-item--record' },
  { label: 'inputBar.actions.camera', icon: Camera, className: 'app-action-dial-item--camera' },
  { label: 'inputBar.actions.scan', icon: QrCode, className: 'app-action-dial-item--scan' },
  { label: 'inputBar.actions.ai', icon: Sparkles, className: 'app-action-dial-item--ai' },
];

/** 右下角浮动录入动作盘 — 默认只露出小白点，hover/focus/click 展开快捷动作。 */
export function InputBar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [suppressHover, setSuppressHover] = useState(false);

  return (
    <div
      className="app-action-dial group"
      data-open={open ? 'true' : undefined}
      data-suppress-hover={suppressHover ? 'true' : undefined}
      onPointerEnter={() => setSuppressHover(false)}
      onPointerLeave={() => {
        setOpen(false);
        setSuppressHover(false);
        setActiveLabel(null);
      }}
    >
      <div className="app-action-dial-plate" aria-hidden />

      <div className="app-action-dial-anchor">
        <button
          type="button"
          onClick={() => {
            setOpen((value) => {
              const nextOpen = !value;
              setSuppressHover(!nextOpen);
              return nextOpen;
            });
          }}
          className="app-action-dial-main"
          aria-label={t('inputBar.add')}
          aria-expanded={open}
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="app-action-dial-actions">
        {actions.map((action, index) => {
          const Icon = action.icon;
          const label = t(action.label);

          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                handleStub(label);
                setOpen(false);
                setActiveLabel(null);
              }}
              onPointerEnter={() => setActiveLabel(label)}
              onPointerLeave={() => setActiveLabel(null)}
              onFocus={() => setActiveLabel(label)}
              onBlur={() => setActiveLabel(null)}
              className={`app-action-dial-item ${action.className}`}
              style={{ transitionDelay: `${index * 22}ms` }}
              aria-label={label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="app-action-dial-hint" data-visible={activeLabel ? 'true' : undefined} aria-hidden>
        {activeLabel}
      </div>
    </div>
  );
}
