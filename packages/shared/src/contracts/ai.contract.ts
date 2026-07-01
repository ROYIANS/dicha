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

export const AiModelCapabilitySchema = z.enum([
  'chat',
  'vision',
  'tool_use',
  'json',
  'embedding',
  'reasoning',
  'fast',
]);
export type AiModelCapability = z.infer<typeof AiModelCapabilitySchema>;

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

export const AiProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  description: z.string(),
  baseUrl: z.string().url(),
  status: AiProviderStatusSchema,
  authType: z.enum(['api_key', 'bearer_token']),
  credentialState: z.enum(['configured', 'missing', 'masked']),
  priority: z.number().int().min(1),
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
  contextWindow: z.number().int().positive(),
  capabilities: z.array(AiModelCapabilitySchema),
  enabled: z.boolean(),
  recommended: z.boolean(),
  availability: AiAvailabilityStateSchema,
  lastLatencyMs: z.number().int().positive().nullable(),
  priceHint: z.string(),
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

export const AiProviderUpdateSchema = z.object({
  providerId: z.string(),
  enabled: z.boolean().optional(),
  baseUrl: z.string().url().optional(),
  credential: z.string().min(1).max(4096).optional(),
});
export type AiProviderUpdate = z.infer<typeof AiProviderUpdateSchema>;

export const AiModelUpdateSchema = z.object({
  modelId: z.string(),
  enabled: z.boolean(),
});
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
});

