import { Injectable } from '@nestjs/common';
import type { AiInvokeRequest, AiModel, AiModelPricing, AiSettlementCurrency } from '@dicha/shared';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CreditRuleSnapshot = {
  id: string | null;
  name: string;
  cnyCreditsPerUnit: number;
  usdCreditsPerUnit: number;
  platformMarkup: number;
  minimumChargeCredits: number;
};

export type CreditCharge = {
  amount: number;
  costAmount: number;
  costCurrency: AiSettlementCurrency;
  snapshot: Record<string, unknown>;
};

const DEFAULT_RULE: CreditRuleSnapshot = {
  id: null,
  name: 'Default development rule',
  cnyCreditsPerUnit: 1000,
  usdCreditsPerUnit: 7000,
  platformMarkup: 1,
  minimumChargeCredits: 1,
};

const DEFAULT_COMPLETION_TOKENS = 1024;

@Injectable()
export class CreditStore {
  constructor(private readonly prisma: PrismaService) {}

  async assertSufficientReserve(ownerId: string, model: AiModel, request: AiInvokeRequest): Promise<void> {
    const estimatedPromptTokens = estimatePromptTokens(request.messages.map((message) => message.content).join('\n'));
    const estimatedCompletionTokens = request.maxTokens ?? DEFAULT_COMPLETION_TOKENS;
    const charge = await this.calculateCharge(model, estimatedPromptTokens, estimatedCompletionTokens);
    const account = await this.prisma.creditAccount.upsert({
      where: { ownerId },
      update: {},
      create: { ownerId },
    });
    if (account.balance < charge.amount) {
      throw new Error(`Insufficient DicHA credits: need ${charge.amount}, current ${account.balance}`);
    }
  }

  async calculateCharge(
    model: AiModel,
    promptTokens: number,
    completionTokens: number,
  ): Promise<CreditCharge> {
    if (!model.pricing) {
      throw new Error('Official DicHA model pricing is not configured');
    }
    const rule = await this.activeRule();
    const costCurrency = model.pricing.currency;
    const costAmount = modelCost(model.pricing, promptTokens, completionTokens);
    const creditsPerUnit =
      costCurrency === 'CNY' ? rule.cnyCreditsPerUnit : rule.usdCreditsPerUnit;
    const rawCredits = costAmount * creditsPerUnit * rule.platformMarkup;
    const amount = costAmount <= 0 ? 0 : Math.max(rule.minimumChargeCredits, Math.ceil(rawCredits));

    return {
      amount,
      costAmount: Number(costAmount.toFixed(6)),
      costCurrency,
      snapshot: {
        rule,
        pricing: model.pricing,
        promptTokens,
        completionTokens,
        costAmount: Number(costAmount.toFixed(6)),
        costCurrency,
        creditAmount: amount,
      },
    };
  }

  private async activeRule(): Promise<CreditRuleSnapshot> {
    const rule = await this.prisma.creditRule.findFirst({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (!rule) return DEFAULT_RULE;
    return {
      id: rule.id,
      name: rule.name,
      cnyCreditsPerUnit: rule.cnyCreditsPerUnit,
      usdCreditsPerUnit: rule.usdCreditsPerUnit,
      platformMarkup: rule.platformMarkup,
      minimumChargeCredits: rule.minimumChargeCredits,
    };
  }
}

function modelCost(
  pricing: AiModelPricing,
  promptTokens: number,
  completionTokens: number,
): number {
  const inputRate = pricing.inputPerMillionTokens ?? unitRate(pricing, 'textInput') ?? 0;
  const outputRate = pricing.outputPerMillionTokens ?? unitRate(pricing, 'textOutput') ?? 0;
  return (inputRate * promptTokens + outputRate * completionTokens) / 1_000_000;
}

function unitRate(pricing: AiModelPricing, name: string): number | undefined {
  return pricing.units?.find((unit) => unit.name === name && unit.strategy === 'fixed')?.rate;
}

function estimatePromptTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function creditMetadata(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
