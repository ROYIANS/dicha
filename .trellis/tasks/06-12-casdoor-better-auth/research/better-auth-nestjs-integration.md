# Better Auth × NestJS（Express）集成要点

来源：better-auth.com/docs（context7 `/better-auth/better-auth`，express + nestjs 集成页）。

## 1. 挂载 handler
```ts
// main.ts
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth'; // betterAuth(...) 实例

// 直接用 Express 层中间件挂载（在 setGlobalPrefix 之外，不受其影响）
app.use(); // 见下方 body parser 顺序
app.getHttpAdapter().getInstance().all('/api/auth/*', toNodeHandler(auth));
```
- Express v4 用 `/api/auth/*`，v5 用 `/api/auth/*splat`。需确认 NestJS 底层 Express 版本。
- 官方 NestJS 文档亦提供 `@All('auth/*')` 控制器写法；但控制器受 `setGlobalPrefix('api')` 影响会变成 `/api/auth/*`，与 basePath 需对齐，易出 double-prefix。**推荐 main.ts 直接挂 Express handler**，路径写死 `/api/auth/*`，最可控。

## 2. body parser 冲突（关键坑）
- Better Auth 要读原始请求流；NestJS/Express 全局 body parser 会吞掉它 → client API 卡在 "pending"。
- 解法（官方）：`NestFactory.create(AppModule, { bodyParser: false })`。
- 若仍需 JSON body 给其它路由：Better Auth handler 必须挂在 `express.json()` **之前**，或只对非 auth 路由启用 json。
- 本项目 main.ts 当前无显式 `app.use(express.json())`（ts-rest 自理）；需核对 ts-rest/NestJS 是否依赖全局 body parser，迁移时确保 auth 路由不被 parse。

## 3. 全局前缀与 basePath
- `app.setGlobalPrefix('api')` 只作用于 Nest 控制器路由，不作用于 Express 层 `app.use`/`.all` 挂的 handler。
- Better Auth `basePath` 默认 `/api/auth`。main.ts 直接挂 `/api/auth/*` → 正好一次 `/api`，无重复。
- 前端 `createAuthClient({ baseURL: <origin> })`，basePath 默认 `/api/auth` 对齐。

## 4. Prisma adapter + additionalFields
```ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  socialProviders: { github: { clientId, clientSecret } },
  user: {
    additionalFields: {
      displayName: { type: 'string', required: true },
      city: { type: 'string', required: false },
      gender: { type: 'string', required: false },
      personalityArchetype: { type: 'string', required: false },
      homeName: { type: 'string', required: false },
      coins: { type: 'number', required: false, defaultValue: 0 },
    },
  },
});
```
- `npx @better-auth/cli generate` 会按配置生成/更新 Prisma schema（user/session/account/verification + additionalFields 列）。
- **本项目 Prisma generator 自定义**：`output = "../src/generated/prisma"`、`provider = "prisma-client"`（新版 generator）、`moduleFormat = "cjs"`。
  - prismaAdapter 接收的是 PrismaClient 实例，import 路径用项目生成目录 `../generated/prisma`，不是默认 `@prisma/client`。
  - CLI generate 可能按默认假设写 schema，需人工核对生成结果是否落到现有 `schema.prisma` 且字段映射正确（建议生成后手动合并，再 `prisma migrate`）。
- id 策略：现有用 `cuid()`。Better Auth 默认生成自有字符串 id；可通过 `advanced.database.generateId` 或让 Prisma `@default(cuid())` 接管（adapter 支持 DB 侧默认）。实现期定。

## 5. NestJS Guard 读 session
```ts
import { fromNodeHeaders } from 'better-auth/node';
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) throw new UnauthorizedException();
    (req as any).user = session.user;
    return true;
  }
}
```
- 替换现有基于 `req.session.user` 的 guard。
- 后续 items 等业务路由复用该 guard，从 `req.user.id` 取领域 User id（合并表后即 Better Auth user.id）。

## 待实现期确认
- NestJS 底层 Express 版本（决定通配符写法）。
- ts-rest 是否依赖全局 body parser（决定 `bodyParser: false` 的连带改动）。
- CLI generate 与自定义 prisma-client generator 的兼容性（可能需手写 schema）。
