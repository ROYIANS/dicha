import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react';

export type DashCardVariant = 'stat' | 'media' | 'panel' | 'dashed';

type DashCardProps<T extends ElementType = 'div'> = {
  variant?: DashCardVariant;
  className?: string;
  children?: ReactNode;
  as?: T;
  /** 可点击卡片：hover 摊平阴影 + active 下压 */
  interactive?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

/**
 * Dashboard 卡片 — Zed/landing 工业语汇：
 * rounded-md · hairline · 底边 inset 物理阴影 · hover 摊平。
 */
export function DashCard<T extends ElementType = 'div'>({
  variant = 'stat',
  className = '',
  children,
  as,
  interactive = false,
  ...rest
}: DashCardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  const cls = ['dash-card', `dash-card--${variant}`, interactive ? 'dash-card--interactive' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

type DashCardHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
};

export function DashCardHeader({ title, action }: DashCardHeaderProps) {
  return (
    <div className="dash-card-header">
      <div className="app-dash-section">{title}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** 45° 斜纹顶饰（footer 装饰带同款，低透明度） */
export function DashCardSlash({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={`dash-card-slash pointer-events-none absolute inset-x-0 top-0 h-8 ${className}`}
    >
      <defs>
        <pattern id="dash-card-slash" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dash-card-slash)" />
    </svg>
  );
}
