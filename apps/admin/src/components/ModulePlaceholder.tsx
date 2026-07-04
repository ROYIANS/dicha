import type { LucideIcon } from 'lucide-react';

export function ModulePlaceholder({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="p-5 lg:p-8">
      <div className="rounded-md border border-hairline bg-surface p-5 lg:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-chip-lavender text-lavender">
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">{description}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-md border border-hairline bg-surface-alt p-4">
              <p className="text-sm font-medium text-ink">{item}</p>
              <p className="mt-1 text-xs text-ink-soft">后续任务接入真实数据与操作。</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
