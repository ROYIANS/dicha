import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  Layers3,
  Save,
  Server,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type {
  AiAssignmentUpdate,
  AiAvailabilityState,
  AiConfigUpdate,
  AiGatewayCatalog,
  AiModel,
  AiModelCapability,
  AiModelUseCase,
  AiProvider,
  AiProviderStatus,
} from '@dicha/shared';
import { aiCatalogQueryOptions, updateAiConfig } from '@/api/ai';
import { ModelSelect } from '@/components/ModelSelect';
import {
  SettingsDetailShell,
  SettingsPanel,
  SettingsSummaryCard,
  SettingsSwitch,
  SettingsValueRow,
} from '@/components/SettingsScaffold';
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

export function AiProvidersSettingsPage() {
  const { t } = useTranslation();
  const catalogQuery = useQuery(aiCatalogQueryOptions());
  const catalog = catalogQuery.data;
  const updateConfig = useAiConfigMutation();

  return (
    <SettingsDetailShell
      title={t('settings.detail.aiProviders.title')}
      subtitle={t('settings.detail.aiProviders.subtitle')}
      summary={
        <SettingsSummaryCard
          icon={Server}
          tint="mist"
          title={t('settings.detail.aiProviders.summaryTitle')}
          subtitle={t('settings.detail.aiProviders.summarySubtitle')}
        />
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <SettingsPanel title={t('settings.detail.aiProviders.panelProviders')}>
          {catalog ? (
            catalog.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                catalog={catalog}
                provider={provider}
                onUpdate={(body) => updateConfig.mutate(body)}
                pending={updateConfig.isPending}
              />
            ))
          ) : (
            <SettingsValueRow
              icon={CircleDashed}
              tint="mist"
              label={t('settings.detail.aiCommon.loading')}
              description={t('settings.detail.aiCommon.loadingDesc')}
            />
          )}
        </SettingsPanel>
        <SettingsPanel
          title={t('settings.detail.aiProviders.panelCredential')}
          footer={t('settings.detail.aiProviders.footer')}
        >
          <SettingsValueRow
            icon={KeyRound}
            tint="peach"
            label={t('settings.detail.aiProviders.apiKey')}
            description={t('settings.detail.aiProviders.apiKeyDesc')}
            value={t('settings.detail.aiProviders.apiKeyValue')}
          />
        </SettingsPanel>
      </div>
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
    return catalog.assignments.map((assignment) => ({
      ...assignment,
      selectedModelId: selectedByUseCase[assignment.useCase] ?? assignment.primaryModelId,
      selectedFallbackModelId:
        fallbackByUseCase[assignment.useCase] ?? assignment.fallbackModelIds[0] ?? '',
    }));
  }, [catalog, fallbackByUseCase, selectedByUseCase]);

  return (
    <SettingsDetailShell
      title={t('settings.detail.aiModels.title')}
      subtitle={t('settings.detail.aiModels.subtitle')}
      summary={
        <SettingsSummaryCard
          icon={Bot}
          tint="lavender"
          title={t('settings.detail.aiModels.summaryTitle')}
          subtitle={t('settings.detail.aiModels.summarySubtitle')}
        />
      }
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
                <SettingsValueRow
                  key={assignment.useCase}
                  icon={Icon}
                  tint="lavender"
                  label={t(`settings.aiUseCases.${assignment.useCase}`)}
                  description={t('settings.detail.aiModels.assignmentDesc', {
                    count: assignment.fallbackModelIds.length,
                  })}
                  action={
                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <ModelSelect
                        catalog={catalog}
                        value={assignment.selectedModelId}
                        onChange={(value) => {
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
                              }),
                            ],
                          });
                        }}
                        disabled={updateConfig.isPending}
                        placeholder={t('settings.detail.aiModels.selectPlaceholder')}
                        unavailableLabel={t('settings.detail.aiModels.selectedUnavailable')}
                        emptyLabel={t('settings.detail.aiModels.emptyModels')}
                      />
                      <ModelSelect
                        catalog={catalog}
                        value={assignment.selectedFallbackModelId}
                        onChange={(value) => {
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
                                  current: assignment.fallbackModelIds,
                                  nextFirst: value,
                                  primaryModelId: assignment.selectedModelId,
                                }),
                              }),
                            ],
                          });
                        }}
                        disabled={updateConfig.isPending}
                        placeholder={t('settings.detail.aiModels.fallbackPlaceholder')}
                        unavailableLabel={t('settings.detail.aiModels.selectedUnavailable')}
                        emptyLabel={t('settings.detail.aiModels.emptyModels')}
                        allowEmpty
                      />
                    </span>
                  }
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

        <SettingsPanel title={t('settings.detail.aiModels.panelModels')}>
          {catalog ? (
            catalog.models.map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                catalog={catalog}
                onUpdate={(body) => updateConfig.mutate(body)}
                pending={updateConfig.isPending}
              />
            ))
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
  pending,
}: {
  catalog: AiGatewayCatalog;
  provider: AiProvider;
  onUpdate: (body: AiConfigUpdate) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [credential, setCredential] = useState('');

  const modelCount = catalog.models.filter((model) => model.providerId === provider.id).length;
  const StatusIcon = provider.status === 'enabled' ? CheckCircle2 : Activity;
  const isEnabled = provider.status === 'enabled' || provider.status === 'needs_config';

  return (
    <SettingsValueRow
      icon={Server}
      tint={providerStatusTone[provider.status]}
      label={provider.name}
      description={
        <span className="space-y-1">
          <span className="block">{provider.description}</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
            <span>{provider.baseUrl}</span>
            <span>
              {t('settings.detail.aiProviders.modelCount', {
                count: modelCount,
              })}
            </span>
          </span>
        </span>
      }
      action={
        <span className="flex shrink-0 flex-col items-end gap-2 text-right">
          <span className="flex items-center gap-2">
            <StatusPill
              icon={StatusIcon}
              tint={providerStatusTone[provider.status]}
              label={t(`settings.aiProviderStatus.${provider.status}`)}
            />
            <SettingsSwitch
              checked={isEnabled}
              onChange={(enabled) =>
                onUpdate({ providers: [{ providerId: provider.id, enabled }] })
              }
              label={t('settings.detail.aiProviders.toggleProvider', { name: provider.name })}
              disabled={pending}
            />
          </span>
          <span className="flex max-w-[min(54vw,300px)] items-center gap-1.5">
            <input
              value={credential}
              onChange={(event) => setCredential(event.target.value)}
              type="password"
              autoComplete="off"
              placeholder={t(`settings.aiCredentialState.${provider.credentialState}`)}
              className="h-8 min-w-0 rounded-md border border-hairline bg-surface-alt px-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist"
            />
            <button
              type="button"
              disabled={pending || credential.trim().length === 0}
              onClick={() => {
                onUpdate({
                  providers: [{ providerId: provider.id, enabled: true, credential }],
                });
                setCredential('');
              }}
              className="grid size-8 shrink-0 place-items-center rounded-md border border-hairline bg-surface-alt text-ink-soft transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t('settings.detail.aiProviders.saveCredential', { name: provider.name })}
              title={t('settings.detail.aiProviders.saveCredential', { name: provider.name })}
            >
              <Save size={14} />
            </button>
          </span>
        </span>
      }
    />
  );
}

function ModelCard({
  model,
  catalog,
  onUpdate,
  pending,
}: {
  model: AiModel;
  catalog: AiGatewayCatalog;
  onUpdate: (body: AiConfigUpdate) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const provider = catalog.providers.find((item) => item.id === model.providerId);
  const assignedUseCases = catalog.assignments
    .filter(
      (assignment) =>
        assignment.primaryModelId === model.id || assignment.fallbackModelIds.includes(model.id),
    )
    .map((assignment) => t(`settings.aiUseCases.${assignment.useCase}`));

  return (
    <SettingsValueRow
      icon={Bot}
      tint={availabilityTone[model.availability]}
      label={model.displayName}
      description={
        <span className="space-y-1">
          <span className="block">
            {provider?.name ?? model.providerId} · {model.contextWindow.toLocaleString()} tokens
          </span>
          <span className="flex flex-wrap gap-1.5">
            {model.capabilities.map((capability) => (
              <CapabilityChip key={capability} capability={capability} />
            ))}
          </span>
          <span className="block text-[11px] text-ink-faint">
            {assignedUseCases.length > 0
              ? assignedUseCases.join(' / ')
              : t('settings.detail.aiModels.noAssignment')}
          </span>
        </span>
      }
      action={
        <span className="flex shrink-0 items-center gap-3 text-right">
          <span className="flex flex-col items-end gap-1">
            <StatusPill
              icon={model.enabled ? CheckCircle2 : CircleDashed}
              tint={availabilityTone[model.availability]}
              label={t(`settings.aiAvailability.${model.availability}`)}
            />
            <span className="text-[11px] text-ink-faint">
              {model.lastLatencyMs
                ? t('settings.detail.aiModels.latency', { value: model.lastLatencyMs })
                : t('settings.detail.aiModels.noLatency')}
            </span>
          </span>
          <SettingsSwitch
            checked={model.enabled}
            onChange={(enabled) => onUpdate({ models: [{ modelId: model.id, enabled }] })}
            label={t('settings.detail.aiModels.toggleModel', { name: model.displayName })}
            disabled={pending}
          />
        </span>
      }
    />
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

function fallbackModelIds({
  current,
  nextFirst,
  primaryModelId,
}: {
  current: string[];
  nextFirst: string;
  primaryModelId: string;
}) {
  if (!nextFirst) {
    return current.filter((modelId) => modelId !== primaryModelId);
  }
  if (nextFirst === primaryModelId) {
    return current.filter((modelId) => modelId !== primaryModelId);
  }
  return [
    nextFirst,
    ...current.filter((modelId) => modelId !== nextFirst && modelId !== primaryModelId),
  ];
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
