import type { CSSProperties } from 'react';

export function BrandMark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-block',
        backgroundColor: 'currentColor',
        mask: 'url(/assets/logo.svg) center / contain no-repeat',
        WebkitMask: 'url(/assets/logo.svg) center / contain no-repeat',
        ...style,
      }}
    />
  );
}

export function AppBrand({ className }: { className?: string }) {
  return (
    <span className={className ?? 'inline-flex items-center gap-2'}>
      <BrandMark className="h-5 w-[30px]" />
      <span className="font-semibold">滴茶 Admin</span>
    </span>
  );
}
