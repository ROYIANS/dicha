import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminAiInternalProvider,
  AdminAiInternalProviderUpsert,
  AdminCreditBalancesPage,
  AdminCreditBalancesQuery,
  AdminCreditGrant,
  AdminCreditGrantResponse,
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
  AdminPlatformStats,
  AdminUserDetail,
  AdminUsersList,
  AdminUsersQuery,
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

@Injectable()
export class AdminService {
  private readonly aiEncryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('AI_GATEWAY_SECRET_KEY') ?? this.developmentAiSecret(config);
    this.aiEncryptionKey = createHash('sha256').update(secret).digest();
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
              | AiProvider['requestFormat']
              | undefined,
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
    if (updated) return updated;
    const counts = this.countDirectoryModels(overview.models).get(provider.id) ?? {
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
      enabled: body.enabled ?? false,
      baseUrl: body.baseUrl ?? provider.baseUrl,
      requestFormat: body.requestFormat ?? provider.requestFormat,
      authType: body.authType ?? provider.authType,
      notes: body.notes ?? null,
    };
  }

  async syncAiProviderDirectoryModels(
    body: AdminAiProviderDirectorySync,
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
    return { providerId: provider.id, syncedCount: remoteModels.length };
  }

  async updateAiProviderDirectoryModel(
    body: AdminAiProviderDirectoryModelUpdate,
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
    return this.getAiProviderDirectory();
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

    return toAdminAiInternalProvider(provider);
  }

  async syncDichaInternalProviderModels(
    body: AdminDichaInternalProviderSync,
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
    return { providerId: provider.id, syncedCount: remoteModels.length };
  }

  async updateDichaModel(body: AdminDichaModelUpdate): Promise<AdminDichaAiServiceOverview> {
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
    return this.getDichaAiService();
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

  upsertCreditRule(body: AdminCreditRuleUpsert): Promise<AdminCreditRule> {
    return this.credits.upsertCreditRule(body);
  }

  grantCredits(body: AdminCreditGrant): Promise<AdminCreditGrantResponse> {
    return this.credits.grantCredits(body);
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

  upsertCreditRedemptionCode(
    body: AdminCreditRedemptionCodeUpsert,
  ): Promise<AdminCreditRedemptionCode> {
    return this.credits.upsertRedemptionCode(body);
  }

  async listUsers(query: AdminUsersQuery): Promise<AdminUsersList> {
    const page = query.page;
    const pageSize = query.pageSize;
    const search = query.search?.trim();
    const where = this.userSearchWhere(search);

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

    return {
      generatedAt: new Date().toISOString(),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      users: users.map(toUserSummary),
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

    return {
      ...toUserSummary(user),
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

  private directoryOverviewModels(
    recordsByProvider: Map<string, Prisma.AiProviderDirectoryModelGetPayload<Record<string, never>>[]>,
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
      extensionParameters: this.arrayFromJson<AiModelExtensionParameter>(record.extensionParameters),
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

  private directoryModelCreateInput(
    model: AiModel,
  ): Prisma.AiProviderDirectoryModelCreateInput {
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
      modelType: remoteModel.modelType ?? metadata?.modelType ?? this.modelTypeFromCapabilities(capabilities),
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
    const message = typeof response === 'string' ? response : (response as { message?: unknown }).message;
    if (typeof message === 'string') return message.includes('(401)') || message.includes('(403)');
    return Array.isArray(message)
      ? message.some((item) => typeof item === 'string' && (item.includes('(401)') || item.includes('(403)')))
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

  private userSearchWhere(search: string | undefined): Prisma.UserWhereInput {
    if (!search) return {};
    return {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { homeName: { contains: search, mode: 'insensitive' } },
      ],
    };
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

function toUserSummary(user: UserSummaryRecord) {
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
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    counts: {
      sessions: user._count.sessions,
      accounts: user._count.accounts,
      passkeys: user._count.passkeys,
    },
  };
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
      provider.authType === 'none' ? 'not_required' : provider.credential ? 'configured' : 'missing',
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
    estimatedCostCurrency: record.estimatedCostCurrency as AdminDichaAiUsageEvent['estimatedCostCurrency'],
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
        : record.internalProviderId ?? channelKey;
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
    p95LatencyMs: latencies.length > 0 ? (latencies[Math.ceil(latencies.length * 0.95) - 1] ?? null) : null,
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
    label: groupBy === 'provider' ? event.providerName : `${event.modelName} · ${event.providerName}`,
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
      label: granularity === 'hour' ? cursor.toISOString().slice(11, 16) : cursor.toISOString().slice(5, 10),
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
  const candidate = rangeFrom ?? firstAdminUsageEventDate(events) ?? new Date(now.getTime() - 24 * HOUR_MS);
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
