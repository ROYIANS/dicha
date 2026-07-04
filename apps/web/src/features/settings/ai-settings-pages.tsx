import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Trash2,
  KeyRound,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Server,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ModelIcon, ProviderIcon, modelMappings } from '@lobehub/icons';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
} from '@dicha/shared';
import {
  aiCatalogQueryOptions,
  checkAiProviderConnection,
  syncAiProviderModels,
  updateAiConfig,
} from '@/api/ai';
import { ModelSelect } from '@/components/ModelSelect';
import {
  SettingsDetailShell,
  SettingsPanel,
  SettingsSwitch,
  SettingsValueRow,
} from '@/components/SettingsScaffold';
import { DotsBackdrop } from '@/components/DotsBackdrop';
import {
  compareModelsByEnabled,
  compareProvidersByEnabled,
  fallbackModelIds,
  firstAssignableModelId,
  getAssignableModelMap,
  lobeProviderKey,
} from '@/lib/ai-catalog-ui';
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

const extensionParameterOptions = [
  'gpt5_2ReasoningEffort',
  'deepseekV4ReasoningEffort',
  'enableReasoning',
  'reasoningEffort',
  'textVerbosity',
] satisfies AiModelExtensionParameter[];

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

const requestFormatOptions = [
  { value: 'openai_compatible', label: 'OpenAI-compatible Chat Completions' },
  { value: 'openai_responses', label: 'OpenAI Responses API' },
  { value: 'anthropic_messages', label: 'Anthropic Messages API' },
] satisfies Array<{ value: AiProviderRequestFormat; label: string }>;

const contextWindowPresets = [0, 4000, 8000, 16000, 32000, 64000, 200000, 400000, 1000000];

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
  const [modelModal, setModelModal] = useState<{ provider: AiProvider; model?: AiModel } | null>(null);
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
  const upstreamActionHint = !supportsUpstreamSync
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
                <h2 className="text-[18px] font-semibold leading-tight text-ink">{provider.name}</h2>
                <span className="rounded-md border border-hairline bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-ink-faint">
                  {provider.custom ? t('settings.detail.aiProviders.customProvider') : `P${provider.priority}`}
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
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
                {credentialHint}
              </p>
            </div>
            <SettingsSwitch
              checked={isEnabled}
              onChange={(enabled) =>
                onUpdate({ providers: [{ providerId: provider.id, enabled }] })
              }
              label={t('settings.detail.aiProviders.toggleProvider', { name: provider.name })}
              disabled={pending}
            />
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
                if (window.confirm(t('settings.detail.aiProviders.deleteProviderConfirm', { name: provider.name }))) {
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
          <button
            type="button"
            onClick={onAddModel}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
            title={t('settings.detail.aiProviders.addModel')}
          >
            <Plus size={14} />
            {t('settings.detail.aiProviders.addModel')}
          </button>
        </div>
        <p className="basis-full text-right text-[11px] leading-relaxed text-ink-faint">
          {upstreamActionHint}
        </p>
      </div>
      <div className={`grid transition-[grid-template-rows] duration-200 ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="min-h-0 overflow-hidden">
          <ProviderModelList
            models={providerModels}
            catalog={catalog}
            pending={pending}
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
    trimmedBaseUrl !== provider.baseUrl || trimmedAvatar !== (provider.avatar ?? provider.shortName);
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
              {requiresUserCredential ? 'API Key' : t('settings.detail.aiProviders.noApiKeyRequired')}
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
              <input
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder={t('settings.detail.aiProviders.apiKeyPlaceholder')}
                disabled={pending}
                className="h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
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
  catalog,
  pending,
  onUpdate,
  onConfigure,
}: {
  models: AiModel[];
  catalog: AiGatewayCatalog;
  pending: boolean;
  onUpdate: (body: AiConfigUpdate) => void;
  onConfigure: (model: AiModel) => void;
}) {
  const { t } = useTranslation();

  if (models.length === 0) {
    return (
      <div className="bg-canvas px-4 py-4 text-[12px] text-ink-faint">
        {t('settings.detail.aiProviders.noProviderModels')}
      </div>
    );
  }

  return (
    <div className="bg-canvas px-4 py-1">
      {models.slice().sort(compareModelsByEnabled).map((model) => (
        <div key={model.id} className="border-b border-hairline/70 last:border-b-0">
          <ProviderModelRow
            model={model}
            catalog={catalog}
            pending={pending}
            onConfigure={() => onConfigure(model)}
            onUpdate={onUpdate}
          />
        </div>
      ))}
    </div>
  );
}

function ProviderModelRow({
  model,
  catalog,
  pending,
  onConfigure,
  onUpdate,
}: {
  model: AiModel;
  catalog: AiGatewayCatalog;
  pending: boolean;
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
  const canDeleteModel = model.custom === true || model.catalogSource === 'upstream_sync';

  return (
    <div className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 gap-3">
        <ModelAvatar model={model} />
        <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-medium text-ink">{model.displayName}</span>
          <span className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint">
            {model.name}
          </span>
          {model.recommended ? (
            <span className="rounded-md border border-hairline bg-chip-sage px-1.5 py-0.5 text-[10px] font-medium text-sage">
              {t('settings.detail.aiProviders.recommended')}
            </span>
          ) : null}
          {model.contextWindow === null ? (
            <span className="rounded-md border border-hairline bg-chip-peach px-1.5 py-0.5 text-[10px] font-medium text-peach">
              {t('settings.detail.aiProviders.metadataUnknown')}
            </span>
          ) : (
            <span className="rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-[10px] text-ink-faint">
              {model.contextWindow.toLocaleString()}
            </span>
          )}
        </div>
        {model.capabilities.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {model.capabilities.map((capability) => (
              <CapabilityChip key={capability} capability={capability} />
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-ink-faint">
            {t('settings.detail.aiProviders.metadataUnknownDesc')}
          </p>
        )}
        <p className="mt-1 truncate text-[11px] text-ink-faint">
          {assignedUseCases.length > 0
            ? assignedUseCases.join(' / ')
            : t('settings.detail.aiModels.noAssignment')}
        </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {canDeleteModel ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('settings.detail.aiProviders.deleteModelConfirm', { name: model.displayName }))) {
                onUpdate({ models: [{ modelId: model.id, delete: true }] });
              }
            }}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-pink transition-colors hover:border-pink disabled:cursor-not-allowed disabled:opacity-50"
            title={t('settings.detail.aiProviders.deleteModel')}
          >
            <Trash2 size={14} />
            {t('settings.detail.aiProviders.deleteModel')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onConfigure}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-hairline bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <SlidersHorizontal size={14} />
          {t('settings.detail.aiProviders.configureModel')}
        </button>
        <StatusPill
          icon={model.enabled ? CheckCircle2 : CircleDashed}
          tint={availabilityTone[model.availability]}
          label={t(`settings.aiAvailability.${model.availability}`)}
        />
        <SettingsSwitch
          checked={model.enabled}
          onChange={(enabled) => onUpdate({ models: [{ modelId: model.id, enabled }] })}
          label={t('settings.detail.aiModels.toggleModel', { name: model.displayName })}
          disabled={pending || !hasKnownMetadata}
        />
      </div>
    </div>
  );
}

function ModelAvatar({ model }: { model: AiModel }) {
  const avatar = model.avatar ?? providerShortName(model.displayName || model.name);
  const hasModelIcon = hasLobeModelIcon(model.name);

  if (isImageUrl(avatar)) {
    return (
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-hairline bg-surface-alt">
        <img src={avatar} alt="" className="size-full object-contain p-1.5" referrerPolicy="no-referrer" />
      </span>
    );
  }

  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-mist">
      {hasModelIcon ? (
        <ModelIcon model={model.name} size={22} type="color" />
      ) : (
        <Brain size={18} strokeWidth={1.8} aria-hidden="true" />
      )}
      <span className="sr-only">{avatar}</span>
    </span>
  );
}

function hasLobeModelIcon(modelName: string) {
  const normalizedModelName = modelName.toLowerCase();
  return modelMappings.some((item) =>
    item.keywords.some((keyword) => new RegExp(keyword, 'i').test(normalizedModelName)),
  );
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
        <img src={avatar} alt="" className="size-full object-contain p-1.5" referrerPolicy="no-referrer" />
      </span>
    );
  }

  const providerKey = provider ? lobeProviderKey(provider) : undefined;
  if (providerKey) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-ink ${className}`}
      >
        <ProviderIcon provider={providerKey} size={22} type="color" />
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
            <ProviderAvatar avatar={avatarValue} fallback={shortName} className="size-9 text-[11px]" />
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
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.providerDescriptionPlaceholder')}
            className="min-h-20 w-full rounded-md border border-hairline bg-surface px-3 py-2 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormField>
        <FormSectionTitle>{t('settings.detail.aiProviders.configInfo')}</FormSectionTitle>
        <FormField title={t('settings.detail.aiProviders.requestFormat')} required>
          <select
            value={requestFormat}
            onChange={(event) => {
              const next =
                requestFormatOptions.find((option) => option.value === event.target.value)?.value ??
                'openai_compatible';
              setRequestFormat(next);
            }}
            disabled={pending}
            className="h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
          >
            {requestFormatOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
          <input
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            type="password"
            autoComplete="off"
            disabled={pending}
            placeholder={t('settings.detail.aiProviders.apiKeyPlaceholder')}
            className="h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
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
  const parsedContextWindow = Number(contextWindow);
  const contextWindowInvalid =
    !Number.isFinite(parsedContextWindow) || !Number.isInteger(parsedContextWindow) || parsedContextWindow <= 0;
  const canSubmit =
    Boolean(provider) &&
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
  const toggleExtension = (parameter: AiModelExtensionParameter) => {
    setExtensionParameters((current) =>
      current.includes(parameter)
        ? current.filter((item) => item !== parameter)
        : [...current, parameter],
    );
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
          onSubmit={() =>
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
                      custom: true,
                    },
              ],
            })
          }
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
        <TextField value={displayName} onChange={setDisplayName} disabled={pending} />

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
            disabled={pending}
            maxLength={12}
            placeholder={t('settings.detail.aiProviders.modelAvatarPlaceholder')}
          />
        </div>

        <ConfigLabel
          title={t('settings.detail.aiProviders.contextWindow')}
          description={t('settings.detail.aiProviders.contextWindowDesc')}
        />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {contextWindowPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={pending || preset === 0}
                onClick={() => setContextWindow(String(preset))}
                className={`h-7 rounded-md border px-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  parsedContextWindow === preset
                    ? 'border-mist bg-chip-mist text-mist'
                    : 'border-hairline bg-surface text-ink-soft hover:text-ink'
                }`}
              >
                {formatContextWindowPreset(preset)}
              </button>
            ))}
          </div>
          <TextField
            value={contextWindow}
            onChange={setContextWindow}
            inputMode="numeric"
            disabled={pending}
          />
          {contextWindowInvalid ? (
            <p className="text-[11px] text-pink">
              {t('settings.detail.aiProviders.contextWindowInvalid')}
            </p>
          ) : null}
        </div>

        <ConfigLabel
          title={t('settings.detail.aiProviders.extensionParameters')}
          description={t('settings.detail.aiProviders.extensionParametersDesc')}
        />
        <ToggleGrid>
          {extensionParameterOptions.map((parameter) => (
            <ToggleChip
              key={parameter}
              selected={extensionParameters.includes(parameter)}
              label={t(`settings.aiExtensionParameters.${parameter}`)}
              onClick={() => toggleExtension(parameter)}
              disabled={pending}
            />
          ))}
        </ToggleGrid>

        {modelCapabilityOptions.map((capability) => (
          <CapabilityToggleRow
            key={capability}
            capability={capability}
            selected={capabilities.includes(capability)}
            onToggle={() => toggleCapability(capability)}
            disabled={pending}
          />
        ))}

        <ConfigLabel
          title={t('settings.detail.aiProviders.modelType')}
          description={t('settings.detail.aiProviders.modelTypeDesc')}
        />
        <select
          value={modelType}
          onChange={(event) => setModelType(event.target.value as AiModelType)}
          disabled={pending}
          className="h-9 rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
        >
          {modelTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center overflow-hidden sm:items-center sm:px-4 sm:py-8">
      <DotsBackdrop visible scrim={false} className="absolute inset-0" />
      <div className="absolute inset-0 bg-sidebar-bg/50" aria-hidden />
      <section className="relative z-10 flex h-dvh w-full flex-col overflow-hidden border-0 bg-surface shadow-float sm:h-auto sm:max-h-[min(760px,calc(100dvh-72px))] sm:max-w-3xl sm:rounded-card sm:border sm:border-hairline">
        <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4">
          <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <footer className="border-t border-hairline bg-surface-alt px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {footer}
        </footer>
      </section>
    </div>,
    document.body,
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
      {description ? <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{description}</p> : null}
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
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode={inputMode}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      className="h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function ToggleGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function ToggleChip({
  selected,
  label,
  onClick,
  disabled = false,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? 'border-mist bg-chip-mist text-mist'
          : 'border-hairline bg-surface text-ink-soft hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function formatContextWindowPreset(value: number) {
  if (value === 0) return '0';
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return String(value);
}

function providerTagLabels(models: AiModel[]) {
  const tags = new Set<string>();
  models.forEach((model) => {
    tags.add(model.modelType.toUpperCase());
    model.capabilities.forEach((capability) => tags.add(capability.replace('_', ' ').toUpperCase()));
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
  return <h2 className="px-1 text-[11px] font-semibold tracking-wider text-ink-faint">{children}</h2>;
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
          <p className="text-[14px] font-medium text-ink">{t('settings.detail.aiCommon.loading')}</p>
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
      fallbackModelIds ?? current?.fallbackModelIds.filter((modelId) => modelId !== primaryModelId) ?? [],
  };
}

function CapabilityChip({ capability }: { capability: AiModelCapability }) {
  const { t } = useTranslation();
  return (
    <span className="rounded-md border border-hairline bg-surface-alt px-1.5 py-0.5 text-[11px] text-ink-faint">
      {t(`settings.aiCapabilities.${capability}`)}
    </span>
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
