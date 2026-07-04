import { Injectable } from '@nestjs/common';
import type { AiProviderRequestFormat } from '@dicha/shared';
import { AnthropicMessagesInvokeAdapter } from './anthropic-messages.adapter';
import { OpenAiCompatibleInvokeAdapter } from './openai-compatible.adapter';
import { OpenAiResponsesInvokeAdapter } from './openai-responses.adapter';
import type { InvokeAdapter } from './invoke-adapter';

@Injectable()
export class InvokeAdapterRegistry {
  private readonly adapters: Record<AiProviderRequestFormat, InvokeAdapter> = {
    openai_compatible: new OpenAiCompatibleInvokeAdapter(),
    openai_responses: new OpenAiResponsesInvokeAdapter(),
    anthropic_messages: new AnthropicMessagesInvokeAdapter(),
  };

  adapterFor(requestFormat: AiProviderRequestFormat): InvokeAdapter {
    return this.adapters[requestFormat];
  }
}
