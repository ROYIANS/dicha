import type { AiProviderRequestFormat } from '@dicha/shared';
import {
  anthropicBaseUrl,
  anthropicHeaders,
  asNumber,
  asString,
  invokeError,
  pathValue,
  postJson,
  type InvokeAdapter,
  type InvokeAdapterContext,
  type InvokeAdapterResult,
} from './invoke-adapter';

const DEFAULT_MAX_TOKENS = 1024;

export class AnthropicMessagesInvokeAdapter implements InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat = 'anthropic_messages';

  async invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult> {
    const system = context.request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const messages = context.request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      }));
    const body = await postJson(
      `${anthropicBaseUrl(context.provider.baseUrl)}/v1/messages`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        messages,
        max_tokens: context.request.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...(system ? { system } : {}),
        ...(context.request.temperature !== undefined ? { temperature: context.request.temperature } : {}),
      },
      anthropicHeaders(context.secret),
      context.signal,
    );
    const text = anthropicText(body);
    if (!text) {
      throw invokeError('unknown', 'AI provider returned an empty response', true);
    }
    return {
      text,
      promptTokens: asNumber(body, ['usage', 'input_tokens']) ?? 0,
      completionTokens: asNumber(body, ['usage', 'output_tokens']) ?? 0,
      upstreamRequestId: asString(body, ['id']) ?? null,
    };
  }
}

export function anthropicText(value: unknown): string {
  const content = pathValue(value, ['content']);
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => asString(item, ['text']) ?? '')
    .filter(Boolean)
    .join('\n');
}
