import { BadRequestException, Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import {
  AiInvokeRequestSchema,
  type AiInvokeRequest,
  type AiInvokeResponse,
} from '@dicha/shared';
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

  private ownerId(value: string | undefined): string {
    if (!value) {
      throw new BadRequestException('AI Gateway user scope is required');
    }
    return value;
  }
}
