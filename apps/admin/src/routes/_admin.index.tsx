import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  Database,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
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
        title="平台管理总览"
        description="超级管理员可在这里查看平台基础规模、登录状态和已经接入的管理模块。"
      />

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 lg:p-8">
        <MetricCard
          label="总用户"
          value={formatNumber(data.stats.totalUsers)}
          detail="Better Auth 用户总数"
          tone="mist"
          icon={Users}
        />
        <MetricCard
          label="邮箱已验证"
          value={formatNumber(data.stats.verifiedUsers)}
          detail="已完成邮箱验证的用户"
          tone="sage"
          icon={UserCheck}
        />
        <MetricCard
          label="7 日新用户"
          value={formatNumber(data.stats.usersCreatedLast7Days)}
          detail="最近 7 天注册用户"
          tone="peach"
          icon={Users}
        />
        <MetricCard
          label="活跃会话"
          value={formatNumber(data.stats.activeSessions)}
          detail="尚未过期的登录 session"
          tone="sage"
          icon={ShieldCheck}
        />
        <MetricCard
          label="物品记录"
          value={formatNumber(data.stats.totalItems)}
          detail="全平台物品总数"
          tone="mist"
          icon={Database}
        />
        <MetricCard
          label="互动事件"
          value={formatNumber(data.stats.totalEvents)}
          detail={`模块 ${readyModules}/${data.modules.length} 已接入`}
          tone="peach"
          icon={Database}
        />
      </div>

      <div className="grid gap-4 px-5 pb-8 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
        {data.modules.map((module) => (
          <div key={module.id} className="rounded-md border border-hairline bg-surface p-5">
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
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'sage' | 'mist' | 'peach';
  icon: LucideIcon;
}) {
  const toneClass = {
    sage: 'bg-chip-sage text-sage',
    mist: 'bg-chip-mist text-mist',
    peach: 'bg-chip-peach text-peach',
  }[tone];

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
        <span className={`grid size-8 place-items-center rounded-md ${toneClass}`}>
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 truncate text-xl font-semibold text-ink">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-soft">{detail}</p>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}
