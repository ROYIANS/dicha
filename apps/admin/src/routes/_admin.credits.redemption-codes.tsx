import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  adminCreditRedemptionCodesQueryOptions,
  upsertAdminCreditRedemptionCode,
} from '@/api/admin';
import { HeroNumberInput, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/credits/redemption-codes')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminCreditRedemptionCodesQueryOptions()),
  component: RedemptionCodesPage,
});

function RedemptionCodesPage() {
  const queryClient = useQueryClient();
  const codes = useQuery(adminCreditRedemptionCodesQueryOptions());
  const [code, setCode] = useState('');
  const [creditAmount, setCreditAmount] = useState(1000);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const mutation = useMutation({
    mutationFn: upsertAdminCreditRedemptionCode,
    onSuccess: async () => {
      setCode('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] });
      toast.success('兑换码已保存');
    },
    onError: () => toast.error('兑换码保存失败'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Redemption Codes"
        title="兑换码"
        description="创建用于测试、活动或后续充值兑换的积分兑换码。"
      />
      <div className="grid gap-4 p-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-8">
        <form
          className="space-y-3 rounded-md border border-hairline bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              code,
              creditAmount,
              enabled: true,
              maxRedemptions,
              expiresAt: null,
              notes: null,
            });
          }}
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-chip-mist text-mist">
              <Ticket size={15} />
            </span>
            <h2 className="text-sm font-semibold text-ink">新增兑换码</h2>
          </div>
          <Field label="兑换码" value={code} onChange={setCode} placeholder="例如 DICHA-TEST-1000" />
          <NumberField label="积分数量" value={creditAmount} onChange={setCreditAmount} />
          <NumberField label="可兑换次数" value={maxRedemptions} onChange={setMaxRedemptions} />
          <button
            disabled={!code.trim() || creditAmount <= 0 || maxRedemptions <= 0 || mutation.isPending}
            className="h-9 w-full rounded-md bg-sidebar-bg text-xs font-medium text-sidebar-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? '保存中...' : '保存兑换码'}
          </button>
        </form>

        <section className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="border-b border-hairline bg-surface-alt px-4 py-3 text-sm font-semibold text-ink">
            兑换码列表
          </div>
          <div className="divide-y divide-hairline/70">
            {(codes.data?.codes ?? []).map((item) => (
              <div key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_120px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.code}</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    {item.enabled ? '启用' : '停用'} / {item.redeemedCount} / {item.maxRedemptions} 已兑换
                  </p>
                </div>
                <span className="text-sm font-semibold text-ink tabular-nums">
                  {formatInteger(item.creditAmount)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    mutation.mutate({
                      codeId: item.id,
                      code: item.code,
                      creditAmount: item.creditAmount,
                      enabled: !item.enabled,
                      maxRedemptions: item.maxRedemptions,
                      expiresAt: item.expiresAt,
                      notes: item.notes,
                    })
                  }
                  className="h-8 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink"
                >
                  {item.enabled ? '停用' : '启用'}
                </button>
              </div>
            ))}
            {codes.data?.codes.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-ink-faint">还没有兑换码</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <HeroTextInput value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <HeroNumberInput minValue={1} step={1} value={value} onChange={(nextValue) => onChange(nextValue ?? 0)} />
    </label>
  );
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value);
}
