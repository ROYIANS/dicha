import type { AiProviderRequestFormat } from '@dicha/shared';
import {
  asNumber,
  asString,
  invokeError,
  openAiBaseUrl,
  openAiHeaders,
  postEventStream,
  postJson,
  safeParseJson,
  type InvokeAdapter,
  type InvokeAdapterContext,
  type InvokeAdapterResult,
  type InvokeAdapterStreamDelta,
} from './invoke-adapter';

export class OpenAiCompatibleInvokeAdapter implements InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat = 'openai_compatible';

  async invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult> {
    const body = await postJson(
      `${openAiBaseUrl(context.provider.baseUrl)}/chat/completions`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        messages: context.request.messages,
        stream: false,
        ...(context.request.maxTokens ? { max_tokens: context.request.maxTokens } : {}),
        ...(context.request.temperature !== undefined ? { temperature: context.request.temperature } : {}),
      },
      openAiHeaders(context.provider, context.secret),
      context.signal,
    );
    const text =
      asString(body, ['choices', 0, 'message', 'content']) ??
      asString(body, ['choices', 0, 'text']) ??
      '';
    if (!text) {
      throw invokeError('unknown', 'AI provider returned an empty completion', true);
    }
    return {
      text,
      promptTokens: asNumber(body, ['usage', 'prompt_tokens']) ?? 0,
      completionTokens: asNumber(body, ['usage', 'completion_tokens']) ?? 0,
      upstreamRequestId: asString(body, ['id']) ?? null,
    };
  }

  async stream(
    context: InvokeAdapterContext,
    onDelta: (delta: InvokeAdapterStreamDelta) => void | Promise<void>,
  ): Promise<InvokeAdapterResult> {
    const messages = await postEventStream(
      `${openAiBaseUrl(context.provider.baseUrl)}/chat/completions`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        messages: context.request.messages,
        stream: true,
        stream_options: { include_usage: true },
        ...(context.request.maxTokens ? { max_tokens: context.request.maxTokens } : {}),
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
      upstreamRequestId = asString(body, ['id']) ?? upstreamRequestId;
      const delta =
        asString(body, ['choices', 0, 'delta', 'content']) ??
        asString(body, ['choices', 0, 'text']) ??
        '';
      if (delta) {
        text += delta;
        await onDelta({ text: delta });
      }
      promptTokens = asNumber(body, ['usage', 'prompt_tokens']) ?? promptTokens;
      completionTokens = asNumber(body, ['usage', 'completion_tokens']) ?? completionTokens;
    }

    if (!text) {
      throw invokeError('unknown', 'AI provider returned an empty completion stream', true);
    }
    return { text, promptTokens, completionTokens, upstreamRequestId };
  }
}
