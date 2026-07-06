import type { AiGatewayCatalog, AiModel, AiProvider } from '@dicha/shared';

const lobeProviderKeyByProviderId: Partial<Record<string, string>> = {
  baidu_wenxin: 'wenxin',
  cloudflare_workers_ai: 'cloudflare',
  fireworks: 'fireworksai',
  lm_studio: 'lmstudio',
  siliconflow: 'siliconcloud',
  tencent_hunyuan: 'hunyuan',
  together: 'togetherai',
};

const providerIdsWithoutLobeIcon = new Set(['dicha']);
const officialDichaProviderId = 'dicha';

export function isOfficialDichaProvider(provider: Pick<AiProvider, 'id'>) {
  return provider.id === officialDichaProviderId;
}

export function isUserManagedProvider(provider: Pick<AiProvider, 'custom' | 'id'>) {
  return provider.custom === true && !isOfficialDichaProvider(provider);
}

export function isUserOwnedModel(
  model: Pick<AiModel, 'custom' | 'providerId'>,
  provider?: Pick<AiProvider, 'custom' | 'id'>,
) {
  return model.custom === true || provider?.custom === true;
}

export function compareProvidersByEnabled(left: AiProvider, right: AiProvider) {
  const officialDelta =
    Number(isOfficialDichaProvider(right)) - Number(isOfficialDichaProvider(left));
  if (officialDelta !== 0) return officialDelta;

  const enabledDelta = Number(isProviderEnabled(right)) - Number(isProviderEnabled(left));
  if (enabledDelta !== 0) return enabledDelta;
  return left.priority - right.priority;
}

export function compareModelsByEnabled(
  left: AiModel,
  right: AiModel,
  providerPriority?: ReadonlyMap<string, number>,
) {
  const enabledDelta = Number(right.enabled) - Number(left.enabled);
  if (enabledDelta !== 0) return enabledDelta;

  const leftProviderPriority = providerPriority?.get(left.providerId) ?? Number.MAX_SAFE_INTEGER;
  const rightProviderPriority = providerPriority?.get(right.providerId) ?? Number.MAX_SAFE_INTEGER;
  const providerPriorityDelta = leftProviderPriority - rightProviderPriority;
  if (providerPriorityDelta !== 0) return providerPriorityDelta;

  const providerDelta = left.providerId.localeCompare(right.providerId);
  if (providerDelta !== 0) return providerDelta;
  return left.displayName.localeCompare(right.displayName);
}

export function lobeProviderKey(provider: Pick<AiProvider, 'custom' | 'id'>) {
  if (provider.custom) return undefined;
  if (providerIdsWithoutLobeIcon.has(provider.id)) return undefined;
  return lobeProviderKeyByProviderId[provider.id] ?? provider.id;
}

export function getAssignableModelGroups(
  catalog: Pick<AiGatewayCatalog, 'models' | 'providers'>,
) {
  const providerPriority = new Map(
    catalog.providers.map((provider) => [provider.id, provider.priority] as const),
  );
  const assignableProviderIds = new Set(
    catalog.providers.filter(isProviderAssignable).map((provider) => provider.id),
  );
  const modelsByProvider = new Map<string, AiModel[]>();

  for (const model of catalog.models) {
    if (!model.enabled || !assignableProviderIds.has(model.providerId)) continue;
    const providerModels = modelsByProvider.get(model.providerId);
    if (providerModels) {
      providerModels.push(model);
    } else {
      modelsByProvider.set(model.providerId, [model]);
    }
  }

  return catalog.providers
    .filter(isProviderAssignable)
    .slice()
    .sort(compareProvidersByEnabled)
    .flatMap((provider) => {
      const models =
        modelsByProvider
          .get(provider.id)
          ?.slice()
          .sort((left, right) => compareModelsByEnabled(left, right, providerPriority)) ?? [];

      return models.length > 0 ? [{ provider, models }] : [];
    });
}

export function getAssignableModelMap(
  catalog: Pick<AiGatewayCatalog, 'models' | 'providers'>,
) {
  const models = new Map<string, AiModel>();
  for (const group of getAssignableModelGroups(catalog)) {
    for (const model of group.models) {
      models.set(model.id, model);
    }
  }
  return models;
}

export function firstAssignableModelId(
  modelIds: string[],
  assignableModels: ReadonlyMap<string, AiModel>,
  excludedModelId?: string,
) {
  return modelIds.find((modelId) => modelId !== excludedModelId && assignableModels.has(modelId)) ?? '';
}

export function fallbackModelIds({
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

function isProviderEnabled(provider: AiProvider) {
  return provider.status === 'enabled' || provider.status === 'needs_config';
}

function isProviderAssignable(provider: AiProvider) {
  return provider.status === 'enabled';
}
