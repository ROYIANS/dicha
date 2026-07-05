import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
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
  CreditAccount,
  CreditBalanceReport,
  CreditCheckInCampaign,
  CreditCheckInResponse,
  CreditCheckInStatus,
  CreditLedgerEntry,
  CreditLedgerType,
  CreditLedgerPage,
  CreditLedgerQuery,
  CreditRedeemResponse,
} from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CreditAccountRecord = Prisma.CreditAccountGetPayload<Record<string, never>>;
type CreditLedgerRecord = Prisma.CreditLedgerEntryGetPayload<Record<string, never>>;
type CreditCheckInCampaignRecord = Prisma.CreditCheckInCampaignGetPayload<Record<string, never>>;
type CreditRuleRecord = Prisma.CreditRuleGetPayload<Record<string, never>>;
type CreditCodeRecord = Prisma.CreditRedemptionCodeGetPayload<Record<string, never>>;
type CreditCheckInWithUserRecord = Prisma.CreditCheckInGetPayload<{
  include: { owner: { select: { id: true; email: true; name: true } } };
}>;
type CreditLedgerWithUserRecord = Prisma.CreditLedgerEntryGetPayload<{
  include: { owner: { select: { id: true; email: true; name: true } } };
}>;
type CreditAccountWithUserRecord = Prisma.CreditAccountGetPayload<{
  include: { owner: { select: { id: true; email: true; name: true } } };
}>;
type CreditLedgerWithUserAndAccountRecord = Prisma.CreditLedgerEntryGetPayload<{
  include: {
    owner: { select: { id: true; email: true; name: true } };
    account: true;
  };
}>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DICHA_PROVIDER_ID = 'dicha';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(ownerId: string): Promise<CreditBalanceReport> {
    const account = await this.ensureAccount(ownerId);
    const recentLedger = await this.prisma.creditLedgerEntry.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return {
      generatedAt: new Date().toISOString(),
      account: toCreditAccount(account),
      recentLedger: recentLedger.map(toCreditLedgerEntry),
    };
  }

  async listLedger(ownerId: string, query: CreditLedgerQuery): Promise<CreditLedgerPage> {
    const where: Prisma.CreditLedgerEntryWhereInput = {
      ownerId,
      ...(query.type ? { type: query.type } : {}),
    };
    const [total, entries] = await Promise.all([
      this.prisma.creditLedgerEntry.count({ where }),
      this.prisma.creditLedgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      entries: entries.map(toCreditLedgerEntry),
    };
  }

  async redeemCode(ownerId: string, rawCode: string): Promise<CreditRedeemResponse> {
    const codeValue = normalizeCode(rawCode);
    return this.prisma.$transaction(async (tx) => {
      const code = await tx.creditRedemptionCode.findUnique({ where: { code: codeValue } });
      if (!code || !code.enabled) {
        throw new BadRequestException('兑换码不存在或不可用');
      }
      if (code.expiresAt && code.expiresAt < new Date()) {
        throw new BadRequestException('兑换码已过期');
      }
      if (code.redeemedCount >= code.maxRedemptions) {
        throw new BadRequestException('兑换码已被使用完');
      }
      const existing = await tx.creditRedemption.findUnique({
        where: { ownerId_codeId: { ownerId, codeId: code.id } },
      });
      if (existing) {
        throw new BadRequestException('你已经兑换过这个兑换码');
      }

      const account = await this.ensureAccountTx(tx, ownerId);
      const updated = await tx.creditAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: code.creditAmount },
          lifetimeGranted: { increment: code.creditAmount },
        },
      });
      const ledger = await tx.creditLedgerEntry.create({
        data: {
          ownerId,
          accountId: updated.id,
          type: 'redeem',
          amount: code.creditAmount,
          balanceAfter: updated.balance,
          source: 'redemption_code',
          sourceId: code.id,
          description: '兑换码兑换积分',
          metadata: { code: code.code },
        },
      });
      await tx.creditRedemptionCode.update({
        where: { id: code.id },
        data: { redeemedCount: { increment: 1 } },
      });
      await tx.creditRedemption.create({
        data: {
          ownerId,
          codeId: code.id,
          ledgerEntryId: ledger.id,
        },
      });

      return {
        account: toCreditAccount(updated),
        ledgerEntry: toCreditLedgerEntry(ledger),
      };
    });
  }

  async getCheckInStatus(ownerId: string): Promise<CreditCheckInStatus> {
    const campaign = await this.activeCheckInCampaign();
    return this.buildCheckInStatus(ownerId, campaign, new Date());
  }

  async checkInToday(ownerId: string): Promise<CreditCheckInResponse> {
    const now = new Date();
    const campaign = await this.activeCheckInCampaign(now);
    if (!campaign) {
      throw new BadRequestException('签到活动暂未开启');
    }
    const checkInDate = checkInDateKey(now, campaign.timezone);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.creditCheckIn.findUnique({
          where: {
            ownerId_campaignId_checkInDate: {
              ownerId,
              campaignId: campaign.id,
              checkInDate,
            },
          },
        });
        if (existing) {
          throw new BadRequestException('今天已经签到过了');
        }

        const checkIn = await tx.creditCheckIn.create({
          data: {
            ownerId,
            campaignId: campaign.id,
            checkInDate,
            creditAmount: campaign.dailyCreditAmount,
            metadata: { timezone: campaign.timezone },
          },
        });
        const account = await this.ensureAccountTx(tx, ownerId);
        const updated = await tx.creditAccount.update({
          where: { id: account.id },
          data: {
            balance: { increment: campaign.dailyCreditAmount },
            lifetimeGranted: { increment: campaign.dailyCreditAmount },
          },
        });
        const ledger = await tx.creditLedgerEntry.create({
          data: {
            ownerId,
            accountId: updated.id,
            type: 'grant',
            amount: campaign.dailyCreditAmount,
            balanceAfter: updated.balance,
            source: 'daily_checkin',
            sourceId: checkIn.id,
            description: `${campaign.name}签到奖励`,
            metadata: {
              campaignId: campaign.id,
              checkInDate,
              timezone: campaign.timezone,
            },
          },
        });
        await tx.creditCheckIn.update({
          where: { id: checkIn.id },
          data: { ledgerEntryId: ledger.id },
        });

        return {
          account: toCreditAccount(updated),
          ledgerEntry: toCreditLedgerEntry(ledger),
          status: await this.buildCheckInStatus(ownerId, campaign, now, tx),
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new BadRequestException('今天已经签到过了');
      }
      throw error;
    }
  }

  async getCreditRules(): Promise<AdminCreditRulesOverview> {
    const rules = await this.prisma.creditRule.findMany({
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    });
    return {
      generatedAt: new Date().toISOString(),
      rules: rules.map(toCreditRule),
    };
  }

  async getCreditOperations(
    query: AdminCreditOperationsQuery,
  ): Promise<AdminCreditOperationsReport> {
    const now = new Date();
    const from = creditWindowStart(now, query.window);
    const ledgerWhere: Prisma.CreditLedgerEntryWhereInput = {
      ...(from ? { createdAt: { gte: from } } : {}),
    };
    const aiUsageWhere: Prisma.AiUsageEventWhereInput = {
      kind: 'invoke',
      providerId: DICHA_PROVIDER_ID,
      creditAmount: { gt: 0 },
      ...(from ? { createdAt: { gte: from } } : {}),
    };

    const [
      accountTotals,
      activeAccounts,
      ledgerEntries,
      balanceAccounts,
      redemptionCodes,
      aiUsageEvents,
    ] = await Promise.all([
      this.prisma.creditAccount.aggregate({
        _sum: { balance: true, lifetimeGranted: true, lifetimeSpent: true },
      }),
      this.prisma.creditAccount.count({ where: { balance: { gt: 0 } } }),
      this.prisma.creditLedgerEntry.findMany({
        where: ledgerWhere,
        include: {
          owner: { select: { id: true, email: true, name: true } },
          account: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditAccount.findMany({
        include: { owner: { select: { id: true, email: true, name: true } } },
        orderBy: [{ balance: 'desc' }, { updatedAt: 'desc' }],
        take: 8,
      }),
      this.prisma.creditRedemptionCode.findMany(),
      this.prisma.aiUsageEvent.findMany({
        where: aiUsageWhere,
        select: {
          modelId: true,
          modelName: true,
          useCase: true,
          creditAmount: true,
          totalTokens: true,
        },
      }),
    ]);

    const rangeFrom = creditReportRangeStart(ledgerEntries, from, now);

    return {
      generatedAt: now.toISOString(),
      window: query.window,
      from: from?.toISOString() ?? null,
      to: now.toISOString(),
      summary: creditOperationsSummary(accountTotals, activeAccounts, ledgerEntries),
      timeSeries: creditOperationBuckets(ledgerEntries, rangeFrom, now, query.window),
      byType: creditTypeBreakdown(ledgerEntries),
      userRanks: {
        byBalance: balanceAccounts.map((account) =>
          creditAccountRankItem(account, account.balance, null),
        ),
        bySpent: creditLedgerUserRank(ledgerEntries, (entry) =>
          entry.type === 'debit' && entry.amount < 0 ? Math.abs(entry.amount) : 0,
        ),
        byGranted: creditLedgerUserRank(ledgerEntries, (entry) =>
          entry.amount > 0 ? entry.amount : 0,
        ),
        byRecentActivity: recentCreditUserRank(ledgerEntries),
      },
      redemption: creditRedemptionSummary(redemptionCodes, now),
      aiUsage: {
        byModel: creditAiBreakdown(aiUsageEvents, (event) => ({
          key: event.modelId ?? 'unknown-model',
          label: event.modelName ?? '未知模型',
        })),
        byUseCase: creditAiBreakdown(aiUsageEvents, (event) => ({
          key: event.useCase ?? 'unknown-use-case',
          label: event.useCase ?? 'unknown-use-case',
        })),
      },
    };
  }

  async upsertCreditRule(body: AdminCreditRuleUpsert): Promise<AdminCreditRule> {
    const rule = await this.prisma.$transaction(async (tx) => {
      if (body.active) {
        await tx.creditRule.updateMany({ data: { active: false } });
      }
      if (body.ruleId) {
        return tx.creditRule.update({
          where: { id: body.ruleId },
          data: {
            name: body.name,
            active: body.active,
            cnyCreditsPerUnit: body.cnyCreditsPerUnit,
            usdCreditsPerUnit: body.usdCreditsPerUnit,
            platformMarkup: body.platformMarkup,
            minimumChargeCredits: body.minimumChargeCredits,
            notes: body.notes ?? null,
          },
        });
      }
      return tx.creditRule.create({
        data: {
          name: body.name,
          active: body.active,
          cnyCreditsPerUnit: body.cnyCreditsPerUnit,
          usdCreditsPerUnit: body.usdCreditsPerUnit,
          platformMarkup: body.platformMarkup,
          minimumChargeCredits: body.minimumChargeCredits,
          notes: body.notes ?? null,
        },
      });
    });
    return toCreditRule(rule);
  }

  async getCreditCheckInOverview(): Promise<AdminCreditCheckInOverview> {
    const campaign = await this.ensureCheckInCampaign();
    return this.buildAdminCheckInOverview(campaign);
  }

  async upsertCreditCheckInCampaign(
    body: AdminCreditCheckInCampaignUpsert,
  ): Promise<AdminCreditCheckInOverview> {
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new BadRequestException('活动结束时间必须晚于开始时间');
    }
    assertValidTimeZone(body.timezone);

    const campaign = body.campaignId
      ? await this.prisma.creditCheckInCampaign.update({
          where: { id: body.campaignId },
          data: {
            name: body.name,
            enabled: body.enabled,
            dailyCreditAmount: body.dailyCreditAmount,
            timezone: body.timezone,
            description: body.description ?? null,
            startsAt,
            endsAt,
          },
        })
      : await this.prisma.creditCheckInCampaign.create({
          data: {
            name: body.name,
            enabled: body.enabled,
            dailyCreditAmount: body.dailyCreditAmount,
            timezone: body.timezone,
            description: body.description ?? null,
            startsAt,
            endsAt,
          },
        });

    return this.buildAdminCheckInOverview(campaign);
  }

  async grantCredits(body: AdminCreditGrant): Promise<AdminCreditGrantResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: body.ownerId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.prisma.$transaction(async (tx) => {
      const account = await this.ensureAccountTx(tx, body.ownerId);
      const updated = await tx.creditAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: body.amount },
          lifetimeGranted: { increment: body.amount },
        },
      });
      const ledger = await tx.creditLedgerEntry.create({
        data: {
          ownerId: body.ownerId,
          accountId: updated.id,
          type: 'grant',
          amount: body.amount,
          balanceAfter: updated.balance,
          source: 'admin_grant',
          description: body.reason,
        },
      });
      return {
        account: toCreditAccount(updated),
        ledgerEntry: toCreditLedgerEntry(ledger),
      };
    });
  }

  async listCreditBalances(query: AdminCreditBalancesQuery): Promise<AdminCreditBalancesPage> {
    const search = query.search?.trim();
    const userWhere = userSearchWhere(search);
    const [total, users] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.user.findMany({
        where: userWhere,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: { id: true },
      }),
    ]);
    const accounts = await Promise.all(users.map((user) => this.ensureAccount(user.id)));
    const balances = await this.prisma.creditAccount.findMany({
      where: { id: { in: accounts.map((account) => account.id) } },
      include: { owner: { select: { id: true, email: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      generatedAt: new Date().toISOString(),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      balances: balances.map(toAdminCreditBalanceItem),
    };
  }

  async listCreditLedger(query: AdminCreditLedgerQuery): Promise<AdminCreditLedgerPage> {
    const search = query.search?.trim();
    const where: Prisma.CreditLedgerEntryWhereInput = {
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(search ? { owner: userSearchWhere(search) } : {}),
    };
    const [total, entries] = await Promise.all([
      this.prisma.creditLedgerEntry.count({ where }),
      this.prisma.creditLedgerEntry.findMany({
        where,
        include: { owner: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      entries: entries.map(toAdminCreditLedgerEntry),
    };
  }

  async getRedemptionCodes(): Promise<AdminCreditRedemptionCodesOverview> {
    const codes = await this.prisma.creditRedemptionCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return {
      generatedAt: new Date().toISOString(),
      codes: codes.map(toCreditCode),
    };
  }

  async upsertRedemptionCode(
    body: AdminCreditRedemptionCodeUpsert,
  ): Promise<AdminCreditRedemptionCode> {
    const code = body.code.trim().toUpperCase();
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const saved = body.codeId
      ? await this.prisma.creditRedemptionCode.update({
          where: { id: body.codeId },
          data: {
            code,
            creditAmount: body.creditAmount,
            enabled: body.enabled,
            maxRedemptions: body.maxRedemptions,
            expiresAt,
            notes: body.notes ?? null,
          },
        })
      : await this.prisma.creditRedemptionCode.create({
          data: {
            code,
            creditAmount: body.creditAmount,
            enabled: body.enabled,
            maxRedemptions: body.maxRedemptions,
            expiresAt,
            notes: body.notes ?? null,
          },
        });
    return toCreditCode(saved);
  }

  private async activeCheckInCampaign(now = new Date()): Promise<CreditCheckInCampaignRecord | null> {
    return this.prisma.creditCheckInCampaign.findFirst({
      where: {
        enabled: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async ensureCheckInCampaign(): Promise<CreditCheckInCampaignRecord> {
    const campaign = await this.prisma.creditCheckInCampaign.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (campaign) return campaign;
    return this.prisma.creditCheckInCampaign.create({
      data: {
        name: '每日签到',
        enabled: false,
        dailyCreditAmount: 20,
        timezone: 'Asia/Shanghai',
        description: '用户每日进入积分页完成签到后获得积分奖励。',
      },
    });
  }

  private async buildCheckInStatus(
    ownerId: string,
    campaign: CreditCheckInCampaignRecord | null,
    now: Date,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<CreditCheckInStatus> {
    const timezone = campaign?.timezone ?? 'Asia/Shanghai';
    const todayDate = checkInDateKey(now, timezone);
    const monthRange = checkInMonthRange(now, timezone);
    const records = campaign
      ? await db.creditCheckIn.findMany({
          where: {
            ownerId,
            campaignId: campaign.id,
            checkInDate: { gte: monthRange.firstDate, lte: monthRange.lastDate },
          },
        })
      : [];
    const recordByDate = new Map(records.map((record) => [record.checkInDate, record]));

    return {
      generatedAt: new Date().toISOString(),
      campaign: campaign ? toCreditCheckInCampaign(campaign) : null,
      todayDate,
      checkedInToday: recordByDate.has(todayDate),
      todayCreditAmount: campaign?.dailyCreditAmount ?? 0,
      month: {
        year: monthRange.year,
        month: monthRange.month,
        days: monthRange.dates.map((date) => {
          const record = recordByDate.get(date);
          return {
            date,
            checkedIn: Boolean(record),
            creditAmount: record?.creditAmount ?? 0,
            ledgerEntryId: record?.ledgerEntryId ?? null,
            createdAt: record?.createdAt.toISOString() ?? null,
          };
        }),
      },
    };
  }

  private async buildAdminCheckInOverview(
    campaign: CreditCheckInCampaignRecord,
  ): Promise<AdminCreditCheckInOverview> {
    const todayDate = checkInDateKey(new Date(), campaign.timezone);
    const [totalCheckIns, creditAggregate, userRows, todayCheckIns, recentCheckIns] =
      await Promise.all([
        this.prisma.creditCheckIn.count({ where: { campaignId: campaign.id } }),
        this.prisma.creditCheckIn.aggregate({
          where: { campaignId: campaign.id },
          _sum: { creditAmount: true },
        }),
        this.prisma.creditCheckIn.findMany({
          where: { campaignId: campaign.id },
          distinct: ['ownerId'],
          select: { ownerId: true },
        }),
        this.prisma.creditCheckIn.count({
          where: { campaignId: campaign.id, checkInDate: todayDate },
        }),
        this.prisma.creditCheckIn.findMany({
          where: { campaignId: campaign.id },
          include: { owner: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      campaign: toCreditCheckInCampaign(campaign),
      stats: {
        totalCheckIns,
        uniqueUsers: userRows.length,
        creditsGranted: creditAggregate._sum.creditAmount ?? 0,
        todayCheckIns,
      },
      recentCheckIns: recentCheckIns.map(toAdminCreditCheckInRecord),
    };
  }

  private ensureAccount(ownerId: string): Promise<CreditAccountRecord> {
    return this.prisma.creditAccount.upsert({
      where: { ownerId },
      update: {},
      create: { ownerId },
    });
  }

  private ensureAccountTx(
    tx: Prisma.TransactionClient,
    ownerId: string,
  ): Promise<CreditAccountRecord> {
    return tx.creditAccount.upsert({
      where: { ownerId },
      update: {},
      create: { ownerId },
    });
  }
}

function toCreditAccount(account: CreditAccountRecord): CreditAccount {
  return {
    ownerId: account.ownerId,
    balance: account.balance,
    lifetimeGranted: account.lifetimeGranted,
    lifetimeSpent: account.lifetimeSpent,
    updatedAt: account.updatedAt.toISOString(),
  };
}

function toCreditCheckInCampaign(campaign: CreditCheckInCampaignRecord): CreditCheckInCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    enabled: campaign.enabled,
    dailyCreditAmount: campaign.dailyCreditAmount,
    timezone: campaign.timezone,
    description: campaign.description,
    startsAt: campaign.startsAt?.toISOString() ?? null,
    endsAt: campaign.endsAt?.toISOString() ?? null,
  };
}

function toAdminCreditCheckInRecord(
  record: CreditCheckInWithUserRecord,
): AdminCreditCheckInOverview['recentCheckIns'][number] {
  return {
    id: record.id,
    checkInDate: record.checkInDate,
    creditAmount: record.creditAmount,
    ledgerEntryId: record.ledgerEntryId,
    createdAt: record.createdAt.toISOString(),
    user: {
      id: record.owner.id,
      email: record.owner.email,
      name: record.owner.name,
    },
  };
}

function creditWindowStart(now: Date, window: AdminCreditOperationsQuery['window']): Date | null {
  if (window === '24h') return new Date(now.getTime() - 24 * HOUR_MS);
  if (window === '7d') return new Date(now.getTime() - 7 * DAY_MS);
  if (window === '30d') return new Date(now.getTime() - 30 * DAY_MS);
  return null;
}

function creditReportRangeStart(
  entries: CreditLedgerWithUserAndAccountRecord[],
  from: Date | null,
  now: Date,
): Date {
  if (from) return from;
  const oldest = entries.at(-1)?.createdAt;
  return oldest ?? new Date(now.getTime() - 30 * DAY_MS);
}

function creditOperationsSummary(
  accountTotals: {
    _sum: {
      balance: number | null;
      lifetimeGranted: number | null;
      lifetimeSpent: number | null;
    };
  },
  activeAccounts: number,
  entries: CreditLedgerWithUserAndAccountRecord[],
): AdminCreditOperationsReport['summary'] {
  const summary: AdminCreditOperationsReport['summary'] = {
    totalBalance: accountTotals._sum.balance ?? 0,
    lifetimeGranted: accountTotals._sum.lifetimeGranted ?? 0,
    lifetimeSpent: accountTotals._sum.lifetimeSpent ?? 0,
    activeAccounts,
    ledgerEntries: entries.length,
    grantedCredits: 0,
    redeemedCredits: 0,
    spentCredits: 0,
    refundedCredits: 0,
    adjustedCredits: 0,
    expiredCredits: 0,
    aiSpentCredits: 0,
    netChange: 0,
  };

  for (const entry of entries) {
    applyCreditEntry(summary, entry);
  }
  return summary;
}

function creditOperationBuckets(
  entries: CreditLedgerWithUserAndAccountRecord[],
  from: Date,
  to: Date,
  window: AdminCreditOperationsQuery['window'],
): AdminCreditOperationsReport['timeSeries'] {
  const granularity = window === '24h' ? 'hour' : 'day';
  const bucketMs = granularity === 'hour' ? HOUR_MS : DAY_MS;
  const buckets = new Map<string, AdminCreditOperationsReport['timeSeries'][number]>();
  const cursor = alignCreditBucketStart(from, granularity);

  while (cursor <= to) {
    const key = creditBucketKey(cursor, granularity);
    buckets.set(key, emptyCreditBucket(key, creditBucketLabel(cursor, granularity)));
    cursor.setTime(cursor.getTime() + bucketMs);
  }

  for (const entry of entries) {
    const key = creditBucketKey(entry.createdAt, granularity);
    const bucket = buckets.get(key);
    if (bucket) applyCreditEntry(bucket, entry);
  }

  return [...buckets.values()];
}

function emptyCreditBucket(
  key: string,
  label: string,
): AdminCreditOperationsReport['timeSeries'][number] {
  return {
    key,
    label,
    grantedCredits: 0,
    redeemedCredits: 0,
    spentCredits: 0,
    refundedCredits: 0,
    adjustedCredits: 0,
    expiredCredits: 0,
    aiSpentCredits: 0,
    netChange: 0,
    entries: 0,
  };
}

function applyCreditEntry(
  target: AdminCreditOperationsReport['summary'] | AdminCreditOperationsReport['timeSeries'][number],
  entry: Pick<CreditLedgerWithUserAndAccountRecord, 'amount' | 'type' | 'source'>,
): void {
  const amount = entry.amount;
  if ('entries' in target) target.entries += 1;
  target.netChange += amount;

  if (entry.type === 'grant' && amount > 0) target.grantedCredits += amount;
  if (entry.type === 'redeem' && amount > 0) target.redeemedCredits += amount;
  if (entry.type === 'refund' && amount > 0) target.refundedCredits += amount;
  if (entry.type === 'adjustment') target.adjustedCredits += amount;
  if (entry.type === 'debit' && amount < 0) {
    target.spentCredits += Math.abs(amount);
    if (entry.source === 'ai_invoke') target.aiSpentCredits += Math.abs(amount);
  }
  if (entry.type === 'expiry' && amount < 0) target.expiredCredits += Math.abs(amount);
}

function creditTypeBreakdown(
  entries: CreditLedgerWithUserAndAccountRecord[],
): AdminCreditOperationsReport['byType'] {
  const grouped = new Map<CreditLedgerType, { credits: number; entries: number }>();
  for (const entry of entries) {
    const type = entry.type as CreditLedgerType;
    const current = grouped.get(type) ?? { credits: 0, entries: 0 };
    current.credits += entry.amount;
    current.entries += 1;
    grouped.set(type, current);
  }
  return [...grouped.entries()]
    .map(([key, value]) => ({
      key,
      label: creditLedgerTypeLabel(key),
      credits: value.credits,
      entries: value.entries,
    }))
    .sort((left, right) => Math.abs(right.credits) - Math.abs(left.credits));
}

function creditLedgerUserRank(
  entries: CreditLedgerWithUserAndAccountRecord[],
  amountForEntry: (entry: CreditLedgerWithUserAndAccountRecord) => number,
): AdminCreditOperationsReport['userRanks']['bySpent'] {
  const grouped = new Map<
    string,
    { entry: CreditLedgerWithUserAndAccountRecord; credits: number; lastActivityAt: Date }
  >();
  for (const entry of entries) {
    const credits = amountForEntry(entry);
    if (credits <= 0) continue;
    const current = grouped.get(entry.ownerId);
    if (current) {
      current.credits += credits;
      if (entry.createdAt > current.lastActivityAt) current.lastActivityAt = entry.createdAt;
    } else {
      grouped.set(entry.ownerId, { entry, credits, lastActivityAt: entry.createdAt });
    }
  }
  return [...grouped.values()]
    .sort((left, right) => right.credits - left.credits)
    .slice(0, 8)
    .map((item) => creditLedgerRankItem(item.entry, item.credits, item.lastActivityAt));
}

function recentCreditUserRank(
  entries: CreditLedgerWithUserAndAccountRecord[],
): AdminCreditOperationsReport['userRanks']['byRecentActivity'] {
  const seen = new Set<string>();
  const ranks: AdminCreditOperationsReport['userRanks']['byRecentActivity'] = [];
  for (const entry of entries) {
    if (seen.has(entry.ownerId)) continue;
    seen.add(entry.ownerId);
    ranks.push(creditLedgerRankItem(entry, entry.amount, entry.createdAt));
    if (ranks.length >= 8) break;
  }
  return ranks;
}

function creditAccountRankItem(
  account: CreditAccountWithUserRecord,
  credits: number,
  lastActivityAt: Date | null,
): AdminCreditOperationsReport['userRanks']['byBalance'][number] {
  return {
    user: {
      id: account.owner.id,
      email: account.owner.email,
      name: account.owner.name,
    },
    balance: account.balance,
    lifetimeGranted: account.lifetimeGranted,
    lifetimeSpent: account.lifetimeSpent,
    credits,
    lastActivityAt: lastActivityAt?.toISOString() ?? null,
  };
}

function creditLedgerRankItem(
  entry: CreditLedgerWithUserAndAccountRecord,
  credits: number,
  lastActivityAt: Date,
): AdminCreditOperationsReport['userRanks']['byBalance'][number] {
  return {
    user: {
      id: entry.owner.id,
      email: entry.owner.email,
      name: entry.owner.name,
    },
    balance: entry.account.balance,
    lifetimeGranted: entry.account.lifetimeGranted,
    lifetimeSpent: entry.account.lifetimeSpent,
    credits,
    lastActivityAt: lastActivityAt.toISOString(),
  };
}

function creditRedemptionSummary(
  codes: CreditCodeRecord[],
  now: Date,
): AdminCreditOperationsReport['redemption'] {
  const soon = new Date(now.getTime() + 7 * DAY_MS);
  let enabledCodes = 0;
  let exhaustedCodes = 0;
  let expiredCodes = 0;
  let expiringSoonCodes = 0;
  let totalPotentialCredits = 0;
  let redeemedCredits = 0;
  let totalRedemptions = 0;

  for (const code of codes) {
    const exhausted = code.redeemedCount >= code.maxRedemptions;
    const expired = Boolean(code.expiresAt && code.expiresAt < now);
    if (code.enabled) enabledCodes += 1;
    if (exhausted) exhaustedCodes += 1;
    if (expired) expiredCodes += 1;
    if (code.enabled && code.expiresAt && code.expiresAt >= now && code.expiresAt <= soon) {
      expiringSoonCodes += 1;
    }
    totalPotentialCredits += code.creditAmount * code.maxRedemptions;
    redeemedCredits += code.creditAmount * code.redeemedCount;
    totalRedemptions += code.redeemedCount;
  }

  return {
    totalCodes: codes.length,
    enabledCodes,
    exhaustedCodes,
    expiredCodes,
    expiringSoonCodes,
    totalPotentialCredits,
    redeemedCredits,
    remainingCredits: Math.max(totalPotentialCredits - redeemedCredits, 0),
    totalRedemptions,
    usageRate: totalPotentialCredits > 0 ? redeemedCredits / totalPotentialCredits : 0,
  };
}

function creditAiBreakdown(
  events: Array<{
    creditAmount: number;
    totalTokens: number;
  }>,
  group: (event: {
    modelId?: string;
    modelName?: string;
    useCase?: string;
    creditAmount: number;
    totalTokens: number;
  }) => { key: string; label: string },
): AdminCreditOperationsReport['aiUsage']['byModel'] {
  const grouped = new Map<string, { label: string; credits: number; calls: number; tokens: number }>();
  for (const event of events) {
    const option = group(event);
    const current = grouped.get(option.key) ?? {
      label: option.label,
      credits: 0,
      calls: 0,
      tokens: 0,
    };
    current.credits += event.creditAmount;
    current.calls += 1;
    current.tokens += event.totalTokens;
    grouped.set(option.key, current);
  }
  return [...grouped.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((left, right) => right.credits - left.credits)
    .slice(0, 10);
}

function alignCreditBucketStart(date: Date, granularity: 'hour' | 'day'): Date {
  const value = new Date(date);
  value.setMinutes(0, 0, 0);
  if (granularity === 'day') value.setHours(0, 0, 0, 0);
  return value;
}

function creditBucketKey(date: Date, granularity: 'hour' | 'day'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (granularity === 'day') return `${year}-${month}-${day}`;
  const hour = String(date.getHours()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:00`;
}

function creditBucketLabel(date: Date, granularity: 'hour' | 'day'): string {
  if (granularity === 'hour') {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function creditLedgerTypeLabel(type: CreditLedgerType): string {
  if (type === 'grant') return '发放';
  if (type === 'redeem') return '兑换';
  if (type === 'debit') return '扣费';
  if (type === 'refund') return '退款';
  if (type === 'adjustment') return '调整';
  if (type === 'expiry') return '过期';
  return type;
}

function toCreditLedgerEntry(entry: CreditLedgerRecord): CreditLedgerEntry {
  return {
    id: entry.id,
    ownerId: entry.ownerId,
    type: entry.type as CreditLedgerEntry['type'],
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    source: entry.source as CreditLedgerEntry['source'],
    sourceId: entry.sourceId,
    aiUsageEventId: entry.aiUsageEventId,
    description: entry.description,
    metadata:
      entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
        ? (entry.metadata as Record<string, unknown>)
        : null,
    createdAt: entry.createdAt.toISOString(),
  };
}

function toAdminCreditLedgerEntry(entry: CreditLedgerWithUserRecord) {
  return {
    ...toCreditLedgerEntry(entry),
    user: {
      id: entry.owner.id,
      email: entry.owner.email,
      name: entry.owner.name,
    },
  };
}

function toAdminCreditBalanceItem(item: CreditAccountWithUserRecord) {
  return {
    user: {
      id: item.owner.id,
      email: item.owner.email,
      name: item.owner.name,
    },
    account: toCreditAccount(item),
  };
}

function toCreditRule(rule: CreditRuleRecord): AdminCreditRule {
  return {
    id: rule.id,
    name: rule.name,
    active: rule.active,
    cnyCreditsPerUnit: rule.cnyCreditsPerUnit,
    usdCreditsPerUnit: rule.usdCreditsPerUnit,
    platformMarkup: rule.platformMarkup,
    minimumChargeCredits: rule.minimumChargeCredits,
    notes: rule.notes,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function toCreditCode(code: CreditCodeRecord): AdminCreditRedemptionCode {
  return {
    id: code.id,
    code: code.code,
    creditAmount: code.creditAmount,
    enabled: code.enabled,
    maxRedemptions: code.maxRedemptions,
    redeemedCount: code.redeemedCount,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    notes: code.notes,
    createdAt: code.createdAt.toISOString(),
    updatedAt: code.updatedAt.toISOString(),
  };
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function assertValidTimeZone(value: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
  } catch {
    throw new BadRequestException('签到活动时区无效');
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function checkInDateKey(date: Date, timezone: string): string {
  const parts = localDateParts(date, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function checkInMonthRange(date: Date, timezone: string): {
  year: number;
  month: number;
  firstDate: string;
  lastDate: string;
  dates: string[];
} {
  const { year, month } = localDateParts(date, timezone);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dates = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
  return {
    year,
    month,
    firstDate: dates[0] ?? `${year}-${String(month).padStart(2, '0')}-01`,
    lastDate: dates.at(-1) ?? `${year}-${String(month).padStart(2, '0')}-01`,
    dates,
  };
}

function localDateParts(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function userSearchWhere(search: string | undefined): Prisma.UserWhereInput {
  if (!search) return {};
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ],
  };
}
