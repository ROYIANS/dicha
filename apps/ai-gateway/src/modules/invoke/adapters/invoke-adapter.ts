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

export interface InvokeAdapter {
  readonly requestFormat: AiProviderRequestFormat;
  invoke(context: InvokeAdapterContext): Promise<InvokeAdapterResult>;
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
