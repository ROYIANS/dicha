import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  Gauge,
  ShieldCheck,
  Server,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { adminOverviewQueryOptions, adminSystemOperationsQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(adminOverviewQueryOptions()),
      context.queryClient.ensureQueryData(adminSystemOperationsQueryOptions()),
    ]);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(adminOverviewQueryOptions());
  const { data: system } = useSuspenseQuery(adminSystemOperationsQueryOptions());
  const readyModules = data.modules.filter((module) => module.status === 'ready').length;
  const healthyServices = system.services.filter((service) => service.status === 'healthy').length;

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="平台管理总览"
        description="大势报聚合平台规模、服务健康、维护待办和最近后台操作，方便快速判断今天系统是否平稳。"
      />

      <section className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:p-8">
        <div className="rounded-md border border-hairline bg-surface p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                大势报
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                {healthyServices === system.services.length
                  ? '核心服务运行平稳'
                  : '存在需要关注的服务状态'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                数据库 {statusLabel(system.database.status)}，AI Gateway{' '}
                {statusLabel(
                  system.services.find((service) => service.id === 'ai-gateway')?.status ??
                    'unknown',
                )}
                。 过去 24 小时记录到 {formatNumber(system.maintenance.recentFailures)} 条失败审计。
              </p>
            </div>
            <span
              className={`grid size-10 place-items-center rounded-md ${
                healthyServices === system.services.length
                  ? 'bg-chip-sage text-sage'
                  : 'bg-chip-peach text-peach'
              }`}
            >
              {healthyServices === system.services.length ? (
                <Gauge className="size-5" strokeWidth={1.8} />
              ) : (
                <AlertTriangle className="size-5" strokeWidth={1.8} />
              )}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SituationMini
              label="服务健康"
              value={`${healthyServices}/${system.services.length}`}
            />
            <SituationMini
              label="过期会话"
              value={formatNumber(system.maintenance.expiredSessions)}
            />
            <SituationMini label="运行时长" value={formatDuration(system.runtime.uptimeSeconds)} />
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">最近操作</p>
              <p className="mt-1 text-xs text-ink-soft">后台关键操作审计摘要</p>
            </div>
            <ShieldCheck className="size-4 text-mist" strokeWidth={1.8} />
          </div>
          <div className="mt-4 space-y-3">
            {system.recentAuditLogs.length === 0 ? (
              <p className="text-xs text-ink-soft">暂无审计记录</p>
            ) : (
              system.recentAuditLogs.slice(0, 4).map((log) => (
                <div key={log.id} className="rounded-md border border-hairline bg-surface-alt p-3">
                  <p className="truncate text-xs font-medium text-ink">{log.summary}</p>
                  <p className="mt-1 truncate text-[11px] text-ink-soft">
                    {log.actorEmail ?? '未知管理员'} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
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
        <MetricCard
          label="API 内存"
          value={`${system.runtime.memory.heapUsedMb} MB`}
          detail={`RSS ${system.runtime.memory.rssMb} MB`}
          tone="mist"
          icon={Cpu}
        />
        <MetricCard
          label="数据库延迟"
          value={system.database.latencyMs === null ? '-' : `${system.database.latencyMs} ms`}
          detail={statusLabel(system.database.status)}
          tone={system.database.status === 'healthy' ? 'sage' : 'peach'}
          icon={Server}
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

function SituationMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt p-3">
      <p className="text-[11px] text-ink-soft">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
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
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">{label}</p>
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

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    healthy: '正常',
    degraded: '降级',
    down: '不可用',
    unknown: '未知',
  };
  return labels[status] ?? status;
}
