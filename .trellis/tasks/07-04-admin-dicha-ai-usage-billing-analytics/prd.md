# Admin DicHA AI Usage Billing Analytics Refinement

## Goal

Refine the super-admin DicHA AI usage and billing analytics page so it reflects real settlement costs, uses the shared charting approach, and exposes richer operational diagnostics for global official-channel usage.

## Requirements

- Record and display real estimated settlement amounts by currency. CNY-priced models must no longer disappear behind a USD-only total.
- Keep settlement currencies to real money only: CNY and USD. DicHA credits are a later pricing abstraction and must not be selectable as the model settlement currency.
- Replace hand-built trend visuals with the same chart library style used by the frontend AI usage page.
- Add richer admin analytics around model usage, status, users, costs, latency, and logs.
- Improve the log table for larger data sets: show more history, support sorting/paging, and avoid prompt/response leakage.

## Design Decisions

- Usage records keep the existing `estimatedCostUsd` field for compatibility, and add `estimatedCostAmount` plus `estimatedCostCurrency` for the real settlement estimate.
- The admin report aggregates costs by currency instead of inventing FX conversion without an exchange-rate policy.
- The Admin DicHA analytics API remains super-admin only and counts only official `providerId = dicha` invocation events.
- The log table should stay operational and dense, with pagination and sortable columns rather than decorative cards.

## Acceptance Criteria

- CNY-priced DicHA calls produce non-zero CNY estimated amounts in admin summaries and logs.
- USD-priced DicHA calls continue to show USD estimates.
- Admin DicHA model pricing UI only offers CNY and USD settlement currency options.
- The admin usage trend chart uses Recharts rather than custom SVG/div chart rendering.
- Admin usage logs can show substantially more than the latest 20 records and support table sorting/pagination.
- Shared/API/AI Gateway/Admin typecheck and lint/build checks pass where affected.
