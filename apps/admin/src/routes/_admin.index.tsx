import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Gauge,
  HardDrive,
  MemoryStick,
  Server,
  ShieldCheck,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { adminOverviewQueryOptions, adminSystemOperationsQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type { AdminSystemOperations } from '@dicha/shared';

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
  const externalServices = system.externalServices;
  const healthyExternalServices = externalServices.filter(
    (service) => service.status === 'healthy',
  ).length;
  const unhealthyServices = externalServices.filter(
    (service) => service.status === 'down' || service.status === 'degraded',
  );
  const apiStatus = system.services.find((service) => service.id === 'api')?.status ?? 'unknown';
  const aiStatus =
    system.externalServices.find((service) => service.id === 'ai-gateway')?.status ?? 'unknown';

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="平台管理总览"
        description="大势报聚合关键运营数字、系统资源、外部依赖和最近后台操作，用来快速判断平台当前状态。"
      />

      <section className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:p-8">
        <div className="rounded-md border border-hairline bg-surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                大势报
              </p>
              <h2 className="mt-2 text-lg font-semibold text-ink">
                {unhealthyServices.length === 0 ? '系统运行总体平稳' : '存在需要关注的外部依赖'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
                API {statusLabel(apiStatus)}，数据库 {statusLabel(system.database.status)}，AI
                Gateway {statusLabel(aiStatus)}。过去 24 小时有{' '}
                {formatNumber(system.maintenance.recentFailures)} 条失败审计，当前有{' '}
                {formatNumber(system.maintenance.expiredSessions)} 个过期会话可清理。
              </p>
            </div>
            <span
              className={`grid size-10 place-items-center rounded-md ${
                unhealthyServices.length === 0 ? 'bg-chip-sage text-sage' : 'bg-chip-peach text-peach'
              }`}
            >
              {unhealthyServices.length === 0 ? (
                <Gauge className="size-5" strokeWidth={1.8} />
              ) : (
                <AlertTriangle className="size-5" strokeWidth={1.8} />
              )}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <SituationMini label="外部服务" value={`${healthyExternalServices}/${externalServices.length}`} />
            <SituationMini label="运行时长" value={formatDuration(system.runtime.uptimeSeconds)} />
            <SituationMini label="CPU 负载" value={`${system.host.cpu.loadPercent}%`} />
            <SituationMini
              label="磁盘占用"
              value={system.host.disk.usedPercent === null ? '-' : `${system.host.disk.usedPercent}%`}
            />
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">运维待办</p>
              <p className="mt-1 text-xs text-ink-soft">自动从系统状态中提取</p>
            </div>
            <ShieldCheck className="size-4 text-mist" strokeWidth={1.8} />
          </div>
          <div className="mt-4 space-y-3">
            <TodoLine
              tone={system.maintenance.expiredSessions > 0 ? 'peach' : 'sage'}
              text={
                system.maintenance.expiredSessions > 0
                  ? `清理 ${formatNumber(system.maintenance.expiredSessions)} 个过期会话`
                  : '暂无过期会话'
              }
            />
            <TodoLine
              tone={system.cache.status === 'not_configured' ? 'peach' : 'mist'}
              text={system.cache.detail}
            />
            <TodoLine
              tone={system.logs.status === 'ready' ? 'sage' : 'mist'}
              text={system.logs.detail}
            />
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
          detail="用户行为事件总数"
          tone="peach"
          icon={Activity}
        />
        <MetricCard
          label="数据库延迟"
          value={system.database.latencyMs === null ? '-' : `${system.database.latencyMs} ms`}
          detail={statusLabel(system.database.status)}
          tone={system.database.status === 'healthy' ? 'sage' : 'peach'}
          icon={Server}
        />
        <MetricCard
          label="API 内存"
          value={`${system.runtime.memory.heapUsedMb} MB`}
          detail={`RSS ${system.runtime.memory.rssMb} MB`}
          tone="mist"
          icon={MemoryStick}
        />
      </div>

      <section className="grid gap-4 px-5 pb-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:px-8">
        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader title="系统资源" description="API 进程与宿主机资源摘要" icon={Cpu} />
          <div className="grid gap-4 p-4 md:grid-cols-3">
            <ResourceCard
              icon={Cpu}
              label="CPU"
              value={`${system.host.cpu.loadPercent}%`}
              detail={`${system.host.cpu.cores} 核 · ${system.host.cpu.model}`}
              percent={Math.min(system.host.cpu.loadPercent, 100)}
            />
            <ResourceCard
              icon={MemoryStick}
              label="Heap"
              value={`${system.runtime.memory.heapUsedMb} MB`}
              detail={`Total ${system.runtime.memory.heapTotalMb} MB`}
              percent={memoryPercent(system)}
            />
            <ResourceCard
              icon={HardDrive}
              label="磁盘"
              value={system.host.disk.usedPercent === null ? '-' : `${system.host.disk.usedPercent}%`}
              detail={system.host.disk.detail}
              percent={system.host.disk.usedPercent ?? 0}
            />
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader title="最近后台操作" description="审计日志摘要，不包含系统运行日志" icon={ShieldCheck} />
          <div className="divide-y divide-hairline">
            {system.recentAuditLogs.length === 0 ? (
              <p className="p-4 text-sm text-ink-soft">暂无审计记录</p>
            ) : (
              system.recentAuditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-4">
                  <p className="truncate text-sm font-medium text-ink">{log.summary}</p>
                  <p className="mt-1 truncate text-xs text-ink-soft">
                    {log.actorEmail ?? '未知管理员'} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 lg:px-8">
        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader title="外部服务" description="数据库、存储、邮件、缓存、AI 与分析依赖" icon={Server} />
          <div className="divide-y divide-hairline">
            {externalServices.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs text-ink-soft">{description}</p>
      </div>
      <Icon className="size-4 text-mist" strokeWidth={1.8} />
    </div>
  );
}

function SituationMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt p-3">
      <p className="text-[11px] text-ink-soft">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function TodoLine({ tone, text }: { tone: 'sage' | 'mist' | 'peach'; text: string }) {
  const toneClass = {
    sage: 'bg-chip-sage text-sage',
    mist: 'bg-chip-mist text-mist',
    peach: 'bg-chip-peach text-peach',
  }[tone];
  return (
    <div className="flex gap-3 rounded-md border border-hairline bg-surface-alt p-3">
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md ${toneClass}`}>
        {tone === 'sage' ? (
          <CheckCircle2 className="size-3.5" strokeWidth={1.8} />
        ) : (
          <AlertTriangle className="size-3.5" strokeWidth={1.8} />
        )}
      </span>
      <p className="min-w-0 text-xs leading-5 text-ink-soft">{text}</p>
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

function ResourceCard({
  icon: Icon,
  label,
  value,
  detail,
  percent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  percent: number;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-chip-mist text-mist">
            <Icon className="size-4" strokeWidth={1.8} />
          </span>
          <p className="text-sm font-semibold text-ink">{label}</p>
        </div>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
      <ProgressBar percent={percent} />
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-soft">{detail}</p>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const normalized = Math.max(0, Math.min(percent, 100));
  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
      <div
        className="h-full rounded-full bg-sage"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

function ServiceRow({ service }: { service: AdminSystemOperations['externalServices'][number] }) {
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[180px_110px_minmax(0,1fr)_120px] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{service.name}</p>
        <p className="mt-1 text-xs text-ink-soft">{serviceCategoryLabel(service.category)}</p>
      </div>
      <StatusPill status={service.status} configured={service.configured} />
      <p className="min-w-0 text-sm leading-6 text-ink-soft">{service.detail}</p>
      <p className="text-xs text-ink-soft">
        {service.latencyMs === null ? '无延迟数据' : `${service.latencyMs} ms`}
      </p>
    </div>
  );
}

function StatusPill({
  status,
  configured,
}: {
  status: AdminSystemOperations['externalServices'][number]['status'];
  configured: boolean;
}) {
  const className =
    status === 'healthy'
      ? 'bg-chip-sage text-sage'
      : status === 'down'
        ? 'bg-chip-pink text-pink'
        : 'bg-chip-peach text-peach';
  return (
    <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-medium ${className}`}>
      {configured ? statusLabel(status) : '未配置'}
    </span>
  );
}

function memoryPercent(system: AdminSystemOperations): number {
  if (system.runtime.memory.heapTotalMb <= 0) return 0;
  return Math.round((system.runtime.memory.heapUsedMb / system.runtime.memory.heapTotalMb) * 1000) / 10;
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

function serviceCategoryLabel(category: AdminSystemOperations['externalServices'][number]['category']) {
  const labels: Record<AdminSystemOperations['externalServices'][number]['category'], string> = {
    runtime: '运行时',
    database: '数据库',
    cache: '缓存',
    storage: '存储',
    mail: '邮件',
    ai: 'AI 服务',
    analytics: '分析服务',
  };
  return labels[category];
}
