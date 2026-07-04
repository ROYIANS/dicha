import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { adminCreditRulesQueryOptions, upsertAdminCreditRule } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/credits/rules')({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminCreditRulesQueryOptions()),
  component: CreditRulesPage,
});

function CreditRulesPage() {
  const queryClient = useQueryClient();
  const rules = useQuery(adminCreditRulesQueryOptions());
  const [name, setName] = useState('默认积分规则');
  const [cny, setCny] = useState(1000);
  const [usd, setUsd] = useState(7000);
  const [markup, setMarkup] = useState(1);
  const [minimum, setMinimum] = useState(1);
  const mutation = useMutation({
    mutationFn: upsertAdminCreditRule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] });
      toast.success('积分规则已保存');
    },
    onError: () => toast.error('积分规则保存失败'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Credit Rules"
        title="积分规则"
        description="定义 CNY/USD 成本价转换为平台积分的规则。积分不是结算货币，真实成本仍以人民币或美元记录。"
      />
      <div className="grid gap-4 p-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-8">
        <form
          className="space-y-3 rounded-md border border-hairline bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({
              name,
              active: true,
              cnyCreditsPerUnit: cny,
              usdCreditsPerUnit: usd,
              platformMarkup: markup,
              minimumChargeCredits: minimum,
              notes: null,
            });
          }}
        >
          <FormTitle icon={Plus} title="新增并启用规则" />
          <TextInput label="名称" value={name} onChange={setName} />
          <NumberInput label="1 CNY 对应积分" value={cny} onChange={setCny} />
          <NumberInput label="1 USD 对应积分" value={usd} onChange={setUsd} />
          <NumberInput label="平台倍率" value={markup} onChange={setMarkup} step={0.01} />
          <NumberInput label="最低扣费积分" value={minimum} onChange={setMinimum} />
          <button className="h-9 w-full rounded-md bg-sidebar-bg text-xs font-medium text-sidebar-ink">
            保存规则
          </button>
        </form>

        <section className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="border-b border-hairline bg-surface-alt px-4 py-3 text-sm font-semibold text-ink">
            当前规则
          </div>
          <div className="divide-y divide-hairline/70">
            {(rules.data?.rules ?? []).map((rule) => (
              <div key={rule.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{rule.name}</p>
                    {rule.active ? (
                      <span className="rounded-md border border-hairline bg-chip-sage px-1.5 py-0.5 text-[10px] text-sage">
                        启用
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    CNY {rule.cnyCreditsPerUnit} / USD {rule.usdCreditsPerUnit} / 倍率 {rule.platformMarkup} / 最低 {rule.minimumChargeCredits}
                  </p>
                </div>
                {!rule.active ? (
                  <button
                    type="button"
                    onClick={() =>
                      mutation.mutate({
                        ruleId: rule.id,
                        name: rule.name,
                        active: true,
                        cnyCreditsPerUnit: rule.cnyCreditsPerUnit,
                        usdCreditsPerUnit: rule.usdCreditsPerUnit,
                        platformMarkup: rule.platformMarkup,
                        minimumChargeCredits: rule.minimumChargeCredits,
                        notes: rule.notes,
                      })
                    }
                    className="h-8 rounded-md border border-hairline bg-surface-alt px-3 text-xs text-ink"
                  >
                    设为启用
                  </button>
                ) : null}
              </div>
            ))}
            {rules.data?.rules.length === 0 ? <EmptyRows text="还没有积分规则" /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function FormTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-md bg-chip-peach text-peach">
        <Icon size={15} />
      </span>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-hairline bg-surface-alt px-3 text-sm text-ink outline-none" />
    </label>
  );
}

function NumberInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <input type="number" min={0} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-9 w-full rounded-md border border-hairline bg-surface-alt px-3 text-sm text-ink outline-none" />
    </label>
  );
}

function EmptyRows({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-xs text-ink-faint">{text}</div>;
}
