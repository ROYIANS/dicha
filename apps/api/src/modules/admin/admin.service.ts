import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { exec } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, readdir, readFile, stat, statfs } from 'node:fs/promises';
import * as os from 'node:os';
import { promisify } from 'node:util';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminAuditLog,
  AdminAuditLogsPage,
  AdminAuditLogsQuery,
  AdminAiInternalProvider,
  AdminAiInternalProviderUpsert,
  AdminCreditBalancesPage,
  AdminCreditBalancesQuery,
  AdminCreditGrant,
  AdminCreditGrantResponse,
  AdminCreditCheckInCampaignUpsert,
  AdminCreditCheckInOverview,
  AdminCreditLedgerPage,
  AdminCreditLedgerQuery,
  AdminCreditOperationsQuery,
  AdminCreditOperationsReport,
  AdminCreditRedemptionCode,
  AdminCreditRedemptionCodeUpsert,
  AdminCreditRedemptionCodesOverview,
  AdminCreditRule,
  AdminCreditRulesOverview,
  AdminCreditRuleUpsert,
  AdminAiProviderDirectoryItem,
  AdminAiProviderDirectoryModelUpdate,
  AdminAiProviderDirectoryOverview,
  AdminAiProviderDirectorySync,
  AdminAiProviderDirectorySyncResponse,
  AdminAiProviderDirectoryUpdate,
  AdminDichaAiServiceOverview,
  AdminDichaAiDiagnosticsQuery,
  AdminDichaAiDiagnosticsReport,
  AdminDichaAiUsageEvent,
  AdminDichaAiUsageReport,
  AdminDichaInternalProviderSync,
  AdminDichaInternalProviderSyncResponse,
  AdminDichaModelUpdate,
  AdminOverview,
  AdminPermissionSummary,
  AdminPlatformStats,
  AdminUserDetail,
  AdminUserSecurityActionResponse,
  AdminSystemActionResult,
  AdminSystemActionRun,
  AdminSystemOperations,
  AdminSystemService,
  AdminUsersList,
  AdminUsersQuery,
  AdminUserStatusUpdate,
  AiInvokeErrorCategory,
  AiModel,
  AiModelCapability,
  AiModelExtensionParameter,
  AiModelType,
  AiProvider,
  AiProviderRemoteModel,
  AiUsageBreakdown,
  AiUsageBucketGranularity,
  AiUsageDistribution,
  AiUsageDistributionGroupBy,
  AiUsagePerformance,
  AiUsageSummary,
  AiUsageStatus,
  AiUsageTimeBucket,
  AiUsageWindow,
} from '@dicha/shared';
import { aiModelBank, aiProviderTemplates } from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';

type AdminSessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

type AdminAuditContext = {
  actor: AdminSessionUser;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AdminRuntimeLogFile = {
  id: string;
  name: string;
  path: string;
};

type AdminDichaUsageRecord = Prisma.AiUsageEventGetPayload<{
  include: typeof adminUsageOwnerInclude;
}>;

const adminUsageOwnerInclude = {
  owner: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
} satisfies Prisma.AiUsageEventInclude;

const DICHA_PROVIDER_ID = 'dicha';
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MINUTE_MS = 60 * 1000;
const MAX_HOURLY_BUCKETS = 24 * 7;
const execAsync = promisify(exec);

@Injectable()
export class AdminService {
  private readonly aiEncryptionKey: Buffer;
  private readonly aiGatewayBaseUrl: string;
  private readonly uploadDir: string;
  private readonly smtpHost?: string;
  private readonly redisUrl?: string;
  private readonly clickHouseUrl?: string;
  private readonly backupDir?: string;
  private readonly backupCommand?: string;
  private readonly restartApiCommand?: string;
  private readonly restartAiGatewayCommand?: string;
  private readonly clearCacheCommand?: string;
  private readonly runtimeLogFiles: AdminRuntimeLogFile[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('AI_GATEWAY_SECRET_KEY') ?? this.developmentAiSecret(config);
    this.aiEncryptionKey = createHash('sha256').update(secret).digest();
    this.aiGatewayBaseUrl = config.get<string>('AI_GATEWAY_BASE_URL', 'http://localhost:3100/ai');
    this.uploadDir = config.get<string>('UPLOAD_DIR', './uploads');
    this.smtpHost = config.get<string>('SMTP_HOST');
    this.redisUrl = config.get<string>('REDIS_URL');
    this.clickHouseUrl = config.get<string>('CLICKHOUSE_URL');
    this.backupDir = config.get<string>('DICHA_ADMIN_BACKUP_DIR');
    this.backupCommand = config.get<string>('DICHA_ADMIN_BACKUP_COMMAND');
    this.restartApiCommand = config.get<string>('DICHA_ADMIN_RESTART_API_COMMAND');
    this.restartAiGatewayCommand = config.get<string>('DICHA_ADMIN_RESTART_AI_GATEWAY_COMMAND');
    this.clearCacheCommand = config.get<string>('DICHA_ADMIN_CLEAR_CACHE_COMMAND');
    this.runtimeLogFiles = parseRuntimeLogFiles(config.get<string>('DICHA_ADMIN_LOG_FILES'));
  }

  async getOverview(user: AdminSessionUser): Promise<AdminOverview> {
    const stats = await this.getPlatformStats();

    return {
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email.split('@')[0] ?? 'admin',
      },
      stats,
      modules: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          description: '平台总览、关键统计与管理入口。',
          status: 'ready',
        },
        {
          id: 'basic',
          title: '用户管理',
          description: '用户列表、基础资料与登录信息已经接入真实平台数据。',
          status: 'ready',
        },
        {
          id: 'aiProviders',
          title: 'AI 服务',
          description: '用户侧供应商目录与 Dicha 官方内部通道分开维护。',
          status: 'ready',
        },
        {
          id: 'credits',
          title: '积分与计费',
          description: '积分规则、发放、余额、流水、兑换码和运营看板已经接入。',
          status: 'ready',
        },
        {
          id: 'permissions',
          title: '角色与权限',
          description: '当前采用普通用户与超级管理员的轻量权限模型。',
          status: 'ready',
        },
        {
          id: 'auditLogs',
          title: '审计日志',
          description: '后台关键写操作会记录操作人、对象、结果和安全摘要。',
          status: 'ready',
        },
        {
          id: 'system',
          title: '系统功能',
          description: '服务健康、配置摘要与维护任务入口。',
          status: 'planned',
        },
        {
          id: 'analytics',
          title: '统计看板',
          description: '平台级统计和消费概览的后续入口。',
          status: 'planned',
        },
      ],
    };
  }

  getPermissionSummary(user: AdminSessionUser): AdminPermissionSummary {
    const superAdminPermissions = [
      'admin.read',
      'users.manage',
      'audit.read',
      'ai.manage',
      'credits.manage',
      'system.read',
    ];

    return {
      generatedAt: new Date().toISOString(),
      roles: [
        {
          id: 'user',
          name: '普通用户',
          description: '默认前台用户，只能访问自己的数据与个人设置。',
          source: 'Better Auth account',
          permissions: ['self.read', 'self.update'],
        },
        {
          id: 'super_admin',
          name: '超级管理员',
          description: '由服务端 DICHA_SUPER_ADMIN_EMAILS 派生，拥有后台管理权限。',
          source: 'DICHA_SUPER_ADMIN_EMAILS',
          permissions: superAdminPermissions,
        },
      ],
      currentAdmin: {
        id: user.id,
        email: user.email,
        role: 'super_admin',
        permissions: superAdminPermissions,
      },
    };
  }

  async listAuditLogs(query: AdminAuditLogsQuery): Promise<AdminAuditLogsPage> {
    const now = new Date();
    const from = auditWindowStart(now, query.window);
    const andWhere: Prisma.AdminAuditLogWhereInput[] = [from ? { createdAt: { gte: from } } : {}];
    if (query.action) andWhere.push({ action: query.action });
    if (query.resourceType) andWhere.push({ resourceType: query.resourceType });
    if (query.result) andWhere.push({ result: query.result });
    if (query.search) {
      const mode = Prisma.QueryMode.insensitive;
      andWhere.push({
        OR: [
          { actorEmail: { contains: query.search, mode } },
          { actorName: { contains: query.search, mode } },
          { resourceId: { contains: query.search, mode } },
          { summary: { contains: query.search, mode } },
        ],
      });
    }
    const where: Prisma.AdminAuditLogWhereInput = { AND: andWhere };
    const [total, logs, optionRows] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.adminAuditLog.findMany({
        where: from ? { createdAt: { gte: from } } : {},
        select: { action: true, resourceType: true },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      logs: logs.map(toAdminAuditLog),
      filters: {
        actions: [...new Set(optionRows.map((row) => row.action))].sort(),
        resourceTypes: [...new Set(optionRows.map((row) => row.resourceType))].sort(),
      },
    };
  }

  async getSystemOperations(): Promise<AdminSystemOperations> {
    const generatedAt = new Date();
    const [
      database,
      aiGateway,
      localStorage,
      mailService,
      clickHouse,
      redis,
      hostDisk,
      backup,
      logsSummary,
      expiredSessions,
      disabledUsers,
      recentFailures,
      recentAuditLogs,
    ] = await Promise.all([
        this.checkDatabase(),
        this.checkAiGateway(),
        this.checkLocalStorage(),
        this.checkMailService(),
        this.checkConfiguredExternalService('clickhouse', 'ClickHouse', 'analytics', this.clickHouseUrl),
        this.checkConfiguredExternalService('redis', 'Redis', 'cache', this.redisUrl),
        this.checkDisk(),
        this.backupSummary(),
        this.runtimeLogsSummary(),
        this.prisma.session.count({ where: { expiresAt: { lt: generatedAt } } }),
        this.prisma.user.count({ where: { status: 'disabled' } }),
        this.prisma.adminAuditLog.count({
          where: {
            result: 'failure',
            createdAt: { gte: new Date(generatedAt.getTime() - DAY_MS) },
          },
        }),
        this.prisma.adminAuditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ]);
    const memory = process.memoryUsage();
    const externalServices = [
      {
        id: 'postgresql',
        name: 'PostgreSQL',
        category: 'database' as const,
        configured: true,
        status: database.status,
        detail:
          database.status === 'healthy' ? '主业务数据库可访问' : '主业务数据库探针异常',
        checkedAt: generatedAt.toISOString(),
        latencyMs: database.latencyMs,
      },
      localStorage,
      mailService,
      aiGateway,
      redis,
      clickHouse,
    ];

    return {
      generatedAt: generatedAt.toISOString(),
      runtime: {
        nodeVersion: process.version,
        platform: `${process.platform}/${process.arch}`,
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          rssMb: bytesToMb(memory.rss),
          heapUsedMb: bytesToMb(memory.heapUsed),
          heapTotalMb: bytesToMb(memory.heapTotal),
        },
      },
      host: {
        cpu: hostCpuSummary(),
        disk: hostDisk,
      },
      database,
      services: [
        {
          id: 'api',
          name: 'Dicha API',
          category: 'runtime',
          configured: true,
          status: database.status === 'healthy' ? 'healthy' : 'degraded',
          detail:
            database.status === 'healthy'
              ? 'API 正常响应，数据库可访问'
              : 'API 可响应，但数据库探针异常',
          checkedAt: generatedAt.toISOString(),
          latencyMs: database.latencyMs,
        },
        aiGateway,
      ],
      externalServices,
      maintenance: {
        expiredSessions,
        disabledUsers,
        recentFailures,
      },
      backup,
      logs: logsSummary,
      cache: cacheSummary(this.redisUrl),
      actions: this.systemActions(),
      recentAuditLogs: recentAuditLogs.map(toAdminAuditLog),
    };
  }

  async runSystemAction(
    body: AdminSystemActionRun,
    audit: AdminAuditContext,
  ): Promise<AdminSystemActionResult> {
    if (
      body.actionId === 'refresh_health' ||
      body.actionId === 'inspect_audit_logs' ||
      body.actionId === 'inspect_runtime_logs' ||
      body.actionId === 'inspect_cache'
    ) {
      const messages: Record<typeof body.actionId, string> = {
        refresh_health: '健康检查已刷新',
        inspect_audit_logs: '审计日志入口已确认',
        inspect_runtime_logs: '运行日志入口已确认',
        inspect_cache: '缓存状态已刷新',
      };
      await this.recordAuditLog(audit, {
        action: `system.${body.actionId}`,
        resourceType: 'system',
        resourceId: body.actionId,
        summary: messages[body.actionId],
        metadata: this.safeMetadata({ actionId: body.actionId }),
      });
      return {
        actionId: body.actionId,
        status: 'completed',
        message: messages[body.actionId],
        affectedCount: null,
        operations: await this.getSystemOperations(),
      };
    }

    if (body.actionId === 'prune_expired_sessions') {
      const result = await this.prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      await this.recordAuditLog(audit, {
        action: 'system.prune_expired_sessions',
        resourceType: 'system',
        resourceId: 'session',
        summary: `清理 ${result.count} 个过期登录会话`,
        metadata: this.safeMetadata({ affectedCount: result.count }),
      });
      return {
        actionId: body.actionId,
        status: 'completed',
        message: `已清理 ${result.count} 个过期登录会话`,
        affectedCount: result.count,
        operations: await this.getSystemOperations(),
      };
    }

    const commandByAction: Partial<Record<AdminSystemActionRun['actionId'], string | undefined>> = {
      run_backup: this.backupCommand,
      restart_api: this.restartApiCommand,
      restart_ai_gateway: this.restartAiGatewayCommand,
      clear_runtime_cache: this.clearCacheCommand,
    };
    if (commandByAction[body.actionId]) {
      return this.runConfiguredSystemCommand(body.actionId, commandByAction[body.actionId], audit);
    }

    const action = this.systemActions().find((item) => item.id === body.actionId);
    if (!action || action.executable) {
      throw new BadRequestException('Unknown system action');
    }
    await this.recordAuditLog(audit, {
      action: `system.${body.actionId}`,
      resourceType: 'system',
      resourceId: body.actionId,
      summary: action.title,
      metadata: this.safeMetadata({ actionId: body.actionId, executable: false }),
    });
    return {
      actionId: body.actionId,
      status: 'skipped',
      message: action.disabledReason ?? '该操作需要外部运维编排执行',
      affectedCount: null,
      operations: await this.getSystemOperations(),
    };
  }

  async getAiProviderDirectory(): Promise<AdminAiProviderDirectoryOverview> {
    const [settings, directoryModels] = await Promise.all([
      this.prisma.aiProviderDirectorySetting.findMany(),
      this.prisma.aiProviderDirectoryModel.findMany({
        orderBy: [{ providerId: 'asc' }, { enabled: 'desc' }, { displayName: 'asc' }],
      }),
    ]);
    const settingsByProvider = new Map(settings.map((setting) => [setting.providerId, setting]));
    const directoryModelsByProvider = this.groupByProviderId(directoryModels);
    const models = this.directoryOverviewModels(directoryModelsByProvider);
    const modelCountsByProvider = this.countDirectoryModels(models);

    return {
      generatedAt: new Date().toISOString(),
      providers: aiProviderTemplates
        .filter((provider) => provider.id !== DICHA_PROVIDER_ID)
        .map((provider) => {
          const setting = settingsByProvider.get(provider.id);
          const counts = modelCountsByProvider.get(provider.id) ?? {
            modelCount: 0,
            enabledModelCount: 0,
          };
          return {
            providerId: provider.id,
            name: provider.name,
            shortName: provider.shortName,
            category: provider.category,
            credentialMode: provider.credentialMode,
            billingMode: provider.billingMode,
            modelSyncMode: provider.modelSyncMode,
            status: provider.status,
            modelCount: counts.modelCount,
            enabledModelCount: counts.enabledModelCount,
            enabled: setting?.enabled ?? false,
            baseUrl: setting?.baseUrl ?? provider.baseUrl,
            requestFormat: (setting?.requestFormat ?? provider.requestFormat) as
              AiProvider['requestFormat'] | undefined,
            authType: (setting?.authType ?? provider.authType) as AiProvider['authType'],
            notes: setting?.notes ?? null,
          };
        })
        .sort((left, right) => {
          if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
          return left.name.localeCompare(right.name);
        }),
      models,
    };
  }

  async updateAiProviderDirectory(
    body: AdminAiProviderDirectoryUpdate,
    audit: AdminAuditContext,
  ): Promise<AdminAiProviderDirectoryItem> {
    const provider = aiProviderTemplates.find((item) => item.id === body.providerId);
    if (!provider || provider.id === DICHA_PROVIDER_ID) {
      throw new BadRequestException('Unknown user-facing AI provider');
    }

    await this.prisma.aiProviderDirectorySetting.upsert({
      where: { providerId: body.providerId },
      update: {
        enabled: body.enabled,
        baseUrl: body.baseUrl,
        requestFormat: body.requestFormat,
        authType: body.authType,
        notes: body.notes,
      },
      create: {
        providerId: body.providerId,
        enabled: body.enabled ?? false,
        baseUrl: body.baseUrl ?? provider.baseUrl,
        requestFormat: body.requestFormat ?? provider.requestFormat,
        authType: body.authType ?? provider.authType,
        modelSyncMode: provider.modelSyncMode,
        notes: body.notes ?? null,
      },
    });

    const overview = await this.getAiProviderDirectory();
    const updated = overview.providers.find((item) => item.providerId === provider.id);
    if (updated) {
      await this.recordAuditLog(audit, {
        action: 'ai.provider_directory.update',
        resourceType: 'ai_provider',
        resourceId: provider.id,
        summary: `更新用户侧 AI 供应商 ${provider.name}`,
        metadata: this.safeMetadata({
          providerId: provider.id,
          enabled: body.enabled,
          baseUrlChanged: body.baseUrl !== undefined,
          requestFormat: body.requestFormat,
          authType: body.authType,
        }),
      });
      return updated;
    }
    const counts = this.countDirectoryModels(overview.models).get(provider.id) ?? {
      modelCount: 0,
      enabledModelCount: 0,
    };
    const fallbackResponse = {
      providerId: provider.id,
      name: provider.name,
      shortName: provider.shortName,
      category: provider.category,
      credentialMode: provider.credentialMode,
      billingMode: provider.billingMode,
      modelSyncMode: provider.modelSyncMode,
      status: provider.status,
      modelCount: counts.modelCount,
      enabledModelCount: counts.enabledModelCount,
      enabled: body.enabled ?? false,
      baseUrl: body.baseUrl ?? provider.baseUrl,
      requestFormat: body.requestFormat ?? provider.requestFormat,
      authType: body.authType ?? provider.authType,
      notes: body.notes ?? null,
    };
    await this.recordAuditLog(audit, {
      action: 'ai.provider_directory.update',
      resourceType: 'ai_provider',
      resourceId: provider.id,
      summary: `更新用户侧 AI 供应商 ${provider.name}`,
      metadata: this.safeMetadata({ providerId: provider.id, enabled: body.enabled }),
    });
    return fallbackResponse;
  }

  async syncAiProviderDirectoryModels(
    body: AdminAiProviderDirectorySync,
    audit: AdminAuditContext,
  ): Promise<AdminAiProviderDirectorySyncResponse> {
    const provider = aiProviderTemplates.find((item) => item.id === body.providerId);
    if (!provider || provider.id === DICHA_PROVIDER_ID) {
      throw new BadRequestException('Unknown user-facing AI provider');
    }
    const setting = await this.prisma.aiProviderDirectorySetting.findUnique({
      where: { providerId: provider.id },
    });
    const baseUrl = setting?.baseUrl ?? provider.baseUrl;
    const requestFormat = setting?.requestFormat ?? provider.requestFormat;
    if (requestFormat !== 'openai_compatible') {
      throw new BadRequestException('Only OpenAI-compatible model sync is supported for now');
    }

    const remoteModels = await this.fetchModelsWithModelBankFallback(provider.id, baseUrl);
    await this.upsertDirectoryModels(provider.id, remoteModels);
    const response = { providerId: provider.id, syncedCount: remoteModels.length };
    await this.recordAuditLog(audit, {
      action: 'ai.provider_directory.sync_models',
      resourceType: 'ai_provider',
      resourceId: provider.id,
      summary: `同步用户侧 AI 供应商 ${provider.name} 的模型`,
      metadata: this.safeMetadata(response),
    });
    return response;
  }

  async updateAiProviderDirectoryModel(
    body: AdminAiProviderDirectoryModelUpdate,
    audit: AdminAuditContext,
  ): Promise<AdminAiProviderDirectoryOverview> {
    const provider = aiProviderTemplates.find((item) => item.id === body.providerId);
    if (!provider || provider.id === DICHA_PROVIDER_ID) {
      throw new BadRequestException('Unknown user-facing AI provider');
    }
    const current =
      (await this.prisma.aiProviderDirectoryModel.findUnique({
        where: {
          providerId_modelId: {
            providerId: body.providerId,
            modelId: body.modelId,
          },
        },
      })) ?? null;
    const fallback = aiModelBank.find(
      (model) => model.providerId === body.providerId && model.id === body.modelId,
    );
    if (!current && !fallback) {
      throw new BadRequestException('Unknown provider directory model');
    }
    const model = current ? this.directoryModelFromRecord(current) : fallback!;

    await this.prisma.aiProviderDirectoryModel.upsert({
      where: {
        providerId_modelId: {
          providerId: body.providerId,
          modelId: body.modelId,
        },
      },
      update: {
        enabled: body.enabled,
        recommended: body.recommended,
        displayName: body.displayName,
      },
      create: this.directoryModelCreateInput({
        ...model,
        enabled: body.enabled ?? model.enabled,
        recommended: body.recommended ?? model.recommended,
        displayName: body.displayName ?? model.displayName,
      }),
    });
    const overview = await this.getAiProviderDirectory();
    await this.recordAuditLog(audit, {
      action: 'ai.provider_directory_model.update',
      resourceType: 'ai_provider_model',
      resourceId: `${body.providerId}:${body.modelId}`,
      summary: `更新用户侧 AI 模型 ${body.modelId}`,
      metadata: this.safeMetadata({
        providerId: body.providerId,
        modelId: body.modelId,
        enabled: body.enabled,
        recommended: body.recommended,
        displayNameChanged: body.displayName !== undefined,
      }),
    });
    return overview;
  }

  async getDichaAiService(): Promise<AdminDichaAiServiceOverview> {
    const provider = aiProviderTemplates.find((item) => item.id === DICHA_PROVIDER_ID);
    if (!provider) {
      throw new BadRequestException('Dicha AI provider is missing');
    }
    const [internalProviders, internalModels] = await Promise.all([
      this.prisma.aiInternalProvider.findMany({
        orderBy: [{ enabled: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.aiInternalProviderModel.findMany({
        include: { internalProvider: true },
        orderBy: [{ enabled: 'desc' }, { dxSortOrder: 'asc' }, { updatedAt: 'desc' }],
      }),
    ]);
    const modelCount = internalModels.length;
    const enabledModelCount = internalModels.filter(
      (model) => model.enabled && model.internalProvider.enabled,
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      provider: {
        providerId: provider.id,
        name: provider.name,
        shortName: provider.shortName,
        category: provider.category,
        credentialMode: provider.credentialMode,
        billingMode: provider.billingMode,
        modelSyncMode: provider.modelSyncMode,
        status: provider.status,
        modelCount,
        enabledModelCount,
      },
      internalProviders: internalProviders.map(toAdminAiInternalProvider),
      models: internalModels.map((model) => ({
        modelRecordId: model.id,
        modelId: model.dxModelId ?? `dicha:${model.upstreamModelName}`,
        internalProviderId: model.internalProviderId,
        internalProviderName: model.internalProvider.name,
        upstreamModelName: model.upstreamModelName,
        name: model.dxModelId ?? `dicha:${model.upstreamModelName}`,
        displayName: model.dxDisplayName ?? model.upstreamDisplayName,
        description: model.dxDescription,
        modelType: model.modelType as AiModelType,
        capabilities: this.arrayFromJson<AiModelCapability>(model.capabilities),
        contextWindow: model.contextWindow,
        enabled: model.enabled,
        availability: model.availability,
        recommended: model.dxRecommended,
        sortOrder: model.dxSortOrder,
        priceHint: model.dxPriceHint,
        upstreamPricing: this.optionalJson<AiModel['pricing']>(model.pricing) ?? null,
        dxPricing: this.optionalJson<AiModel['pricing']>(model.dxPricing) ?? null,
        parameterConfig: this.recordFromJson(model.parameterConfig),
      })),
    };
  }

  async upsertDichaInternalProvider(
    body: AdminAiInternalProviderUpsert,
    audit: AdminAuditContext,
  ): Promise<AdminAiInternalProvider> {
    const existing = body.providerId
      ? await this.prisma.aiInternalProvider.findUnique({ where: { id: body.providerId } })
      : null;
    const credential: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined =
      body.authType === 'none'
        ? Prisma.JsonNull
        : body.credential
          ? this.encryptAiCredential(body.credential)
          : existing?.credential
            ? (existing.credential as Prisma.InputJsonValue)
            : undefined;

    const provider = body.providerId
      ? await this.prisma.aiInternalProvider.update({
          where: { id: body.providerId },
          data: {
            name: body.name,
            baseUrl: body.baseUrl,
            requestFormat: body.requestFormat,
            authType: body.authType,
            credential,
            enabled: body.enabled,
            priority: body.priority,
            notes: body.notes ?? null,
          },
        })
      : await this.prisma.aiInternalProvider.create({
          data: {
            name: body.name,
            baseUrl: body.baseUrl,
            requestFormat: body.requestFormat,
            authType: body.authType,
            credential,
            enabled: body.enabled,
            priority: body.priority,
            notes: body.notes ?? null,
          },
        });

    const response = toAdminAiInternalProvider(provider);
    await this.recordAuditLog(audit, {
      action: body.providerId
        ? 'ai.dicha_internal_provider.update'
        : 'ai.dicha_internal_provider.create',
      resourceType: 'dicha_internal_provider',
      resourceId: provider.id,
      summary: `${body.providerId ? '更新' : '创建'} Dicha AI 内部供应商 ${provider.name}`,
      metadata: this.safeMetadata({
        providerId: provider.id,
        enabled: provider.enabled,
        requestFormat: provider.requestFormat,
        authType: provider.authType,
        credentialChanged: body.credential !== undefined,
      }),
    });
    return response;
  }

  async syncDichaInternalProviderModels(
    body: AdminDichaInternalProviderSync,
    audit: AdminAuditContext,
  ): Promise<AdminDichaInternalProviderSyncResponse> {
    const provider = await this.prisma.aiInternalProvider.findUnique({
      where: { id: body.providerId },
    });
    if (!provider) {
      throw new BadRequestException('Unknown Dicha AI internal provider');
    }
    if (provider.requestFormat !== 'openai_compatible') {
      throw new BadRequestException('Only OpenAI-compatible model sync is supported for now');
    }

    const secret = provider.credential ? this.decryptAiCredential(provider.credential) : undefined;
    const remoteModels = await this.fetchOpenAiCompatibleModels(provider.baseUrl, secret);
    await this.upsertInternalProviderModels(provider.id, remoteModels);
    const response = { providerId: provider.id, syncedCount: remoteModels.length };
    await this.recordAuditLog(audit, {
      action: 'ai.dicha_internal_provider.sync_models',
      resourceType: 'dicha_internal_provider',
      resourceId: provider.id,
      summary: `同步 Dicha AI 内部供应商 ${provider.name} 的模型`,
      metadata: this.safeMetadata(response),
    });
    return response;
  }

  async updateDichaModel(
    body: AdminDichaModelUpdate,
    audit: AdminAuditContext,
  ): Promise<AdminDichaAiServiceOverview> {
    const existing = await this.prisma.aiInternalProviderModel.findUnique({
      where: { id: body.modelRecordId },
    });
    if (!existing) {
      throw new BadRequestException('Unknown Dicha AI model');
    }

    await this.prisma.aiInternalProviderModel.update({
      where: { id: body.modelRecordId },
      data: {
        enabled: body.enabled,
        dxModelId: body.dxModelId,
        dxDisplayName: body.dxDisplayName,
        dxDescription: body.dxDescription,
        dxPriceHint: body.dxPriceHint,
        dxPricing:
          body.dxPricing === undefined
            ? undefined
            : body.dxPricing === null
              ? Prisma.JsonNull
              : (body.dxPricing as Prisma.InputJsonValue),
        dxRecommended: body.dxRecommended,
        dxSortOrder: body.dxSortOrder,
        parameterConfig:
          body.parameterConfig === undefined
            ? undefined
            : body.parameterConfig === null
              ? Prisma.JsonNull
              : (body.parameterConfig as Prisma.InputJsonValue),
      },
    });
    const overview = await this.getDichaAiService();
    await this.recordAuditLog(audit, {
      action: 'ai.dicha_model.update',
      resourceType: 'dicha_model',
      resourceId: body.modelRecordId,
      summary: `更新 Dicha AI 模型 ${body.modelRecordId}`,
      metadata: this.safeMetadata({
        modelRecordId: body.modelRecordId,
        enabled: body.enabled,
        dxModelId: body.dxModelId,
        dxDisplayNameChanged: body.dxDisplayName !== undefined,
        pricingChanged: body.dxPricing !== undefined,
        parameterConfigChanged: body.parameterConfig !== undefined,
      }),
    });
    return overview;
  }

  async getDichaAiUsage(window: AiUsageWindow, logLimit = 500): Promise<AdminDichaAiUsageReport> {
    const now = new Date();
    const from = usageWindowStart(now, window);
    const records = await this.prisma.aiUsageEvent.findMany({
      where: {
        kind: 'invoke',
        providerId: DICHA_PROVIDER_ID,
        ...(from ? { createdAt: { gte: from } } : {}),
      },
      include: adminUsageOwnerInclude,
      orderBy: { createdAt: 'desc' },
    });
    const events = records.map(toAdminDichaUsageEvent);
    const rangeFrom = usageReportRangeStart(events, from, now);
    const hourlyFrom = usageHourlyRangeStart(events, rangeFrom, now);
    const recent24hFrom = new Date(now.getTime() - 24 * HOUR_MS);

    return {
      generatedAt: now.toISOString(),
      window,
      from: from?.toISOString() ?? null,
      to: now.toISOString(),
      providerId: DICHA_PROVIDER_ID,
      providerName: records[0]?.providerName ?? 'Dicha AI',
      activeUsers: new Set(events.map((event) => event.user.id)).size,
      totalEvents: events.length,
      logLimit,
      summary: summarizeAdminUsage(events),
      performance: adminUsagePerformance(events, rangeFrom, now),
      timeSeries: {
        recent24h: adminUsageTimeBuckets(
          events.filter((event) => new Date(event.createdAt) >= recent24hFrom),
          recent24hFrom,
          now,
          'hour',
        ),
        hourly: adminUsageTimeBuckets(events, hourlyFrom, now, 'hour'),
        daily: rangeFrom ? adminUsageTimeBuckets(events, rangeFrom, now, 'day') : [],
      },
      distributions: {
        providerHourly: adminUsageDistribution(events, hourlyFrom, now, 'hour', 'provider'),
        providerDaily: adminUsageDistribution(events, rangeFrom, now, 'day', 'provider'),
        modelHourly: adminUsageDistribution(events, hourlyFrom, now, 'hour', 'model'),
        modelDaily: adminUsageDistribution(events, rangeFrom, now, 'day', 'model'),
      },
      byModel: adminUsageBreakdown(events, (event) => ({
        key: event.modelId,
        label: event.modelName,
      })),
      byUseCase: adminUsageBreakdown(events, (event) => ({
        key: event.useCase,
        label: event.useCase,
      })),
      byUser: adminUserUsageBreakdown(events),
      byStatus: adminUsageBreakdown(events, (event) => ({
        key: event.status,
        label: event.status,
      })),
      recentEvents: events.slice(0, logLimit),
    };
  }

  async getDichaAiDiagnostics(
    query: AdminDichaAiDiagnosticsQuery,
  ): Promise<AdminDichaAiDiagnosticsReport> {
    const now = new Date();
    const from = usageWindowStart(now, query.window);
    const baseWhere: Prisma.AiUsageEventWhereInput = {
      kind: 'invoke',
      providerId: DICHA_PROVIDER_ID,
      ...(from ? { createdAt: { gte: from } } : {}),
    };
    const mode = Prisma.QueryMode.insensitive;
    const andWhere: Prisma.AiUsageEventWhereInput[] = [baseWhere];
    if (query.status) andWhere.push({ status: query.status });
    if (query.errorCategory) andWhere.push({ errorCategory: query.errorCategory });
    if (query.requestId) {
      andWhere.push({
        OR: [
          { requestId: { contains: query.requestId, mode } },
          { upstreamRequestId: { contains: query.requestId, mode } },
        ],
      });
    }
    if (query.userSearch) {
      andWhere.push({
        owner: {
          OR: [
            { email: { contains: query.userSearch, mode } },
            { name: { contains: query.userSearch, mode } },
          ],
        },
      });
    }
    if (query.modelSearch) {
      andWhere.push({
        OR: [
          { modelId: { contains: query.modelSearch, mode } },
          { modelName: { contains: query.modelSearch, mode } },
        ],
      });
    }
    if (query.internalChannelId) {
      andWhere.push({
        OR: [
          { internalProviderId: { contains: query.internalChannelId, mode } },
          { internalProviderModelId: { contains: query.internalChannelId, mode } },
        ],
      });
    }
    const where: Prisma.AiUsageEventWhereInput = { AND: andWhere };
    const [records, total, filteredRecords, optionRecords] = await Promise.all([
      this.prisma.aiUsageEvent.findMany({
        where,
        include: adminUsageOwnerInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.aiUsageEvent.count({ where }),
      this.prisma.aiUsageEvent.findMany({
        where,
        include: adminUsageOwnerInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiUsageEvent.findMany({
        where: baseWhere,
        select: {
          status: true,
          errorCategory: true,
          modelId: true,
          modelName: true,
          internalProviderId: true,
          internalProviderModelId: true,
        },
      }),
    ]);
    const events = records.map(toAdminDichaUsageEvent);
    const filteredEvents = filteredRecords.map(toAdminDichaUsageEvent);

    return {
      generatedAt: now.toISOString(),
      window: query.window,
      from: from?.toISOString() ?? null,
      to: now.toISOString(),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
      summary: summarizeAdminUsage(filteredEvents),
      events,
      filters: diagnosticFilterOptions(optionRecords),
    };
  }

  getCreditRules(): Promise<AdminCreditRulesOverview> {
    return this.credits.getCreditRules();
  }

  getCreditOperations(query: AdminCreditOperationsQuery): Promise<AdminCreditOperationsReport> {
    return this.credits.getCreditOperations(query);
  }

  async upsertCreditRule(
    body: AdminCreditRuleUpsert,
    audit: AdminAuditContext,
  ): Promise<AdminCreditRule> {
    const rule = await this.credits.upsertCreditRule(body);
    await this.recordAuditLog(audit, {
      action: body.ruleId ? 'credits.rule.update' : 'credits.rule.create',
      resourceType: 'credit_rule',
      resourceId: rule.id,
      summary: `${body.ruleId ? '更新' : '创建'}积分规则 ${rule.name}`,
      metadata: this.safeMetadata({
        ruleId: rule.id,
        active: rule.active,
        cnyCreditsPerUnit: rule.cnyCreditsPerUnit,
        usdCreditsPerUnit: rule.usdCreditsPerUnit,
        platformMarkup: rule.platformMarkup,
        minimumChargeCredits: rule.minimumChargeCredits,
      }),
    });
    return rule;
  }

  async grantCredits(
    body: AdminCreditGrant,
    audit: AdminAuditContext,
  ): Promise<AdminCreditGrantResponse> {
    const response = await this.credits.grantCredits(body);
    await this.recordAuditLog(audit, {
      action: 'credits.grant',
      resourceType: 'credit_account',
      resourceId: body.ownerId,
      summary: `向用户 ${body.ownerId} 发放 ${body.amount} 积分`,
      metadata: this.safeMetadata({
        ownerId: body.ownerId,
        amount: body.amount,
        ledgerEntryId: response.ledgerEntry.id,
        balanceAfter: response.account.balance,
      }),
    });
    return response;
  }

  listCreditBalances(query: AdminCreditBalancesQuery): Promise<AdminCreditBalancesPage> {
    return this.credits.listCreditBalances(query);
  }

  listCreditLedger(query: AdminCreditLedgerQuery): Promise<AdminCreditLedgerPage> {
    return this.credits.listCreditLedger(query);
  }

  getCreditRedemptionCodes(): Promise<AdminCreditRedemptionCodesOverview> {
    return this.credits.getRedemptionCodes();
  }

  getCreditCheckInCampaign(): Promise<AdminCreditCheckInOverview> {
    return this.credits.getCreditCheckInOverview();
  }

  async upsertCreditCheckInCampaign(
    body: AdminCreditCheckInCampaignUpsert,
    audit: AdminAuditContext,
  ): Promise<AdminCreditCheckInOverview> {
    const overview = await this.credits.upsertCreditCheckInCampaign(body);
    await this.recordAuditLog(audit, {
      action: body.campaignId ? 'credits.check_in_campaign.update' : 'credits.check_in_campaign.create',
      resourceType: 'credit_check_in_campaign',
      resourceId: overview.campaign.id,
      summary: `${body.campaignId ? '更新' : '创建'}积分签到活动 ${overview.campaign.name}`,
      metadata: this.safeMetadata({
        campaignId: overview.campaign.id,
        enabled: overview.campaign.enabled,
        dailyCreditAmount: overview.campaign.dailyCreditAmount,
        timezone: overview.campaign.timezone,
        startsAt: overview.campaign.startsAt,
        endsAt: overview.campaign.endsAt,
      }),
    });
    return overview;
  }

  async upsertCreditRedemptionCode(
    body: AdminCreditRedemptionCodeUpsert,
    audit: AdminAuditContext,
  ): Promise<AdminCreditRedemptionCode> {
    const code = await this.credits.upsertRedemptionCode(body);
    await this.recordAuditLog(audit, {
      action: body.codeId ? 'credits.redemption_code.update' : 'credits.redemption_code.create',
      resourceType: 'credit_redemption_code',
      resourceId: code.id,
      summary: `${body.codeId ? '更新' : '创建'}积分兑换码 ${code.code}`,
      metadata: this.safeMetadata({
        codeId: code.id,
        code: code.code,
        creditAmount: code.creditAmount,
        enabled: code.enabled,
        maxRedemptions: code.maxRedemptions,
        expiresAt: code.expiresAt,
      }),
    });
    return code;
  }

  async listUsers(query: AdminUsersQuery): Promise<AdminUsersList> {
    const page = query.page;
    const pageSize = query.pageSize;
    const where = this.userListWhere(query);

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: userSummarySelect,
      }),
    ]);
    const sessionSummaries = await this.userSessionSummaries(users.map((user) => user.id));

    return {
      generatedAt: new Date().toISOString(),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      users: users.map((user) => toUserSummary(user, sessionSummaries.get(user.id))),
    };
  }

  async getUser(id: string): Promise<AdminUserDetail | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSummarySelect,
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            expiresAt: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        accounts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            providerId: true,
            accessTokenExpiresAt: true,
            refreshTokenExpiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        passkeys: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            deviceType: true,
            backedUp: true,
            transports: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) return null;

    const sessionSummaries = await this.userSessionSummaries([user.id]);

    return {
      ...toUserSummary(user, sessionSummaries.get(user.id)),
      sessions: user.sessions.map((session) => ({
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      })),
      accounts: user.accounts.map((account) => ({
        id: account.id,
        providerId: account.providerId,
        accessTokenExpiresAt: account.accessTokenExpiresAt?.toISOString() ?? null,
        refreshTokenExpiresAt: account.refreshTokenExpiresAt?.toISOString() ?? null,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      })),
      passkeys: user.passkeys.map((passkey) => ({
        id: passkey.id,
        name: passkey.name,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        transports: passkey.transports,
        createdAt: passkey.createdAt.toISOString(),
      })),
    };
  }

  async updateUserStatus(
    id: string,
    body: AdminUserStatusUpdate,
    audit: AdminAuditContext,
  ): Promise<AdminUserSecurityActionResponse> {
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, status: true },
    });
    if (!current) throw new NotFoundException('User not found');
    if (id === audit.actor.id && body.status === 'disabled') {
      throw new BadRequestException('Super admin cannot disable their current account');
    }

    const disabled = body.status === 'disabled';
    await this.prisma.user.update({
      where: { id },
      data: {
        status: body.status,
        disabledAt: disabled ? new Date() : null,
        disabledReason: disabled ? (body.reason ?? null) : null,
        disabledById: disabled ? audit.actor.id : null,
      },
    });
    const sessions = disabled
      ? await this.prisma.session.deleteMany({ where: { userId: id } })
      : { count: 0 };

    const detail = await this.getUser(id);
    if (!detail) throw new NotFoundException('User not found');
    await this.recordAuditLog(audit, {
      action: disabled ? 'users.disable' : 'users.enable',
      resourceType: 'user',
      resourceId: id,
      summary: `${disabled ? '禁用' : '启用'}用户 ${current.email}`,
      metadata: this.safeMetadata({
        userId: id,
        email: current.email,
        previousStatus: current.status,
        status: body.status,
        revokedSessions: sessions.count,
        reason: body.reason,
      }),
    });
    return { user: detail, revokedSessions: sessions.count };
  }

  async revokeUserSessions(
    id: string,
    audit: AdminAuditContext,
  ): Promise<AdminUserSecurityActionResponse> {
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!current) throw new NotFoundException('User not found');
    const sessions = await this.prisma.session.deleteMany({ where: { userId: id } });
    const detail = await this.getUser(id);
    if (!detail) throw new NotFoundException('User not found');
    await this.recordAuditLog(audit, {
      action: 'users.revoke_sessions',
      resourceType: 'user',
      resourceId: id,
      summary: `强制退出用户 ${current.email} 的所有会话`,
      metadata: this.safeMetadata({
        userId: id,
        email: current.email,
        revokedSessions: sessions.count,
      }),
    });
    return { user: detail, revokedSessions: sessions.count };
  }

  private directoryOverviewModels(
    recordsByProvider: Map<
      string,
      Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>[]
    >,
  ): AdminAiProviderDirectoryOverview['models'] {
    const models: AdminAiProviderDirectoryOverview['models'] = [];
    for (const provider of aiProviderTemplates) {
      if (provider.id === DICHA_PROVIDER_ID) continue;
      const records = recordsByProvider.get(provider.id);
      if (records && records.length > 0) {
        models.push(...records.map((record) => this.directoryModelDtoFromRecord(record)));
        continue;
      }
      models.push(
        ...aiModelBank
          .filter((model) => model.providerId === provider.id)
          .map((model) => this.directoryModelDtoFromAiModel(model)),
      );
    }
    return models;
  }

  private countDirectoryModels(
    models: AdminAiProviderDirectoryOverview['models'],
  ): Map<string, { modelCount: number; enabledModelCount: number }> {
    const counts = new Map<string, { modelCount: number; enabledModelCount: number }>();
    for (const model of models) {
      const current = counts.get(model.providerId) ?? { modelCount: 0, enabledModelCount: 0 };
      current.modelCount += 1;
      if (model.enabled) current.enabledModelCount += 1;
      counts.set(model.providerId, current);
    }
    return counts;
  }

  private groupByProviderId(
    models: Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>[],
  ): Map<string, Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>[]> {
    const grouped = new Map<
      string,
      Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>[]
    >();
    for (const model of models) {
      const current = grouped.get(model.providerId) ?? [];
      current.push(model);
      grouped.set(model.providerId, current);
    }
    return grouped;
  }

  private directoryModelDtoFromRecord(
    record: Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>,
  ): AdminAiProviderDirectoryOverview['models'][number] {
    return {
      providerId: record.providerId,
      modelId: record.modelId,
      name: record.name,
      displayName: record.displayName,
      modelType: record.modelType as AiModelType,
      capabilities: this.arrayFromJson<AiModelCapability>(record.capabilities),
      contextWindow: record.contextWindow,
      enabled: record.enabled,
      recommended: record.recommended,
      availability: record.availability,
      priceHint: record.priceHint,
    };
  }

  private directoryModelDtoFromAiModel(
    model: AiModel,
  ): AdminAiProviderDirectoryOverview['models'][number] {
    return {
      providerId: model.providerId,
      modelId: model.id,
      name: model.name,
      displayName: model.displayName,
      modelType: model.modelType,
      capabilities: model.capabilities,
      contextWindow: model.contextWindow,
      enabled: model.enabled,
      recommended: model.recommended,
      availability: model.availability,
      priceHint: model.priceHint,
    };
  }

  private directoryModelFromRecord(
    record: Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>,
  ): AiModel {
    return {
      id: record.modelId,
      providerId: record.providerId,
      name: record.name,
      displayName: record.displayName,
      avatar: record.avatar ?? undefined,
      contextWindow: record.contextWindow,
      modelType: record.modelType as AiModelType,
      extensionParameters: this.arrayFromJson<AiModelExtensionParameter>(
        record.extensionParameters,
      ),
      capabilities: this.arrayFromJson<AiModelCapability>(record.capabilities),
      maxOutput: record.maxOutput ?? undefined,
      enabled: record.enabled,
      recommended: record.recommended,
      availability: record.availability as AiModel['availability'],
      lastLatencyMs: null,
      priceHint: record.priceHint,
      catalogSource: (record.catalogSource ?? undefined) as AiModel['catalogSource'],
      pricing: this.optionalJson<AiModel['pricing']>(record.pricing),
      releasedAt: record.releasedAt ?? undefined,
      lobeMetadata: this.optionalJson<AiModel['lobeMetadata']>(record.lobeMetadata),
    };
  }

  private directoryModelCreateInput(model: AiModel): Prisma.AiProviderDirectoryModelCreateInput {
    return {
      providerId: model.providerId,
      modelId: model.id,
      name: model.name,
      displayName: model.displayName,
      avatar: model.avatar,
      contextWindow: model.contextWindow,
      modelType: model.modelType,
      extensionParameters: model.extensionParameters,
      capabilities: model.capabilities,
      maxOutput: model.maxOutput,
      enabled: model.enabled,
      recommended: model.recommended,
      availability: model.availability,
      priceHint: model.priceHint,
      catalogSource: model.catalogSource,
      pricing: this.jsonOrUndefined(model.pricing),
      releasedAt: model.releasedAt,
      lobeMetadata: this.jsonOrUndefined(model.lobeMetadata),
    };
  }

  private async upsertDirectoryModels(
    providerId: string,
    remoteModels: AiProviderRemoteModel[],
  ): Promise<void> {
    for (const remoteModel of remoteModels) {
      const model = this.modelFromRemote(providerId, remoteModel);
      await this.prisma.aiProviderDirectoryModel.upsert({
        where: { providerId_modelId: { providerId, modelId: model.id } },
        update: {
          name: model.name,
          displayName: model.displayName,
          avatar: model.avatar,
          contextWindow: model.contextWindow,
          modelType: model.modelType,
          extensionParameters: model.extensionParameters,
          capabilities: model.capabilities,
          maxOutput: model.maxOutput,
          priceHint: model.priceHint,
          pricing: this.jsonOrUndefined(model.pricing),
          releasedAt: model.releasedAt,
          catalogSource: model.catalogSource,
          lobeMetadata: this.jsonOrUndefined(model.lobeMetadata),
        },
        create: this.directoryModelCreateInput(model),
      });
    }
  }

  private async upsertInternalProviderModels(
    internalProviderId: string,
    remoteModels: AiProviderRemoteModel[],
  ): Promise<void> {
    for (const remoteModel of remoteModels) {
      const metadata = this.modelBankMetadata(remoteModel);
      await this.prisma.aiInternalProviderModel.upsert({
        where: {
          internalProviderId_upstreamModelName: {
            internalProviderId,
            upstreamModelName: remoteModel.id,
          },
        },
        update: {
          upstreamDisplayName: remoteModel.displayName ?? metadata?.displayName ?? remoteModel.id,
          modelType: remoteModel.modelType ?? metadata?.modelType ?? 'chat',
          capabilities: remoteModel.capabilities ?? metadata?.capabilities ?? ['chat'],
          contextWindow: remoteModel.contextWindow ?? metadata?.contextWindow,
          maxOutput: remoteModel.maxOutput ?? metadata?.maxOutput,
          pricing: this.jsonOrUndefined(remoteModel.pricing ?? metadata?.pricing),
          releasedAt: remoteModel.releasedAt ?? metadata?.releasedAt,
          availability: 'unknown',
        },
        create: {
          internalProviderId,
          upstreamModelName: remoteModel.id,
          upstreamDisplayName: remoteModel.displayName ?? metadata?.displayName ?? remoteModel.id,
          modelType: remoteModel.modelType ?? metadata?.modelType ?? 'chat',
          capabilities: remoteModel.capabilities ?? metadata?.capabilities ?? ['chat'],
          contextWindow: remoteModel.contextWindow ?? metadata?.contextWindow,
          maxOutput: remoteModel.maxOutput ?? metadata?.maxOutput,
          pricing: this.jsonOrUndefined(remoteModel.pricing ?? metadata?.pricing),
          releasedAt: remoteModel.releasedAt ?? metadata?.releasedAt,
          dxModelId: `dicha:${remoteModel.id}`,
          dxDisplayName: remoteModel.displayName ?? metadata?.displayName ?? remoteModel.id,
          dxDescription: metadata?.lobeMetadata?.description ?? null,
          dxPriceHint: metadata?.priceHint ?? remoteModel.priceHint ?? 'Dicha AI 模型',
          dxPricing: this.jsonOrUndefined(remoteModel.pricing ?? metadata?.pricing),
          parameterConfig: {},
        },
      });
    }
  }

  private modelFromRemote(providerId: string, remoteModel: AiProviderRemoteModel): AiModel {
    const metadata = aiModelBank.find(
      (model) => model.providerId === providerId && model.name === remoteModel.id,
    );
    const capabilities = remoteModel.capabilities ?? metadata?.capabilities ?? [];
    return {
      id: `${providerId}:${remoteModel.id}`,
      providerId,
      name: remoteModel.id,
      displayName: remoteModel.displayName ?? metadata?.displayName ?? remoteModel.id,
      avatar: metadata?.avatar ?? this.modelAvatar(remoteModel.displayName ?? remoteModel.id),
      contextWindow: remoteModel.contextWindow ?? metadata?.contextWindow ?? null,
      modelType:
        remoteModel.modelType ??
        metadata?.modelType ??
        this.modelTypeFromCapabilities(capabilities),
      extensionParameters: remoteModel.extensionParameters ?? metadata?.extensionParameters ?? [],
      capabilities,
      maxOutput: remoteModel.maxOutput ?? metadata?.maxOutput,
      enabled: false,
      recommended: metadata?.recommended ?? false,
      availability: 'unknown',
      lastLatencyMs: null,
      priceHint: remoteModel.priceHint ?? metadata?.priceHint ?? '同步自供应商，模型元数据待补充',
      pricing: remoteModel.pricing ?? metadata?.pricing,
      releasedAt: remoteModel.releasedAt ?? metadata?.releasedAt,
      catalogSource: 'upstream_sync',
      lobeMetadata: metadata?.lobeMetadata,
    };
  }

  private modelBankMetadata(remoteModel: AiProviderRemoteModel): AiModel | undefined {
    return aiModelBank.find((model) => model.name === remoteModel.id);
  }

  private async fetchModelsWithModelBankFallback(
    providerId: string,
    baseUrl: string,
  ): Promise<AiProviderRemoteModel[]> {
    try {
      return await this.fetchOpenAiCompatibleModels(baseUrl);
    } catch (error) {
      if (this.isAuthenticationFailure(error)) {
        const fallback = aiModelBank
          .filter((model) => model.providerId === providerId)
          .map((model) => this.modelBankRemoteModel(model));
        if (fallback.length > 0) return fallback;
      }
      throw error;
    }
  }

  private async fetchOpenAiCompatibleModels(
    baseUrl: string,
    secret?: string,
  ): Promise<AiProviderRemoteModel[]> {
    const headers = secret ? { authorization: `Bearer ${secret}` } : undefined;
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, { headers });
    if (!response.ok) {
      throw new BadRequestException(`Provider model sync failed (${response.status})`);
    }
    const body = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const models = new Map<string, AiProviderRemoteModel>();
    for (const item of body.data ?? []) {
      const id = typeof item.id === 'string' ? item.id : null;
      if (id) models.set(id, this.remoteModelDescriptor(id, item));
    }
    return [...models.values()];
  }

  private modelBankRemoteModel(model: AiModel): AiProviderRemoteModel {
    return {
      id: model.name,
      displayName: model.displayName,
      contextWindow: model.contextWindow,
      modelType: model.modelType,
      extensionParameters: model.extensionParameters,
      capabilities: model.capabilities,
      pricing: model.pricing,
      priceHint: model.priceHint,
      maxOutput: model.maxOutput,
      releasedAt: model.releasedAt,
    };
  }

  private remoteModelDescriptor(id: string, item: Record<string, unknown>): AiProviderRemoteModel {
    const contextWindow = this.firstPositiveInteger(
      item.contextWindow,
      item.context_window,
      item.contextWindowTokens,
      item.context_window_tokens,
      item.context_length,
      item.max_context_length,
      item.maxInputTokens,
      item.max_input_tokens,
    );
    const displayName =
      typeof item.displayName === 'string'
        ? item.displayName
        : typeof item.display_name === 'string'
          ? item.display_name
          : typeof item.name === 'string'
            ? item.name
            : undefined;
    return {
      id,
      ...(displayName ? { displayName } : {}),
      ...(contextWindow ? { contextWindow } : {}),
    };
  }

  private firstPositiveInteger(...values: unknown[]): number | undefined {
    for (const value of values) {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed > 0) return parsed;
      }
    }
    return undefined;
  }

  private isAuthenticationFailure(error: unknown): boolean {
    if (!(error instanceof BadRequestException)) return false;
    const response = error.getResponse();
    const message =
      typeof response === 'string' ? response : (response as { message?: unknown }).message;
    if (typeof message === 'string') return message.includes('(401)') || message.includes('(403)');
    return Array.isArray(message)
      ? message.some(
          (item) => typeof item === 'string' && (item.includes('(401)') || item.includes('(403)')),
        )
      : false;
  }

  private arrayFromJson<T extends string>(value: Prisma.JsonValue): T[] {
    return Array.isArray(value) ? value.filter((item): item is T => typeof item === 'string') : [];
  }

  private recordFromJson(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private optionalJson<T>(value: Prisma.JsonValue | null): T | undefined {
    return value === null ? undefined : (value as T);
  }

  private jsonOrUndefined(value: unknown): Prisma.InputJsonValue | undefined {
    return value === undefined ? undefined : (value as Prisma.InputJsonValue);
  }

  private modelTypeFromCapabilities(capabilities: AiModel['capabilities']): AiModelType {
    if (capabilities.includes('embedding')) return 'embedding';
    if (capabilities.includes('image_generation')) return 'image';
    if (capabilities.includes('video')) return 'video';
    return 'chat';
  }

  private modelAvatar(value: string): string {
    return (
      value
        .trim()
        .split(/[-_\\s:/.]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'AI'
    );
  }

  private async getPlatformStats(): Promise<AdminPlatformStats> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const [
      totalUsers,
      verifiedUsers,
      usersCreatedLast7Days,
      activeSessions,
      totalItems,
      totalEvents,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { emailVerified: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: since } } }),
      this.prisma.session.count({ where: { expiresAt: { gt: now } } }),
      this.prisma.item.count(),
      this.prisma.event.count(),
    ]);

    return {
      totalUsers,
      verifiedUsers,
      usersCreatedLast7Days,
      activeSessions,
      totalItems,
      totalEvents,
    };
  }

  private userListWhere(query: AdminUsersQuery): Prisma.UserWhereInput {
    const andWhere: Prisma.UserWhereInput[] = [];
    const search = query.search?.trim();
    if (search) {
      andWhere.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.status) andWhere.push({ status: query.status });
    if (query.emailVerified !== undefined) {
      andWhere.push({ emailVerified: query.emailVerified });
    }
    return andWhere.length > 0 ? { AND: andWhere } : {};
  }

  private async userSessionSummaries(
    userIds: string[],
  ): Promise<Map<string, { lastSessionAt: string | null; activeSessionCount: number }>> {
    const summaries = new Map<
      string,
      { lastSessionAt: string | null; activeSessionCount: number }
    >();
    for (const userId of userIds) {
      summaries.set(userId, { lastSessionAt: null, activeSessionCount: 0 });
    }
    if (userIds.length === 0) return summaries;

    const now = new Date();
    const [latestSessions, activeSessionCounts] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId: { in: userIds } },
        orderBy: { updatedAt: 'desc' },
        select: { userId: true, updatedAt: true, createdAt: true },
      }),
      this.prisma.session.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, expiresAt: { gt: now } },
        _count: { _all: true },
      }),
    ]);

    for (const session of latestSessions) {
      const current = summaries.get(session.userId);
      if (current?.lastSessionAt) continue;
      summaries.set(session.userId, {
        lastSessionAt: (session.updatedAt ?? session.createdAt).toISOString(),
        activeSessionCount: current?.activeSessionCount ?? 0,
      });
    }
    for (const count of activeSessionCounts) {
      const current = summaries.get(count.userId) ?? { lastSessionAt: null, activeSessionCount: 0 };
      summaries.set(count.userId, {
        ...current,
        activeSessionCount: count._count._all,
      });
    }
    return summaries;
  }

  private async checkDatabase(): Promise<AdminSystemOperations['database']> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', latencyMs: Date.now() - startedAt };
    } catch {
      return { status: 'down', latencyMs: null };
    }
  }

  private async checkAiGateway(): Promise<AdminSystemService> {
    const checkedAt = new Date();
    const startedAt = Date.now();
    const healthUrl = `${this.aiGatewayBaseUrl.replace(/\/+$/, '')}/health`;
    try {
      const response = await fetch(healthUrl, {
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) {
        return {
          id: 'ai-gateway',
          name: 'AI Gateway',
          category: 'ai',
          configured: Boolean(this.aiGatewayBaseUrl),
          status: 'degraded',
          detail: `AI Gateway 健康检查返回 ${response.status}`,
          checkedAt: checkedAt.toISOString(),
          latencyMs: Date.now() - startedAt,
        };
      }
      return {
        id: 'ai-gateway',
        name: 'AI Gateway',
        category: 'ai',
        configured: Boolean(this.aiGatewayBaseUrl),
        status: 'healthy',
        detail: 'AI Gateway 正常响应',
        checkedAt: checkedAt.toISOString(),
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        id: 'ai-gateway',
        name: 'AI Gateway',
        category: 'ai',
        configured: Boolean(this.aiGatewayBaseUrl),
        status: 'unknown',
        detail: 'AI Gateway 健康检查暂不可达',
        checkedAt: checkedAt.toISOString(),
        latencyMs: null,
      };
    }
  }

  private async checkLocalStorage(): Promise<AdminSystemService> {
    const checkedAt = new Date();
    try {
      await access(this.uploadDir, fsConstants.R_OK | fsConstants.W_OK);
      return {
        id: 'local-storage',
        name: '本地存储',
        category: 'storage',
        configured: true,
        status: 'healthy',
        detail: '上传目录可读写',
        checkedAt: checkedAt.toISOString(),
        latencyMs: null,
      };
    } catch {
      return {
        id: 'local-storage',
        name: '本地存储',
        category: 'storage',
        configured: true,
        status: 'down',
        detail: '上传目录不可读写，请检查卷挂载与权限',
        checkedAt: checkedAt.toISOString(),
        latencyMs: null,
      };
    }
  }

  private checkMailService(): AdminSystemService {
    const configured = Boolean(this.smtpHost);
    return {
      id: 'mail',
      name: '邮件服务',
      category: 'mail',
      configured,
      status: configured ? 'unknown' : 'unknown',
      detail: configured ? 'SMTP 已配置，暂未执行发送探针' : '未配置 SMTP，邮件能力不可用',
      checkedAt: new Date().toISOString(),
      latencyMs: null,
    };
  }

  private checkConfiguredExternalService(
    id: string,
    name: string,
    category: AdminSystemService['category'],
    url?: string,
  ): AdminSystemService {
    const configured = Boolean(url);
    return {
      id,
      name,
      category,
      configured,
      status: configured ? 'unknown' : 'unknown',
      detail: configured ? '已配置，暂未接入运行时探针' : '未配置',
      checkedAt: new Date().toISOString(),
      latencyMs: null,
    };
  }

  private async checkDisk(): Promise<AdminSystemOperations['host']['disk']> {
    try {
      const stats = await statfs(process.cwd());
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      const freeBytes = Number(stats.bfree) * Number(stats.bsize);
      const usedPercent =
        totalBytes > 0 ? Math.round(((totalBytes - freeBytes) / totalBytes) * 1000) / 10 : null;
      return {
        status:
          usedPercent === null ? 'unknown' : usedPercent >= 90 ? 'degraded' : 'healthy',
        mount: '工作目录所在磁盘',
        totalGb: bytesToGb(totalBytes),
        freeGb: bytesToGb(freeBytes),
        usedPercent,
        detail:
          usedPercent === null
            ? '无法计算磁盘占用'
            : usedPercent >= 90
              ? '磁盘使用率偏高，请准备清理或扩容'
              : '磁盘空间处于可用状态',
      };
    } catch {
      return {
        status: 'unknown',
        mount: '工作目录所在磁盘',
        totalGb: null,
        freeGb: null,
        usedPercent: null,
        detail: '无法读取磁盘状态',
      };
    }
  }

  private async backupSummary(): Promise<AdminSystemOperations['backup']> {
    if (!this.backupDir) {
      return {
        status: this.backupCommand ? 'external' : 'not_configured',
        detail: this.backupCommand
          ? '已配置备份命令，但未配置备份文件目录，无法展示历史备份文件。'
          : '未配置备份目录或备份命令。',
        lastBackupAt: null,
        recommendedCommand: 'pg_dump "$DATABASE_URL" --format=custom --file=dicha-$(date +%F).dump',
        files: [],
      };
    }

    try {
      const entries = await readdir(this.backupDir, { withFileTypes: true });
      const files = await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .filter((entry) => isBackupFile(entry.name))
          .map(async (entry) => {
            const fileStats = await stat(`${this.backupDir}/${entry.name}`);
            return {
              name: entry.name,
              sizeBytes: fileStats.size,
              sizeLabel: formatBytes(fileStats.size),
              kind: backupKind(entry.name),
              status: backupFileStatus(entry.name),
              createdAt: fileStats.mtime.toISOString(),
            };
          }),
      );
      const sortedFiles = files.sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });
      return {
        status: 'ready',
        detail: this.backupCommand
          ? '已配置备份目录与备份命令，可查看历史备份并触发备份。'
          : '已配置备份目录，可查看历史备份；未配置备份命令，暂不能从后台立即备份。',
        lastBackupAt: sortedFiles[0]?.createdAt ?? null,
        recommendedCommand: this.backupCommand
          ? null
          : 'pg_dump "$DATABASE_URL" --format=custom --file=dicha-$(date +%F).dump',
        files: sortedFiles.slice(0, 50),
      };
    } catch {
      return {
        status: 'external',
        detail: '备份目录暂不可读取，请检查目录挂载与权限。',
        lastBackupAt: null,
        recommendedCommand: this.backupCommand
          ? null
          : 'pg_dump "$DATABASE_URL" --format=custom --file=dicha-$(date +%F).dump',
        files: [],
      };
    }
  }

  private async runtimeLogsSummary(): Promise<AdminSystemOperations['logs']> {
    if (this.runtimeLogFiles.length === 0) {
      return {
        status: 'not_configured',
        detail: '未配置运行日志文件。可通过 DICHA_ADMIN_LOG_FILES 接入 API、AI Gateway 或反向代理日志。',
        sources: [
          {
            id: 'api',
            name: 'Dicha API',
            available: false,
            detail: '配置 DICHA_ADMIN_LOG_FILES 后可从后台查看最近运行日志。',
          },
          {
            id: 'ai-gateway',
            name: 'AI Gateway',
            available: false,
            detail: '可接入 AI Gateway stdout 文件、容器日志导出文件或平台日志转储。',
          },
        ],
        recent: [],
      };
    }

    const sourceResults = await Promise.all(
      this.runtimeLogFiles.map(async (file) => {
        try {
          await access(file.path, fsConstants.R_OK);
          const content = await readFile(file.path, 'utf8');
          return {
            source: {
              id: file.id,
              name: file.name,
              available: true,
              detail: '日志文件可读取。',
            },
            lines: tailLines(content, 120).map((line) => parseRuntimeLogLine(file.name, line)),
          };
        } catch {
          return {
            source: {
              id: file.id,
              name: file.name,
              available: false,
              detail: '日志文件不可读取，请检查路径与权限。',
            },
            lines: [],
          };
        }
      }),
    );

    const recent = sourceResults
      .flatMap((result) => result.lines)
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 100);

    return {
      status: recent.length > 0 ? 'ready' : 'external',
      detail:
        recent.length > 0
          ? '已读取最近运行日志。'
          : '日志来源已配置，但当前没有可展示的日志行。',
      sources: sourceResults.map((result) => result.source),
      recent,
    };
  }

  private async runConfiguredSystemCommand(
    actionId: AdminSystemActionRun['actionId'],
    command: string | undefined,
    audit: AdminAuditContext,
  ): Promise<AdminSystemActionResult> {
    const action = this.systemActions().find((item) => item.id === actionId);
    if (!action || !command) {
      throw new BadRequestException('Unknown system action');
    }
    try {
      await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
      });
      await this.recordAuditLog(audit, {
        action: `system.${actionId}`,
        resourceType: 'system',
        resourceId: actionId,
        summary: `${action.title} 已执行`,
        metadata: this.safeMetadata({ actionId, commandConfigured: true }),
      });
      return {
        actionId,
        status: 'completed',
        message: `${action.title} 已执行`,
        affectedCount: null,
        operations: await this.getSystemOperations(),
      };
    } catch (error) {
      const failureDetail = systemCommandFailureMessage(error);
      await this.recordAuditLog(audit, {
        action: `system.${actionId}`,
        resourceType: 'system',
        resourceId: actionId,
        result: 'failure',
        summary: `${action.title} 执行失败`,
        metadata: this.safeMetadata({
          actionId,
          commandConfigured: true,
          error: failureDetail,
        }),
      });
      return {
        actionId,
        status: 'failed',
        message: `${action.title} 执行失败：${failureDetail}`,
        affectedCount: null,
        operations: await this.getSystemOperations(),
      };
    }
  }

  private systemActions(): AdminSystemOperations['actions'] {
    return systemActions({
      backupCommand: this.backupCommand,
      restartApiCommand: this.restartApiCommand,
      restartAiGatewayCommand: this.restartAiGatewayCommand,
      clearCacheCommand: this.clearCacheCommand,
    });
  }

  private async recordAuditLog(
    context: AdminAuditContext,
    input: {
      action: string;
      resourceType: string;
      resourceId?: string | null;
      summary: string;
      result?: 'success' | 'failure';
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        actorId: context.actor.id,
        actorEmail: context.actor.email,
        actorName: context.actor.name ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        result: input.result ?? 'success',
        ipAddress: context.ipAddress ?? null,
        userAgent: context.userAgent ?? null,
        summary: input.summary,
        metadata: input.metadata,
      },
    });
  }

  private safeMetadata(value: Record<string, unknown>): Prisma.InputJsonObject {
    const metadata: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      if (item instanceof Date) {
        metadata[key] = item.toISOString();
        continue;
      }
      if (item === null) continue;
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        metadata[key] = item;
      }
    }
    return metadata as Prisma.InputJsonObject;
  }

  private encryptAiCredential(value: string): Prisma.InputJsonValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.aiEncryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return {
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      value: encrypted.toString('base64'),
    };
  }

  private decryptAiCredential(value: Prisma.JsonValue): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const credential = value as Record<string, unknown>;
    if (
      typeof credential.iv !== 'string' ||
      typeof credential.tag !== 'string' ||
      typeof credential.value !== 'string'
    ) {
      return '';
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.aiEncryptionKey,
      Buffer.from(credential.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(credential.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(credential.value, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private developmentAiSecret(config: ConfigService): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AI_GATEWAY_SECRET_KEY is required to manage AI system channels');
    }
    return config.get<string>('AI_GATEWAY_INTERNAL_TOKEN') ?? 'dicha-ai-gateway-local-dev-secret';
  }
}

const userSummarySelect = {
  id: true,
  name: true,
  displayName: true,
  email: true,
  emailVerified: true,
  image: true,
  city: true,
  homeName: true,
  coins: true,
  status: true,
  disabledAt: true,
  disabledReason: true,
  disabledById: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      sessions: true,
      accounts: true,
      passkeys: true,
    },
  },
} satisfies Prisma.UserSelect;

type UserSummaryRecord = Prisma.UserGetPayload<{
  select: typeof userSummarySelect;
}>;

function toUserSummary(
  user: UserSummaryRecord,
  sessionSummary?: { lastSessionAt: string | null; activeSessionCount: number },
) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    city: user.city,
    homeName: user.homeName,
    coins: user.coins,
    status: user.status as 'active' | 'disabled',
    disabledAt: user.disabledAt?.toISOString() ?? null,
    disabledReason: user.disabledReason,
    disabledById: user.disabledById,
    lastSessionAt: sessionSummary?.lastSessionAt ?? null,
    activeSessionCount: sessionSummary?.activeSessionCount ?? 0,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    counts: {
      sessions: user._count.sessions,
      accounts: user._count.accounts,
      passkeys: user._count.passkeys,
    },
  };
}

type AdminAuditLogRecord = Prisma.AdminAuditLogGetPayload<Record<string, never>>;

function toAdminAuditLog(record: AdminAuditLogRecord): AdminAuditLog {
  return {
    id: record.id,
    actorId: record.actorId,
    actorEmail: record.actorEmail,
    actorName: record.actorName,
    action: record.action,
    resourceType: record.resourceType,
    resourceId: record.resourceId,
    result: record.result as AdminAuditLog['result'],
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    summary: record.summary,
    metadata:
      record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : null,
    createdAt: record.createdAt.toISOString(),
  };
}

function auditWindowStart(now: Date, window: AdminAuditLogsQuery['window']): Date | null {
  switch (window) {
    case '24h':
      return new Date(now.getTime() - DAY_MS);
    case '7d':
      return new Date(now.getTime() - 7 * DAY_MS);
    case '30d':
      return new Date(now.getTime() - 30 * DAY_MS);
    case '90d':
      return new Date(now.getTime() - 90 * DAY_MS);
    case 'all':
      return null;
    default: {
      const exhaustive: never = window;
      return exhaustive;
    }
  }
}

function bytesToMb(value: number): number {
  return Math.round((value / 1024 / 1024) * 10) / 10;
}

function bytesToGb(value: number): number {
  return Math.round((value / 1024 / 1024 / 1024) * 10) / 10;
}

function hostCpuSummary(): AdminSystemOperations['host']['cpu'] {
  const cpus = os.cpus();
  const cores = Math.max(cpus.length, 1);
  const loadAverage = os.loadavg().map((value) => roundOne(value)) as [number, number, number];
  return {
    cores,
    model: cpus[0]?.model ?? 'unknown',
    loadAverage,
    loadPercent: roundOne((loadAverage[0] / cores) * 100),
  };
}

function cacheSummary(redisUrl?: string): AdminSystemOperations['cache'] {
  if (!redisUrl) {
    return {
      status: 'not_configured',
      backend: 'none',
      detail: '当前未配置 Redis 或集中式缓存，暂无可清理的服务端缓存。',
      keysApprox: null,
    };
  }
  return {
    status: 'external',
    backend: 'Redis',
    detail: 'Redis 已配置；当前后台未接入 key 统计和清理探针，避免误删业务缓存。',
    keysApprox: null,
  };
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function systemActions(config: {
  backupCommand?: string;
  restartApiCommand?: string;
  restartAiGatewayCommand?: string;
  clearCacheCommand?: string;
}): AdminSystemOperations['actions'] {
  return [
    {
      id: 'refresh_health',
      title: '刷新健康检查',
      description: '重新探测 API、数据库与 AI Gateway 的当前状态。',
      category: 'diagnostic',
      executable: true,
      disabledReason: null,
    },
    {
      id: 'prune_expired_sessions',
      title: '清理过期会话',
      description: '删除已经过期的 Better Auth session，降低登录表噪音。',
      category: 'maintenance',
      executable: true,
      disabledReason: null,
    },
    {
      id: 'inspect_audit_logs',
      title: '查看审计日志',
      description: '跳转到后台审计日志，用于排查近期管理操作。',
      category: 'diagnostic',
      executable: true,
      disabledReason: null,
    },
    {
      id: 'inspect_runtime_logs',
      title: '查看运行日志',
      description: '确认运行日志来源；当前日志由部署平台、容器或服务器终端承载。',
      category: 'diagnostic',
      executable: true,
      disabledReason: null,
    },
    {
      id: 'inspect_cache',
      title: '检查缓存状态',
      description: '刷新缓存后端摘要；未接入 Redis 探针前不会执行 key 扫描或删除。',
      category: 'diagnostic',
      executable: true,
      disabledReason: null,
    },
    {
      id: 'prepare_backup',
      title: '准备数据备份',
      description: '查看备份目录、最近备份和执行建议。',
      category: 'diagnostic',
      executable: true,
      disabledReason: null,
    },
    {
      id: 'run_backup',
      title: '立即备份',
      description: '执行服务端配置的备份命令，并刷新备份文件列表。',
      category: 'maintenance',
      executable: Boolean(config.backupCommand),
      disabledReason: config.backupCommand ? null : '未配置 DICHA_ADMIN_BACKUP_COMMAND。',
    },
    {
      id: 'clear_runtime_cache',
      title: '清理运行时缓存',
      description: '执行服务端配置的缓存清理命令。',
      category: 'maintenance',
      executable: Boolean(config.clearCacheCommand),
      disabledReason: config.clearCacheCommand ? null : '未配置 DICHA_ADMIN_CLEAR_CACHE_COMMAND。',
    },
    {
      id: 'restart_api',
      title: '重启 API 服务',
      description: '执行服务端配置的 API 重启命令。',
      category: 'dangerous',
      executable: Boolean(config.restartApiCommand),
      disabledReason: config.restartApiCommand
        ? null
        : '未配置 DICHA_ADMIN_RESTART_API_COMMAND。',
    },
    {
      id: 'restart_ai_gateway',
      title: '重启 AI Gateway',
      description: '执行服务端配置的 AI Gateway 重启命令。',
      category: 'dangerous',
      executable: Boolean(config.restartAiGatewayCommand),
      disabledReason: config.restartAiGatewayCommand
        ? null
        : '未配置 DICHA_ADMIN_RESTART_AI_GATEWAY_COMMAND。',
    },
  ];
}

function parseRuntimeLogFiles(value?: string): AdminRuntimeLogFile[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item, index) => {
      const trimmed = item.trim();
      if (!trimmed) return null;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return {
          id: `log-${index + 1}`,
          name: `日志 ${index + 1}`,
          path: trimmed,
        };
      }
      const name = trimmed.slice(0, separatorIndex).trim();
      const path = trimmed.slice(separatorIndex + 1).trim();
      if (!path) return null;
      return {
        id: slugify(name || `log-${index + 1}`),
        name: name || `日志 ${index + 1}`,
        path,
      };
    })
    .filter((item): item is AdminRuntimeLogFile => item !== null);
}

function isBackupFile(name: string): boolean {
  return /\.(sql|dump|backup|bak|gz|zip)$/i.test(name);
}

function backupKind(name: string): 'automatic' | 'manual' | 'unknown' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('auto')) return 'automatic';
  if (lowerName.includes('manual') || lowerName.includes('backup')) return 'manual';
  return 'unknown';
}

function backupFileStatus(name: string): 'success' | 'failed' | 'unknown' {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('fail') || lowerName.includes('error')) return 'failed';
  return 'success';
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${roundOne(value / 1024)} KB`;
  if (value < 1024 * 1024 * 1024) return `${roundOne(value / 1024 / 1024)} MB`;
  return `${roundOne(value / 1024 / 1024 / 1024)} GB`;
}

function tailLines(content: string, limit: number): string[] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(-limit);
}

function parseRuntimeLogLine(
  source: string,
  line: string,
): AdminSystemOperations['logs']['recent'][number] {
  const sanitized = sanitizeLogLine(line);
  const timestampMatch = sanitized.match(
    /(\d{4}-\d{2}-\d{2}[T ][0-9:.]+(?:Z|[+-]\d{2}:?\d{2})?)/,
  );
  const levelMatch = sanitized.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|LOG)\b/i);
  const timestamp = timestampMatch?.[1]
    ? normalizeLogTimestamp(timestampMatch[1])
    : new Date().toISOString();
  return {
    timestamp,
    level: (levelMatch?.[1] ?? 'INFO').toUpperCase(),
    source,
    message: sanitized.slice(0, 2000),
  };
}

function normalizeLogTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

const ANSI_CSI_SEQUENCE_PATTERN = new RegExp(
  String.raw`(?:\x1B\[|\x9B)[0-?]*[ -/]*[@-~]`,
  'g',
);
const ANSI_OSC_SEQUENCE_PATTERN = new RegExp(
  String.raw`\x1B\][^\x07]*(?:\x07|\x1B\\)`,
  'g',
);

function sanitizeLogLine(value: string): string {
  return value
    .replace(ANSI_OSC_SEQUENCE_PATTERN, '')
    .replace(ANSI_CSI_SEQUENCE_PATTERN, '')
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, '$1[REDACTED]')
    .replace(/((api[_-]?key|token|secret|password)=)[^\s&]+/gi, '$1[REDACTED]')
    .replace(/(postgres(?:ql)?:\/\/)[^\s]+/gi, '$1[REDACTED]');
}

function systemCommandFailureMessage(error: unknown): string {
  const maybeError = error as { message?: unknown; stderr?: unknown; stdout?: unknown };
  const detail = [maybeError.stderr, maybeError.stdout, maybeError.message]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => sanitizeLogLine(item).trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return detail ? detail.slice(0, 240) : '未知错误，请查看运行日志。';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type AiInternalProviderRecord = Prisma.AiInternalProviderGetPayload<Record<string, never>>;

function toAdminAiInternalProvider(provider: AiInternalProviderRecord): AdminAiInternalProvider {
  return {
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    requestFormat: provider.requestFormat as AdminAiInternalProvider['requestFormat'],
    authType: provider.authType as AdminAiInternalProvider['authType'],
    enabled: provider.enabled,
    priority: provider.priority,
    credentialState:
      provider.authType === 'none'
        ? 'not_required'
        : provider.credential
          ? 'configured'
          : 'missing',
    notes: provider.notes,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

function toAdminDichaUsageEvent(record: AdminDichaUsageRecord): AdminDichaAiUsageEvent {
  return {
    id: record.id,
    kind: record.kind as AdminDichaAiUsageEvent['kind'],
    status: record.status as AdminDichaAiUsageEvent['status'],
    useCase: record.useCase as AdminDichaAiUsageEvent['useCase'],
    providerId: record.providerId,
    providerName: record.providerName,
    modelId: record.modelId,
    modelName: record.modelName,
    promptTokens: record.promptTokens,
    completionTokens: record.completionTokens,
    totalTokens: record.totalTokens,
    creditAmount: record.creditAmount,
    billingMode: record.billingMode as AdminDichaAiUsageEvent['billingMode'],
    requestId: record.requestId,
    upstreamRequestId: record.upstreamRequestId,
    internalProviderId: record.internalProviderId,
    internalProviderModelId: record.internalProviderModelId,
    creditLedgerEntryId: record.creditLedgerEntryId,
    usageEstimated: record.usageEstimated,
    estimatedCostUsd: record.estimatedCostUsd,
    estimatedCostAmount: record.estimatedCostAmount,
    estimatedCostCurrency:
      record.estimatedCostCurrency as AdminDichaAiUsageEvent['estimatedCostCurrency'],
    latencyMs: record.latencyMs,
    errorCategory: record.errorCategory,
    createdAt: record.createdAt.toISOString(),
    user: {
      id: record.owner.id,
      email: record.owner.email,
      name: record.owner.name,
    },
  };
}

function emptyAdminUsageSummary(): AiUsageSummary {
  return {
    calls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    degradedCalls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    creditAmount: 0,
    estimatedCostUsd: 0,
    costByCurrency: [],
    averageLatencyMs: null,
  };
}

function diagnosticFilterOptions(
  records: Array<{
    status: string;
    errorCategory: string | null;
    modelId: string;
    modelName: string;
    internalProviderId: string | null;
    internalProviderModelId: string | null;
  }>,
): AdminDichaAiDiagnosticsReport['filters'] {
  const statuses = new Map<AiUsageStatus, { label: string; count: number }>();
  const errorCategories = new Map<AiInvokeErrorCategory, { label: string; count: number }>();
  const models = new Map<string, { label: string; count: number }>();
  const internalChannels = new Map<string, { label: string; count: number }>();

  for (const record of records) {
    incrementOption(statuses, record.status as AiUsageStatus, statusLabel(record.status));
    if (record.errorCategory) {
      incrementOption(
        errorCategories,
        record.errorCategory as AiInvokeErrorCategory,
        record.errorCategory,
      );
    }
    incrementOption(models, record.modelId, `${record.modelName} · ${record.modelId}`);
    const channelKey = record.internalProviderModelId ?? record.internalProviderId;
    if (channelKey) {
      const label = record.internalProviderModelId
        ? `${record.internalProviderModelId}${record.internalProviderId ? ` · ${record.internalProviderId}` : ''}`
        : (record.internalProviderId ?? channelKey);
      incrementOption(internalChannels, channelKey, label);
    }
  }

  return {
    statuses: optionsFromMap(statuses),
    errorCategories: optionsFromMap(errorCategories),
    models: optionsFromMap(models),
    internalChannels: optionsFromMap(internalChannels),
  };
}

function incrementOption<T extends string>(
  map: Map<T, { label: string; count: number }>,
  key: T,
  label: string,
): void {
  const current = map.get(key);
  if (current) {
    current.count += 1;
  } else {
    map.set(key, { label, count: 1 });
  }
}

function optionsFromMap<T extends string>(
  map: Map<T, { label: string; count: number }>,
): Array<{ key: string; label: string; count: number }> {
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: value.label, count: value.count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function statusLabel(status: string): string {
  if (status === 'success') return '成功';
  if (status === 'degraded') return '降级';
  if (status === 'failure') return '失败';
  return status;
}

function summarizeAdminUsage(events: AdminDichaAiUsageEvent[]): AiUsageSummary {
  const summary = emptyAdminUsageSummary();
  let latencyTotal = 0;
  let latencyCount = 0;

  for (const event of events) {
    summary.calls += 1;
    summary.successfulCalls += event.status === 'success' ? 1 : 0;
    summary.failedCalls += event.status === 'failure' ? 1 : 0;
    summary.degradedCalls += event.status === 'degraded' ? 1 : 0;
    summary.promptTokens += event.promptTokens;
    summary.completionTokens += event.completionTokens;
    summary.totalTokens += event.totalTokens;
    summary.creditAmount += event.creditAmount;
    summary.estimatedCostUsd += event.estimatedCostUsd;
    addAdminUsageCost(summary, event.estimatedCostCurrency, event.estimatedCostAmount);
    if (event.latencyMs !== null) {
      latencyTotal += event.latencyMs;
      latencyCount += 1;
    }
  }

  summary.estimatedCostUsd = Number(summary.estimatedCostUsd.toFixed(6));
  summary.costByCurrency = summary.costByCurrency.map((item) => ({
    currency: item.currency,
    amount: Number(item.amount.toFixed(6)),
  }));
  summary.averageLatencyMs = latencyCount > 0 ? Math.round(latencyTotal / latencyCount) : null;
  return summary;
}

function addAdminUsageCost(
  summary: AiUsageSummary,
  currency: AdminDichaAiUsageEvent['estimatedCostCurrency'],
  amount: number,
): void {
  if (!currency || amount <= 0) return;
  const current = summary.costByCurrency.find((item) => item.currency === currency);
  if (current) {
    current.amount += amount;
  } else {
    summary.costByCurrency.push({ currency, amount });
  }
}

function adminUsagePerformance(
  events: AdminDichaAiUsageEvent[],
  from: Date | null,
  to: Date,
): AiUsagePerformance {
  if (events.length === 0) {
    return {
      averageRpm: 0,
      averageTpm: 0,
      peakRpm: 0,
      peakTpm: 0,
      successRate: 0,
      p95LatencyMs: null,
    };
  }

  const summary = summarizeAdminUsage(events);
  const rangeStart = from ?? firstAdminUsageEventDate(events) ?? to;
  const minutes = Math.max(1, (to.getTime() - rangeStart.getTime()) / MINUTE_MS);
  const minuteBuckets = new Map<string, { calls: number; tokens: number }>();
  const latencies = events
    .map((event) => event.latencyMs)
    .filter((latency): latency is number => latency !== null)
    .sort((left, right) => left - right);

  for (const event of events) {
    const key = minuteKey(new Date(event.createdAt));
    const bucket = minuteBuckets.get(key) ?? { calls: 0, tokens: 0 };
    bucket.calls += 1;
    bucket.tokens += event.totalTokens;
    minuteBuckets.set(key, bucket);
  }

  return {
    averageRpm: roundRate(summary.calls / minutes),
    averageTpm: roundRate(summary.totalTokens / minutes),
    peakRpm: Math.max(...Array.from(minuteBuckets.values()).map((bucket) => bucket.calls), 0),
    peakTpm: Math.max(...Array.from(minuteBuckets.values()).map((bucket) => bucket.tokens), 0),
    successRate: summary.calls > 0 ? roundRate(summary.successfulCalls / summary.calls) : 0,
    p95LatencyMs:
      latencies.length > 0 ? (latencies[Math.ceil(latencies.length * 0.95) - 1] ?? null) : null,
  };
}

function adminUsageBreakdown(
  events: AdminDichaAiUsageEvent[],
  identity: (event: AdminDichaAiUsageEvent) => Pick<AiUsageBreakdown, 'key' | 'label'>,
): AiUsageBreakdown[] {
  const grouped = new Map<string, { label: string; events: AdminDichaAiUsageEvent[] }>();
  for (const event of events) {
    const item = identity(event);
    const group = grouped.get(item.key);
    if (group) {
      group.events.push(event);
    } else {
      grouped.set(item.key, { label: item.label, events: [event] });
    }
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: value.label,
      ...summarizeAdminUsage(value.events),
    }))
    .sort((left, right) => {
      const rightCost = usageCostSortValue(right);
      const leftCost = usageCostSortValue(left);
      if (rightCost !== leftCost) return rightCost - leftCost;
      if (right.totalTokens !== left.totalTokens) return right.totalTokens - left.totalTokens;
      return right.calls - left.calls;
    });
}

function adminUserUsageBreakdown(events: AdminDichaAiUsageEvent[]) {
  const grouped = new Map<
    string,
    { user: AdminDichaAiUsageEvent['user']; events: AdminDichaAiUsageEvent[] }
  >();
  for (const event of events) {
    const group = grouped.get(event.user.id);
    if (group) {
      group.events.push(event);
    } else {
      grouped.set(event.user.id, { user: event.user, events: [event] });
    }
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: value.user.name,
      user: value.user,
      ...summarizeAdminUsage(value.events),
    }))
    .sort((left, right) => {
      const rightCost = usageCostSortValue(right);
      const leftCost = usageCostSortValue(left);
      if (rightCost !== leftCost) return rightCost - leftCost;
      if (right.totalTokens !== left.totalTokens) return right.totalTokens - left.totalTokens;
      return right.calls - left.calls;
    });
}

function adminUsageDistribution(
  events: AdminDichaAiUsageEvent[],
  from: Date | null,
  to: Date,
  granularity: AiUsageBucketGranularity,
  groupBy: AiUsageDistributionGroupBy,
): AiUsageDistribution {
  const buckets = from ? adminUsageTimeBuckets(events, from, to, granularity) : [];
  const groups = adminUsageBreakdown(events, (event) => ({
    key: groupBy === 'provider' ? event.providerId : `${event.providerId}:${event.modelId}`,
    label:
      groupBy === 'provider' ? event.providerName : `${event.modelName} · ${event.providerName}`,
  })).map((group) => ({
    ...group,
    groupBy,
    buckets: from
      ? adminUsageTimeBuckets(
          events.filter((event) =>
            groupBy === 'provider'
              ? event.providerId === group.key
              : `${event.providerId}:${event.modelId}` === group.key,
          ),
          from,
          to,
          granularity,
        )
      : [],
  }));

  return {
    groupBy,
    granularity,
    buckets,
    groups,
  };
}

function adminUsageTimeBuckets(
  events: AdminDichaAiUsageEvent[],
  from: Date,
  to: Date,
  granularity: AiUsageBucketGranularity,
): AiUsageTimeBucket[] {
  const buckets: AiUsageTimeBucket[] = [];
  const bucketStart = granularity === 'hour' ? startOfHour(from) : startOfDay(from);
  const bucketMs = granularity === 'hour' ? HOUR_MS : DAY_MS;

  for (let cursor = bucketStart; cursor < to; cursor = new Date(cursor.getTime() + bucketMs)) {
    const end = new Date(cursor.getTime() + bucketMs);
    const bucketEvents = events.filter((event) => {
      const createdAt = new Date(event.createdAt);
      return createdAt >= cursor && createdAt < end;
    });
    buckets.push({
      key: `${granularity}:${cursor.toISOString()}`,
      label:
        granularity === 'hour'
          ? cursor.toISOString().slice(11, 16)
          : cursor.toISOString().slice(5, 10),
      granularity,
      start: cursor.toISOString(),
      end: end.toISOString(),
      ...summarizeAdminUsage(bucketEvents),
    });
  }

  return buckets;
}

function usageWindowStart(now: Date, window: AiUsageWindow): Date | null {
  const hoursByWindow: Record<Exclude<AiUsageWindow, 'all'>, number> = {
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
  };
  if (window === 'all') return null;
  return new Date(now.getTime() - hoursByWindow[window] * HOUR_MS);
}

function usageReportRangeStart(
  events: AdminDichaAiUsageEvent[],
  from: Date | null,
  now: Date,
): Date | null {
  if (from) return from;
  return firstAdminUsageEventDate(events) ?? (events.length > 0 ? now : null);
}

function usageHourlyRangeStart(
  events: AdminDichaAiUsageEvent[],
  rangeFrom: Date | null,
  now: Date,
): Date {
  const cappedFrom = new Date(now.getTime() - MAX_HOURLY_BUCKETS * HOUR_MS);
  const candidate =
    rangeFrom ?? firstAdminUsageEventDate(events) ?? new Date(now.getTime() - 24 * HOUR_MS);
  return candidate > cappedFrom ? candidate : cappedFrom;
}

function firstAdminUsageEventDate(events: AdminDichaAiUsageEvent[]): Date | null {
  if (events.length === 0) return null;
  return events.reduce((earliest, event) => {
    const createdAt = new Date(event.createdAt);
    return createdAt < earliest ? createdAt : earliest;
  }, new Date(events[0]!.createdAt));
}

function startOfHour(date: Date): Date {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  return next;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function minuteKey(date: Date): string {
  const next = new Date(date);
  next.setUTCSeconds(0, 0);
  return next.toISOString();
}

function roundRate(value: number): number {
  return Number(value.toFixed(3));
}

function usageCostSortValue(summary: AiUsageSummary): number {
  if (summary.estimatedCostUsd > 0) return summary.estimatedCostUsd;
  return summary.costByCurrency.reduce((total, item) => total + item.amount, 0);
}
