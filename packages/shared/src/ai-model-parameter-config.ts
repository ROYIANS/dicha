import type { AiModelExtensionParameter } from './contracts/ai.contract';

export type AiModelParameterControlKind = 'number' | 'select' | 'switch';

export interface AiModelParameterControlDefinition {
  key: string;
  label: string;
  description: string;
  kind: AiModelParameterControlKind;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly { label: string; value: string }[];
  placeholder?: string;
}

export interface AiModelExtensionParameterDefinition extends AiModelParameterControlDefinition {
  extension: AiModelExtensionParameter;
  hint: string;
  parameterTag?: string;
}

export const aiModelCommonParameterControls = [
  {
    key: 'temperature',
    label: '创意活跃度',
    description: '值越大，回答越有创意和想象力；值越小，回答越严谨。',
    kind: 'number',
    min: 0,
    max: 2,
    step: 0.1,
    placeholder: '0.7',
  },
  {
    key: 'top_p',
    label: '开放性',
    description: '控制采样范围。通常不要同时大幅调整创意活跃度和开放性。',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.05,
    placeholder: '1',
  },
  {
    key: 'presence_penalty',
    label: '表述发散度',
    description: '值越大越倾向引入不同概念，降低重复主题。',
    kind: 'number',
    min: -2,
    max: 2,
    step: 0.1,
    placeholder: '0',
  },
  {
    key: 'frequency_penalty',
    label: '词汇丰富度',
    description: '值越大越减少重复词汇，值越小表达更稳定。',
    kind: 'number',
    min: -2,
    max: 2,
    step: 0.1,
    placeholder: '0',
  },
  {
    key: 'max_tokens',
    label: '单次回复限制',
    description: '限制单次回复最多使用的 token 数。留空则由模型或调用方决定。',
    kind: 'number',
    min: 1,
    step: 1,
    placeholder: '4096',
  },
] as const satisfies readonly AiModelParameterControlDefinition[];

const effortOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
] as const;

const extendedEffortOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '最大', value: 'max' },
] as const;

const imageAspectRatioOptions = [
  { label: '1:1', value: '1:1' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
] as const;

const imageAspectRatioWideOptions = [
  ...imageAspectRatioOptions,
  { label: '4:1', value: '4:1' },
  { label: '1:4', value: '1:4' },
  { label: '8:1', value: '8:1' },
  { label: '1:8', value: '1:8' },
] as const;

const imageResolutionOptions = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
] as const;

export const aiModelExtensionParameterDefinitions: readonly AiModelExtensionParameterDefinition[] =
  [
    {
      extension: 'disableContextCaching',
      key: 'disableContextCaching',
      label: '禁用上下文缓存 (Claude)',
      description: '开关用于控制是否停用上下文缓存。',
      hint: '适用于 Claude 模型；可降低成本并加快响应速度。',
      kind: 'switch',
    },
    {
      extension: 'enableReasoning',
      key: 'enableReasoning',
      label: '启用推理',
      description: '开启后模型会先进行推理，适合复杂问题。',
      hint: '适用于 Claude、DeepSeek 及其他推理模型；可启用更深层次的思考能力。',
      kind: 'switch',
      parameterTag: 'thinking.type',
    },
    {
      extension: 'enableAdaptiveThinking',
      key: 'enableAdaptiveThinking',
      label: '自适应思考 (Opus 4.6)',
      description: '切换自适应思维的开启或关闭。',
      hint: '适用于 Claude Opus 4.6；切换自适应思维的开启或关闭。',
      kind: 'switch',
      parameterTag: 'thinking.type',
    },
    {
      extension: 'preserveThinking',
      key: 'preserveThinking',
      label: '保留思考过程 (Qwen3.6+ / GLM-4.7+)',
      description: '将历史助手推理发送回模型上下文。',
      hint: '适用于 Qwen3.6 Plus、GLM-5 和 GLM-4.7；将历史助手推理发送回模型上下文。',
      kind: 'switch',
      parameterTag: 'preserve_thinking',
    },
    {
      extension: 'urlContext',
      key: 'urlContext',
      label: 'URL 上下文 (Gemini)',
      description: '允许模型读取提供的 URL 上下文。',
      hint: '适用于 Gemini 系列；支持提供 URL 上下文。',
      kind: 'switch',
      parameterTag: 'urlContext',
    },
    {
      extension: 'reasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度',
      description: '控制推理力度。',
      hint: '适用于 OpenAI 及其他具备推理能力的模型；控制推理力度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'gpt5ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (GPT-5)',
      description: '控制 GPT-5 系列模型的推理强度。',
      hint: '适用于 GPT-5 系列；控制推理强度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'gpt5_1ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (GPT-5.1)',
      description: '控制 GPT-5.1 系列模型的推理强度。',
      hint: '适用于 GPT-5.1 系列；控制推理强度。',
      kind: 'select',
      options: [{ label: '不指定', value: 'none' }, ...effortOptions],
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'gpt5_2ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (GPT-5.2)',
      description: '控制 GPT-5.2 系列模型的推理强度。',
      hint: '适用于 GPT-5.2 系列；控制推理强度。',
      kind: 'select',
      options: [{ label: '不指定', value: 'none' }, ...effortOptions],
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'gpt5_2ProReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (GPT-5.2 Pro)',
      description: '控制 GPT-5.2 Pro 系列模型的推理强度。',
      hint: '适用于 GPT-5.2 Pro 系列；控制推理强度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'deepseekV4ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (DeepSeek V4)',
      description: 'DeepSeek V4 思维模式的推理强度。',
      hint: '适用于 DeepSeek V4 思维模式；high 为默认值，max 可启用更深层次的推理。',
      kind: 'select',
      options: extendedEffortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'glm5_2ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (GLM-5.2)',
      description: '提供 High 和 Max 两档推理强度控制。',
      hint: '适用于 GLM-5.2；提供 High 和 Max 两档推理强度控制。',
      kind: 'select',
      options: [
        { label: '高', value: 'high' },
        { label: '最大', value: 'max' },
      ],
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'grok4_20ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (Grok 4.20)',
      description: '低/中档使用较少代理，高/超高使用更多代理。',
      hint: '适用于 Grok 4.20 系列；控制推理强度。',
      kind: 'select',
      options: [...extendedEffortOptions, { label: '超高', value: 'super_high' }],
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'grok4_3ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (Grok 4.3)',
      description: '控制 Grok 4.3 系列模型的推理强度。',
      hint: '适用于 Grok 4.3 系列；控制推理强度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'hy3ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (Hy3 preview)',
      description: '在快速响应和深度推理之间选择。',
      hint: '适用于 Hy3 模型；控制推理强度。',
      kind: 'select',
      options: [
        { label: '不思考', value: 'no_think' },
        { label: '低', value: 'low' },
        { label: '高', value: 'high' },
      ],
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'ring2_6ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (Ring 2.6)',
      description: '控制 Ring 2.6 系列模型的推理强度。',
      hint: '适用于 Ring 2.6 系列；控制推理强度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'codexMaxReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (Codex)',
      description: '控制 Codex 模型的推理强度。',
      hint: '适用于 Codex 模型；控制推理强度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'step3_5ReasoningEffort',
      key: 'reasoning_effort',
      label: '推理强度 (Step 3.5)',
      description: '控制 Step 3.5 系列模型的推理强度。',
      hint: '适用于 Step 3.5 系列；控制推理强度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'reasoning_effort',
    },
    {
      extension: 'effort',
      key: 'output_config.effort',
      label: '努力程度 (Opus 4.6)',
      description: '控制输出努力程度。',
      hint: '适用于 Claude Opus 4.6；控制努力程度。',
      kind: 'select',
      options: extendedEffortOptions,
      parameterTag: 'output_config.effort',
    },
    {
      extension: 'opus47Effort',
      key: 'output_config.effort',
      label: '努力程度 (Opus 4.7+)',
      description: '控制输出努力程度。',
      hint: '适用于 Claude Opus 4.7 及更高版本；控制努力级别。',
      kind: 'select',
      options: [...extendedEffortOptions, { label: '超高', value: 'ultra' }],
      parameterTag: 'output_config.effort',
    },
    {
      extension: 'textVerbosity',
      key: 'text_verbosity',
      label: '输出详细程度',
      description: '控制输出内容的详尽程度。',
      hint: '适用于 GPT-5+ 系列；控制输出内容的详尽程度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'text_verbosity',
    },
    {
      extension: 'thinking',
      key: 'thinking',
      label: '思考模式 (Doubao)',
      description: '允许模型自行决定是否进行深度思考。',
      hint: '适用于部分豆包模型；允许模型自行决定是否进行深度思考。',
      kind: 'select',
      options: [
        { label: '自动', value: 'auto' },
        { label: '开启', value: 'enabled' },
        { label: '关闭', value: 'disabled' },
      ],
      parameterTag: 'thinking.type',
    },
    {
      extension: 'thinkingLevel',
      key: 'thinkingLevel',
      label: '思考等级 (3 Flash)',
      description: '控制 Gemini 3 Flash Preview 的思考深度。',
      hint: '适用于 Gemini 3 Flash Preview 模型；控制思考深度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'thinkingLevel',
    },
    {
      extension: 'thinkingLevel2',
      key: 'thinkingLevel',
      label: '思考等级 (3 Pro)',
      description: '控制 Gemini 3 Pro Preview 的思考深度。',
      hint: '适用于 Gemini 3 Pro Preview 模型；控制思考深度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'thinkingLevel',
    },
    {
      extension: 'thinkingLevel3',
      key: 'thinkingLevel',
      label: '思考等级 (Gemini 3.1)',
      description: '通过低/中/高等级控制思考深度。',
      hint: '适用于 Gemini 3.1 Pro Preview 模型；通过低/中/高等级控制思考深度。',
      kind: 'select',
      options: effortOptions,
      parameterTag: 'thinkingLevel',
    },
    {
      extension: 'thinkingLevel4',
      key: 'thinkingLevel',
      label: '思考等级 (Nano Banana 2)',
      description: '切换思考开关。',
      hint: '适用于 Gemini 3.1 Flash Image 模型；切换思考开/关。',
      kind: 'select',
      options: [
        { label: '最低', value: 'minimal' },
        { label: '低', value: 'low' },
        { label: '高', value: 'high' },
      ],
      parameterTag: 'thinkingLevel',
    },
    {
      extension: 'reasoningBudgetToken',
      key: 'reasoningBudgetToken',
      label: '推理预算',
      description: '控制用于推理的 token 预算。',
      hint: '适用于 Claude、Qwen3 等模型；控制用于推理的 Token 预算。',
      kind: 'number',
      min: -1,
      step: 128,
      placeholder: '1024',
      parameterTag: 'thinking.budget_tokens',
    },
    {
      extension: 'reasoningBudgetToken32k',
      key: 'reasoningBudgetToken32k',
      label: '推理预算 (32k)',
      description: '控制最大 32k 的推理 token 预算。',
      hint: '适用于 GLM-5 和 GLM-4.7；控制推理的令牌预算。',
      kind: 'number',
      min: -1,
      max: 32768,
      step: 128,
      placeholder: '1024',
      parameterTag: 'thinking.budget_tokens',
    },
    {
      extension: 'reasoningBudgetToken80k',
      key: 'reasoningBudgetToken80k',
      label: '推理预算 (80k)',
      description: '控制最大 80k 的推理 token 预算。',
      hint: '适用于 Qwen3 系列；控制推理的令牌预算。',
      kind: 'number',
      min: -1,
      max: 81920,
      step: 128,
      placeholder: '1024',
      parameterTag: 'thinking.budget_tokens',
    },
    {
      extension: 'thinkingBudget',
      key: 'thinkingBudget',
      label: '思考预算 (Gemini)',
      description: 'Auto 为 -1，OFF 为 0，也可以填写具体 token 数。',
      hint: '适用于 Gemini 系列；控制思考预算。',
      kind: 'number',
      min: -1,
      max: 32768,
      step: 128,
      placeholder: '-1',
      parameterTag: 'thinkingBudget',
    },
    {
      extension: 'imageAspectRatio',
      key: 'aspect_ratio',
      label: '图片比例',
      description: '控制生成图像的宽高比。',
      hint: '适用于 Gemini 图像生成模型；控制生成图像的宽高比。',
      kind: 'select',
      options: imageAspectRatioOptions,
      parameterTag: 'aspect_ratio',
    },
    {
      extension: 'imageAspectRatio2',
      key: 'aspect_ratio',
      label: '图片比例 (Nano Banana 2)',
      description: '支持更宽或更窄的图像比例。',
      hint: '适用于 Nano Banana 2；控制生成图像的宽高比。',
      kind: 'select',
      options: imageAspectRatioWideOptions,
      parameterTag: 'aspect_ratio',
    },
    {
      extension: 'imageResolution',
      key: 'resolution',
      label: '图片分辨率',
      description: '控制生成图像的分辨率。',
      hint: '适用于 Gemini 3 图像生成模型；控制生成图像的分辨率。',
      kind: 'select',
      options: imageResolutionOptions,
      parameterTag: 'resolution',
    },
    {
      extension: 'imageResolution2',
      key: 'resolution',
      label: '图片分辨率 (512px+)',
      description: '控制生成图像的分辨率。',
      hint: '适用于 Gemini 3.1 Flash Image 模型；控制生成图像的分辨率。',
      kind: 'select',
      options: [{ label: '512px', value: '512' }, ...imageResolutionOptions],
      parameterTag: 'resolution',
    },
  ] as const;

export const aiModelExtensionParameterOptions = aiModelExtensionParameterDefinitions.map(
  (item) => item.extension,
) as AiModelExtensionParameter[];

export const aiModelExtensionParameterDefinitionByKey = new Map(
  aiModelExtensionParameterDefinitions.map((item) => [item.extension, item]),
);

export type AiModelParameterDraft = Record<string, string | boolean>;

export function createAiModelParameterDraft(
  config: Record<string, unknown> | undefined,
  controls: readonly AiModelParameterControlDefinition[],
): AiModelParameterDraft {
  const draft: AiModelParameterDraft = {};
  controls.forEach((control) => {
    const value = config?.[control.key];
    draft[control.key] =
      control.kind === 'switch' ? value === true : value == null ? '' : String(value);
  });
  return draft;
}

export function buildAiModelParameterConfig(
  draft: AiModelParameterDraft,
  controls: readonly AiModelParameterControlDefinition[],
): { config: Record<string, unknown>; error?: string } {
  const config: Record<string, unknown> = {};
  for (const control of controls) {
    const value = draft[control.key];
    if (control.kind === 'switch') {
      if (value === true) config[control.key] = true;
      continue;
    }

    if (typeof value !== 'string' || value.trim() === '') continue;

    if (control.kind === 'number') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return { config, error: `${control.label} 需要填写数字` };
      if (control.min != null && parsed < control.min) {
        return { config, error: `${control.label} 不能小于 ${control.min}` };
      }
      if (control.max != null && parsed > control.max) {
        return { config, error: `${control.label} 不能大于 ${control.max}` };
      }
      config[control.key] = parsed;
      continue;
    }

    if (control.kind === 'select') {
      const allowed = control.options?.some((option) => option.value === value) ?? true;
      if (!allowed) return { config, error: `${control.label} 不是可用选项` };
      if (value !== 'none') config[control.key] = value;
    }
  }

  return { config };
}
