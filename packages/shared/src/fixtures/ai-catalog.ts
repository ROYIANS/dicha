import type {
  AiGatewayCatalog,
  AiModel,
  AiModelExtensionParameter,
  AiProviderCategory,
  AiProvider,
} from '../contracts/ai.contract';
import { lobeModelBankCards } from './lobehub-model-bank-data';
import { lobeProviderCards } from './lobehub-provider-data';
import {
  dichaProviderId,
  type LobeModelBankCard,
  type LobeProviderCard,
} from './lobehub-model-bank';

type ProviderTemplate = AiProvider;
type ModelTemplateInput = Omit<
  AiModel,
  'availability' | 'catalogSource' | 'custom' | 'enabled' | 'lastLatencyMs' | 'recommended'
> &
  Partial<
    Pick<AiModel, 'availability' | 'catalogSource' | 'custom' | 'enabled' | 'lastLatencyMs' | 'recommended'>
  >;

const generatedAt = '2026-07-02T00:00:00.000Z';

const provider = (template: ProviderTemplate): ProviderTemplate => ({
  requestFormat: 'openai_compatible',
  custom: false,
  ...template,
});

const model = (template: ModelTemplateInput): AiModel => ({
  enabled: false,
  recommended: false,
  availability: 'config_required',
  lastLatencyMs: null,
  catalogSource: 'static_model_bank',
  custom: false,
  ...template,
});

const curatedProviderTemplates: ProviderTemplate[] = [
  provider({
    id: 'dicha',
    name: 'Dicha AI',
    shortName: 'DC',
    avatar: '/assets/logo.svg',
    description: '未来官方模型通道：平台托管凭证，按 Dicha AI 积分/余额计费。',
    baseUrl: 'https://ai.dicha.local/v1',
    status: 'enabled',
    category: 'official',
    authType: 'none',
    credentialMode: 'platform_managed',
    billingMode: 'platform_credits',
    modelSyncMode: 'platform_catalog',
    credentialState: 'platform_managed',
    priority: 1,
  }),
  provider({
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OA',
    avatar: 'OA',
    description: '通用对话、结构化输出和多模态能力的主力供应商。',
    baseUrl: 'https://api.openai.com/v1',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 10,
  }),
  provider({
    id: 'anthropic',
    name: 'Anthropic',
    shortName: 'AN',
    avatar: 'AN',
    description: '长上下文、稳健写作和复杂任务规划的备用供应商。',
    baseUrl: 'https://api.anthropic.com/v1',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    requestFormat: 'anthropic_messages',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 20,
  }),
  provider({
    id: 'google',
    name: 'Google Gemini',
    shortName: 'GM',
    avatar: 'GM',
    description: '适合多模态理解、长上下文和 Google 生态模型能力。',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 30,
  }),
  provider({
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DS',
    avatar: 'DS',
    description: '适合推理、中文任务和成本敏感的模型通道。',
    baseUrl: 'https://api.deepseek.com/v1',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 40,
  }),
  provider({
    id: 'qwen',
    name: 'Qwen / Alibaba Bailian',
    shortName: 'QW',
    avatar: 'QW',
    description: '通义千问模型通道，适合中文、多模态和国内网络环境。',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 50,
  }),
  provider({
    id: 'zhipu',
    name: 'Zhipu GLM',
    shortName: 'GLM',
    avatar: 'GLM',
    description: '智谱 GLM 模型通道，覆盖中文对话、推理和工具调用场景。',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 60,
  }),
  provider({
    id: 'moonshot',
    name: 'Moonshot / Kimi',
    shortName: 'KM',
    avatar: 'KM',
    description: 'Kimi 长上下文模型通道，适合中文资料阅读和摘要。',
    baseUrl: 'https://api.moonshot.cn/v1',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 70,
  }),
  provider({
    id: 'volcengine',
    name: 'Volcengine Doubao',
    shortName: 'DB',
    avatar: 'DB',
    description: '豆包/火山方舟模型通道，适合国内应用接入和多模态任务。',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 80,
  }),
  provider({
    id: 'tencent_hunyuan',
    name: 'Tencent Hunyuan',
    shortName: 'HY',
    avatar: 'HY',
    description: '腾讯混元模型通道，适合中文业务系统和国内云生态。',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 90,
  }),
  provider({
    id: 'baidu_wenxin',
    name: 'Baidu Wenxin',
    shortName: 'WX',
    avatar: 'WX',
    description: '百度文心模型通道，适合中文生成、知识问答和国内云生态。',
    baseUrl: 'https://qianfan.baidubce.com/v2',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 100,
  }),
  provider({
    id: 'minimax',
    name: 'MiniMax',
    shortName: 'MM',
    avatar: 'MM',
    description: 'MiniMax 模型通道，适合中文对话、角色表达和多模态生成。',
    baseUrl: 'https://api.minimax.chat/v1',
    status: 'disabled',
    category: 'china',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 110,
  }),
  provider({
    id: 'siliconflow',
    name: 'SiliconFlow',
    shortName: 'SF',
    avatar: 'SF',
    description: '聚合开源和国产模型的国内友好通道，适合成本敏感场景。',
    baseUrl: 'https://api.siliconflow.cn/v1',
    status: 'disabled',
    category: 'aggregator',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 120,
  }),
  provider({
    id: 'openrouter',
    name: 'OpenRouter',
    shortName: 'OR',
    avatar: 'OR',
    description: '多供应商聚合路由，可用同一 OpenAI-compatible 接口访问多家模型。',
    baseUrl: 'https://openrouter.ai/api/v1',
    status: 'disabled',
    category: 'aggregator',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 130,
  }),
  provider({
    id: 'groq',
    name: 'Groq',
    shortName: 'GQ',
    avatar: 'GQ',
    description: '高速推理通道，适合低延迟对话和开源模型实验。',
    baseUrl: 'https://api.groq.com/openai/v1',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 140,
  }),
  provider({
    id: 'mistral',
    name: 'Mistral',
    shortName: 'MS',
    avatar: 'MS',
    description: 'Mistral 官方模型通道，适合欧洲供应商、多语言和轻量推理场景。',
    baseUrl: 'https://api.mistral.ai/v1',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 150,
  }),
  provider({
    id: 'xai',
    name: 'xAI',
    shortName: 'XA',
    avatar: 'XA',
    description: 'Grok 模型通道，适合实时信息相关的对话和通用助手场景。',
    baseUrl: 'https://api.x.ai/v1',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 160,
  }),
  provider({
    id: 'perplexity',
    name: 'Perplexity',
    shortName: 'PX',
    avatar: 'PX',
    description: '搜索增强模型通道，适合需要联网检索和来源感知的回答。',
    baseUrl: 'https://api.perplexity.ai',
    status: 'disabled',
    category: 'global',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 170,
  }),
  provider({
    id: 'together',
    name: 'Together AI',
    shortName: 'TG',
    avatar: 'TG',
    description: '开源模型托管通道，适合 Llama、Qwen、DeepSeek 等模型实验。',
    baseUrl: 'https://api.together.xyz/v1',
    status: 'disabled',
    category: 'aggregator',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 180,
  }),
  provider({
    id: 'fireworks',
    name: 'Fireworks AI',
    shortName: 'FW',
    avatar: 'FW',
    description: '高性能开源模型托管通道，适合推理、批处理和低延迟应用。',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    status: 'disabled',
    category: 'aggregator',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 190,
  }),
  provider({
    id: 'ollama',
    name: 'Ollama',
    shortName: 'OL',
    avatar: 'OL',
    description: '本地模型运行时，适合离线、私有化和轻量实验。',
    baseUrl: 'http://localhost:11434/v1',
    status: 'disabled',
    category: 'local',
    authType: 'none',
    credentialMode: 'not_required',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'not_required',
    priority: 200,
  }),
  provider({
    id: 'lm_studio',
    name: 'LM Studio',
    shortName: 'LM',
    avatar: 'LM',
    description: '本地桌面模型运行时，提供 OpenAI-compatible 本地接口。',
    baseUrl: 'http://localhost:1234/v1',
    status: 'disabled',
    category: 'local',
    authType: 'none',
    credentialMode: 'not_required',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'not_required',
    priority: 210,
  }),
  provider({
    id: 'vllm',
    name: 'vLLM',
    shortName: 'VL',
    avatar: 'VL',
    description: '自托管高吞吐推理服务，适合私有化部署和大模型服务化。',
    baseUrl: 'http://localhost:8000/v1',
    status: 'disabled',
    category: 'local',
    authType: 'bearer_token',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 220,
  }),
  provider({
    id: 'xinference',
    name: 'Xinference',
    shortName: 'XI',
    avatar: 'XI',
    description: '自托管模型服务平台，适合本地和私有云多模型管理。',
    baseUrl: 'http://localhost:9997/v1',
    status: 'disabled',
    category: 'local',
    authType: 'bearer_token',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 230,
  }),
  provider({
    id: 'newapi',
    name: 'NewAPI',
    shortName: 'NA',
    avatar: 'NA',
    description: '自托管/代理聚合网关，适合团队统一管理多模型供应商。',
    baseUrl: 'http://localhost:3000/v1',
    status: 'disabled',
    category: 'local',
    authType: 'bearer_token',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'openai_models_endpoint',
    credentialState: 'missing',
    priority: 240,
  }),
  provider({
    id: 'fal',
    name: 'Fal',
    shortName: 'FL',
    avatar: 'FL',
    description: '图像、视频和创意生成模型平台，适合多媒体生成工作流。',
    baseUrl: 'https://fal.run/openai/v1',
    status: 'disabled',
    category: 'media',
    authType: 'api_key',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 250,
  }),
  provider({
    id: 'replicate',
    name: 'Replicate',
    shortName: 'RP',
    avatar: 'RP',
    description: '开放模型托管与推理平台，适合图像、视频、音频和实验模型。',
    baseUrl: 'https://api.replicate.com/v1',
    status: 'disabled',
    category: 'media',
    authType: 'bearer_token',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 260,
  }),
  provider({
    id: 'cloudflare_workers_ai',
    name: 'Cloudflare Workers AI',
    shortName: 'CF',
    avatar: 'CF',
    description: 'Cloudflare 边缘 AI 通道，适合轻量推理和全球边缘部署。',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/account_id/ai/v1',
    status: 'disabled',
    category: 'media',
    authType: 'bearer_token',
    credentialMode: 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: 'manual',
    credentialState: 'missing',
    priority: 270,
  }),
];

const lobeModelBankProviderIds = new Set(lobeModelBankCards.map((card) => card.providerId));
const curatedProviderTemplateIds = new Set(curatedProviderTemplates.map((item) => item.id));

const chinaProviderIds = new Set([
  'ai360',
  'antgroup',
  'baichuan',
  'bailiancodingplan',
  'giteeai',
  'glmcodingplan',
  'higress',
  'infiniai',
  'internlm',
  'kimicodingplan',
  'longcat',
  'modelscope',
  'ppio',
  'qiniu',
  'sensenova',
  'spark',
  'stepfun',
  'streamlake',
  'taichu',
  'tencentcloud',
  'volcenginecodingplan',
  'xiaomimimo',
  'zeroone',
]);
const aggregatorProviderIds = new Set([
  'ai302',
  'aihubmix',
  'akashchat',
  'cerebras',
  'cometapi',
  'huggingface',
  'nebius',
  'novita',
  'ollamacloud',
  'opencodecodingplan',
  'opencodezen',
  'search1api',
  'vercelaigateway',
  'zenmux',
]);
const localProviderIds = new Set(['comfyui']);
const localNoCredentialProviderIds = new Set(['comfyui']);
const mediaProviderIds = new Set(['bfl']);
const openAiLikeSdkTypes = new Set(['openai', 'ollama', 'router']);

const generatedProviderTemplates = lobeProviderCards
  .filter((card) => lobeModelBankProviderIds.has(card.lobeProviderId))
  .map((card, index) => lobeProviderToTemplate(card, index))
  .filter((template) => !curatedProviderTemplateIds.has(template.id));

export const aiProviderTemplates: ProviderTemplate[] = [
  ...curatedProviderTemplates,
  ...generatedProviderTemplates,
];

function lobeProviderToTemplate(card: LobeProviderCard, index: number): ProviderTemplate {
  const providerId = dichaProviderId(card.lobeProviderId, normalizedProviderId(card.id));
  const noCredential = localNoCredentialProviderIds.has(providerId);

  return provider({
    id: providerId,
    name: card.name,
    shortName: providerShortName(card.name),
    avatar: providerShortName(card.name),
    description: providerDescription(card),
    baseUrl: providerBaseUrl(card),
    status: 'disabled',
    category: providerCategory(providerId),
    authType: noCredential ? 'none' : 'api_key',
    requestFormat: providerRequestFormat(card),
    credentialMode: noCredential ? 'not_required' : 'user_api_key',
    billingMode: 'user_provider',
    modelSyncMode: providerModelSyncMode(card),
    credentialState: noCredential ? 'not_required' : 'missing',
    priority: 280 + index * 10,
  });
}

function providerRequestFormat(card: LobeProviderCard): ProviderTemplate['requestFormat'] {
  return card.settings?.sdkType === 'anthropic' ? 'anthropic_messages' : 'openai_compatible';
}

function normalizedProviderId(value: string): string {
  return (
    value
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'provider'
  );
}

function providerShortName(value: string): string {
  return (
    value
      .replace(/&/g, ' ')
      .trim()
      .split(/[-_\s:/.()[\]]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'AI'
  );
}

function providerDescription(card: LobeProviderCard): string {
  return (card.description ?? `${card.name} model provider from LobeHub model-bank.`).slice(0, 240);
}

function providerBaseUrl(card: LobeProviderCard): string {
  const proxyUrl = card.settings?.proxyUrl || card.proxyUrl;
  if (proxyUrl && typeof proxyUrl === 'object' && isHttpUrl(proxyUrl.placeholder)) {
    return normalizeProviderBaseUrl(card, proxyUrl.placeholder);
  }
  if (isHttpUrl(card.url)) return normalizeProviderBaseUrl(card, card.url);
  return 'https://example.com';
}

function normalizeProviderBaseUrl(card: LobeProviderCard, baseUrl: string): string {
  if (card.settings?.sdkType !== 'router') return baseUrl;
  const normalized = baseUrl.replace(/\/+$/, '');
  if (/\/(api\/)?v\d+(\/openai)?$/i.test(normalized)) return normalized;
  return `${normalized}/v1`;
}

function providerCategory(providerId: string): AiProviderCategory {
  if (localProviderIds.has(providerId)) return 'local';
  if (mediaProviderIds.has(providerId)) return 'media';
  if (aggregatorProviderIds.has(providerId)) return 'aggregator';
  if (chinaProviderIds.has(providerId)) return 'china';
  return 'global';
}

function providerModelSyncMode(card: LobeProviderCard): ProviderTemplate['modelSyncMode'] {
  const proxyUrl = card.settings?.proxyUrl || card.proxyUrl;
  const hasProxyBaseUrl = Boolean(proxyUrl && typeof proxyUrl === 'object' && isHttpUrl(proxyUrl.placeholder));
  const showModelFetcher = card.settings?.showModelFetcher ?? card.modelList?.showModelFetcher ?? false;
  if (hasProxyBaseUrl && showModelFetcher && openAiLikeSdkTypes.has(card.settings?.sdkType ?? '')) {
    return 'openai_models_endpoint';
  }
  return 'manual';
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('https://') || value.startsWith('http://'));
}

export const aiProviderTemplateIds = aiProviderTemplates.map((item) => item.id);

const modelProviderIds = new Set(aiProviderTemplates.map((item) => item.id));

const lobeToDichaProviderId = new Map<string, string>(
  lobeProviderCards.map((card) => [
    card.lobeProviderId,
    dichaProviderId(card.lobeProviderId, normalizedProviderId(card.id)),
  ]),
);

const recommendedModelIds = new Set([
  'openai:gpt-5.2',
  'openai:gpt-4.1-mini',
  'anthropic:claude-sonnet-4-5-20250929',
  'google:gemini-2.5-flash',
  'deepseek:deepseek-v4-flash',
  'deepseek:deepseek-v4-pro',
  'qwen:qwen-max',
  'moonshot:kimi-k2.6',
  'groq:llama-3.3-70b-versatile',
]);

const aiExtensionParameterValues = new Set<AiModelExtensionParameter>([
  'codexMaxReasoningEffort',
  'deepseekV4ReasoningEffort',
  'disableContextCaching',
  'effort',
  'enableAdaptiveThinking',
  'enableReasoning',
  'glm5_2ReasoningEffort',
  'gpt5ReasoningEffort',
  'gpt5_1ReasoningEffort',
  'gpt5_2ProReasoningEffort',
  'gpt5_2ReasoningEffort',
  'grok4_20ReasoningEffort',
  'grok4_3ReasoningEffort',
  'hy3ReasoningEffort',
  'imageAspectRatio',
  'imageAspectRatio2',
  'imageResolution',
  'imageResolution2',
  'opus47Effort',
  'preserveThinking',
  'reasoningBudgetToken',
  'reasoningBudgetToken32k',
  'reasoningBudgetToken80k',
  'reasoningEffort',
  'ring2_6ReasoningEffort',
  'step3_5ReasoningEffort',
  'textVerbosity',
  'thinking',
  'thinkingBudget',
  'thinkingLevel',
  'thinkingLevel2',
  'thinkingLevel3',
  'thinkingLevel4',
  'urlContext',
]);

const dichaOfficialModels: AiModel[] = [
  model({
    id: 'dicha:assistant',
    providerId: 'dicha',
    name: 'dicha-assistant',
    displayName: 'Dicha Assistant',
    avatar: 'DC',
    contextWindow: 128000,
    modelType: 'chat',
    extensionParameters: ['textVerbosity'],
    capabilities: ['chat', 'vision', 'tool_use', 'json', 'reasoning'],
    enabled: true,
    recommended: true,
    availability: 'healthy',
    priceHint: '未来按 Dicha AI 积分计费',
    catalogSource: 'dicha_catalog',
  }),
];

const lobeModelBankModels = lobeModelBankCards
  .map((card) => lobeModelToAiModel(card))
  .filter((model): model is AiModel => Boolean(model));

export const aiModelBank: AiModel[] = [...dichaOfficialModels, ...lobeModelBankModels];

export const aiCatalogFixture: AiGatewayCatalog = {
  generatedAt,
  providers: aiProviderTemplates,
  models: aiModelBank,
  assignments: [
    {
      useCase: 'assistant',
      primaryModelId: 'dicha:assistant',
      fallbackModelIds: ['openai:gpt-5.2', 'anthropic:claude-sonnet-4-5-20250929'],
    },
    {
      useCase: 'item_profile',
      primaryModelId: 'openai:gpt-4.1-mini',
      fallbackModelIds: ['deepseek:deepseek-v4-flash', 'qwen:qwen-max'],
    },
    {
      useCase: 'image_understanding',
      primaryModelId: 'google:gemini-2.5-flash',
      fallbackModelIds: ['openai:gpt-4.1-mini', 'qwen:qwen3-vl-plus'],
    },
    {
      useCase: 'tagging',
      primaryModelId: 'deepseek:deepseek-v4-flash',
      fallbackModelIds: ['qwen:qwen-max', 'groq:llama-3.3-70b-versatile'],
    },
    {
      useCase: 'summarization',
      primaryModelId: 'moonshot:kimi-k2.6',
      fallbackModelIds: ['anthropic:claude-sonnet-4-5-20250929', 'google:gemini-2.5-flash'],
    },
  ],
};

function lobeModelToAiModel(card: LobeModelBankCard): AiModel | null {
  const providerId = lobeToDichaProviderId.get(card.providerId) ?? card.providerId;
  if (!modelProviderIds.has(providerId)) return null;

  const contextWindow = card.contextWindowTokens ?? null;
  const modelType = aiModelType(card.type);
  const capabilities = aiModelCapabilities(card);
  const extensionParameters = aiExtensionParameters(card.settings?.extendParams);
  const id = `${providerId}:${card.id}`;

  return model({
    id,
    providerId,
    name: card.id,
    displayName: card.displayName ?? card.id,
    avatar: modelAvatar(card.displayName ?? card.id),
    contextWindow,
    modelType,
    extensionParameters,
    capabilities,
    maxOutput: card.maxOutput,
    enabled: card.enabled ?? false,
    recommended: recommendedModelIds.has(id),
    releasedAt: card.releasedAt,
    priceHint: card.description ?? '对齐 LobeHub model-bank，用户自带供应商计费',
    pricing: aiModelPricing(card.pricing),
    lobeMetadata: {
      abilities: card.abilities,
      description: card.description,
      family: card.family,
      generation: card.generation,
      knowledgeCutoff: card.knowledgeCutoff,
      legacy: card.legacy,
      lobeProviderId: card.providerId,
      maxDimension: card.maxDimension,
      organization: card.organization,
      raw: card,
      settings: card.settings,
      visible: card.visible,
    },
  });
}

function aiModelType(type: LobeModelBankCard['type']): AiModel['modelType'] {
  if (type === 'asr') return 'asr';
  if (type === 'tts') return 'tts';
  if (type === 'text2music') return 'text2music';
  if (type === 'realtime') return 'realtime';
  return type;
}

function aiModelCapabilities(card: LobeModelBankCard): AiModel['capabilities'] {
  const capabilities = new Set<AiModel['capabilities'][number]>();
  if (card.type === 'chat' || card.type === 'realtime') capabilities.add('chat');
  if (card.type === 'embedding') capabilities.add('embedding');
  if (card.type === 'image') capabilities.add('image_generation');
  if (card.type === 'video') capabilities.add('video');
  if (card.type === 'tts' || card.type === 'asr' || card.type === 'text2music') capabilities.add('audio');

  const abilities = card.abilities;
  if (abilities?.audio) capabilities.add('audio');
  if (abilities?.files) capabilities.add('files');
  if (abilities?.functionCall) capabilities.add('tool_use');
  if (abilities?.imageOutput) capabilities.add('image_output');
  if (abilities?.reasoning) capabilities.add('reasoning');
  if (abilities?.search) capabilities.add('web_search');
  if (abilities?.structuredOutput) capabilities.add('json');
  if (abilities?.video) capabilities.add('video');
  if (abilities?.vision) capabilities.add('vision');

  return [...capabilities];
}

function aiExtensionParameters(values: string[] | undefined): AiModel['extensionParameters'] {
  if (!values) return [];
  return values.filter((value): value is AiModel['extensionParameters'][number] =>
    aiExtensionParameterValues.has(value as AiModel['extensionParameters'][number]),
  );
}

function aiModelPricing(pricing: LobeModelBankCard['pricing']): AiModel['pricing'] | undefined {
  if (!pricing) return undefined;
  return {
    currency: pricing.currency ?? 'USD',
    units: pricing.units,
  };
}

function modelAvatar(value: string): string {
  return value
    .trim()
    .split(/[-_\s:/.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 4) || 'AI';
}
