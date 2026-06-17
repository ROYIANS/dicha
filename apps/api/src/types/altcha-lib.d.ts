/**
 * 本地 ambient 声明：apps/api 用 legacy `moduleResolution: Node`，无法解析
 * altcha-lib 的 exports-only 类型布局（types 字段指向不存在的 dist/index.d.ts，
 * 真类型在 dist/esm/v2/*.d.ts，仅 exports 映射可达）。运行期 Node 经 exports 的
 * `require` 条件解析到 dist/cjs/v2/index.js，正常工作；此处只补编译期类型。
 *
 * 仅声明本项目实际用到的子集（主入口 createChallenge / verifySolution + 相关类型）。
 * 与 altcha-lib@2.2.0 dist/esm/v2/types.d.ts 对齐。
 */
declare module 'altcha-lib' {
  export enum HmacAlgorithm {
    SHA_256 = 'SHA-256',
    SHA_384 = 'SHA-384',
    SHA_512 = 'SHA-512',
  }

  export interface ChallengeParameters {
    algorithm: string;
    nonce: string;
    salt: string;
    cost: number;
    keyLength: number;
    keyPrefix: string;
    keySignature?: string;
    memoryCost?: number;
    parallelism?: number;
    expiresAt?: number;
    data?: Record<string, string | number | boolean | null>;
  }

  export interface Challenge {
    codeChallenge?: { image: string; audio?: string; length?: number };
    parameters: ChallengeParameters;
    signature?: string;
  }

  export interface DeriveKeyFunctionResult {
    parameters?: Partial<ChallengeParameters>;
    derivedKey: Uint8Array;
  }

  export type DeriveKeyFunction = (
    parameters: ChallengeParameters,
    salt: Uint8Array,
    password: Uint8Array,
  ) => Promise<DeriveKeyFunctionResult>;

  export interface Solution {
    counter: number;
    derivedKey: string;
    time?: number;
  }

  export interface Payload {
    challenge: Omit<Challenge, 'codeChallenge'>;
    solution: Solution;
  }

  export interface CreateChallengeOptions {
    algorithm: string;
    cost: number;
    deriveKey: DeriveKeyFunction;
    counter?: number;
    counterMode?: 'uint32' | 'string';
    data?: Record<string, string | number | boolean | null>;
    expiresAt?: number | Date;
    hmacAlgorithm?: HmacAlgorithm;
    hmacKeySignatureSecret?: string;
    hmacSignatureSecret?: string;
    keyLength?: number;
    keyPrefix?: string;
    keyPrefixLength?: number;
    memoryCost?: number;
    parallelism?: number;
  }

  export interface VerifySolutionOptions {
    challenge: Challenge;
    solution: Solution;
    deriveKey: DeriveKeyFunction;
    counterMode?: 'uint32' | 'string';
    hmacAlgorithm?: HmacAlgorithm;
    hmacKeySignatureSecret?: string;
    hmacSignatureSecret: string;
  }

  export interface VerifySolutionResult {
    verified: boolean;
    expired: boolean;
    invalidSignature: boolean | null;
    invalidSolution: boolean | null;
    time: number;
  }

  export function createChallenge(
    options: CreateChallengeOptions,
  ): Promise<Challenge>;

  export function verifySolution(
    options: VerifySolutionOptions,
  ): Promise<VerifySolutionResult>;

  export function randomInt(max: number, min?: number): number;
}
