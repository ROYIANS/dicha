import { createHash } from 'node:crypto';
import { createChallenge, verifySolution } from 'altcha-lib';
import type {
  Challenge,
  ChallengeParameters,
  DeriveKeyFunction,
  Payload,
} from 'altcha-lib';

/**
 * 自托管 ALTCHA proof-of-work —— 给「邮箱发码」入口加算力门槛，防邮件轰炸 / 刷库。
 *
 * 设计取舍（详见 .trellis/tasks/06-17-altcha-email-login）：
 * - 仅用 altcha-lib 主入口（`createChallenge` / `verifySolution`），不碰 `frameworks/*`
 *   `algorithms/*` 子路径——apps/api 是 legacy `moduleResolution: Node`，子路径 exports
 *   无法解析。SHA deriveKey 仅 ~12 行，内联实现（与 altcha-lib/algorithms/sha 一致）。
 * - 算法用 SHA-256：widget v3 原生支持、无需额外 Worker；cost 控制单次解题算力。
 * - HMAC 密钥来自 env ALTCHA_HMAC_SECRET（启动期 env 校验保证存在）。
 * - 回放保护：挑战短时效（TTL）+ 内存 capped 已用 salt 集合（一次性）。
 */

// 单次解题难度：deriveKey 的链式哈希迭代数。keyPrefix 默认 '00'（1 字节）→
// 期望 ~256 个 counter 尝试，每次 cost 轮哈希。10000 在桌面/移动端均亚秒级，
// 配合 widget minDuration(500ms) 体感顺滑；需要更强防护时调高（PRD 风险 #4）。
const ALTCHA_COST = 10_000;
// 挑战时效：5 分钟，与 OTP 有效期一致。过期挑战 verifySolution 返回 expired。
const ALTCHA_TTL_MS = 5 * 60 * 1000;
// 已用挑战上限（内存回放保护）；超出按插入序淘汰最旧。
const REPLAY_STORE_MAX = 5_000;

function hmacSecret(): string {
  const secret = process.env.ALTCHA_HMAC_SECRET;
  if (!secret) {
    // env.validation.ts 已强制必填；此处兜底，避免无密钥时静默放行。
    throw new Error('ALTCHA_HMAC_SECRET 未配置');
  }
  return secret;
}

function concatBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// SHA 链式哈希 deriveKey（内联自 altcha-lib/algorithms/sha，保持逐位一致）。
// 首轮 hash(salt‖password)，其后每轮 hash(上一轮)，共 cost 轮，取前 keyLength 字节。
const deriveKey: DeriveKeyFunction = async (parameters, salt, password) => {
  const keyLength = parameters.keyLength ?? 32;
  const iterations = Math.max(1, parameters.cost);
  const digest =
    parameters.algorithm === 'SHA-512'
      ? 'sha512'
      : parameters.algorithm === 'SHA-384'
        ? 'sha384'
        : 'sha256';
  let derivedKey = createHash(digest)
    .update(concatBuffers(salt, password))
    .digest();
  for (let i = 1; i < iterations; i++) {
    derivedKey = createHash(digest).update(derivedKey).digest();
  }
  return {
    parameters: {},
    derivedKey: new Uint8Array(derivedKey.subarray(0, keyLength)),
  };
};

/** 生成一道新挑战（供 challenge 端点返回给 widget）。 */
export async function createAltchaChallenge(): Promise<Challenge> {
  return createChallenge({
    algorithm: 'SHA-256',
    cost: ALTCHA_COST,
    deriveKey,
    hmacSignatureSecret: hmacSecret(),
    expiresAt: new Date(Date.now() + ALTCHA_TTL_MS),
  });
}

// 已用挑战 salt → 过期时间戳（ms）。capped：满则淘汰最旧（Map 保持插入序）。
const usedSalts = new Map<string, number>();

function markSaltUsed(salt: string, expiresAtMs: number): void {
  // 顺手清理已过期项，避免长期堆积。
  const now = Date.now();
  for (const [key, exp] of usedSalts) {
    if (exp <= now) usedSalts.delete(key);
    else break; // 插入序近似时间序，遇到首个未过期即停。
  }
  usedSalts.set(salt, expiresAtMs);
  while (usedSalts.size > REPLAY_STORE_MAX) {
    const oldest = usedSalts.keys().next().value;
    if (oldest === undefined) break;
    usedSalts.delete(oldest);
  }
}

function decodePayload(b64: string): Payload | null {
  try {
    const json = Buffer.from(b64, 'base64').toString('utf-8');
    const parsed = JSON.parse(json) as Payload;
    if (!parsed?.challenge || !parsed?.solution) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 校验 widget 提交的 ALTCHA payload（base64 JSON）。
 * 通过条件：签名有效 + 解正确 + 未过期 + 该挑战 salt 未被用过（防回放）。
 */
export async function verifyAltchaPayload(
  payload: string | null | undefined,
): Promise<boolean> {
  if (!payload) return false;
  const decoded = decodePayload(payload);
  if (!decoded) return false;

  const params = (decoded.challenge as { parameters?: ChallengeParameters })
    .parameters;
  const salt = params?.salt;
  if (!salt) return false;

  // 回放：salt 已用过 → 拒绝（在密码学校验前先挡，省算力）。
  if (usedSalts.has(salt)) return false;

  const result = await verifySolution({
    challenge: decoded.challenge,
    solution: decoded.solution,
    deriveKey,
    hmacSignatureSecret: hmacSecret(),
  });
  if (!result.verified) return false;

  const expiresAtMs = params?.expiresAt
    ? params.expiresAt * 1000
    : Date.now() + ALTCHA_TTL_MS;
  markSaltUsed(salt, expiresAtMs);
  return true;
}
