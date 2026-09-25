// ===========================================
// SmartProperty - Root Application Module
// ===========================================

import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

// Controllers & Services
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import {
  appConfig,
  awsConfig,
  databaseConfig,
  facebookConfig,
  googleConfig,
  jwtConfig,
  mailConfig,
  recaptchaConfig,
  throttlerConfig,
} from './config';
import { minioConfig } from './config/minio.config';
import { validationSchema } from './config/validation.schema';

// Feature Modules
import { AgenciesModule } from './modules/agencies/agencies.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthModule } from './modules/auth/auth.module';
import { LeasesModule } from './modules/leases/leases.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ReviewsFavoritesModule } from './modules/reviews-favorites/reviews-favorites.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';
import { VerificationModule } from './modules/verification/verification.module';

@Module({
  imports: [
    // =====================
    // Configuration Module
    // =====================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development', '.env.local'],
      load: [
        appConfig,
        databaseConfig,
        facebookConfig,
        googleConfig,
        recaptchaConfig,
        jwtConfig,
        mailConfig,
        awsConfig,
        minioConfig,
        throttlerConfig,
      ],
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),

    // =====================
    // Database Module (MongoDB)
    // =====================
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mongodb',
        url: configService.get<string>('database.uri'),
        database: configService.get<string>('database.database'),
        // Retryable writes are a resilience feature and stay on by default.
        // Cosmos DB's RU Mongo API rejects them outright, and TypeORM drops
        // retrywrites=false from the connection string when building its
        // driver options, so MONGODB_RETRY_WRITES=false is the escape hatch.
        retryWrites: process.env.MONGODB_RETRY_WRITES !== 'false',
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: false, // Disabled to avoid index conflicts with existing MongoDB schema
        logging: configService.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    // =====================
    // Rate Limiting Module
    // =====================
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('throttler.ttl') ?? 60) * 1000,
            limit: configService.get<number>('throttler.limit') ?? 100,
          },
        ],
      }),
    }),

    // =====================
    // Task Scheduling Module
    // =====================
    ScheduleModule.forRoot(),

    // =====================
    // Email Module
    // =====================
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const smtpUser = configService.get<string>('mail.auth.user');
        const smtpPass = configService.get<string>('mail.auth.pass');

        // Build transport config - only include auth if credentials are provided
        const transport: Record<string, unknown> = {
          host: configService.get<string>('mail.host'),
          port: configService.get<number>('mail.port'),
          secure: configService.get<boolean>('mail.secure'),
        };

        // Add auth only if both user and password are provided (MailHog doesn't need auth)
        if (smtpUser && smtpPass) {
          transport.auth = { user: smtpUser, pass: smtpPass };
        }

        return {
          transport,
          defaults: {
            from: `"${configService.get<string>('mail.defaults.from.name')}" <${configService.get<string>('mail.defaults.from.address')}>`,
          },
          template: {
            dir: join(__dirname, 'templates', 'emails'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),

    // =====================
    // Feature Modules
    // =====================
    AuthModule,
    AgenciesModule,
    ApplicationsModule,
    LeasesModule,
    UsersModule,
    PropertiesModule,
    ReviewsFavoritesModule,
    MaintenanceModule,
    UploadModule,
    VerificationModule,
    NotificationsModule,
    PaymentsModule,
    AccountingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enforce rate limiting on every route. Without this APP_GUARD the
    // ThrottlerModule config and all @Throttle() decorators are inert.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
