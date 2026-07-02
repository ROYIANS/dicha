export type LobeModelType =
  | 'asr'
  | 'chat'
  | 'embedding'
  | 'image'
  | 'realtime'
  | 'text2music'
  | 'tts'
  | 'video';

export type LobeModelAbilities = {
  audio?: boolean;
  files?: boolean;
  functionCall?: boolean;
  imageOutput?: boolean;
  reasoning?: boolean;
  search?: boolean;
  structuredOutput?: boolean;
  video?: boolean;
  vision?: boolean;
};

export type LobePricingUnit = {
  lookup?: {
    originalPrices?: Record<string, number>;
    prices: Record<string, number>;
    pricingParams: string[];
  };
  name: string;
  originalRate?: number;
  rate?: number;
  strategy: 'fixed' | 'lookup' | 'tiered';
  tiers?: Array<{
    originalRate?: number;
    rate: number;
    upTo: number | 'infinity';
  }>;
  unit: string;
};

export type LobeModelPricing = {
  approximatePricePerImage?: number;
  approximatePricePerVideo?: number;
  currency?: 'CNY' | 'USD';
  units?: LobePricingUnit[];
};

export type LobeModelSettings = {
  disabledParams?: string[];
  extendParams?: string[];
  searchImpl?: string;
  searchProvider?: string;
} & Record<string, unknown>;

export type LobeModelBankCard = {
  abilities?: LobeModelAbilities;
  config?: Record<string, unknown>;
  contextWindowTokens?: number;
  description?: string;
  displayName?: string;
  enabled?: boolean;
  family?: string;
  generation?: string;
  id: string;
  knowledgeCutoff?: string;
  legacy?: boolean;
  maxDimension?: number;
  maxOutput?: number;
  organization?: string;
  parameters?: unknown;
  pricing?: LobeModelPricing;
  providerId: string;
  releasedAt?: string;
  resolutions?: string[];
  settings?: LobeModelSettings;
  type: LobeModelType;
  visible?: boolean;
} & Record<string, unknown>;

export type LobeProviderCard = {
  apiKeyUrl?: string;
  checkModel?: string;
  description?: string;
  disableBrowserRequest?: boolean;
  enabled?: boolean;
  id: string;
  lobeProviderId: string;
  modelList?: {
    showModelFetcher?: boolean;
  } & Record<string, unknown>;
  modelsUrl?: string;
  name: string;
  proxyUrl?:
    | {
        placeholder: string;
      }
    | false;
  settings?: {
    authType?: string;
    disableBrowserRequest?: boolean;
    proxyUrl?:
      | {
          placeholder: string;
        }
      | false;
    sdkType?: string;
    showApiKey?: boolean;
    showChecker?: boolean;
    showModelFetcher?: boolean;
  } & Record<string, unknown>;
  showApiKey?: boolean;
  showChecker?: boolean;
  url: string;
} & Record<string, unknown>;

export const lobeProviderIdByProviderId = {
  baidu_wenxin: 'wenxin',
  cloudflare_workers_ai: 'cloudflare',
  fireworks: 'fireworksai',
  lm_studio: 'lmstudio',
  siliconflow: 'siliconcloud',
  tencent_hunyuan: 'hunyuan',
  together: 'togetherai',
} as const satisfies Record<string, string>;

export const dichaProviderIdByLobeProviderId = {
  bailianCodingPlan: 'bailiancodingplan',
  baidu_wenxin: 'baidu_wenxin',
  cloudflare: 'cloudflare_workers_ai',
  fireworksai: 'fireworks',
  githubCopilot: 'githubcopilot',
  glmCodingPlan: 'glmcodingplan',
  hunyuan: 'tencent_hunyuan',
  kimiCodingPlan: 'kimicodingplan',
  lmstudio: 'lm_studio',
  minimaxCodingPlan: 'minimaxcodingplan',
  opencodeCodingPlan: 'opencodecodingplan',
  opencodeZen: 'opencodezen',
  siliconcloud: 'siliconflow',
  togetherai: 'together',
  volcengineCodingPlan: 'volcenginecodingplan',
  wenxin: 'baidu_wenxin',
} as const satisfies Record<string, string>;

export function lobeProviderId(providerId: string): string {
  return lobeProviderIdByProviderId[providerId as keyof typeof lobeProviderIdByProviderId] ?? providerId;
}

export function dichaProviderId(lobeProviderId: string, fallbackProviderId = lobeProviderId): string {
  return (
    dichaProviderIdByLobeProviderId[lobeProviderId as keyof typeof dichaProviderIdByLobeProviderId] ??
    fallbackProviderId
  );
}
