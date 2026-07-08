import {
  createFileRoute,
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  Filter,
  Hash,
  Layers3,
  RefreshCw,
  Server,
  Timer,
  UserRound,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminDichaAiDiagnosticsQueryOptions } from '@/api/admin';
import { HeroButton, HeroSelect, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import type {
  AdminDichaAiDiagnosticsQuery,
  AdminDichaAiDiagnosticsReport,
  AdminDichaAiUsageEvent,
  AiInvokeErrorCategory,
  AiUsageStatus,
  AiUsageWindow,
} from '@dicha/shared';

const WINDOWS: Array<{ value: AiUsageWindow; label: string }> = [
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'all', label: '全部' },
];

const STATUS_OPTIONS: Array<{ value: ''; label: string } | { value: AiUsageStatus; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'success', label: '成功' },
  { value: 'degraded', label: '降级' },
  { value: 'failure', label: '失败' },
];

const ERROR_OPTIONS: Array<{ value: ''; label: string } | { value: AiInvokeErrorCategory; label: string }> = [
  { value: '', label: '全部错误' },
  { value: 'auth', label: 'auth' },
  { value: 'config', label: 'config' },
  { value: 'quota', label: 'quota' },
  { value: 'rate_limit', label: 'rate_limit' },
  { value: 'provider_unavailable', label: 'provider_unavailable' },
  { value: 'timeout', label: 'timeout' },
  { value: 'network', label: 'network' },
  { value: 'model_not_found', label: 'model_not_found' },
  { value: 'context_limit', label: 'context_limit' },
  { value: 'content_safety', label: 'content_safety' },
  { value: 'invalid_request', label: 'invalid_request' },
  { value: 'unknown', label: 'unknown' },
];

export const Route = createFileRoute('/_admin/ai-diagnostics')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminDichaAiDiagnosticsQueryOptions());
  },
  component: AiDiagnosticsPage,
});

type DiagnosticsState = {
  window: AiUsageWindow;
  page: number;
  pageSize: number;
  status: '' | AiUsageStatus;
  errorCategory: '' | AiInvokeErrorCategory;
  requestId: string;
  userSearch: string;
  modelSearch: string;
  internalChannelId: string;
};

const initialState: DiagnosticsState = {
  window: '7d',
  page: 1,
  pageSize: 50,
  status: '',
  errorCategory: '',
  requestId: '',
  userSearch: '',
  modelSearch: '',
  internalChannelId: '',
};

function AiDiagnosticsPage() {
  const [filters, setFilters] = useState<DiagnosticsState>(initialState);
  const query = useMemo<Partial<AdminDichaAiDiagnosticsQuery>>(
    () => ({
      window: filters.window,
      page: filters.page,
      pageSize: filters.pageSize,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.errorCategory ? { errorCategory: filters.errorCategory } : {}),
      ...(filters.requestId.trim() ? { requestId: filters.requestId.trim() } : {}),
      ...(filters.userSearch.trim() ? { userSearch: filters.userSearch.trim() } : {}),
      ...(filters.modelSearch.trim() ? { modelSearch: filters.modelSearch.trim() } : {}),
      ...(filters.internalChannelId.trim() ? { internalChannelId: filters.internalChannelId.trim() } : {}),
    }),
    [filters],
  );
  const diagnostics = useQuery(adminDichaAiDiagnosticsQueryOptions(query));
  const report = diagnostics.data;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedEvent =
    report?.events.find((event) => event.id === selectedId) ?? report?.events[0] ?? null;

  const updateFilters = (patch: Partial<DiagnosticsState>) =>
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));

  return (
    <div>
      <PageHeader
        eyebrow="AI Diagnostics"
        title="AI 诊断"
        description="按请求排查官方 Dicha AI 调用，定位失败、降级、内部通道和关联请求 ID。"
      />
      <div className="space-y-4 p-5 lg:p-8">
        <section className="rounded-md border border-hairline bg-surface p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-alt text-ink-soft">
              <Filter className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <FilterSelect
                  label="时间窗口"
                  value={filters.window}
                  onChange={(value) => updateFilters({ window: value as AiUsageWindow })}
                  options={WINDOWS}
                />
                <FilterSelect
                  label="状态"
                  value={filters.status}
                  onChange={(value) => updateFilters({ status: value as DiagnosticsState['status'] })}
                  options={STATUS_OPTIONS}
                />
                <FilterSelect
                  label="错误分类"
                  value={filters.errorCategory}
                  onChange={(value) =>
                    updateFilters({ errorCategory: value as DiagnosticsState['errorCategory'] })
                  }
                  options={ERROR_OPTIONS}
                />
                <FilterSelect
                  label="每页"
                  value={String(filters.pageSize)}
                  onChange={(value) => updateFilters({ pageSize: Number(value) })}
                  options={[
                    { value: '25', label: '25 条' },
                    { value: '50', label: '50 条' },
                    { value: '100', label: '100 条' },
                  ]}
                />
                <FilterInput
                  label="请求 ID"
                  value={filters.requestId}
                  placeholder="request / upstream"
                  onChange={(value) => updateFilters({ requestId: value })}
                />
                <FilterInput
                  label="用户"
                  value={filters.userSearch}
                  placeholder="邮箱或名称"
                  onChange={(value) => updateFilters({ userSearch: value })}
                />
                <FilterInput
                  label="模型"
                  value={filters.modelSearch}
                  placeholder="模型名或 ID"
                  onChange={(value) => updateFilters({ modelSearch: value })}
                />
                <FilterInput
                  label="内部通道"
                  value={filters.internalChannelId}
                  placeholder="provider / channel"
                  onChange={(value) => updateFilters({ internalChannelId: value })}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {report?.filters.models.slice(0, 5).map((option) => (
                    <QuickFilter
                      key={option.key}
                      label={option.label}
                      count={option.count}
                      onClick={() => updateFilters({ modelSearch: option.key })}
                    />
                  ))}
                </div>
                <HeroButton
                  type="button"
                  onClick={() => setFilters(initialState)}
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink-soft transition-colors hover:text-ink"
                >
                  <RefreshCw className="size-3.5" />
                  重置筛选
                </HeroButton>
              </div>
            </div>
          </div>
        </section>

        {diagnostics.isPending ? <StatusPanel text="正在加载 AI 诊断数据" /> : null}
        {diagnostics.isError ? <StatusPanel text="AI 诊断数据加载失败" tone="error" /> : null}
        {report ? (
          <>
            <DiagnosticMetrics report={report} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <DiagnosticsTable
                events={report.events}
                selectedId={selectedEvent?.id ?? null}
                onSelect={(event) => setSelectedId(event.id)}
              />
              <DiagnosticDetail event={selectedEvent} />
            </div>
            <PaginationBar
              page={report.page}
              pageSize={report.pageSize}
              total={report.total}
              totalPages={report.totalPages}
              onPageChange={(page) => updateFilters({ page })}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function DiagnosticMetrics({ report }: { report: AdminDichaAiDiagnosticsReport }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard icon={Activity} label="匹配请求" value={formatInteger(report.total)} detail="当前筛选结果" />
      <MetricCard icon={CheckCircle2} label="成功" value={formatInteger(report.summary.successfulCalls)} detail={`${formatPercent(report.summary.calls ? report.summary.successfulCalls / report.summary.calls : 0)} 占比`} />
      <MetricCard icon={AlertTriangle} label="降级" value={formatInteger(report.summary.degradedCalls)} detail="fallback 后成功" />
      <MetricCard icon={XCircle} label="失败" value={formatInteger(report.summary.failedCalls)} detail="需要排查" />
      <MetricCard icon={Timer} label="平均延迟" value={formatLatency(report.summary.averageLatencyMs)} detail={`${formatInteger(report.summary.totalTokens)} tokens`} />
    </div>
  );
}

function DiagnosticsTable({
  events,
  selectedId,
  onSelect,
}: {
  events: AdminDichaAiUsageEvent[];
  selectedId: string | null;
  onSelect: (event: AdminDichaAiUsageEvent) => void;
}) {
  const columns = useMemo<ColumnDef<AdminDichaAiUsageEvent>[]>(
    () => [
      {
        id: 'createdAt',
        header: '时间',
        cell: ({ row }) => <span className="text-xs text-ink-soft">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'status',
        header: '状态',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'user',
        header: '用户',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{row.original.user.name}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{row.original.user.email}</p>
          </div>
        ),
      },
      {
        id: 'model',
        header: '模型',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{row.original.modelName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{row.original.modelId}</p>
          </div>
        ),
      },
      {
        id: 'channel',
        header: '内部通道',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-xs text-ink">{row.original.internalProviderModelId ?? '-'}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{row.original.internalProviderId ?? '-'}</p>
          </div>
        ),
      },
      {
        id: 'error',
        header: '错误',
        cell: ({ row }) => <span className="text-xs text-pink">{row.original.errorCategory ?? '-'}</span>,
      },
      {
        id: 'latency',
        header: '延迟',
        cell: ({ row }) => <span className="tabular-nums">{formatLatency(row.original.latencyMs)}</span>,
      },
      {
        id: 'request',
        header: '请求 ID',
        cell: ({ row }) => <ShortId value={row.original.requestId} />,
      },
    ],
    [],
  );
  // TanStack Table intentionally returns function-bearing instances for table state.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="border-b border-hairline bg-surface-alt px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">诊断请求</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-xs text-ink-soft">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-hairline">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.original.id}
                  onClick={() => onSelect(row.original)}
                  className={`cursor-pointer text-ink transition-colors hover:bg-surface-alt ${selectedId === row.original.id ? 'bg-surface-alt' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-ink-soft">
                  没有匹配的 Dicha AI 请求
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DiagnosticDetail({ event }: { event: AdminDichaAiUsageEvent | null }) {
  if (!event) {
    return (
      <aside className="rounded-md border border-hairline bg-surface p-5 text-sm text-ink-soft">
        选择一条请求查看诊断详情
      </aside>
    );
  }
  return (
    <aside className="rounded-md border border-hairline bg-surface">
      <div className="border-b border-hairline bg-surface-alt px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">请求详情</h2>
        <p className="mt-1 text-xs text-ink-soft">{formatDateTime(event.createdAt)}</p>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid gap-2">
          <DetailRow icon={Hash} label="Request ID" value={event.requestId} copyable />
          <DetailRow icon={Hash} label="Upstream ID" value={event.upstreamRequestId} copyable />
          <DetailRow icon={Server} label="Internal Provider" value={event.internalProviderId} copyable />
          <DetailRow icon={Server} label="Internal Channel" value={event.internalProviderModelId} copyable />
        </div>
        <div className="grid gap-2">
          <DetailRow icon={UserRound} label="用户" value={`${event.user.name} / ${event.user.email}`} />
          <DetailRow icon={Layers3} label="模型" value={`${event.modelName} / ${event.modelId}`} />
          <DetailRow icon={Clock3} label="延迟" value={formatLatency(event.latencyMs)} />
          <DetailRow icon={AlertTriangle} label="错误分类" value={event.errorCategory} />
        </div>
        <div className="rounded-md border border-hairline bg-surface-alt p-3">
          <p className="text-xs font-semibold text-ink">用量</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-soft">
            <span>输入 {formatInteger(event.promptTokens)}</span>
            <span>输出 {formatInteger(event.completionTokens)}</span>
            <span>总计 {formatInteger(event.totalTokens)}</span>
            <span>积分 {formatInteger(event.creditAmount)}</span>
          </div>
        </div>
        <div className="rounded-md border border-hairline bg-surface-alt p-3">
          <p className="text-xs font-semibold text-ink">成本</p>
          <p className="mt-2 text-sm tabular-nums text-ink">{formatEventCost(event)}</p>
        </div>
      </div>
    </aside>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <HeroSelect
        value={value}
        onChange={onChange}
        options={options}
      />
    </label>
  );
}

function FilterInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <HeroTextInput value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function QuickFilter({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <HeroButton
      type="button"
      onClick={onClick}
      className="inline-flex h-8 max-w-[220px] items-center gap-2 rounded-md border border-hairline bg-surface-alt px-2.5 text-xs text-ink-soft transition-colors hover:text-ink"
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{count}</span>
    </HeroButton>
  );
}

function MetricCard({
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
        <p className="text-xs font-medium text-ink-soft">{label}</p>
        <span className="grid size-8 place-items-center rounded-md bg-surface-alt text-ink-soft">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 break-words text-xl font-semibold tabular-nums text-ink xl:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{detail}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  copyable = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  copyable?: boolean;
}) {
  const text = value || '-';
  return (
    <div className="rounded-md border border-hairline bg-surface-alt p-3">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Icon className="size-3.5" />
        {label}
        {copyable && value ? (
          <HeroButton
            type="button"
            onClick={() => void copyText(value)}
            className="ml-auto grid size-6 place-items-center rounded border border-hairline bg-surface text-ink-soft transition-colors hover:text-ink"
            aria-label={`复制 ${label}`}
          >
            <Copy className="size-3" />
          </HeroButton>
        ) : null}
      </div>
      <p className="mt-2 break-all text-xs leading-5 text-ink">{text}</p>
    </div>
  );
}

function ShortId({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-ink-soft">-</span>;
  return (
    <HeroButton
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void copyText(value);
      }}
      className="inline-flex max-w-[170px] items-center gap-1.5 rounded-md border border-hairline bg-surface-alt px-2 py-1 text-xs text-ink-soft transition-colors hover:text-ink"
    >
      <Clipboard className="size-3" />
      <span className="truncate">{value}</span>
    </HeroButton>
  );
}

function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-ink-soft">
      <span>
        第 {page} / {Math.max(totalPages, 1)} 页 · 每页 {pageSize} · 共 {formatInteger(total)} 条
      </span>
      <div className="flex items-center gap-2">
        <HeroButton
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          上一页
        </HeroButton>
        <HeroButton
          type="button"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
          className="h-8 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          下一页
        </HeroButton>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminDichaAiUsageEvent['status'] }) {
  const tone =
    status === 'success'
      ? 'border-sage/40 bg-chip-sage text-sage'
      : status === 'degraded'
        ? 'border-peach/40 bg-chip-peach text-ink'
        : 'border-pink/40 bg-chip-pink text-pink';
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function StatusPanel({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) {
  return (
    <div className={`rounded-md border border-hairline bg-surface p-6 text-sm ${tone === 'error' ? 'text-pink' : 'text-ink-soft'}`}>
      {text}
    </div>
  );
}

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  toast.success('已复制');
}

function statusLabel(status: string): string {
  if (status === 'success') return '成功';
  if (status === 'degraded') return '降级';
  if (status === 'failure') return '失败';
  return status;
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatLatency(value: number | null): string {
  return value === null ? '-' : `${formatInteger(value)} ms`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatEventCost(event: AdminDichaAiUsageEvent): string {
  if (!event.estimatedCostCurrency) return '-';
  const symbol = event.estimatedCostCurrency === 'CNY' ? '¥' : '$';
  const amount = event.estimatedCostAmount;
  return `${symbol}${amount.toFixed(amount >= 1 ? 2 : 4)}`;
}
