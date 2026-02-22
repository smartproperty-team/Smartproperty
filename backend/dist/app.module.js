"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const mailer_1 = require("@nestjs-modules/mailer");
const handlebars_adapter_1 = require("@nestjs-modules/mailer/dist/adapters/handlebars.adapter");
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const typeorm_1 = require("@nestjs/typeorm");
const path_1 = require("path");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const config_2 = require("./config");
const minio_config_1 = require("./config/minio.config");
const validation_schema_1 = require("./config/validation.schema");
const auth_module_1 = require("./modules/auth/auth.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const properties_module_1 = require("./modules/properties/properties.module");
const upload_module_1 = require("./modules/upload/upload.module");
const users_module_1 = require("./modules/users/users.module");
const verification_module_1 = require("./modules/verification/verification.module");
let AppModule = class AppModule {
};
AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '.env.development', '.env.local'],
                load: [
                    config_2.appConfig,
                    config_2.databaseConfig,
                    config_2.facebookConfig,
                    config_2.googleConfig,
                    config_2.recaptchaConfig,
                    config_2.jwtConfig,
                    config_2.redisConfig,
                    config_2.mailConfig,
                    config_2.awsConfig,
                    minio_config_1.minioConfig,
                    config_2.throttlerConfig,
                ],
                validationSchema: validation_schema_1.validationSchema,
                validationOptions: {
                    abortEarly: false,
                    allowUnknown: true,
                },
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'mongodb',
                    url: configService.get('database.uri'),
                    database: configService.get('database.database'),
                    entities: [(0, path_1.join)(__dirname, '**', '*.entity.{ts,js}')],
                    synchronize: false,
                    logging: configService.get('app.nodeEnv') === 'development',
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    throttlers: [
                        {
                            ttl: (configService.get('throttler.ttl') ?? 60) * 1000,
                            limit: configService.get('throttler.limit') ?? 100,
                        },
                    ],
                }),
            }),
            schedule_1.ScheduleModule.forRoot(),
            bull_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    redis: {
                        host: configService.get('redis.host'),
                        port: configService.get('redis.port'),
                        password: configService.get('redis.password'),
                    },
                    defaultJobOptions: configService.get('redis.bull.defaultJobOptions'),
                }),
            }),
            mailer_1.MailerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const smtpUser = configService.get('mail.auth.user');
                    const smtpPass = configService.get('mail.auth.pass');
                    const transport = {
                        host: configService.get('mail.host'),
                        port: configService.get('mail.port'),
                        secure: configService.get('mail.secure'),
                    };
                    if (smtpUser && smtpPass) {
                        transport.auth = { user: smtpUser, pass: smtpPass };
                    }
                    return {
                        transport,
                        defaults: {
                            from: `"${configService.get('mail.defaults.from.name')}" <${configService.get('mail.defaults.from.address')}>`,
                        },
                        template: {
                            dir: (0, path_1.join)(__dirname, 'templates', 'emails'),
                            adapter: new handlebars_adapter_1.HandlebarsAdapter(),
                            options: {
                                strict: true,
                            },
                        },
                    };
                },
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            properties_module_1.PropertiesModule,
            upload_module_1.UploadModule,
            verification_module_1.VerificationModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map