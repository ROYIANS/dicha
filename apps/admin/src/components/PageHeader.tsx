import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-hairline px-5 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
      </div>
      {action}
    </div>
  );
}
