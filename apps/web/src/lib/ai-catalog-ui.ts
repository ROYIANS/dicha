import type { AiModel, AiProvider } from '@dicha/shared';

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

export function compareProvidersByEnabled(left: AiProvider, right: AiProvider) {
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

function isProviderEnabled(provider: AiProvider) {
  return provider.status === 'enabled' || provider.status === 'needs_config';
}
