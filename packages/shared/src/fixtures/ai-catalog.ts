import type { AiGatewayCatalog } from '../contracts/ai.contract';

export const aiProviderTemplates: AiGatewayCatalog['providers'] = [
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'OA',
    avatar: 'OA',
    description: '通用对话、结构化输出和多模态能力的主力供应商。',
    baseUrl: 'https://api.openai.com/v1',
    status: 'disabled',
    authType: 'api_key',
    credentialState: 'missing',
    priority: 1,
    custom: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    shortName: 'DS',
    avatar: 'DS',
    description: '适合推理、中文任务和成本敏感的模型通道。',
    baseUrl: 'https://api.deepseek.com/v1',
    status: 'disabled',
    authType: 'api_key',
    credentialState: 'missing',
    priority: 2,
    custom: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    shortName: 'AN',
    avatar: 'AN',
    description: '长上下文、稳健写作和复杂任务规划的备用供应商。',
    baseUrl: 'https://api.anthropic.com/v1',
    status: 'disabled',
    authType: 'api_key',
    credentialState: 'missing',
    priority: 3,
    custom: false,
  },
];

export const aiProviderTemplateIds = aiProviderTemplates.map((provider) => provider.id);

export const aiCatalogFixture: AiGatewayCatalog = {
  generatedAt: '2026-06-30T00:00:00.000Z',
  providers: [],
  models: [],
  assignments: [],
};
