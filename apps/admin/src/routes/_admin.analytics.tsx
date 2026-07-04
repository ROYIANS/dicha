import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Clock3,
  Coins,
  Gauge,
  Timer,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { adminDichaAiUsageQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type {
  AdminDichaAiUsageEvent,
  AdminDichaAiUsageReport,
  AiUsageBreakdown,
  AiUsageTimeBucket,
  AiUsageWindow,
} from '@dicha/shared';

const WINDOWS: Array<{ value: AiUsageWindow; label: string }> = [
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'all', label: '全部' },
];

export const Route = createFileRoute('/_admin/analytics')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminDichaAiUsageQueryOptions('7d')),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [window, setWindow] = useState<AiUsageWindow>('7d');
  const usage = useQuery(adminDichaAiUsageQueryOptions(window));
  const report = usage.data;

  return (
    <div>
      <PageHeader
        eyebrow="DicHA AI Analytics"
        title="DicHA AI 统计"
        description="只统计官方 DicHA AI 渠道的全局调用、消费、性能与日志，不包含用户自有 API 渠道。"
      />
      <div className="space-y-4 p-5 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-surface p-3">
          <div>
            <p className="text-sm font-semibold text-ink">官方渠道用量</p>
            <p className="mt-1 text-xs text-ink-soft">
              {report ? `${formatDateTime(report.from)} - ${formatDateTime(report.to)}` : '正在读取统计窗口'}
            </p>
          </div>
          <div className="flex rounded-md border border-hairline bg-surface-alt p-1">
            {WINDOWS.map((item) => (
              <button
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
              </button>
            ))}
          </div>
        </div>

        {usage.isPending ? <StatusPanel text="正在加载 DicHA AI 统计" /> : null}
        {usage.isError ? <StatusPanel text="DicHA AI 统计加载失败" tone="error" /> : null}
        {report ? <UsageDashboard report={report} /> : null}
      </div>
    </div>
  );
}

function UsageDashboard({ report }: { report: AdminDichaAiUsageReport }) {
  const recentBuckets =
    report.window === '24h' ? report.timeSeries.recent24h : report.timeSeries.daily.length > 0 ? report.timeSeries.daily : report.timeSeries.hourly;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="调用次数" value={formatInteger(report.summary.calls)} detail={`${formatPercent(report.performance.successRate)} 成功率`} />
        <MetricCard icon={Coins} label="估算费用" value={formatUsd(report.summary.estimatedCostUsd)} detail="仅统计 USD 估算价格" />
        <MetricCard icon={UsersRound} label="活跃用户" value={formatInteger(report.activeUsers)} detail="调用过 DicHA AI 的用户" />
        <MetricCard icon={Timer} label="平均延迟" value={formatLatency(report.summary.averageLatencyMs)} detail={`P95 ${formatLatency(report.performance.p95LatencyMs)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader
            icon={BarChart3}
            title="调用趋势"
            description="按当前窗口聚合请求、token 与费用。"
          />
          <BucketBars buckets={recentBuckets} />
        </section>

        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader icon={Gauge} title="性能指标" description="全局平均与峰值吞吐。" />
          <div className="mt-4 grid gap-2">
            <InfoRow label="平均 RPM" value={formatDecimal(report.performance.averageRpm)} />
            <InfoRow label="平均 TPM" value={formatDecimal(report.performance.averageTpm)} />
            <InfoRow label="峰值 RPM" value={formatInteger(report.performance.peakRpm)} />
            <InfoRow label="峰值 TPM" value={formatInteger(report.performance.peakTpm)} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BreakdownPanel title="模型分布" items={report.byModel} />
        <BreakdownPanel title="用途分布" items={report.byUseCase} />
      </div>

      <section className="rounded-md border border-hairline bg-surface">
        <div className="border-b border-hairline p-4">
          <SectionHeader icon={Clock3} title="最近调用日志" description="最近 20 条官方渠道调用记录。" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-hairline bg-surface-alt text-xs text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">模型</th>
                <th className="px-4 py-3 font-medium">用途</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">Token</th>
                <th className="px-4 py-3 text-right font-medium">费用</th>
                <th className="px-4 py-3 text-right font-medium">延迟</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {report.recentEvents.length > 0 ? (
                report.recentEvents.map((event) => <LogRow key={event.id} event={event} />)
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink-soft">
                    还没有 DicHA AI 调用日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
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
      <p className="mt-3 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{detail}</p>
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

function BucketBars({ buckets }: { buckets: AiUsageTimeBucket[] }) {
  const visibleBuckets = buckets.slice(-36);
  const maxCalls = Math.max(...visibleBuckets.map((bucket) => bucket.calls), 1);
  const maxTokens = Math.max(...visibleBuckets.map((bucket) => bucket.totalTokens), 1);

  return (
    <div className="mt-5">
      <div className="flex h-48 items-end gap-1 rounded-md border border-hairline bg-surface-alt p-3">
        {visibleBuckets.length > 0 ? (
          visibleBuckets.map((bucket) => (
            <div key={bucket.key} className="group flex min-w-3 flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t bg-sage/70 transition-colors group-hover:bg-sage"
                style={{ height: `${Math.max(4, (bucket.totalTokens / maxTokens) * 132)}px` }}
                title={`${bucket.label} · ${formatInteger(bucket.totalTokens)} tokens`}
              />
              <div
                className="w-full rounded-t bg-peach/80 transition-colors group-hover:bg-peach"
                style={{ height: `${Math.max(2, (bucket.calls / maxCalls) * 44)}px` }}
                title={`${bucket.label} · ${formatInteger(bucket.calls)} 次调用`}
              />
            </div>
          ))
        ) : (
          <div className="grid h-full w-full place-items-center text-sm text-ink-soft">暂无趋势数据</div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <span>最多展示最近 36 个桶</span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-sage" />Token</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-sm bg-peach" />调用</span>
        </span>
      </div>
    </div>
  );
}

function BreakdownPanel({ title, items }: { title: string; items: AiUsageBreakdown[] }) {
  const maxTokens = Math.max(...items.map((item) => item.totalTokens), 1);
  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.slice(0, 8).map((item) => (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-ink">{item.label}</span>
                <span className="shrink-0 text-ink-soft">
                  {formatInteger(item.calls)} 次 · {formatInteger(item.totalTokens)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-surface-alt">
                <div
                  className="h-full rounded bg-mist"
                  style={{ width: `${Math.max(3, (item.totalTokens / maxTokens) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-hairline bg-surface-alt p-4 text-sm text-ink-soft">
            暂无分布数据
          </p>
        )}
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-hairline bg-surface-alt px-3 py-2">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function LogRow({ event }: { event: AdminDichaAiUsageEvent }) {
  return (
    <tr className="text-ink">
      <td className="px-4 py-3 text-xs text-ink-soft">{formatDateTime(event.createdAt)}</td>
      <td className="px-4 py-3">
        <p className="truncate text-sm font-medium">{event.user.name}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{event.user.email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="truncate text-sm">{event.modelName}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{event.modelId}</p>
      </td>
      <td className="px-4 py-3 text-xs text-ink-soft">{event.useCase}</td>
      <td className="px-4 py-3">
        <StatusBadge status={event.status} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{formatInteger(event.totalTokens)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatUsd(event.estimatedCostUsd)}</td>
      <td className="px-4 py-3 text-right tabular-nums">{formatLatency(event.latencyMs)}</td>
    </tr>
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
      {status}
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

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 3 }).format(value);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(value >= 1 ? 2 : 6)}`;
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
