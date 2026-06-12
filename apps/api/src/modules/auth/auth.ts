import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '../../generated/prisma/client';
import { sendResetPasswordMail, sendVerificationMail } from './mailer';

// vidorra-life 应用字段（合并进 Better Auth user 表 → 领域 User 单一身份源）。
// 必需列 name/emailVerified/image/createdAt/updatedAt 由 Better Auth 自身管理。
const additionalFields = {
  displayName: { type: 'string', required: true },
  city: { type: 'string', required: false },
  gender: { type: 'string', required: false },
  personalityArchetype: { type: 'string', required: false },
  homeName: { type: 'string', required: false },
  coins: { type: 'number', required: false, defaultValue: 0 },
} as const;

function trustedOrigins(): string[] {
  const origins = ['http://localhost:8080', 'http://localhost:5173', 'https://vidorra.life'];
  const baseUrl = process.env.BETTER_AUTH_URL;
  if (baseUrl && !origins.includes(baseUrl)) origins.push(baseUrl);
  return origins;
}

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    // 复用 PrismaService 同一实例（自定义生成目录的 PrismaClient），不另建 client
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    // basePath 默认 /api/auth —— 与 main.ts 直接挂的 Express handler 对齐
    trustedOrigins: trustedOrigins(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordMail(user.email, url);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationMail(user.email, url);
      },
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
    },
    user: {
      additionalFields,
    },
    databaseHooks: {
      user: {
        create: {
          // GitHub 等 OAuth provider 不返回 displayName（必填 additionalField）。
          // 首次 OAuth 建 user 行时回退用 Better Auth 的 name 填充，避免 NOT NULL 插入失败。
          before: async (user) => ({
            data: {
              ...user,
              displayName:
                (user as typeof user & { displayName?: string }).displayName ?? user.name,
            },
          }),
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
