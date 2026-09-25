// ===========================================
// SmartProperty - Application Entry Point
// ===========================================

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
const compression = require('compression');
/* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // The logger has to be chosen before the app exists, so it can only read
  // the real process environment. ConfigModule has not loaded .env yet here.
  const bootstrapIsProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    // Debug/verbose logging leaks internal state and request detail.
    // Keep it to development only.
    logger: bootstrapIsProduction
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';

  // Everything below runs after ConfigModule has loaded the .env files, so
  // use the resolved value: NODE_ENV supplied via backend/.env rather than
  // the process environment would otherwise silently disable these guards.
  const isProduction = nodeEnv === 'production';

  if (isProduction && !bootstrapIsProduction) {
    logger.warn(
      'NODE_ENV=production came from a .env file, not the process environment. ' +
        'Debug log levels were already applied at bootstrap. ' +
        'Set NODE_ENV in the real environment for production deployments.',
    );
  }

  // =====================
  // Security Middleware
  // =====================
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // =====================
  // Compression
  // =====================
  app.use(compression());

  // =====================
  // CORS Configuration
  // =====================
  const rawOrigin =
    configService.get<string>('app.corsOrigin') || 'http://localhost:5173';
  const allowedOrigins = rawOrigin.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Origin-less requests (curl, server-to-server, Swagger UI) are allowed
      // outside production only. In production every browser request carries an
      // Origin, so accepting a missing one just weakens the allowlist.
      if (!origin) {
        callback(null, !isProduction);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // =====================
  // Global Prefix
  // =====================
  app.setGlobalPrefix('api');

  // =====================
  // Validation Pipe
  // =====================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // =====================
  // Swagger Documentation
  // =====================
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('SmartProperty API')
      .setDescription(
        `
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
      `,
      )
      .setVersion('1.0.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description:
          'Enter JWT token in the format: your_token_here (without "Bearer" prefix)',
        in: 'header',
      })
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Properties', 'Property management endpoints')
      .addTag('Applications', 'Rental application endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .addTag('Notifications', 'Notification endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customCssUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
    });
  }

  // =====================
  // Start Server
  // =====================
  await app.listen(port);

  logger.log(`🚀 SmartProperty API running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

void bootstrap();
