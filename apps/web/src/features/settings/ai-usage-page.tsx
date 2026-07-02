import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Bot,
  Clock3,
  Coins,
  Layers3,
  PieChart,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiUsageBreakdown, AiUsageEvent, AiUsageReport, AiUsageWindow } from '@dicha/shared';
import { aiUsageQueryOptions } from '@/api/ai';
import { SettingsDetailShell } from '@/components/SettingsScaffold';
import { settingsTintClass, type SettingsTint } from '@/components/settings-ui';

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
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] leading-relaxed text-ink-faint">
            {t('settings.detail.aiUsage.scopeNote')}
          </p>
          <div className="flex rounded-md border border-hairline bg-surface p-1">
            {usageWindows.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setWindow(item.value)}
                className={`h-8 rounded-md px-3 text-[12px] font-medium transition-colors ${
                  window === item.value
                    ? 'bg-[var(--sidebar-bg)] text-sidebar-ink'
                    : 'text-ink-faint hover:bg-surface-alt hover:text-ink'
                }`}
              >
                {t(`settings.detail.aiUsage.windows.${item.value}`)}
              </button>
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

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile
          icon={ReceiptText}
          tint="peach"
          label={t('settings.detail.aiUsage.metrics.calls')}
          value={formatInteger(report.summary.calls)}
        />
        <MetricTile
          icon={Coins}
          tint="sage"
          label={t('settings.detail.aiUsage.metrics.cost')}
          value={formatUsd(report.summary.estimatedCostUsd)}
        />
        <MetricTile
          icon={BarChart3}
          tint="lavender"
          label={t('settings.detail.aiUsage.metrics.tokens')}
          value={formatInteger(report.summary.totalTokens)}
        />
        <MetricTile
          icon={Clock3}
          tint="mist"
          label={t('settings.detail.aiUsage.metrics.latency')}
          value={
            report.summary.averageLatencyMs === null
              ? t('settings.detail.aiUsage.notMeasured')
              : `${formatInteger(report.summary.averageLatencyMs)} ms`
          }
        />
      </section>

      {hasUsage ? (
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
}: {
  icon: LucideIcon;
  tint: SettingsTint;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-md border border-hairline bg-surface px-4 py-3 shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_6%,transparent)]">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}>
          <Icon size={15} />
        </span>
        <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      </div>
      <p className="mt-3 text-[22px] font-semibold leading-none text-ink tabular-nums">{value}</p>
    </article>
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
  const maxCost = Math.max(...rows.map((row) => row.estimatedCostUsd), 0);

  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="flex items-center gap-2 border-b border-hairline bg-surface-alt px-4 py-3">
        <Icon size={15} className="text-ink-faint" />
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="divide-y divide-hairline/70">
        {rows.map((row) => (
          <BreakdownRow key={row.key} row={row} maxCost={maxCost} compact={compact} />
        ))}
      </div>
    </section>
  );
}

function BreakdownRow({
  row,
  maxCost,
  compact,
}: {
  row: AiUsageBreakdown;
  maxCost: number;
  compact: boolean;
}) {
  const { t } = useTranslation();
  const width = maxCost > 0 ? Math.max(8, Math.round((row.estimatedCostUsd / maxCost) * 100)) : 0;

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
        <p className="shrink-0 text-[12px] font-semibold text-ink tabular-nums">{formatUsd(row.estimatedCostUsd)}</p>
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
              {formatInteger(event.totalTokens)} tokens / {formatUsd(event.estimatedCostUsd)}
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

function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value < 0.01 ? 6 : 2,
  }).format(value);
}
