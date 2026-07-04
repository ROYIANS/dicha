import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  AiUsageEventSchema,
  AiUsageQuerySchema,
  type AiUsageEvent,
  type AiUsageQuery,
  type AiUsageReport,
} from '@dicha/shared';
import { InternalTokenGuard } from '../../common/internal-token.guard';
import { UsageService } from './usage.service';
import { UsageStore } from './usage.store';

const AiUsageRecordSchema = AiUsageEventSchema.omit({
  id: true,
  createdAt: true,
  totalTokens: true,
  creditAmount: true,
  billingMode: true,
  requestId: true,
  upstreamRequestId: true,
  internalProviderId: true,
  internalProviderModelId: true,
  creditLedgerEntryId: true,
  usageEstimated: true,
}).extend({
  id: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  totalTokens: z.number().int().min(0).optional(),
  creditAmount: AiUsageEventSchema.shape.creditAmount.optional(),
  billingMode: AiUsageEventSchema.shape.billingMode.optional(),
  requestId: AiUsageEventSchema.shape.requestId.optional(),
  upstreamRequestId: AiUsageEventSchema.shape.upstreamRequestId.optional(),
  internalProviderId: AiUsageEventSchema.shape.internalProviderId.optional(),
  internalProviderModelId: AiUsageEventSchema.shape.internalProviderModelId.optional(),
  creditLedgerEntryId: AiUsageEventSchema.shape.creditLedgerEntryId.optional(),
  usageEstimated: AiUsageEventSchema.shape.usageEstimated.optional(),
});

type AiUsageRecord = z.infer<typeof AiUsageRecordSchema>;

@Controller()
@UseGuards(InternalTokenGuard)
export class UsageController {
  constructor(
    private readonly usage: UsageService,
    private readonly store: UsageStore,
  ) {}

  @Get('usage')
  getUsage(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Query() query: AiUsageQuery,
  ): Promise<AiUsageReport> {
    const parsedQuery = AiUsageQuerySchema.parse(query);
    return this.usage.getUsage(this.ownerId(ownerId), parsedQuery.window);
  }

  @Post('usage/events')
  recordUsageEvent(
    @Headers('x-dicha-user-id') ownerId: string | undefined,
    @Body() body: AiUsageRecord,
  ): Promise<AiUsageEvent> {
    return this.store.recordEvent(this.ownerId(ownerId), AiUsageRecordSchema.parse(body));
  }

  private ownerId(value: string | undefined): string {
    if (!value) {
      throw new BadRequestException('AI Gateway user scope is required');
    }
    return value;
  }
}
