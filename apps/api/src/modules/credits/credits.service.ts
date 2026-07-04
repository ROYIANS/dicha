import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminCreditBalancesPage,
  AdminCreditBalancesQuery,
  AdminCreditGrant,
  AdminCreditGrantResponse,
  AdminCreditLedgerPage,
  AdminCreditLedgerQuery,
  AdminCreditRedemptionCode,
  AdminCreditRedemptionCodeUpsert,
  AdminCreditRedemptionCodesOverview,
  AdminCreditRule,
  AdminCreditRulesOverview,
  AdminCreditRuleUpsert,
  CreditAccount,
  CreditBalanceReport,
  CreditLedgerEntry,
  CreditLedgerPage,
  CreditLedgerQuery,
  CreditRedeemResponse,
} from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CreditAccountRecord = Prisma.CreditAccountGetPayload<Record<string, never>>;
type CreditLedgerRecord = Prisma.CreditLedgerEntryGetPayload<Record<string, never>>;
type CreditRuleRecord = Prisma.CreditRuleGetPayload<Record<string, never>>;
type CreditCodeRecord = Prisma.CreditRedemptionCodeGetPayload<Record<string, never>>;
type CreditLedgerWithUserRecord = Prisma.CreditLedgerEntryGetPayload<{
  include: { owner: { select: { id: true; email: true; name: true } } };
}>;
type CreditAccountWithUserRecord = Prisma.CreditAccountGetPayload<{
  include: { owner: { select: { id: true; email: true; name: true } } };
}>;

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

  async getCreditRules(): Promise<AdminCreditRulesOverview> {
    const rules = await this.prisma.creditRule.findMany({
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    });
    return {
      generatedAt: new Date().toISOString(),
      rules: rules.map(toCreditRule),
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
