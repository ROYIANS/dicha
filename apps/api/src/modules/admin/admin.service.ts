import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminAiProvidersOverview,
  AdminAiSystemChannel,
  AdminAiSystemChannelUpsert,
  AdminOverview,
  AdminPlatformStats,
  AdminUserDetail,
  AdminUsersList,
  AdminUsersQuery,
} from '@dicha/shared';
import { aiModelBank, aiProviderTemplates } from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type AdminSessionUser = {
  id: string;
  email: string;
  name?: string | null;
};

@Injectable()
export class AdminService {
  private readonly aiEncryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
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
          title: 'AI 供应商',
          description: '系统托管渠道、官方 DicHA 供应商与模型配置。',
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

  async getAiProviders(): Promise<AdminAiProvidersOverview> {
    const channels = await this.prisma.aiSystemProviderChannel.findMany({
      orderBy: [{ providerId: 'asc' }, { modelId: 'asc' }, { priority: 'asc' }],
    });
    const modelsByProvider = this.modelCountsByProvider();

    return {
      generatedAt: new Date().toISOString(),
      providers: aiProviderTemplates.map((provider) => {
        const counts = modelsByProvider.get(provider.id) ?? { modelCount: 0, enabledModelCount: 0 };
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
        };
      }),
      systemChannels: channels.map(toAdminAiSystemChannel),
    };
  }

  async upsertAiSystemChannel(body: AdminAiSystemChannelUpsert): Promise<AdminAiSystemChannel> {
    const provider = aiProviderTemplates.find((item) => item.id === body.providerId);
    if (!provider || provider.credentialMode !== 'platform_managed') {
      throw new BadRequestException('Unknown platform-managed AI provider');
    }
    const model = aiModelBank.find(
      (item) => item.id === body.modelId && item.providerId === body.providerId,
    );
    if (!model) {
      throw new BadRequestException('Unknown platform-managed AI model');
    }

    const existing = body.channelId
      ? await this.prisma.aiSystemProviderChannel.findUnique({ where: { id: body.channelId } })
      : null;
    const credential: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined =
      body.authType === 'none'
        ? Prisma.JsonNull
        : body.credential
          ? this.encryptAiCredential(body.credential)
          : existing?.credential
            ? (existing.credential as Prisma.InputJsonValue)
            : undefined;

    const channel = body.channelId
      ? await this.prisma.aiSystemProviderChannel.update({
          where: { id: body.channelId },
          data: {
            providerId: body.providerId,
            modelId: body.modelId,
            name: body.name,
            upstreamBaseUrl: body.upstreamBaseUrl,
            upstreamModelName: body.upstreamModelName,
            requestFormat: body.requestFormat,
            authType: body.authType,
            credential,
            enabled: body.enabled,
            priority: body.priority,
            notes: body.notes ?? null,
          },
        })
      : await this.prisma.aiSystemProviderChannel.create({
          data: {
            providerId: body.providerId,
            modelId: body.modelId,
            name: body.name,
            upstreamBaseUrl: body.upstreamBaseUrl,
            upstreamModelName: body.upstreamModelName,
            requestFormat: body.requestFormat,
            authType: body.authType,
            credential,
            enabled: body.enabled,
            priority: body.priority,
            notes: body.notes ?? null,
          },
        });

    return toAdminAiSystemChannel(channel);
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

  private modelCountsByProvider(): Map<string, { modelCount: number; enabledModelCount: number }> {
    const counts = new Map<string, { modelCount: number; enabledModelCount: number }>();
    for (const model of aiModelBank) {
      const current = counts.get(model.providerId) ?? { modelCount: 0, enabledModelCount: 0 };
      current.modelCount += 1;
      if (model.enabled) current.enabledModelCount += 1;
      counts.set(model.providerId, current);
    }
    return counts;
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

type AiSystemProviderChannelRecord = Prisma.AiSystemProviderChannelGetPayload<Record<string, never>>;

function toAdminAiSystemChannel(channel: AiSystemProviderChannelRecord): AdminAiSystemChannel {
  return {
    id: channel.id,
    providerId: channel.providerId,
    modelId: channel.modelId,
    name: channel.name,
    upstreamBaseUrl: channel.upstreamBaseUrl,
    upstreamModelName: channel.upstreamModelName,
    requestFormat: channel.requestFormat as AdminAiSystemChannel['requestFormat'],
    authType: channel.authType as AdminAiSystemChannel['authType'],
    enabled: channel.enabled,
    priority: channel.priority,
    credentialState:
      channel.authType === 'none' ? 'not_required' : channel.credential ? 'configured' : 'missing',
    notes: channel.notes,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}
