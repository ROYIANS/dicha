import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AudioLines,
  Brain,
  Braces,
  CheckCircle2,
  CircleDashed,
  Eye,
  FileText,
  ImageIcon,
  Layers3,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  Server,
  Video,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  adminAiProviderDirectoryQueryOptions,
  syncAdminAiProviderDirectoryModels,
  updateAdminAiProviderDirectory,
  updateAdminAiProviderDirectoryModel,
} from '@/api/admin';
import {
  HeroCheckbox,
  HeroSelect,
  HeroSwitch,
  HeroTextArea,
  HeroTextInput,
} from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import {
  aiModelCommonParameterControls,
  aiModelExtensionParameterDefinitionByKey,
  aiModelExtensionParameterOptions,
  buildAiModelParameterConfig,
  createAiModelParameterDraft,
} from '@dicha/shared';
import type {
  AdminAiProviderDirectoryItem,
  AdminAiProviderDirectoryModelUpdate,
  AdminAiProviderDirectoryOverview,
  AdminAiProviderDirectoryUpdate,
  AiModelCapability,
  AiModelExtensionParameter,
  AiModelParameterControlDefinition,
  AiModelParameterDraft,
  AiModelType,
} from '@dicha/shared';

type DirectoryModel = AdminAiProviderDirectoryOverview['models'][number];

const contextWindowPresets = [4000, 8000, 16000, 32000, 64000, 200000, 400000, 1000000];

const modelTypeOptions = [
  'chat',
  'embedding',
  'rerank',
  'image',
  'audio',
  'video',
  'tts',
  'asr',
  'text2music',
  'realtime',
] satisfies AiModelType[];

const modelTypeLabels = {
  chat: '对话',
  embedding: '向量',
  rerank: '重排',
  image: '图片',
  audio: '音频',
  video: '视频',
  tts: '语音合成',
  asr: '语音识别',
  text2music: '音乐',
  realtime: '实时',
} satisfies Record<AiModelType, string>;

const modelCapabilityOptions = [
  { key: 'chat', label: '对话', icon: MessageSquare },
  { key: 'tool_use', label: '技能调用', icon: Wrench },
  { key: 'vision', label: '视觉识别', icon: Eye },
  { key: 'reasoning', label: '深度思考', icon: Brain },
  { key: 'web_search', label: '联网搜索', icon: Search },
  { key: 'image_generation', label: '图片生成', icon: ImageIcon },
  { key: 'image_output', label: '图片输出', icon: ImageIcon },
  { key: 'video', label: '视频', icon: Video },
  { key: 'audio', label: '音频', icon: AudioLines },
  { key: 'files', label: '文件', icon: FileText },
  { key: 'json', label: 'JSON', icon: Braces },
  { key: 'embedding', label: '向量', icon: Layers3 },
  { key: 'fast', label: '快速', icon: Zap },
] satisfies Array<{ key: AiModelCapability; label: string; icon: LucideIcon }>;

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
        <div onClick={(event) => event.stopPropagation()}>
          <HeroCheckbox
            label="推荐"
            isSelected={model.recommended}
            isDisabled={pending}
            onChange={onRecommend}
          />
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <HeroCheckbox
            label="启用"
            isSelected={model.enabled}
            isDisabled={pending}
            onChange={onToggle}
          />
        </div>
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
  const [form, setForm] = useState({
    displayName: model.displayName,
    avatar: model.avatar ?? '',
    contextWindow: model.contextWindow === null ? '' : String(model.contextWindow),
    modelType: model.modelType,
  });
  const [capabilities, setCapabilities] = useState<AiModelCapability[]>(model.capabilities);
  const [extensionParameters, setExtensionParameters] = useState<AiModelExtensionParameter[]>(
    model.extensionParameters ?? [],
  );
  const parameterControls = useMemo(
    () => modelParameterControlsForExtensions(extensionParameters),
    [extensionParameters],
  );
  const [parameterDraft, setParameterDraft] = useState<AiModelParameterDraft>(() =>
    createAiModelParameterDraft(model.parameterConfig ?? {}, parameterControls),
  );
  const parsedContextWindow = form.contextWindow.trim() ? Number(form.contextWindow) : null;
  const contextWindowInvalid =
    parsedContextWindow !== null &&
    (!Number.isFinite(parsedContextWindow) ||
      !Number.isInteger(parsedContextWindow) ||
      parsedContextWindow <= 0);

  const toggleCapability = (capability: AiModelCapability) => {
    setCapabilities((current) =>
      current.includes(capability)
        ? current.filter((item) => item !== capability)
        : [...current, capability],
    );
  };

  const updateExtensionParameters = (parameters: AiModelExtensionParameter[]) => {
    setExtensionParameters(parameters);
    setParameterDraft((current) => ({
      ...createAiModelParameterDraft(
        model.parameterConfig ?? {},
        modelParameterControlsForExtensions(parameters),
      ),
      ...current,
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.displayName.trim()) {
      toast.error('模型展示名称不能为空');
      return;
    }
    if (contextWindowInvalid) {
      toast.error('上下文窗口需要填写正整数');
      return;
    }
    const parsed = buildAiModelParameterConfig(parameterDraft, parameterControls);
    if (parsed.error) {
      toast.error(parsed.error);
      return;
    }
    onSave({
      providerId: model.providerId,
      modelId: model.modelId,
      displayName: form.displayName.trim(),
      avatar: form.avatar.trim() || null,
      contextWindow: parsedContextWindow,
      modelType: form.modelType,
      extensionParameters,
      capabilities,
      parameterConfig: parsed.config,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5 p-4">
      <div>
        <p className="text-sm font-semibold text-ink">模型信息配置</p>
        <p className="mt-1 truncate text-xs text-ink-soft">{model.name}</p>
      </div>

      <div className="space-y-3">
        <Field label="模型展示名称">
          <HeroTextInput
            value={form.displayName}
            onChange={(displayName) => setForm((current) => ({ ...current, displayName }))}
            disabled={pending}
          />
        </Field>
        <Field label="模型头像">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-xs font-semibold text-mist">
              {form.avatar.trim() || model.avatar || model.displayName.slice(0, 2).toUpperCase()}
            </span>
            <HeroTextInput
              value={form.avatar}
              onChange={(avatar) => setForm((current) => ({ ...current, avatar }))}
              disabled={pending}
              maxLength={12}
              placeholder="例如 GPT"
            />
          </div>
        </Field>
        <Field label="最大上下文窗口">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {contextWindowPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    setForm((current) => ({ ...current, contextWindow: String(preset) }))
                  }
                  className={`h-7 rounded-md border px-2 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                    parsedContextWindow === preset
                      ? 'border-ink bg-surface-alt text-ink'
                      : 'border-hairline bg-surface text-ink-soft hover:text-ink'
                  }`}
                >
                  {formatContextWindowPreset(preset)}
                </button>
              ))}
            </div>
            <HeroTextInput
              value={form.contextWindow}
              onChange={(contextWindow) =>
                setForm((current) => ({ ...current, contextWindow }))
              }
              inputMode="numeric"
              disabled={pending}
              placeholder="未知则留空"
            />
            {contextWindowInvalid ? (
              <p className="text-[11px] text-pink">请输入大于 0 的整数 Token 数。</p>
            ) : null}
          </div>
        </Field>
        <Field label="模型类型">
          <HeroSelect
            value={form.modelType}
            onChange={(modelType) =>
              setForm((current) => ({
                ...current,
                modelType: modelType as AiModelType,
              }))
            }
            isDisabled={pending}
            options={modelTypeOptions.map((type) => ({ value: type, label: modelTypeLabels[type] }))}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <SectionTitle
          title="模型能力"
          description="这些能力会在前台列表展示，并用于后续路由筛选。"
        />
        <div className="grid grid-cols-2 gap-2">
          {modelCapabilityOptions.map((option) => (
            <CapabilityToggle
              key={option.key}
              option={option}
              selected={capabilities.includes(option.key)}
              disabled={pending}
              onToggle={() => toggleCapability(option.key)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle title="扩展参数" description="选择模型支持的 LobeHub 风格扩展参数。" />
        <ExtensionParameterPicker
          value={extensionParameters}
          disabled={pending}
          onChange={updateExtensionParameters}
        />
      </div>

      <SectionTitle title="默认调用参数" description="作为用户侧模型参数覆盖前的默认值。" />
      <ModelParameterConfigFields
        controls={parameterControls}
        draft={parameterDraft}
        disabled={pending}
        onChange={setParameterDraft}
      />
      <button
        type="submit"
        disabled={pending || contextWindowInvalid}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Save className="size-4" strokeWidth={1.8} />
        {pending ? '保存中' : '保存模型配置'}
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
      <HeroSwitch
        label={value === true ? '已开启' : '未开启'}
        isSelected={value === true}
        isDisabled={disabled}
        onChange={onChange}
      />
    );
  }

  if (control.kind === 'select') {
    return (
      <HeroSelect
        value={typeof value === 'string' ? value : ''}
        isDisabled={disabled}
        onChange={onChange}
        emptyLabel="不设置"
        options={(control.options ?? []).map((option) => ({
          value: option.value,
          label: option.label,
        }))}
      />
    );
  }

  return (
    <HeroTextInput
      value={typeof value === 'string' ? value : ''}
      onChange={onChange}
      inputMode="decimal"
      disabled={disabled}
      placeholder={control.placeholder}
    />
  );
}

function CapabilityToggle({
  option,
  selected,
  disabled,
  onToggle,
}: {
  option: (typeof modelCapabilityOptions)[number];
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`flex h-9 items-center gap-2 rounded-md border px-2.5 text-left text-xs transition-colors disabled:opacity-50 ${
        selected
          ? 'border-ink bg-surface-alt text-ink'
          : 'border-hairline bg-surface text-ink-soft hover:text-ink'
      }`}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.8} />
      <span className="min-w-0 truncate">{option.label}</span>
    </button>
  );
}

function ExtensionParameterPicker({
  value,
  disabled,
  onChange,
}: {
  value: AiModelExtensionParameter[];
  disabled: boolean;
  onChange: (value: AiModelExtensionParameter[]) => void;
}) {
  const selected = new Set(value);
  const available = aiModelExtensionParameterOptions.filter(
    (parameter) => !selected.has(parameter),
  );
  return (
    <div className="space-y-2">
      <HeroSelect
        value=""
        isDisabled={disabled || available.length === 0}
        onChange={(nextValue) => {
          const next = nextValue as AiModelExtensionParameter;
          if (!next) return;
          onChange([...value, next]);
        }}
        emptyLabel="添加扩展参数"
        options={available.map((parameter) => {
          const definition = aiModelExtensionParameterDefinitionByKey.get(parameter);
          return { value: parameter, label: definition?.label ?? parameter };
        })}
      />
      {value.length > 0 ? (
        <div className="grid gap-2">
          {value.map((parameter) => {
            const definition = aiModelExtensionParameterDefinitionByKey.get(parameter);
            return (
              <div
                key={parameter}
                className="flex items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">
                    {definition?.label ?? parameter}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-faint">
                    {definition?.parameterTag ?? definition?.key ?? parameter}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((item) => item !== parameter))}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
                  aria-label="移除扩展参数"
                >
                  <X className="size-3.5" strokeWidth={1.8} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-hairline bg-canvas px-3 py-2 text-xs text-ink-faint">
          未启用扩展参数
        </div>
      )}
    </div>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">{description}</p>
    </div>
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

function formatContextWindowPreset(value: number) {
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return String(value);
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
      <HeroCheckbox
        label="前台开放"
        isSelected={form.enabled}
        onChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
      />
      <Field label="默认 Base URL">
        <HeroTextInput
          value={form.baseUrl}
          onChange={(baseUrl) => setForm((current) => ({ ...current, baseUrl }))}
        />
      </Field>
      <Field label="请求格式">
        <HeroSelect
          value={form.requestFormat}
          onChange={(requestFormat) =>
            setForm((current) => ({
              ...current,
              requestFormat: requestFormat as NonNullable<
                AdminAiProviderDirectoryUpdate['requestFormat']
              >,
            }))
          }
          options={[
            { value: 'openai_compatible', label: 'OpenAI Chat' },
            { value: 'openai_responses', label: 'OpenAI Responses' },
            { value: 'anthropic_messages', label: 'Anthropic Messages' },
          ]}
        />
      </Field>
      <Field label="认证方式">
        <HeroSelect
          value={form.authType}
          onChange={(authType) =>
            setForm((current) => ({
              ...current,
              authType: authType as NonNullable<
                AdminAiProviderDirectoryUpdate['authType']
              >,
            }))
          }
          options={[
            { value: 'bearer_token', label: 'Bearer Token' },
            { value: 'api_key', label: 'API Key' },
            { value: 'none', label: 'None' },
          ]}
        />
      </Field>
      <Field label="备注">
        <HeroTextArea
          value={form.notes}
          onChange={(notes) => setForm((current) => ({ ...current, notes }))}
          className="min-h-20"
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
        <HeroTextInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-w-0 flex-1"
        />
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
