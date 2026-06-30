import type { AiAvailabilityState, AiModelCapability } from '@dicha/shared';

export type ProviderProbeResult = {
  state: AiAvailabilityState;
  latencyMs: number | null;
  checkedAt: string;
  reason?: string;
};

export type ProviderModelDescriptor = {
  id: string;
  name: string;
  capabilities: AiModelCapability[];
  contextWindow: number;
};

export interface ProviderAdapter {
  readonly providerId: string;
  listModels(): Promise<ProviderModelDescriptor[]>;
  probe(modelId: string): Promise<ProviderProbeResult>;
}

