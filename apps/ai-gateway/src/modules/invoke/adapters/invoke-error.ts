import type { AiInvokeErrorCategory } from '@dicha/shared';

export class InvokeError extends Error {
  constructor(
    readonly category: AiInvokeErrorCategory,
    message: string,
    readonly retryable: boolean,
  ) {
    super(sanitizedAiMessage(message));
    this.name = 'InvokeError';
  }
}

export function sanitizedAiMessage(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]+/g, 'sk-[redacted]')
    .slice(0, 500);
}
