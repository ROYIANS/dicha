import { Link } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

const SERIF = "'Noto Serif SC', 'Songti SC', serif";
const LOGO_MASK_STYLE: CSSProperties = {
  maskImage: "url('/assets/logo.svg')",
  WebkitMaskImage: "url('/assets/logo.svg')",
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
};

type AppBrandProps = {
  /** 深色侧栏 / 浅色内容区 */
  variant?: 'sidebar' | 'canvas';
  /** 链接目标；不传则渲染为静态块 */
  to?: '/home';
  className?: string;
  onClick?: () => void;
};

type BrandMarkProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function BrandMark({ className = '', style, title }: BrandMarkProps) {
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ ...LOGO_MASK_STYLE, ...style }}
    />
  );
}

/** 全站品牌 mark + 中文字标。 */
export function AppBrand({ variant = 'canvas', to, className = '', onClick }: AppBrandProps) {
  const isSidebar = variant === 'sidebar';
  const markColor = isSidebar ? 'var(--sidebar-ink)' : 'var(--ink)';
  const wordColor = isSidebar ? 'var(--sidebar-ink)' : 'var(--ink)';

  const inner = (
    <>
      <BrandMark className="h-5 w-[30px]" style={{ color: markColor }} />
      <span
        className="text-[16px] font-semibold"
        style={{ fontFamily: SERIF, color: wordColor }}
      >
        滴茶
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
