import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CircleDashed,
  Plus,
  KeyRound,
  PlugZap,
  RefreshCw,
  Save,
  Server,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  adminDichaAiServiceQueryOptions,
  syncAdminDichaInternalProviderModels,
  updateAdminDichaModel,
  upsertAdminDichaInternalProvider,
} from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import type {
  AdminAiInternalProvider,
  AdminAiInternalProviderUpsert,
  AdminDichaAiModel,
  AdminDichaModelUpdate,
} from '@dicha/shared';

const NEW_INTERNAL_PROVIDER_ID = '__new_internal_provider__';

export const Route = createFileRoute('/_admin/dicha-ai')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminDichaAiServiceQueryOptions()),
  component: DichaAiServicePage,
});

function DichaAiServicePage() {
  const queryClient = useQueryClient();
  const service = useQuery(adminDichaAiServiceQueryOptions());
  const providers = service.data?.internalProviders ?? [];
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const selectedProvider =
    selectedProviderId === NEW_INTERNAL_PROVIDER_ID
      ? undefined
      : providers.find((provider) => provider.id === selectedProviderId) ?? providers[0];
  const providerModels = useMemo(
    () =>
      (service.data?.models ?? []).filter(
        (model) => model.internalProviderId === selectedProvider?.id,
      ),
    [service.data?.models, selectedProvider?.id],
  );
  const [selectedModelRecordId, setSelectedModelRecordId] = useState('');
  const selectedModel =
    providerModels.find((model) => model.modelRecordId === selectedModelRecordId) ??
    providerModels[0];

  const saveProvider = useMutation({
    mutationFn: upsertAdminDichaInternalProvider,
    onSuccess: async (provider) => {
      setSelectedProviderId(provider.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'dicha-service'] });
      toast.success('内部供应商已保存');
    },
    onError: () => toast.error('内部供应商保存失败'),
  });
  const syncModels = useMutation({
    mutationFn: syncAdminDichaInternalProviderModels,
    onSuccess: async ({ syncedCount }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'dicha-service'] });
      toast.success(`已同步 ${syncedCount} 个模型`);
    },
    onError: () => toast.error('内部模型同步失败'),
  });
  const saveModel = useMutation({
    mutationFn: updateAdminDichaModel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'dicha-service'] });
      toast.success('DX 模型配置已保存');
    },
    onError: () => toast.error('DX 模型配置保存失败'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="DicHA AI Service"
        title="DicHA AI 服务"
        description="连接多个内部上游供应商，同步模型，并把启用模型映射成用户前台看到的 DX 模型。"
      />

      <div className="grid min-h-[calc(100dvh-9rem)] gap-4 p-5 xl:grid-cols-[300px_minmax(0,1fr)_380px] lg:p-8">
        <section className="rounded-md border border-hairline bg-surface">
          <div className="flex items-start justify-between gap-3 border-b border-hairline p-4">
            <div>
              <p className="text-sm font-semibold text-ink">内部供应商</p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">{providers.length} 个上游渠道</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedProviderId(NEW_INTERNAL_PROVIDER_ID)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface-alt px-2.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
            >
              <Plus className="size-3.5" strokeWidth={1.8} />
              新增
            </button>
          </div>
          {service.isPending ? (
            <EmptyState text="正在加载内部供应商" />
          ) : service.isError ? (
            <EmptyState tone="error" text="DicHA AI 服务加载失败" />
          ) : (
            <div className="divide-y divide-hairline">
              {providers.map((provider) => (
                <ProviderButton
                  key={provider.id}
                  provider={provider}
                  selected={provider.id === selectedProvider?.id}
                  onClick={() => setSelectedProviderId(provider.id)}
                />
              ))}
              {providers.length === 0 ? <EmptyState text="还没有内部供应商" /> : null}
            </div>
          )}
          <div className="border-t border-hairline">
            <InternalProviderForm
              key={selectedProvider?.id ?? NEW_INTERNAL_PROVIDER_ID}
              provider={selectedProvider}
              pending={saveProvider.isPending}
              onSave={(body) => saveProvider.mutate(body)}
            />
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-hairline bg-surface">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline p-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                {selectedProvider ? `${selectedProvider.name} 上游模型` : '上游模型'}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-soft">
                从内部供应商同步出来的模型，启用后会聚合到用户端 DicHA AI 下。
              </p>
            </div>
            <button
              type="button"
              disabled={!selectedProvider || syncModels.isPending}
              onClick={() => selectedProvider && syncModels.mutate(selectedProvider.id)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 text-xs font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" strokeWidth={1.8} />
              {syncModels.isPending ? '同步中' : '同步模型'}
            </button>
          </div>
          <div className="divide-y divide-hairline">
            {providerModels.length > 0 ? (
              providerModels.map((model) => (
                <ModelButton
                  key={model.modelRecordId}
                  model={model}
                  selected={model.modelRecordId === selectedModel?.modelRecordId}
                  onClick={() => setSelectedModelRecordId(model.modelRecordId)}
                />
              ))
            ) : (
              <EmptyState text="还没有同步模型" />
            )}
          </div>
        </section>

        <section className="rounded-md border border-hairline bg-surface">
          <PanelHeader title="DX 展示与参数" description="配置用户前台看到的名称、排序和默认调用参数。" />
          {selectedModel ? (
            <DichaModelForm
              key={selectedModel.modelRecordId}
              model={selectedModel}
              pending={saveModel.isPending}
              onSave={(body) => saveModel.mutate(body)}
            />
          ) : (
            <EmptyState text="请选择一个上游模型" />
          )}
        </section>
      </div>
    </div>
  );
}

function ProviderButton({
  provider,
  selected,
  onClick,
}: {
  provider: AdminAiInternalProvider;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 p-3 text-left transition-colors ${
        selected ? 'bg-surface-alt' : 'hover:bg-surface-alt'
      }`}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-alt text-ink-soft">
        <Server className="size-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{provider.name}</span>
        <span className="mt-1 block truncate text-xs text-ink-soft">{provider.baseUrl}</span>
      </span>
      {provider.enabled ? (
        <CheckCircle2 className="mt-1 size-4 shrink-0 text-sage" strokeWidth={1.8} />
      ) : (
        <CircleDashed className="mt-1 size-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
      )}
    </button>
  );
}

function ModelButton({
  model,
  selected,
  onClick,
}: {
  model: AdminDichaAiModel;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full gap-3 p-4 text-left transition-colors md:grid-cols-[minmax(0,1fr)_140px] md:items-center ${
        selected ? 'bg-surface-alt' : 'hover:bg-surface-alt'
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{model.displayName}</p>
          <Badge>{model.modelType}</Badge>
          {model.contextWindow ? <Badge>{model.contextWindow.toLocaleString()}</Badge> : null}
        </div>
        <p className="mt-1 truncate text-xs text-ink-soft">{model.upstreamModelName}</p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink-soft">
        {model.enabled ? (
          <CheckCircle2 className="size-3.5 text-sage" strokeWidth={1.8} />
        ) : (
          <CircleDashed className="size-3.5 text-ink-faint" strokeWidth={1.8} />
        )}
        {model.enabled ? 'DX 启用' : '未启用'}
      </span>
    </button>
  );
}

function InternalProviderForm({
  provider,
  pending,
  onSave,
}: {
  provider?: AdminAiInternalProvider;
  pending: boolean;
  onSave: (body: AdminAiInternalProviderUpsert) => void;
}) {
  const [form, setForm] = useState({
    name: provider?.name ?? '',
    baseUrl: provider?.baseUrl ?? 'https://api.openai.com/v1',
    requestFormat: provider?.requestFormat ?? 'openai_compatible',
    authType: provider?.authType ?? 'bearer_token',
    credential: '',
    enabled: provider?.enabled ?? false,
    priority: String(provider?.priority ?? 100),
    notes: provider?.notes ?? '',
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      providerId: provider?.id,
      name: form.name.trim(),
      baseUrl: form.baseUrl.trim(),
      requestFormat: form.requestFormat,
      authType: form.authType,
      credential: form.credential.trim() || undefined,
      enabled: form.enabled,
      priority: Number(form.priority) || 100,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <PlugZap className="size-3.5" strokeWidth={1.8} />
        {provider ? '编辑上游' : '新增上游'}
      </div>
      <Field label="名称">
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="admin-input"
        />
      </Field>
      <Field label="Base URL">
        <input
          value={form.baseUrl}
          onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
          className="admin-input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="格式">
          <select
            value={form.requestFormat}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                requestFormat: event.target.value as AdminAiInternalProviderUpsert['requestFormat'],
              }))
            }
            className="admin-input"
          >
            <option value="openai_compatible">OpenAI</option>
            <option value="openai_responses">Responses</option>
            <option value="anthropic_messages">Anthropic</option>
          </select>
        </Field>
        <Field label="认证">
          <select
            value={form.authType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                authType: event.target.value as AdminAiInternalProviderUpsert['authType'],
              }))
            }
            className="admin-input"
          >
            <option value="bearer_token">Bearer</option>
            <option value="api_key">API Key</option>
            <option value="none">None</option>
          </select>
        </Field>
      </div>
      <Field label="密钥">
        <input
          value={form.credential}
          onChange={(event) => setForm((current) => ({ ...current, credential: event.target.value }))}
          placeholder={provider?.credentialState === 'configured' ? '留空表示保持原密钥' : '输入密钥'}
          type="password"
          className="admin-input"
        />
      </Field>
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <label className="flex items-center justify-between rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink">
          <span>启用</span>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            className="size-4"
          />
        </label>
        <Field label="优先级">
          <input
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            className="admin-input"
            inputMode="numeric"
          />
        </Field>
      </div>
      <button
        type="submit"
        disabled={pending || !form.name.trim() || !form.baseUrl.trim()}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Save className="size-4" strokeWidth={1.8} />
        {pending ? '保存中' : '保存上游'}
      </button>
    </form>
  );
}

function DichaModelForm({
  model,
  pending,
  onSave,
}: {
  model: AdminDichaAiModel;
  pending: boolean;
  onSave: (body: AdminDichaModelUpdate) => void;
}) {
  const [form, setForm] = useState({
    enabled: model.enabled,
    dxModelId: model.modelId,
    dxDisplayName: model.displayName,
    dxDescription: model.description ?? '',
    dxRecommended: model.recommended,
    dxSortOrder: String(model.sortOrder),
    parameterConfig: JSON.stringify(model.parameterConfig ?? {}, null, 2),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(form.parameterConfig || '{}') as Record<string, unknown>;
    } catch {
      toast.error('参数配置不是合法 JSON');
      return;
    }
    onSave({
      modelRecordId: model.modelRecordId,
      enabled: form.enabled,
      dxModelId: form.dxModelId.trim(),
      dxDisplayName: form.dxDisplayName.trim(),
      dxDescription: form.dxDescription.trim() || null,
      dxRecommended: form.dxRecommended,
      dxSortOrder: Number(form.dxSortOrder) || 100,
      parameterConfig: parsed,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <InfoTile icon={Server} label="上游" value={model.internalProviderName} />
        <InfoTile icon={KeyRound} label="原始模型" value={model.upstreamModelName} />
      </div>
      <label className="flex items-center justify-between rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink">
        <span>作为 DX 模型启用</span>
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
          className="size-4"
        />
      </label>
      <Field label="DX 模型 ID">
        <input
          value={form.dxModelId}
          onChange={(event) => setForm((current) => ({ ...current, dxModelId: event.target.value }))}
          className="admin-input"
        />
      </Field>
      <Field label="前台展示名称">
        <input
          value={form.dxDisplayName}
          onChange={(event) => setForm((current) => ({ ...current, dxDisplayName: event.target.value }))}
          className="admin-input"
        />
      </Field>
      <Field label="前台描述">
        <textarea
          value={form.dxDescription}
          onChange={(event) => setForm((current) => ({ ...current, dxDescription: event.target.value }))}
          className="admin-input min-h-20 resize-none py-2"
        />
      </Field>
      <div className="grid grid-cols-[1fr_96px] gap-2">
        <label className="flex items-center justify-between rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink">
          <span>推荐</span>
          <input
            type="checkbox"
            checked={form.dxRecommended}
            onChange={(event) =>
              setForm((current) => ({ ...current, dxRecommended: event.target.checked }))
            }
            className="size-4"
          />
        </label>
        <Field label="排序">
          <input
            value={form.dxSortOrder}
            onChange={(event) => setForm((current) => ({ ...current, dxSortOrder: event.target.value }))}
            className="admin-input"
            inputMode="numeric"
          />
        </Field>
      </div>
      <Field label="参数配置 JSON">
        <textarea
          value={form.parameterConfig}
          onChange={(event) =>
            setForm((current) => ({ ...current, parameterConfig: event.target.value }))
          }
          className="admin-input min-h-36 resize-none py-2 text-xs"
        />
      </Field>
      <button
        type="submit"
        disabled={pending || !form.dxModelId.trim() || !form.dxDisplayName.trim()}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Save className="size-4" strokeWidth={1.8} />
        {pending ? '保存中' : '保存 DX 模型'}
      </button>
    </form>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
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

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-hairline p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{description}</p>
    </div>
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

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-hairline px-1.5 py-0.5 text-[10px] text-ink-soft">
      {children}
    </span>
  );
}

function EmptyState({ text, tone = 'muted' }: { text: string; tone?: 'muted' | 'error' }) {
  return <div className={`p-6 text-sm ${tone === 'error' ? 'text-pink' : 'text-ink-soft'}`}>{text}</div>;
}
