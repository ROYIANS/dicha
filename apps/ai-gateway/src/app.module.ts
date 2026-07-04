import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthModule } from './modules/health/health.module';
import { InvokeModule } from './modules/invoke/invoke.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsageModule } from './modules/usage/usage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '.env.local',
        '.env',
        '../api/.env.local',
        '../api/.env',
        '../../.env.local',
        '../../.env',
      ],
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    CatalogModule,
    UsageModule,
    InvokeModule,
  ],
})
export class AppModule {}
