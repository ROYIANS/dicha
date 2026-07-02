import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const AiProviderStatusSchema = z.enum([
  'enabled',
  'disabled',
  'needs_config',
  'degraded',
  'offline',
]);
export type AiProviderStatus = z.infer<typeof AiProviderStatusSchema>;

export const AiProviderRequestFormatSchema = z.enum(['openai_compatible']);
export type AiProviderRequestFormat = z.infer<typeof AiProviderRequestFormatSchema>;

export const AiProviderCredentialModeSchema = z.enum([
  'user_api_key',
  'platform_managed',
  'not_required',
]);
export type AiProviderCredentialMode = z.infer<typeof AiProviderCredentialModeSchema>;

export const AiProviderBillingModeSchema = z.enum(['user_provider', 'platform_credits']);
export type AiProviderBillingMode = z.infer<typeof AiProviderBillingModeSchema>;

export const AiProviderModelSyncModeSchema = z.enum([
  'openai_models_endpoint',
  'manual',
  'platform_catalog',
]);
export type AiProviderModelSyncMode = z.infer<typeof AiProviderModelSyncModeSchema>;

export const AiProviderCategorySchema = z.enum([
  'official',
  'global',
  'china',
  'aggregator',
  'local',
  'media',
]);
export type AiProviderCategory = z.infer<typeof AiProviderCategorySchema>;

export const AiModelCapabilitySchema = z.enum([
  'chat',
  'vision',
  'tool_use',
  'json',
  'embedding',
  'reasoning',
  'fast',
  'web_search',
  'image_generation',
  'audio',
  'files',
  'image_output',
  'video',
]);
export type AiModelCapability = z.infer<typeof AiModelCapabilitySchema>;

export const AiModelTypeSchema = z.enum([
  'chat',
  'embedding',
  'rerank',
  'image',
  'audio',
  'video',
  'tts',
  'asr',
  'text2music',
  'realtime',
]);
export type AiModelType = z.infer<typeof AiModelTypeSchema>;

export const AiModelExtensionParameterSchema = z.enum([
  'codexMaxReasoningEffort',
  'deepseekV4ReasoningEffort',
  'disableContextCaching',
  'effort',
  'enableAdaptiveThinking',
  'enableReasoning',
  'glm5_2ReasoningEffort',
  'gpt5ReasoningEffort',
  'gpt5_1ReasoningEffort',
  'gpt5_2ProReasoningEffort',
  'gpt5_2ReasoningEffort',
  'grok4_20ReasoningEffort',
  'grok4_3ReasoningEffort',
  'hy3ReasoningEffort',
  'imageAspectRatio',
  'imageAspectRatio2',
  'imageResolution',
  'imageResolution2',
  'opus47Effort',
  'preserveThinking',
  'reasoningBudgetToken',
  'reasoningBudgetToken32k',
  'reasoningBudgetToken80k',
  'reasoningEffort',
  'ring2_6ReasoningEffort',
  'step3_5ReasoningEffort',
  'textVerbosity',
  'thinking',
  'thinkingBudget',
  'thinkingLevel',
  'thinkingLevel2',
  'thinkingLevel3',
  'thinkingLevel4',
  'urlContext',
]);
export type AiModelExtensionParameter = z.infer<typeof AiModelExtensionParameterSchema>;

export const AiModelUseCaseSchema = z.enum([
  'assistant',
  'item_profile',
  'image_understanding',
  'tagging',
  'summarization',
]);
export type AiModelUseCase = z.infer<typeof AiModelUseCaseSchema>;

export const AiAvailabilityStateSchema = z.enum([
  'healthy',
  'degraded',
  'offline',
  'unknown',
  'config_required',
]);
export type AiAvailabilityState = z.infer<typeof AiAvailabilityStateSchema>;

export const AiModelCatalogSourceSchema = z.enum([
  'static_model_bank',
  'upstream_sync',
  'dicha_catalog',
  'custom',
]);
export type AiModelCatalogSource = z.infer<typeof AiModelCatalogSourceSchema>;

export const AiModelPricingSchema = z.object({
  currency: z.enum(['USD', 'CNY', 'DICHA_CREDITS']),
  inputPerMillionTokens: z.number().min(0).optional(),
  outputPerMillionTokens: z.number().min(0).optional(),
  units: z
    .array(
      z.object({
        lookup: z
          .object({
            originalPrices: z.record(z.string(), z.number().min(0)).optional(),
            prices: z.record(z.string(), z.number().min(0)),
            pricingParams: z.array(z.string().min(1).max(80)),
          })
          .optional(),
        name: z.string().min(1).max(80),
        originalRate: z.number().min(0).optional(),
        rate: z.number().min(0).optional(),
        strategy: z.enum(['fixed', 'tiered', 'lookup']),
        tiers: z
          .array(
            z.object({
              originalRate: z.number().min(0).optional(),
              rate: z.number().min(0),
              upTo: z.union([z.number().min(0), z.literal('infinity')]),
            }),
          )
          .optional(),
        unit: z.string().min(1).max(80),
      }),
    )
    .optional(),
  imageGeneration: z.string().min(1).max(160).optional(),
  videoGeneration: z.string().min(1).max(160).optional(),
  notes: z.string().min(1).max(240).optional(),
});
export type AiModelPricing = z.infer<typeof AiModelPricingSchema>;

const AiProviderAvatarSchema = z.union([
  z.string().min(1).max(12),
  z
    .string()
    .max(2048)
    .refine((value) => value.startsWith('/assets/')),
  z
    .string()
    .url()
    .max(2048)
    .refine((value) => value.startsWith('https://') || value.startsWith('http://')),
]);

export const AiProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  avatar: AiProviderAvatarSchema.optional(),
  description: z.string(),
  baseUrl: z.string().url(),
  status: AiProviderStatusSchema,
  category: AiProviderCategorySchema,
  authType: z.enum(['api_key', 'bearer_token', 'none']),
  requestFormat: AiProviderRequestFormatSchema.optional(),
  credentialMode: AiProviderCredentialModeSchema,
  billingMode: AiProviderBillingModeSchema,
  modelSyncMode: AiProviderModelSyncModeSchema,
  credentialState: z.enum(['configured', 'missing', 'masked', 'platform_managed', 'not_required']),
  priority: z.number().int().min(1),
  custom: z.boolean().optional(),
});
export type AiProvider = z.infer<typeof AiProviderSchema>;

export const AiProviderCredentialWriteSchema = z.object({
  providerId: z.string(),
  secret: z.string().min(1).max(4096),
});
export type AiProviderCredentialWrite = z.infer<typeof AiProviderCredentialWriteSchema>;

export const AiModelSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  displayName: z.string(),
  avatar: z.string().min(1).max(12).optional(),
  contextWindow: z.number().int().positive().nullable(),
  modelType: AiModelTypeSchema.default('chat'),
  extensionParameters: z.array(AiModelExtensionParameterSchema).default([]),
  capabilities: z.array(AiModelCapabilitySchema),
  enabled: z.boolean(),
  recommended: z.boolean(),
  availability: AiAvailabilityStateSchema,
  lastLatencyMs: z.number().int().positive().nullable(),
  maxOutput: z.number().int().positive().optional(),
  priceHint: z.string(),
  catalogSource: AiModelCatalogSourceSchema.optional(),
  pricing: AiModelPricingSchema.optional(),
  releasedAt: z.string().min(1).max(32).optional(),
  lobeMetadata: z
    .object({
      abilities: z.record(z.string(), z.boolean()).optional(),
      description: z.string().optional(),
      family: z.string().optional(),
      generation: z.string().optional(),
      knowledgeCutoff: z.string().optional(),
      legacy: z.boolean().optional(),
      lobeProviderId: z.string(),
      maxDimension: z.number().int().positive().optional(),
      organization: z.string().optional(),
      raw: z.record(z.string(), z.unknown()).optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
      visible: z.boolean().optional(),
    })
    .optional(),
  custom: z.boolean().optional(),
});
export type AiModel = z.infer<typeof AiModelSchema>;

export const AiProviderRemoteModelSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1).max(120).optional(),
  contextWindow: z.number().int().positive().nullable().optional(),
  modelType: AiModelTypeSchema.optional(),
  extensionParameters: z.array(AiModelExtensionParameterSchema).optional(),
  capabilities: z.array(AiModelCapabilitySchema).optional(),
  pricing: AiModelPricingSchema.optional(),
  priceHint: z.string().min(1).max(240).optional(),
  maxOutput: z.number().int().positive().optional(),
  releasedAt: z.string().min(1).max(32).optional(),
});
export type AiProviderRemoteModel = z.infer<typeof AiProviderRemoteModelSchema>;

export const AiModelAssignmentSchema = z.object({
  useCase: AiModelUseCaseSchema,
  primaryModelId: z.string(),
  fallbackModelIds: z.array(z.string()),
});
export type AiModelAssignment = z.infer<typeof AiModelAssignmentSchema>;

export const AiGatewayCatalogSchema = z.object({
  generatedAt: z.string().datetime(),
  providers: z.array(AiProviderSchema),
  models: z.array(AiModelSchema),
  assignments: z.array(AiModelAssignmentSchema),
});
export type AiGatewayCatalog = z.infer<typeof AiGatewayCatalogSchema>;

const AiProviderIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/);

const AiProviderPatchSchema = z.object({
  providerId: z.string(),
  enabled: z.boolean().optional(),
  avatar: AiProviderAvatarSchema.optional(),
  baseUrl: z.string().url().optional(),
  credential: z.string().min(1).max(4096).optional(),
  requestFormat: AiProviderRequestFormatSchema.optional(),
  delete: z.literal(true).optional(),
});

const AiProviderCreateSchema = AiProviderPatchSchema.extend({
  providerId: AiProviderIdSchema,
  name: z.string().min(1).max(120),
  shortName: z.string().min(1).max(12),
  avatar: AiProviderAvatarSchema.optional(),
  description: z.string().min(1).max(240),
  baseUrl: z.string().url(),
  category: AiProviderCategorySchema.default('global'),
  authType: z.enum(['api_key', 'bearer_token', 'none']).default('api_key'),
  requestFormat: AiProviderRequestFormatSchema.default('openai_compatible'),
  credentialMode: AiProviderCredentialModeSchema.default('user_api_key'),
  billingMode: AiProviderBillingModeSchema.default('user_provider'),
  modelSyncMode: AiProviderModelSyncModeSchema.default('openai_models_endpoint'),
  custom: z.boolean().optional(),
});

export const AiProviderUpdateSchema = z.union([
  AiProviderCreateSchema,
  AiProviderPatchSchema,
]);
export type AiProviderUpdate = z.infer<typeof AiProviderUpdateSchema>;

const AiModelPatchSchema = z.object({
  modelId: z.string(),
  enabled: z.boolean().optional(),
  displayName: z.string().min(1).max(120).optional(),
  avatar: z.string().min(1).max(12).optional(),
  contextWindow: z.number().int().positive().nullable().optional(),
  modelType: AiModelTypeSchema.optional(),
  extensionParameters: z.array(AiModelExtensionParameterSchema).optional(),
  capabilities: z.array(AiModelCapabilitySchema).optional(),
  delete: z.literal(true).optional(),
});

const AiModelCreateSchema = AiModelPatchSchema.extend({
  providerId: z.string(),
  name: z.string().min(1).max(160),
  displayName: z.string().min(1).max(120),
  avatar: z.string().min(1).max(12).optional(),
  contextWindow: z.number().int().positive(),
  modelType: AiModelTypeSchema,
  extensionParameters: z.array(AiModelExtensionParameterSchema).default([]),
  capabilities: z.array(AiModelCapabilitySchema).min(1),
  enabled: z.boolean().optional(),
  custom: z.boolean().optional(),
});

export const AiModelUpdateSchema = z.union([
  AiModelCreateSchema,
  AiModelPatchSchema,
]);
export type AiModelUpdate = z.infer<typeof AiModelUpdateSchema>;

export const AiAssignmentUpdateSchema = z.object({
  useCase: AiModelUseCaseSchema,
  primaryModelId: z.string(),
  fallbackModelIds: z.array(z.string()),
});
export type AiAssignmentUpdate = z.infer<typeof AiAssignmentUpdateSchema>;

export const AiConfigUpdateSchema = z.object({
  providers: z.array(AiProviderUpdateSchema).optional(),
  models: z.array(AiModelUpdateSchema).optional(),
  assignments: z.array(AiAssignmentUpdateSchema).optional(),
});
export type AiConfigUpdate = z.infer<typeof AiConfigUpdateSchema>;

export const AiConfigUpdateResponseSchema = z.object({
  catalog: AiGatewayCatalogSchema,
});
export type AiConfigUpdateResponse = z.infer<typeof AiConfigUpdateResponseSchema>;

export const AiProviderSyncModelsBodySchema = z.object({
  providerId: z.string(),
});
export type AiProviderSyncModelsBody = z.infer<typeof AiProviderSyncModelsBodySchema>;

export const AiProviderCheckBodySchema = z.object({
  providerId: z.string(),
});
export type AiProviderCheckBody = z.infer<typeof AiProviderCheckBodySchema>;

export const AiProviderCheckResponseSchema = z.object({
  ok: z.boolean(),
  providerId: z.string(),
  checkedAt: z.string().datetime(),
  message: z.string(),
});
export type AiProviderCheckResponse = z.infer<typeof AiProviderCheckResponseSchema>;

export const AiProviderSyncModelsResponseSchema = z.object({
  catalog: AiGatewayCatalogSchema,
  syncedCount: z.number().int().min(0),
});
export type AiProviderSyncModelsResponse = z.infer<typeof AiProviderSyncModelsResponseSchema>;

export const AiUsageWindowSchema = z.enum(['24h', '7d', '30d', 'all']);
export type AiUsageWindow = z.infer<typeof AiUsageWindowSchema>;

export const AiUsageKindSchema = z.enum(['invoke', 'probe']);
export type AiUsageKind = z.infer<typeof AiUsageKindSchema>;

export const AiUsageStatusSchema = z.enum(['success', 'failure', 'degraded']);
export type AiUsageStatus = z.infer<typeof AiUsageStatusSchema>;

export const AiUsageSummarySchema = z.object({
  calls: z.number().int().min(0),
  successfulCalls: z.number().int().min(0),
  failedCalls: z.number().int().min(0),
  degradedCalls: z.number().int().min(0),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  estimatedCostUsd: z.number().min(0),
  averageLatencyMs: z.number().min(0).nullable(),
});
export type AiUsageSummary = z.infer<typeof AiUsageSummarySchema>;

export const AiUsageBreakdownSchema = AiUsageSummarySchema.extend({
  key: z.string(),
  label: z.string(),
});
export type AiUsageBreakdown = z.infer<typeof AiUsageBreakdownSchema>;

export const AiUsageEventSchema = z.object({
  id: z.string(),
  kind: AiUsageKindSchema,
  status: AiUsageStatusSchema,
  useCase: AiModelUseCaseSchema,
  providerId: z.string(),
  providerName: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  promptTokens: z.number().int().min(0),
  completionTokens: z.number().int().min(0),
  totalTokens: z.number().int().min(0),
  estimatedCostUsd: z.number().min(0),
  latencyMs: z.number().int().min(0).nullable(),
  errorCategory: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AiUsageEvent = z.infer<typeof AiUsageEventSchema>;

export const AiUsageReportSchema = z.object({
  generatedAt: z.string().datetime(),
  window: AiUsageWindowSchema,
  from: z.string().datetime().nullable(),
  to: z.string().datetime(),
  summary: AiUsageSummarySchema,
  byProvider: z.array(AiUsageBreakdownSchema),
  byModel: z.array(AiUsageBreakdownSchema),
  byUseCase: z.array(AiUsageBreakdownSchema),
  recentEvents: z.array(AiUsageEventSchema),
});
export type AiUsageReport = z.infer<typeof AiUsageReportSchema>;

export const AiUsageQuerySchema = z.object({
  window: AiUsageWindowSchema.default('7d'),
});
export type AiUsageQuery = z.infer<typeof AiUsageQuerySchema>;

export const aiContract = c.router({
  getCatalog: {
    method: 'GET',
    path: '/ai/catalog',
    responses: {
      200: AiGatewayCatalogSchema,
    },
    summary: 'AI provider/model catalog for settings and gateway status',
  },
  updateConfig: {
    method: 'PATCH',
    path: '/ai/config',
    body: AiConfigUpdateSchema,
    responses: {
      200: AiConfigUpdateResponseSchema,
    },
    summary: 'Persist AI provider/model settings without returning secrets',
  },
  syncProviderModels: {
    method: 'POST',
    path: '/ai/providers/sync-models',
    body: AiProviderSyncModelsBodySchema,
    responses: {
      200: AiProviderSyncModelsResponseSchema,
    },
    summary: 'Sync provider model list into the persisted AI catalog',
  },
  checkProviderConnection: {
    method: 'POST',
    path: '/ai/providers/check',
    body: AiProviderCheckBodySchema,
    responses: {
      200: AiProviderCheckResponseSchema,
    },
    summary: 'Check whether a provider credential and base URL can reach the model endpoint',
  },
  getUsage: {
    method: 'GET',
    path: '/ai/usage',
    query: AiUsageQuerySchema,
    responses: {
      200: AiUsageReportSchema,
    },
    summary: 'AI usage and estimated spend for the authenticated user',
  },
});
