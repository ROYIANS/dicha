import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const CreditLedgerTypeSchema = z.enum([
  'grant',
  'redeem',
  'debit',
  'refund',
  'adjustment',
  'expiry',
]);
export type CreditLedgerType = z.infer<typeof CreditLedgerTypeSchema>;

export const CreditLedgerSourceSchema = z.enum([
  'admin_grant',
  'redemption_code',
  'daily_checkin',
  'ai_invoke',
  'manual_adjustment',
  'system',
]);
export type CreditLedgerSource = z.infer<typeof CreditLedgerSourceSchema>;

export const CreditAccountSchema = z.object({
  ownerId: z.string(),
  balance: z.number().int(),
  lifetimeGranted: z.number().int().min(0),
  lifetimeSpent: z.number().int().min(0),
  updatedAt: z.string().datetime(),
});
export type CreditAccount = z.infer<typeof CreditAccountSchema>;

export const CreditLedgerEntrySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  type: CreditLedgerTypeSchema,
  amount: z.number().int(),
  balanceAfter: z.number().int(),
  source: CreditLedgerSourceSchema,
  sourceId: z.string().nullable(),
  aiUsageEventId: z.string().nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type CreditLedgerEntry = z.infer<typeof CreditLedgerEntrySchema>;

export const CreditBalanceReportSchema = z.object({
  generatedAt: z.string().datetime(),
  account: CreditAccountSchema,
  recentLedger: z.array(CreditLedgerEntrySchema),
});
export type CreditBalanceReport = z.infer<typeof CreditBalanceReportSchema>;

export const CreditLedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  type: CreditLedgerTypeSchema.optional(),
});
export type CreditLedgerQuery = z.infer<typeof CreditLedgerQuerySchema>;

export const CreditLedgerPageSchema = z.object({
  generatedAt: z.string().datetime(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  entries: z.array(CreditLedgerEntrySchema),
});
export type CreditLedgerPage = z.infer<typeof CreditLedgerPageSchema>;

export const CreditRedeemRequestSchema = z.object({
  code: z.string().trim().min(1).max(80),
});
export type CreditRedeemRequest = z.infer<typeof CreditRedeemRequestSchema>;

export const CreditRedeemResponseSchema = z.object({
  account: CreditAccountSchema,
  ledgerEntry: CreditLedgerEntrySchema,
});
export type CreditRedeemResponse = z.infer<typeof CreditRedeemResponseSchema>;

export const CreditCheckInCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  dailyCreditMinAmount: z.number().int().positive(),
  dailyCreditMaxAmount: z.number().int().positive(),
  timezone: z.string(),
  description: z.string().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});
export type CreditCheckInCampaign = z.infer<typeof CreditCheckInCampaignSchema>;

export const CreditCheckInDaySchema = z.object({
  date: z.string(),
  checkedIn: z.boolean(),
  creditAmount: z.number().int().min(0),
  ledgerEntryId: z.string().nullable(),
  createdAt: z.string().datetime().nullable(),
});
export type CreditCheckInDay = z.infer<typeof CreditCheckInDaySchema>;

export const CreditCheckInStatusSchema = z.object({
  generatedAt: z.string().datetime(),
  campaign: CreditCheckInCampaignSchema.nullable(),
  todayDate: z.string(),
  checkedInToday: z.boolean(),
  todayCreditMinAmount: z.number().int().min(0),
  todayCreditMaxAmount: z.number().int().min(0),
  month: z.object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    days: z.array(CreditCheckInDaySchema),
  }),
});
export type CreditCheckInStatus = z.infer<typeof CreditCheckInStatusSchema>;

export const CreditCheckInResponseSchema = z.object({
  account: CreditAccountSchema,
  ledgerEntry: CreditLedgerEntrySchema,
  status: CreditCheckInStatusSchema,
});
export type CreditCheckInResponse = z.infer<typeof CreditCheckInResponseSchema>;

export const creditContract = c.router({
  getBalance: {
    method: 'GET',
    path: '/credits/balance',
    responses: {
      200: CreditBalanceReportSchema,
    },
    summary: 'Authenticated user credit balance and recent ledger entries',
  },
  getLedger: {
    method: 'GET',
    path: '/credits/ledger',
    query: CreditLedgerQuerySchema,
    responses: {
      200: CreditLedgerPageSchema,
    },
    summary: 'Authenticated user credit ledger',
  },
  redeemCode: {
    method: 'POST',
    path: '/credits/redeem',
    body: CreditRedeemRequestSchema,
    responses: {
      200: CreditRedeemResponseSchema,
      400: z.object({ message: z.string() }),
    },
    summary: 'Redeem a credit code',
  },
  getCheckInStatus: {
    method: 'GET',
    path: '/credits/check-in',
    responses: {
      200: CreditCheckInStatusSchema,
    },
    summary: 'Authenticated user daily credit check-in status',
  },
  checkInToday: {
    method: 'POST',
    path: '/credits/check-in',
    body: z.object({}),
    responses: {
      200: CreditCheckInResponseSchema,
      400: z.object({ message: z.string() }),
    },
    summary: 'Claim today daily check-in credits',
  },
});
