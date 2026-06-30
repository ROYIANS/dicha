import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  CircleDashed,
  KeyRound,
  Layers3,
  Server,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type {
  AiAvailabilityState,
  AiGatewayCatalog,
  AiModel,
  AiModelCapability,
  AiModelUseCase,
  AiProviderStatus,
} from '@dicha/shared';
import { aiCatalogQueryOptions } from '@/api/ai';
import { ModelSelect } from '@/components/ModelSelect';
import {
  SettingsDetailShell,
  SettingsPanel,
  SettingsSummaryCard,
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
              <ProviderCard key={provider.id} catalog={catalog} providerId={provider.id} />
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
            value={t('settings.values.soon')}
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

  const assignmentRows = useMemo(() => {
    if (!catalog) return [];
    return catalog.assignments.map((assignment) => ({
      ...assignment,
      selectedModelId: selectedByUseCase[assignment.useCase] ?? assignment.primaryModelId,
    }));
  }, [catalog, selectedByUseCase]);

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
                    <ModelSelect
                      catalog={catalog}
                      value={assignment.selectedModelId}
                      onChange={(value) =>
                        setSelectedByUseCase((current) => ({
                          ...current,
                          [assignment.useCase]: value,
                        }))
                      }
                      placeholder={t('settings.detail.aiModels.selectPlaceholder')}
                      unavailableLabel={t('settings.detail.aiModels.selectedUnavailable')}
                      emptyLabel={t('settings.detail.aiModels.emptyModels')}
                    />
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
              <ModelCard key={model.id} model={model} catalog={catalog} />
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

function ProviderCard({ catalog, providerId }: { catalog: AiGatewayCatalog; providerId: string }) {
  const { t } = useTranslation();
  const provider = catalog.providers.find((item) => item.id === providerId);
  if (!provider) return null;

  const modelCount = catalog.models.filter((model) => model.providerId === provider.id).length;
  const StatusIcon = provider.status === 'enabled' ? CheckCircle2 : Activity;

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
        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
          <StatusPill
            icon={StatusIcon}
            tint={providerStatusTone[provider.status]}
            label={t(`settings.aiProviderStatus.${provider.status}`)}
          />
          <span className="text-[11px] text-ink-faint">
            {t(`settings.aiCredentialState.${provider.credentialState}`)}
          </span>
        </span>
      }
    />
  );
}

function ModelCard({ model, catalog }: { model: AiModel; catalog: AiGatewayCatalog }) {
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
        <span className="flex shrink-0 flex-col items-end gap-1 text-right">
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
      }
    />
  );
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
