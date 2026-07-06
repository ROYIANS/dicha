import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, RefreshCw, Save, Search, Server } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  adminAiProviderDirectoryQueryOptions,
  syncAdminAiProviderDirectoryModels,
  updateAdminAiProviderDirectory,
  updateAdminAiProviderDirectoryModel,
} from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';
import {
  aiModelCommonParameterControls,
  aiModelExtensionParameterDefinitionByKey,
  buildAiModelParameterConfig,
  createAiModelParameterDraft,
} from '@dicha/shared';
import type {
  AdminAiProviderDirectoryItem,
  AdminAiProviderDirectoryModelUpdate,
  AdminAiProviderDirectoryOverview,
  AdminAiProviderDirectoryUpdate,
  AiModelExtensionParameter,
  AiModelParameterControlDefinition,
  AiModelParameterDraft,
} from '@dicha/shared';

type DirectoryModel = AdminAiProviderDirectoryOverview['models'][number];

export const Route = createFileRoute('/_admin/ai-providers')({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(adminAiProviderDirectoryQueryOptions());
  },
  component: AiProviderDirectoryPage,
});

function AiProviderDirectoryPage() {
  const queryClient = useQueryClient();
  const directory = useQuery(adminAiProviderDirectoryQueryOptions());
  const providers = directory.data?.providers ?? [];
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const selectedProvider =
    providers.find((provider) => provider.providerId === selectedProviderId) ?? providers[0];
  const models = useMemo(
    () =>
      (directory.data?.models ?? []).filter(
        (model) => model.providerId === selectedProvider?.providerId,
      ),
    [directory.data?.models, selectedProvider?.providerId],
  );
  const filteredModels = useMemo(
    () => models.filter((model) => directoryModelMatchesSearch(model, modelSearch)),
    [models, modelSearch],
  );
  const selectedModel =
    models.find((model) => model.modelId === selectedModelId) ?? filteredModels[0];

  const updateDirectory = useMutation({
    mutationFn: updateAdminAiProviderDirectory,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'provider-directory'] });
      toast.success('供应商渠道已保存');
    },
    onError: () => toast.error('供应商渠道保存失败'),
  });
  const syncModels = useMutation({
    mutationFn: syncAdminAiProviderDirectoryModels,
    onSuccess: async ({ syncedCount }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'provider-directory'] });
      toast.success(`已同步 ${syncedCount} 个模型`);
    },
    onError: () => toast.error('模型同步失败'),
  });
  const updateModel = useMutation({
    mutationFn: updateAdminAiProviderDirectoryModel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'ai', 'provider-directory'] });
      toast.success('模型配置已保存');
    },
    onError: () => toast.error('模型状态更新失败'),
  });

  return (
    <div>
      <PageHeader
        eyebrow="AI Provider Directory"
        title="供应商渠道"
        description="维护开放给用户自行配置 API Key 的内置供应商、默认请求配置和默认模型池。"
      />

      <div className="grid min-h-[calc(100dvh-9rem)] gap-4 p-5 xl:grid-cols-[280px_minmax(0,1fr)_360px] lg:p-8">
        <section className="flex max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-md border border-hairline bg-surface">
          <PanelHeader title="内部目录" description={`${providers.length} 个供应商模板`} />
          {directory.isPending ? (
            <EmptyState text="正在加载供应商目录" />
          ) : directory.isError ? (
            <EmptyState tone="error" text="供应商目录加载失败" />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="divide-y divide-hairline">
                {providers.map((provider) => (
                  <ProviderButton
                    key={provider.providerId}
                    provider={provider}
                    selected={provider.providerId === selectedProvider?.providerId}
                    onClick={() => setSelectedProviderId(provider.providerId)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="flex max-h-[calc(100dvh-10rem)] min-w-0 flex-col overflow-hidden rounded-md border border-hairline bg-surface">
          <PanelHeader
            title={selectedProvider ? `${selectedProvider.name} 默认模型` : '默认模型'}
            description="平台同步/维护的默认模型，用户进入前台后仍可按自己的 API Key 覆盖配置。"
          />
          <ModelSearchBar
            value={modelSearch}
            total={models.length}
            visible={filteredModels.length}
            placeholder="搜索模型名称、ID、类型或能力"
            onChange={setModelSearch}
            onClear={() => setModelSearch('')}
          />
          {selectedProvider ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="divide-y divide-hairline">
                {filteredModels.length > 0 ? (
                  filteredModels.map((model) => (
                    <ModelRow
                      key={model.modelId}
                      model={model}
                      selected={model.modelId === selectedModel?.modelId}
                      pending={updateModel.isPending}
                      onSelect={() => setSelectedModelId(model.modelId)}
                      onToggle={(enabled) =>
                        updateModel.mutate({
                          providerId: model.providerId,
                          modelId: model.modelId,
                          enabled,
                        })
                      }
                      onRecommend={(recommended) =>
                        updateModel.mutate({
                          providerId: model.providerId,
                          modelId: model.modelId,
                          recommended,
                        })
                      }
                    />
                  ))
                ) : (
                  <EmptyState text={models.length > 0 ? '没有匹配的模型' : '还没有同步模型'} />
                )}
              </div>
            </div>
          ) : (
            <EmptyState text="请选择供应商" />
          )}
        </section>

        <section className="rounded-md border border-hairline bg-surface">
          <PanelHeader title="渠道配置" description="平台默认值，不保存用户 API Key。" />
          {selectedProvider ? (
            <>
              <ProviderConfigForm
                key={selectedProvider.providerId}
                provider={selectedProvider}
                pending={updateDirectory.isPending}
                syncing={syncModels.isPending}
                onSave={(body) => updateDirectory.mutate(body)}
                onSync={() => syncModels.mutate(selectedProvider.providerId)}
              />
              {selectedModel ? (
                <div className="border-t border-hairline">
                  <ModelDefaultConfigForm
                    key={`${selectedModel.providerId}:${selectedModel.modelId}`}
                    model={selectedModel}
                    pending={updateModel.isPending}
                    onSave={(body) => updateModel.mutate(body)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState text="请选择供应商" />
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
  provider: AdminAiProviderDirectoryItem;
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
        <span className="mt-1 block text-xs text-ink-soft">
          {provider.modelCount} 模型 / {provider.enabledModelCount} 启用
        </span>
      </span>
      {provider.enabled ? (
        <CheckCircle2 className="mt-1 size-4 shrink-0 text-sage" strokeWidth={1.8} />
      ) : (
        <CircleDashed className="mt-1 size-4 shrink-0 text-ink-faint" strokeWidth={1.8} />
      )}
    </button>
  );
}

function ModelRow({
  model,
  selected,
  pending,
  onSelect,
  onToggle,
  onRecommend,
}: {
  model: DirectoryModel;
  selected: boolean;
  pending: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onRecommend: (recommended: boolean) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`grid w-full gap-3 p-4 text-left transition-colors md:grid-cols-[minmax(0,1fr)_180px] md:items-center ${
        selected ? 'bg-surface-alt' : 'hover:bg-surface-alt'
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{model.displayName}</p>
          <Badge>{model.modelType}</Badge>
          {model.contextWindow ? <Badge>{model.contextWindow.toLocaleString()}</Badge> : null}
        </div>
        <p className="mt-1 truncate text-xs text-ink-soft">{model.name}</p>
        <p className="mt-1 text-xs text-ink-faint">{model.priceHint}</p>
      </div>
      <div className="flex items-center justify-end gap-3">
        <label
          className="flex items-center gap-2 text-xs text-ink-soft"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={model.recommended}
            disabled={pending}
            onChange={(event) => {
              onRecommend(event.target.checked);
            }}
            className="size-4"
          />
          推荐
        </label>
        <label
          className="flex items-center gap-2 text-xs text-ink-soft"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={model.enabled}
            disabled={pending}
            onChange={(event) => {
              onToggle(event.target.checked);
            }}
            className="size-4"
          />
          启用
        </label>
      </div>
    </div>
  );
}

function ModelDefaultConfigForm({
  model,
  pending,
  onSave,
}: {
  model: DirectoryModel;
  pending: boolean;
  onSave: (body: AdminAiProviderDirectoryModelUpdate) => void;
}) {
  const parameterControls = modelParameterControlsForExtensions(model.extensionParameters ?? []);
  const [parameterDraft, setParameterDraft] = useState<AiModelParameterDraft>(() =>
    createAiModelParameterDraft(model.parameterConfig ?? {}, parameterControls),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = buildAiModelParameterConfig(parameterDraft, parameterControls);
    if (parsed.error) {
      toast.error(parsed.error);
      return;
    }
    onSave({
      providerId: model.providerId,
      modelId: model.modelId,
      parameterConfig: parsed.config,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">模型默认参数</p>
        <p className="mt-1 truncate text-xs text-ink-soft">{model.displayName}</p>
      </div>
      <ModelParameterConfigFields
        controls={parameterControls}
        draft={parameterDraft}
        disabled={pending}
        onChange={setParameterDraft}
      />
      {model.extensionParameters.length > 0 ? (
        <div className="rounded-md border border-hairline bg-surface-alt p-3">
          <p className="text-xs font-medium text-ink-soft">已启用扩展参数</p>
          <div className="mt-2 grid gap-1.5">
            {model.extensionParameters.map((parameter) => {
              const definition = aiModelExtensionParameterDefinitionByKey.get(parameter);
              return (
                <div
                  key={parameter}
                  className="rounded border border-hairline bg-surface px-2 py-1.5"
                >
                  <p className="text-xs font-semibold text-ink">{definition?.label ?? parameter}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">
                    {definition?.hint ?? '扩展参数'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-hairline bg-canvas px-3 py-2 text-xs text-ink-faint">
          该模型暂未启用扩展参数，默认参数只显示通用调用项。
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Save className="size-4" strokeWidth={1.8} />
        {pending ? '保存中' : '保存模型默认参数'}
      </button>
    </form>
  );
}

function ModelParameterConfigFields({
  controls,
  draft,
  disabled,
  onChange,
}: {
  controls: readonly AiModelParameterControlDefinition[];
  draft: AiModelParameterDraft;
  disabled: boolean;
  onChange: (value: AiModelParameterDraft) => void;
}) {
  return (
    <div className="space-y-2">
      {controls.map((control) => (
        <div key={control.key} className="rounded-md border border-hairline bg-surface-alt p-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold text-ink">{control.label}</p>
            <span className="rounded border border-hairline bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint">
              {control.key}
            </span>
          </div>
          <p className="mb-2 text-[11px] leading-4 text-ink-faint">{control.description}</p>
          <ParameterControlInput
            control={control}
            value={draft[control.key]}
            disabled={disabled}
            onChange={(value) => onChange({ ...draft, [control.key]: value })}
          />
        </div>
      ))}
    </div>
  );
}

function ParameterControlInput({
  control,
  value,
  disabled,
  onChange,
}: {
  control: AiModelParameterControlDefinition;
  value: string | boolean | undefined;
  disabled: boolean;
  onChange: (value: string | boolean) => void;
}) {
  if (control.kind === 'switch') {
    return (
      <label className="flex items-center justify-between rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-ink-soft">
        <span>{value === true ? '已开启' : '未开启'}</span>
        <input
          type="checkbox"
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4"
        />
      </label>
    );
  }

  if (control.kind === 'select') {
    return (
      <select
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="admin-input"
      >
        <option value="">不设置</option>
        {control.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      inputMode="decimal"
      disabled={disabled}
      placeholder={control.placeholder}
      className="admin-input"
    />
  );
}

function modelParameterControlsForExtensions(
  extensions: readonly AiModelExtensionParameter[],
): AiModelParameterControlDefinition[] {
  const controls: AiModelParameterControlDefinition[] = [...aiModelCommonParameterControls];
  extensions.forEach((extension) => {
    const definition = aiModelExtensionParameterDefinitionByKey.get(extension);
    if (definition) controls.push(definition);
  });
  const seen = new Set<string>();
  return controls.filter((control) => {
    if (seen.has(control.key)) return false;
    seen.add(control.key);
    return true;
  });
}

function ProviderConfigForm({
  provider,
  pending,
  syncing,
  onSave,
  onSync,
}: {
  provider: AdminAiProviderDirectoryItem;
  pending: boolean;
  syncing: boolean;
  onSave: (body: AdminAiProviderDirectoryUpdate) => void;
  onSync: () => void;
}) {
  const [form, setForm] = useState({
    enabled: provider.enabled,
    baseUrl: provider.baseUrl,
    requestFormat: provider.requestFormat ?? 'openai_compatible',
    authType: provider.authType,
    notes: provider.notes ?? '',
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      providerId: provider.providerId,
      enabled: form.enabled,
      baseUrl: form.baseUrl.trim(),
      requestFormat: form.requestFormat,
      authType: form.authType,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <label className="flex items-center justify-between rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink">
        <span>前台开放</span>
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) =>
            setForm((current) => ({ ...current, enabled: event.target.checked }))
          }
          className="size-4"
        />
      </label>
      <Field label="默认 Base URL">
        <input
          value={form.baseUrl}
          onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))}
          className="admin-input"
        />
      </Field>
      <Field label="请求格式">
        <select
          value={form.requestFormat}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              requestFormat: event.target.value as NonNullable<
                AdminAiProviderDirectoryUpdate['requestFormat']
              >,
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
              authType: event.target.value as NonNullable<
                AdminAiProviderDirectoryUpdate['authType']
              >,
            }))
          }
          className="admin-input"
        >
          <option value="bearer_token">Bearer Token</option>
          <option value="api_key">API Key</option>
          <option value="none">None</option>
        </select>
      </Field>
      <Field label="备注">
        <textarea
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          className="admin-input min-h-20 resize-none py-2"
        />
      </Field>
      <div className="grid gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-4 text-sm text-ink transition-colors hover:bg-canvas disabled:opacity-50"
        >
          <RefreshCw className="size-4" strokeWidth={1.8} />
          {syncing ? '同步中' : '同步默认模型'}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Save className="size-4" strokeWidth={1.8} />
          {pending ? '保存中' : '保存渠道配置'}
        </button>
      </div>
    </form>
  );
}

function ModelSearchBar({
  value,
  total,
  visible,
  placeholder,
  onChange,
  onClear,
}: {
  value: string;
  total: number;
  visible: number;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-hairline bg-surface-alt/60 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-hairline bg-surface px-9 text-xs text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-soft"
          />
        </label>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs text-ink-soft">
            {visible} / {total}
          </span>
          {value.trim() ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:text-ink"
            >
              清除
            </button>
          ) : null}
        </div>
      </div>
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
  return (
    <div className={`p-6 text-sm ${tone === 'error' ? 'text-pink' : 'text-ink-soft'}`}>{text}</div>
  );
}

function directoryModelMatchesSearch(model: DirectoryModel, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [
    model.displayName,
    model.name,
    model.modelId,
    model.modelType,
    model.priceHint,
    model.availability,
    ...model.capabilities,
  ]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}
