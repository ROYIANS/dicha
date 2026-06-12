import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { doubleCsrf } from 'csrf-csrf';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Serve under /api so the web dev proxy + future BFF cookie path line up
  // (architecture.md §3/§6). Contract paths stay bare ('/health' -> '/api/health').
  app.setGlobalPrefix('api');

  // Trust reverse proxy (Nginx) for X-Forwarded-* headers
  app.set('trust proxy', true);

  const config = app.get(ConfigService);

  // Session middleware with Postgres store
  const PgSession = ConnectPgSimple(session);
  const pgPool = new Pool({
    connectionString: config.get<string>('DATABASE_URL'),
  });

  app.use(
    session({
      store: new PgSession({
        pool: pgPool,
        tableName: 'vidorra_sessions',
        createTableIfMissing: true,
      }),
      secret: config.get<string>('SESSION_SECRET')!,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        domain: process.env.NODE_ENV === 'production' ? '.vidorra.life' : undefined,
      },
    }),
  );

  // CSRF protection (double-submit cookie)
  const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => config.get<string>('SESSION_SECRET')!,
    cookieName: 'csrf-token',
    cookieOptions: {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getSessionIdentifier: (req) => req.session?.id || '',
  });
  app.use(doubleCsrfProtection);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  Logger.log(`vidorra api listening on :${port}`, 'Bootstrap');
}

void bootstrap();
