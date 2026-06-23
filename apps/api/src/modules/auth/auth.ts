import { betterAuth } from 'better-auth';
import type { BetterAuthPlugin } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import type { PrismaClient } from '../../generated/prisma/client';
import { sendOtpMail } from './mailer';
import { verifyAltchaPayload } from './altcha';

// dicha-life 应用字段（合并进 Better Auth user 表 → 领域 User 单一身份源）。
// 必需列 name/emailVerified/image/createdAt/updatedAt 由 Better Auth 自身管理。
// displayName 不设 required：OTP/OAuth 自动注册不会传它，由 databaseHook 兜底填充
// （否则必填校验先于 hook 触发，报 "displayName is required"）。
const additionalFields = {
  displayName: { type: 'string', required: false },
  city: { type: 'string', required: false },
  gender: { type: 'string', required: false },
  bio: { type: 'string', required: false },
  personalityArchetype: { type: 'string', required: false },
  homeName: { type: 'string', required: false },
  coins: { type: 'number', required: false, defaultValue: 0 },
} as const;

// 无密码：只信任 https 子域（app./api. 等）+ 本地开发源。
// baseURL(BETTER_AUTH_URL) 自动受信，无需重复列。
function trustedOrigins(): string[] {
  return [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://*.dicha.life',
  ];
}

// passkey rpID：生产用裸域 dicha.life（覆盖 app./www. 等子域），
// 本地用 localhost。origin 取 BETTER_AUTH_URL。
function passkeyOptions() {
  const baseUrl = process.env.BETTER_AUTH_URL;
  const isProd = !!baseUrl && baseUrl.startsWith('https://');
  return {
    rpID: isProd ? 'dicha.life' : 'localhost',
    rpName: 'dicha',
    origin: baseUrl ?? 'http://localhost:8080',
  };
}

// ALTCHA 守卫：在「邮箱发码」端点前校验 proof-of-work，挡邮件轰炸 / 刷库。
// 仿 Better Auth 内置 captcha 插件的 onRequest 模式——从 header 读 payload（不消费
// 原始 body 流，避开与 Better Auth 读流的冲突），失败直接短路返回 400。
// token 走 header `x-altcha-response`（前端 sendVerificationOtp 的 fetchOptions 注入）。
const altchaGuard: BetterAuthPlugin = {
  id: 'altcha-guard',
  onRequest: async (request, ctx) => {
    const basePath = ctx.options.basePath ?? '/api/auth';
    const pathname = new URL(request.url).pathname.replace(basePath, '');
    // 仅 gate 发码端点；其余 auth 路由放行。
    if (!pathname.includes('/email-otp/send-verification-otp')) return;
    const ok = await verifyAltchaPayload(
      request.headers.get('x-altcha-response'),
    );
    if (ok) return; // 通过 → 交还 Better Auth 继续发码
    return {
      response: new Response(
        JSON.stringify({ message: '人机验证失败，请重试', code: 'ALTCHA_FAILED' }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    };
  },
};

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    // 复用 PrismaService 同一实例（自定义生成目录的 PrismaClient），不另建 client
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    // basePath 默认 /api/auth —— 与 main.ts 直接挂的 Express handler 对齐
    trustedOrigins: trustedOrigins(),
    // 无密码体系：邮箱+密码彻底关闭
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
    },
    account: {
      // 允许把已登录账户与社交身份关联/解绑（个人中心“绑定 GitHub”）。
      // github 设为可信：其邮箱可直接并入已有同邮箱账户，避免重复建号。
      accountLinking: {
        enabled: true,
        trustedProviders: ['github'],
      },
    },
    plugins: [
      emailOTP({
        // 注册即可发码（OTP 登录会按需自动注册新用户）
        sendVerificationOnSignUp: true,
        async sendVerificationOTP({ email, otp, type }) {
          await sendOtpMail(email, otp, type);
        },
      }),
      passkey(passkeyOptions()),
      altchaGuard,
    ],
    user: {
      additionalFields,
    },
    databaseHooks: {
      user: {
        create: {
          // OAuth / OTP 首次建 user 行时不带 displayName（必填 additionalField）。
          // 回退用 Better Auth 的 name（OAuth 给）或邮箱前缀（OTP）兜底，避免 NOT NULL 失败。
          before: async (user) => {
            const u = user as typeof user & { displayName?: string };
            const fallback = u.name || u.email?.split('@')[0] || '旅人';
            return { data: { ...user, displayName: u.displayName ?? fallback } };
          },
        },
      },
    },
    advanced: {
      database: {
        // 决策 6：让 Prisma `@default(cuid())` 接管 id 生成，Better Auth 不自生成
        generateId: false,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

// 模块级单例：在 bootstrap 时用 PrismaService 实例初始化（见 main.ts）。
// guard 与 main.ts 共用同一实例，整个进程只有一个 PrismaClient。
let authInstance: Auth | null = null;

export function setAuth(instance: Auth): void {
  authInstance = instance;
}

export function getAuth(): Auth {
  if (!authInstance) {
    throw new Error('Better Auth 未初始化：bootstrap 时应先调用 setAuth()');
  }
  return authInstance;
}
