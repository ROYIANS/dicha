import { Link } from '@tanstack/react-router';

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";

type AppBrandProps = {
  /** 深色侧栏 / 浅色内容区 */
  variant?: 'sidebar' | 'canvas';
  /** 链接目标；不传则渲染为静态块 */
  to?: '/home';
  className?: string;
  onClick?: () => void;
};

/** 落地页同款的 v 徽标 + dicha 字标。 */
export function AppBrand({ variant = 'canvas', to, className = '', onClick }: AppBrandProps) {
  const isSidebar = variant === 'sidebar';
  const badgeBg = isSidebar ? 'var(--sidebar-ink)' : 'var(--sidebar-bg)';
  const badgeFg = isSidebar ? 'var(--sidebar-bg)' : 'var(--sidebar-ink)';
  const wordColor = isSidebar ? 'var(--sidebar-ink)' : 'var(--ink)';

  const inner = (
    <>
      <span
        className="grid size-6 shrink-0 place-items-center rounded-[5px] text-[12px] font-bold"
        style={{ backgroundColor: badgeBg, color: badgeFg }}
      >
        v
      </span>
      <span
        className="text-[15px] font-semibold tracking-tight"
        style={{ fontFamily: MONO, color: wordColor }}
      >
        dicha
      </span>
    </>
  );

  const base = `inline-flex min-w-0 items-center gap-2 ${className}`;

  if (to) {
    return (
      <Link to={to} className={base} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
