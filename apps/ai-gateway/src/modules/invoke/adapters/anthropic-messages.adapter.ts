import type { AiProviderRequestFormat } from '@dicha/shared';
import {
  anthropicBaseUrl,
  anthropicHeaders,
  asNumber,
  asString,
  invokeError,
  pathValue,
  postEventStream,
  postJson,
  safeParseJson,
  type InvokeAdapter,
  type InvokeAdapterContext,
  type InvokeAdapterResult,
  type InvokeAdapterStreamDelta,
} from './invoke-adapter';

const DEFAULT_MAX_TOKENS = 1024;

export class AnthropicMessagesInvokeAdapter implements InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat = 'anthropic_messages';

  async invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult> {
    const body = await postJson(
      `${anthropicBaseUrl(context.provider.baseUrl)}/v1/messages`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        messages: anthropicMessages(context),
        max_tokens: context.request.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...anthropicOptions(context),
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

  async stream(
    context: InvokeAdapterContext,
    onDelta: (delta: InvokeAdapterStreamDelta) => void | Promise<void>,
  ): Promise<InvokeAdapterResult> {
    const messages = await postEventStream(
      `${anthropicBaseUrl(context.provider.baseUrl)}/v1/messages`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        messages: anthropicMessages(context),
        max_tokens: context.request.maxTokens ?? DEFAULT_MAX_TOKENS,
        stream: true,
        ...anthropicOptions(context),
        ...(context.request.temperature !== undefined ? { temperature: context.request.temperature } : {}),
      },
      anthropicHeaders(context.secret),
      context.signal,
    );
    let text = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let upstreamRequestId: string | null = null;

    for await (const message of messages) {
      if (message.data === '[DONE]') break;
      const body = safeParseJson(message.data);
      upstreamRequestId =
        asString(body, ['message', 'id']) ??
        asString(body, ['id']) ??
        upstreamRequestId;
      const delta = anthropicDeltaText(body);
      if (delta) {
        text += delta;
        await onDelta({ text: delta });
      }
      promptTokens =
        asNumber(body, ['message', 'usage', 'input_tokens']) ??
        asNumber(body, ['usage', 'input_tokens']) ??
        promptTokens;
      completionTokens =
        asNumber(body, ['message', 'usage', 'output_tokens']) ??
        asNumber(body, ['usage', 'output_tokens']) ??
        completionTokens;
    }

    if (!text) {
      throw invokeError('unknown', 'AI provider returned an empty message stream', true);
    }
    return { text, promptTokens, completionTokens, upstreamRequestId };
  }
}

function anthropicMessages(context: InvokeAdapterContext): Array<{ role: string; content: string }> {
  return context.request.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));
}

function anthropicOptions(context: InvokeAdapterContext): Record<string, string> {
  const system = context.request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  return system ? { system } : {};
}

export function anthropicText(value: unknown): string {
  const content = pathValue(value, ['content']);
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => asString(item, ['text']) ?? '')
    .filter(Boolean)
    .join('\n');
}

function anthropicDeltaText(value: unknown): string {
  return asString(value, ['delta', 'text']) ?? '';
}
