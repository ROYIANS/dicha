import type {
  AiInvokeErrorCategory,
  AiInvokeRequest,
  AiModel,
  AiProvider,
  AiProviderRequestFormat,
} from '@dicha/shared';
import { InvokeError, sanitizedAiMessage } from './invoke-error';

export type InvokeAdapterContext = {
  provider: AiProvider;
  model: AiModel;
  request: AiInvokeRequest;
  secret: string;
  parameterConfig: Record<string, unknown>;
  signal: AbortSignal;
};

export type InvokeAdapterResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
  upstreamRequestId: string | null;
};

export type InvokeAdapterStreamDelta = {
  text: string;
};

export interface InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat;
  invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult>;
  stream(
    context: InvokeAdapterContext,
    onDelta: (delta: InvokeAdapterStreamDelta) => void | Promise<void>,
  ): Promise<InvokeAdapterResult>;
}

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new InvokeError('network', 'AI provider network request failed', true);
  }

  const raw = await response.text();
  const parsed = raw ? safeJson(raw) : {};
  if (!response.ok) {
    throw upstreamError(response.status, parsed, raw);
  }
  return parsed;
}

export async function postEventStream(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<AsyncGenerator<EventStreamMessage>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'text/event-stream',
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new InvokeError('network', 'AI provider network request failed', true);
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    const parsed = raw ? safeJson(raw) : {};
    throw upstreamError(response.status, parsed, raw);
  }
  if (!response.body) {
    throw new InvokeError('unknown', 'AI provider returned an empty stream', true);
  }
  return readEventStream(response.body);
}

export type EventStreamMessage = {
  event: string;
  data: string;
};

export async function* readEventStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<EventStreamMessage> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const message = eventStreamMessage(part);
        if (message) yield message;
      }
    }
    buffer += decoder.decode();
    const trailing = eventStreamMessage(buffer);
    if (trailing) yield trailing;
  } finally {
    reader.releaseLock();
  }
}

function eventStreamMessage(raw: string): EventStreamMessage | null {
  if (!raw.trim()) return null;
  let event = '';
  const data: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      data.push(line.slice(5).trimStart());
    }
  }
  if (data.length === 0) return null;
  return { event, data: data.join('\n') };
}

export function safeParseJson(value: string): unknown {
  return safeJson(value);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function asString(value: unknown, path: Array<string | number>): string | undefined {
  const item = pathValue(value, path);
  return typeof item === 'string' ? item : undefined;
}

export function asNumber(value: unknown, path: Array<string | number>): number | undefined {
  const item = pathValue(value, path);
  return typeof item === 'number' && Number.isFinite(item) ? item : undefined;
}

export function pathValue(value: unknown, path: Array<string | number>): unknown {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      if (typeof key !== 'number') return undefined;
      current = current[key];
      continue;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function openAiBaseUrl(baseUrl: string): string {
  return baseUrl
    .replace(/\/+$/, '')
    .replace(/\/(?:chat\/completions|responses)\/?$/, '');
}

export function anthropicBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '').replace(/\/v1(?:\/messages)?\/?$/, '');
}

export function openAiHeaders(provider: AiProvider, secret: string): Record<string, string> {
  if (provider.authType === 'none' || !secret) return {};
  return { authorization: `Bearer ${secret}` };
}

export function anthropicHeaders(secret: string): Record<string, string> {
  return {
    'anthropic-version': '2023-06-01',
    ...(secret ? { 'x-api-key': secret } : {}),
  };
}

function upstreamError(status: number, parsed: unknown, raw: string): InvokeError {
  const message = sanitizedAiMessage(
    (asString(parsed, ['error', 'message']) ??
      asString(parsed, ['message']) ??
      raw) ||
      `AI provider request failed (${status})`,
  );
  if (status === 401 || status === 403) return new InvokeError('auth', message, false);
  if (status === 402) return new InvokeError('quota', message, false);
  if (status === 404) return new InvokeError('model_not_found', message, true);
  if (status === 408 || status === 409 || status === 423 || status === 425) {
    return new InvokeError('provider_unavailable', message, true);
  }
  if (status === 429) return new InvokeError('rate_limit', message, true);
  if (status >= 500) return new InvokeError('provider_unavailable', message, true);

  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('context') || lowerMessage.includes('token')) {
    return new InvokeError('context_limit', message, false);
  }
  if (lowerMessage.includes('safety') || lowerMessage.includes('moderation') || lowerMessage.includes('policy')) {
    return new InvokeError('content_safety', message, false);
  }
  return new InvokeError('invalid_request', message, false);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

export function invokeError(
  category: AiInvokeErrorCategory,
  message: string,
  retryable: boolean,
): InvokeError {
  return new InvokeError(category, message, retryable);
}
