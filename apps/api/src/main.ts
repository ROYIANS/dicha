import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PrismaService } from './prisma/prisma.service';
import { createAuth, setAuth } from './modules/auth/auth';

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

  // 在任何 body parser 之前挂 Better Auth handler（research §2）。
  // Express 5 通配符语法为 `*splat`（Express 4 是 `*`）。
  expressApp.all('/api/auth/*splat', toNodeHandler(auth));

  // 关掉全局 parser 后，为非 auth 路由（ts-rest 合约）补回 JSON body 解析。
  // 注册在 auth handler 之后，故 auth 路由不会被 JSON parser 吞掉。
  expressApp.use(express.json());

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

  Logger.log(`vidorra api listening on :${port}`, 'Bootstrap');
}

void bootstrap();
