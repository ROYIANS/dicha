import { BadRequestException, Body, Controller, Headers, Post, Res, UseGuards } from '@nestjs/common';
import {
  AiInvokeRequestSchema,
  type AiInvokeStreamEvent,
  type AiInvokeRequest,
  type AiInvokeResponse,
} from '@dicha/shared';
import type { Response } from 'express';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { InvokeService } from './invoke.service';

@Controller()
@UseGuards(InternalTokenGuard)
export class InvokeController {
  constructor(private readonly invokeService: InvokeService) {}

  @Post('invoke')
  invoke(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Body() body: AiInvokeRequest,
  ): Promise<AiInvokeResponse> {
    return this.invokeService.invoke(this.ownerId(ownerId), AiInvokeRequestSchema.parse(body));
  }

  @Post('invoke/stream')
  async stream(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Body() body: AiInvokeRequest,
    @Res() response: Response,
  ): Promise<void> {
    const parsed = AiInvokeRequestSchema.parse(body);
    const scopedOwnerId = this.ownerId(ownerId);
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableEnded) controller.abort();
    });
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    try {
      await this.invokeService.stream(scopedOwnerId, parsed, {
        signal: controller.signal,
        emit: (event) => writeSseEvent(response, event),
      });
    } catch {
      writeSseEvent(response, {
        type: 'error',
        errorCategory: 'unknown',
        message: 'AI Gateway stream failed',
        attempts: [],
      });
    } finally {
      response.end();
    }
  }

  private ownerId(value: string | undefined): string {
    if (!value) {
      throw new BadRequestException('AI Gateway user scope is required');
    }
    return value;
  }
}

function writeSseEvent(response: Response, event: AiInvokeStreamEvent): void {
  response.write(`event: ${event.type}\n`);
  response.write(`data: ${JSON.stringify(event)}\n\n`);
}
