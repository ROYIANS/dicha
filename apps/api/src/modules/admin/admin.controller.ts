import { Controller, Req, UseGuards } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@dicha/shared';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { AdminService } from './admin.service';

type AdminRequest = Request & {
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
};

@Controller()
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @TsRestHandler(contract.admin.getOverview)
  getOverview(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.getOverview>> {
    return tsRestHandler(contract.admin.getOverview, async () => ({
      status: 200,
      body: await this.admin.getOverview(request.user),
    }));
  }

  @TsRestHandler(contract.admin.listUsers)
  listUsers(): ReturnType<typeof tsRestHandler<typeof contract.admin.listUsers>> {
    return tsRestHandler(contract.admin.listUsers, async ({ query }) => ({
      status: 200,
      body: await this.admin.listUsers(query),
    }));
  }

  @TsRestHandler(contract.admin.getUser)
  getUser(): ReturnType<typeof tsRestHandler<typeof contract.admin.getUser>> {
    return tsRestHandler(contract.admin.getUser, async ({ params }) => {
      const user = await this.admin.getUser(params.id);
      if (!user) {
        return { status: 404, body: { message: 'User not found' } };
      }
      return { status: 200, body: user };
    });
  }

  @TsRestHandler(contract.admin.updateUserStatus)
  updateUserStatus(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.updateUserStatus>> {
    return tsRestHandler(contract.admin.updateUserStatus, async ({ params, body }) => ({
      status: 200,
      body: await this.admin.updateUserStatus(params.id, body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.revokeUserSessions)
  revokeUserSessions(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.revokeUserSessions>> {
    return tsRestHandler(contract.admin.revokeUserSessions, async ({ params }) => ({
      status: 200,
      body: await this.admin.revokeUserSessions(params.id, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.getPermissionSummary)
  getPermissionSummary(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.getPermissionSummary>> {
    return tsRestHandler(contract.admin.getPermissionSummary, async () => ({
      status: 200,
      body: this.admin.getPermissionSummary(request.user),
    }));
  }

  @TsRestHandler(contract.admin.listAuditLogs)
  listAuditLogs(): ReturnType<typeof tsRestHandler<typeof contract.admin.listAuditLogs>> {
    return tsRestHandler(contract.admin.listAuditLogs, async ({ query }) => ({
      status: 200,
      body: await this.admin.listAuditLogs(query),
    }));
  }

  @TsRestHandler(contract.admin.getSystemOperations)
  getSystemOperations(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getSystemOperations>
  > {
    return tsRestHandler(contract.admin.getSystemOperations, async () => ({
      status: 200,
      body: await this.admin.getSystemOperations(),
    }));
  }

  @TsRestHandler(contract.admin.runSystemAction)
  runSystemAction(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.runSystemAction>> {
    return tsRestHandler(contract.admin.runSystemAction, async ({ body }) => ({
      status: 200,
      body: await this.admin.runSystemAction(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.getAiProviderDirectory)
  getAiProviderDirectory(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getAiProviderDirectory>
  > {
    return tsRestHandler(contract.admin.getAiProviderDirectory, async () => ({
      status: 200,
      body: await this.admin.getAiProviderDirectory(),
    }));
  }

  @TsRestHandler(contract.admin.updateAiProviderDirectory)
  updateAiProviderDirectory(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.updateAiProviderDirectory>> {
    return tsRestHandler(contract.admin.updateAiProviderDirectory, async ({ body }) => ({
      status: 200,
      body: await this.admin.updateAiProviderDirectory(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.syncAiProviderDirectoryModels)
  syncAiProviderDirectoryModels(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.syncAiProviderDirectoryModels>> {
    return tsRestHandler(contract.admin.syncAiProviderDirectoryModels, async ({ body }) => ({
      status: 200,
      body: await this.admin.syncAiProviderDirectoryModels(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.updateAiProviderDirectoryModel)
  updateAiProviderDirectoryModel(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.updateAiProviderDirectoryModel>> {
    return tsRestHandler(contract.admin.updateAiProviderDirectoryModel, async ({ body }) => ({
      status: 200,
      body: await this.admin.updateAiProviderDirectoryModel(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.getDichaAiService)
  getDichaAiService(): ReturnType<typeof tsRestHandler<typeof contract.admin.getDichaAiService>> {
    return tsRestHandler(contract.admin.getDichaAiService, async () => ({
      status: 200,
      body: await this.admin.getDichaAiService(),
    }));
  }

  @TsRestHandler(contract.admin.upsertDichaInternalProvider)
  upsertDichaInternalProvider(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.upsertDichaInternalProvider>> {
    return tsRestHandler(contract.admin.upsertDichaInternalProvider, async ({ body }) => ({
      status: 200,
      body: await this.admin.upsertDichaInternalProvider(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.syncDichaInternalProviderModels)
  syncDichaInternalProviderModels(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.syncDichaInternalProviderModels>> {
    return tsRestHandler(contract.admin.syncDichaInternalProviderModels, async ({ body }) => ({
      status: 200,
      body: await this.admin.syncDichaInternalProviderModels(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.updateDichaModel)
  updateDichaModel(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.updateDichaModel>> {
    return tsRestHandler(contract.admin.updateDichaModel, async ({ body }) => ({
      status: 200,
      body: await this.admin.updateDichaModel(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.getDichaAiUsage)
  getDichaAiUsage(): ReturnType<typeof tsRestHandler<typeof contract.admin.getDichaAiUsage>> {
    return tsRestHandler(contract.admin.getDichaAiUsage, async ({ query }) => ({
      status: 200,
      body: await this.admin.getDichaAiUsage(query.window, query.logLimit),
    }));
  }

  @TsRestHandler(contract.admin.getDichaAiDiagnostics)
  getDichaAiDiagnostics(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getDichaAiDiagnostics>
  > {
    return tsRestHandler(contract.admin.getDichaAiDiagnostics, async ({ query }) => ({
      status: 200,
      body: await this.admin.getDichaAiDiagnostics(query),
    }));
  }

  @TsRestHandler(contract.admin.getCreditRules)
  getCreditRules(): ReturnType<typeof tsRestHandler<typeof contract.admin.getCreditRules>> {
    return tsRestHandler(contract.admin.getCreditRules, async () => ({
      status: 200,
      body: await this.admin.getCreditRules(),
    }));
  }

  @TsRestHandler(contract.admin.getCreditOperations)
  getCreditOperations(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getCreditOperations>
  > {
    return tsRestHandler(contract.admin.getCreditOperations, async ({ query }) => ({
      status: 200,
      body: await this.admin.getCreditOperations(query),
    }));
  }

  @TsRestHandler(contract.admin.upsertCreditRule)
  upsertCreditRule(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.upsertCreditRule>> {
    return tsRestHandler(contract.admin.upsertCreditRule, async ({ body }) => ({
      status: 200,
      body: await this.admin.upsertCreditRule(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.grantCredits)
  grantCredits(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.grantCredits>> {
    return tsRestHandler(contract.admin.grantCredits, async ({ body }) => ({
      status: 200,
      body: await this.admin.grantCredits(body, auditContext(request)),
    }));
  }

  @TsRestHandler(contract.admin.listCreditBalances)
  listCreditBalances(): ReturnType<typeof tsRestHandler<typeof contract.admin.listCreditBalances>> {
    return tsRestHandler(contract.admin.listCreditBalances, async ({ query }) => ({
      status: 200,
      body: await this.admin.listCreditBalances(query),
    }));
  }

  @TsRestHandler(contract.admin.listCreditLedger)
  listCreditLedger(): ReturnType<typeof tsRestHandler<typeof contract.admin.listCreditLedger>> {
    return tsRestHandler(contract.admin.listCreditLedger, async ({ query }) => ({
      status: 200,
      body: await this.admin.listCreditLedger(query),
    }));
  }

  @TsRestHandler(contract.admin.getCreditRedemptionCodes)
  getCreditRedemptionCodes(): ReturnType<
    typeof tsRestHandler<typeof contract.admin.getCreditRedemptionCodes>
  > {
    return tsRestHandler(contract.admin.getCreditRedemptionCodes, async () => ({
      status: 200,
      body: await this.admin.getCreditRedemptionCodes(),
    }));
  }

  @TsRestHandler(contract.admin.upsertCreditRedemptionCode)
  upsertCreditRedemptionCode(
    @Req() request: AdminRequest,
  ): ReturnType<typeof tsRestHandler<typeof contract.admin.upsertCreditRedemptionCode>> {
    return tsRestHandler(contract.admin.upsertCreditRedemptionCode, async ({ body }) => ({
      status: 200,
      body: await this.admin.upsertCreditRedemptionCode(body, auditContext(request)),
    }));
  }
}

function auditContext(request: AdminRequest) {
  const userAgent = request.headers['user-agent'];
  return {
    actor: request.user,
    ipAddress: request.ip,
    userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
  };
}
