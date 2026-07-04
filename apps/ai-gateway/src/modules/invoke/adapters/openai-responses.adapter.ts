import type { AiProviderRequestFormat } from '@dicha/shared';
import {
  asNumber,
  asString,
  invokeError,
  openAiBaseUrl,
  openAiHeaders,
  pathValue,
  postJson,
  type InvokeAdapter,
  type InvokeAdapterContext,
  type InvokeAdapterResult,
} from './invoke-adapter';

export class OpenAiResponsesInvokeAdapter implements InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat = 'openai_responses';

  async invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult> {
    const system = context.request.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const input = context.request.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));
    const body = await postJson(
      `${openAiBaseUrl(context.provider.baseUrl)}/responses`,
      {
        ...context.parameterConfig,
        model: context.model.name,
        input,
        stream: false,
        ...(system ? { instructions: system } : {}),
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
