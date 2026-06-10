import { Link } from '@tanstack/react-router';
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { DotsBackdrop } from '@/components/DotsBackdrop';
import { ThemeToggle } from '@/components/ThemeToggle';

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export type NavDrawerItem = { href: string; label: string };

type LandingNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NavDrawerItem[];
};

function DrawerMono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={className} style={{ fontFamily: MONO }}>
      {children}
    </span>
  );
}

/** Zed 式 bottom drawer：Portal 遮罩 + 点阵 + 自底部滑出面板。 */
export function LandingNavDrawer({ open, onOpenChange, items }: LandingNavDrawerProps) {
  const titleId = useId();
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

  const close = () => onOpenChange(false);

  if (typeof document === 'undefined' || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="关闭导航菜单"
        className="lp-drawer-backdrop fixed inset-0 z-[200] backdrop-blur-[14px] backdrop-saturate-150"
        onClick={close}
      >
        <DotsBackdrop visible={open} className="pointer-events-none absolute inset-0 size-full" />
      </button>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        className="lp-drawer-panel fixed inset-x-0 bottom-0 z-[201] flex max-h-[min(85dvh,720px)] flex-col"
      >
        <div aria-hidden className="lp-drawer-handle" />

        <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-sidebar-bg text-[12px] font-bold text-sidebar-ink">
              v
            </span>
            <DrawerMono className="text-[15px] font-semibold tracking-tight text-ink">
              <span id={titleId}>vidorra</span>
            </DrawerMono>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="关闭"
            className="lp-nav-link inline-flex size-8 items-center justify-center rounded-md border border-hairline"
            onClick={close}
          >
            <X size={16} className="text-ink-soft" />
          </button>
        </div>

        <nav aria-label="站点主导航" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {items.map((item) => (
            <a key={item.href} href={item.href} className="lp-drawer-link rounded-md px-3 py-3.5" onClick={close}>
              <DrawerMono className="text-[15px]">{item.label}</DrawerMono>
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 flex-col gap-3 border-t border-hairline px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between">
            <DrawerMono className="text-[12px] text-ink-soft">主题</DrawerMono>
            <ThemeToggle className="lp-nav-link inline-flex size-9 items-center justify-center rounded-md border border-hairline" />
          </div>
          <Link
            to="/home"
            className="lp-btn lp-btn-primary inline-flex w-full items-center justify-center rounded-md px-4 py-3"
            onClick={close}
          >
            <DrawerMono className="text-[13px] font-medium">开始入住</DrawerMono>
          </Link>
        </div>
      </section>
    </>,
    document.body,
  );
}
