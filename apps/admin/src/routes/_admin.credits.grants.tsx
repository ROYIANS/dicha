import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { grantAdminCredits } from '@/api/admin';
import { HeroNumberInput, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/credits/grants')({
  component: CreditGrantsPage,
});

function CreditGrantsPage() {
  const queryClient = useQueryClient();
  const [ownerId, setOwnerId] = useState('');
  const [amount, setAmount] = useState(1000);
  const [reason, setReason] = useState('管理员发放积分');
  const mutation = useMutation({
    mutationFn: grantAdminCredits,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] });
      setOwnerId('');
      toast.success('积分已发放');
    },
    onError: () => toast.error('积分发放失败，请确认用户 ID 是否存在'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Credit Grants"
        title="积分发放"
        description="向指定用户账户发放积分，流水会记录为管理员发放。当前 MVP 使用用户 ID，后续可接入用户搜索选择器。"
      />
      <div className="p-5 lg:p-8">
        <form
          className="max-w-xl space-y-4 rounded-md border border-hairline bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ ownerId, amount, reason });
          }}
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-chip-peach text-peach">
              <Gift size={15} />
            </span>
            <h2 className="text-sm font-semibold text-ink">发放积分</h2>
          </div>
          <Field label="用户 ID" value={ownerId} onChange={setOwnerId} placeholder="Better Auth / User.id" />
          <NumberField label="发放数量" value={amount} onChange={setAmount} />
          <Field label="原因" value={reason} onChange={setReason} placeholder="用于流水说明" />
          <button
            disabled={!ownerId.trim() || amount <= 0 || !reason.trim() || mutation.isPending}
            className="h-9 w-full rounded-md bg-sidebar-bg text-xs font-medium text-sidebar-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? '发放中...' : '确认发放'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <HeroTextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <HeroNumberInput
        minValue={1}
        step={1}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? 0)}
      />
    </label>
  );
}
