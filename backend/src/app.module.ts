// ===========================================
// SmartProperty - Root Application Module
// ===========================================

import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { User, UserProfile } from './common/entities';

// Controllers & Services
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import {
  appConfig,
  awsConfig,
  databaseConfig,
  jwtConfig,
  mailConfig,
  oauthConfig,
  redisConfig,
  throttlerConfig,
} from './config';
import { validationSchema } from './config/validation.schema';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
// import { PropertiesModule } from './modules/properties/properties.module';

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
        jwtConfig,
        redisConfig,
        mailConfig,
        awsConfig,
        oauthConfig,
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
        autoLoadEntities: true,
        entities: [
          User,
          UserProfile,
          join(__dirname, '**', '*.entity.{ts,js}'),
        ],
        synchronize: configService.get<string>('app.nodeEnv') !== 'production',
        logging: configService.get<string>('app.nodeEnv') === 'development',
        useNewUrlParser: true,
        useUnifiedTopology: true,
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
    // Queue Module (Bull + Redis)
    // =====================
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
        },
        defaultJobOptions: configService.get('redis.bull.defaultJobOptions'),
      }),
    }),

    // =====================
    // Email Module
    // =====================
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('mail.host'),
          port: configService.get<number>('mail.port'),
          secure: configService.get<boolean>('mail.secure'),
          auth: {
            user: configService.get<string>('mail.auth.user'),
            pass: configService.get<string>('mail.auth.pass'),
          },
        },
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
      }),
    }),

    // =====================
    // Feature Modules
    // =====================
    AuthModule,
    UsersModule,
    // PropertiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
