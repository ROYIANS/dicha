import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import { adminOverviewQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOverviewQueryOptions()),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(adminOverviewQueryOptions());
  const readyModules = data.modules.filter((module) => module.status === 'ready').length;

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="管理系统骨架"
        description="当前阶段先验证独立部署、管理员准入和服务端授权边界；具体管理模块会在后续任务中逐步接入。"
      />

      <div className="grid gap-4 p-5 md:grid-cols-3 lg:p-8">
        <MetricCard
          label="Admin API"
          value="Protected"
          detail={`生成于 ${new Date(data.generatedAt).toLocaleString('zh-CN')}`}
          tone="sage"
        />
        <MetricCard
          label="Modules"
          value={`${readyModules}/${data.modules.length}`}
          detail="已接入骨架的模块数量"
          tone="mist"
        />
        <MetricCard
          label="Current Admin"
          value={data.user.name}
          detail={data.user.email}
          tone="peach"
        />
      </div>

      <div className="grid gap-4 px-5 pb-8 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
        {data.modules.map((module) => (
          <div key={module.id} className="rounded-card border border-hairline bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{module.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{module.description}</p>
              </div>
              <span
                className={
                  module.status === 'ready'
                    ? 'grid size-8 place-items-center rounded-md bg-chip-sage text-sage'
                    : 'grid size-8 place-items-center rounded-md bg-chip-peach text-peach'
                }
              >
                {module.status === 'ready' ? (
                  <CheckCircle2 className="size-4" strokeWidth={1.8} />
                ) : (
                  <Clock3 className="size-4" strokeWidth={1.8} />
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'sage' | 'mist' | 'peach';
}) {
  const toneClass = {
    sage: 'bg-chip-sage text-sage',
    mist: 'bg-chip-mist text-mist',
    peach: 'bg-chip-peach text-peach',
  }[tone];

  return (
    <div className="rounded-card border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
        <span className={`grid size-8 place-items-center rounded-md ${toneClass}`}>
          <ShieldCheck className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 truncate text-xl font-semibold text-ink">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-soft">{detail}</p>
    </div>
  );
}
