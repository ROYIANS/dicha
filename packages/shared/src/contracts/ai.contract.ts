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
  'video',
]);
export type AiModelCapability = z.infer<typeof AiModelCapabilitySchema>;

export const AiModelTypeSchema = z.enum(['chat', 'embedding', 'rerank', 'image', 'audio', 'video']);
export type AiModelType = z.infer<typeof AiModelTypeSchema>;

export const AiModelExtensionParameterSchema = z.enum([
  'gpt5_2ReasoningEffort',
  'textVerbosity',
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

const AiProviderAvatarSchema = z.union([
  z.string().min(1).max(12),
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
  authType: z.enum(['api_key', 'bearer_token']),
  requestFormat: AiProviderRequestFormatSchema.optional(),
  credentialState: z.enum(['configured', 'missing', 'masked']),
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
  contextWindow: z.number().int().positive(),
  modelType: AiModelTypeSchema.default('chat'),
  extensionParameters: z.array(AiModelExtensionParameterSchema).default([]),
  capabilities: z.array(AiModelCapabilitySchema),
  enabled: z.boolean(),
  recommended: z.boolean(),
  availability: AiAvailabilityStateSchema,
  lastLatencyMs: z.number().int().positive().nullable(),
  priceHint: z.string(),
  custom: z.boolean().optional(),
});
export type AiModel = z.infer<typeof AiModelSchema>;

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
});

const AiProviderCreateSchema = AiProviderPatchSchema.extend({
  providerId: AiProviderIdSchema,
  name: z.string().min(1).max(120),
  shortName: z.string().min(1).max(12),
  avatar: AiProviderAvatarSchema.optional(),
  description: z.string().min(1).max(240),
  baseUrl: z.string().url(),
  authType: z.enum(['api_key', 'bearer_token']).default('api_key'),
  requestFormat: AiProviderRequestFormatSchema.default('openai_compatible'),
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
  contextWindow: z.number().int().positive().optional(),
  modelType: AiModelTypeSchema.optional(),
  extensionParameters: z.array(AiModelExtensionParameterSchema).optional(),
  capabilities: z.array(AiModelCapabilitySchema).optional(),
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
});

