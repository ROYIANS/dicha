import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckCircle2,
  KeyRound,
  PlugZap,
  Save,
  Server,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  adminAiProvidersQueryOptions,
  upsertAdminAiSystemChannel,
} from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type {
  AdminAiProviderSummary,
  AdminAiSystemChannel,
  AdminAiSystemChannelUpsert,
} from '@dicha/shared';

const DICHA_PROVIDER_ID = 'dicha';
const DICHA_MODEL_ID = 'dicha:assistant';

export const Route = createFileRoute('/_admin/ai-providers')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminAiProvidersQueryOptions()),
  component: AiProvidersPage,
});

function AiProvidersPage() {
  const queryClient = useQueryClient();
  const overview = useQuery(adminAiProvidersQueryOptions());
  const dichaProvider = overview.data?.providers.find(
    (provider) => provider.providerId === DICHA_PROVIDER_ID,
  );
  const dichaChannel = overview.data?.systemChannels.find(
    (channel) => channel.providerId === DICHA_PROVIDER_ID && channel.modelId === DICHA_MODEL_ID,
  );
  const saveChannel = useMutation({
    mutationFn: upsertAdminAiSystemChannel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'providers'] });
      toast.success('AI 系统通道已保存');
    },
    onError: () => toast.error('AI 系统通道保存失败'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="AI Services"
        title="AI 供应商"
        description="管理系统托管 AI 渠道。用户自己的供应商配置仍在前台维护，后台只处理官方 DicHA 通道和后续平台级路由。"
      />

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_420px] lg:p-8">
        <section className="min-w-0 rounded-md border border-hairline bg-surface">
          <div className="border-b border-hairline p-4">
            <p className="text-sm font-semibold text-ink">供应商概览</p>
            <p className="mt-1 text-xs text-ink-soft">
              内置供应商来自共享模型目录；系统托管 channel 由后台维护。
            </p>
          </div>
          {overview.isPending ? (
            <div className="p-6 text-sm text-ink-soft">正在加载 AI 供应商</div>
          ) : overview.isError ? (
            <div className="p-6 text-sm text-pink">AI 供应商加载失败</div>
          ) : (
            <div className="divide-y divide-hairline">
              {overview.data.providers.slice(0, 12).map((provider) => (
                <ProviderRow
                  key={provider.providerId}
                  provider={provider}
                  channelCount={
                    overview.data.systemChannels.filter(
                      (channel) => channel.providerId === provider.providerId,
                    ).length
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-md border border-hairline bg-surface">
          <div className="border-b border-hairline p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">DicHA 官方通道</p>
                <p className="mt-1 text-xs leading-5 text-ink-soft">
                  配置 `dicha:assistant` 的系统托管上游。密钥只写入后端，保存后不会回显。
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-chip-sage text-sage">
                <PlugZap className="size-4" strokeWidth={1.8} />
              </span>
            </div>
          </div>
          {overview.data && dichaProvider ? (
            <SystemChannelForm
              key={dichaChannel?.id ?? 'new'}
              provider={dichaProvider}
              channel={dichaChannel}
              pending={saveChannel.isPending}
              onSubmit={(body) => saveChannel.mutate(body)}
            />
          ) : (
            <div className="p-5 text-sm text-ink-soft">正在准备 DicHA 通道配置</div>
          )}
        </section>
      </div>
    </div>
  );
}

function ProviderRow({
  provider,
  channelCount,
}: {
  provider: AdminAiProviderSummary;
  channelCount: number;
}) {
  const official = provider.providerId === DICHA_PROVIDER_ID;

  return (
    <div className="flex items-center gap-3 p-4">
      <span
        className={
          official
            ? 'grid size-9 place-items-center rounded-md bg-chip-sage text-sage'
            : 'grid size-9 place-items-center rounded-md bg-surface-alt text-ink-soft'
        }
      >
        {official ? (
          <Bot className="size-4" strokeWidth={1.8} />
        ) : (
          <Server className="size-4" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{provider.name}</p>
          <span className="rounded border border-hairline px-1.5 py-0.5 text-[10px] text-ink-soft">
            {provider.billingMode}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {provider.modelCount} 个模型 / {provider.enabledModelCount} 个默认启用 / {channelCount} 个系统通道
        </p>
      </div>
      <span className="hidden text-xs text-ink-soft sm:block">{provider.status}</span>
    </div>
  );
}

function SystemChannelForm({
  provider,
  channel,
  pending,
  onSubmit,
}: {
  provider: AdminAiProviderSummary;
  channel?: AdminAiSystemChannel;
  pending: boolean;
  onSubmit: (body: AdminAiSystemChannelUpsert) => void;
}) {
  const initial = useMemo(
    () => ({
      name: channel?.name ?? 'DicHA Assistant Primary',
      upstreamBaseUrl: channel?.upstreamBaseUrl ?? 'https://api.openai.com/v1',
      upstreamModelName: channel?.upstreamModelName ?? '',
      requestFormat: channel?.requestFormat ?? 'openai_compatible',
      authType: channel?.authType ?? 'bearer_token',
      credential: '',
      enabled: channel?.enabled ?? false,
      priority: String(channel?.priority ?? 100),
      notes: channel?.notes ?? '',
    }),
    [channel],
  );
  const [form, setForm] = useState(initial);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      channelId: channel?.id,
      providerId: provider.providerId,
      modelId: DICHA_MODEL_ID,
      name: form.name.trim(),
      upstreamBaseUrl: form.upstreamBaseUrl.trim(),
      upstreamModelName: form.upstreamModelName.trim(),
      requestFormat: form.requestFormat,
      authType: form.authType,
      credential: form.credential.trim() || undefined,
      enabled: form.enabled,
      priority: Number(form.priority) || 100,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <InfoTile icon={CheckCircle2} label="供应商" value={provider.name} />
        <InfoTile
          icon={KeyRound}
          label="密钥状态"
          value={channel?.credentialState === 'configured' ? '已配置' : '未配置'}
        />
      </div>

      <Field label="通道名称">
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="admin-input"
        />
      </Field>
      <Field label="上游 Base URL">
        <input
          value={form.upstreamBaseUrl}
          onChange={(event) =>
            setForm((current) => ({ ...current, upstreamBaseUrl: event.target.value }))
          }
          className="admin-input"
        />
      </Field>
      <Field label="上游模型名">
        <input
          value={form.upstreamModelName}
          onChange={(event) =>
            setForm((current) => ({ ...current, upstreamModelName: event.target.value }))
          }
          placeholder="例如 gpt-4.1-mini"
          className="admin-input"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="请求格式">
          <select
            value={form.requestFormat}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                requestFormat: event.target.value as AdminAiSystemChannelUpsert['requestFormat'],
              }))
            }
            className="admin-input"
          >
            <option value="openai_compatible">OpenAI Chat</option>
            <option value="openai_responses">OpenAI Responses</option>
            <option value="anthropic_messages">Anthropic Messages</option>
          </select>
        </Field>
        <Field label="认证方式">
          <select
            value={form.authType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                authType: event.target.value as AdminAiSystemChannelUpsert['authType'],
              }))
            }
            className="admin-input"
          >
            <option value="bearer_token">Bearer Token</option>
            <option value="api_key">API Key</option>
            <option value="none">None</option>
          </select>
        </Field>
      </div>
      <Field label="API Key / Token">
        <input
          value={form.credential}
          onChange={(event) =>
            setForm((current) => ({ ...current, credential: event.target.value }))
          }
          placeholder={channel?.credentialState === 'configured' ? '留空表示保持原密钥' : '输入上游密钥'}
          type="password"
          className="admin-input"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
        <Field label="备注">
          <input
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className="admin-input"
          />
        </Field>
        <Field label="优先级">
          <input
            value={form.priority}
            onChange={(event) =>
              setForm((current) => ({ ...current, priority: event.target.value }))
            }
            inputMode="numeric"
            className="admin-input"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) =>
            setForm((current) => ({ ...current, enabled: event.target.checked }))
          }
          className="size-4"
        />
        启用这个系统通道
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="size-4" strokeWidth={1.8} />
        {pending ? '保存中' : '保存通道'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt p-3">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Icon className="size-3.5" strokeWidth={1.8} />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
