import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileClock,
  Gauge,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  adminSystemOperationsQueryOptions,
  runAdminSystemAction,
} from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type { AdminSystemOperations } from '@dicha/shared';

export const Route = createFileRoute('/_admin/system')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSystemOperationsQueryOptions()),
  component: SystemPage,
});

function SystemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const operations = useQuery(adminSystemOperationsQueryOptions());
  const actionMutation = useMutation({
    mutationFn: runAdminSystemAction,
    onSuccess: async (result) => {
      queryClient.setQueryData(['admin', 'system', 'operations'], result.operations);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      if (result.actionId === 'inspect_audit_logs') {
        await router.navigate({ to: '/audit-logs' });
      }
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="System Operations"
        title="系统功能"
        description="集中查看服务健康、运行时状态、维护任务和故障排查入口。危险运维动作保留说明，不在 Web 请求中直接执行。"
      />

      <div className="space-y-4 p-5 lg:p-8">
        {operations.isPending ? (
          <div className="rounded-md border border-hairline bg-surface p-6 text-sm text-ink-soft">
            正在加载系统运营信息
          </div>
        ) : operations.isError ? (
          <div className="rounded-md border border-hairline bg-surface p-6 text-sm text-pink">
            系统运营信息加载失败
          </div>
        ) : (
          <SystemOperationsDashboard
            operations={operations.data}
            runningAction={actionMutation.variables?.actionId ?? null}
            actionPending={actionMutation.isPending}
            onRunAction={(actionId) => actionMutation.mutate({ actionId })}
          />
        )}
      </div>
    </div>
  );
}

function SystemOperationsDashboard({
  operations,
  runningAction,
  actionPending,
  onRunAction,
}: {
  operations: AdminSystemOperations;
  runningAction: string | null;
  actionPending: boolean;
  onRunAction: (actionId: AdminSystemOperations['actions'][number]['id']) => void;
}) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-4">
        <Metric
          icon={Gauge}
          label="API 运行时长"
          value={formatDuration(operations.runtime.uptimeSeconds)}
          detail={operations.runtime.nodeVersion}
        />
        <Metric
          icon={Database}
          label="数据库"
          value={statusLabel(operations.database.status)}
          detail={
            operations.database.latencyMs === null
              ? '暂无延迟'
              : `${operations.database.latencyMs} ms`
          }
        />
        <Metric
          icon={Trash2}
          label="过期会话"
          value={formatNumber(operations.maintenance.expiredSessions)}
          detail="可安全清理"
        />
        <Metric
          icon={ShieldAlert}
          label="24h 失败审计"
          value={formatNumber(operations.maintenance.recentFailures)}
          detail="用于排查异常操作"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader title="服务健康" description="核心服务探针与最近检查结果" icon={Server} />
          <div className="divide-y divide-hairline">
            {operations.services.map((service) => (
              <div
                key={service.id}
                className="grid gap-3 p-4 md:grid-cols-[180px_minmax(0,1fr)_120px] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusIcon status={service.status} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{service.name}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatDateTime(service.checkedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-ink-soft">{service.detail}</p>
                <p className="text-xs text-ink-soft">
                  {service.latencyMs === null ? '无延迟数据' : `${service.latencyMs} ms`}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader title="运行时" description="API 进程资源摘要" icon={Server} />
          <div className="space-y-3 p-4 text-xs">
            <InfoRow label="平台" value={operations.runtime.platform} />
            <InfoRow label="Node" value={operations.runtime.nodeVersion} />
            <InfoRow label="Heap Used" value={`${operations.runtime.memory.heapUsedMb} MB`} />
            <InfoRow label="Heap Total" value={`${operations.runtime.memory.heapTotalMb} MB`} />
            <InfoRow label="RSS" value={`${operations.runtime.memory.rssMb} MB`} />
            <InfoRow label="禁用用户" value={formatNumber(operations.maintenance.disabledUsers)} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader
            title="维护工具"
            description="只开放可以安全在请求内完成的操作"
            icon={RefreshCw}
          />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {operations.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={!action.executable || actionPending}
                onClick={() => onRunAction(action.id)}
                className="rounded-md border border-hairline bg-surface-alt p-4 text-left transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-55"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{action.title}</p>
                    <p className="mt-2 text-xs leading-5 text-ink-soft">{action.description}</p>
                  </div>
                  <span className={actionToneClass(action.category)}>
                    {runningAction === action.id && actionPending ? (
                      <RefreshCw className="size-4 animate-spin" strokeWidth={1.8} />
                    ) : action.executable ? (
                      <CheckCircle2 className="size-4" strokeWidth={1.8} />
                    ) : (
                      <AlertTriangle className="size-4" strokeWidth={1.8} />
                    )}
                  </span>
                </div>
                {action.disabledReason ? (
                  <p className="mt-3 text-[11px] text-peach">{action.disabledReason}</p>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface">
          <SectionHeader title="故障排查" description="常用检查路径" icon={FileClock} />
          <div className="space-y-3 p-4">
            {[
              '先看服务健康是否降级，再查看 AI 诊断或审计日志。',
              '如果用户无法登录，检查账户状态、活跃会话和 Better Auth 回调配置。',
              '如果 AI 调用失败，优先查看 AI 诊断页中的 requestId、错误分类和内部通道。',
              '重启服务、清理 Docker 卷、查看容器日志应通过服务器终端或部署平台完成。',
            ].map((item) => (
              <p
                key={item}
                className="rounded-md border border-hairline bg-surface-alt p-3 text-xs leading-5 text-ink-soft"
              >
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">{label}</p>
        <span className="grid size-8 place-items-center rounded-md bg-chip-mist text-mist">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-4 truncate text-lg font-semibold text-ink">{value}</p>
      <p className="mt-1 truncate text-xs text-ink-soft">{detail}</p>
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

function StatusIcon({ status }: { status: AdminSystemOperations['services'][number]['status'] }) {
  const className =
    status === 'healthy'
      ? 'bg-chip-sage text-sage'
      : status === 'down'
        ? 'bg-chip-pink text-pink'
        : 'bg-chip-peach text-peach';
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-md ${className}`}>
      {status === 'healthy' ? (
        <CheckCircle2 className="size-4" strokeWidth={1.8} />
      ) : (
        <AlertTriangle className="size-4" strokeWidth={1.8} />
      )}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{value}</span>
    </div>
  );
}

function actionToneClass(category: AdminSystemOperations['actions'][number]['category']): string {
  const classes = {
    diagnostic: 'grid size-8 place-items-center rounded-md bg-chip-mist text-mist',
    maintenance: 'grid size-8 place-items-center rounded-md bg-chip-sage text-sage',
    dangerous: 'grid size-8 place-items-center rounded-md bg-chip-peach text-peach',
  };
  return classes[category];
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
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
