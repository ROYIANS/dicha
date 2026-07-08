import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AppBrand } from '@/components/AppBrand';
import { DotsBackdrop } from '@/components/DotsBackdrop';
import { SidebarNav } from '@/components/Sidebar';
import { HeroButton } from '@/components/HeroControls';

type AppNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 移动端导航 — canvas 底 + landing drawer 语汇（非深色侧栏）。 */
export function AppNavDrawer({ open, onOpenChange }: AppNavDrawerProps) {
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
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
        aria-label="关闭导航"
        className="lp-drawer-backdrop fixed inset-0 z-[200] backdrop-blur-[14px] backdrop-saturate-150 lg:hidden"
        onClick={close}
      >
        <DotsBackdrop visible={open} className="pointer-events-none absolute inset-0 size-full" />
      </HeroButton>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="应用导航"
        className="fixed inset-y-0 left-0 z-[201] flex w-[min(280px,88vw)] flex-col border-r border-hairline bg-canvas shadow-float lg:hidden"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 py-3.5">
          <AppBrand to="/home" onClick={close} />
          <HeroButton
            ref={closeRef}
            type="button"
            aria-label="关闭"
            className="lp-nav-link inline-flex size-8 items-center justify-center rounded-md border border-hairline"
            onClick={close}
          >
            <X size={16} className="text-ink-soft" />
          </HeroButton>
        </div>
        <SidebarNav className="flex-1 overflow-y-auto py-2" onNavigate={close} variant="canvas" />
      </aside>
    </>,
    document.body,
  );
}
