import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Coins,
  Gift,
  PieChart,
  ReceiptText,
  Ticket,
  TrendingDown,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
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
import { adminCreditOperationsQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type {
  AdminCreditOperationsAiBreakdown,
  AdminCreditOperationsBreakdown,
  AdminCreditOperationsBucket,
  AdminCreditOperationsReport,
  AdminCreditOperationsUserRank,
  AiUsageWindow,
} from '@dicha/shared';

const WINDOWS: Array<{ value: AiUsageWindow; label: string }> = [
  { value: '24h', label: '24 小时' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'all', label: '全部' },
];

const CHART_COLORS = {
  granted: 'var(--accent-sage)',
  redeemed: 'var(--accent-peach)',
  spent: 'var(--accent-pink)',
  ai: 'var(--accent-lavender)',
  net: 'var(--accent-mist)',
};

export const Route = createFileRoute('/_admin/credits/operations')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminCreditOperationsQueryOptions({ window: '7d' })),
  component: CreditOperationsPage,
});

function CreditOperationsPage() {
  const [window, setWindow] = useState<AiUsageWindow>('7d');
  const operations = useQuery(adminCreditOperationsQueryOptions({ window }));
  const report = operations.data;

  return (
    <div>
      <PageHeader
        eyebrow="Credit Operations"
        title="积分运营"
        description="查看全局积分余额、发放、消耗、兑换码效果与官方 Dicha AI 积分消耗排行。"
      />
      <div className="space-y-4 p-5 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-surface p-3">
          <div>
            <p className="text-sm font-semibold text-ink">运营窗口</p>
            <p className="mt-1 text-xs text-ink-soft">
              {report ? `${formatDateTime(report.from)} - ${formatDateTime(report.to)}` : '正在读取积分运营数据'}
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

        {operations.isPending ? <StatusPanel text="正在加载积分运营看板" /> : null}
        {operations.isError ? <StatusPanel text="积分运营看板加载失败" tone="error" /> : null}
        {report ? <CreditOperationsDashboard report={report} /> : null}
      </div>
    </div>
  );
}

function CreditOperationsDashboard({ report }: { report: AdminCreditOperationsReport }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={WalletCards}
          label="当前总余额"
          value={formatInteger(report.summary.totalBalance)}
          detail={`${formatInteger(report.summary.activeAccounts)} 个活跃账户`}
        />
        <MetricCard
          icon={Gift}
          label="累计发放"
          value={formatInteger(report.summary.lifetimeGranted)}
          detail={`窗口内 ${formatInteger(report.summary.grantedCredits)}`}
        />
        <MetricCard
          icon={TrendingDown}
          label="累计消耗"
          value={formatInteger(report.summary.lifetimeSpent)}
          detail={`窗口内 ${formatInteger(report.summary.spentCredits)}`}
        />
        <MetricCard
          icon={Ticket}
          label="兑换积分"
          value={formatInteger(report.summary.redeemedCredits)}
          detail={`${formatPercent(report.redemption.usageRate)} 兑换码使用率`}
        />
        <MetricCard
          icon={Coins}
          label="AI 扣费"
          value={formatInteger(report.summary.aiSpentCredits)}
          detail="官方 Dicha AI"
        />
        <MetricCard
          icon={ReceiptText}
          label="净变动"
          value={signedInteger(report.summary.netChange)}
          detail={`${formatInteger(report.summary.ledgerEntries)} 条流水`}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader icon={BarChart3} title="积分趋势" description="按当前窗口聚合发放、兑换、扣费与净变动。" />
          <CreditTrendChart buckets={report.timeSeries} />
        </section>
        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader icon={PieChart} title="类型分布" description="按积分流水类型统计窗口内变动。" />
          <CreditTypeChart items={report.byType} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-md border border-hairline bg-surface p-4">
          <SectionHeader icon={UsersRound} title="用户排行" description="余额、消耗、获得与最近活跃用户。" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <UserRankList title="余额最高" rows={report.userRanks.byBalance} valueLabel="余额" />
            <UserRankList title="消耗最多" rows={report.userRanks.bySpent} valueLabel="消耗" />
            <UserRankList title="获得最多" rows={report.userRanks.byGranted} valueLabel="获得" />
            <UserRankList title="最近活跃" rows={report.userRanks.byRecentActivity} valueLabel="变动" signed />
          </div>
        </section>
        <RedemptionSummaryCard report={report} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AiRankPanel title="AI 模型积分消耗" rows={report.aiUsage.byModel} />
        <AiRankPanel title="AI 用途积分消耗" rows={report.aiUsage.byUseCase} />
      </div>
    </div>
  );
}

function CreditTrendChart({ buckets }: { buckets: AdminCreditOperationsBucket[] }) {
  const data = buckets.map((bucket) => ({
    label: bucket.label,
    grantedCredits: bucket.grantedCredits,
    redeemedCredits: bucket.redeemedCredits,
    spentCredits: bucket.spentCredits,
    aiSpentCredits: bucket.aiSpentCredits,
    netChange: bucket.netChange,
  }));

  return (
    <div className="mt-4 h-72 rounded-md border border-hairline bg-surface-alt p-3">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="creditGrantedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.granted} stopOpacity={0.36} />
                <stop offset="100%" stopColor={CHART_COLORS.granted} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="creditSpentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.spent} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART_COLORS.spent} stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} width={64} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" name="发放" dataKey="grantedCredits" stroke={CHART_COLORS.granted} fill="url(#creditGrantedFill)" strokeWidth={2} />
            <Area type="monotone" name="兑换" dataKey="redeemedCredits" stroke={CHART_COLORS.redeemed} fill="transparent" strokeWidth={2} />
            <Area type="monotone" name="扣费" dataKey="spentCredits" stroke={CHART_COLORS.spent} fill="url(#creditSpentFill)" strokeWidth={2} />
            <Area type="monotone" name="AI 扣费" dataKey="aiSpentCredits" stroke={CHART_COLORS.ai} fill="transparent" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState text="暂无积分趋势数据" />
      )}
    </div>
  );
}

function CreditTypeChart({ items }: { items: AdminCreditOperationsBreakdown[] }) {
  const data = items.map((item) => ({
    label: item.label,
    credits: Math.abs(item.credits),
    rawCredits: item.credits,
    entries: item.entries,
  }));

  return (
    <div className="mt-4 h-72 rounded-md border border-hairline bg-surface-alt p-3">
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <CartesianGrid stroke="var(--hairline)" horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} />
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--ink-faint)' }} width={56} />
            <Tooltip content={<ChartTooltip />} />
            <Bar name="积分" dataKey="credits" fill="var(--accent-peach)" radius={[0, 4, 4, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState text="暂无类型分布数据" />
      )}
    </div>
  );
}

function RedemptionSummaryCard({ report }: { report: AdminCreditOperationsReport }) {
  const redemption = report.redemption;
  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <SectionHeader icon={Ticket} title="兑换码概况" description="活动与测试兑换码的使用状态。" />
      <div className="mt-4 grid gap-2">
        <InfoRow label="兑换码总数" value={formatInteger(redemption.totalCodes)} />
        <InfoRow label="启用中" value={formatInteger(redemption.enabledCodes)} />
        <InfoRow label="已耗尽" value={formatInteger(redemption.exhaustedCodes)} />
        <InfoRow label="已过期" value={formatInteger(redemption.expiredCodes)} />
        <InfoRow label="7 天内过期" value={formatInteger(redemption.expiringSoonCodes)} />
        <InfoRow label="已兑换积分" value={formatInteger(redemption.redeemedCredits)} />
        <InfoRow label="剩余额度" value={formatInteger(redemption.remainingCredits)} />
      </div>
    </section>
  );
}

function UserRankList({
  title,
  rows,
  valueLabel,
  signed = false,
}: {
  title: string;
  rows: AdminCreditOperationsUserRank[];
  valueLabel: string;
  signed?: boolean;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt">
      <div className="border-b border-hairline px-3 py-2 text-xs font-semibold text-ink">{title}</div>
      <div className="divide-y divide-hairline/70">
        {rows.map((row) => (
          <div key={`${title}-${row.user.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{row.user.name}</p>
              <p className="mt-0.5 truncate text-ink-faint">{row.user.email}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums text-ink">
                {signed ? signedInteger(row.credits) : formatInteger(row.credits)}
              </p>
              <p className="mt-0.5 text-ink-faint">{valueLabel}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 ? <EmptyState text="暂无数据" compact /> : null}
      </div>
    </div>
  );
}

function AiRankPanel({ title, rows }: { title: string; rows: AdminCreditOperationsAiBreakdown[] }) {
  return (
    <section className="rounded-md border border-hairline bg-surface p-4">
      <SectionHeader icon={Coins} title={title} description="只统计官方 Dicha AI 积分扣费。" />
      <div className="mt-4 divide-y divide-hairline/70 rounded-md border border-hairline bg-surface-alt">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_120px_100px] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{row.label}</p>
              <p className="mt-0.5 truncate text-xs text-ink-faint">{row.key}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-ink sm:text-right">
              {formatInteger(row.credits)}
            </span>
            <span className="text-xs text-ink-soft sm:text-right">
              {formatInteger(row.calls)} 次
            </span>
          </div>
        ))}
        {rows.length === 0 ? <EmptyState text="暂无 AI 积分消耗" /> : null}
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
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-md border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink-soft">{label}</p>
        <span className="grid size-8 place-items-center rounded-md bg-surface-alt text-ink-soft">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 break-words text-xl font-semibold tabular-nums text-ink xl:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{detail}</p>
    </article>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-alt text-ink-soft">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm">
      <span className="text-xs text-ink-soft">{label}</span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </div>
  );
}

function StatusPanel({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) {
  return (
    <div className={`rounded-md border border-hairline bg-surface p-6 text-sm ${tone === 'error' ? 'text-pink' : 'text-ink-soft'}`}>
      {text}
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'px-3 py-4' : 'px-4 py-8'} text-center text-xs text-ink-faint`}>
      {text}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 text-xs shadow-float">
      <p className="mb-1 font-medium text-ink">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={`${item.name}-${item.color}`} className="flex items-center justify-between gap-4">
            <span className="text-ink-soft">{item.name}</span>
            <span className="font-semibold tabular-nums text-ink">{formatInteger(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function signedInteger(value: number) {
  return `${value > 0 ? '+' : ''}${formatInteger(value)}`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string | null) {
  if (!value) return '开始';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
