# LobeHub AI Provider Pattern

## Sources Inspected

* `D:\Code\Study\lobehub\packages\model-bank\src\modelProviders\index.ts`
* `D:\Code\Study\lobehub\packages\model-bank\src\modelProviders\lobehub.ts`
* `D:\Code\Study\lobehub\packages\model-bank\src\const\modelProvider.ts`
* `D:\Code\Study\lobehub\packages\types\src\aiProvider.ts`
* `D:\Code\Study\lobehub\packages\types\src\user\settings\modelProvider.ts`

## Key Findings

* LobeHub centralizes provider presets in a shared model-bank package. Product surfaces, settings pages, runtime helpers, and database initialization all depend on the same provider list.
* `DEFAULT_MODEL_PROVIDER_LIST` conditionally prepends `LobeHubProvider` when business features are enabled. This makes the official paid channel a normal provider in the list, but one with different configuration behavior.
* `LobeHubProvider` has no editable model list, no model fetcher, and no visible config surface. Its description says LobeHub Cloud uses official APIs and measures usage with Credits tied to model tokens.
* User-managed providers are represented separately through provider settings, key vaults, enabled models, fetched remote models, and custom model cards. They can be configured by users and do not imply platform billing.
* Provider metadata includes auth behavior, browser request support, model editability, checker visibility, model fetcher visibility, SDK type, proxy URL behavior, and model search support.
* LobeHub has a large provider universe, but the default list is still ordered and opinionated rather than purely alphabetical.
* LobeHub does not rely on one mechanism for freshness. It has static built-in model cards, remote/server-provided model cards, and provider/user settings fields such as `autoFetchModelLists`, `remoteModelCards`, `serverModelLists`, and `latestFetchTime`.
* LobeHub's pricing lookup is model/provider aware and can accept request-scoped pricing context. This allows official channels to inject or override pricing rather than blindly exposing upstream cost.

## Product Pattern

The useful product split is:

1. Official service provider: platform-owned credentials, platform billing, no user API key UI, not user-editable in the same way.
2. Built-in external provider templates: known providers with base URL, auth type, status, model metadata, and helper UI.
3. User custom providers: user-defined OpenAI-compatible endpoints or local runtimes.

For model freshness:

1. Static model catalog: useful for initial defaults, ability tags, context windows, and UI examples.
2. Upstream model sync: useful for user-owned providers and OpenAI-compatible endpoints where `/models` returns the live model list.
3. Official model catalog: platform-owned, can be updated by deploy/admin config and priced with Vidorra's own public price book.

## Mapping To Vidorra

Vidorra already has the right first layer:

* `packages/shared/src/fixtures/ai-catalog.ts` is the shared provider seed source.
* `apps/ai-gateway/src/modules/catalog/catalog.seed.ts` re-exports that shared seed.
* Gateway persistence currently seeds per-user config from the shared templates and marks credentials as missing / config required.

The next useful change is not routing yet. It is expanding provider templates and reserving an explicit future official provider mode.

Vidorra already has a manual upstream sync start:

* `apps/ai-gateway/src/modules/catalog/catalog.service.ts` can call an OpenAI-compatible `/models` endpoint after the user configures credentials.
* That path should remain the primary freshness mechanism for user-owned external providers.
* Official Vidorra AI should not depend on a user's upstream credential or upstream retail price. It should eventually read a Vidorra-owned catalog and price book.

## Recommended MVP

* Keep all external provider templates disabled or `needs_config` until the user supplies credentials.
* Add a non-custom official Vidorra provider template that is clearly reserved for platform credits and does not ask the user for a third-party API key.
* Add a curated set of provider templates across global APIs, China-friendly APIs, aggregators, local runtimes, and media generation providers.
* Build a Vidorra model bank inspired by LobeHub's `model-bank`, with provider/model separation and centralized model cards.
* Keep upstream sync as the freshness path for user-owned providers. Static model cards provide defaults, ability metadata, context windows, model type, and pricing references.
* Treat official Vidorra AI pricing as a platform-owned price book. Upstream retail pricing is not automatically the user-facing credit price.
* Do not add fake default API keys, fake model availability, or platform billing behavior in this task.

## License Note

LobeHub declares MIT license at the repository root. Vidorra is also MIT. Architecture and model metadata can be adapted, but source attribution should be preserved in the model-bank implementation or task notes where substantial data is migrated.

## Suggested Initial Provider Set

Core global:

* OpenAI
* Anthropic
* Google Gemini
* DeepSeek
* OpenRouter
* Groq
* Mistral
* xAI
* Perplexity
* Together AI
* Fireworks AI

China-friendly / domestic:

* Qwen / Alibaba Bailian
* Zhipu / GLM
* Moonshot / Kimi
* Volcengine / Doubao
* Tencent Hunyuan
* Baidu Wenxin
* MiniMax
* SiliconFlow

Local / self-hosted / proxy:

* Ollama
* LM Studio
* vLLM
* Xinference
* NewAPI

Media / multimodal:

* Fal
* Replicate
* Cloudflare Workers AI

Official future channel:

* Vidorra AI

## Open Design Point

The official provider should probably become a first-class billing route later, but for the provider preset MVP it can be represented as a reserved template with no editable credential UI only if the current schema can express that without awkward flags. If not, defer it to the billing/routing task.
