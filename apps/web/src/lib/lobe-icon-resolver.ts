import type { ComponentType } from 'react';

type LobeIconComponent = ComponentType<{ size?: number | string }>;
type LobeIconModule = { default: LobeIconComponent };
type LobeIconLoader = () => Promise<LobeIconModule>;

const lobeIconModules = import.meta.glob<LobeIconModule>(
  '../../node_modules/@lobehub/icons/es/*/index.js',
);

const skippedDirectories = new Set(['components', 'features', 'hooks', 'types']);

const lobeIconEntries = Object.entries(lobeIconModules)
  .flatMap(([path, loader]) => {
    const iconName = path.match(/\/([^/]+)\/index\.js$/)?.[1];
    return iconName && !skippedDirectories.has(iconName) ? [[iconName, loader] as const] : [];
  })
  .sort(([left], [right]) => left.localeCompare(right));

const lobeIconLoaderByName = new Map<string, LobeIconLoader>(lobeIconEntries);
const lobeIconNameByKey = new Map(
  lobeIconEntries.map(([iconName]) => [normalizeIconKey(iconName), iconName] as const),
);
const lobeIconNamesBySearchPriority = lobeIconEntries
  .map(([iconName]) => iconName)
  .filter((iconName) => normalizeIconKey(iconName).length > 3)
  .sort((left, right) => normalizeIconKey(right).length - normalizeIconKey(left).length);

export const lobeIconNames = lobeIconEntries.map(([iconName]) => iconName);

const iconAliases = {
  ai302: 'Ai302',
  ai360: 'Ai360',
  aihubmix: 'AiHubMix',
  baiduqianfan: 'BaiduCloud',
  baiduwenxin: 'Wenxin',
  cloudflareworkersai: 'Cloudflare',
  fireworksai: 'Fireworks',
  glm: 'ZAI',
  grok: 'Grok',
  llama: 'Meta',
  lmstudio: 'LmStudio',
  minmax: 'Minimax',
  minimax: 'Minimax',
  siliconflow: 'SiliconCloud',
  togetherai: 'Together',
  xai: 'XAI',
  yi: 'Yi',
  zhipu: 'Zhipu',
  zeroone: 'ZeroOne',
} satisfies Record<string, string>;

const modelKeywordMappings = [
  { icon: 'OpenAI', keywords: ['gpt-3', 'gpt-4', 'gpt-5', 'gpt-oss', '^gpt-', '/gpt-', 'openai'] },
  { icon: 'OpenAI', keywords: ['o1-', '^o1', '/o1', 'o3-', '^o3', '/o3', 'o4-', '^o4', '/o4'] },
  { icon: 'OpenAI', keywords: ['text-embedding-', 'tts-', 'whisper-', 'codex', 'davinci', 'babbage'] },
  { icon: 'Dalle', keywords: ['dalle', 'dall-e'] },
  { icon: 'Sora', keywords: ['sora'] },
  { icon: 'Claude', keywords: ['claude'] },
  { icon: 'Anthropic', keywords: ['anthropic'] },
  { icon: 'Gemini', keywords: ['gemini'] },
  { icon: 'Gemma', keywords: ['gemma'] },
  { icon: 'DeepMind', keywords: ['^imagen-', '/imagen-', '^imagen\\d/', '/imagen\\d'] },
  { icon: 'Qwen', keywords: ['qwen', 'qwq', 'qvq', 'wanx', 'wan\\d/', 'tongyi', 'gte-rerank'] },
  { icon: 'Moonshot', keywords: ['kimi', 'moonshot'] },
  { icon: 'DeepSeek', keywords: ['deepseek'] },
  { icon: 'Doubao', keywords: ['^ep-', 'doubao-', 'doubao'] },
  { icon: 'Hunyuan', keywords: ['hunyuan'] },
  { icon: 'Mistral', keywords: ['mistral', 'mixtral', 'codestral', 'mathstral', 'pixtral'] },
  { icon: 'Meta', keywords: ['llama', '/l3'] },
  { icon: 'LLaVA', keywords: ['llava'] },
  { icon: 'Grok', keywords: ['^grok-', '/grok-', 'grok'] },
  { icon: 'Perplexity', keywords: ['pplx', 'sonar', 'perplexity'] },
  { icon: 'ChatGLM', keywords: ['^glm-', '/glm-', 'chatglm', '-glm-'] },
  { icon: 'ZAI', keywords: ['^glm-5', '/glm-5', '/glm5', '-glm-4', '^glm-4', '/glm-4', '/glm4'] },
  { icon: 'CodeGeeX', keywords: ['^codegeex', '/codegeex'] },
  { icon: 'InternLM', keywords: ['internlm', 'internvl'] },
  { icon: 'NousResearch', keywords: ['deephermes', 'hermes', 'genstruct', 'minos'] },
  { icon: 'Nvidia', keywords: ['nemotron', 'openreasoning', 'nemoretriever', 'neva-', 'nv-'] },
  { icon: 'Minimax', keywords: ['minimax', 'abab', '^image-'] },
  { icon: 'OpenRouter', keywords: ['^openrouter', 'openrouter'] },
  { icon: 'Yi', keywords: ['^yi-', '/yi-', '-yi-'] },
  { icon: 'Baichuan', keywords: ['baichuan'] },
  { icon: 'Wenxin', keywords: ['ernie', 'irag', 'wenxin'] },
  { icon: 'Jina', keywords: ['^jina', '/jina'] },
  { icon: 'Jimeng', keywords: ['^jimeng-', '/jimeng-', 'seedream', 'seededit', 'seedance-'] },
  { icon: 'Kling', keywords: ['^kling', 'kling-', 'klingai'] },
  { icon: 'ByteDance', keywords: ['skylark', 'seed-', 'bytedance'] },
  { icon: 'Stability', keywords: ['stable-diffusion', 'stable-video', 'stable-cascade', 'sdxl', 'stablelm', '^stable-', '^sd3', '^sd2', '^sd1'] },
  { icon: 'Flux', keywords: ['flux'] },
  { icon: 'Suno', keywords: ['suno'] },
  { icon: 'Microsoft', keywords: ['wizardlm', '/phi-', '^phi-', '-phi-', 'mai-', 'microsoft'] },
  { icon: 'Ai21', keywords: ['jamba', '^j2-', 'ai21'] },
  { icon: 'Upstage', keywords: ['^solar-', '/solar'] },
  { icon: 'Spark', keywords: ['spark', 'general$', 'generalv3$', 'generalv3.5$', '4.0ultra$'] },
  { icon: 'DeepSeek', keywords: ['deepseek'] },
  { icon: 'Voyage', keywords: ['voyage'] },
  { icon: 'AssemblyAI', keywords: ['assemblyai'] },
  { icon: 'Liquid', keywords: ['liquid', 'lfm'] },
  { icon: 'VertexAI', keywords: ['^veo-', '/veo-', '^veo3'] },
  { icon: 'Google', keywords: ['google', 'learnlm', 'nano-banana'] },
  { icon: 'CogView', keywords: ['cogview'] },
  { icon: 'Kolors', keywords: ['kolors'] },
  { icon: 'BaiduCloud', keywords: ['baidu', 'qianfan'] },
  { icon: 'IBM', keywords: ['ibm', 'granite'] },
  { icon: 'BilibiliIndex', keywords: ['bilibili-index', 'index-tts'] },
  { icon: 'LG', keywords: ['kmmlu', 'exaone', 'lgai'] },
  { icon: 'TII', keywords: ['falcon'] },
  { icon: 'Nova', keywords: ['^nova-', '/nova-'] },
  { icon: 'XiaomiMiMo', keywords: ['^mimo-', '/mimo-'] },
  { icon: 'BAAI', keywords: ['^baai', '^bge-', '/beg-', 'touchd', 'robobrain'] },
] satisfies Array<{ icon: string; keywords: string[] }>;

function normalizeIconKey(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function resolveKnownIconName(value: string): string | undefined {
  return lobeIconNameByKey.get(normalizeIconKey(value));
}

function resolveAliasedIconName(value: string): string | undefined {
  const alias = iconAliases[normalizeIconKey(value) as keyof typeof iconAliases];
  return alias ? resolveKnownIconName(alias) : undefined;
}

function keywordMatches(input: string, keyword: string) {
  const lowerKeyword = keyword.toLowerCase();
  if (!/[\\^$()[\].*+?|]/.test(lowerKeyword)) return input.includes(lowerKeyword);

  try {
    return new RegExp(lowerKeyword).test(input);
  } catch {
    return input.includes(lowerKeyword.replaceAll(/[^a-z0-9/_-]/g, ''));
  }
}

export function resolveLobeIconName(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const normalizedValue = normalizeIconKey(value);
  const exactIconName = resolveKnownIconName(value);
  if (exactIconName) return exactIconName;

  const aliasedIconName = resolveAliasedIconName(value);
  if (aliasedIconName) return aliasedIconName;

  return lobeIconNamesBySearchPriority.find((iconName) =>
    normalizedValue.includes(normalizeIconKey(iconName)),
  );
}

export function resolveLobeModelIconName(modelName: string | undefined): string | undefined {
  if (!modelName) return undefined;

  const normalizedModelName = modelName.toLowerCase();
  for (const mapping of modelKeywordMappings) {
    if (mapping.keywords.some((keyword) => keywordMatches(normalizedModelName, keyword))) {
      const iconName = resolveLobeIconName(mapping.icon);
      if (iconName) return iconName;
    }
  }

  return resolveLobeIconName(modelName);
}

export function getLobeIconLoader(iconName: string): LobeIconLoader | undefined {
  return lobeIconLoaderByName.get(iconName);
}
