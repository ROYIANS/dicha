/// <reference types="vitest/globals" />

import type { AiInvokeRequest, AiModel, AiProvider } from '@dicha/shared';
import { AnthropicMessagesInvokeAdapter } from './anthropic-messages.adapter';
import { OpenAiCompatibleInvokeAdapter } from './openai-compatible.adapter';
import { OpenAiResponsesInvokeAdapter } from './openai-responses.adapter';

const provider: AiProvider = {
  id: 'openai',
  name: 'OpenAI',
  shortName: 'OpenAI',
  description: 'OpenAI-compatible provider',
  baseUrl: 'https://api.example.com/v1',
  status: 'enabled',
  category: 'global',
  authType: 'api_key',
  requestFormat: 'openai_compatible',
  credentialMode: 'user_api_key',
  billingMode: 'user_provider',
  modelSyncMode: 'openai_models_endpoint',
  credentialState: 'configured',
  priority: 10,
};

const model: AiModel = {
  id: 'openai:gpt-test',
  providerId: 'openai',
  name: 'gpt-test',
  displayName: 'GPT Test',
  contextWindow: 128_000,
  modelType: 'chat',
  extensionParameters: [],
  capabilities: ['chat'],
  enabled: true,
  recommended: false,
  availability: 'healthy',
  lastLatencyMs: null,
  priceHint: 'Test price',
};

const request: AiInvokeRequest = {
  useCase: 'assistant',
  messages: [
    { role: 'system', content: 'You are concise.' },
    { role: 'user', content: 'Hello' },
  ],
  maxTokens: 64,
  temperature: 0.2,
};

describe('invoke adapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('parses OpenAI-compatible chat completions', async () => {
    const fetchMock = mockJsonResponse({
      id: 'chatcmpl-1',
      choices: [{ message: { content: 'Hello from chat' } }],
      usage: { prompt_tokens: 12, completion_tokens: 4 },
    });

    const result = await new OpenAiCompatibleInvokeAdapter().invoke({
      provider,
      model,
      request,
      secret: 'sk-test',
      parameterConfig: { top_p: 0.9 },
      signal: new AbortController().signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer sk-test' }),
      }),
    );
    expect(result).toEqual({
      text: 'Hello from chat',
      promptTokens: 12,
      completionTokens: 4,
      upstreamRequestId: 'chatcmpl-1',
    });
  });

  test('parses OpenAI-compatible chat completion streams', async () => {
    mockEventStreamResponse([
      'data: {"id":"chatcmpl-stream-1","choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"id":"chatcmpl-stream-1","choices":[{"delta":{"content":" stream"}}]}',
      'data: {"id":"chatcmpl-stream-1","choices":[],"usage":{"prompt_tokens":9,"completion_tokens":3}}',
      'data: [DONE]',
    ]);
    const deltas: string[] = [];

    const result = await new OpenAiCompatibleInvokeAdapter().stream(
      {
        provider,
        model,
        request,
        secret: 'sk-test',
        parameterConfig: {},
        signal: new AbortController().signal,
      },
      ({ text }) => {
        deltas.push(text);
      },
    );

    expect(deltas).toEqual(['Hello', ' stream']);
    expect(result).toEqual({
      text: 'Hello stream',
      promptTokens: 9,
      completionTokens: 3,
      upstreamRequestId: 'chatcmpl-stream-1',
    });
  });

  test('parses OpenAI Responses output text and usage', async () => {
    mockJsonResponse({
      id: 'resp-1',
      output_text: 'Hello from responses',
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const result = await new OpenAiResponsesInvokeAdapter().invoke({
      provider: { ...provider, requestFormat: 'openai_responses' },
      model,
      request,
      secret: 'sk-test',
      parameterConfig: {},
      signal: new AbortController().signal,
    });

    expect(result).toEqual({
      text: 'Hello from responses',
      promptTokens: 10,
      completionTokens: 5,
      upstreamRequestId: 'resp-1',
    });
  });

  test('parses OpenAI Responses streams', async () => {
    mockEventStreamResponse([
      'event: response.output_text.delta\ndata: {"id":"resp-stream-1","delta":"Hello"}',
      'event: response.output_text.delta\ndata: {"id":"resp-stream-1","delta":" responses"}',
      'event: response.completed\ndata: {"response":{"id":"resp-stream-1","usage":{"input_tokens":7,"output_tokens":4}}}',
    ]);
    const deltas: string[] = [];

    const result = await new OpenAiResponsesInvokeAdapter().stream(
      {
        provider: { ...provider, requestFormat: 'openai_responses' },
        model,
        request,
        secret: 'sk-test',
        parameterConfig: {},
        signal: new AbortController().signal,
      },
      ({ text }) => {
        deltas.push(text);
      },
    );

    expect(deltas).toEqual(['Hello', ' responses']);
    expect(result).toEqual({
      text: 'Hello responses',
      promptTokens: 7,
      completionTokens: 4,
      upstreamRequestId: 'resp-stream-1',
    });
  });

  test('parses Anthropic Messages content and usage', async () => {
    const fetchMock = mockJsonResponse({
      id: 'msg-1',
      content: [{ type: 'text', text: 'Hello from Claude' }],
      usage: { input_tokens: 8, output_tokens: 6 },
    });

    const result = await new AnthropicMessagesInvokeAdapter().invoke({
      provider: {
        ...provider,
        baseUrl: 'https://api.anthropic.example.com/v1/messages',
        authType: 'api_key',
        requestFormat: 'anthropic_messages',
      },
      model: { ...model, name: 'claude-test' },
      request,
      secret: 'anthropic-key',
      parameterConfig: {},
      signal: new AbortController().signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.example.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'anthropic-version': '2023-06-01',
          'x-api-key': 'anthropic-key',
        }),
      }),
    );
    expect(result).toEqual({
      text: 'Hello from Claude',
      promptTokens: 8,
      completionTokens: 6,
      upstreamRequestId: 'msg-1',
    });
  });

  test('parses Anthropic Messages streams', async () => {
    mockEventStreamResponse([
      'event: message_start\ndata: {"message":{"id":"msg-stream-1","usage":{"input_tokens":8}}}',
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"Hello"}}',
      'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":" Claude"}}',
      'event: message_delta\ndata: {"usage":{"output_tokens":5}}',
      'event: message_stop\ndata: {"type":"message_stop"}',
    ]);
    const deltas: string[] = [];

    const result = await new AnthropicMessagesInvokeAdapter().stream(
      {
        provider: {
          ...provider,
          baseUrl: 'https://api.anthropic.example.com/v1/messages',
          authType: 'api_key',
          requestFormat: 'anthropic_messages',
        },
        model: { ...model, name: 'claude-test' },
        request,
        secret: 'anthropic-key',
        parameterConfig: {},
        signal: new AbortController().signal,
      },
      ({ text }) => {
        deltas.push(text);
      },
    );

    expect(deltas).toEqual(['Hello', ' Claude']);
    expect(result).toEqual({
      text: 'Hello Claude',
      promptTokens: 8,
      completionTokens: 5,
      upstreamRequestId: 'msg-stream-1',
    });
  });
});

function mockJsonResponse(body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function mockEventStreamResponse(frames: string[]): ReturnType<typeof vi.fn> {
  const body = `${frames.join('\n\n')}\n\n`;
  const fetchMock = vi.fn(
    async () =>
      new Response(body, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
