import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { actionItems, handleActionStub } from '@/components/actionItems';
import { DotsBackdrop } from '@/components/DotsBackdrop';
import { HeroButton } from '@/components/HeroControls';

type MobileActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileActionSheet({ open, onOpenChange }: MobileActionSheetProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (typeof document === 'undefined' || !open) return null;

  const close = () => onOpenChange(false);

  return createPortal(
    <>
      <HeroButton
        type="button"
        aria-label={t('inputBar.mobileClose')}
        className="app-mobile-actions-backdrop fixed inset-0 z-[210] lg:hidden"
        onClick={close}
      >
        <DotsBackdrop visible={open} className="pointer-events-none absolute inset-0 size-full" />
      </HeroButton>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('inputBar.mobileTitle')}
        className="app-mobile-actions-sheet fixed inset-x-3 bottom-3 z-[211] lg:hidden"
      >
        <div className="app-mobile-actions-handle" aria-hidden />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{t('inputBar.mobileTitle')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t('inputBar.mobileSubtitle')}</p>
          </div>
          <HeroButton
            ref={closeRef}
            type="button"
            aria-label={t('inputBar.mobileClose')}
            className="app-icon-btn inline-flex size-8 shrink-0 items-center justify-center rounded-md"
            onClick={close}
          >
            <X size={16} />
          </HeroButton>
        </div>
        <div className="app-mobile-actions-grid">
          {actionItems.map((action, index) => {
            const Icon = action.icon;
            const label = t(action.label);

            return (
              <HeroButton
                key={label}
                type="button"
                className="app-mobile-actions-item"
                style={{ transitionDelay: `${80 + index * 34}ms` }}
                onClick={() => {
                  handleActionStub(label);
                  close();
                }}
              >
                <span className="app-mobile-actions-icon">
                  <Icon size={21} />
                </span>
                <span className="text-[13px] font-medium leading-tight text-ink">{label}</span>
              </HeroButton>
            );
          })}
        </div>
      </section>
    </>,
    document.body,
  );
}
