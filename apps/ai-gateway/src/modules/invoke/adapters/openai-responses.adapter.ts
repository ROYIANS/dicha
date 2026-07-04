import type { AiProviderRequestFormat } from '@dicha/shared';
import {
  asNumber,
  asString,
  invokeError,
  openAiBaseUrl,
  openAiHeaders,
  pathValue,
  postEventStream,
  postJson,
  safeParseJson,
  type InvokeAdapter,
  type InvokeAdapterContext,
  type InvokeAdapterResult,
  type InvokeAdapterStreamDelta,
} from './invoke-adapter';

export class OpenAiResponsesInvokeAdapter implements InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat = 'openai_responses';

  async invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult> {
    const body = await postJson(
      `${openAiBaseUrl(context.provider.baseUrl)}/responses`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        input: responsesInput(context),
        stream: false,
        ...responsesOptions(context),
        ...(context.request.maxTokens ? { max_output_tokens: context.request.maxTokens } : {}),
        ...(context.request.temperature !== undefined ? { temperature: context.request.temperature } : {}),
      },
      openAiHeaders(context.provider, context.secret),
      context.signal,
    );
    const text = openAiResponsesText(body);
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
      `${openAiBaseUrl(context.provider.baseUrl)}/responses`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        input: responsesInput(context),
        stream: true,
        ...responsesOptions(context),
        ...(context.request.maxTokens ? { max_output_tokens: context.request.maxTokens } : {}),
        ...(context.request.temperature !== undefined ? { temperature: context.request.temperature } : {}),
      },
      openAiHeaders(context.provider, context.secret),
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
        asString(body, ['response', 'id']) ??
        asString(body, ['id']) ??
        upstreamRequestId;
      const delta = openAiResponsesDeltaText(body);
      if (delta) {
        text += delta;
        await onDelta({ text: delta });
      }
      promptTokens =
        asNumber(body, ['response', 'usage', 'input_tokens']) ??
        asNumber(body, ['usage', 'input_tokens']) ??
        promptTokens;
      completionTokens =
        asNumber(body, ['response', 'usage', 'output_tokens']) ??
        asNumber(body, ['usage', 'output_tokens']) ??
        completionTokens;
    }

    if (!text) {
      throw invokeError('unknown', 'AI provider returned an empty response stream', true);
    }
    return { text, promptTokens, completionTokens, upstreamRequestId };
  }
}

function responsesInput(context: InvokeAdapterContext): Array<{ role: string; content: string }> {
  return context.request.messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({ role: message.role, content: message.content }));
}

function responsesOptions(context: InvokeAdapterContext): Record<string, string> {
  const system = context.request.messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n');
  return system ? { instructions: system } : {};
}

export function openAiResponsesText(value: unknown): string {
  const outputText = asString(value, ['output_text']);
  if (outputText) return outputText;
  const output = pathValue(value, ['output']);
  if (!Array.isArray(output)) return '';
  return output
    .flatMap((item) => {
      const content = pathValue(item, ['content']);
      return Array.isArray(content) ? content : [];
    })
    .map((item) => asString(item, ['text']) ?? asString(item, ['content']) ?? '')
    .filter(Boolean)
    .join('\n');
}

function openAiResponsesDeltaText(value: unknown): string {
  return asString(value, ['delta']) ??
    asString(value, ['text']) ??
    asString(value, ['item', 'content', 0, 'text']) ??
    '';
}
