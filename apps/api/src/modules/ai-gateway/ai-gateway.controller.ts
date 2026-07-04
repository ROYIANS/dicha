import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { AiInvokeRequestSchema, contract, type AiInvokeRequest } from '@dicha/shared';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AiGatewayService } from './ai-gateway.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller()
@UseGuards(AuthGuard)
export class AiGatewayController {
  constructor(private readonly aiGateway: AiGatewayService) {}

  @TsRestHandler(contract.ai.getCatalog)
  getCatalog(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.getCatalog>> {
    return tsRestHandler(contract.ai.getCatalog, async () => ({
      status: 200,
      body: await this.aiGateway.getCatalog(request.user.id),
    }));
  }

  @TsRestHandler(contract.ai.updateConfig)
  updateConfig(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.updateConfig>> {
    return tsRestHandler(contract.ai.updateConfig, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.updateConfig(request.user.id, body),
    }));
  }

  @TsRestHandler(contract.ai.syncProviderModels)
  syncProviderModels(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<
    typeof tsRestHandler<typeof contract.ai.syncProviderModels>
  > {
    return tsRestHandler(contract.ai.syncProviderModels, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.syncProviderModels(request.user.id, body),
    }));
  }

  @TsRestHandler(contract.ai.checkProviderConnection)
  checkProviderConnection(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.checkProviderConnection>> {
    return tsRestHandler(contract.ai.checkProviderConnection, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.checkProviderConnection(request.user.id, body),
    }));
  }

  @TsRestHandler(contract.ai.getUsage)
  getUsage(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.getUsage>> {
    return tsRestHandler(contract.ai.getUsage, async ({ query }) => ({
      status: 200,
      body: await this.aiGateway.getUsage(request.user.id, query),
    }));
  }

  @TsRestHandler(contract.ai.invoke)
  invoke(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.ai.invoke>> {
    return tsRestHandler(contract.ai.invoke, async ({ body }) => ({
      status: 200,
      body: await this.aiGateway.invoke(request.user.id, body),
    }));
  }

  @Post('ai/invoke/stream')
  async streamInvoke(
    @Req() request: AuthenticatedRequest,
    @Body() body: AiInvokeRequest,
    @Res() response: Response,
  ): Promise<void> {
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableEnded) controller.abort();
    });
    const upstream = await this.aiGateway.streamInvoke(
      request.user.id,
      AiInvokeRequestSchema.parse(body),
      controller.signal,
    );

    response.status(200);
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    await pipeStream(upstream.body, response);
  }
}

async function pipeStream(stream: ReadableStream<Uint8Array> | null, response: Response): Promise<void> {
  if (!stream) {
    response.end();
    return;
  }
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      response.write(value);
    }
  } finally {
    reader.releaseLock();
    response.end();
  }
}
