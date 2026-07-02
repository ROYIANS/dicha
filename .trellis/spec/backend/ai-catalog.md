# AI Catalog Contract

> Backend/shared contract for AI provider presets, model bank, credential semantics, and settings UI behavior.

---

## Scenario: Provider Presets And Official Service Mode

### 1. Scope / Trigger

- Trigger: changing AI provider presets, model metadata, credential state, model sync behavior, or official Dicha AI service semantics.
- This is a cross-layer contract: `packages/shared` defines schema and seed data; `apps/ai-gateway` persists and normalizes user config; `apps/web` renders settings actions from the same metadata.

### 2. Signatures

- Shared provider type: `AiProvider` in `packages/shared/src/contracts/ai.contract.ts`.
- Shared model type: `AiModel` in `packages/shared/src/contracts/ai.contract.ts`.
- Seed source: `aiProviderTemplates`, `aiModelBank`, and `aiCatalogFixture` in `packages/shared/src/fixtures/ai-catalog.ts`.
- Gateway storage entry: `PersistedConfig.providers: Array<AiProvider & { credential?: PersistedCredential }>` in `apps/ai-gateway/src/modules/catalog/catalog.store.ts`.

### 3. Contracts

- Provider metadata must include:
  - `category`: `official | global | china | aggregator | local | media`
  - `credentialMode`: `user_api_key | platform_managed | not_required`
  - `billingMode`: `user_provider | platform_credits`
  - `modelSyncMode`: `openai_models_endpoint | manual | platform_catalog`
- Official `Dicha AI` uses `credentialMode: platform_managed`, `billingMode: platform_credits`, `modelSyncMode: platform_catalog`, and `authType: none`.
- User-owned external providers use `billingMode: user_provider` and start disabled/missing until the user configures credentials.
- Local providers that do not require an API key use `credentialMode: not_required` and may save endpoint config without a credential.
- Static model bank entries use `catalogSource: static_model_bank`; upstream-discovered models use `upstream_sync`; official future catalog entries use `dicha_catalog`; user-created models use `custom`.

### 4. Validation & Error Matrix

- `modelSyncMode !== openai_models_endpoint` -> gateway must reject/skip upstream sync and web must disable sync/check actions.
- `credentialMode === platform_managed` -> web must not show an API key input and gateway must not treat missing user credential as misconfiguration.
- `credentialMode === not_required` -> gateway may return an empty provider secret and web may save endpoint-only config.
- New model references unknown provider -> gateway rejects with `Unknown AI provider`.
- Existing user persisted config -> seed/normalize may append missing seed providers/models, but must not overwrite user-created provider state.

### 5. Good/Base/Bad Cases

- Good: add a provider in `aiProviderTemplates`, add representative models in `aiModelBank`, assign stable priority, set credential/billing/sync modes, and update provider-template tests.
- Base: add a static model to an existing provider with `catalogSource: static_model_bank` and no UI changes.
- Bad: make official `Dicha AI` look like a normal missing API key provider, or enable sync/check for `manual` and `platform_catalog` providers.

### 6. Tests Required

- Provider/model bank test asserts provider order, stable unique priorities, model bank presence, and official Dicha AI credential/billing semantics.
- Gateway typecheck must cover persisted config normalization and no-credential local providers.
- Web typecheck/lint must cover settings page button disabling and credential popover branches.

### 7. Wrong vs Correct

#### Wrong

```typescript
{
  id: 'dicha',
  authType: 'api_key',
  credentialState: 'missing',
  billingMode: 'user_provider',
}
```

#### Correct

```typescript
{
  id: 'dicha',
  authType: 'none',
  credentialMode: 'platform_managed',
  credentialState: 'platform_managed',
  billingMode: 'platform_credits',
  modelSyncMode: 'platform_catalog',
}
```
