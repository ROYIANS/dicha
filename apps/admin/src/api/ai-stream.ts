import {
  AiInvokeStreamEventSchema,
  type AiInvokeRequest,
  type AiInvokeStreamEvent,
} from '@dicha/shared';

export type AiInvokeStreamHandlers = {
  onEvent?: (event: AiInvokeStreamEvent) => void | Promise<void>;
  onStart?: (event: Extract<AiInvokeStreamEvent, { type: 'start' }>) => void | Promise<void>;
  onAttempt?: (event: Extract<AiInvokeStreamEvent, { type: 'attempt' }>) => void | Promise<void>;
  onDelta?: (event: Extract<AiInvokeStreamEvent, { type: 'delta' }>) => void | Promise<void>;
  onFinal?: (event: Extract<AiInvokeStreamEvent, { type: 'final' }>) => void | Promise<void>;
  onError?: (event: Extract<AiInvokeStreamEvent, { type: 'error' }>) => void | Promise<void>;
};

export async function streamAiInvokeEvents(
  input: {
    url: string;
    body: AiInvokeRequest;
    signal?: AbortSignal;
    credentials?: RequestCredentials;
  },
  handlers: AiInvokeStreamHandlers,
): Promise<void> {
  const response = await fetch(input.url, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify(input.body),
    credentials: input.credentials,
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error(await streamErrorMessage(response));
  }
  if (!response.body) {
    throw new Error('AI stream returned an empty response');
  }

  for await (const frame of readSseFrames(response.body)) {
    const parsed = AiInvokeStreamEventSchema.parse(JSON.parse(frame.data));
    await handlers.onEvent?.(parsed);
    if (parsed.type === 'start') await handlers.onStart?.(parsed);
    if (parsed.type === 'attempt') await handlers.onAttempt?.(parsed);
    if (parsed.type === 'delta') await handlers.onDelta?.(parsed);
    if (parsed.type === 'final') await handlers.onFinal?.(parsed);
    if (parsed.type === 'error') await handlers.onError?.(parsed);
  }
}

type SseFrame = {
  data: string;
};

async function* readSseFrames(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const frame = parseSseFrame(part);
        if (frame) yield frame;
      }
    }
    buffer += decoder.decode();
    const trailing = parseSseFrame(buffer);
    if (trailing) yield trailing;
  } finally {
    reader.releaseLock();
  }
}

function parseSseFrame(raw: string): SseFrame | null {
  if (!raw.trim()) return null;
  const data: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('data:')) {
      data.push(line.slice(5).trimStart());
    }
  }
  if (data.length === 0) return null;
  return { data: data.join('\n') };
}

async function streamErrorMessage(response: Response): Promise<string> {
  const fallback = `AI stream failed (${response.status})`;
  const raw = await response.text().catch(() => '');
  if (!raw) return fallback;
  try {
    const body = JSON.parse(raw) as unknown;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string') return `${fallback}: ${message}`;
      if (Array.isArray(message)) return `${fallback}: ${message.join('; ')}`;
    }
  } catch {
    return `${fallback}: ${raw.slice(0, 300)}`;
  }
  return fallback;
}
