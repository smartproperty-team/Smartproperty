// ===========================================
// SmartProperty - Application Entry Point
// ===========================================

import { config as loadEnvFile } from 'dotenv';

// Nest picks its log levels at NestFactory.create() time, before AppModule -
// and therefore ConfigModule - has loaded any .env file. Load them here first,
// in the same order and precedence AppModule declares, so NODE_ENV supplied
// through backend/.env is visible when those levels are chosen.
// dotenv does not override already-set variables, so a real process
// environment variable still wins, and the first file listed takes precedence.
for (const envFile of ['.env', '.env.development', '.env.local']) {
  loadEnvFile({ path: envFile });
}

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

  // Accurate now that the .env files above have been loaded.
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

  if (isProduction !== bootstrapIsProduction) {
    // Should not happen now that .env is preloaded, but if the two ever
    // disagree the logger was already created with the wrong levels.
    logger.error(
      'NODE_ENV mismatch between bootstrap and ConfigService. ' +
        'Log levels may be wrong for this environment.',
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
