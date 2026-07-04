# Fix Official DicHA Provider Settings Actions

## Goal

Fix the frontend AI provider settings page so the official `Dicha AI` provider behaves like a platform-managed official channel rather than a user-maintained provider.

## What I Already Know

- The official provider id is `dicha`.
- It uses `credentialMode: platform_managed`, `billingMode: platform_credits`, and `modelSyncMode: platform_catalog`.
- The frontend currently renders user-maintenance actions for every provider, including `dicha`.
- `packages/shared/src/fixtures/ai-catalog.ts` currently seeds a static `Dicha Assistant` model that is not configurable from admin and is not actually usable.
- The shared default assignments currently reference `dicha:assistant`.

## Requirements

- Hide `检测`, `同步模型`, and `添加模型` actions for the official `dicha` provider in the frontend provider settings page.
- Remove the static `Dicha Assistant` model from the shared model bank/default catalog.
- Remove default assignment references to `dicha:assistant` so the service model settings page does not receive a non-existent or unavailable model id.
- Preserve the official provider card itself and its platform-managed credential message.
- Do not change user-owned provider behavior.

## Acceptance Criteria

- [x] `Dicha AI` provider card no longer shows check/sync/add-model buttons.
- [x] Other providers still show their existing actions according to their sync/check capability.
- [x] `aiModelBank` and default catalog no longer contain `dicha:assistant`.
- [x] Default assignments do not reference `dicha:assistant`.
- [x] Relevant tests/typecheck/lint pass.

## Out Of Scope

- Building the final DicHA AI internal model catalog UI.
- Migrating historical local AI gateway JSON data.
- Changing billing/credit logic.

## Technical Notes

- Likely frontend file: `apps/web/src/features/settings/ai-settings-pages.tsx`.
- Helper/tests: `apps/web/src/lib/ai-catalog-ui.ts`, `apps/web/src/lib/ai-catalog-ui.test.ts`, `apps/web/src/features/settings/ai-provider-templates.test.ts`.
- Fixture source: `packages/shared/src/fixtures/ai-catalog.ts`.
