# New API Billing / Quota Research

## Scope

Reviewed `/Users/xiaomengdao/WebstormProjects/new-api` for how a mature AI gateway handles quota, model price, token usage, display currency, and billing settlement.

## Key Findings

- New API uses an internal integer `quota` balance rather than directly exposing raw money or raw tokens as the accounting primitive.
- Default conversion is `QuotaPerUnit = 500000`, documented in code as the quota amount for 1 USD.
- For tiered billing expressions, coefficients are real provider-style prices in USD per 1M tokens. The conversion is:

```text
quota = exprOutput / 1_000_000 * QuotaPerUnit * groupRatio
```

- Billing expressions are designed as a single source of truth for model-specific token pricing, tiered pricing, cache tokens, image/audio tokens, request-dependent multipliers, and future versioning.
- Settlement freezes a billing snapshot at pre-consume time, then recomputes actual quota after upstream response with actual token counts.
- Quota is rounded to an integer using half-away-from-zero rounding.
- New API supports display modes (`USD`, `CNY`, `TOKENS`, `CUSTOM`), but this is presentation/configuration over the same internal quota unit. The internal accounting remains integer quota.
- User/account balance, API key quota, subscriptions, redemptions, and usage logs all speak quota.

## Relevant Files

- `common/constants.go`: `QuotaPerUnit = 500 * 1000.0`.
- `pkg/billingexpr/expr.md`: design philosophy, expression language, quota conversion and file map.
- `pkg/billingexpr/settle.go`: converts expression output to quota and applies group ratio.
- `pkg/billingexpr/types.go`: `BillingSnapshot`, `TokenParams`, `TieredResult`.
- `relay/helper/price.go`: pre-consume quota estimation.
- `service/quota.go` and `service/billing_session.go`: pre-consume, settle, refund/adjust flow.
- `web/classic/src/helpers/quota.js` and `web/default/src/lib/format.ts`: display conversion helpers.

## Takeaways For DicHA

- Do not define `1 credit = 1 token` or `1 credit = 100 tokens` as the accounting rule. Tokens are usage units, not value units; model prices vary heavily by input/output/model/provider.
- Prefer an internal integer credit ledger whose conversion is derived from money/cost or model billing price.
- Keep model pricing/cost rules separate from credit display. A model can define CNY/USD per 1M input/output tokens; a credit rule converts that cost/price into integer credits.
- Keep a frozen billing snapshot on usage/debit records so later price changes do not rewrite historical credit consumption.
- MVP can start simpler than New API's expression engine: fixed input/output rates + currency-to-credit conversion + optional platform markup/minimum charge. But the schema should leave room for tiered/structured rules later.
