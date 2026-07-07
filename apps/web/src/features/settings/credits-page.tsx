import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  CheckCircle2,
  CircleDashed,
  Gift,
  History,
  Ticket,
  TrendingDown,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  checkInToday,
  creditBalanceQueryOptions,
  creditCheckInQueryOptions,
  creditLedgerQueryOptions,
  redeemCreditCode,
} from '@/api/credits';
import { DichaInput } from '@/components/base/DichaControls';
import { SettingsDetailShell } from '@/components/SettingsScaffold';
import { settingsTintClass } from '@/components/settings-ui';
import type { CreditCheckInStatus, CreditLedgerEntry } from '@dicha/shared';

export function CreditsSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const balanceQuery = useQuery(creditBalanceQueryOptions());
  const ledgerQuery = useQuery(creditLedgerQueryOptions({ page: 1, pageSize: 30 }));
  const checkInQuery = useQuery(creditCheckInQueryOptions());
  const redeemMutation = useMutation({
    mutationFn: redeemCreditCode,
    onSuccess: async () => {
      setCode('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['credits'] }),
        queryClient.invalidateQueries({ queryKey: ['ai', 'usage'] }),
      ]);
      toast.success(t('settings.detail.credits.redeemSuccess'));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('settings.detail.credits.redeemFailed'));
    },
  });
  const checkInMutation = useMutation({
    mutationFn: checkInToday,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['credits'] }),
        queryClient.invalidateQueries({ queryKey: ['ai', 'usage'] }),
      ]);
      toast.success(t('settings.detail.credits.checkInSuccess'));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('settings.detail.credits.checkInFailed'));
    },
  });

  const account = balanceQuery.data?.account;
  const entries = ledgerQuery.data?.entries ?? balanceQuery.data?.recentLedger ?? [];

  return (
    <SettingsDetailShell
      title={t('settings.detail.credits.title')}
      subtitle={t('settings.detail.credits.subtitle')}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="grid gap-3 md:grid-cols-3">
          <CreditMetric
            icon={WalletCards}
            label={t('settings.detail.credits.balance')}
            value={formatCredits(account?.balance ?? 0)}
            detail={t('settings.detail.credits.balanceDesc')}
            tint="sage"
          />
          <CreditMetric
            icon={Gift}
            label={t('settings.detail.credits.lifetimeGranted')}
            value={formatCredits(account?.lifetimeGranted ?? 0)}
            detail={t('settings.detail.credits.lifetimeGrantedDesc')}
            tint="peach"
          />
          <CreditMetric
            icon={TrendingDown}
            label={t('settings.detail.credits.lifetimeSpent')}
            value={formatCredits(account?.lifetimeSpent ?? 0)}
            detail={t('settings.detail.credits.lifetimeSpentDesc')}
            tint="lavender"
          />
        </section>

        <CheckInCard
          status={checkInQuery.data}
          loading={checkInQuery.isPending}
          pending={checkInMutation.isPending}
          onCheckIn={() => checkInMutation.mutate()}
        />

        <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-md border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className={`grid size-8 place-items-center rounded-md border border-hairline ${settingsTintClass.mist}`}>
                <Ticket size={15} />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold text-ink">
                  {t('settings.detail.credits.redeemTitle')}
                </h2>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {t('settings.detail.credits.redeemDesc')}
                </p>
              </div>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                redeemMutation.mutate(code);
              }}
            >
              <DichaInput
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('settings.detail.credits.codePlaceholder')}
                className="h-10 w-full text-[13px]"
              />
              <button
                type="submit"
                disabled={!code.trim() || redeemMutation.isPending}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--sidebar-bg)] px-3 text-[12px] font-medium text-sidebar-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Gift size={14} />
                {redeemMutation.isPending
                  ? t('settings.detail.credits.redeeming')
                  : t('settings.detail.credits.redeem')}
              </button>
            </form>
          </div>

          <div className="overflow-hidden rounded-md border border-hairline bg-surface">
            <div className="flex items-center gap-2 border-b border-hairline bg-surface-alt px-4 py-3">
              <History size={15} className="text-ink-faint" />
              <h2 className="text-[13px] font-semibold text-ink">
                {t('settings.detail.credits.ledgerTitle')}
              </h2>
            </div>
            {entries.length > 0 ? (
              <div className="divide-y divide-hairline/70">
                {entries.map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[12px] text-ink-faint">
                {balanceQuery.isPending || ledgerQuery.isPending
                  ? t('settings.detail.credits.loading')
                  : t('settings.detail.credits.emptyLedger')}
              </div>
            )}
          </div>
        </section>
      </div>
    </SettingsDetailShell>
  );
}

function CheckInCard({
  status,
  loading,
  pending,
  onCheckIn,
}: {
  status?: CreditCheckInStatus;
  loading: boolean;
  pending: boolean;
  onCheckIn: () => void;
}) {
  const { t } = useTranslation();
  const campaign = status?.campaign;
  const checkedIn = Boolean(status?.checkedInToday);
  const canCheckIn = Boolean(campaign && !checkedIn && !pending);
  const checkedDays = status?.month.days.filter((day) => day.checkedIn).length ?? 0;
  const rewardRange = campaign
    ? formatCreditRange(campaign.dailyCreditMinAmount, campaign.dailyCreditMaxAmount)
    : '';

  return (
    <section className="relative overflow-hidden rounded-md border border-hairline bg-surface">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(var(--hairline)_1px,transparent_1px),repeating-linear-gradient(135deg,transparent_0,transparent_18px,var(--hairline)_18px,var(--hairline)_19px)] [background-position:0_0,0_0] [background-size:14px_14px,26px_26px]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-8 h-24 w-48 rounded-[50%] border border-peach/50" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 top-14 h-20 w-48 rounded-[50%] border border-sage/40" />
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,var(--accent-peach),var(--accent-sage),var(--accent-mist))]" />

      <div className="relative grid gap-5 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid size-10 shrink-0 place-items-center rounded-md border border-hairline ${settingsTintClass.peach}`}>
            <CalendarCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-peach">
              {t('settings.detail.credits.checkInEyebrow')}
            </p>
            <h2 className="mt-1 text-[16px] font-semibold text-ink">
              {campaign?.name ?? t('settings.detail.credits.checkInTitle')}
            </h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-ink-soft">
              {loading
                ? t('settings.detail.credits.checkInLoading')
                : campaign?.description ?? t('settings.detail.credits.checkInClosed')}
            </p>
            {campaign ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-ink-soft">
                <span className="rounded-md border border-hairline bg-surface/80 px-2 py-1">
                  {t('settings.detail.credits.checkInReward', { value: rewardRange })}
                </span>
                <span className="rounded-md border border-hairline bg-surface/80 px-2 py-1">
                  {t('settings.detail.credits.checkInMonthCount', { count: checkedDays })}
                </span>
                <span className="rounded-md border border-hairline bg-surface/80 px-2 py-1">
                  {campaign.timezone}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <p className="text-[11px] text-ink-faint">
            {status
              ? t('settings.detail.credits.checkInToday', { date: status.todayDate })
              : t('settings.detail.credits.checkInLoading')}
          </p>
          <button
            type="button"
            onClick={onCheckIn}
            disabled={!canCheckIn}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--sidebar-bg)] px-4 text-[12px] font-medium text-sidebar-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50 lg:w-[180px]"
          >
            {checkedIn ? <CheckCircle2 size={15} /> : <Gift size={15} />}
            {pending
              ? t('settings.detail.credits.checkingIn')
              : checkedIn
                ? t('settings.detail.credits.checkedIn')
                : t('settings.detail.credits.checkInAction')}
          </button>
        </div>
      </div>

      <div className="relative border-t border-hairline bg-surface/80 px-4 py-4">
        {status ? (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-[13px] font-semibold text-ink">
                {t('settings.detail.credits.checkInCalendar', {
                  year: status.month.year,
                  month: status.month.month,
                })}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                {t('settings.detail.credits.checkInCalendarDesc')}
              </p>
            </div>
            <CheckInCalendar status={status} />
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-[12px] text-ink-faint">
            {loading ? t('settings.detail.credits.checkInLoading') : t('settings.detail.credits.checkInClosed')}
          </div>
        )}
      </div>
    </section>
  );
}

function CheckInCalendar({ status }: { status: CreditCheckInStatus }) {
  const firstDay = status.month.days[0]?.date;
  const leadingBlanks = firstDay ? new Date(`${firstDay}T00:00:00`).getDay() : 0;
  const cells = [
    ...Array.from({ length: leadingBlanks }, (_, index) => ({ type: 'blank' as const, key: `blank-${index}` })),
    ...status.month.days.map((day) => ({ type: 'day' as const, key: day.date, day })),
  ];

  return (
    <div className="w-full max-w-[252px] lg:justify-self-end">
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-ink-faint">
        {['日', '一', '二', '三', '四', '五', '六'].map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) =>
          cell.type === 'blank' ? (
            <span key={cell.key} className="size-7" />
          ) : (
            <span
              key={cell.key}
              className={`grid size-7 place-items-center rounded-md border text-[11px] tabular-nums transition-colors ${
                cell.day.checkedIn
                  ? 'border-sage bg-chip-sage text-sage'
                  : cell.day.date === status.todayDate
                    ? 'border-peach bg-chip-peach text-peach'
                    : 'border-hairline bg-surface-alt text-ink-faint'
              }`}
              title={cell.day.checkedIn ? `+${formatCredits(cell.day.creditAmount)}` : cell.day.date}
            >
              {cell.day.checkedIn ? <CheckCircle2 size={13} /> : dayOfMonth(cell.day.date)}
            </span>
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-sage" />
          已签到
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CircleDashed size={12} className="text-peach" />
          今日
        </span>
      </div>
    </div>
  );
}

function CreditMetric({
  icon: Icon,
  label,
  value,
  detail,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tint: 'sage' | 'peach' | 'lavender';
}) {
  return (
    <article className="rounded-md border border-hairline bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}>
          <Icon size={15} />
        </span>
        <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      </div>
      <p className="mt-3 truncate text-[22px] font-semibold leading-none text-ink tabular-nums">
        {value}
      </p>
      <p className="mt-2 truncate text-[11px] text-ink-faint">{detail}</p>
    </article>
  );
}

function LedgerRow({ entry }: { entry: CreditLedgerEntry }) {
  const { t } = useTranslation();
  const positive = entry.amount >= 0;
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">
          {entry.description ?? t(`settings.detail.credits.ledgerTypes.${entry.type}`)}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {new Date(entry.createdAt).toLocaleString('zh-CN')} /{' '}
          {t(`settings.detail.credits.ledgerTypes.${entry.type}`)}
        </p>
      </div>
      <div className="text-left sm:text-right">
        <p className={`text-[13px] font-semibold tabular-nums ${positive ? 'text-sage' : 'text-pink'}`}>
          {positive ? '+' : ''}
          {formatCredits(entry.amount)}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {t('settings.detail.credits.balanceAfter', { value: formatCredits(entry.balanceAfter) })}
        </p>
      </div>
    </div>
  );
}

function formatCredits(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatCreditRange(minAmount: number, maxAmount: number): string {
  if (minAmount === maxAmount) return formatCredits(minAmount);
  return `${formatCredits(minAmount)} - ${formatCredits(maxAmount)}`;
}

function dayOfMonth(date: string): string {
  return String(Number(date.slice(-2)));
}
