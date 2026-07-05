import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@dicha/shared';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreditsService } from './credits.service';

type AuthenticatedRequest = Request & { user: { id: string } };

@Controller()
@UseGuards(AuthGuard)
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @TsRestHandler(contract.credits.getBalance)
  getBalance(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.credits.getBalance>> {
    return tsRestHandler(contract.credits.getBalance, async () => ({
      status: 200,
      body: await this.credits.getBalance(request.user.id),
    }));
  }

  @TsRestHandler(contract.credits.getLedger)
  getLedger(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.credits.getLedger>> {
    return tsRestHandler(contract.credits.getLedger, async ({ query }) => ({
      status: 200,
      body: await this.credits.listLedger(request.user.id, query),
    }));
  }

  @TsRestHandler(contract.credits.redeemCode)
  redeemCode(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.credits.redeemCode>> {
    return tsRestHandler(contract.credits.redeemCode, async ({ body }) => ({
      status: 200,
      body: await this.credits.redeemCode(request.user.id, body.code),
    }));
  }

  @TsRestHandler(contract.credits.getCheckInStatus)
  getCheckInStatus(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.credits.getCheckInStatus>> {
    return tsRestHandler(contract.credits.getCheckInStatus, async () => ({
      status: 200,
      body: await this.credits.getCheckInStatus(request.user.id),
    }));
  }

  @TsRestHandler(contract.credits.checkInToday)
  checkInToday(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.credits.checkInToday>> {
    return tsRestHandler(contract.credits.checkInToday, async () => ({
      status: 200,
      body: await this.credits.checkInToday(request.user.id),
    }));
  }
}
