"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const compression = require('compression');
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('app.port') || 3000;
    const nodeEnv = configService.get('app.nodeEnv') || 'development';
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
        crossOriginEmbedderPolicy: false,
    }));
    app.use(compression());
    const corsOrigin = configService.get('app.corsOrigin');
    const allowedOrigins = corsOrigin
        ? corsOrigin.split(',').map((origin) => origin.trim())
        : [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
        ];
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    if (nodeEnv !== 'production') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('SmartProperty API')
            .setDescription(`
## SmartProperty - Property Management Platform API

This API provides endpoints for:
- 🔐 **Authentication** - User registration, login, and token management
- 👥 **Users** - User profile management
- 🏠 **Properties** - Property listing and management
- 📝 **Applications** - Rental application processing
- 💰 **Payments** - Payment processing and tracking
- 🔔 **Notifications** - Real-time notifications

### Authentication
All protected endpoints require a Bearer token in the Authorization header.
      `)
            .setVersion('1.0.0')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter your JWT token',
            in: 'header',
        }, 'JWT-auth')
            .addTag('Auth', 'Authentication endpoints')
            .addTag('Users', 'User management endpoints')
            .addTag('Properties', 'Property management endpoints')
            .addTag('Applications', 'Rental application endpoints')
            .addTag('Payments', 'Payment processing endpoints')
            .addTag('Notifications', 'Notification endpoints')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
            },
            customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
        });
    }
    await app.listen(port);
    logger.log(`🚀 SmartProperty API running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🌍 Environment: ${nodeEnv}`);
    logger.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}
void bootstrap();
//# sourceMappingURL=main.js.map