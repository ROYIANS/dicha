import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PrismaService } from './prisma/prisma.service';
import { createAuth, setAuth } from './modules/auth/auth';
import { createAltchaChallenge } from './modules/auth/altcha';

async function bootstrap(): Promise<void> {
  // Better Auth 直接读原始请求流 → 必须关掉 Nest/Express 全局 body parser，
  // 否则 client API 会卡在 pending（research §2）。
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Serve Nest contract routes under /api (architecture.md §3/§6)。
  // 只作用于 Nest 控制器，不影响下方 Express 层直挂的 Better Auth handler。
  app.setGlobalPrefix('api');

  // Trust reverse proxy (Nginx) for X-Forwarded-* headers
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // 用 PrismaService 同一实例初始化 Better Auth（全进程单一 PrismaClient）。
  const prisma = app.get(PrismaService);
  const auth = createAuth(prisma);
  setAuth(auth);

  // ALTCHA 挑战端点：widget 经此拉取一道新 proof-of-work 挑战（GET，无 body）。
  // 路径独立于 /api/auth/*，不被下方 Better Auth 通配 handler 吞掉；前端默认走
  // 同源相对 /api/altcha/challenge（dev 经 Vite 代理、prod 经 nginx 反代）。
  expressApp.get(
    '/api/altcha/challenge',
    async (_req: express.Request, res: express.Response) => {
      res.json(await createAltchaChallenge());
    },
  );

  // 在任何 body parser 之前挂 Better Auth handler（research §2）。
  // Express 5 通配符语法为 `*splat`（Express 4 是 `*`）。
  expressApp.all('/api/auth/*splat', toNodeHandler(auth));

  // 关掉全局 parser 后，为非 auth 路由（ts-rest 合约）补回 JSON body 解析。
  // 注册在 auth handler 之后，故 auth 路由不会被 JSON parser 吞掉。
  expressApp.use(express.json());

  // 用户上传的媒体（头像等）同源暴露在 /api/uploads/*，与 nginx /api/ 反代对齐。
  // 目录由 UPLOAD_DIR 指定，容器内经 docker-compose 卷持久化。
  const uploadDir = path.resolve(
    app.get(ConfigService).get<string>('UPLOAD_DIR', './uploads'),
  );
  fs.mkdirSync(uploadDir, { recursive: true });
  expressApp.use('/api/uploads', express.static(uploadDir));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  Logger.log(`dicha api listening on :${port}`, 'Bootstrap');
}

void bootstrap();
