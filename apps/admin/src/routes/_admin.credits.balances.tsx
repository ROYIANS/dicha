import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { WalletCards } from 'lucide-react';
import { useState } from 'react';
import { adminCreditBalancesQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/credits/balances')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminCreditBalancesQueryOptions({ page: 1, pageSize: 30 })),
  component: CreditBalancesPage,
});

function CreditBalancesPage() {
  const [search, setSearch] = useState('');
  const balances = useQuery(adminCreditBalancesQueryOptions({ page: 1, pageSize: 50, search: search || undefined }));

  return (
    <div>
      <PageHeader
        eyebrow="Credit Balances"
        title="账户余额"
        description="查看用户积分账户余额、累计获得与累计消耗。"
        action={
          <div className="flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3">
            <WalletCards size={15} className="text-ink-faint" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索邮箱或昵称"
              className="w-48 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        }
      />
      <div className="p-5 lg:p-8">
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="grid grid-cols-[minmax(180px,1fr)_120px_120px_120px] gap-3 border-b border-hairline bg-surface-alt px-4 py-3 text-xs font-semibold text-ink-soft">
            <span>用户</span>
            <span className="text-right">余额</span>
            <span className="text-right">累计获得</span>
            <span className="text-right">累计消耗</span>
          </div>
          <div className="divide-y divide-hairline/70">
            {(balances.data?.balances ?? []).map((item) => (
              <div key={item.user.id} className="grid grid-cols-[minmax(180px,1fr)_120px_120px_120px] gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{item.user.name}</p>
                  <p className="truncate text-xs text-ink-faint">{item.user.email}</p>
                </div>
                <span className="self-center text-right font-semibold text-ink tabular-nums">
                  {formatInteger(item.account.balance)}
                </span>
                <span className="self-center text-right text-ink-soft tabular-nums">
                  {formatInteger(item.account.lifetimeGranted)}
                </span>
                <span className="self-center text-right text-ink-soft tabular-nums">
                  {formatInteger(item.account.lifetimeSpent)}
                </span>
              </div>
            ))}
            {balances.data?.balances.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-ink-faint">没有匹配的积分账户</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}
