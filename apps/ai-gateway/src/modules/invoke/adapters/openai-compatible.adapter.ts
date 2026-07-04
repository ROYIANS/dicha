import type { AiProviderRequestFormat } from '@dicha/shared';
import {
  asNumber,
  asString,
  invokeError,
  openAiBaseUrl,
  openAiHeaders,
  postJson,
  type InvokeAdapter,
  type InvokeAdapterContext,
  type InvokeAdapterResult,
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
}
