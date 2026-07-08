import {
  createFileRoute,
} from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Activity,
  ArrowDownUp,
  BarChart3,
  CheckCircle2,
  Clock3,
  Coins,
  Gauge,
  Layers3,
  ReceiptText,
  Timer,
  UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminDichaAiUsageQueryOptions } from '@/api/admin';
import { HeroButton, HeroSelect } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import type {
  AdminDichaAiUsageEvent,
  AdminDichaAiUsageReport,
  AiSettlementCurrency,
  AiUsageBreakdown,
  AiUsageSummary,
  AiUsageTimeBucket,
  AiUsageWindow,
} from '@dicha/shared';

const WINDOWS: Array<{ value: AiUsageWindow; label: string }> = [
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'all', label: '全部' },
];

const LOG_LIMITS = [100, 300, 500, 1000] as const;

type TrendMetric = 'calls' | 'totalTokens' | 'cnyCost' | 'usdCost';

const TREND_METRICS: Array<{ value: TrendMetric; label: string; color: string }> = [
  { value: 'calls', label: '请求次数', color: 'var(--warning)' },
  { value: 'totalTokens', label: '总 token', color: 'var(--success)' },
  { value: 'cnyCost', label: '人民币费用', color: 'var(--accent)' },
  { value: 'usdCost', label: '美元费用', color: 'var(--muted)' },
];

export const Route = createFileRoute('/_admin/analytics')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(
      adminDichaAiUsageQueryOptions({ window: '7d', logLimit: 500 }),
    );
  },
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [window, setWindow] = useState<AiUsageWindow>('7d');
  const [logLimit, setLogLimit] = useState<(typeof LOG_LIMITS)[number]>(500);
  const usage = useQuery(adminDichaAiUsageQueryOptions({ window, logLimit }));
  const report = usage.data;

  return (
    <div>
      <PageHeader
        eyebrow="Dicha AI Analytics"
        title="Dicha AI 统计"
        description="只统计官方 Dicha AI 渠道的全局调用、消费、性能与日志，不包含用户自有 API 渠道。"
      />
      <div className="space-y-4 p-5 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-surface p-3">
          <div>
            <p className="text-sm font-semibold text-ink">官方渠道用量</p>
            <p className="mt-1 text-xs text-ink-soft">
              {report ? `${formatDateTime(report.from)} - ${formatDateTime(report.to)}` : '正在读取统计窗口'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md border border-hairline bg-surface-alt p-1">
              {WINDOWS.map((item) => (
                <HeroButton
                  key={item.value}
                  type="button"
                  onClick={() => setWindow(item.value)}
                  className={`h-8 rounded px-3 text-xs transition-colors ${
                    window === item.value
                      ? 'bg-sidebar-bg text-sidebar-ink'
                      : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {item.label}
                </HeroButton>
              ))}
            </div>
            <HeroSelect
              value={String(logLimit)}
              onChange={(nextLimit) => setLogLimit(Number(nextLimit) as (typeof LOG_LIMITS)[number])}
              className="min-w-28"
              options={LOG_LIMITS.map((limit) => ({ value: String(limit), label: `日志 ${limit} 条` }))}
            />
          </div>
        </div>

        {usage.isPending ? <StatusPanel text="正在加载 Dicha AI 统计" /> : null}
        {usage.isError ? <StatusPanel text="Dicha AI 统计加载失败" tone="error" /> : null}
        {report ? <UsageDashboard report={report} /> : null}
      </div>
    </div>
  );
}

function UsageDashboard({ report }: { report: AdminDichaAiUsageReport }) {
  const recentBuckets =
    report.window === '24h'
      ? report.timeSeries.recent24h
      : report.timeSeries.daily.length > 0
        ? report.timeSeries.daily
        : report.timeSeries.hourly;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={Activity}
          label="调用次数"
          value={formatInteger(report.summary.calls)}
          detail={`${formatPercent(report.performance.successRate)} 成功率`}
        />
        <MetricCard
          icon={Coins}
          label="人民币费用"
          value={formatCurrency('CNY', costAmount(report.summary, 'CNY'))}
          detail="按 CNY 结算模型汇总"
        />
        <MetricCard
          icon={ReceiptText}
          label="美元费用"
          value={formatCurrency('USD', costAmount(report.summary, 'USD'))}
          detail="按 USD 结算模型汇总"
        />
        <MetricCard
          icon={BarChart3}
          label="总 token 数"
          value={formatInteger(report.summary.totalTokens)}
          detail={`${formatInteger(report.summary.promptTokens)} 输入 / ${formatInteger(report.summary.completionTokens)} 输出`}
        />
        <MetricCard
          icon={UsersRound}
          label="活跃用户"
          value={formatInteger(report.activeUsers)}
          detail={`${formatInteger(report.totalEvents)} 条调用日志`}
        />
        <MetricCard
          icon={Timer}
          label="平均延迟"
          value={formatLatency(report.summary.averageLatencyMs)}
          detail={`P95 ${formatLatency(report.performance.p95LatencyMs)}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader
            icon={BarChart3}
            title="调用趋势"
            description="按当前窗口聚合请求、token 与费用。"
          />
          <TrendChart buckets={recentBuckets} />
        </section>

        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader icon={Gauge} title="性能指标" description="全局平均与峰值吞吐。" />
          <div className="mt-4 grid gap-2">
            <InfoRow label="平均 RPM" value={formatDecimal(report.performance.averageRpm)} />
            <InfoRow label="平均 TPM" value={formatDecimal(report.performance.averageTpm)} />
            <InfoRow label="峰值 RPM" value={formatInteger(report.performance.peakRpm)} />
            <InfoRow label="峰值 TPM" value={formatInteger(report.performance.peakTpm)} />
            <InfoRow label="失败调用" value={formatInteger(report.summary.failedCalls)} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <ModelUsagePanel items={report.byModel} />
        <StatusPanelBreakdown report={report} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <BreakdownPanel title="用户消耗排行" items={report.byUser} valueMode="cost" />
        <BreakdownPanel title="用途分布" items={report.byUseCase} valueMode="tokens" />
        <BreakdownPanel title="状态分布" items={report.byStatus} valueMode="calls" />
      </div>

      <UsageLogTable events={report.recentEvents} totalEvents={report.totalEvents} logLimit={report.logLimit} />
    </div>
  );
}

function TrendChart({ buckets }: { buckets: AiUsageTimeBucket[] }) {
  const [metric, setMetric] = useState<TrendMetric>('totalTokens');
  const selectedMetric = TREND_METRICS.find((item) => item.value === metric) ?? TREND_METRICS[1]!;
  const data = buckets.slice(-72).map((bucket) => ({
    label: bucket.label,
    calls: bucket.calls,
    totalTokens: bucket.totalTokens,
    cnyCost: costAmount(bucket, 'CNY'),
    usdCost: costAmount(bucket, 'USD'),
  }));

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TREND_METRICS.map((item) => (
          <HeroButton
            key={item.value}
            type="button"
            onClick={() => setMetric(item.value)}
            className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors ${
              metric === item.value
                ? 'border-sidebar-bg bg-sidebar-bg text-sidebar-ink'
                : 'border-hairline bg-surface-alt text-ink-soft hover:text-ink'
            }`}
          >
            {item.label}
          </HeroButton>
        ))}
      </div>
      <div className="h-64 rounded-md border border-hairline bg-surface-alt p-3">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={selectedMetric.color} stopOpacity={0.42} />
                  <stop offset="100%" stopColor={selectedMetric.color} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={44}
                tick={{ fill: 'var(--muted)', fontSize: 11 }}
                tickFormatter={formatCompact}
              />
              <Tooltip
                cursor={{ stroke: 'var(--border)' }}
                contentStyle={{
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  color: 'var(--foreground)',
                  fontSize: 12,
                  boxShadow: 'var(--shadow-raised)',
                }}
                itemStyle={{ color: 'var(--foreground)', fontSize: 12 }}
                labelStyle={{ color: 'var(--muted)', fontSize: 12 }}
                formatter={(value) => formatTrendValue(Number(value), metric)}
              />
              <Area
                type="monotone"
                dataKey={metric}
                name={selectedMetric.label}
                stroke={selectedMetric.color}
                fill="url(#adminTrendFill)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-sm text-ink-soft">暂无趋势数据</div>
        )}
      </div>
    </div>
  );
}

function ModelUsagePanel({ items }: { items: AiUsageBreakdown[] }) {
  const data = items.slice(0, 10).map((item) => ({
    name: item.label,
    calls: item.calls,
    tokens: item.totalTokens,
    cnyCost: costAmount(item, 'CNY'),
    usdCost: costAmount(item, 'USD'),
  }));

  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <SectionHeader icon={Layers3} title="模型使用信息" description="按模型聚合调用量、token 与实际结算费用。" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="h-64 rounded-md border border-hairline bg-surface-alt p-3">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  tickFormatter={formatCompact}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={118}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'color-mix(in oklab, var(--foreground) 4%, transparent)' }}
                  contentStyle={{
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    background: 'var(--surface)',
                    color: 'var(--foreground)',
                    fontSize: 12,
                  }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: 12 }}
                />
                <Bar dataKey="tokens" name="总 token" fill="var(--success)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-ink-soft">暂无模型数据</div>
          )}
        </div>
        <div className="min-w-0 divide-y divide-hairline rounded-md border border-hairline">
          {items.slice(0, 8).map((item) => (
            <div key={item.key} className="grid gap-2 p-3 text-xs md:grid-cols-[minmax(0,1fr)_92px_92px] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
                <p className="mt-1 text-ink-soft">{formatInteger(item.calls)} 次调用</p>
              </div>
              <div className="text-ink-soft">
                <p className="font-semibold tabular-nums text-ink">{formatInteger(item.totalTokens)}</p>
                <p>token</p>
              </div>
              <div className="text-ink-soft">
                <p className="font-semibold tabular-nums text-ink">{formatCostList(item)}</p>
                <p>费用</p>
              </div>
            </div>
          ))}
          {items.length === 0 ? <EmptyBlock text="暂无模型数据" /> : null}
        </div>
      </div>
    </section>
  );
}

function StatusPanelBreakdown({ report }: { report: AdminDichaAiUsageReport }) {
  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <SectionHeader icon={CheckCircle2} title="调用质量" description="成功、降级与失败状态概览。" />
      <div className="mt-4 grid gap-2">
        {report.byStatus.map((item) => (
          <InfoRow
            key={item.key}
            label={statusLabel(item.key)}
            value={`${formatInteger(item.calls)} 次 · ${formatInteger(item.totalTokens)} tokens`}
          />
        ))}
        {report.byStatus.length === 0 ? <EmptyBlock text="暂无状态数据" /> : null}
      </div>
    </section>
  );
}

function BreakdownPanel({
  title,
  items,
  valueMode,
}: {
  title: string;
  items: AiUsageBreakdown[];
  valueMode: 'cost' | 'tokens' | 'calls';
}) {
  const maxValue = Math.max(...items.map((item) => breakdownValue(item, valueMode)), 1);
  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.slice(0, 8).map((item) => {
            const value = breakdownValue(item, valueMode);
            return (
              <div key={item.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate font-medium text-ink">{item.label}</span>
                  <span className="shrink-0 text-ink-soft">{breakdownText(item, valueMode)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-surface-alt">
                  <div
                    className="h-full rounded bg-mist"
                    style={{ width: `${Math.max(3, (value / maxValue) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <EmptyBlock text="暂无分布数据" />
        )}
      </div>
    </section>
  );
}

function UsageLogTable({
  events,
  totalEvents,
  logLimit,
}: {
  events: AdminDichaAiUsageEvent[];
  totalEvents: number;
  logLimit: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const columns = useMemo<ColumnDef<AdminDichaAiUsageEvent>[]>(
    () => [
      {
        id: 'createdAt',
        accessorFn: (event) => new Date(event.createdAt).getTime(),
        header: '时间',
        cell: ({ row }) => <span className="text-xs text-ink-soft">{formatDateTime(row.original.createdAt)}</span>,
      },
      {
        id: 'user',
        accessorFn: (event) => event.user.email,
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
        accessorFn: (event) => event.modelName,
        header: '模型',
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{row.original.modelName}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{row.original.modelId}</p>
          </div>
        ),
      },
      {
        accessorKey: 'useCase',
        header: '用途',
        cell: ({ getValue }) => <span className="text-xs text-ink-soft">{String(getValue())}</span>,
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'totalTokens',
        accessorFn: (event) => event.totalTokens,
        header: 'Token',
        cell: ({ getValue }) => <span className="tabular-nums">{formatInteger(Number(getValue()))}</span>,
        meta: { align: 'right' },
      },
      {
        id: 'cost',
        accessorFn: (event) => eventCostSortValue(event),
        header: '费用',
        cell: ({ row }) => <span className="tabular-nums">{formatEventCost(row.original)}</span>,
        meta: { align: 'right' },
      },
      {
        id: 'latencyMs',
        accessorFn: (event) => event.latencyMs ?? -1,
        header: '延迟',
        cell: ({ row }) => <span className="tabular-nums">{formatLatency(row.original.latencyMs)}</span>,
        meta: { align: 'right' },
      },
    ],
    [],
  );
  // TanStack Table intentionally returns function-bearing instances for table state.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: events,
    columns,
    state: { sorting },
    initialState: { pagination: { pageSize: 50 } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <section className="rounded-md border border-hairline bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline p-4">
        <SectionHeader
          icon={Clock3}
          title="调用日志"
          description={`当前返回 ${formatInteger(events.length)} 条，窗口内共 ${formatInteger(totalEvents)} 条。`}
        />
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span>每页</span>
          <HeroSelect
            value={String(table.getState().pagination.pageSize)}
            onChange={(nextSize) => table.setPageSize(Number(nextSize))}
            className="min-w-20"
            options={[25, 50, 100, 200].map((size) => ({ value: String(size), label: String(size) }))}
          />
          <span>最多 {formatInteger(logLimit)} 条</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-hairline bg-surface-alt text-xs text-ink-soft">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 font-medium ${isRightAligned(header.column.columnDef) ? 'text-right' : ''}`}
                  >
                    {header.isPlaceholder ? null : (
                      <HeroButton
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={`inline-flex items-center gap-1.5 ${isRightAligned(header.column.columnDef) ? 'justify-end' : ''}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? <ArrowDownUp className="size-3" strokeWidth={1.8} /> : null}
                      </HeroButton>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-hairline">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="text-ink">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-3 ${isRightAligned(cell.column.columnDef) ? 'text-right' : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-ink-soft">
                  还没有 Dicha AI 调用日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline p-3 text-xs text-ink-soft">
        <span>
          第 {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)} 页
        </span>
        <div className="flex items-center gap-2">
          <HeroButton
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="h-8 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
          >
            上一页
          </HeroButton>
          <HeroButton
            type="button"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="h-8 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
          >
            下一页
          </HeroButton>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
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

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-alt text-ink-soft">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-alt px-3 py-2">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className="text-right text-sm font-semibold tabular-nums text-ink">{value}</span>
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

function EmptyBlock({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-hairline bg-surface-alt p-4 text-sm text-ink-soft">
      {text}
    </p>
  );
}

function costAmount(summary: AiUsageSummary, currency: AiSettlementCurrency): number {
  return summary.costByCurrency.find((item) => item.currency === currency)?.amount ?? 0;
}

function formatCostList(summary: AiUsageSummary): string {
  const cny = costAmount(summary, 'CNY');
  const usd = costAmount(summary, 'USD');
  if (cny > 0 && usd > 0) return `${formatCurrency('CNY', cny)} / ${formatCurrency('USD', usd)}`;
  if (cny > 0) return formatCurrency('CNY', cny);
  return formatCurrency('USD', usd);
}

function formatEventCost(event: AdminDichaAiUsageEvent): string {
  if (event.estimatedCostCurrency) {
    return formatCurrency(event.estimatedCostCurrency, event.estimatedCostAmount);
  }
  return '-';
}

function eventCostSortValue(event: AdminDichaAiUsageEvent): number {
  return event.estimatedCostAmount;
}

function breakdownValue(item: AiUsageBreakdown, mode: 'cost' | 'tokens' | 'calls'): number {
  if (mode === 'calls') return item.calls;
  if (mode === 'tokens') return item.totalTokens;
  return item.costByCurrency.reduce((total, cost) => total + cost.amount, 0);
}

function breakdownText(item: AiUsageBreakdown, mode: 'cost' | 'tokens' | 'calls'): string {
  if (mode === 'calls') return `${formatInteger(item.calls)} 次`;
  if (mode === 'tokens') return `${formatInteger(item.totalTokens)} tokens`;
  return formatCostList(item);
}

function statusLabel(status: string): string {
  if (status === 'success') return '成功';
  if (status === 'degraded') return '降级';
  if (status === 'failure') return '失败';
  return status;
}

function isRightAligned(column: ColumnDef<AdminDichaAiUsageEvent>): boolean {
  return (column.meta as { align?: 'right' } | undefined)?.align === 'right';
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 3 }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatCurrency(currency: AiSettlementCurrency, value: number): string {
  const symbol = currency === 'CNY' ? '¥' : '$';
  if (value === 0) return `${symbol}0`;
  return `${symbol}${value.toFixed(value >= 1 ? 2 : 4)}`;
}

function formatTrendValue(value: number, metric: TrendMetric): string {
  if (metric === 'cnyCost') return formatCurrency('CNY', value);
  if (metric === 'usdCost') return formatCurrency('USD', value);
  if (metric === 'calls') return `${formatInteger(value)} 次`;
  return `${formatInteger(value)} tokens`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatLatency(value: number | null): string {
  return value === null ? '-' : `${formatInteger(value)}ms`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '全部历史';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
