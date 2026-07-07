import {
  Activity,
  ArrowDownUp,
  AudioLines,
  Bot,
  Boxes,
  Braces,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Eye,
  FileText,
  ImageIcon,
  Trash2,
  KeyRound,
  Layers3,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
  Server,
  Sparkles,
  Video,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { DropdownMenu, Modal, Tooltip as LobeTooltip } from '@lobehub/ui';
import { Slider } from 'antd';
import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  type AiAssignmentUpdate,
  type AiAvailabilityState,
  type AiConfigUpdate,
  type AiGatewayCatalog,
  type AiModel,
  type AiModelCapability,
  type AiModelExtensionParameter,
  type AiModelType,
  type AiModelUseCase,
  type AiProvider,
  type AiProviderRequestFormat,
  type AiProviderStatus,
  aiModelCommonParameterControls,
  aiModelExtensionParameterDefinitionByKey,
  aiModelExtensionParameterOptions,
  buildAiModelParameterConfig,
  createAiModelParameterDraft,
  type AiModelParameterControlDefinition,
  type AiModelParameterDraft,
} from '@dicha/shared';
import {
  aiCatalogQueryOptions,
  checkAiProviderConnection,
  syncAiProviderModels,
  updateAiConfig,
} from '@/api/ai';
import { ModelSelect } from '@/components/ModelSelect';
import {
  DichaInput,
  DichaInputNumber,
  DichaInputPassword,
  DichaSelect,
  DichaTextArea,
  type SelectOptions,
} from '@/components/base/DichaControls';
import { LobeIcon } from '@/components/base/LobeIcon';
import {
  SettingsDetailShell,
  SettingsPanel,
  SettingsSwitch,
  SettingsValueRow,
} from '@/components/SettingsScaffold';
import {
  compareModelsByEnabled,
  compareProvidersByEnabled,
  fallbackModelIds,
  firstAssignableModelId,
  getAssignableModelMap,
  isOfficialDichaProvider,
  isUserManagedProvider,
  isUserOwnedModel,
  lobeProviderKey,
} from '@/lib/ai-catalog-ui';
import { resolveLobeIconName, resolveLobeModelIconName } from '@/lib/lobe-icon-resolver';
import { type SettingsTint } from '@/components/settings-ui';

const providerStatusTone = {
  enabled: 'sage',
  disabled: 'mist',
  needs_config: 'peach',
  degraded: 'pink',
  offline: 'pink',
} satisfies Record<AiProviderStatus, SettingsTint>;

const availabilityTone = {
  healthy: 'sage',
  degraded: 'peach',
  offline: 'pink',
  unknown: 'mist',
  config_required: 'peach',
} satisfies Record<AiAvailabilityState, SettingsTint>;

const useCaseIcon = {
  assistant: Bot,
  item_profile: Sparkles,
  image_understanding: Layers3,
  tagging: Zap,
  summarization: Brain,
} satisfies Record<AiModelUseCase, LucideIcon>;

const capabilityIcon = {
  chat: MessageSquare,
  vision: Eye,
  tool_use: Wrench,
  json: Braces,
  embedding: Layers3,
  reasoning: Brain,
  fast: Zap,
  web_search: Search,
  image_generation: ImageIcon,
  audio: AudioLines,
  files: FileText,
  image_output: ImageIcon,
  video: Video,
} satisfies Record<AiModelCapability, LucideIcon>;

const modelCapabilityOptions = [
  'tool_use',
  'vision',
  'reasoning',
  'web_search',
  'image_generation',
  'image_output',
  'audio',
  'files',
  'video',
] satisfies AiModelCapability[];
type ConfigurableModelCapability = (typeof modelCapabilityOptions)[number];

const extensionParameterOptions = aiModelExtensionParameterOptions;

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

type ModelListFilterKey = 'all' | 'chat' | 'image' | 'video' | 'embedding' | 'audio';
type ModelListSortMode =
  'default' | 'name_asc' | 'name_desc' | 'context_desc' | 'capabilities_desc' | 'release_desc';

const modelListFilters = [
  {
    key: 'all',
    icon: Boxes,
    matches: () => true,
  },
  {
    key: 'chat',
    icon: MessageSquare,
    matches: (model: AiModel) => model.modelType === 'chat' || model.capabilities.includes('chat'),
  },
  {
    key: 'image',
    icon: ImageIcon,
    matches: (model: AiModel) =>
      model.modelType === 'image' ||
      model.capabilities.includes('vision') ||
      model.capabilities.includes('image_generation') ||
      model.capabilities.includes('image_output'),
  },
  {
    key: 'video',
    icon: Video,
    matches: (model: AiModel) =>
      model.modelType === 'video' || model.capabilities.includes('video'),
  },
  {
    key: 'embedding',
    icon: Layers3,
    matches: (model: AiModel) =>
      model.modelType === 'embedding' ||
      model.modelType === 'rerank' ||
      model.capabilities.includes('embedding'),
  },
  {
    key: 'audio',
    icon: AudioLines,
    matches: (model: AiModel) =>
      model.modelType === 'audio' ||
      model.modelType === 'tts' ||
      model.modelType === 'asr' ||
      model.modelType === 'realtime' ||
      model.modelType === 'text2music' ||
      model.capabilities.includes('audio'),
  },
] satisfies Array<{
  key: ModelListFilterKey;
  icon: LucideIcon;
  matches: (model: AiModel) => boolean;
}>;

const modelListSortOptions = [
  'default',
  'name_asc',
  'name_desc',
  'context_desc',
  'capabilities_desc',
  'release_desc',
] satisfies ModelListSortMode[];

const requestFormatOptions = [
  { value: 'openai_compatible', label: 'OpenAI-compatible Chat Completions' },
  { value: 'openai_responses', label: 'OpenAI Responses API' },
  { value: 'anthropic_messages', label: 'Anthropic Messages API' },
] satisfies Array<{ value: AiProviderRequestFormat; label: string }>;

const contextWindowScale = [4000, 8000, 16000, 32000, 64000, 200000, 400000, 1000000, 2000000];
const contextWindowMarks = Object.fromEntries(
  contextWindowScale.map((value, index) => [index, formatContextWindowPreset(value)]),
);

function DichaTooltip({
  children,
  title,
  className = 'rounded-md border border-hairline bg-surface px-2 py-1 text-[11px] text-ink shadow-float',
}: {
  children: ReactNode;
  title: ReactNode;
  className?: string;
}) {
  return (
    <LobeTooltip className={className} mouseEnterDelay={0.2} title={title}>
      {children}
    </LobeTooltip>
  );
}

export function AiProvidersSettingsPage() {
  const { t } = useTranslation();
  const catalogQuery = useQuery(aiCatalogQueryOptions());
  const catalog = catalogQuery.data;
  const updateConfig = useAiConfigMutation();
  const syncModels = useAiProviderSyncMutation();
  const checkConnection = useAiProviderCheckMutation();
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [checkingProviderId, setCheckingProviderId] = useState<string | null>(null);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [modelModal, setModelModal] = useState<{ provider: AiProvider; model?: AiModel } | null>(
    null,
  );
  const providers = catalog?.providers.slice().sort(compareProvidersByEnabled);
  const autoSyncProvider = (providerId: string, nextCatalog: AiGatewayCatalog) => {
    const provider = nextCatalog.providers.find((item) => item.id === providerId);
    if (!provider) return;
    if (provider.modelSyncMode !== 'openai_models_endpoint') return;
    setSyncingProviderId(provider.id);
    syncModels.mutate(provider.id, {
      onSettled: () => setSyncingProviderId(null),
    });
  };

  return (
    <SettingsDetailShell
      title={t('settings.detail.aiProviders.title')}
      subtitle={t('settings.detail.aiProviders.subtitle')}
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <ProviderOverview catalog={catalog} />
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>{t('settings.detail.aiProviders.panelProviders')}</SectionLabel>
            <button
              type="button"
              onClick={() => setProviderModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              <Plus size={14} />
              {t('settings.detail.aiProviders.addProvider')}
            </button>
          </div>
          {providers && catalog ? (
            providers.length > 0 ? (
              providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  catalog={catalog}
                  provider={provider}
                  onUpdate={(body) => updateConfig.mutate(body)}
                  onConfigured={(providerId, body) => {
                    updateConfig.mutate(body, {
                      onSuccess: (nextCatalog) => autoSyncProvider(providerId, nextCatalog),
                    });
                  }}
                  onAddModel={() => setModelModal({ provider })}
                  onConfigureModel={(model) => setModelModal({ provider, model })}
                  onCheckConnection={(providerId) => {
                    setCheckingProviderId(providerId);
                    checkConnection.mutate(providerId, {
                      onSettled: () => setCheckingProviderId(null),
                    });
                  }}
                  onSyncModels={(providerId) => {
                    setSyncingProviderId(providerId);
                    syncModels.mutate(providerId, {
                      onSettled: () => setSyncingProviderId(null),
                    });
                  }}
                  pending={updateConfig.isPending}
                  syncing={syncingProviderId === provider.id && syncModels.isPending}
                  checking={checkingProviderId === provider.id && checkConnection.isPending}
                />
              ))
            ) : (
              <EmptyProvidersPanel onAddProvider={() => setProviderModalOpen(true)} />
            )
          ) : (
            <LoadingPanel />
          )}
        </section>
      </div>
      <ProviderFormModal
        open={providerModalOpen}
        pending={updateConfig.isPending}
        onClose={() => setProviderModalOpen(false)}
        onSubmit={(body) => {
          updateConfig.mutate(body, { onSuccess: () => setProviderModalOpen(false) });
        }}
      />
      {modelModal ? (
        <ModelFormModal
          key={`${modelModal.provider.id}:${modelModal.model?.id ?? 'new'}`}
          state={modelModal}
          pending={updateConfig.isPending}
          onClose={() => setModelModal(null)}
          onSubmit={(body) => {
            updateConfig.mutate(body, { onSuccess: () => setModelModal(null) });
          }}
        />
      ) : null}
    </SettingsDetailShell>
  );
}

export function AiModelsSettingsPage() {
  const { t } = useTranslation();
  const catalogQuery = useQuery(aiCatalogQueryOptions());
  const catalog = catalogQuery.data;
  const [selectedByUseCase, setSelectedByUseCase] = useState<Record<string, string>>({});
  const [fallbackByUseCase, setFallbackByUseCase] = useState<Record<string, string>>({});
  const updateConfig = useAiConfigMutation();

  const assignmentRows = useMemo(() => {
    if (!catalog) return [];
    const assignableModels = getAssignableModelMap(catalog);
    return catalog.assignments.map((assignment) => {
      const localPrimaryModelId = selectedByUseCase[assignment.useCase];
      const rawPrimaryModelId = localPrimaryModelId ?? assignment.primaryModelId;
      const selectedModelId = assignableModels.has(rawPrimaryModelId) ? rawPrimaryModelId : '';
      const localFallbackModelId = fallbackByUseCase[assignment.useCase];
      const selectedFallbackModelId =
        localFallbackModelId !== undefined
          ? firstAssignableModelId([localFallbackModelId], assignableModels, selectedModelId)
          : firstAssignableModelId(assignment.fallbackModelIds, assignableModels, selectedModelId);
      const selectedFallbackModelIds = fallbackModelIds({
        current: assignment.fallbackModelIds.filter((modelId) => assignableModels.has(modelId)),
        nextFirst: selectedFallbackModelId,
        primaryModelId: selectedModelId,
      });

      return {
        ...assignment,
        selectedModelId,
        selectedFallbackModelId,
        selectedFallbackModelIds,
      };
    });
  }, [catalog, fallbackByUseCase, selectedByUseCase]);

  return (
    <SettingsDetailShell
      title={t('settings.detail.aiModels.title')}
      subtitle={t('settings.detail.aiModels.subtitle')}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <SettingsPanel
          title={t('settings.detail.aiModels.panelAssignments')}
          footer={t('settings.detail.aiModels.assignmentFooter')}
        >
          {catalog ? (
            assignmentRows.map((assignment) => {
              const Icon = useCaseIcon[assignment.useCase];
              return (
                <AssignmentRow
                  key={assignment.useCase}
                  icon={Icon}
                  title={t(`settings.aiUseCases.${assignment.useCase}`)}
                  description={t('settings.detail.aiModels.assignmentDesc', {
                    count: assignment.fallbackModelIds.length,
                  })}
                  catalog={catalog}
                  primaryModelId={assignment.selectedModelId}
                  fallbackModelId={assignment.selectedFallbackModelId}
                  pending={updateConfig.isPending}
                  onPrimaryChange={(value) => {
                    setSelectedByUseCase((current) => ({
                      ...current,
                      [assignment.useCase]: value,
                    }));
                    updateConfig.mutate({
                      assignments: [
                        assignmentUpdate({
                          catalog,
                          useCase: assignment.useCase,
                          primaryModelId: value,
                          fallbackModelIds: fallbackModelIds({
                            current: assignment.selectedFallbackModelIds,
                            nextFirst: assignment.selectedFallbackModelId,
                            primaryModelId: value,
                          }),
                        }),
                      ],
                    });
                  }}
                  onFallbackChange={(value) => {
                    setFallbackByUseCase((current) => ({
                      ...current,
                      [assignment.useCase]: value,
                    }));
                    updateConfig.mutate({
                      assignments: [
                        assignmentUpdate({
                          catalog,
                          useCase: assignment.useCase,
                          primaryModelId: assignment.selectedModelId,
                          fallbackModelIds: fallbackModelIds({
                            current: assignment.selectedFallbackModelIds,
                            nextFirst: value,
                            primaryModelId: assignment.selectedModelId,
                          }),
                        }),
                      ],
                    });
                  }}
                />
              );
            })
          ) : (
            <SettingsValueRow
              icon={CircleDashed}
              tint="mist"
              label={t('settings.detail.aiCommon.loading')}
              description={t('settings.detail.aiCommon.loadingDesc')}
            />
          )}
        </SettingsPanel>
      </div>
    </SettingsDetailShell>
  );
}

function ProviderCard({
  catalog,
  provider,
  onUpdate,
  onConfigured,
  onAddModel,
  onConfigureModel,
  onCheckConnection,
  onSyncModels,
  pending,
  syncing,
  checking,
}: {
  catalog: AiGatewayCatalog;
  provider: AiProvider;
  onUpdate: (body: AiConfigUpdate) => void;
  onConfigured: (providerId: string, body: AiConfigUpdate) => void;
  onAddModel: () => void;
  onConfigureModel: (model: AiModel) => void;
  onCheckConnection: (providerId: string) => void;
  onSyncModels: (providerId: string) => void;
  pending: boolean;
  syncing: boolean;
  checking: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const providerModels = catalog.models
    .filter((model) => model.providerId === provider.id)
    .sort(compareModelsByEnabled);
  const enabledModelCount = providerModels.filter((model) => model.enabled).length;
  const StatusIcon = provider.status === 'enabled' ? CheckCircle2 : Activity;
  const isEnabled = provider.status === 'enabled' || provider.status === 'needs_config';
  const providerTags = providerTagLabels(providerModels);
  const supportsUpstreamSync = provider.modelSyncMode === 'openai_models_endpoint';
  const hasConnectionCredential = provider.credentialState !== 'missing';
  const canRunUpstreamProbe = supportsUpstreamSync;
  const canDeleteProvider = provider.custom === true;
  const isOfficialDicha = isOfficialDichaProvider(provider);
  const showProviderRuntimeActions = !isOfficialDicha;
  const showUpstreamSyncActions = isUserManagedProvider(provider);
  const canAddCustomModel = !isOfficialDicha;
  const upstreamActionHint = !showUpstreamSyncActions
    ? ''
    : !supportsUpstreamSync
      ? t('settings.detail.aiProviders.upstreamUnsupportedHint')
      : hasConnectionCredential
        ? t('settings.detail.aiProviders.upstreamReadyHint')
        : t('settings.detail.aiProviders.upstreamPublicHint');
  const credentialTitle =
    provider.credentialMode === 'platform_managed'
      ? t('settings.detail.aiProviders.credentialPlatformManaged')
      : provider.credentialMode === 'not_required'
        ? t('settings.detail.aiProviders.credentialNotRequired')
        : provider.credentialState === 'missing'
          ? t('settings.detail.aiProviders.credentialMissing')
          : t('settings.detail.aiProviders.credentialReady');
  const credentialHint =
    provider.billingMode === 'platform_credits'
      ? t('settings.detail.aiProviders.platformCreditsHint')
      : provider.credentialMode === 'not_required'
        ? t('settings.detail.aiProviders.localCredentialHint')
        : t('settings.detail.aiProviders.credentialUsageHint');
  const checkTitle = !supportsUpstreamSync
    ? t('settings.detail.aiProviders.checkUnsupported')
    : t('settings.detail.aiProviders.checkConnection');
  const syncTitle = !supportsUpstreamSync
    ? t('settings.detail.aiProviders.syncUnsupported')
    : t('settings.detail.aiProviders.syncModels');

  return (
    <article className="overflow-visible rounded-md border border-hairline bg-surface shadow-[6px_6px_0_color-mix(in_oklab,var(--ink)_5%,transparent)]">
      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-start gap-3">
            <ProviderMark provider={provider} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-semibold leading-tight text-ink">
                  {provider.name}
                </h2>
                <span className="rounded-md border border-hairline bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-ink-faint">
                  {provider.custom
                    ? t('settings.detail.aiProviders.customProvider')
                    : `P${provider.priority}`}
                </span>
                <StatusPill
                  icon={StatusIcon}
                  tint={providerStatusTone[provider.status]}
                  label={t(`settings.aiProviderStatus.${provider.status}`)}
                />
              </div>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-soft">
                {provider.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {providerTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-hairline bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink-faint"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative rounded-md border border-hairline bg-surface-alt p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-ink">{credentialTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{credentialHint}</p>
            </div>
            {isOfficialDicha ? (
              <StatusPill
                icon={Sparkles}
                tint="mist"
                label={t('settings.detail.aiProviders.officialManaged')}
              />
            ) : (
              <SettingsSwitch
                checked={isEnabled}
                onChange={(enabled) =>
                  onUpdate({ providers: [{ providerId: provider.id, enabled }] })
                }
                label={t('settings.detail.aiProviders.toggleProvider', { name: provider.name })}
                disabled={pending}
              />
            )}
          </div>
          <ProviderCredentialPopover
            provider={provider}
            pending={pending}
            onConfigured={onConfigured}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-surface-alt px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded
            ? t('settings.detail.aiProviders.hideModels')
            : t('settings.detail.aiProviders.showModels', { count: providerModels.length })}
          <span className="text-ink-faint">
            {t('settings.detail.aiProviders.enabledModelCount', { count: enabledModelCount })}
          </span>
        </button>
        <div className="flex items-center gap-2">
          {canDeleteProvider ? (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    t('settings.detail.aiProviders.deleteProviderConfirm', { name: provider.name }),
                  )
                ) {
                  onUpdate({ providers: [{ providerId: provider.id, delete: true }] });
                }
              }}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-pink transition-colors hover:border-pink disabled:cursor-not-allowed disabled:opacity-50"
              title={t('settings.detail.aiProviders.deleteProvider')}
            >
              <Trash2 size={14} />
              {t('settings.detail.aiProviders.deleteProvider')}
            </button>
          ) : null}
          {showProviderRuntimeActions ? (
            <>
              <button
                type="button"
                onClick={() => onCheckConnection(provider.id)}
                disabled={checking || !canRunUpstreamProbe}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                title={checkTitle}
              >
                <Activity size={14} className={checking ? 'animate-pulse' : ''} />
                {t('settings.detail.aiProviders.checkConnection')}
              </button>
            </>
          ) : null}
          {showUpstreamSyncActions ? (
            <>
              <button
                type="button"
                onClick={() => onSyncModels(provider.id)}
                disabled={syncing || !canRunUpstreamProbe}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                title={syncTitle}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {t('settings.detail.aiProviders.syncModels')}
              </button>
            </>
          ) : null}
          {canAddCustomModel ? (
            <>
              <button
                type="button"
                onClick={onAddModel}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
                title={t('settings.detail.aiProviders.addModel')}
              >
                <Plus size={14} />
                {t('settings.detail.aiProviders.addModel')}
              </button>
            </>
          ) : null}
        </div>
        {upstreamActionHint ? (
          <p className="basis-full text-right text-[11px] leading-relaxed text-ink-faint">
            {upstreamActionHint}
          </p>
        ) : null}
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <ProviderModelList
            models={providerModels}
            provider={provider}
            catalog={catalog}
            pending={pending}
            readOnly={isOfficialDicha}
            onUpdate={onUpdate}
            onConfigure={onConfigureModel}
          />
        </div>
      </div>
    </article>
  );
}

function AssignmentRow({
  icon: Icon,
  title,
  description,
  catalog,
  primaryModelId,
  fallbackModelId,
  pending,
  onPrimaryChange,
  onFallbackChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  catalog: AiGatewayCatalog;
  primaryModelId: string;
  fallbackModelId: string;
  pending: boolean;
  onPrimaryChange: (value: string) => void;
  onFallbackChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 border-b border-hairline/70 px-3.5 py-4 last:border-b-0 sm:px-4 lg:grid-cols-[minmax(220px,1fr)_minmax(420px,520px)] lg:items-start">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-chip-lavender text-lavender shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_7%,transparent)]">
          <Icon size={17} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="mt-1 max-w-[46ch] text-[12px] leading-relaxed text-ink-faint">
            {description}
          </p>
        </div>
      </div>
      <div className="grid min-w-0 gap-3 rounded-md bg-canvas p-3 shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_6%,transparent)] sm:grid-cols-2">
        <AssignmentField label={t('settings.detail.aiModels.primaryModel')}>
          <ModelSelect
            catalog={catalog}
            value={primaryModelId}
            onChange={onPrimaryChange}
            disabled={pending}
            placeholder={t('settings.detail.aiModels.selectPlaceholder')}
            unavailableLabel={t('settings.detail.aiModels.selectedUnavailable')}
            emptyLabel={t('settings.detail.aiModels.emptyModels')}
          />
        </AssignmentField>
        <AssignmentField label={t('settings.detail.aiModels.fallbackModel')}>
          <ModelSelect
            catalog={catalog}
            value={fallbackModelId}
            onChange={onFallbackChange}
            disabled={pending}
            placeholder={t('settings.detail.aiModels.fallbackPlaceholder')}
            unavailableLabel={t('settings.detail.aiModels.selectedUnavailable')}
            emptyLabel={t('settings.detail.aiModels.emptyModels')}
            allowEmpty
          />
        </AssignmentField>
      </div>
    </div>
  );
}

function AssignmentField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="text-[11px] font-medium text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

function ProviderOverview({ catalog }: { catalog: AiGatewayCatalog | undefined }) {
  const { t } = useTranslation();
  const providerCount = catalog?.providers.length ?? 0;
  const configuredCount =
    catalog?.providers.filter((provider) => provider.credentialState !== 'missing').length ?? 0;
  const enabledModelCount = catalog?.models.filter((model) => model.enabled).length ?? 0;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <MetricTile
        label={t('settings.detail.aiProviders.metricProviders')}
        value={String(providerCount)}
      />
      <MetricTile
        label={t('settings.detail.aiProviders.metricCredentials')}
        value={`${configuredCount}/${providerCount}`}
      />
      <MetricTile
        label={t('settings.detail.aiProviders.metricModels')}
        value={String(enabledModelCount)}
      />
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface px-4 py-3">
      <p className="text-[11px] font-medium text-ink-faint">{label}</p>
      <p className="mt-1 text-[22px] font-semibold leading-none text-ink">{value}</p>
    </div>
  );
}

function ProviderMark({ provider }: { provider: AiProvider }) {
  const avatar = provider.avatar ?? provider.shortName;
  return (
    <ProviderAvatar
      avatar={avatar}
      fallback={provider.shortName}
      provider={provider}
      className="size-11 text-[13px]"
    />
  );
}

function ProviderCredentialPopover({
  provider,
  pending,
  onConfigured,
}: {
  provider: AiProvider;
  pending: boolean;
  onConfigured: (providerId: string, body: AiConfigUpdate) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [credential, setCredential] = useState('');
  const [avatar, setAvatar] = useState(provider.avatar ?? provider.shortName);
  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const trimmedAvatar = avatar.trim() || provider.shortName;
  const trimmedBaseUrl = baseUrl.trim();
  const trimmedCredential = credential.trim();
  const requiresUserCredential = provider.credentialMode === 'user_api_key';
  const isPlatformManaged = provider.credentialMode === 'platform_managed';
  const configChanged =
    trimmedBaseUrl !== provider.baseUrl ||
    trimmedAvatar !== (provider.avatar ?? provider.shortName);
  const canSave =
    trimmedBaseUrl.length > 0 &&
    (requiresUserCredential ? trimmedCredential.length > 0 || configChanged : configChanged);

  if (isPlatformManaged) {
    return (
      <div className="mt-3 rounded-md border border-mist bg-chip-mist px-3 py-2 text-[12px] leading-relaxed text-mist">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Sparkles size={14} />
          {t('settings.detail.aiProviders.platformManagedTitle')}
        </span>
        <p className="mt-1 text-[11px] leading-relaxed">
          {t('settings.detail.aiProviders.platformManagedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-hairline bg-surface px-3 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <KeyRound size={14} />
        {requiresUserCredential
          ? provider.credentialState === 'missing'
            ? t('settings.detail.aiProviders.addCredential')
            : t('settings.detail.aiProviders.manageCredential')
          : t('settings.detail.aiProviders.configureEndpoint')}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[min(360px,calc(100vw-48px))] rounded-md border border-hairline bg-surface p-3 shadow-float">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">
              {t('settings.detail.aiProviders.apiKeyPopoverTitle')}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-7 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="rounded-md border border-hairline bg-surface-alt px-2 py-1.5 text-center text-[12px] font-medium text-ink-faint">
              {t('settings.detail.aiProviders.creditPriority')}
            </span>
            <span className="rounded-md border border-mist bg-chip-mist px-2 py-1.5 text-center text-[12px] font-medium text-mist">
              {requiresUserCredential
                ? 'API Key'
                : t('settings.detail.aiProviders.noApiKeyRequired')}
            </span>
          </div>
          <p className="mt-3 rounded-md bg-surface-alt px-3 py-2 text-[12px] font-medium text-ink">
            {requiresUserCredential
              ? provider.credentialState === 'missing'
                ? t('settings.detail.aiProviders.apiKeyMissingHint')
                : t('settings.detail.aiProviders.apiKeyMaskedHint')
              : t('settings.detail.aiProviders.noApiKeyHint')}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <ProviderAvatar
                avatar={trimmedAvatar}
                fallback={provider.shortName}
                provider={provider}
                className="size-9 text-[11px]"
              />
              <TextField
                value={avatar}
                onChange={setAvatar}
                disabled={pending}
                maxLength={2048}
                placeholder={t('settings.detail.aiProviders.providerAvatarPlaceholder')}
              />
            </div>
            <TextField
              value={baseUrl}
              onChange={setBaseUrl}
              disabled={pending}
              placeholder={t('settings.detail.aiProviders.baseUrlPlaceholder')}
            />
            {requiresUserCredential ? (
              <DichaInputPassword
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                autoComplete="off"
                placeholder={t('settings.detail.aiProviders.apiKeyPlaceholder')}
                disabled={pending}
                className="h-9 w-full text-[12px]"
              />
            ) : null}
            <button
              type="button"
              disabled={pending || !canSave}
              onClick={() => {
                onConfigured(provider.id, {
                  providers: [
                    {
                      providerId: provider.id,
                      enabled: true,
                      avatar: trimmedAvatar,
                      baseUrl: trimmedBaseUrl,
                      requestFormat: provider.requestFormat ?? 'openai_compatible',
                      ...(trimmedCredential ? { credential: trimmedCredential } : {}),
                    },
                  ],
                });
                setCredential('');
                setOpen(false);
              }}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-hairline bg-[var(--sidebar-bg)] px-3 text-[12px] font-medium text-sidebar-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              {requiresUserCredential
                ? t('settings.detail.aiProviders.saveCredentialShort')
                : t('settings.detail.aiProviders.saveEndpointConfig')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProviderModelList({
  models,
  provider,
  catalog,
  pending,
  readOnly,
  onUpdate,
  onConfigure,
}: {
  models: AiModel[];
  provider: AiProvider;
  catalog: AiGatewayCatalog;
  pending: boolean;
  readOnly: boolean;
  onUpdate: (body: AiConfigUpdate) => void;
  onConfigure: (model: AiModel) => void;
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<ModelListFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ModelListSortMode>('default');
  const providerById = useMemo(
    () => new Map(catalog.providers.map((provider) => [provider.id, provider])),
    [catalog.providers],
  );
  const filterCounts = useMemo(
    () =>
      new Map(
        modelListFilters.map((filter) => [
          filter.key,
          models.filter((model) => filter.matches(model)).length,
        ]),
      ),
    [models],
  );
  const visibleFilters = useMemo(
    () =>
      modelListFilters.filter(
        (filter) => filter.key === 'all' || (filterCounts.get(filter.key) ?? 0) > 0,
      ),
    [filterCounts],
  );
  const selectedFilter = visibleFilters.some((filter) => filter.key === activeFilter)
    ? activeFilter
    : 'all';

  const visibleModels = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filter =
      modelListFilters.find((item) => item.key === selectedFilter) ??
      modelListFilters.find((item) => item.key === 'all');
    if (!filter) return [];
    return models
      .filter((model) => filter.matches(model))
      .filter((model) => {
        if (!normalizedQuery) return true;
        const provider = providerById.get(model.providerId);
        return [
          model.displayName,
          model.name,
          model.id,
          model.modelType,
          model.priceHint,
          model.releasedAt,
          provider?.name,
          provider?.id,
          ...model.capabilities,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => compareProviderModels(left, right, sortMode));
  }, [models, providerById, searchQuery, selectedFilter, sortMode]);
  const activeSortLabel = t(`settings.detail.aiProviders.modelSort.${sortMode}`);

  if (models.length === 0) {
    return (
      <div className="bg-canvas px-4 py-4 text-[12px] text-ink-faint">
        {t('settings.detail.aiProviders.noProviderModels')}
      </div>
    );
  }

  return (
    <div className="bg-canvas px-4 py-3">
      <div className="grid gap-3 rounded-md border border-hairline bg-surface px-3 py-3">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative min-w-0">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <DichaInput
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('settings.detail.aiProviders.modelSearchPlaceholder')}
              className="h-9 w-full pl-9 text-[12px]"
            />
          </div>
          <DropdownMenu
            items={modelListSortOptions.map((option) => ({
              key: option,
              label: (
                <span className="flex items-center justify-between gap-3 text-[12px]">
                  {t(`settings.detail.aiProviders.modelSort.${option}`)}
                  {sortMode === option ? <CheckCircle2 size={13} className="text-sage" /> : null}
                </span>
              ),
              onClick: () => setSortMode(option),
            }))}
            placement="bottomRight"
            popupProps={{
              className: 'min-w-48 rounded-md border border-hairline bg-surface p-1 shadow-float',
            }}
          >
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-hairline bg-surface px-3 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
              aria-label={t('settings.detail.aiProviders.modelSortLabel')}
            >
              <ArrowDownUp size={14} />
              <span className="max-w-[12rem] truncate">{activeSortLabel}</span>
              <ChevronDown size={13} />
            </button>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto border-b border-hairline" role="tablist">
          <div className="flex min-w-max flex-row flex-nowrap items-center gap-7 px-1">
            {visibleFilters.map((filter) => {
              const Icon = filter.icon;
              const count = filterCounts.get(filter.key) ?? 0;
              const selected = filter.key === selectedFilter;
              return (
                <button
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`inline-flex h-10 items-center gap-1.5 border-b-2 px-0 text-[12px] font-semibold outline-none transition-colors ${
                    selected
                      ? 'border-[var(--ink)] text-ink'
                      : 'border-transparent text-ink-faint hover:text-ink-soft'
                  }`}
                >
                  <Icon size={15} />
                  {t(`settings.detail.aiProviders.modelFilters.${filter.key}`)}
                  <span className="text-[11px] font-medium text-ink-faint">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-hairline bg-surface">
        {visibleModels.length > 0 ? (
          visibleModels.map((model) => (
            <div key={model.id} className="border-b border-hairline/70 last:border-b-0">
              <ProviderModelRow
                model={model}
                provider={provider}
                catalog={catalog}
                pending={pending}
                readOnly={readOnly}
                onConfigure={() => onConfigure(model)}
                onUpdate={onUpdate}
              />
            </div>
          ))
        ) : (
          <div className="px-4 py-5 text-[12px] text-ink-faint">
            {t('settings.detail.aiProviders.noProviderModelsForFilter')}
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderModelRow({
  model,
  provider,
  catalog,
  pending,
  readOnly,
  onConfigure,
  onUpdate,
}: {
  model: AiModel;
  provider: AiProvider;
  catalog: AiGatewayCatalog;
  pending: boolean;
  readOnly: boolean;
  onConfigure: () => void;
  onUpdate: (body: AiConfigUpdate) => void;
}) {
  const { t } = useTranslation();
  const assignedUseCases = catalog.assignments
    .filter(
      (assignment) =>
        assignment.primaryModelId === model.id || assignment.fallbackModelIds.includes(model.id),
    )
    .map((assignment) => t(`settings.aiUseCases.${assignment.useCase}`));
  const hasKnownMetadata = model.contextWindow !== null && model.capabilities.length > 0;
  const canDeleteModel = !readOnly && isUserOwnedModel(model, provider);
  const canConfigureModel = !readOnly && isUserOwnedModel(model, provider);
  const compactMetadata = modelCompactMetadata(model, {
    maxOutput: (value) => String(t('settings.detail.aiProviders.modelMaxOutput', { value })),
    releasedAt: (value) => String(t('settings.detail.aiProviders.modelReleasedAt', { value })),
  });

  return (
    <div className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <ModelAvatar model={model} />
        <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold text-ink">{model.displayName}</span>
            <span className="max-w-[18rem] truncate rounded-md bg-surface-alt px-1.5 py-0.5 text-[11px] text-ink-faint">
              {model.name}
            </span>
            {model.recommended ? (
              <span className="rounded-md bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                {t('settings.detail.aiProviders.recommended')}
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-soft">
            <span>{t(`settings.detail.aiProviders.modelTypeLabels.${model.modelType}`)}</span>
            {compactMetadata.map((item) => (
              <span key={item} className="truncate">
                {item}
              </span>
            ))}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CapabilityIconRail capabilities={model.capabilities} />
            <span className="truncate text-[11px] text-ink-faint">
              {assignedUseCases.length > 0
                ? assignedUseCases.join(' / ')
                : t('settings.detail.aiModels.noAssignment')}
            </span>
          </div>
          {!hasKnownMetadata && !readOnly ? (
            <div className="text-[11px] text-ink-faint">
              {t('settings.detail.aiProviders.metadataUnknown')}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-[180px] items-center justify-end gap-2">
        {canDeleteModel ? (
          <DichaTooltip title={t('settings.detail.aiProviders.deleteModel')}>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    t('settings.detail.aiProviders.deleteModelConfirm', {
                      name: model.displayName,
                    }),
                  )
                ) {
                  onUpdate({ models: [{ modelId: model.id, delete: true }] });
                }
              }}
              disabled={pending}
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-alt hover:text-pink disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('settings.detail.aiProviders.deleteModel')}
            >
              <Trash2 size={15} />
            </button>
          </DichaTooltip>
        ) : null}
        {canConfigureModel ? (
          <DichaTooltip title={t('settings.detail.aiProviders.configureModel')}>
            <button
              type="button"
              onClick={onConfigure}
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-alt hover:text-ink"
              aria-label={t('settings.detail.aiProviders.configureModel')}
            >
              <SlidersHorizontal size={15} />
            </button>
          </DichaTooltip>
        ) : null}
        {readOnly ? null : (
          <StatusDot
            tint={availabilityTone[model.availability]}
            label={t(`settings.aiAvailability.${model.availability}`)}
          />
        )}
        {model.contextWindow !== null ? (
          <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-md bg-surface-alt px-2 text-[12px] font-medium text-ink-soft">
            {formatContextWindowPreset(model.contextWindow)}
          </span>
        ) : null}
        {readOnly ? null : (
          <SettingsSwitch
            checked={model.enabled}
            onChange={(enabled) => onUpdate({ models: [{ modelId: model.id, enabled }] })}
            label={t('settings.detail.aiModels.toggleModel', { name: model.displayName })}
            disabled={pending || !hasKnownMetadata}
          />
        )}
      </div>
    </div>
  );
}

function ModelAvatar({ model }: { model: AiModel }) {
  const avatar = model.avatar ?? providerShortName(model.displayName || model.name);
  const icon = renderLobeModelIcon(model.name);

  if (isImageUrl(avatar)) {
    return (
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-hairline bg-surface-alt">
        <img
          src={avatar}
          alt=""
          className="size-full object-contain p-1.5"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-mist">
      {icon ?? <Brain size={18} strokeWidth={1.8} aria-hidden="true" />}
      <span className="sr-only">{avatar}</span>
    </span>
  );
}

function renderLobeModelIcon(modelName: string) {
  const iconName = resolveLobeModelIconName(modelName);
  return iconName ? <LobeIcon iconName={iconName} size={22} /> : null;
}

function ProviderAvatar({
  avatar,
  fallback,
  provider,
  className = '',
}: {
  avatar: string;
  fallback: string;
  provider?: Pick<AiProvider, 'custom' | 'id'>;
  className?: string;
}) {
  if (isImageUrl(avatar)) {
    return (
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-md border border-hairline bg-surface-alt ${className}`}
      >
        <img
          src={avatar}
          alt=""
          className="size-full object-contain p-1.5"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }

  const providerKey = provider ? lobeProviderKey(provider) : undefined;
  const icon = renderLobeProviderIcon(providerKey);
  if (icon) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-ink ${className}`}
      >
        {icon}
        <span className="sr-only">{avatar || fallback}</span>
      </span>
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-md border border-hairline bg-chip-peach font-semibold text-peach ${className}`}
    >
      {avatar || fallback}
    </span>
  );
}

function renderLobeProviderIcon(providerKey: string | undefined) {
  if (!providerKey) return null;
  const iconName = resolveLobeIconName(providerKey);
  return iconName ? <LobeIcon iconName={iconName} size={22} /> : null;
}

function ProviderFormModal({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: AiConfigUpdate) => void;
}) {
  const { t } = useTranslation();
  const [providerId, setProviderId] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [credential, setCredential] = useState('');
  const [requestFormat, setRequestFormat] = useState<AiProviderRequestFormat>('openai_compatible');
  const normalizedProviderId = providerId.trim().toLowerCase();
  const shortName = providerShortName(name || providerId);
  const avatarValue = avatar.trim() || shortName;
  const canSubmit =
    /^[a-z0-9][a-z0-9_-]*$/.test(normalizedProviderId) &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    baseUrl.trim().length > 0;

  if (!open) return null;

  return (
    <ModalShell
      title={t('settings.detail.aiProviders.createProviderTitle')}
      onClose={onClose}
      footer={
        <ModalActions
          pending={pending}
          canSubmit={canSubmit}
          submitLabel={t('settings.detail.aiProviders.createProvider')}
          onClose={onClose}
          onSubmit={() =>
            onSubmit({
              providers: [
                {
                  providerId: normalizedProviderId,
                  name: name.trim(),
                  shortName,
                  avatar: avatarValue,
                  description: description.trim(),
                  baseUrl: baseUrl.trim(),
                  credential: credential.trim() || undefined,
                  requestFormat,
                  category: 'global',
                  authType: 'api_key',
                  credentialMode: 'user_api_key',
                  billingMode: 'user_provider',
                  modelSyncMode: 'openai_models_endpoint',
                  enabled: true,
                  custom: true,
                },
              ],
            })
          }
        />
      }
    >
      <div className="space-y-5">
        <FormSectionTitle>{t('settings.detail.aiProviders.basicInfo')}</FormSectionTitle>
        <FormField
          title={t('settings.detail.aiProviders.providerId')}
          description={t('settings.detail.aiProviders.providerIdDesc')}
          required
        >
          <TextField
            value={providerId}
            onChange={setProviderId}
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.providerIdPlaceholder')}
          />
        </FormField>
        <FormField title={t('settings.detail.aiProviders.providerName')} required>
          <TextField
            value={name}
            onChange={setName}
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.providerNamePlaceholder')}
          />
        </FormField>
        <FormField
          title={t('settings.detail.aiProviders.providerAvatar')}
          description={t('settings.detail.aiProviders.providerAvatarDesc')}
        >
          <div className="flex items-center gap-3">
            <ProviderAvatar
              avatar={avatarValue}
              fallback={shortName}
              className="size-9 text-[11px]"
            />
            <TextField
              value={avatar}
              onChange={setAvatar}
              disabled={pending}
              maxLength={2048}
              placeholder={t('settings.detail.aiProviders.providerAvatarPlaceholder')}
            />
          </div>
        </FormField>
        <FormField title={t('settings.detail.aiProviders.providerDescription')} required>
          <DichaTextArea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.providerDescriptionPlaceholder')}
            className="min-h-20 w-full text-[12px]"
          />
        </FormField>
        <FormSectionTitle>{t('settings.detail.aiProviders.configInfo')}</FormSectionTitle>
        <FormField title={t('settings.detail.aiProviders.requestFormat')} required>
          <DichaSelect<AiProviderRequestFormat>
            value={requestFormat}
            onChange={(nextValue) => {
              const next =
                requestFormatOptions.find((option) => option.value === nextValue)?.value ??
                'openai_compatible';
              setRequestFormat(next);
            }}
            disabled={pending}
            options={requestFormatOptions}
            className="w-full text-[12px]"
          />
        </FormField>
        <FormField title={t('settings.detail.aiProviders.baseUrl')} required>
          <TextField
            value={baseUrl}
            onChange={setBaseUrl}
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.baseUrlPlaceholder')}
          />
        </FormField>
        <FormField title="API Key">
          <DichaInputPassword
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            autoComplete="off"
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.apiKeyPlaceholder')}
            className="h-9 w-full text-[12px]"
          />
        </FormField>
      </div>
    </ModalShell>
  );
}

function ModelFormModal({
  state,
  pending,
  onClose,
  onSubmit,
}: {
  state: { provider: AiProvider; model?: AiModel } | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (body: AiConfigUpdate) => void;
}) {
  const { t } = useTranslation();
  const model = state?.model;
  const provider = state?.provider;
  const backendManagedModel = Boolean(model && provider && !isUserOwnedModel(model, provider));
  const [modelId, setModelId] = useState(model?.name ?? '');
  const [displayName, setDisplayName] = useState(model?.displayName ?? '');
  const [avatar, setAvatar] = useState(
    model?.avatar ?? providerShortName(model?.displayName ?? model?.name ?? 'AI'),
  );
  const [contextWindow, setContextWindow] = useState(String(model?.contextWindow ?? 4096));
  const [modelType, setModelType] = useState<AiModelType>(model?.modelType ?? 'chat');
  const [capabilities, setCapabilities] = useState<AiModelCapability[]>(
    model?.capabilities ?? ['chat'],
  );
  const [extensionParameters, setExtensionParameters] = useState<AiModelExtensionParameter[]>(
    model?.extensionParameters ?? [],
  );
  const initialParameterConfig = {
    ...(model?.defaultParameterConfig ?? {}),
    ...(model?.parameterConfig ?? {}),
  };
  const [parameterDraft, setParameterDraft] = useState<AiModelParameterDraft>(() =>
    createAiModelParameterDraft(
      initialParameterConfig,
      modelParameterControlsForExtensions(model?.extensionParameters ?? []),
    ),
  );
  const parameterControls = useMemo(
    () => modelParameterControlsForExtensions(extensionParameters),
    [extensionParameters],
  );
  const defaultParameterConfig = model?.defaultParameterConfig ?? {};
  const parsedContextWindow = Number(contextWindow);
  const contextWindowInvalid =
    !Number.isFinite(parsedContextWindow) ||
    !Number.isInteger(parsedContextWindow) ||
    parsedContextWindow <= 0;
  const canSubmit =
    Boolean(provider) &&
    !backendManagedModel &&
    modelId.trim().length > 0 &&
    displayName.trim().length > 0 &&
    capabilities.length > 0 &&
    !contextWindowInvalid;

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
        initialParameterConfig,
        modelParameterControlsForExtensions(parameters),
      ),
      ...current,
    }));
  };

  if (!state || !provider) return null;

  return (
    <ModalShell
      title={
        model
          ? t('settings.detail.aiProviders.editModelTitle', { name: model.displayName })
          : t('settings.detail.aiProviders.createModelTitle', { name: provider.name })
      }
      onClose={onClose}
      footer={
        <ModalActions
          pending={pending}
          canSubmit={canSubmit}
          submitLabel={t('settings.detail.aiProviders.saveModelConfig')}
          onClose={onClose}
          onSubmit={() => {
            const parsedParameterConfig = buildAiModelParameterConfig(
              parameterDraft,
              parameterControls,
            );
            if (parsedParameterConfig.error) {
              toast.error(parsedParameterConfig.error);
              return;
            }
            onSubmit({
              models: [
                model
                  ? {
                      modelId: model.id,
                      displayName: displayName.trim(),
                      avatar: avatar.trim() || providerShortName(displayName || modelId || 'AI'),
                      contextWindow: parsedContextWindow,
                      modelType,
                      extensionParameters,
                      capabilities,
                      parameterConfig: parsedParameterConfig.config,
                    }
                  : {
                      modelId: `${provider.id}:${modelId.trim()}`,
                      providerId: provider.id,
                      name: modelId.trim(),
                      displayName: displayName.trim(),
                      avatar: avatar.trim() || providerShortName(displayName || modelId || 'AI'),
                      contextWindow: parsedContextWindow,
                      modelType,
                      extensionParameters,
                      capabilities,
                      enabled: true,
                      parameterConfig: parsedParameterConfig.config,
                      custom: true,
                    },
              ],
            });
          }}
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-[170px_minmax(0,1fr)]">
        <ConfigLabel
          title={t('settings.detail.aiProviders.modelId')}
          description={t('settings.detail.aiProviders.modelIdDesc')}
          required
        />
        {model ? (
          <ReadOnlyField value={model.name} />
        ) : (
          <TextField
            value={modelId}
            onChange={setModelId}
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.modelIdPlaceholder')}
          />
        )}

        <ConfigLabel title={t('settings.detail.aiProviders.modelDisplayName')} required />
        <TextField
          value={displayName}
          onChange={setDisplayName}
          disabled={pending || backendManagedModel}
        />

        <ConfigLabel
          title={t('settings.detail.aiProviders.modelAvatar')}
          description={t('settings.detail.aiProviders.modelAvatarDesc')}
        />
        <div className="flex items-center gap-3">
          {model ? (
            <ModelAvatar model={{ ...model, avatar: avatar.trim() || model.avatar }} />
          ) : provider ? (
            <ProviderAvatar
              avatar={provider.avatar ?? provider.shortName}
              fallback={provider.shortName}
              provider={provider}
              className="size-9 text-[11px]"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-chip-mist text-[11px] font-semibold text-mist">
              {avatar.trim() || providerShortName(displayName || modelId || 'AI')}
            </span>
          )}
          <TextField
            value={avatar}
            onChange={setAvatar}
            disabled={pending || backendManagedModel}
            maxLength={12}
            placeholder={t('settings.detail.aiProviders.modelAvatarPlaceholder')}
          />
        </div>

        <ConfigLabel
          title={t('settings.detail.aiProviders.contextWindow')}
          description={t('settings.detail.aiProviders.contextWindowDesc')}
        />
        <ContextWindowControl
          value={contextWindow}
          invalid={contextWindowInvalid}
          disabled={pending || backendManagedModel}
          errorText={t('settings.detail.aiProviders.contextWindowInvalid')}
          onChange={setContextWindow}
        />

        <ConfigLabel
          title={t('settings.detail.aiProviders.extensionParameters')}
          description={t('settings.detail.aiProviders.extensionParametersDesc')}
        />
        <ExtensionParameterPicker
          value={extensionParameters}
          onChange={updateExtensionParameters}
          disabled={pending || backendManagedModel}
        />

        {modelCapabilityOptions.map((capability) => (
          <CapabilityToggleRow
            key={capability}
            capability={capability}
            selected={capabilities.includes(capability)}
            onToggle={() => toggleCapability(capability)}
            disabled={pending || backendManagedModel}
          />
        ))}

        <ConfigLabel
          title={t('settings.detail.aiProviders.modelType')}
          description={t('settings.detail.aiProviders.modelTypeDesc')}
        />
        <DichaSelect<AiModelType>
          value={modelType}
          onChange={(nextValue) => {
            if (typeof nextValue === 'string') setModelType(nextValue as AiModelType);
          }}
          disabled={pending || backendManagedModel}
          options={modelTypeOptions.map((type) => ({ label: type, value: type }))}
          className="w-full text-[12px]"
        />

        <ConfigLabel
          title={t('settings.detail.aiProviders.defaultParameterConfig')}
          description={t('settings.detail.aiProviders.defaultParameterConfigDesc')}
        />
        <ParameterConfigSummary
          config={defaultParameterConfig}
          emptyText={t('settings.detail.aiProviders.defaultParameterConfigEmpty')}
        />

        <ConfigLabel
          title={t('settings.detail.aiProviders.parameterConfig')}
          description={t('settings.detail.aiProviders.parameterConfigDesc')}
        />
        <ModelParameterConfigFields
          controls={parameterControls}
          draft={parameterDraft}
          onChange={setParameterDraft}
          disabled={pending}
        />
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      destroyOnHidden
      enableResponsive
      footer={footer}
      open
      title={title}
      width={760}
      className="dicha-ai-config-modal"
      height="min(760px, calc(100dvh - 72px))"
      paddings={{ desktop: 20, mobile: 16 }}
      onCancel={onClose}
    >
      {children}
    </Modal>
  );
}

function ModalActions({
  pending,
  canSubmit,
  submitLabel,
  onClose,
  onSubmit,
}: {
  pending: boolean;
  canSubmit: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md border border-hairline bg-surface px-4 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t('settings.detail.aiProviders.cancel')}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || !canSubmit}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-[var(--sidebar-bg)] px-4 text-[12px] font-medium text-sidebar-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save size={14} />
        {submitLabel}
      </button>
    </div>
  );
}

function FormSectionTitle({ children }: { children: string }) {
  return <p className="text-[12px] font-semibold text-ink-faint">{children}</p>;
}

function FormField({
  title,
  description,
  required = false,
  children,
}: {
  title: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink">
        {required ? <span className="text-pink">* </span> : null}
        {title}
      </span>
      {description ? (
        <span className="mb-2 mt-1 block text-[11px] leading-relaxed text-ink-faint">
          {description}
        </span>
      ) : (
        <span className="mb-2 block" />
      )}
      {children}
    </label>
  );
}

function CapabilityToggleRow({
  capability,
  selected,
  onToggle,
  disabled,
}: {
  capability: ConfigurableModelCapability;
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <ConfigLabel
        title={t(`settings.aiModelCapabilityConfig.${capability}.title`)}
        description={t(`settings.aiModelCapabilityConfig.${capability}.description`)}
      />
      <SettingsSwitch
        checked={selected}
        onChange={onToggle}
        label={t(`settings.aiModelCapabilityConfig.${capability}.title`)}
        disabled={disabled}
      />
    </>
  );
}

function ConfigLabel({
  title,
  description,
  required = false,
}: {
  title: string;
  description?: string;
  required?: boolean;
}) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">
        {required ? <span className="text-pink">* </span> : null}
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{description}</p>
      ) : null}
    </div>
  );
}

function ReadOnlyField({ value }: { value: string }) {
  return (
    <div className="flex min-h-9 items-center rounded-md border border-hairline bg-canvas px-3 text-[12px] text-ink-faint">
      {value}
    </div>
  );
}

function TextField({
  value,
  onChange,
  inputMode,
  disabled = false,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  inputMode?: 'numeric';
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <DichaInput
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode={inputMode}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      className="h-9 w-full text-[12px]"
    />
  );
}

function ContextWindowControl({
  value,
  invalid,
  disabled,
  errorText,
  onChange,
}: {
  value: string;
  invalid: boolean;
  disabled: boolean;
  errorText: string;
  onChange: (value: string) => void;
}) {
  const numericValue = Number(value);
  const sliderValue =
    Number.isFinite(numericValue) && numericValue > 0
      ? nearestContextWindowScaleIndex(numericValue)
      : 0;

  return (
    <div className="dicha-context-window-control">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px] sm:items-start">
        <Slider
          min={0}
          max={contextWindowScale.length - 1}
          step={1}
          marks={contextWindowMarks}
          value={sliderValue}
          disabled={disabled}
          tooltip={{ formatter: (position) => formatContextWindowPreset(contextWindowForPosition(position)) }}
          className="dicha-context-window-slider"
          onChange={(position) => onChange(String(contextWindowForPosition(position)))}
        />
        <DichaInputNumber
          value={Number.isFinite(numericValue) ? numericValue : undefined}
          min={1}
          step={1000}
          controls={false}
          changeOnWheel={false}
          disabled={disabled}
          className="h-9 w-full text-[12px]"
          onChange={(nextValue) => onChange(nextValue == null ? '' : String(nextValue))}
        />
      </div>
      {invalid ? <p className="mt-2 text-[11px] text-pink">{errorText}</p> : null}
    </div>
  );
}

function ExtensionParameterPicker({
  value,
  onChange,
  disabled,
}: {
  value: AiModelExtensionParameter[];
  onChange: (value: AiModelExtensionParameter[]) => void;
  disabled: boolean;
}) {
  const selected = new Set(value);
  const available = extensionParameterOptions.filter((parameter) => !selected.has(parameter));
  const options = useMemo<SelectOptions<AiModelExtensionParameter>>(
    () =>
      available.map((parameter) => {
        const definition = aiModelExtensionParameterDefinitionByKey.get(parameter);
        return {
          label: definition?.label ?? parameter,
          value: parameter,
        };
      }),
    [available],
  );
  return (
    <div className="space-y-2">
      <DichaSelect<AiModelExtensionParameter>
        value={null}
        disabled={disabled || available.length === 0}
        placeholder="添加扩展参数"
        options={options}
        onChange={(next) => {
          if (typeof next !== 'string') return;
          onChange([...value, next]);
        }}
        className="w-full text-[12px]"
      />
      {value.length > 0 ? (
        <div className="grid gap-2">
          {value.map((parameter) => {
            const definition = aiModelExtensionParameterDefinitionByKey.get(parameter);
            return (
              <DichaTooltip
                key={parameter}
                className="max-w-80 rounded-md border border-hairline bg-surface px-3 py-2 text-[11px] leading-5 text-ink shadow-float"
                title={definition?.hint ?? parameter}
              >
                <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink">
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
                    className="grid size-7 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="移除扩展参数"
                  >
                    <X size={13} />
                  </button>
                </div>
              </DichaTooltip>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-hairline bg-canvas px-3 py-2 text-[12px] text-ink-faint">
          未启用扩展参数
        </div>
      )}
    </div>
  );
}

function ModelParameterConfigFields({
  controls,
  draft,
  onChange,
  disabled,
}: {
  controls: readonly AiModelParameterControlDefinition[];
  draft: AiModelParameterDraft;
  onChange: (value: AiModelParameterDraft) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      {controls.map((control) => (
        <div
          key={control.key}
          className="grid gap-2 rounded-md border border-hairline bg-surface-alt p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-[12px] font-semibold text-ink">{control.label}</p>
              <span className="rounded border border-hairline bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint">
                {control.key}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{control.description}</p>
          </div>
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
      <SettingsSwitch
        checked={value === true}
        onChange={() => onChange(value !== true)}
        label={control.label}
        disabled={disabled}
      />
    );
  }

  if (control.kind === 'select') {
    return (
      <DichaSelect<string>
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        options={[
          { label: '沿用默认', value: '' },
          ...(control.options?.map((option) => ({
            label: option.label,
            value: option.value,
          })) ?? []),
        ]}
        onChange={(nextValue) => onChange(typeof nextValue === 'string' ? nextValue : '')}
        className="w-full text-[12px]"
      />
    );
  }

  if (control.kind === 'number') {
    return (
      <ParameterNumberControlInput
        control={control}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  return null;
}

function ParameterNumberControlInput({
  control,
  value,
  disabled,
  onChange,
}: {
  control: AiModelParameterControlDefinition;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const numericValue = Number(value);
  const hasNumericValue = value !== '' && Number.isFinite(numericValue);
  const hasSliderRange =
    typeof control.min === 'number' && typeof control.max === 'number' && control.max > control.min;
  const step = control.step ?? 1;

  if (hasSliderRange) {
    return (
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px] sm:items-center">
        <Slider
          min={control.min}
          max={control.max}
          step={step}
          value={hasNumericValue ? numericValue : control.min}
          disabled={disabled}
          tooltip={{ open: false }}
          className="dicha-parameter-slider"
          onChange={(nextValue) => onChange(String(nextValue))}
        />
        <DichaInputNumber
          value={hasNumericValue ? numericValue : undefined}
          min={control.min}
          max={control.max}
          step={step}
          controls={false}
          changeOnWheel={false}
          disabled={disabled}
          placeholder={control.placeholder}
          className="h-9 w-full text-[12px]"
          onChange={(nextValue) => onChange(nextValue == null ? '' : String(nextValue))}
        />
      </div>
    );
  }

  return (
    <DichaInputNumber
      value={hasNumericValue ? numericValue : undefined}
      min={control.min}
      max={control.max}
      step={step}
      controls={false}
      changeOnWheel={false}
      disabled={disabled}
      placeholder={control.placeholder}
      className="h-9 w-full text-[12px]"
      onChange={(nextValue) => onChange(nextValue == null ? '' : String(nextValue))}
    />
  );
}

function ParameterConfigSummary({
  config,
  emptyText,
}: {
  config: Record<string, unknown>;
  emptyText: string;
}) {
  const entries = Object.entries(config);
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-hairline bg-canvas px-3 py-2 text-[12px] text-ink-faint">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5 rounded-md border border-hairline bg-canvas p-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="rounded border border-hairline bg-surface px-2 py-1 text-[11px] text-ink-soft"
        >
          {key}: {String(value)}
        </span>
      ))}
    </div>
  );
}

function modelParameterControlsForExtensions(
  extensions: readonly AiModelExtensionParameter[],
): AiModelParameterControlDefinition[] {
  const controls: AiModelParameterControlDefinition[] = [...aiModelCommonParameterControls];
  extensions.forEach((extension) => {
    const control = aiModelExtensionParameterDefinitionByKey.get(extension);
    if (control) controls.push(control);
  });
  return uniqueParameterControls(controls);
}

function uniqueParameterControls(
  controls: readonly AiModelParameterControlDefinition[],
): AiModelParameterControlDefinition[] {
  const seen = new Set<string>();
  return controls.filter((control) => {
    if (seen.has(control.key)) return false;
    seen.add(control.key);
    return true;
  });
}

function formatContextWindowPreset(value: number) {
  if (value === 0) return '0';
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return String(value);
}

function contextWindowForPosition(position: number | null | undefined) {
  const index = Math.round(position ?? 0);
  return contextWindowScale[Math.min(Math.max(index, 0), contextWindowScale.length - 1)] ?? 4000;
}

function nearestContextWindowScaleIndex(value: number) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  contextWindowScale.forEach((scaleValue, index) => {
    const distance = Math.abs(Math.log(value) - Math.log(scaleValue));
    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });
  return nearestIndex;
}

function compareProviderModels(left: AiModel, right: AiModel, sortMode: ModelListSortMode) {
  const enabledOrder = compareModelsByEnabled(left, right);
  if (enabledOrder !== 0) return enabledOrder;
  switch (sortMode) {
    case 'name_asc':
      return left.displayName.localeCompare(right.displayName, 'zh-Hans');
    case 'name_desc':
      return right.displayName.localeCompare(left.displayName, 'zh-Hans');
    case 'context_desc':
      return (right.contextWindow ?? 0) - (left.contextWindow ?? 0);
    case 'capabilities_desc':
      return right.capabilities.length - left.capabilities.length;
    case 'release_desc':
      return releaseRank(right) - releaseRank(left);
    case 'default':
      return 0;
  }
}

function releaseRank(model: AiModel) {
  if (!model.releasedAt) return 0;
  const timestamp = Date.parse(model.releasedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function modelCompactMetadata(
  model: AiModel,
  labels: { maxOutput: (value: string) => string; releasedAt: (value: string) => string },
) {
  const metadata: string[] = [];
  if (model.releasedAt) {
    metadata.push(labels.releasedAt(model.releasedAt));
  }
  if (model.maxOutput) {
    metadata.push(labels.maxOutput(formatContextWindowPreset(model.maxOutput)));
  }
  const priceHint = usefulPriceHint(model.priceHint);
  if (priceHint) metadata.push(priceHint);
  return metadata.slice(0, 3);
}

function usefulPriceHint(value: string) {
  const normalized = value.trim();
  if (!normalized) return '';
  if (normalized.includes('元数据')) return '';
  if (normalized === 'Dicha AI 模型' || normalized === '自定义模型') return '';
  return normalized;
}

function providerTagLabels(models: AiModel[]) {
  const tags = new Set<string>();
  models.forEach((model) => {
    tags.add(model.modelType.toUpperCase());
    model.capabilities.forEach((capability) =>
      tags.add(capability.replace('_', ' ').toUpperCase()),
    );
  });
  return Array.from(tags).slice(0, 5);
}

function providerShortName(value: string) {
  const letters = value
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (letters || value.slice(0, 2).toUpperCase()).slice(0, 6);
}

function isImageUrl(value: string) {
  if (value.startsWith('/assets/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-[11px] font-semibold tracking-wider text-ink-faint">{children}</h2>
  );
}

function EmptyProvidersPanel({ onAddProvider }: { onAddProvider: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-hairline bg-surface px-4 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-hairline bg-chip-mist text-mist">
            <Server size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">
              {t('settings.detail.aiProviders.emptyProvidersTitle')}
            </p>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-faint">
              {t('settings.detail.aiProviders.emptyProvidersDesc')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddProvider}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-hairline bg-[var(--sidebar-bg)] px-3 text-[12px] font-medium text-sidebar-ink"
        >
          <Plus size={14} />
          {t('settings.detail.aiProviders.addProvider')}
        </button>
      </div>
    </div>
  );
}

function LoadingPanel() {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-hairline bg-surface px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-chip-mist text-mist">
          <CircleDashed size={16} />
        </span>
        <div>
          <p className="text-[14px] font-medium text-ink">
            {t('settings.detail.aiCommon.loading')}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {t('settings.detail.aiCommon.loadingDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}

function useAiConfigMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAiConfig,
    onSuccess: (catalog) => {
      queryClient.setQueryData(aiCatalogQueryOptions().queryKey, catalog);
      toast.success(t('settings.detail.aiCommon.saveSuccess'));
    },
    onError: () => {
      toast.error(t('settings.detail.aiCommon.saveFailed'));
    },
  });
}

function useAiProviderSyncMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncAiProviderModels,
    onSuccess: ({ catalog, syncedCount }) => {
      queryClient.setQueryData(aiCatalogQueryOptions().queryKey, catalog);
      toast.success(t('settings.detail.aiProviders.syncSuccess', { count: syncedCount }));
    },
    onError: () => {
      toast.error(t('settings.detail.aiProviders.syncFailed'));
    },
  });
}

function useAiProviderCheckMutation() {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: checkAiProviderConnection,
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(t('settings.detail.aiProviders.checkSuccess'));
      } else {
        toast.error(t('settings.detail.aiProviders.checkFailed'));
      }
    },
    onError: () => {
      toast.error(t('settings.detail.aiProviders.checkFailed'));
    },
  });
}

function assignmentUpdate({
  catalog,
  useCase,
  primaryModelId,
  fallbackModelIds,
}: {
  catalog: AiGatewayCatalog;
  useCase: AiModelUseCase;
  primaryModelId: string;
  fallbackModelIds?: string[];
}): AiAssignmentUpdate {
  const current = catalog.assignments.find((assignment) => assignment.useCase === useCase);
  return {
    useCase,
    primaryModelId,
    fallbackModelIds:
      fallbackModelIds ??
      current?.fallbackModelIds.filter((modelId) => modelId !== primaryModelId) ??
      [],
  };
}

function CapabilityIconRail({ capabilities }: { capabilities: AiModelCapability[] }) {
  const { t } = useTranslation();
  const visibleCapabilities = capabilities.slice(0, 5);
  const hiddenCapabilityCount = Math.max(0, capabilities.length - visibleCapabilities.length);
  if (capabilities.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {visibleCapabilities.map((capability) => {
        const Icon = capabilityIcon[capability];
        const label = t(`settings.aiCapabilities.${capability}`);
        return (
          <DichaTooltip key={capability} title={label}>
            <span
              className="grid size-6 place-items-center rounded-md bg-surface-alt text-ink-faint"
              aria-label={label}
            >
              <Icon size={13} />
            </span>
          </DichaTooltip>
        );
      })}
      {hiddenCapabilityCount > 0 ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-md bg-surface-alt px-1.5 text-[10px] font-medium text-ink-faint">
          +{hiddenCapabilityCount}
        </span>
      ) : null}
    </span>
  );
}

function StatusDot({ tint, label }: { tint: SettingsTint; label: string }) {
  const tintClass = {
    peach: 'bg-[var(--accent-peach)]',
    lavender: 'bg-[var(--accent-lavender)]',
    sage: 'bg-[var(--accent-sage)]',
    mist: 'bg-[var(--accent-mist)]',
    pink: 'bg-[var(--accent-pink)]',
  } satisfies Record<SettingsTint, string>;

  return (
    <DichaTooltip title={label}>
      <span className={`size-2.5 rounded-full ${tintClass[tint]}`} aria-label={label} role="img" />
    </DichaTooltip>
  );
}

function StatusPill({
  icon: Icon,
  tint,
  label,
}: {
  icon: LucideIcon;
  tint: SettingsTint;
  label: string;
}) {
  const tintClass = {
    peach: 'bg-chip-peach text-peach',
    lavender: 'bg-chip-lavender text-lavender',
    sage: 'bg-chip-sage text-sage',
    mist: 'bg-chip-mist text-mist',
    pink: 'bg-chip-pink text-pink',
  } satisfies Record<SettingsTint, string>;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-[11px] font-medium ${tintClass[tint]}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
