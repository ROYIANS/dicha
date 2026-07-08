import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bot,
  Clock3,
  Coins,
  Gauge,
  Layers3,
  LineChart as LineChartIcon,
  PieChart,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AiUsageBreakdown,
  AiUsageDistribution,
  AiUsageEvent,
  AiUsageReport,
  AiUsageTimeBucket,
  AiUsageWindow,
} from '@dicha/shared';
import { aiUsageQueryOptions } from '@/api/ai';
import { SettingsDetailShell } from '@/components/SettingsScaffold';
import { settingsTintClass, type SettingsTint } from '@/components/settings-ui';
import { HeroButton } from '@/components/HeroControls';

const usageWindows = [
  { value: '24h' },
  { value: '7d' },
  { value: '30d' },
  { value: 'all' },
] satisfies Array<{ value: AiUsageWindow }>;

const statusTone = {
  success: 'sage',
  failure: 'pink',
  degraded: 'peach',
} satisfies Record<AiUsageEvent['status'], SettingsTint>;

const chartColors = [
  'var(--success)',
  'var(--warning)',
  'var(--accent)',
  'var(--muted)',
  'var(--danger)',
  'var(--accent)',
];

type DistributionChartType = 'area' | 'bar';
type DistributionGroupBy = 'provider' | 'model';
type DistributionGranularity = 'hour' | 'day';
type DistributionMetric = 'creditAmount' | 'totalTokens' | 'calls';

type ChartDatum = Record<string, number | string>;

export function AiUsageSettingsPage() {
  const { t } = useTranslation();
  const [window, setWindow] = useState<AiUsageWindow>('7d');
  const usageQuery = useQuery(aiUsageQueryOptions(window));
  const report = usageQuery.data;

  return (
    <SettingsDetailShell
      title={t('settings.detail.aiUsage.title')}
      subtitle={t('settings.detail.aiUsage.subtitle')}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] leading-relaxed text-ink-faint">
            {t('settings.detail.aiUsage.scopeNote')}
          </p>
          <div className="flex rounded-md border border-hairline bg-surface p-1">
            {usageWindows.map((item) => (
              <HeroButton
                key={item.value}
                type="button"
                onClick={() => setWindow(item.value)}
                className={`h-8 rounded-md px-3 text-[12px] font-medium transition-colors ${
                  window === item.value
                    ? 'bg-[var(--accent)] text-sidebar-ink'
                    : 'text-ink-faint hover:bg-surface-alt hover:text-ink'
                }`}
              >
                {t(`settings.detail.aiUsage.windows.${item.value}`)}
              </HeroButton>
            ))}
          </div>
        </div>

        {report ? <UsageDashboard report={report} /> : <LoadingUsage />}
      </div>
    </SettingsDetailShell>
  );
}

function UsageDashboard({ report }: { report: AiUsageReport }) {
  const { t } = useTranslation();
  const hasUsage = report.summary.calls > 0;
  const historyBuckets = selectHistoryBuckets(report);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          icon={ReceiptText}
          tint="peach"
          label={t('settings.detail.aiUsage.metrics.calls')}
          value={formatInteger(report.summary.calls)}
          detail={t('settings.detail.aiUsage.metrics.callStatus', {
            success: formatInteger(report.summary.successfulCalls),
            degraded: formatInteger(report.summary.degradedCalls),
            failed: formatInteger(report.summary.failedCalls),
          })}
        />
        <MetricTile
          icon={Coins}
          tint="sage"
          label={t('settings.detail.aiUsage.metrics.credits')}
          value={formatCredits(report.summary.creditAmount)}
          detail={t('settings.detail.aiUsage.metrics.successRate', {
            value: formatPercent(report.performance.successRate),
          })}
        />
        <MetricTile
          icon={BarChart3}
          tint="lavender"
          label={t('settings.detail.aiUsage.metrics.tokens')}
          value={formatInteger(report.summary.totalTokens)}
          detail={t('settings.detail.aiUsage.metrics.tokenSplit', {
            prompt: formatInteger(report.summary.promptTokens),
            completion: formatInteger(report.summary.completionTokens),
          })}
        />
        <MetricTile
          icon={Clock3}
          tint="mist"
          label={t('settings.detail.aiUsage.metrics.latency')}
          value={formatLatency(report.summary.averageLatencyMs, t('settings.detail.aiUsage.notMeasured'))}
          detail={t('settings.detail.aiUsage.metrics.p95Latency', {
            value: formatLatency(report.performance.p95LatencyMs, t('settings.detail.aiUsage.notMeasured')),
          })}
        />
        <MetricTile
          icon={Gauge}
          tint="pink"
          label={t('settings.detail.aiUsage.metrics.rpm')}
          value={formatRate(report.performance.averageRpm)}
          detail={t('settings.detail.aiUsage.metrics.peakRpm', {
            value: formatRate(report.performance.peakRpm),
          })}
        />
        <MetricTile
          icon={LineChartIcon}
          tint="sage"
          label={t('settings.detail.aiUsage.metrics.tpm')}
          value={formatRate(report.performance.averageTpm)}
          detail={t('settings.detail.aiUsage.metrics.peakTpm', {
            value: formatRate(report.performance.peakTpm),
          })}
        />
      </section>

      {hasUsage ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TrendCard
              title={t('settings.detail.aiUsage.trends.recent24h')}
              value={formatInteger(sumBuckets(report.timeSeries.recent24h, 'totalTokens'))}
              metric="totalTokens"
              data={report.timeSeries.recent24h}
              tint="sage"
            />
            <TrendCard
              title={t('settings.detail.aiUsage.trends.history')}
              value={formatInteger(sumBuckets(historyBuckets, 'totalTokens'))}
              metric="totalTokens"
              data={historyBuckets}
              tint="lavender"
            />
            <TrendCard
              title={t('settings.detail.aiUsage.trends.credits')}
              value={formatCredits(sumBuckets(historyBuckets, 'creditAmount'))}
              metric="creditAmount"
              data={historyBuckets}
              tint="peach"
            />
            <TrendCard
              title={t('settings.detail.aiUsage.trends.requests')}
              value={formatInteger(sumBuckets(historyBuckets, 'calls'))}
              metric="calls"
              data={historyBuckets}
              tint="mist"
            />
          </section>

          <DistributionPanel report={report} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              <BreakdownPanel
                title={t('settings.detail.aiUsage.providerBreakdown')}
                icon={PieChart}
                rows={report.byProvider}
              />
              <BreakdownPanel
                title={t('settings.detail.aiUsage.modelBreakdown')}
                icon={Layers3}
                rows={report.byModel}
              />
            </section>
            <section className="space-y-4">
              <BreakdownPanel
                title={t('settings.detail.aiUsage.useCaseBreakdown')}
                icon={Bot}
                rows={report.byUseCase}
                compact
              />
              <RecentEvents events={report.recentEvents} />
            </section>
          </div>
        </>
      ) : (
        <EmptyUsage />
      )}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  tint,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  tint: SettingsTint;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-md border border-hairline bg-surface px-4 py-3 shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--foreground)_6%,transparent)]">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}>
          <Icon size={15} />
        </span>
        <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      </div>
      <p className="mt-3 truncate text-[20px] font-semibold leading-none text-ink tabular-nums">{value}</p>
      <p className="mt-2 truncate text-[11px] text-ink-faint">{detail}</p>
    </article>
  );
}

function TrendCard({
  title,
  value,
  metric,
  data,
  tint,
}: {
  title: string;
  value: string;
  metric: DistributionMetric;
  data: AiUsageTimeBucket[];
  tint: SettingsTint;
}) {
  const chartData = useMemo(
    () =>
      data.map((bucket) => ({
        label: bucket.label,
        value: bucket[metric],
      })),
    [data, metric],
  );
  const color = chartColors[tintIndex(tint)];

  return (
    <article className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-ink-faint">{title}</p>
          <p className="mt-1 truncate text-[20px] font-semibold leading-none text-ink tabular-nums">{value}</p>
        </div>
        <span className={`grid size-8 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}>
          <LineChartIcon size={15} />
        </span>
      </div>
      <div className="h-24 px-1 pb-1 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
            <Tooltip
              cursor={{ stroke: 'var(--border)' }}
              formatter={(nextValue) => formatChartValue(Number(nextValue), metric)}
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelStyle={tooltipLabelStyle}
              wrapperStyle={tooltipWrapperStyle}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.18}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function DistributionPanel({ report }: { report: AiUsageReport }) {
  const { t } = useTranslation();
  const [chartType, setChartType] = useState<DistributionChartType>('area');
  const [groupBy, setGroupBy] = useState<DistributionGroupBy>('model');
  const [granularity, setGranularity] = useState<DistributionGranularity>('day');
  const [metric, setMetric] = useState<DistributionMetric>('creditAmount');
  const distribution = selectDistribution(report, groupBy, granularity);
  const { data, series } = useMemo(
    () => buildDistributionChartData(distribution, metric),
    [distribution, metric],
  );

  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-alt px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={15} className="text-ink-faint" />
          <h2 className="text-[13px] font-semibold text-ink">
            {t('settings.detail.aiUsage.distribution.title')}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl
            value={chartType}
            onChange={setChartType}
            options={[
              { value: 'area', label: t('settings.detail.aiUsage.distribution.chartTypes.area') },
              { value: 'bar', label: t('settings.detail.aiUsage.distribution.chartTypes.bar') },
            ]}
          />
          <SegmentedControl
            value={groupBy}
            onChange={setGroupBy}
            options={[
              { value: 'model', label: t('settings.detail.aiUsage.distribution.groupBy.model') },
              { value: 'provider', label: t('settings.detail.aiUsage.distribution.groupBy.provider') },
            ]}
          />
          <SegmentedControl
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: 'hour', label: t('settings.detail.aiUsage.distribution.granularity.hour') },
              { value: 'day', label: t('settings.detail.aiUsage.distribution.granularity.day') },
            ]}
          />
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'creditAmount', label: t('settings.detail.aiUsage.distribution.metrics.credits') },
              { value: 'totalTokens', label: t('settings.detail.aiUsage.distribution.metrics.tokens') },
              { value: 'calls', label: t('settings.detail.aiUsage.distribution.metrics.calls') },
            ]}
          />
        </div>
      </div>
      <div className="h-[320px] px-3 py-4">
        {series.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(value) => compactChartValue(Number(value), metric)} />
                <Tooltip
                  formatter={(nextValue) => formatChartValue(Number(nextValue), metric)}
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  wrapperStyle={tooltipWrapperStyle}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--field-placeholder)' }} />
                {series.map((item) => (
                  <Area
                    key={item.dataKey}
                    type="monotone"
                    dataKey={item.dataKey}
                    name={item.label}
                    stackId="usage"
                    stroke={item.color}
                    fill={item.color}
                    fillOpacity={0.2}
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            ) : (
              <RechartsBarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(value) => compactChartValue(Number(value), metric)} />
                <Tooltip
                  formatter={(nextValue) => formatChartValue(Number(nextValue), metric)}
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  wrapperStyle={tooltipWrapperStyle}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--field-placeholder)' }} />
                {series.map((item) => (
                  <Bar
                    key={item.dataKey}
                    dataKey={item.dataKey}
                    name={item.label}
                    stackId="usage"
                    fill={item.color}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </RechartsBarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center text-[12px] text-ink-faint">
            {t('settings.detail.aiUsage.distribution.empty')}
          </div>
        )}
      </div>
    </section>
  );
}

function SegmentedControl<TValue extends string>({
  value,
  onChange,
  options,
}: {
  value: TValue;
  onChange: (value: TValue) => void;
  options: Array<{ value: TValue; label: string }>;
}) {
  return (
    <div className="flex rounded-md border border-hairline bg-surface p-0.5">
      {options.map((option) => (
        <HeroButton
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors ${
            value === option.value
              ? 'bg-[var(--accent)] text-sidebar-ink'
              : 'text-ink-faint hover:bg-surface-alt hover:text-ink'
          }`}
        >
          {option.label}
        </HeroButton>
      ))}
    </div>
  );
}

function BreakdownPanel({
  title,
  icon: Icon,
  rows,
  compact = false,
}: {
  title: string;
  icon: LucideIcon;
  rows: AiUsageBreakdown[];
  compact?: boolean;
}) {
  const maxCredits = Math.max(...rows.map((row) => row.creditAmount), 0);

  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-alt px-4 py-3">
        <Icon size={15} className="text-ink-faint" />
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="divide-y divide-hairline/70">
        {rows.map((row) => (
          <BreakdownRow key={row.key} row={row} maxCredits={maxCredits} compact={compact} />
        ))}
      </div>
    </section>
  );
}

function BreakdownRow({
  row,
  maxCredits,
  compact,
}: {
  row: AiUsageBreakdown;
  maxCredits: number;
  compact: boolean;
}) {
  const { t } = useTranslation();
  const width = maxCredits > 0 ? Math.max(8, Math.round((row.creditAmount / maxCredits) * 100)) : 0;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{row.label}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {t('settings.detail.aiUsage.breakdownMeta', {
              calls: formatInteger(row.calls),
              tokens: formatInteger(row.totalTokens),
            })}
          </p>
        </div>
        <p className="shrink-0 text-[12px] font-semibold text-ink tabular-nums">{formatCredits(row.creditAmount)}</p>
      </div>
      {compact ? null : (
        <div className="mt-2 h-2 overflow-hidden rounded-md bg-canvas">
          <div className="h-full rounded-md bg-sage" style={{ width: `${width}%` }} />
        </div>
      )}
    </div>
  );
}

function RecentEvents({ events }: { events: AiUsageEvent[] }) {
  const { t } = useTranslation();
  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-alt px-4 py-3">
        <Activity size={15} className="text-ink-faint" />
        <h2 className="text-[13px] font-semibold text-ink">
          {t('settings.detail.aiUsage.recentEvents')}
        </h2>
      </div>
      <div className="divide-y divide-hairline/70">
        {events.map((event) => (
          <div key={event.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{event.modelName}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {event.providerName} / {t(`settings.aiUseCases.${event.useCase}`)} /{' '}
                  {new Date(event.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md border border-hairline px-1.5 py-0.5 text-[10px] font-medium ${settingsTintClass[statusTone[event.status]]}`}
              >
                {t(`settings.detail.aiUsage.status.${event.status}`)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">
              {formatInteger(event.totalTokens)} tokens / {formatCredits(event.creditAmount)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyUsage() {
  const { t } = useTranslation();
  return (
    <section className="rounded-md border border-dashed border-hairline bg-surface px-5 py-8 text-center">
      <ReceiptText size={24} className="mx-auto text-ink-faint" />
      <h2 className="mt-3 text-[16px] font-semibold text-ink">
        {t('settings.detail.aiUsage.emptyTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-ink-faint">
        {t('settings.detail.aiUsage.emptyDesc')}
      </p>
    </section>
  );
}

function LoadingUsage() {
  const { t } = useTranslation();
  return (
    <section className="rounded-md border border-hairline bg-surface px-5 py-8 text-center text-[12px] text-ink-faint">
      {t('settings.detail.aiUsage.loading')}
    </section>
  );
}

function selectHistoryBuckets(report: AiUsageReport): AiUsageTimeBucket[] {
  if (report.window === '24h') return report.timeSeries.recent24h;
  if (report.timeSeries.daily.length > 0) return report.timeSeries.daily;
  return report.timeSeries.hourly;
}

function selectDistribution(
  report: AiUsageReport,
  groupBy: DistributionGroupBy,
  granularity: DistributionGranularity,
): AiUsageDistribution {
  if (groupBy === 'provider' && granularity === 'hour') return report.distributions.providerHourly;
  if (groupBy === 'provider' && granularity === 'day') return report.distributions.providerDaily;
  if (groupBy === 'model' && granularity === 'hour') return report.distributions.modelHourly;
  return report.distributions.modelDaily;
}

function buildDistributionChartData(distribution: AiUsageDistribution, metric: DistributionMetric) {
  const topGroups = distribution.groups.slice(0, 6);
  const series = topGroups.map((group, index) => ({
    dataKey: `series${index}`,
    label: group.label,
    color: chartColors[index % chartColors.length],
  }));
  const data = distribution.buckets.map((bucket, bucketIndex) => {
    const row: ChartDatum = { label: bucket.label };
    topGroups.forEach((group, groupIndex) => {
      row[`series${groupIndex}`] = group.buckets[bucketIndex]?.[metric] ?? 0;
    });
    return row;
  });

  return { data, series };
}

function sumBuckets(buckets: AiUsageTimeBucket[], metric: DistributionMetric): number {
  const total = buckets.reduce((sum, bucket) => sum + bucket[metric], 0);
  return total;
}

function tintIndex(tint: SettingsTint): number {
  const order: SettingsTint[] = ['sage', 'peach', 'lavender', 'mist', 'pink'];
  return order.indexOf(tint);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value < 10 ? 3 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatLatency(value: number | null, fallback: string) {
  return value === null ? fallback : `${formatInteger(value)} ms`;
}

function formatCredits(value: number) {
  return `${formatInteger(value)} 积分`;
}

function formatChartValue(value: number, metric: DistributionMetric) {
  if (metric === 'creditAmount') return formatCredits(value);
  return formatInteger(value);
}

function compactChartValue(value: number, metric: DistributionMetric) {
  if (metric === 'creditAmount') return formatInteger(value);
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

const axisTick = {
  fill: 'var(--field-placeholder)',
  fontSize: 11,
};

const tooltipStyle = {
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--surface)',
  color: 'var(--foreground)',
  fontSize: 11,
  lineHeight: 1.35,
  padding: '7px 9px',
  boxShadow: '0 8px 24px color-mix(in oklab, var(--foreground) 12%, transparent)',
};

const tooltipItemStyle = {
  color: 'var(--muted)',
  fontSize: 11,
  lineHeight: 1.35,
  paddingBlock: 2,
};

const tooltipLabelStyle = {
  color: 'var(--field-placeholder)',
  fontSize: 10,
  lineHeight: 1.3,
  marginBottom: 4,
};

const tooltipWrapperStyle = {
  outline: 'none',
};
