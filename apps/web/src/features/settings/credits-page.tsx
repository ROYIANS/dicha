import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, History, Ticket, TrendingDown, WalletCards, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { creditBalanceQueryOptions, creditLedgerQueryOptions, redeemCreditCode } from '@/api/credits';
import { SettingsDetailShell } from '@/components/SettingsScaffold';
import { settingsTintClass } from '@/components/settings-ui';
import type { CreditLedgerEntry } from '@dicha/shared';

export function CreditsSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const balanceQuery = useQuery(creditBalanceQueryOptions());
  const ledgerQuery = useQuery(creditLedgerQueryOptions({ page: 1, pageSize: 30 }));
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
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t('settings.detail.credits.codePlaceholder')}
                className="h-10 w-full rounded-md border border-hairline bg-surface-alt px-3 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-soft"
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
