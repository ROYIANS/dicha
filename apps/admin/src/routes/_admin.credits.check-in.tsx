import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Clock3, Gift, Power, UsersRound, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  adminCreditCheckInQueryOptions,
  upsertAdminCreditCheckInCampaign,
} from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type { AdminCreditCheckInCampaignUpsert, AdminCreditCheckInOverview } from '@dicha/shared';

export const Route = createFileRoute('/_admin/credits/check-in')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminCreditCheckInQueryOptions());
  },
  component: CreditCheckInPage,
});

function CreditCheckInPage() {
  const queryClient = useQueryClient();
  const overview = useQuery(adminCreditCheckInQueryOptions());
  const campaign = overview.data?.campaign;

  const saveCampaign = useMutation({
    mutationFn: upsertAdminCreditCheckInCampaign,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'credits'] }),
        queryClient.invalidateQueries({ queryKey: ['credits', 'check-in'] }),
      ]);
      toast.success('签到活动已保存');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '签到活动保存失败');
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Credit Check-in"
        title="签到活动"
        description="配置用户每日签到获取积分的活动开关、奖励数量和展示说明。"
      />

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] lg:p-8">
        {campaign ? (
          <CampaignForm
            key={campaign.id}
            campaign={campaign}
            pending={saveCampaign.isPending}
            onSubmit={(body) => saveCampaign.mutate(body)}
          />
        ) : (
          <section className="rounded-md border border-hairline bg-surface p-4">
            <EmptyRows text={overview.isPending ? '正在读取签到活动' : '签到活动加载失败'} />
          </section>
        )}

        <div className="space-y-4">
          <section className="grid gap-3 md:grid-cols-4">
            <StatCard icon={UsersRound} label="签到次数" value={overview.data?.stats.totalCheckIns ?? 0} />
            <StatCard icon={UsersRound} label="参与用户" value={overview.data?.stats.uniqueUsers ?? 0} />
            <StatCard icon={Gift} label="已发积分" value={overview.data?.stats.creditsGranted ?? 0} />
            <StatCard icon={Clock3} label="今日签到" value={overview.data?.stats.todayCheckIns ?? 0} />
          </section>

          <section className="overflow-hidden rounded-md border border-hairline bg-surface">
            <div className="border-b border-hairline bg-surface-alt px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">近期签到</h2>
              <p className="mt-1 text-xs text-ink-faint">最近 20 条用户签到记录。</p>
            </div>
            {overview.isPending ? (
              <EmptyRows text="正在读取签到活动" />
            ) : overview.data?.recentCheckIns.length ? (
              <div className="divide-y divide-hairline/70">
                {overview.data.recentCheckIns.map((record) => (
                  <div key={record.id} className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{record.user.email}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {record.checkInDate} / {new Date(record.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-sage tabular-nums">
                      +{formatInteger(record.creditAmount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyRows text="还没有用户签到" />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CampaignForm({
  campaign,
  pending,
  onSubmit,
}: {
  campaign: AdminCreditCheckInOverview['campaign'];
  pending: boolean;
  onSubmit: (body: AdminCreditCheckInCampaignUpsert) => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [enabled, setEnabled] = useState(campaign.enabled);
  const [dailyCreditMinAmount, setDailyCreditMinAmount] = useState(campaign.dailyCreditMinAmount);
  const [dailyCreditMaxAmount, setDailyCreditMaxAmount] = useState(campaign.dailyCreditMaxAmount);
  const [timezone, setTimezone] = useState(campaign.timezone);
  const [description, setDescription] = useState(campaign.description ?? '');
  const [startsAt, setStartsAt] = useState(toDateTimeInput(campaign.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeInput(campaign.endsAt));

  return (
    <form
      className="space-y-4 rounded-md border border-hairline bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          campaignId: campaign.id,
          name,
          enabled,
          dailyCreditMinAmount,
          dailyCreditMaxAmount,
          timezone,
          description: description.trim() || null,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        });
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md border border-hairline bg-chip-sage text-sage">
            <CalendarCheck size={15} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">活动配置</h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              {enabled ? '活动已开启，用户今天可签到。' : '活动已关闭，前台只展示暂未开放状态。'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors ${
            enabled
              ? 'border-sage bg-chip-sage text-sage'
              : 'border-hairline bg-surface-alt text-ink-soft'
          }`}
        >
          <Power size={14} />
          {enabled ? '已开启' : '已关闭'}
        </button>
      </div>

      <Field label="活动名称" value={name} onChange={setName} />
      <div className="grid gap-3 md:grid-cols-2">
        <NumberField
          label="每日奖励下限"
          value={dailyCreditMinAmount}
          onChange={setDailyCreditMinAmount}
        />
        <NumberField
          label="每日奖励上限"
          value={dailyCreditMaxAmount}
          onChange={setDailyCreditMaxAmount}
        />
      </div>
      <Field label="活动时区" value={timezone} onChange={setTimezone} placeholder="Asia/Shanghai" />
      <label className="block space-y-1.5 text-xs text-ink-soft">
        <span>活动说明</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 w-full resize-y rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="开始时间" type="datetime-local" value={startsAt} onChange={setStartsAt} />
        <Field label="结束时间" type="datetime-local" value={endsAt} onChange={setEndsAt} />
      </div>
      <button
        disabled={
          !name.trim()
          || !timezone.trim()
          || dailyCreditMinAmount <= 0
          || dailyCreditMaxAmount < dailyCreditMinAmount
          || pending
        }
        className="h-9 w-full rounded-md bg-sidebar-bg text-xs font-medium text-sidebar-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '保存中...' : '保存签到活动'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5 text-xs text-ink-soft">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-hairline bg-surface-alt px-3 text-sm text-ink outline-none placeholder:text-ink-faint"
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
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full rounded-md border border-hairline bg-surface-alt px-3 text-sm text-ink outline-none"
      />
    </label>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-md border border-hairline bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-ink-faint">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-3 text-xl font-semibold text-ink tabular-nums">{formatInteger(value)}</p>
    </article>
  );
}

function EmptyRows({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-xs text-ink-faint">{text}</div>;
}

function toDateTimeInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}
