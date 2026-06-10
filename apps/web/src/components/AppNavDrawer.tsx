import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { SidebarNav } from '@/components/Sidebar';

type AppNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** 移动端侧栏 — 自左侧滑出，复用 SidebarNav。 */
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
      <button
        type="button"
        aria-label="关闭导航"
        className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-[2px] transition-opacity lg:hidden"
        onClick={close}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="应用导航"
        className="fixed inset-y-0 left-0 z-[201] flex w-[min(280px,88vw)] flex-col bg-sidebar-bg shadow-float lg:hidden"
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <div>
            <div className="text-xl tracking-tight text-sidebar-ink">vidorra</div>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="关闭"
            className="inline-flex size-9 items-center justify-center rounded-lg text-sidebar-ink-soft hover:bg-[var(--sidebar-hover)]"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>
        <SidebarNav className="flex-1 overflow-y-auto" onNavigate={close} />
      </aside>
    </>,
    document.body,
  );
}
