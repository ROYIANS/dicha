import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { adminCreditLedgerQueryOptions } from '@/api/admin';
import { HeroSelect, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import type { CreditLedgerType } from '@dicha/shared';

const LEDGER_TYPES: Array<{ value: '' | CreditLedgerType; label: string }> = [
  { value: '', label: '全部类型' },
  { value: 'grant', label: '发放' },
  { value: 'redeem', label: '兑换' },
  { value: 'debit', label: '扣费' },
  { value: 'refund', label: '退回' },
  { value: 'adjustment', label: '调整' },
  { value: 'expiry', label: '过期' },
];

export const Route = createFileRoute('/_admin/credits/ledger')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminCreditLedgerQueryOptions({ page: 1, pageSize: 50 })),
  component: CreditLedgerPage,
});

function CreditLedgerPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | CreditLedgerType>('');
  const ledger = useQuery(
    adminCreditLedgerQueryOptions({
      page: 1,
      pageSize: 100,
      search: search || undefined,
      type: type || undefined,
    }),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Credit Ledger"
        title="积分流水"
        description="查看平台积分账户的发放、兑换、官方 AI 调用扣费与后续调整记录。"
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ReceiptText size={15} className="text-ink-faint" />
              <HeroTextInput
                value={search}
                onChange={setSearch}
                placeholder="搜索用户"
                className="w-40"
              />
            </div>
            <HeroSelect
              value={type}
              onChange={(nextType) => setType(nextType as '' | CreditLedgerType)}
              className="min-w-28"
              emptyLabel="全部类型"
              options={LEDGER_TYPES.filter((item) => item.value).map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />
          </div>
        }
      />
      <div className="p-5 lg:p-8">
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="grid grid-cols-[170px_minmax(180px,1fr)_110px_110px_130px] gap-3 border-b border-hairline bg-surface-alt px-4 py-3 text-xs font-semibold text-ink-soft">
            <span>时间</span>
            <span>用户 / 描述</span>
            <span>类型</span>
            <span className="text-right">变动</span>
            <span className="text-right">余额</span>
          </div>
          <div className="divide-y divide-hairline/70">
            {(ledger.data?.entries ?? []).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[170px_minmax(180px,1fr)_110px_110px_130px] gap-3 px-4 py-3 text-sm">
                <span className="self-center text-xs text-ink-faint">
                  {new Date(entry.createdAt).toLocaleString('zh-CN')}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{entry.user.email}</p>
                  <p className="truncate text-xs text-ink-faint">{entry.description ?? entry.source}</p>
                </div>
                <span className="self-center text-xs text-ink-soft">{ledgerTypeLabel(entry.type)}</span>
                <span className={`self-center text-right font-semibold tabular-nums ${entry.amount >= 0 ? 'text-sage' : 'text-pink'}`}>
                  {entry.amount >= 0 ? '+' : ''}
                  {formatInteger(entry.amount)}
                </span>
                <span className="self-center text-right text-ink-soft tabular-nums">
                  {formatInteger(entry.balanceAfter)}
                </span>
              </div>
            ))}
            {ledger.data?.entries.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-ink-faint">没有匹配的积分流水</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ledgerTypeLabel(value: CreditLedgerType) {
  return LEDGER_TYPES.find((item) => item.value === value)?.label ?? value;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}
