import { useState } from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Bot,
  Clock3,
  Cpu,
  Database,
  Download,
  FileText,
  HardDrive,
  Mail,
  MemoryStick,
  RefreshCw,
  Server,
  TerminalSquare,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { adminSystemOperationsQueryOptions, runAdminSystemAction } from '@/api/admin';
import { HeroTabs, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import type { AdminSystemActionResult, AdminSystemOperations } from '@dicha/shared';

export const Route = createFileRoute('/_admin/system')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSystemOperationsQueryOptions()),
  component: SystemPage,
});

type SystemActionId = AdminSystemOperations['actions'][number]['id'];
type SystemTab = 'status' | 'backup' | 'logs' | 'cache';

function SystemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<AdminSystemActionResult | null>(null);
  const operations = useQuery(adminSystemOperationsQueryOptions());
  const actionMutation = useMutation({
    mutationFn: runAdminSystemAction,
    onSuccess: async (result) => {
      setLastResult(result);
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
        eyebrow="System Tools"
        title="系统工具"
        description="系统维护、备份、监控等高级管理工具。日志、备份和重启能力可通过服务端运维配置接入真实执行。"
      />

      <div className="space-y-4 p-5 lg:p-8">
        {operations.isPending ? (
          <div className="rounded-md border border-hairline bg-surface p-6 text-sm text-ink-soft">
            正在加载系统工具
          </div>
        ) : operations.isError ? (
          <div className="rounded-md border border-hairline bg-surface p-6 text-sm text-pink">
            系统工具加载失败
          </div>
        ) : (
          <SystemToolsWorkbench
            operations={operations.data}
            lastResult={lastResult}
            runningAction={actionMutation.variables?.actionId ?? null}
            actionPending={actionMutation.isPending}
            onRunAction={(actionId) => actionMutation.mutate({ actionId })}
          />
        )}
      </div>
    </div>
  );
}

function SystemToolsWorkbench({
  operations,
  lastResult,
  runningAction,
  actionPending,
  onRunAction,
}: {
  operations: AdminSystemOperations;
  lastResult: AdminSystemActionResult | null;
  runningAction: SystemActionId | null;
  actionPending: boolean;
  onRunAction: (actionId: SystemActionId) => void;
}) {
  const [tab, setTab] = useState<SystemTab>('status');
  const actionById = new Map(operations.actions.map((action) => [action.id, action]));
  const restartActions = pickActions(actionById, ['restart_api', 'restart_ai_gateway']);
  const backupActions = pickActions(actionById, ['run_backup', 'prepare_backup']);
  const cacheActions = pickActions(actionById, ['inspect_cache', 'clear_runtime_cache']);

  return (
    <>
      <div className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-chip-peach text-peach">
            <AlertTriangle className="size-4" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">管理员工具</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              这些工具仅供超级管理员使用。会改变系统状态的操作都由后端配置的命令执行，并写入审计日志。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {restartActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              runningAction={runningAction}
              actionPending={actionPending}
              onRunAction={onRunAction}
              compact
            />
          ))}
        </div>
      </div>

      {lastResult ? <ActionResultBanner result={lastResult} /> : null}

      <HeroTabs
        value={tab}
        onChange={setTab}
        ariaLabel="系统管理标签页"
        items={[
          {
            value: 'status',
            label: '系统状态',
            icon: <Cpu className="size-4" strokeWidth={1.8} />,
            panel: (
              <SystemStatusPanel
                operations={operations}
                onRunAction={onRunAction}
                runningAction={runningAction}
                actionPending={actionPending}
              />
            ),
          },
          {
            value: 'backup',
            label: '数据备份',
            icon: <Archive className="size-4" strokeWidth={1.8} />,
            panel: (
              <BackupPanel
                operations={operations}
                actions={backupActions}
                runningAction={runningAction}
                actionPending={actionPending}
                onRunAction={onRunAction}
              />
            ),
          },
          {
            value: 'logs',
            label: '系统日志',
            icon: <FileText className="size-4" strokeWidth={1.8} />,
            panel: (
              <LogsPanel
                operations={operations}
                onRunAction={onRunAction}
                runningAction={runningAction}
                actionPending={actionPending}
              />
            ),
          },
          {
            value: 'cache',
            label: '缓存管理',
            icon: <Trash2 className="size-4" strokeWidth={1.8} />,
            panel: (
              <CachePanel
                operations={operations}
                actions={cacheActions}
                runningAction={runningAction}
                actionPending={actionPending}
                onRunAction={onRunAction}
              />
            ),
          },
        ]}
      />
    </>
  );
}

function SystemStatusPanel({
  operations,
  runningAction,
  actionPending,
  onRunAction,
}: {
  operations: AdminSystemOperations;
  runningAction: SystemActionId | null;
  actionPending: boolean;
  onRunAction: (actionId: SystemActionId) => void;
}) {
  const actionById = new Map(operations.actions.map((action) => [action.id, action]));
  const refreshAction = actionById.get('refresh_health');
  const pruneAction = actionById.get('prune_expired_sessions');

  return (
    <div className="space-y-4">
      <section className="grid gap-4 lg:grid-cols-4">
        <StatusMetric
          icon={Clock3}
          label="运行时间"
          value={formatDuration(operations.runtime.uptimeSeconds)}
          detail={operations.runtime.nodeVersion}
          percent={null}
        />
        <StatusMetric
          icon={Cpu}
          label="CPU 核心"
          value={`${operations.host.cpu.cores} 核`}
          detail={`负载 ${operations.host.cpu.loadAverage[0]} · ${operations.host.cpu.loadPercent}%`}
          percent={Math.min(operations.host.cpu.loadPercent, 100)}
        />
        <StatusMetric
          icon={MemoryStick}
          label="进程内存"
          value={`${operations.runtime.memory.heapUsedMb} MB`}
          detail={`RSS ${operations.runtime.memory.rssMb} MB`}
          percent={memoryPercent(operations)}
        />
        <StatusMetric
          icon={HardDrive}
          label="磁盘"
          value={
            operations.host.disk.usedPercent === null
              ? '-'
              : `${operations.host.disk.usedPercent}%`
          }
          detail={operations.host.disk.detail}
          percent={operations.host.disk.usedPercent ?? 0}
        />
      </section>

      <section className="rounded-md border border-hairline bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-hairline p-4">
          <div>
            <p className="text-sm font-semibold text-ink">外部服务</p>
            <p className="mt-1 text-xs text-ink-soft">数据库、缓存、存储、邮件和 AI 服务探针</p>
          </div>
          {refreshAction ? (
            <ActionButton
              action={refreshAction}
              runningAction={runningAction}
              actionPending={actionPending}
              onRunAction={onRunAction}
              compact
            />
          ) : null}
        </div>
        <div className="divide-y divide-hairline">
          {operations.externalServices.map((service) => (
            <ExternalServiceRow key={service.id} service={service} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm font-semibold text-ink">维护摘要</p>
          <div className="mt-3 space-y-2 text-sm">
            <InfoRow label="过期会话" value={formatNumber(operations.maintenance.expiredSessions)} />
            <InfoRow label="禁用用户" value={formatNumber(operations.maintenance.disabledUsers)} />
            <InfoRow label="24h 失败审计" value={formatNumber(operations.maintenance.recentFailures)} />
          </div>
        </div>
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm font-semibold text-ink">安全动作</p>
          <div className="mt-3 grid gap-2">
            {pruneAction ? (
              <ActionButton
                action={pruneAction}
                runningAction={runningAction}
                actionPending={actionPending}
                onRunAction={onRunAction}
              />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function BackupPanel({
  operations,
  actions,
  runningAction,
  actionPending,
  onRunAction,
}: {
  operations: AdminSystemOperations;
  actions: AdminSystemOperations['actions'];
  runningAction: SystemActionId | null;
  actionPending: boolean;
  onRunAction: (actionId: SystemActionId) => void;
}) {
  return (
    <section className="rounded-md border border-hairline bg-surface">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">
            共 {formatNumber(operations.backup.files.length)} 个备份文件
          </p>
          <p className="mt-1 text-xs text-ink-soft">{operations.backup.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              runningAction={runningAction}
              actionPending={actionPending}
              onRunAction={onRunAction}
              compact
            />
          ))}
        </div>
      </div>

      {operations.backup.files.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="暂无备份文件"
          detail={operations.backup.recommendedCommand ?? '配置备份目录后，这里会展示历史备份文件。'}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-hairline text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">文件名</th>
                <th className="px-4 py-3 font-medium">大小</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">创建时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {operations.backup.files.map((file) => (
                <tr key={file.name}>
                  <td className="max-w-[420px] truncate px-4 py-3 font-medium text-ink">
                    {file.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{file.sizeLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <KindPill kind={file.kind} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <BackupStatusPill status={file.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {file.createdAt ? formatDateTime(file.createdAt) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled
                      className="inline-grid size-8 place-items-center rounded-md text-ink-soft opacity-50"
                      title="下载/恢复/删除需要单独的文件操作接口"
                    >
                      <Download className="size-4" strokeWidth={1.8} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LogsPanel({
  operations,
  runningAction,
  actionPending,
  onRunAction,
}: {
  operations: AdminSystemOperations;
  runningAction: SystemActionId | null;
  actionPending: boolean;
  onRunAction: (actionId: SystemActionId) => void;
}) {
  const [search, setSearch] = useState('');
  const action = operations.actions.find((item) => item.id === 'inspect_runtime_logs');
  const logs = operations.logs.recent.filter((log) => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return true;
    return `${log.source} ${log.level} ${log.message}`.toLowerCase().includes(keyword);
  });

  return (
    <section className="rounded-md border border-hairline bg-surface">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">系统日志</p>
          <p className="mt-1 text-xs text-ink-soft">{operations.logs.detail}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <HeroTextInput
            value={search}
            onChange={setSearch}
            placeholder="搜索日志..."
            className="min-w-[260px]"
          />
          {action ? (
            <ActionButton
              action={action}
              runningAction={runningAction}
              actionPending={actionPending}
              onRunAction={onRunAction}
              compact
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 border-b border-hairline p-4 md:grid-cols-3">
        {operations.logs.sources.map((source) => (
          <div key={source.id} className="rounded-md border border-hairline bg-surface-alt p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-ink">{source.name}</p>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] ${
                  source.available ? 'bg-chip-sage text-sage' : 'bg-chip-peach text-peach'
                }`}
              >
                {source.available ? '可查看' : '未接入'}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{source.detail}</p>
          </div>
        ))}
      </div>

      {logs.length === 0 ? (
        <EmptyState
          icon={TerminalSquare}
          title="暂无运行日志"
          detail="配置 DICHA_ADMIN_LOG_FILES 后，这里会显示最近日志行。"
        />
      ) : (
        <div className="max-h-[620px] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-hairline bg-surface text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">级别</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">消息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {logs.map((log, index) => (
                <tr key={`${log.timestamp}-${index}`}>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <LogLevelPill level={log.level} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{log.source}</td>
                  <td className="px-4 py-3 text-ink">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CachePanel({
  operations,
  actions,
  runningAction,
  actionPending,
  onRunAction,
}: {
  operations: AdminSystemOperations;
  actions: AdminSystemOperations['actions'];
  runningAction: SystemActionId | null;
  actionPending: boolean;
  onRunAction: (actionId: SystemActionId) => void;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-md border border-hairline bg-surface p-4">
        <p className="text-sm font-semibold text-ink">缓存状态</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <StatusMetric
            icon={Trash2}
            label="缓存后端"
            value={operations.cache.backend}
            detail={operations.cache.detail}
            percent={null}
          />
          <StatusMetric
            icon={Database}
            label="估算 key 数"
            value={
              operations.cache.keysApprox === null
                ? '暂无探针'
                : formatNumber(operations.cache.keysApprox)
            }
            detail={cacheStatusLabel(operations.cache.status)}
            percent={null}
          />
          <StatusMetric
            icon={Server}
            label="Redis 服务"
            value={
              statusLabel(
                operations.externalServices.find((service) => service.id === 'redis')?.status ??
                  'unknown',
              )
            }
            detail={
              operations.externalServices.find((service) => service.id === 'redis')?.detail ??
              '未配置'
            }
            percent={null}
          />
        </div>
      </div>
      <div className="rounded-md border border-hairline bg-surface p-4">
        <p className="text-sm font-semibold text-ink">缓存动作</p>
        <div className="mt-4 grid gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              runningAction={runningAction}
              actionPending={actionPending}
              onRunAction={onRunAction}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  action,
  runningAction,
  actionPending,
  onRunAction,
  compact = false,
}: {
  action: AdminSystemOperations['actions'][number];
  runningAction: SystemActionId | null;
  actionPending: boolean;
  onRunAction: (actionId: SystemActionId) => void;
  compact?: boolean;
}) {
  const pending = runningAction === action.id && actionPending;
  return (
    <button
      type="button"
      disabled={!action.executable || actionPending}
      onClick={() => onRunAction(action.id)}
      title={action.disabledReason ?? action.description}
      className={`rounded-md border border-hairline text-left transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-55 ${
        compact ? 'px-3 py-2' : 'p-3'
      } ${action.category === 'dangerous' && action.executable ? 'bg-chip-peach text-ink' : 'bg-surface-alt text-ink'}`}
    >
      <span className="flex items-center gap-2">
        {pending ? (
          <RefreshCw className="size-4 animate-spin" strokeWidth={1.8} />
        ) : action.category === 'dangerous' ? (
          <Server className="size-4" strokeWidth={1.8} />
        ) : (
          <RefreshCw className="size-4" strokeWidth={1.8} />
        )}
        <span className="text-sm font-semibold">{action.title}</span>
      </span>
      {!compact && action.disabledReason ? (
        <span className="mt-2 block text-xs leading-5 text-ink-soft">{action.disabledReason}</span>
      ) : null}
    </button>
  );
}

function ActionResultBanner({ result }: { result: AdminSystemActionResult }) {
  const tone =
    result.status === 'completed'
      ? 'border-sage/40 bg-chip-sage text-sage'
      : result.status === 'failed'
        ? 'border-pink/40 bg-chip-pink text-pink'
        : 'border-peach/40 bg-chip-peach text-peach';
  return (
    <div className={`rounded-md border px-4 py-3 text-sm font-medium ${tone}`}>
      {result.message}
    </div>
  );
}

function StatusMetric({
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
  percent: number | null;
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
      {percent === null ? null : <ProgressBar percent={percent} />}
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{detail}</p>
    </div>
  );
}

function ExternalServiceRow({
  service,
}: {
  service: AdminSystemOperations['externalServices'][number];
}) {
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[220px_110px_minmax(0,1fr)_120px] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-chip-mist text-mist">
          <ServiceCategoryIcon category={service.category} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{service.name}</p>
          <p className="mt-1 text-xs text-ink-soft">{serviceCategoryLabel(service.category)}</p>
        </div>
      </div>
      <StatusPill status={service.status} configured={service.configured} />
      <p className="text-sm leading-6 text-ink-soft">{service.detail}</p>
      <p className="text-xs text-ink-soft">
        {service.latencyMs === null ? '无延迟数据' : `${service.latencyMs} ms`}
      </p>
    </div>
  );
}

function ServiceCategoryIcon({
  category,
}: {
  category: AdminSystemOperations['externalServices'][number]['category'];
}) {
  const props = { className: 'size-4', strokeWidth: 1.8 };
  switch (category) {
    case 'runtime':
      return <Server {...props} />;
    case 'database':
      return <Database {...props} />;
    case 'cache':
      return <Trash2 {...props} />;
    case 'storage':
      return <HardDrive {...props} />;
    case 'mail':
      return <Mail {...props} />;
    case 'ai':
      return <Bot {...props} />;
    case 'analytics':
      return <Database {...props} />;
    default: {
      const exhaustive: never = category;
      return exhaustive;
    }
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="grid min-h-[220px] place-items-center p-8 text-center">
      <div>
        <span className="mx-auto grid size-10 place-items-center rounded-md bg-chip-mist text-mist">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
        <p className="mt-2 max-w-lg text-sm leading-6 text-ink-soft">{detail}</p>
      </div>
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

function KindPill({ kind }: { kind: AdminSystemOperations['backup']['files'][number]['kind'] }) {
  const labels: Record<typeof kind, string> = {
    automatic: '自动',
    manual: '手动',
    unknown: '未知',
  };
  return (
    <span className="rounded-md bg-surface-alt px-2 py-1 text-xs font-medium text-ink-soft">
      {labels[kind]}
    </span>
  );
}

function BackupStatusPill({
  status,
}: {
  status: AdminSystemOperations['backup']['files'][number]['status'];
}) {
  const className =
    status === 'success'
      ? 'bg-chip-sage text-sage'
      : status === 'failed'
        ? 'bg-chip-pink text-pink'
        : 'bg-chip-peach text-peach';
  const labels: Record<typeof status, string> = {
    success: '成功',
    failed: '失败',
    unknown: '未知',
  };
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{labels[status]}</span>;
}

function LogLevelPill({ level }: { level: string }) {
  const normalized = level.toUpperCase();
  const className =
    normalized === 'ERROR'
      ? 'bg-chip-pink text-pink'
      : normalized === 'WARN' || normalized === 'WARNING'
        ? 'bg-chip-peach text-peach'
        : 'bg-chip-mist text-mist';
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${className}`}>{normalized}</span>;
}

function ProgressBar({ percent }: { percent: number }) {
  const normalized = Math.max(0, Math.min(percent, 100));
  const colorClass = normalized >= 90 ? 'bg-pink' : normalized >= 70 ? 'bg-peach' : 'bg-sage';
  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${normalized}%` }} />
    </div>
  );
}

function pickActions(
  actionById: Map<SystemActionId, AdminSystemOperations['actions'][number]>,
  ids: SystemActionId[],
): AdminSystemOperations['actions'] {
  return ids.flatMap((id) => {
    const action = actionById.get(id);
    return action ? [action] : [];
  });
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

function cacheStatusLabel(status: AdminSystemOperations['cache']['status']): string {
  const labels: Record<AdminSystemOperations['cache']['status'], string> = {
    not_configured: '未配置',
    external: '外部缓存',
    ready: '已接入',
  };
  return labels[status];
}

function memoryPercent(operations: AdminSystemOperations): number {
  if (operations.runtime.memory.heapTotalMb <= 0) return 0;
  return (
    Math.round(
      (operations.runtime.memory.heapUsedMb / operations.runtime.memory.heapTotalMb) * 1000,
    ) / 10
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
